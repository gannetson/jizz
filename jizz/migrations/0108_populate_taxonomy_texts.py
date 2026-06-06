"""
Load taxonomy display names and descriptions from committed JSON export.

Regenerate the data file after reviewing local fill results:

  ./manage.py fill_taxonomy_texts --force
  ./manage.py export_taxonomy_texts

Then commit jizz/migrations/data/taxonomy_texts.json with any migration update.
"""

from __future__ import annotations

import json
from pathlib import Path

from django.db import migrations, models


def _load_rows() -> list[dict]:
    data_path = Path(__file__).with_name('data') / 'taxonomy_texts.json'
    with data_path.open(encoding='utf-8') as fh:
        rows = json.load(fh)
    if not isinstance(rows, list):
        raise ValueError('taxonomy_texts.json must contain a JSON list')
    return rows


def forwards(apps, schema_editor):
    TaxonomicOrder = apps.get_model('jizz', 'TaxonomicOrder')
    TaxonomicFamily = apps.get_model('jizz', 'TaxonomicFamily')

    orders_by_latin = {order.name_latin: order for order in TaxonomicOrder.objects.all()}
    families_by_latin = {family.name_latin: family for family in TaxonomicFamily.objects.all()}

    orders_to_update = []
    families_to_update = []

    for row in _load_rows():
        kind = row.get('kind')
        name_latin = (row.get('name_latin') or '').strip()
        if not name_latin:
            continue

        fields = {
            'name_en': row.get('name_en') or name_latin,
            'name_nl': row.get('name_nl') or name_latin,
            'description_en': row.get('description_en') or '',
            'description_nl': row.get('description_nl') or '',
        }

        if kind == 'order':
            order = orders_by_latin.get(name_latin)
            if order is None:
                continue
            for attr, value in fields.items():
                setattr(order, attr, value)
            orders_to_update.append(order)
            continue

        if kind == 'family':
            family = families_by_latin.get(name_latin)
            if family is None:
                continue
            for attr, value in fields.items():
                setattr(family, attr, value)
            order_latin = (row.get('order_latin') or '').strip() or None
            if order_latin:
                family.taxonomic_order = orders_by_latin.get(order_latin)
            families_to_update.append(family)

    if orders_to_update:
        TaxonomicOrder.objects.bulk_update(
            orders_to_update,
            ['name_en', 'name_nl', 'description_en', 'description_nl'],
        )
    if families_to_update:
        TaxonomicFamily.objects.bulk_update(
            families_to_update,
            ['name_en', 'name_nl', 'description_en', 'description_nl', 'taxonomic_order'],
        )


def backwards(apps, schema_editor):
    TaxonomicOrder = apps.get_model('jizz', 'TaxonomicOrder')
    TaxonomicFamily = apps.get_model('jizz', 'TaxonomicFamily')

    TaxonomicOrder.objects.update(
        name_en=models.F('name_latin'),
        name_nl=models.F('name_latin'),
        description_en='',
        description_nl='',
    )
    TaxonomicFamily.objects.update(
        name_en=models.F('name_latin'),
        name_nl=models.F('name_latin'),
        description_en='',
        description_nl='',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0107_populate_taxonomy_from_species'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
