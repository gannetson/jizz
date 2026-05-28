"""Populate Country.codes with ISO 3166-1 alpha-3 aliases for eBird ST region_code matching."""

from django.db import migrations

from jizz.country_region_codes_data import ALPHA2_TO_ALPHA3


def populate_iso3_codes(apps, schema_editor):
    Country = apps.get_model("jizz", "Country")
    for country in Country.objects.all():
        cc = (country.code or "").strip().upper()
        if not cc:
            continue
        if cc == "NL":
            alpha3 = "NLD"
        else:
            alpha3 = ALPHA2_TO_ALPHA3.get(cc)
        if alpha3 and alpha3 != cc:
            country.codes = alpha3
            country.save(update_fields=["codes"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("jizz", "0094_countryspecies_frequency_vagrant"),
    ]

    operations = [
        migrations.RunPython(populate_iso3_codes, noop_reverse),
    ]
