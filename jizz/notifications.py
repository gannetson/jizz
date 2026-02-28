"""
Push and email notifications for daily challenges.
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import html2text
import logging

logger = logging.getLogger(__name__)


def send_push_to_user(user, title, body, data=None):
    """Send push notification to all devices of the user. Uses Expo Push API if SEND_PUSH_NOTIFICATIONS True."""
    from jizz.models import DeviceToken
    data = data or {}
    tokens = list(DeviceToken.objects.filter(user=user).values_list('token', 'platform'))
    if not tokens:
        return
    expo_push_url = getattr(settings, 'EXPO_PUSH_URL', 'https://exp.host/--/api/v2/push/send')
    for token, _platform in tokens:
        try:
            payload = {'to': token, 'title': title, 'body': body, 'data': data, 'sound': 'default'}
            if getattr(settings, 'SEND_PUSH_NOTIFICATIONS', False):
                import requests
                resp = requests.post(expo_push_url, json=payload, timeout=10)
                if resp.status_code != 200:
                    logger.warning('Expo push failed: %s %s', resp.status_code, resp.text)
        except Exception as e:
            logger.warning('Push send failed: %s', e)


def send_daily_challenge_reminder_email(user, challenge, round_obj, hours_left):
    """Send reminder email (4h or 1h left)."""
    try:
        subject = f'Birdr: {hours_left} hour{"s" if hours_left != 1 else ""} left for today\'s challenge'
        html_content = render_to_string('emails/daily_challenge_reminder.html', {
            'challenge': challenge,
            'round': round_obj,
            'hours_left': hours_left,
        })
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 0
        text_content = h.handle(html_content)
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@birdr.pro')
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send()
    except Exception:
        pass


def send_daily_challenge_all_answered_email(user, challenge, round_obj, ranking_data):
    """Notify user that all players answered and show ranking."""
    try:
        subject = 'Birdr: All players answered – see today\'s ranking'
        html_content = render_to_string('emails/daily_challenge_all_answered.html', {
            'challenge': challenge,
            'round': round_obj,
            'ranking': ranking_data,
        })
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 0
        text_content = h.handle(html_content)
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@birdr.pro')
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send()
    except Exception:
        pass


def send_daily_challenge_final_results_email(user, challenge, ranking_data):
    """Send 7-day final results."""
    try:
        subject = 'Birdr: Your Daily Challenge has ended – final results'
        html_content = render_to_string('emails/daily_challenge_final_results.html', {
            'challenge': challenge,
            'ranking': ranking_data,
        })
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.body_width = 0
        text_content = h.handle(html_content)
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@birdr.pro')
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[user.email],
        )
        msg.attach_alternative(html_content, 'text/html')
        msg.send()
    except Exception:
        pass
