"""
Download eBird Status & Trends CSVs into the local cache directory.

This is intentionally separate from ``manage.py ebird_st_commonness`` so you can:
- pre-warm caches (CI / cron / one-time import)
- run commonness scoring in offline mode (see --cache-only)
"""

from __future__ import annotations

import os
from typing import List, Optional

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from jizz.ebird_st_commonness import (
    download_regional_stats,
    ebird_st_access_key_from_local_py,
    ensure_species_stats_csv,
    load_species_codes_from_file,
    normalize_st_species_code,
    species_codes_from_data_dir,
)


def _default_data_dir(base_dir: str) -> str:
    nested = os.path.join(base_dir, "jizz", "ebird_st_csv")
    flat = os.path.join(base_dir, "ebird_st_csv")
    return nested if os.path.isdir(nested) else flat


def _all_species_codes_from_db() -> List[str]:
    from jizz.models import Species

    qs = Species.objects.values_list("code", flat=True)
    return sorted({normalize_st_species_code(c) for c in qs if c and str(c).strip()})


class Command(BaseCommand):
    help = (
        "Download eBird Status & Trends CSVs into the local data-dir cache. "
        "By default downloads *_regional_stats.csv for every Species in the DB."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--data-dir",
            type=str,
            default=None,
            help=(
                "Folder for *_regional_stats.csv. Default: BASE_DIR/jizz/ebird_st_csv if that "
                "directory exists, else BASE_DIR/ebird_st_csv."
            ),
        )
        parser.add_argument(
            "--year",
            type=int,
            default=int(os.environ.get("EBIRD_ST_VERSION_YEAR", "2021")),
            help="S&T product year (older years are tried automatically when needed).",
        )
        parser.add_argument(
            "--no-cache",
            action="store_true",
            help="Re-download CSVs even if present.",
        )
        parser.add_argument(
            "--access-key",
            type=str,
            default="",
            help="Override EBIRD_ST_ACCESS_KEY (default: Django settings, then local.py parse).",
        )
        parser.add_argument(
            "--species-file",
            type=str,
            default=None,
            help="Optional file: one species code per line (merged with DB / data-dir / --species).",
        )
        parser.add_argument(
            "--species",
            nargs="*",
            default=[],
            metavar="CODE",
            help="Extra eBird species codes (repeatable or comma-separated in one arg).",
        )
        parser.add_argument(
            "--no-db-species",
            action="store_true",
            help="Do not load species codes from the DB; use only file / data-dir / --species.",
        )
        parser.add_argument(
            "--include-species-stats",
            action="store_true",
            help="Also download *_species_stats.csv (in addition to regional_stats).",
        )

    def handle(self, *args, **options):
        base = settings.BASE_DIR
        data_dir = options["data_dir"] or _default_data_dir(base)
        os.makedirs(data_dir, exist_ok=True)
        self.stdout.write(f"eBird ST cache dir: {data_dir}")

        access_key = (options["access_key"] or "").strip() or getattr(
            settings, "EBIRD_ST_ACCESS_KEY", ""
        ) or ""
        if not access_key:
            access_key = ebird_st_access_key_from_local_py()
        if not access_key:
            self.stderr.write(
                self.style.ERROR(
                    "Missing EBIRD_ST_ACCESS_KEY (settings/local.py/--access-key). "
                    "Required to download CSVs."
                )
            )
            return

        species = self._build_species_list(options, data_dir)
        if not species:
            self.stderr.write(self.style.ERROR("No species codes to download."))
            return

        session = requests.Session()
        use_cache = not options["no_cache"]
        year = int(options["year"])

        ok_regional = 0
        ok_species = 0
        skipped = 0
        failed = 0

        n = len(species)
        science_year_cache: dict = {}
        for i, sp in enumerate(species, 1):
            cache_path = os.path.join(data_dir, f"{sp}_regional_stats.csv")
            if use_cache and os.path.isfile(cache_path):
                skipped += 1
                continue

            self.stdout.write(f"[{i}/{n}] {sp} …")
            df = download_regional_stats(
                sp,
                access_key,
                year,
                data_dir,
                use_cache,
                session,
                None,
                science_year_cache=science_year_cache,
            )
            if df is None:
                failed += 1
                continue
            ok_regional += 1

            if options["include_species_stats"]:
                # This helper uses list-obj internally when paths=None.
                got = ensure_species_stats_csv(
                    sp,
                    access_key,
                    year,
                    data_dir,
                    use_cache,
                    session,
                    None,
                )
                ok_species += int(bool(got))

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. regional_stats ok={ok_regional}, species_stats ok={ok_species}, "
                f"skipped={skipped}, failed={failed}"
            )
        )

    def _build_species_list(self, options: dict, data_dir: str) -> List[str]:
        extra: List[str] = []
        if options["species_file"]:
            path = options["species_file"]
            if not os.path.isfile(path):
                self.stderr.write(self.style.ERROR(f"Species file not found: {path}"))
                return []
            extra.extend(load_species_codes_from_file(path))
        extra.extend(species_codes_from_data_dir(data_dir))
        for c in options["species"]:
            for part in c.split(","):
                part = part.strip()
                if part:
                    extra.append(normalize_st_species_code(part))
        extra = sorted(set(extra))

        if options["no_db_species"]:
            return extra

        db_codes = _all_species_codes_from_db()
        merged = list(db_codes)
        for sp in extra:
            if sp not in merged:
                merged.append(sp)
        return sorted(set(merged))

