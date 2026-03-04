# Add CountrySpecies.frequency (5-tier relative abundance)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0081_userprofile_timezone'),
    ]

    operations = [
        migrations.AddField(
            model_name='countryspecies',
            name='frequency',
            field=models.CharField(
                blank=True,
                choices=[
                    ('very_common', 'Very common'),
                    ('common', 'Common'),
                    ('uncommon', 'Uncommon'),
                    ('rare', 'Rare'),
                    ('very_rare', 'Very rare'),
                ],
                help_text='Relative abundance/frequency in this country (e.g. from eBird regional stats)',
                max_length=20,
                null=True,
            ),
        ),
    ]
