"""Email notifications for user feedback."""

from django.conf import settings
from django.core.mail import send_mail


def feedback_sender_label(feedback) -> str:
    parts = []
    if feedback.user_id:
        user = feedback.user
        label = (user.get_full_name() or '').strip() or user.username
        if user.email:
            label = f'{label} ({user.email})'
        parts.append(label)
    if feedback.player_id:
        parts.append(feedback.player.name)
    return ' / '.join(parts) if parts else 'Anonymous'


def send_feedback_notification(feedback) -> None:
    sender = feedback_sender_label(feedback)
    subject = f'Birdr feedback from {sender}'
    body = f'From: {sender}\n\n{feedback.comment or ""}'
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [settings.CONTACT_EMAIL],
        fail_silently=False,
    )
