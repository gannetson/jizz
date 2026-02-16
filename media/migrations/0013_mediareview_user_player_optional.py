# Migration: allow MediaReview to be by authenticated user or by player.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('jizz', '0077_alter_flagquestion_question'),
        ('media', '0012_cleanup_media_contributor_html'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='mediareview',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='mediareview',
            name='user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='media_reviews',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='mediareview',
            name='player',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='media_reviews',
                to='jizz.player',
            ),
        ),
        migrations.AddConstraint(
            model_name='mediareview',
            constraint=models.UniqueConstraint(
                condition=models.Q(('player__isnull', False)),
                fields=('media', 'player'),
                name='media_review_unique_media_player',
            ),
        ),
        migrations.AddConstraint(
            model_name='mediareview',
            constraint=models.UniqueConstraint(
                condition=models.Q(('user__isnull', False)),
                fields=('media', 'user'),
                name='media_review_unique_media_user',
            ),
        ),
        migrations.AddConstraint(
            model_name='mediareview',
            constraint=models.CheckConstraint(
                check=models.Q(('player__isnull', False)) | models.Q(('user__isnull', False)),
                name='media_review_reviewer_set',
            ),
        ),
    ]
