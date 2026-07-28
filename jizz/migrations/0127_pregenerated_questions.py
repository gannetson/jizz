# Pregenerated game flow: locked Question.media + Game.questions_pregenerated

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('media', '0016_media_species_type_hide_idx'),
        ('jizz', '0126_flocks_phase1'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='questions_pregenerated',
            field=models.BooleanField(
                default=False,
                help_text='When True, all questions (and locked media) exist before play; '
                'add_question only advances to the next pre-created row.',
            ),
        ),
        migrations.AddField(
            model_name='question',
            name='media',
            field=models.ForeignKey(
                blank=True,
                help_text='When set, play always uses this exact media asset (pregenerated games).',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='locked_questions',
                to='media.media',
            ),
        ),
    ]
