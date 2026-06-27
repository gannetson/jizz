# Generated manually for pair practice game mode

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0122_remove_journeystep_tax_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='pair_species_high',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pair_practice_games_high',
                to='jizz.species',
            ),
        ),
        migrations.AddField(
            model_name='game',
            name='pair_species_low',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pair_practice_games_low',
                to='jizz.species',
            ),
        ),
        migrations.AlterField(
            model_name='game',
            name='game_type',
            field=models.CharField(
                choices=[
                    ('standard', 'Standard'),
                    ('extreme', 'Extreme'),
                    ('pair_practice', 'Pair practice'),
                ],
                default='standard',
                help_text='Extreme: favor rare species and species this player has missed before.',
                max_length=20,
            ),
        ),
    ]
