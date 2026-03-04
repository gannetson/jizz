# Store raw percentage from CSV on CountrySpecies

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0082_countryspecies_frequency'),
    ]

    operations = [
        migrations.AddField(
            model_name='countryspecies',
            name='frequency_pct',
            field=models.FloatField(
                blank=True,
                help_text='Raw percentage from source (e.g. range_occupied_percent from eBird Status and Trends CSV)',
                null=True,
            ),
        ),
    ]
