"""
eBird Status & Trends → commonness table (SQLite + CSV).

By default loads species codes from ``CountrySpecies`` for ``--country``, merges with
optional files/extra codes, downloads missing S&T CSVs into ``--data-dir``, and writes
scores to SQLite and CSV.

Example::

    python manage.py ebird_st_commonness --country NL
    python manage.py ebird_st_commonness --country NL --no-db-species --species-file codes.txt
"""

import os
from typing import Optional

import pandas as pd
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models.functions import Lower

from jizz.ebird_st_commonness import (
    classify,
    download_regional_stats,
    ensure_species_stats_csv,
    ebird_st_access_key_from_local_py,
    load_species_codes_from_file,
    normalize_st_species_code,
    parse_species_commonness,
    species_codes_for_country,
    species_codes_from_data_dir,
    write_commonness_outputs,
)
from jizz.models import CountrySpecies


def _update_country_species_frequency_one(
    country_code: str,
    species_code: str,
    frequency: str,
    frequency_pct: Optional[float],
) -> int:
    """
    Set ``CountrySpecies.frequency`` / ``frequency_pct`` for one (country, species).
    Returns the number of rows updated (0 or 1). Matches species code case-insensitively.
    """
    country_code = country_code.strip().upper()
    code = normalize_st_species_code(str(species_code))
    pk = (
        CountrySpecies.objects.filter(country_id=country_code)
        .annotate(_lc=Lower("species__code"))
        .filter(_lc=code)
        .values_list("pk", flat=True)
        .first()
    )
    if pk is None:
        return 0
    return CountrySpecies.objects.filter(pk=pk).update(
        frequency=str(frequency),
        frequency_pct=frequency_pct,
    )


class Command(BaseCommand):
    help = (
        "Download eBird S&T regional/species_stats CSVs (if missing), score commonness "
        "for --country, write SQLite + CSV, and update CountrySpecies.frequency / "
        "frequency_pct after each species (unless --skip-country-species-write). Species list defaults to "
        "CountrySpecies rows for that country (use --no-db-species to disable)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            type=str,
            default=os.environ.get("COUNTRY_CODE", "NL"),
            help="Country code (Country.pk, e.g. NL). Netherlands uses ST region_code NLD only (not BON/Caribbean NL).",
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
            default=int(os.environ.get("EBIRD_ST_VERSION_YEAR", "2023")),
            help="S&T product year (list-obj / ZIP paths).",
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
            "--db-path",
            type=str,
            default=None,
            help="SQLite output path (default: BASE_DIR/data/commonness.db).",
        )
        parser.add_argument(
            "--csv-out",
            type=str,
            default=None,
            help="Output CSV path (default: BASE_DIR/data/commonness_{COUNTRY}.csv).",
        )
        parser.add_argument(
            "--skip-species-stats",
            action="store_true",
            help="Do not download *_species_stats.csv.",
        )
        parser.add_argument(
            "--no-db-species",
            action="store_true",
            help="Do not load species codes from CountrySpecies; use only file / data-dir / --species.",
        )
        parser.add_argument(
            "--skip-country-species-write",
            action="store_true",
            help="Do not update CountrySpecies.frequency / frequency_pct in the database.",
        )

    def handle(self, *args, **options):
        country = options["country"].strip().upper()
        base = settings.BASE_DIR
        if options["data_dir"]:
            data_dir = options["data_dir"]
        else:
            nested = os.path.join(base, "jizz", "ebird_st_csv")
            flat = os.path.join(base, "ebird_st_csv")
            data_dir = nested if os.path.isdir(nested) else flat
        sqlite_path = options["db_path"] or os.path.join(base, "data", "commonness.db")
        csv_out = options["csv_out"] or os.path.join(base, "data", f"commonness_{country}.csv")

        self.stdout.write(f"ebird_st_commonness data-dir: {data_dir}")

        species_list: list[str] = []
        if not options["no_db_species"]:
            db_codes = species_codes_for_country(country)
            species_list.extend(db_codes)
            self.stdout.write(
                f"Loaded {len(db_codes)} species code(s) from CountrySpecies for country={country}."
            )

        if options["species_file"]:
            path = options["species_file"]
            if not os.path.isfile(path):
                self.stderr.write(self.style.ERROR(f"Species file not found: {path}"))
                return
            species_list.extend(load_species_codes_from_file(path))

        species_list.extend(species_codes_from_data_dir(data_dir))
        for c in options["species"]:
            for part in c.split(","):
                part = part.strip()
                if part:
                    species_list.append(normalize_st_species_code(part))

        species_list = sorted(set(species_list))
        if not species_list:
            self.stderr.write(
                self.style.ERROR(
                    "No species codes: enable DB (--country with CountrySpecies rows), or use "
                    "--species-file / --species / CSVs under --data-dir, or pass --no-db-species "
                    "with file-based codes."
                )
            )
            return

        access_key = (options["access_key"] or "").strip() or getattr(
            settings, "EBIRD_ST_ACCESS_KEY", ""
        ) or ""
        if not access_key:
            access_key = ebird_st_access_key_from_local_py()

        use_cache = not options["no_cache"]
        cache_complete = all(
            os.path.isfile(os.path.join(data_dir, f"{s}_regional_stats.csv")) for s in species_list
        )
        if not access_key and not (cache_complete and use_cache):
            self.stderr.write(
                self.style.ERROR(
                    "Set EBIRD_ST_ACCESS_KEY in Django settings (e.g. local.py) or pass --access-key. "
                    "Not required if all regional_stats CSVs exist and cache is enabled."
                )
            )
            return

        session = requests.Session()
        rows = []
        db_updated = 0
        n = len(species_list)
        for i, sp in enumerate(species_list, 1):
            self.stdout.write(f"[{i}/{n}] {sp} …")
            # Let ensure_species_stats_csv / download_regional_stats call list-obj when needed.
            # Prefetching here duplicated calls and could pass paths=[] from API into download,
            # breaking cache-only runs when list returned empty.
            # if access_key and not options["skip_species_stats"]:
            #     ensure_species_stats_csv(
            #         sp,
            #         access_key,
            #         options["year"],
            #         data_dir,
            #         use_cache,
            #         session,
            #         None,
            #     )

            df = download_regional_stats(
                sp,
                access_key,
                options["year"],
                data_dir,
                use_cache,
                session,
                None,
            )
            parsed = parse_species_commonness(df, country) if df is not None else None
            if not parsed:
                continue
            score = parsed["score"]
            rarity_cap = parsed.get("rarity_cap")
            freq = classify(score, rarity_cap=rarity_cap)
            freq_pct = float(parsed["frequency_pct"])
            row_out = {
                "species_code": sp,
                "country_code": country,
                "abundance": parsed["abundance"],
                "abundance_mean_avg": parsed.get("abundance_mean_avg"),
                "abundance_mean_max": parsed.get("abundance_mean_max"),
                "range_total_percent": parsed.get("range_total_percent"),
                "total_pop_percent": parsed.get("total_pop_percent"),
                "range_days_occupation": parsed.get("range_days_occupation"),
                "occupancy": parsed.get("occupancy"),
                "score": score,
                "frequency": freq,
                "frequency_pct": freq_pct,
                "rarity_cap": rarity_cap,
                "debug_score_linear": parsed.get("debug_score_linear"),
                "debug_range_component": parsed.get("debug_range_component"),
                "debug_pop_component": parsed.get("debug_pop_component"),
                "debug_days_component": parsed.get("debug_days_component"),
                "debug_range_occupied_max": parsed.get("debug_range_occupied_max"),
            }
            rows.append(row_out)
            n_db = 0
            if not options["skip_country_species_write"]:
                n_db = _update_country_species_frequency_one(country, sp, freq, freq_pct)
                db_updated += int(n_db)
            db_note = ""
            if not options["skip_country_species_write"]:
                db_note = "  db=ok" if n_db else "  db=— (no CountrySpecies row)"
            cap_note = f"  [rarity-cap={rarity_cap}]" if rarity_cap else ""
            self.stdout.write(
                f"    → frequency={freq}  frequency_pct={freq_pct:.2f}%  score={score:.4f}"
                f"{cap_note}{db_note}"
            )

        result = pd.DataFrame(rows)
        if result.empty:
            self.stderr.write(self.style.WARNING("No species with ST data for this country."))
            return

        result = result.sort_values("score", ascending=False).reset_index(drop=True)
        write_commonness_outputs(result, sqlite_path, csv_out)

        if not options["skip_country_species_write"]:
            skipped = len(result) - db_updated
            self.stdout.write(
                self.style.SUCCESS(
                    f"CountrySpecies DB: {db_updated} row(s) updated during run "
                    f"({len(result)} species scored)."
                )
            )
            if skipped > 0:
                self.stderr.write(
                    self.style.WARNING(
                        f"{skipped} scored species had no CountrySpecies row for country={country} "
                        "(see db=— lines above)."
                    )
                )
        else:
            self.stdout.write("Skipped CountrySpecies DB update (--skip-country-species-write).")

        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote SQLite table 'commonness' → {sqlite_path} ({len(result)} rows)\n"
                f"Wrote CSV → {csv_out}"
            )
        )
        self.stdout.write(result.head(15).to_string(index=False))
