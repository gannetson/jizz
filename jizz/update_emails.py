from __future__ import annotations

import json
import logging
import re
from html import unescape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
import html2text

from jizz.models import MailSettings, Update, UpdateEmailDelivery, UpdateEmailRecipient, UserProfile

logger = logging.getLogger(__name__)

TRANSPARENT_GIF = (
    b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00'
    b',\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
)


def resolve_language(user, accept_language: str = '') -> str:
    if user and user.is_authenticated:
        try:
            lang = (user.profile.language or 'en').lower()
            if lang.startswith('nl'):
                return 'nl'
        except UserProfile.DoesNotExist:
            pass
    if accept_language and 'nl' in accept_language.lower():
        return 'nl'
    return 'en'


def quill_value_to_html(value) -> str:
    if value is None:
        return ''
    if hasattr(value, 'html'):
        html = value.html or ''
        if html:
            return html
    raw = value
    if hasattr(value, 'json_string'):
        raw = value.json_string
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                html = parsed.get('html') or ''
                if html:
                    return html
        except json.JSONDecodeError:
            return raw
    return ''


def quill_value_to_json_string(value) -> str:
    if value is None:
        return '{"delta":"","html":""}'
    if hasattr(value, 'json_string'):
        return value.json_string
    if isinstance(value, str):
        return value
    return json.dumps({'delta': '', 'html': quill_value_to_html(value)})


def excerpt_from_html(html: str, max_length: int = 180) -> str:
    text = plain_text_from_html(html)
    if len(text) <= max_length:
        return text
    return text[: max_length - 1].rstrip() + '…'


def plain_text_from_html(html: str) -> str:
    text = unescape(re.sub(r'<[^>]+>', ' ', html or ''))
    return re.sub(r'\s+', ' ', text).strip()


def plain_text_from_quill(value) -> str:
    return plain_text_from_html(quill_value_to_html(value))


def user_display_name(user) -> str:
    first = (getattr(user, 'first_name', None) or '').strip()
    if first:
        return first
    return (getattr(user, 'username', None) or '').strip() or 'there'


def _site_url() -> str:
    return getattr(settings, 'SITE_URL', 'https://birdr.pro').rstrip('/')


def _update_web_url(update_id: int) -> str:
    return f'{_site_url()}/updates/{update_id}'


def _update_open_url(update_id: int) -> str:
    return f'{_site_url()}/open/update/{update_id}/'


def _tracking_pixel_url(token) -> str:
    return f'{_site_url()}/api/updates/email-open/{token}/'


def _render_update_email(update: Update, *, user, language: str, tracking_token=None) -> tuple[str, str, str]:
    mail_settings = MailSettings.load()
    title = update.title_for_language(language)
    body_html = quill_value_to_html(update.body_for_language(language))
    footer = quill_value_to_html(
        mail_settings.footer_html_nl if language == 'nl' else mail_settings.footer_html_en
    )
    if not footer:
        footer = (
            '<p><strong>Birdr</strong> — Test je vogelkennis</p>'
            if language == 'nl'
            else '<p><strong>Birdr</strong> — Test your bird knowledge</p>'
        )
    logo_url = None
    if mail_settings.logo:
        logo_url = f'{_site_url()}{mail_settings.logo.url}'

    context = {
        'title': title,
        'body_html': body_html,
        'user': user,
        'user_name': user_display_name(user),
        'user_email': user.email,
        'site_url': _site_url(),
        'update_url': _update_open_url(update.pk),
        'logo_url': logo_url,
        'footer_html': footer,
        'tracking_pixel_url': _tracking_pixel_url(tracking_token) if tracking_token else None,
        'language': language,
    }
    html_content = render_to_string('emails/update_broadcast.html', context)
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.body_width = 0
    text_content = h.handle(html_content)
    subject = f'Birdr: {title}'
    return subject, text_content, html_content


def send_update_email_to_user(
    update: Update,
    user,
    *,
    delivery: UpdateEmailDelivery,
) -> UpdateEmailRecipient | None:
    if not user.email:
        return None
    language = resolve_language(user)
    recipient = UpdateEmailRecipient.objects.create(
        delivery=delivery,
        user=user,
        email=user.email,
    )
    subject, text_content, html_content = _render_update_email(
        update,
        user=user,
        language=language,
        tracking_token=recipient.tracking_token,
    )
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@birdr.pro')
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=from_email,
        to=[user.email],
    )
    msg.attach_alternative(html_content, 'text/html')
    msg.send()
    return recipient


def send_test_update_email(update: Update, user) -> bool:
    if not user.email:
        return False
    delivery = UpdateEmailDelivery.objects.create(
        update=update,
        sent_by=user,
        is_test=True,
        recipient_count=1,
    )
    try:
        send_update_email_to_user(update, user, delivery=delivery)
        return True
    except Exception as exc:
        logger.exception('Test update email failed: %s', exc)
        delivery.delete()
        return False


def send_update_email_broadcast(update: Update, sent_by) -> UpdateEmailDelivery:
    users = (
        UserProfile.objects.filter(receive_updates=True, user__email__isnull=False)
        .exclude(user__email='')
        .select_related('user')
    )
    delivery = UpdateEmailDelivery.objects.create(
        update=update,
        sent_by=sent_by,
        is_test=False,
        recipient_count=0,
    )
    sent = 0
    for profile in users.iterator():
        try:
            send_update_email_to_user(update, profile.user, delivery=delivery)
            sent += 1
        except Exception:
            logger.exception('Update email failed for user %s', profile.user_id)
    delivery.recipient_count = sent
    delivery.save(update_fields=['recipient_count'])
    return delivery


def mark_email_opened(tracking_token) -> bool:
    recipient = UpdateEmailRecipient.objects.filter(tracking_token=tracking_token).first()
    if not recipient:
        return False
    if recipient.opened_at is None:
        recipient.opened_at = timezone.now()
        recipient.save(update_fields=['opened_at'])
    return True
