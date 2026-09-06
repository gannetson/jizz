"""
Create playable Country rows for eBird subnational1 regions and curated aggregates.

Examples::

    python manage.py provision_playable_regions --parent US --dry-run
    python manage.py provision_playable_regions --parent US,CA,AU,MX
    python manage.py provision_playable_regions --aggregates
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from jizz.playable_regions import AGGREGATE_MEMBERS, PROVISION_PARENTS
from jizz.services.playable_regions import provision_aggregates, provision_subnational_parent


class Command(BaseCommand):
    help = "Provision playable subnational Country rows (and optional aggregates) from eBird."

    def add_arguments(self, parser):
        parser.add_argument(
            "--parent",
            type=str,
            default="",
            help="Comma-separated parent country codes (e.g. US,CA,AU,MX).",
        )
        parser.add_argument(
            "--aggregates",
            action="store_true",
            help="Create/update curated aggregates (US-EAST/WEST, China, Argentina).",
        )
        parser.add_argument(
            "--aggregate-codes",
            type=str,
            default="",
            help="Comma-separated aggregate codes (default: all when --aggregates).",
        )
        parser.add_argument(
            "--skip-species",
            action="store_true",
            help="Create Country rows only; do not call eBird spplist.",
        )
        parser.add_argument(
            "--skip-frequency",
            action="store_true",
            help="Do not copy peak member-state frequency onto aggregates.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List regions that would be created; do not write.",
        )

    def handle(self, *args, **options):
        parents = [p.strip().upper() for p in options["parent"].split(",") if p.strip()]
        do_aggregates = bool(options["aggregates"] or options["aggregate_codes"])
        if not parents and not do_aggregates:
            parents = list(PROVISION_PARENTS)
            do_aggregates = True
            self.stdout.write(
                "No --parent/--aggregates given; defaulting to "
                f"{', '.join(PROVISION_PARENTS)} plus aggregates."
            )

        sync_species = not options["skip_species"]
        dry_run = options["dry_run"]

        for parent in parents:
            self.stdout.write(f"Subnational1 for {parent}…")
            try:
                regions = provision_subnational_parent(
                    parent,
                    dry_run=dry_run,
                    sync_species=sync_species and not dry_run,
                )
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"  {parent}: {exc}"))
                continue
            self.stdout.write(f"  {len(regions)} regions")
            if dry_run:
                for country in regions[:12]:
                    self.stdout.write(f"    {country.code}  {country.name}")
                if len(regions) > 12:
                    self.stdout.write(f"    … {len(regions) - 12} more")

        if do_aggregates:
            codes = [c.strip().upper() for c in options["aggregate_codes"].split(",") if c.strip()]
            if not codes:
                codes = list(AGGREGATE_MEMBERS)
            self.stdout.write(f"Aggregates: {', '.join(codes)}")
            rows = provision_aggregates(
                codes=codes,
                dry_run=dry_run,
                sync_species=sync_species and not dry_run,
                score_frequency=not options["skip_frequency"] and not dry_run,
            )
            for country in rows:
                members = len(AGGREGATE_MEMBERS.get(country.code, ()))
                extra = ""
                if not dry_run:
                    extra = f"  species={country.countryspecies.count()}"
                self.stdout.write(f"  {country.code}  {country.name}  members={members}{extra}")
