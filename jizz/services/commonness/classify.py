"""Pure scoring and labeling (no Django imports)."""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass
class ClassificationConfig:
    weight_occupied_cells: float
    weight_occupied_cells_recent: float
    weight_years_recent: float
    weight_dedup_events: float
    percentile_thresholds: list[float]
    min_species_cells_medium: int
    min_species_events_high: int


@dataclass
class SpeciesStatRow:
    country_pk: str
    gbif_species_key: int
    scientific_name: str | None
    raw_record_count: int
    dedup_event_count: int
    occupied_cell_count: int
    occupied_cell_count_recent: int
    years_present_count: int
    years_present_recent: int
    first_year: int | None
    last_year: int | None


@dataclass
class ClassificationResult:
    country_pk: str
    gbif_species_key: int
    scientific_name: str | None
    score: float | None
    classification: str
    confidence: str
    raw_record_count: int
    dedup_event_count: int
    occupied_cell_count: int
    years_present_recent: int
    last_year: int | None


LABEL_ORDER = [
    'abundant',
    'very_common',
    'common',
    'uncommon',
    'scarce',
    'rare',
    'extremely_rare',
]


def min_max_scale(values: list[float]) -> list[float]:
    if not values:
        return []
    lo = min(values)
    hi = max(values)
    if math.isclose(lo, hi):
        return [0.5] * len(values)
    return [(v - lo) / (hi - lo) for v in values]


def log1p_series(values: list[float]) -> list[float]:
    return [math.log1p(max(v, 0.0)) for v in values]


def cumulative_fractions_from_percent_bands(bands: list[float]) -> list[float]:
    s = sum(bands)
    if not math.isclose(s, 100.0, rel_tol=0, abs_tol=1e-5):
        raise ValueError('percentile bands must sum to 100')
    cum = 0.0
    out: list[float] = []
    for b in bands:
        cum += b / 100.0
        out.append(min(cum, 1.0))
    return out


def label_from_top_fraction(frac_from_top: float, cumulative: list[float]) -> str:
    for i, cut in enumerate(cumulative):
        if frac_from_top <= cut:
            return LABEL_ORDER[i]
    return 'extremely_rare'


def compute_scores(rows: list[SpeciesStatRow], config: ClassificationConfig) -> list[float]:
    if not rows:
        return []
    occ = [float(r.occupied_cell_count) for r in rows]
    occ_r = [float(r.occupied_cell_count_recent) for r in rows]
    yr = [float(r.years_present_recent) for r in rows]
    ev = log1p_series([float(r.dedup_event_count) for r in rows])
    n_occ = min_max_scale(occ)
    n_occ_r = min_max_scale(occ_r)
    n_yr = min_max_scale(yr)
    n_ev = min_max_scale(ev)
    w = config
    scores = []
    for i in range(len(rows)):
        scores.append(
            w.weight_occupied_cells * n_occ[i]
            + w.weight_occupied_cells_recent * n_occ_r[i]
            + w.weight_years_recent * n_yr[i]
            + w.weight_dedup_events * n_ev[i],
        )
    return scores


def apply_guard_rules(label: str, row: SpeciesStatRow) -> str:
    if label == 'insufficient_data':
        return label
    if row.occupied_cell_count == 1 and row.years_present_recent <= 1:
        return 'extremely_rare'
    if row.occupied_cell_count <= 2 and row.dedup_event_count <= 3:
        hierarchy = LABEL_ORDER
        cap = 'rare' if row.dedup_event_count >= 2 else 'extremely_rare'
        if label not in hierarchy:
            return cap
        li = hierarchy.index(label)
        ci = hierarchy.index(cap)
        return hierarchy[max(li, ci)]
    return label


def _confidence_for_row(
    row: SpeciesStatRow,
    passes_coverage_gate: bool,
    country_cells_all: int,
    config: ClassificationConfig,
) -> str:
    if not passes_coverage_gate:
        return 'low'
    if country_cells_all < 100:
        return 'low'
    if (
        row.occupied_cell_count >= config.min_species_cells_medium
        and row.dedup_event_count >= config.min_species_events_high
        and row.years_present_recent >= 3
    ):
        return 'high'
    if row.occupied_cell_count >= 2 or row.dedup_event_count >= 4:
        return 'medium'
    return 'low'


def classify_rows(
    rows: list[SpeciesStatRow],
    *,
    passes_coverage_gate: bool,
    country_cells_all: int,
    country_events_all: int,
    config: ClassificationConfig,
) -> list[ClassificationResult]:
    _ = country_events_all
    cumulative = cumulative_fractions_from_percent_bands(config.percentile_thresholds)

    if not passes_coverage_gate:
        return [
            ClassificationResult(
                country_pk=r.country_pk,
                gbif_species_key=r.gbif_species_key,
                scientific_name=r.scientific_name,
                score=None,
                classification='insufficient_data',
                confidence='low',
                raw_record_count=r.raw_record_count,
                dedup_event_count=r.dedup_event_count,
                occupied_cell_count=r.occupied_cell_count,
                years_present_recent=r.years_present_recent,
                last_year=r.last_year,
            )
            for r in rows
        ]

    scores = compute_scores(rows, config)
    indexed = sorted(range(len(rows)), key=lambda i: scores[i], reverse=True)
    n = len(rows)
    results: list[ClassificationResult] = []
    for position, i in enumerate(indexed):
        frac_from_top = (position + 1) / max(n, 1)
        base = label_from_top_fraction(frac_from_top, cumulative)
        row = rows[i]
        guarded = apply_guard_rules(base, row)
        conf = _confidence_for_row(row, passes_coverage_gate, country_cells_all, config)
        if guarded == 'insufficient_data':
            conf = 'low'
        results.append(
            ClassificationResult(
                country_pk=row.country_pk,
                gbif_species_key=row.gbif_species_key,
                scientific_name=row.scientific_name,
                score=scores[i],
                classification=guarded,
                confidence=conf,
                raw_record_count=row.raw_record_count,
                dedup_event_count=row.dedup_event_count,
                occupied_cell_count=row.occupied_cell_count,
                years_present_recent=row.years_present_recent,
                last_year=row.last_year,
            )
        )
    by_key = {(r.gbif_species_key): r for r in results}
    return [by_key[row.gbif_species_key] for row in rows]
