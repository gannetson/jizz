# Widen CountrySpeciesFrequency.source (longer eBird source slugs)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jizz", "0090_countryspeciesfrequency_ebird_provenance"),
    ]

    operations = [
        migrations.AlterField(
            model_name="countryspeciesfrequency",
            name="source",
            field=models.CharField(
                blank=True,
                default="ebird",
                help_text="e.g. ebird_api_freqlist, ebird_st_pct_percentile",
                max_length=64,
            ),
        ),
    ]
