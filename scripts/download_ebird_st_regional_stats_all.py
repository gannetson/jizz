#!/usr/bin/env python3
"""
Bulk-download eBird Status & Trends ``regional_stats`` CSVs (one file per species).

Uses the same ``st-download.ebird.org`` flow as ``jizz.ebird_st_commonness.download_regional_stats``:
list objects for ``{year}/{species}``, fetch ``regional_stats.csv`` or the regional ZIP, write
``{data_dir}/{species}_regional_stats.csv``.

Species that already have ``{code}_regional_stats.csv`` are skipped (no network, no pandas read)
unless ``--no-cache``. Failed lookups are not retried—missing S&T data is treated as absent.

Requirements
------------
- **EBIRD_ST_ACCESS_KEY** — Status & Trends download key (https://ebird.org/st/request).
  Django settings (e.g. ``jizz.settings.local``), env var, ``--access-key``, or parsed from
  ``jizz/settings/local.py`` via ``ebird_st_access_key_from_local_py``.
- **EBIRD_API_TOKEN** — Only if you use ``--species-source taxonomy`` (eBird taxonomy JSON).

Examples
--------
    export DJANGO_SETTINGS_MODULE=jizz.settings.local
    export EBIRD_ST_ACCESS_KEY=...
    export EBIRD_API_TOKEN=...

    # All eBird taxonomy species (large; use --limit for a dry run)
    ./scripts/download_ebird_st_regional_stats_all.py --data-dir ./jizz/ebird_st_csv

    # Species in this project's DB only
    ./scripts/download_ebird_st_regional_stats_all.py --species-source django

    # Merge taxonomy + explicit list
    ./scripts/download_ebird_st_regional_stats_all.py --species-source taxonomy django \\
        --species-file extra_codes.txt
"""
from __future__ import annotations

import argparse
import os
import sys
import time

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "jizz.settings.local")

import django

django.setup()

import requests
from django.conf import settings

from jizz.ebird_st_commonness import (
    download_regional_stats,
    ebird_st_access_key_from_local_py,
    load_species_codes_from_file,
    normalize_st_species_code,
    species_codes_from_data_dir,
)

EBIRD_TAXONOMY_URL = "https://api.ebird.org/v2/ref/taxonomy/ebird"


def fetch_taxonomy_species_codes(session: requests.Session, api_token: str) -> list[str]:
    """Distinct eBird species codes from the public taxonomy endpoint."""
    r = session.get(
        EBIRD_TAXONOMY_URL,
        params={"fmt": "json"},
        headers={"x-ebirdapitoken": api_token.strip()},
        timeout=180,
    )
    r.raise_for_status()
    rows = r.json()
    if not isinstance(rows, list):
        raise ValueError("taxonomy response is not a JSON list")
    out: set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        if row.get("category") != "species":
            continue
        code = row.get("speciesCode")
        if code:
            out.add(normalize_st_species_code(str(code)))
    return sorted(out)


def codes_from_django_species() -> list[str]:
    from jizz.models import Species

    return sorted(
        {
            normalize_st_species_code(c)
            for c in Species.objects.values_list("code", flat=True)
            if c
        }
    )


def default_data_dir() -> str:
    base = getattr(settings, "BASE_DIR", REPO_ROOT)
    nested = os.path.join(base, "jizz", "ebird_st_csv")
    flat = os.path.join(base, "ebird_st_csv")
    return nested if os.path.isdir(nested) else flat


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Download eBird S&T regional_stats CSVs for many species."
    )
    p.add_argument(
        "--species-source",
        nargs="+",
        choices=("taxonomy", "django", "data_dir"),
        default=["taxonomy"],
        help="Where to load species codes (default: taxonomy = full eBird species list).",
    )
    p.add_argument(
        "--species-file",
        action="append",
        default=[],
        metavar="PATH",
        help="Text file: one species code per line (repeatable).",
    )
    p.add_argument(
        "--data-dir",
        default=None,
        help="Output directory for *_regional_stats.csv (default: BASE_DIR/jizz/ebird_st_csv).",
    )
    p.add_argument(
        "--year",
        type=int,
        default=int(os.environ.get("EBIRD_ST_VERSION_YEAR", "2021")),
        help="S&T product year for list-obj / fetch paths.",
    )
    p.add_argument(
        "--access-key",
        default="",
        help="Override EBIRD_ST_ACCESS_KEY.",
    )
    p.add_argument(
        "--api-token",
        default="",
        help="Override EBIRD_API_TOKEN for --species-source taxonomy.",
    )
    p.add_argument(
        "--no-cache",
        action="store_true",
        help="Re-fetch even when CSV already exists.",
    )
    p.add_argument(
        "--delay",
        type=float,
        default=0.0,
        metavar="SEC",
        help="Sleep this many seconds after each species (rate limiting).",
    )
    p.add_argument(
        "--limit",
        type=int,
        default=0,
        metavar="N",
        help="Process at most N species (0 = no limit).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print species count and exit without downloading.",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    data_dir = args.data_dir or default_data_dir()
    os.makedirs(data_dir, exist_ok=True)

    codes: set[str] = set()
    for path in args.species_file:
        if not os.path.isfile(path):
            print(f"Species file not found: {path}", file=sys.stderr)
            return 1
        codes.update(load_species_codes_from_file(path))

    session = requests.Session()
    api_token = (args.api_token or "").strip() or (
        getattr(settings, "EBIRD_API_TOKEN", None) or ""
    ).strip()

    for src in args.species_source:
        if src == "taxonomy":
            if not api_token:
                print(
                    "EBIRD_API_TOKEN is required for --species-source taxonomy "
                    "(set env or use --api-token).",
                    file=sys.stderr,
                )
                return 1
            print("Fetching eBird taxonomy …", file=sys.stderr)
            codes.update(fetch_taxonomy_species_codes(session, api_token))
        elif src == "django":
            codes.update(codes_from_django_species())
        elif src == "data_dir":
            codes.update(species_codes_from_data_dir(data_dir))

    species_list = sorted(codes)
    if args.limit and args.limit > 0:
        species_list = species_list[: args.limit]

    if not species_list:
        print("No species codes to process.", file=sys.stderr)
        return 1

    print(
        f"data_dir={data_dir}  year={args.year}  species={len(species_list)}",
        file=sys.stderr,
    )
    if args.dry_run:
        return 0

    access_key = (args.access_key or "").strip() or getattr(
        settings, "EBIRD_ST_ACCESS_KEY", ""
    ).strip()
    if not access_key:
        access_key = ebird_st_access_key_from_local_py()

    use_cache = not args.no_cache

    def cache_path_for(code: str) -> str:
        return os.path.join(data_dir, f"{normalize_st_species_code(code)}_regional_stats.csv")

    needs_key = False
    if use_cache:
        for s in species_list:
            if not os.path.isfile(cache_path_for(s)):
                needs_key = True
                break
    else:
        needs_key = True

    if needs_key and not access_key:
        print(
            "Set EBIRD_ST_ACCESS_KEY (env/settings) or pass --access-key. "
            "See https://ebird.org/st/request",
            file=sys.stderr,
        )
        return 1

    n_cached = 0
    n_ok = 0
    n_fail = 0
    n_total = len(species_list)
    for i, sp in enumerate(species_list, 1):
        out_path = cache_path_for(sp)
        if use_cache and os.path.isfile(out_path):
            n_cached += 1
            print(
                f"[{i}/{n_total}] {sp}  found (cached)",
                file=sys.stderr,
                flush=True,
            )
            if args.delay > 0 and i < n_total:
                time.sleep(args.delay)
            continue

        df = download_regional_stats(
            sp,
            access_key,
            args.year,
            data_dir,
            use_cache,
            session,
            None,
        )
        if df is not None:
            n_ok += 1
            print(f"[{i}/{n_total}] {sp}  found", file=sys.stderr, flush=True)
        else:
            n_fail += 1
            print(f"[{i}/{n_total}] {sp}  not found", file=sys.stderr, flush=True)
        if args.delay > 0 and i < n_total:
            time.sleep(args.delay)

    print(
        f"Done. downloaded_ok={n_ok} cached_skipped={n_cached} "
        f"not_available={n_fail}",
        file=sys.stderr,
    )
    return 0 if (n_ok > 0 or n_cached > 0 or n_fail == 0) else 1


if __name__ == "__main__":
    raise SystemExit(main())
