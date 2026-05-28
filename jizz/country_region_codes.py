"""
Map app ``Country.pk`` (ISO 3166-1 alpha-2) ↔ eBird ST ``region_code`` (usually alpha-3).

ST regional_stats country rows use alpha-3 (e.g. USA, NLD). The app stores alpha-2 (US, NL).
``Country.codes`` may hold extra aliases (comma-separated); see ``populate_country_iso3_codes``.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Dict, List, Optional, Tuple

from jizz.country_region_codes_data import ALPHA2_TO_ALPHA3, ALPHA3_TO_ALPHA2

# Netherlands: ST country row is NLD only (not Caribbean BON/SXM via NL).
_NL_ST_REGIONS = ("NLD",)
# United Kingdom: app country uses England ST stats (ENG), not GBR.
# Some DBs use "UK" while others use ISO "GB" as the Country.pk.
_UK_ST_REGIONS = ("ENG",)


def alpha3_for_alpha2(alpha2: str) -> Optional[str]:
    return ALPHA2_TO_ALPHA3.get(alpha2.strip().upper())


def alpha2_for_alpha3(alpha3: str) -> Optional[str]:
    return ALPHA3_TO_ALPHA2.get(alpha3.strip().upper())


def st_region_codes_for_app_country(
    app_code: str,
    *,
    extra_codes: Optional[str] = None,
) -> List[str]:
    """ST ``region_code`` values to match when filtering CSVs for an app country."""
    cc = app_code.strip().upper()
    if not cc:
        return []
    regions: set[str] = set()
    if cc == "NL":
        regions.update(_NL_ST_REGIONS)
    elif cc in ("UK", "GB"):
        regions.update(_UK_ST_REGIONS)
    else:
        a3 = alpha3_for_alpha2(cc)
        if a3:
            regions.add(a3)
        regions.add(cc)
    if extra_codes:
        for part in extra_codes.split(","):
            token = part.strip().upper()
            if token:
                regions.add(token)
    return sorted(regions)


def app_country_for_st_region(
    region_code: str,
    *,
    st_to_app: Optional[Dict[str, str]] = None,
) -> Optional[str]:
    """Map an ST country ``region_code`` to app ``Country.pk`` (e.g. USA → US)."""
    rc = region_code.strip().upper()
    if not rc:
        return None
    if st_to_app is not None and rc in st_to_app:
        return st_to_app[rc]
    if len(rc) == 3:
        return alpha2_for_alpha3(rc)
    if len(rc) == 2 and rc in ALPHA2_TO_ALPHA3:
        return rc
    # Preserve subregion codes like "US-CA" / "US-EAST" when they exist in the app DB.
    # These are not ISO alpha-2/3 and should not be coerced.
    if "-" in rc and len(rc) <= 10:
        return rc
    return None


@lru_cache(maxsize=1)
def country_region_code_maps() -> Tuple[Dict[str, str], Dict[str, List[str]]]:
    """
    Cached (st_region → app_country, app_country → [st_regions]).

    Merges ISO tables with ``Country.codes`` from the database when Django is ready.
    """
    st_to_app: Dict[str, str] = dict(ALPHA3_TO_ALPHA2)
    app_to_st: Dict[str, List[str]] = {}

    rows = []
    try:
        from jizz.models import Country

        rows = list(Country.objects.all().only("code", "codes"))
    except Exception:
        rows = []

    if rows:
        for country in rows:
            app = str(country.code).strip().upper()
            if not app:
                continue
            for st in st_region_codes_for_app_country(app, extra_codes=country.codes):
                st_to_app[st] = app
            app_to_st[app] = st_region_codes_for_app_country(app, extra_codes=country.codes)

    for a2, a3 in ALPHA2_TO_ALPHA3.items():
        st_to_app.setdefault(a3, a2)
        app_to_st.setdefault(a2, st_region_codes_for_app_country(a2))

    return st_to_app, app_to_st


def clear_country_region_code_caches() -> None:
    country_region_code_maps.cache_clear()


def expand_region_codes(country_code: str) -> List[str]:
    """Backward-compatible alias used by eBird ST download / parse helpers."""
    _, app_to_st = country_region_code_maps()
    cc = country_code.strip().upper()
    return app_to_st.get(cc, st_region_codes_for_app_country(cc))


def resolve_app_country_for_st_region(region_code: str) -> Optional[str]:
    st_to_app, _ = country_region_code_maps()
    return app_country_for_st_region(region_code, st_to_app=st_to_app)
