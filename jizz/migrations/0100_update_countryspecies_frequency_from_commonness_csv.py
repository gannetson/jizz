# Populate CountrySpecies.frequency (+ frequency_pct) from committed eBird commonness CSV exports.

from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, Iterable, Tuple

from django.db import migrations


ALLOWED_FREQUENCIES = {
    "abundant",
    "very_common",
    "common",
    "fairly_common",
    "uncommon",
    "rare",
    "very_rare",
    "vagrant",
}


def _iter_commonness_rows(csv_path: Path) -> Iterable[Tuple[str, str, str | None, float | None]]:
    """
    Yield (country_code, species_code, frequency, frequency_pct) from one commonness CSV.
    """
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            country_code = (row.get("country_code") or "").strip()
            species_code = (row.get("species_code") or "").strip()
            freq_raw = (row.get("frequency") or "").strip() or None
            freq = freq_raw if freq_raw in ALLOWED_FREQUENCIES else None
            pct_raw = (row.get("frequency_pct") or "").strip()
            try:
                pct = float(pct_raw) if pct_raw else None
            except ValueError:
                pct = None
            if not country_code or not species_code:
                continue
            yield country_code, species_code, freq, pct


def forwards(apps, schema_editor):
    CountrySpecies = apps.get_model("jizz", "CountrySpecies")
    Species = apps.get_model("jizz", "Species")

    # Build species_code -> id map once (fast lookups; avoids joins per row).
    species_id_by_code: Dict[str, int] = dict(Species.objects.values_list("code", "id"))

    data_dir = Path(__file__).resolve().parent.parent / "data"
    csv_paths = sorted(data_dir.glob("commonness_*.csv"))

    for csv_path in csv_paths:
        # country_code is also embedded in every row; we still use it from the file content.
        rows_by_species_id: Dict[int, Tuple[str | None, float | None]] = {}
        country_code: str | None = None

        for c_code, s_code, freq, pct in _iter_commonness_rows(csv_path):
            country_code = c_code
            sp_id = species_id_by_code.get(s_code)
            if not sp_id:
                continue
            rows_by_species_id[sp_id] = (freq, pct)

        if not country_code or not rows_by_species_id:
            continue

        # Fetch all matching CountrySpecies in one query; bulk update in memory.
        qs = CountrySpecies.objects.filter(country_id=country_code, species_id__in=list(rows_by_species_id.keys()))

        to_update = []
        for cs in qs.iterator():
            freq, pct = rows_by_species_id.get(cs.species_id, (None, None))
            changed = False
            if freq is not None and cs.frequency != freq:
                cs.frequency = freq
                changed = True
            if pct is not None and cs.frequency_pct != pct:
                cs.frequency_pct = pct
                changed = True
            if changed:
                to_update.append(cs)

        if to_update:
            CountrySpecies.objects.bulk_update(to_update, ["frequency", "frequency_pct"], batch_size=2000)


def backwards(apps, schema_editor):
    # No safe automatic rollback; keep current values.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("jizz", "0099_speciesillustration"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]

