from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class MonthlyFrequencyRow:
    """Normalized monthly slice for one CountrySpecies (before classify / persist)."""

    country_species_id: int
    month: int
    reference_year: int
    frequency_pct: float | None = None
    checklist_count: int | None = None
    observation_count: int | None = None
    occupied_subregions: int | None = None
    occurrence_event_count: int | None = None
    source: str = 'ebird'
    notes: str = ''
