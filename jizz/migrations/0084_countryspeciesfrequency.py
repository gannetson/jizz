# CountrySpeciesFrequency: per-month frequency from eBird

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0083_countryspecies_frequency_pct'),
    ]

    operations = [
        migrations.CreateModel(
            name='CountrySpeciesFrequency',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(12)])),
                ('frequency_pct', models.FloatField(blank=True, null=True)),
                ('frequency', models.CharField(blank=True, choices=[('very_common', 'Very common'), ('common', 'Common'), ('fairly_common', 'Fairly common'), ('uncommon', 'Uncommon'), ('rare', 'Rare'), ('very_rare', 'Very rare')], max_length=20, null=True)),
                ('country_species', models.ForeignKey(on_delete=models.CASCADE, related_name='frequency_by_month', to='jizz.countryspecies')),
            ],
            options={
                'verbose_name': 'Country Species Frequency',
                'verbose_name_plural': 'Country Species Frequencies',
                'ordering': ['country_species', 'month'],
            },
        ),
        migrations.AddConstraint(
            model_name='countryspeciesfrequency',
            constraint=models.UniqueConstraint(fields=('country_species', 'month'), name='jizz_countryspeciesfrequency_unique_country_species_month'),
        ),
    ]
