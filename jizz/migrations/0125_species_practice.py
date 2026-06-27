# Generated manually for species-focused practice games

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0124_taxonomic_genus_and_ordering'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='focus_species',
            field=models.ForeignKey(
                blank=True,
                help_text='Target species for species_practice games.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='species_practice_games',
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
                    ('species_practice', 'Species practice'),
                ],
                default='standard',
                help_text='Extreme: favor rare species and species this player has missed before.',
                max_length=20,
            ),
        ),
    ]
