# Align CountrySpecies.frequency choices with jizz.ebird_st_commonness.classify()

from django.db import migrations, models


def forwards_map_old_frequency_labels(apps, schema_editor):
    MAP = {
        "fairly_common": "common",
        "very_rare": "extremely_rare",
    }
    CountrySpecies = apps.get_model("jizz", "CountrySpecies")
    CountrySpeciesFrequency = apps.get_model("jizz", "CountrySpeciesFrequency")
    for old, new in MAP.items():
        CountrySpecies.objects.filter(frequency=old).update(frequency=new)
        CountrySpeciesFrequency.objects.filter(frequency=old).update(frequency=new)


def backwards_noop(apps, schema_editor):
    pass


NEW_CHOICES = [
    ("abundant", "Abundant"),
    ("very_common", "Very common"),
    ("common", "Common"),
    ("uncommon", "Uncommon"),
    ("scarce", "Scarce"),
    ("rare", "Rare"),
    ("extremely_rare", "Extremely rare"),
]


class Migration(migrations.Migration):

    dependencies = [
        ("jizz", "0086_gbif_commonness"),
    ]

    operations = [
        migrations.RunPython(forwards_map_old_frequency_labels, backwards_noop),
        migrations.AlterField(
            model_name="countryspecies",
            name="frequency",
            field=models.CharField(
                blank=True,
                choices=NEW_CHOICES,
                help_text=(
                    "Relative abundance from eBird Status & Trends commonness "
                    "(same tiers as classify() in ebird_st_commonness)."
                ),
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="countryspeciesfrequency",
            name="frequency",
            field=models.CharField(
                blank=True,
                choices=NEW_CHOICES,
                max_length=20,
                null=True,
            ),
        ),
    ]
