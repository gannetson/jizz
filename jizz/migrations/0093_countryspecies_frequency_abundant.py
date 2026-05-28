from django.db import migrations, models


FREQUENCY_CHOICES = [
    ("abundant", "Abundant"),
    ("very_common", "Very common"),
    ("common", "Common"),
    ("fairly_common", "Fairly common"),
    ("uncommon", "Uncommon"),
    ("rare", "Rare"),
    ("very_rare", "Very rare"),
]


class Migration(migrations.Migration):

    dependencies = [
        ("jizz", "0092_birdrjourney"),
    ]

    operations = [
        migrations.AlterField(
            model_name="countryspecies",
            name="frequency",
            field=models.CharField(
                blank=True,
                choices=FREQUENCY_CHOICES,
                help_text="Relative abundance/frequency in this country (e.g. from eBird regional stats)",
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="countryspeciesfrequency",
            name="frequency",
            field=models.CharField(
                blank=True,
                choices=FREQUENCY_CHOICES,
                max_length=20,
                null=True,
            ),
        ),
    ]
