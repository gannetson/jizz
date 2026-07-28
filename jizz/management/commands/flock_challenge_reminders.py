"""Remind flock members to play an active challenge they haven't finished."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Exists, OuterRef
from django.utils import timezone

from jizz.models import FlockChallenge, FlockChallengeAttempt, FlockMembership
from jizz.notifications import send_push_to_user


class Command(BaseCommand):
    help = (
        'Send push reminders ~24h before an active flock challenge ends, '
        'to members who have not completed a ranked attempt. Run daily via cron.'
    )

    def handle(self, *args, **options):
        now = timezone.now()
        # Daily cron: notify once when between 12h and 24h remain.
        challenges = (
            FlockChallenge.objects.filter(
                status=FlockChallenge.STATUS_ACTIVE,
                starts_at__lte=now,
                ends_at__gt=now + timedelta(hours=12),
                ends_at__lte=now + timedelta(hours=24),
            )
            .select_related('flock')
        )
        sent = 0
        for challenge in challenges:
            completed = FlockChallengeAttempt.objects.filter(
                challenge=challenge,
                user_id=OuterRef('user_id'),
                is_ranked=True,
                completed_at__isnull=False,
            )
            memberships = (
                FlockMembership.objects.filter(flock=challenge.flock)
                .annotate(has_ranked=Exists(completed))
                .filter(has_ranked=False)
                .select_related('user')
            )
            title = f'Birdr: {challenge.flock.name}'
            body = (
                f'24 hours left to play this week\'s challenge — '
                f'{challenge.title}. Tap to play!'
            )
            data = {
                'type': 'flock_challenge',
                'flock_slug': challenge.flock.slug,
                'challenge_id': challenge.id,
            }
            for membership in memberships:
                try:
                    send_push_to_user(membership.user, title, body, data=data)
                    sent += 1
                except Exception:
                    pass
        self.stdout.write(self.style.SUCCESS(f'Flock challenge reminders sent: {sent}'))
