"""
Fill TaxonomicOrder / TaxonomicFamily name_en, name_nl and descriptions.

English names from eBird (familyComName / order spuh). Dutch names and all
descriptions from Wikipedia in the matching language — never translated.

Review results locally (Django admin or --export-json), then load on production via data dump.

Examples:
  ./manage.py fill_taxonomy_texts --dry-run --limit 3
  ./manage.py fill_taxonomy_texts --kind family
  ./manage.py fill_taxonomy_texts --export-json ./taxonomy_texts.json
  ./manage.py fill_taxonomy_texts --force
"""

from __future__ import annotations

import json
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count

from jizz.models import TaxonomicFamily, TaxonomicOrder
from jizz.services.taxonomy_texts import (
    WikipediaClient,
    build_ebird_family_maps,
    build_ebird_order_names,
    build_family_texts,
    build_order_texts,
    family_order_links_to_apply,
    fetch_ebird_sppgroups,
    fetch_ebird_taxonomy,
    prefetch_wikipedia_for_taxa,
)


class Command(BaseCommand):
    help = 'Fill taxonomy texts from eBird names + Wikipedia EN/NL intros.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--kind',
            choices=('all', 'order', 'family'),
            default='all',
            help='Which taxonomy tables to process (default: all)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite rows that already have descriptions (default: skip them)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show planned updates without saving to the database',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Max rows per kind to process (for testing)',
        )
        parser.add_argument(
            '--export-json',
            type=str,
            default=None,
            help='Also write results to this JSON file',
        )
        parser.add_argument(
            '--skip-link-orders',
            action='store_true',
            help='Do not set TaxonomicFamily.taxonomic_order from eBird taxonomy',
        )
        parser.add_argument(
            '--sleep',
            type=float,
            default=0.35,
            help='Minimum seconds between Wikipedia API requests (default: 0.35)',
        )

    def handle(self, *args, **options):
        only_missing = not options['force']
        try:
            ebird_rows = fetch_ebird_taxonomy(categories='species,spuh')
        except ValueError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f'Failed to fetch eBird taxonomy: {exc}') from exc

        family_en, family_order = build_ebird_family_maps(ebird_rows)
        try:
            ebird_groups = fetch_ebird_sppgroups()
        except Exception as exc:
            raise CommandError(f'Failed to fetch eBird species groups: {exc}') from exc
        order_en = build_ebird_order_names(ebird_rows, ebird_groups)
        wiki = WikipediaClient(min_interval=options['sleep'])

        if not options['skip_link_orders']:
            self._link_families_to_orders(
                family_order=family_order,
                dry_run=options['dry_run'],
            )

        taxon_names = self._taxon_names_to_process(
            kind=options['kind'],
            only_missing=only_missing,
            limit=options['limit'],
        )
        if taxon_names:
            self.stdout.write(
                f'Prefetching Wikipedia data for {len(taxon_names)} taxa '
                f'(~{max(1, len(taxon_names) // 20 + 1)} batched requests per language)...'
            )
            prefetch_wikipedia_for_taxa(wiki, latin_names=taxon_names)

        export_rows: list[dict[str, Any]] = []
        kinds = []
        if options['kind'] in ('all', 'order'):
            kinds.append('order')
        if options['kind'] in ('all', 'family'):
            kinds.append('family')

        for kind in kinds:
            self._process_kind(
                kind=kind,
                only_missing=only_missing,
                dry_run=options['dry_run'],
                limit=options['limit'],
                family_en=family_en,
                order_en=order_en,
                wiki=wiki,
                export_rows=export_rows,
            )

        if options['export_json']:
            with open(options['export_json'], 'w', encoding='utf-8') as fh:
                json.dump(export_rows, fh, ensure_ascii=False, indent=2)
            self.stdout.write(self.style.SUCCESS(f'Wrote {len(export_rows)} records to {options["export_json"]}'))

    def _taxon_names_to_process(
        self,
        *,
        kind: str,
        only_missing: bool,
        limit: int | None,
    ) -> list[str]:
        names: list[str] = []

        if kind in ('all', 'order'):
            qs = TaxonomicOrder.objects.order_by('name_latin')
            if only_missing:
                qs = qs.filter(description_en='')
            order_names = list(qs.values_list('name_latin', flat=True))
            if limit is not None:
                order_names = order_names[:limit]
            names.extend(order_names)

        if kind in ('all', 'family'):
            qs = TaxonomicFamily.objects.order_by('name_latin')
            if only_missing:
                qs = qs.filter(description_en='')
            family_names = list(qs.values_list('name_latin', flat=True))
            if limit is not None:
                family_names = family_names[:limit]
            names.extend(family_names)

        return sorted(set(names))

    def _link_families_to_orders(
        self,
        *,
        family_order: dict[str, str],
        dry_run: bool,
    ):
        orders_by_latin = {
            order.name_latin: order for order in TaxonomicOrder.objects.all()
        }
        families = list(TaxonomicFamily.objects.select_related('taxonomic_order'))
        links = family_order_links_to_apply(
            family_order=family_order,
            families=families,
            orders_by_latin=orders_by_latin,
        )

        if not links:
            self.stdout.write('Family→order links: all families already match eBird taxonomy.')
            return

        label = 'Would link' if dry_run else 'Linked'
        self.stdout.write(f'{label} {len(links)} families to orders from eBird taxonomy...')
        for family, order, order_latin in links[:10]:
            self.stdout.write(f'  {family.name_latin} -> {order_latin}')
        if len(links) > 10:
            self.stdout.write(f'  ... and {len(links) - 10} more')

        if dry_run:
            return

        for family, order, _order_latin in links:
            family.taxonomic_order = order
            family.save(update_fields=['taxonomic_order'])

    def _process_kind(
        self,
        *,
        kind: str,
        only_missing: bool,
        dry_run: bool,
        limit: int | None,
        family_en: dict[str, str],
        order_en: dict[str, str],
        wiki: WikipediaClient,
        export_rows: list[dict[str, Any]],
    ):
        if kind == 'order':
            qs = TaxonomicOrder.objects.annotate(species_count=Count('species')).order_by('name_latin')
            label = 'orders'
        else:
            qs = (
                TaxonomicFamily.objects.select_related('taxonomic_order')
                .annotate(species_count=Count('species'))
                .order_by('name_latin')
            )
            label = 'families'

        if only_missing:
            qs = qs.filter(description_en='')

        total = qs.count()
        rows = list(qs[:limit] if limit is not None else qs)
        self.stdout.write(f'Processing {len(rows)} {label} ({total} matching filter)...')

        for idx, obj in enumerate(rows, start=1):
            prefix = f'[{kind} {obj.name_latin}]'

            if kind == 'order':
                result = build_order_texts(
                    name_latin=obj.name_latin,
                    order_en=order_en,
                    wiki=wiki,
                )
            else:
                result = build_family_texts(
                    name_latin=obj.name_latin,
                    family_en=family_en,
                    wiki=wiki,
                )

            desc_en = result['description_en'][:120] if result['description_en'] else ''
            desc_nl = result['description_nl'][:120] if result['description_nl'] else ''

            if dry_run:
                self.stdout.write(
                    f'{prefix} dry-run ({obj.species_count} species, id={obj.pk})\n'
                    f'  name_en={result["name_en"]!r} name_nl={result["name_nl"]!r}\n'
                    f'  description_en={desc_en!r}\n'
                    f'  description_nl={desc_nl!r}'
                )
                export_rows.append({
                    'kind': kind,
                    'id': obj.pk,
                    'name_latin': obj.name_latin,
                    'dry_run': True,
                    **result,
                })
                continue

            obj.name_en = result['name_en']
            obj.name_nl = result['name_nl']
            obj.description_en = result['description_en']
            obj.description_nl = result['description_nl']
            obj.save(update_fields=['name_en', 'name_nl', 'description_en', 'description_nl'])

            export_rows.append({
                'kind': kind,
                'id': obj.pk,
                'name_latin': obj.name_latin,
                **result,
            })

            self.stdout.write(
                self.style.SUCCESS(
                    f'{prefix} ({idx}/{len(rows)}): {result["name_en"]} / {result["name_nl"]}'
                )
            )
