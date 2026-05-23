from __future__ import annotations

from django.utils import timezone as django_tz

from jizz.models import CountrySpeciesFrequency
from jizz.services.ebird_frequency.constants import SOURCE_ST_PCT_RANK
from jizz.services.ebird_frequency.classify import (
    classify_frequency,
    detect_vagrant_like,
    tier_from_percentile,
)
from jizz.services.ebird_frequency.types import MonthlyFrequencyRow


def upsert_country_species_frequency(
    rows: list[MonthlyFrequencyRow],
    *,
    dry_run: bool = False,
    force: bool = False,
) -> tuple[int, int]:
    """
    Create or update CountrySpeciesFrequency for each row.

    Returns (written_count, skipped_count). Skips only when not ``force`` and a row already exists.
    """
    n_ok = 0
    n_skip = 0
    now = django_tz.now()

    for row in rows:
        vagrant = detect_vagrant_like(
            frequency_pct=row.frequency_pct,
            checklist_count=row.checklist_count,
            observation_count=row.observation_count,
            occupied_subregions=row.occupied_subregions,
        )
        if row.source == SOURCE_ST_PCT_RANK and row.frequency_pct is not None:
            tier = tier_from_percentile(float(row.frequency_pct))
            conf = "medium"
            if vagrant:
                tier = "rare"
                conf = "low"
        else:
            tier, conf = classify_frequency(
                row.frequency_pct,
                occupied_subregions=row.occupied_subregions,
                occurrence_event_count=row.occurrence_event_count,
                checklist_count=row.checklist_count,
                observation_count=row.observation_count,
                is_vagrant_like=vagrant,
            )

        if dry_run:
            n_ok += 1
            continue

        if (
            not force
            and CountrySpeciesFrequency.objects.filter(
                country_species_id=row.country_species_id,
                month=row.month,
                reference_year=row.reference_year,
            ).exists()
        ):
            n_skip += 1
            continue

        defaults = {
            'frequency_pct': row.frequency_pct,
            'frequency': tier,
            'checklist_count': row.checklist_count,
            'observation_count': row.observation_count,
            'occupied_subregions': row.occupied_subregions,
            'occurrence_event_count': row.occurrence_event_count,
            'source': row.source,
            'source_updated_at': now,
            'confidence': conf,
            'is_vagrant_like': vagrant,
            'notes': (row.notes or '')[:2000],
        }
        CountrySpeciesFrequency.objects.update_or_create(
            country_species_id=row.country_species_id,
            month=row.month,
            reference_year=row.reference_year,
            defaults=defaults,
        )
        n_ok += 1

    return n_ok, n_skip
