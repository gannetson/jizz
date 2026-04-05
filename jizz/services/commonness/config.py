"""Load GBIF commonness options from Django settings."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from django.conf import settings


@dataclass
class CommonnessSettings:
    gbif_api_base: str
    gbif_taxon_aves_key: int
    gbif_page_size: int
    gbif_timeout_seconds: float
    gbif_occurrence_status: str
    h3_resolution: int
    recent_years: int
    dedup_mode: Literal['relaxed', 'strict']
    weight_occupied_cells: float
    weight_occupied_cells_recent: float
    weight_years_recent: float
    weight_dedup_events: float
    percentile_thresholds: list[float]
    min_country_cells: int
    min_country_events: int
    min_species_cells_medium: int
    min_species_events_high: int


def get_commonness_settings() -> CommonnessSettings:
    """Read from Django settings with documented defaults."""
    raw_pct = getattr(
        settings,
        'COMMONNESS_PERCENTILE_THRESHOLDS',
        '2,5,13,30,25,15,10',
    )
    parts = [float(x.strip()) for x in raw_pct.split(',')]
    if len(parts) != 7 or abs(sum(parts) - 100.0) > 1e-6:
        raise ValueError(
            'COMMONNESS_PERCENTILE_THRESHOLDS must be 7 comma-separated numbers summing to 100',
        )
    dm = getattr(settings, 'COMMONNESS_DEDUP_MODE', 'relaxed')
    if dm not in ('relaxed', 'strict'):
        raise ValueError('COMMONNESS_DEDUP_MODE must be relaxed or strict')
    return CommonnessSettings(
        gbif_api_base=getattr(settings, 'GBIF_API_BASE', 'https://api.gbif.org/v1'),
        gbif_taxon_aves_key=int(getattr(settings, 'GBIF_TAXON_AVES_KEY', 212)),
        gbif_page_size=int(getattr(settings, 'GBIF_PAGE_SIZE', 5000)),
        gbif_timeout_seconds=float(getattr(settings, 'GBIF_TIMEOUT', 120.0)),
        gbif_occurrence_status=getattr(settings, 'GBIF_OCCURRENCE_STATUS', 'PRESENT'),
        h3_resolution=int(getattr(settings, 'COMMONNESS_H3_RESOLUTION', 5)),
        recent_years=int(getattr(settings, 'COMMONNESS_RECENT_YEARS', 5)),
        dedup_mode=dm,
        weight_occupied_cells=float(getattr(settings, 'COMMONNESS_WEIGHT_OCCUPIED_CELLS', 0.45)),
        weight_occupied_cells_recent=float(
            getattr(settings, 'COMMONNESS_WEIGHT_OCCUPIED_CELLS_RECENT', 0.25),
        ),
        weight_years_recent=float(getattr(settings, 'COMMONNESS_WEIGHT_YEARS_RECENT', 0.20)),
        weight_dedup_events=float(getattr(settings, 'COMMONNESS_WEIGHT_DEDUP_EVENTS', 0.10)),
        percentile_thresholds=parts,
        min_country_cells=int(getattr(settings, 'COMMONNESS_MIN_COUNTRY_CELLS', 50)),
        min_country_events=int(getattr(settings, 'COMMONNESS_MIN_COUNTRY_EVENTS', 200)),
        min_species_cells_medium=int(getattr(settings, 'COMMONNESS_MIN_SPECIES_CELLS_MEDIUM', 2)),
        min_species_events_high=int(getattr(settings, 'COMMONNESS_MIN_SPECIES_EVENTS_HIGH', 5)),
    )


def config_fingerprint(cfg: CommonnessSettings) -> str:
    import hashlib

    raw = '|'.join(
        [
            str(cfg.weight_occupied_cells),
            str(cfg.weight_occupied_cells_recent),
            str(cfg.weight_years_recent),
            str(cfg.weight_dedup_events),
            ','.join(str(x) for x in cfg.percentile_thresholds),
            str(cfg.min_country_cells),
            str(cfg.min_country_events),
            str(cfg.recent_years),
        ],
    )
    return hashlib.sha256(raw.encode()).hexdigest()[:16]
