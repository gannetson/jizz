"""
eBird Status & Trends → commonness table (SQLite + CSV).

By default processes every country that has ``CountrySpecies`` rows. Use ``--country``
for a single country. Loads ``Species`` linked to those countries, downloads one CSV
per species, then scores every country row present in that CSV.

Example::

    python manage.py ebird_st_commonness
    python manage.py ebird_st_commonness --country NL
    python manage.py ebird_st_commonness --country NL --no-db-species --species-file codes.txt
"""

from __future__ import annotations

import os
from collections import defaultdict
from typing import Dict, List, Optional

import pandas as pd
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q
from django.db.models.functions import Lower

from jizz.ebird_st_commonness import (
    classify_from_abundance,
    countries_in_regional_stats,
    download_regional_stats,
    ebird_st_access_key_from_local_py,
    load_species_codes_from_file,
    normalize_st_species_code,
    parse_species_commonness,
    species_codes_for_selected_countries,
    species_codes_from_data_dir,
    write_commonness_outputs,
)
from jizz.models import CountrySpecies


def _country_species_has_frequency(country_code: str, species_code: str) -> bool:
    """True if the CountrySpecies row exists and ``frequency`` is already set."""
    country_code = country_code.strip().upper()
    code = normalize_st_species_code(str(species_code))
    return (
        CountrySpecies.objects.filter(country_id=country_code)
        .annotate(_lc=Lower("species__code"))
        .filter(_lc=code)
        .exclude(Q(frequency__isnull=True) | Q(frequency=""))
        .exists()
    )


def _species_needs_scoring(
    species_code: str,
    countries: List[str],
    *,
    force: bool,
) -> bool:
    """True if this species has any selected CountrySpecies row still missing frequency."""
    if force:
        return True
    code = normalize_st_species_code(species_code)
    return (
        CountrySpecies.objects.filter(country_id__in=countries)
        .annotate(_lc=Lower("species__code"))
        .filter(_lc=code)
        .filter(Q(frequency__isnull=True) | Q(frequency=""))
        .exists()
    )


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


def apply_vagrant_frequency(country_code: str, *, force: bool = False) -> int:
    """Set ``frequency='vagrant'`` on checklist ``status='rare'`` rows for one country."""
    qs = CountrySpecies.objects.filter(
        country_id=country_code.strip().upper(),
        status="rare",
    )
    if not force:
        qs = qs.filter(Q(frequency__isnull=True) | Q(frequency=""))
    return qs.update(frequency="vagrant")


def countries_to_process(country_arg: Optional[str]) -> List[str]:
    if country_arg:
        return [country_arg.strip().upper()]
    env_cc = (os.environ.get("COUNTRY_CODE") or "").strip().upper()
    if env_cc:
        return [env_cc]
    return sorted(
        CountrySpecies.objects.values_list("country_id", flat=True).distinct()
    )


def _row_from_parsed(
    species_code: str,
    country_code: str,
    parsed: dict,
    freq: str,
    rarity_cap: Optional[str],
) -> dict:
    score = parsed["score"]
    return {
        "species_code": species_code,
        "country_code": country_code,
        "abundance": parsed["abundance"],
        "abundance_mean_avg": parsed.get("abundance_mean_avg"),
        "abundance_mean_max": parsed.get("abundance_mean_max"),
        "peak_season": parsed.get("peak_season"),
        "range_occupied_percent": parsed.get("range_occupied_percent"),
        "range_total_percent": parsed.get("range_total_percent"),
        "total_pop_percent": parsed.get("total_pop_percent"),
        "range_days_occupation": parsed.get("range_days_occupation"),
        "occupancy": parsed.get("occupancy"),
        "score": score,
        "frequency": freq,
        "frequency_pct": float(parsed["frequency_pct"]),
        "rarity_cap": rarity_cap,
        "commonness_basis": parsed.get("commonness_basis"),
        "debug_range_occupied_max": parsed.get("debug_range_occupied_max"),
    }


class Command(BaseCommand):
    help = (
        "Download eBird S&T regional/species_stats CSVs (if missing), score commonness "
        "per country, write SQLite + CSV, update CountrySpecies.frequency / frequency_pct, "
        "then set frequency=vagrant where status=rare. Default: all countries with "
        "CountrySpecies rows (use --country for one). Loads Species linked to those "
        "countries, fetches one CSV per species, scores every country present in that "
        "CSV, and updates matching CountrySpecies rows. Skips rows that already have "
        "frequency unless --force."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--country",
            type=str,
            default=None,
            help=(
                "Single country code (Country.pk, e.g. NL). Omit to run all countries "
                "with CountrySpecies rows (or set COUNTRY_CODE for one)."
            ),
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
            default=int(os.environ.get("EBIRD_ST_VERSION_YEAR", "2021")),
            help=(
                "S&T product year (list-obj / ZIP paths). Older years are tried automatically "
                "when the requested year has no listing."
            ),
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
            help=(
                "Output CSV path for a single-country run (default: "
                "BASE_DIR/data/commonness_{COUNTRY}.csv). Ignored when processing multiple countries."
            ),
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
        parser.add_argument(
            "-f",
            "--force",
            action="store_true",
            help=(
                "Re-score and overwrite CountrySpecies that already have frequency set. "
                "Without this flag, those rows are skipped (no download for species with "
                "nothing left to update)."
            ),
        )

    def handle(self, *args, **options):
        countries = countries_to_process(options.get("country"))
        if not countries:
            self.stderr.write(
                self.style.ERROR("No countries to process (no CountrySpecies rows in DB).")
            )
            return

        base = settings.BASE_DIR
        if options["data_dir"]:
            data_dir = options["data_dir"]
        else:
            nested = os.path.join(base, "jizz", "ebird_st_csv")
            flat = os.path.join(base, "ebird_st_csv")
            data_dir = nested if os.path.isdir(nested) else flat
        sqlite_path = options["db_path"] or os.path.join(base, "data", "commonness.db")

        self.stdout.write(f"ebird_st_commonness data-dir: {data_dir}")
        self.stdout.write(f"Countries ({len(countries)}): {', '.join(countries)}")

        species_list = self._build_species_list(countries, options, data_dir)
        if not species_list:
            self.stderr.write(self.style.ERROR("No species codes to process."))
            return

        access_key = (options["access_key"] or "").strip() or getattr(
            settings, "EBIRD_ST_ACCESS_KEY", ""
        ) or ""
        if not access_key:
            access_key = ebird_st_access_key_from_local_py()

        use_cache = not options["no_cache"]
        cache_complete = all(
            os.path.isfile(os.path.join(data_dir, f"{s}_regional_stats.csv"))
            for s in species_list
        )
        if not access_key and not (cache_complete and use_cache):
            self.stderr.write(
                self.style.ERROR(
                    "Set EBIRD_ST_ACCESS_KEY in Django settings (e.g. local.py) or pass --access-key. "
                    "Not required if all regional_stats CSVs exist and cache is enabled."
                )
            )
            return

        self.stdout.write(
            f"Species: {len(species_list)} from Species (linked to selected countries); "
            f"each CSV scored for all country rows in that file."
        )

        session = requests.Session()
        science_year_cache: dict = {}
        rows_by_country: Dict[str, List[dict]] = defaultdict(list)
        total_db_updated = 0
        skipped_pairs = 0

        n_species = len(species_list)
        for i, sp in enumerate(species_list, 1):
            if not _species_needs_scoring(sp, countries, force=options["force"]):
                self.stdout.write(
                    f"[{i}/{n_species}] {sp} … skip (all CountrySpecies rows already have frequency)"
                )
                continue

            self.stdout.write(f"[{i}/{n_species}] {sp} …")

            df = download_regional_stats(
                sp,
                access_key,
                options["year"],
                data_dir,
                use_cache,
                session,
                None,
                science_year_cache=science_year_cache,
            )
            if df is None:
                continue

            file_countries = countries_in_regional_stats(df, None)
            if not file_countries:
                self.stdout.write("    (no country-level rows in CSV)")
                continue

            for country in file_countries:
                if not options["force"] and _country_species_has_frequency(country, sp):
                    skipped_pairs += 1
                    continue

                parsed = parse_species_commonness(df, country)
                if not parsed:
                    continue
                freq, rarity_cap = classify_from_abundance(
                    parsed["abundance_mean_max"],
                    parsed.get("range_occupied_percent"),
                    parsed.get("range_days_occupation"),
                )
                row_out = _row_from_parsed(sp, country, parsed, freq, rarity_cap)
                rows_by_country[country].append(row_out)

                n_db = 0
                if not options["skip_country_species_write"]:
                    n_db = _update_country_species_frequency_one(
                        country, sp, freq, row_out["frequency_pct"]
                    )
                    total_db_updated += int(n_db)
                db_note = ""
                if not options["skip_country_species_write"]:
                    db_note = "  db=ok" if n_db else "  db=— (no CountrySpecies row)"
                cap_note = f"  [rarity-cap={rarity_cap}]" if rarity_cap else ""
                self.stdout.write(
                    f"    {country}: frequency={freq}  "
                    f"frequency_pct={row_out['frequency_pct']:.2f}%  "
                    f"score={row_out['score']:.4f}{cap_note}{db_note}"
                )

        total_vagrant = 0
        if not options["skip_country_species_write"]:
            for country in countries:
                vagrant_n = apply_vagrant_frequency(country, force=options["force"])
                total_vagrant += vagrant_n
                if vagrant_n:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"{country}: set frequency=vagrant on {vagrant_n} row(s) "
                            f"with status=rare."
                        )
                    )

        all_rows: List[dict] = []
        for country in countries:
            rows = rows_by_country.get(country) or []
            if not rows:
                continue
            all_rows.extend(rows)
            result = pd.DataFrame(rows).sort_values("score", ascending=False).reset_index(
                drop=True
            )
            if len(countries) == 1 and options["csv_out"]:
                csv_out = options["csv_out"]
            else:
                csv_out = os.path.join(base, "data", f"commonness_{country}.csv")
            os.makedirs(os.path.dirname(os.path.abspath(csv_out)) or ".", exist_ok=True)
            result.to_csv(csv_out, index=False)
            self.stdout.write(self.style.SUCCESS(f"Wrote CSV → {csv_out} ({len(result)} rows)"))

        if not all_rows:
            self.stderr.write(self.style.WARNING("No species with ST data for any country."))
            return

        combined = pd.DataFrame(all_rows).sort_values(
            ["country_code", "score"], ascending=[True, False]
        ).reset_index(drop=True)
        combined_csv = os.path.join(base, "data", "commonness.csv")
        write_commonness_outputs(combined, sqlite_path, combined_csv)

        if skipped_pairs and not options["force"]:
            self.stdout.write(
                f"Skipped {skipped_pairs} country×species pair(s) with frequency already set "
                f"(use --force to overwrite)."
            )

        if not options["skip_country_species_write"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"CountrySpecies DB: {total_db_updated} row(s) updated from ST scoring; "
                    f"{total_vagrant} row(s) set to frequency=vagrant (status=rare)."
                )
            )
        else:
            self.stdout.write("Skipped CountrySpecies DB update (--skip-country-species-write).")

        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote SQLite table 'commonness' → {sqlite_path} ({len(combined)} rows)"
            )
        )
        self.stdout.write(combined.head(15).to_string(index=False))

    def _build_species_list(
        self,
        countries: List[str],
        options: dict,
        data_dir: str,
    ) -> List[str]:
        """Species codes to process: DB species for selected countries plus optional extras."""
        extra_species: List[str] = []
        if options["species_file"]:
            path = options["species_file"]
            if not os.path.isfile(path):
                self.stderr.write(self.style.ERROR(f"Species file not found: {path}"))
                return []
            extra_species.extend(load_species_codes_from_file(path))
        extra_species.extend(species_codes_from_data_dir(data_dir))
        for c in options["species"]:
            for part in c.split(","):
                part = part.strip()
                if part:
                    extra_species.append(normalize_st_species_code(part))
        extra_species = sorted(set(extra_species))

        if options["no_db_species"]:
            if not extra_species:
                self.stderr.write(
                    self.style.ERROR(
                        "No species codes with --no-db-species: use --species-file, "
                        "--species, or CSVs under --data-dir."
                    )
                )
                return []
            species_list = extra_species
        else:
            species_list = species_codes_for_selected_countries(countries)
            for sp in extra_species:
                if sp not in species_list:
                    species_list.append(sp)
            species_list = sorted(species_list)

        if species_list:
            self.stdout.write(
                f"Loaded {len(species_list)} species "
                f"(Species with CountrySpecies in {', '.join(countries)})."
            )
        return species_list
