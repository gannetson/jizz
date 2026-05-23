"""
Tier and confidence for CountrySpeciesFrequency from checklist-based metrics.

Never assigns a tier from observation_count alone.
"""

from __future__ import annotations

# Minimum checklists in scope before we trust frequency_pct for "high" confidence.
MIN_CHECKLISTS_HIGH = 80
MIN_CHECKLISTS_MEDIUM = 25

# Raw obs high while checklist denominator is modest suggests twitching / re-sampling bias.
OBS_HIGH_FOR_VAGRANT_GUARD = 400
CHECKLIST_LOW_FOR_VAGRANT_GUARD = 120
FREQ_PCT_LOW_FOR_VAGRANT_GUARD = 4.0

# Tiny geographic spread with apparently high frequency — cap tier.
SUBREGIONS_TINY = 2
FREQ_PCT_HIGH_FOR_SPREAD_GUARD = 25.0


def detect_vagrant_like(
    *,
    frequency_pct: float | None,
    checklist_count: int | None,
    observation_count: int | None,
    occupied_subregions: int | None,
) -> bool:
    """
    Heuristic only: high raw observations vs low checklist frequency, or high freq with tiny spread.
    Does not use observation_count alone without frequency_pct context.
    """
    if frequency_pct is None:
        return False
    if (
        observation_count is not None
        and observation_count >= OBS_HIGH_FOR_VAGRANT_GUARD
        and frequency_pct < FREQ_PCT_LOW_FOR_VAGRANT_GUARD
        and (checklist_count is None or checklist_count < CHECKLIST_LOW_FOR_VAGRANT_GUARD)
    ):
        return True
    if (
        occupied_subregions is not None
        and occupied_subregions <= SUBREGIONS_TINY
        and frequency_pct >= FREQ_PCT_HIGH_FOR_SPREAD_GUARD
    ):
        return True
    return False


def _tier_from_frequency_pct(pct: float) -> str:
    """Map 0–100 checklist frequency to CountrySpecies.FREQUENCY_CHOICES keys."""
    if pct >= 40:
        return 'very_common'
    if pct >= 25:
        return 'common'
    if pct >= 12:
        return 'fairly_common'
    if pct >= 5:
        return 'uncommon'
    if pct >= 1:
        return 'rare'
    return 'very_rare'


def tier_from_percentile(pct: float) -> str:
    """
    Map percentile rank (0–100, higher = more common) to CountrySpecies.FREQUENCY_CHOICES keys.
    Used for non-checklist proxies (eBird ST regional stats) where only relative ranking is meaningful.
    """
    if pct >= 95:
        return 'very_common'
    if pct >= 85:
        return 'common'
    if pct >= 70:
        return 'fairly_common'
    if pct >= 45:
        return 'uncommon'
    if pct >= 20:
        return 'rare'
    return 'very_rare'


def _cap_tier(tier: str, ceiling: str) -> str:
    order = (
        'very_common',
        'common',
        'fairly_common',
        'uncommon',
        'rare',
        'very_rare',
    )
    ti = order.index(tier) if tier in order else len(order) - 1
    ci = order.index(ceiling) if ceiling in order else len(order) - 1
    return order[max(ti, ci)]


def classify_frequency(
    frequency_pct: float | None,
    *,
    occupied_subregions: int | None = None,
    occurrence_event_count: int | None = None,
    checklist_count: int | None = None,
    observation_count: int | None = None,
    is_vagrant_like: bool = False,
) -> tuple[str | None, str]:
    """
    Return (frequency tier key or None, confidence: low|medium|high).

    Never uses observation_count alone to assign a tier. If frequency_pct is None, returns (None, 'low').
    """
    if frequency_pct is None:
        return None, 'low'

    conf = 'medium'
    if checklist_count is not None:
        if checklist_count >= MIN_CHECKLISTS_HIGH:
            conf = 'high'
        elif checklist_count < MIN_CHECKLISTS_MEDIUM:
            conf = 'low'
    else:
        conf = 'low'

    tier = _tier_from_frequency_pct(float(frequency_pct))

    if is_vagrant_like or detect_vagrant_like(
        frequency_pct=frequency_pct,
        checklist_count=checklist_count,
        observation_count=observation_count,
        occupied_subregions=occupied_subregions,
    ):
        tier = _cap_tier(tier, 'rare')
        conf = 'low'

    return tier, conf
