"""Export TaxonomicOrder / TaxonomicFamily texts for migration data."""

from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand

from jizz.models import TaxonomicFamily, TaxonomicOrder

DEFAULT_PATH = Path(__file__).resolve().parents[2] / 'migrations' / 'data' / 'taxonomy_texts.json'


class Command(BaseCommand):
    help = 'Write taxonomy names/descriptions to jizz/migrations/data/taxonomy_texts.json'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default=str(DEFAULT_PATH),
            help='Output JSON path (default: jizz/migrations/data/taxonomy_texts.json)',
        )

    def handle(self, *args, **options):
        output = Path(options['output'])
        output.parent.mkdir(parents=True, exist_ok=True)

        rows = []
        for order in TaxonomicOrder.objects.order_by('name_latin'):
            rows.append({
                'kind': 'order',
                'name_latin': order.name_latin,
                'name_en': order.name_en,
                'name_nl': order.name_nl,
                'description_en': order.description_en,
                'description_nl': order.description_nl,
            })
        for family in TaxonomicFamily.objects.select_related('taxonomic_order').order_by('name_latin'):
            rows.append({
                'kind': 'family',
                'name_latin': family.name_latin,
                'name_en': family.name_en,
                'name_nl': family.name_nl,
                'description_en': family.description_en,
                'description_nl': family.description_nl,
                'order_latin': family.taxonomic_order.name_latin if family.taxonomic_order_id else None,
            })

        with output.open('w', encoding='utf-8') as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=2)

        self.stdout.write(
            self.style.SUCCESS(
                f'Wrote {len(rows)} records ({sum(1 for r in rows if r["kind"] == "order")} orders, '
                f'{sum(1 for r in rows if r["kind"] == "family")} families) to {output}'
            )
        )
