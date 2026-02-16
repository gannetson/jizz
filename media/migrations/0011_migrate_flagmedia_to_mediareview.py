# Data migration: copy FlagMedia rows to MediaReview (rejected), preserving created date.

from django.db import migrations


def flagmedia_to_mediareview(apps, schema_editor):
    FlagMedia = apps.get_model('media', 'FlagMedia')
    MediaReview = apps.get_model('media', 'MediaReview')

    for flag in FlagMedia.objects.select_related('media', 'player').iterator():
        review, created = MediaReview.objects.get_or_create(
            media=flag.media,
            player=flag.player,
            defaults={
                'review_type': 'rejected',
                'description': flag.description or '',
            },
        )
        if created:
            # Preserve original flag created date
            MediaReview.objects.filter(pk=review.pk).update(created=flag.created)
        else:
            # Already had a review; treat flag as rejection and update
            review.review_type = 'rejected'
            review.description = flag.description or ''
            review.save(update_fields=['review_type', 'description'])


def noop_reverse(apps, schema_editor):
    # Cannot reliably identify MediaReviews that came from FlagMedia; leave data as-is.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0010_alter_media_species_flagmedia'),
    ]

    operations = [
        migrations.RunPython(flagmedia_to_mediareview, noop_reverse),
    ]
