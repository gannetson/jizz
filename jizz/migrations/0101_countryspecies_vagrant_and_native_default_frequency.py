# Align CountrySpecies.frequency with checklist status:
# - status=rare + frequency=rare -> vagrant (MEGA / vagrant tier)
# - status in (native, endemic) + missing frequency -> rare (default tier)

from django.db import migrations, models


def forwards(apps, schema_editor):
    CountrySpecies = apps.get_model("jizz", "CountrySpecies")

    CountrySpecies.objects.filter(
        status="rare",
    ).update(frequency="vagrant")

    CountrySpecies.objects.filter(
        status__in=("native", "endemic"),
    ).filter(
        models.Q(frequency__isnull=True) | models.Q(frequency="")
    ).update(frequency="rare")


def backwards(apps, schema_editor):
    # No safe automatic rollback; values may have been edited after migrate.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("jizz", "0100_update_countryspecies_frequency_from_commonness_csv"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
