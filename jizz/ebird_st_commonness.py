"""
eBird Status & Trends → commonness scoring helpers.

Used by ``manage.py ebird_st_commonness``. Downloads regional/species_stats CSVs from
``st-download.ebird.org`` and computes per-country scores from regional_stats.
"""
from __future__ import annotations

import glob
import io
import math
import os
import re
import sqlite3
import sys
import time
import zipfile
from typing import Any, List, Optional

import pandas as pd
import requests

ST_DOWNLOAD_BASE = "https://st-download.ebird.org/v1"

# Brief pause before retrying S&T API calls (transient errors / incomplete listings).
_ST_DOWNLOAD_RETRY_DELAY_SEC = 0.75

# Scoring uses range_total_percent, total_pop_percent, range_days_occupation — not range_occupied_percent.
_ST_RANGE_DAYS_YEAR = 365.0

# Map weighted linear combo (see ``parse_species_commonness``) to [0, 1] for ``classify()``; tune as needed.
_SCORE_LINEAR_SHIFT = 0.0
_SCORE_LINEAR_SCALE = 0.55

# Frequency tier order: most common → rarest (for ``classify()`` rarity_cap).
_FREQUENCY_ORDER = (
    "abundant",
    "very_common",
    "common",
    "uncommon",
    "scarce",
    "rare",
    "extremely_rare",
)


def _repo_root() -> str:
    """Project root (parent of the ``jizz`` package)."""
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def normalize_st_species_code(species_code: str) -> str:
    """eBird S&T URLs expect lowercase 6-letter codes (e.g. eurrob1, not EURROB1)."""
    return species_code.strip().lower()


def species_codes_for_country(country_code: str) -> List[str]:
    """All distinct eBird species codes linked to the country via CountrySpecies."""
    from jizz.models import CountrySpecies

    cc = country_code.strip().upper()
    qs = CountrySpecies.objects.filter(country_id=cc).values_list("species__code", flat=True)
    return sorted({normalize_st_species_code(c) for c in qs if c})


def st_list_objects_url(species_code: str, version_year: int) -> str:
    return f"{ST_DOWNLOAD_BASE}/list-obj/{version_year}/{normalize_st_species_code(species_code)}"


def st_fetch_url() -> str:
    return f"{ST_DOWNLOAD_BASE}/fetch"


def _coerce_list_obj_payload(data: object) -> Optional[List[Any]]:
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("paths", "objects", "data", "files"):
            inner = data.get(key)
            if isinstance(inner, list):
                return inner
    return None


def list_st_objects(
    session: requests.Session,
    species_code: str,
    version_year: int,
    access_key: str,
    *,
    max_attempts: int = 2,
) -> Optional[List[Any]]:
    """
    GET /list-obj/{year}/{species}. Retries on HTTP/JSON errors, empty listing, or
    unexpected JSON (``max_attempts`` tries, default 2).
    """
    sp = normalize_st_species_code(species_code)
    url = st_list_objects_url(sp, version_year)
    n = max(1, max_attempts)
    last_exc: Optional[BaseException] = None
    last_data: object = None
    for attempt in range(n):
        if attempt > 0:
            time.sleep(_ST_DOWNLOAD_RETRY_DELAY_SEC)
            print(f"  [retry] {sp}: list-obj (attempt {attempt + 1}/{n}) …", file=sys.stderr)
        try:
            r = session.get(url, params={"key": access_key}, timeout=60)
            r.raise_for_status()
            data = r.json()
            last_data = data
            payload = _coerce_list_obj_payload(data)
            if payload is not None and isinstance(payload, list):
                if len(payload) == 0 and attempt < n - 1:
                    continue
                return payload
            if attempt < n - 1:
                continue
        except (requests.RequestException, ValueError, TypeError) as e:
            last_exc = e
            if attempt == n - 1:
                print(f"  [skip] {sp}: list-obj failed: {e}", file=sys.stderr)
            elif attempt < n - 1:
                continue
    if last_exc is None and last_data is not None:
        snippet = str(last_data)[:240]
        print(f"  [skip] {sp}: list-obj did not return a path list: {snippet}", file=sys.stderr)
    return None


def _select_regional_obj_key(
    paths: object, species_code: str, version_year: int
) -> Optional[str]:
    if not isinstance(paths, list):
        return None
    str_paths = [p for p in paths if isinstance(p, str)]
    for p in str_paths:
        if p.endswith("regional_stats.csv"):
            return p

    sp = species_code.strip().lower()
    y = str(int(version_year))
    suffix = f"{sp}_regional_{y}.zip"
    for p in str_paths:
        if p.lower().endswith(suffix):
            return p

    for p in str_paths:
        pl = p.replace("\\", "/").lower()
        if "web_download" not in pl:
            continue
        if not pl.endswith(".zip"):
            continue
        if sp not in pl:
            continue
        if "regional" in pl:
            return p

    for p in str_paths:
        pl = p.lower()
        if pl.endswith(".zip") and "ebird-trends_regional" in pl:
            return p

    for p in str_paths:
        pl = p.lower()
        if pl.endswith(".zip") and "regional" in pl:
            return p

    return None


def _select_species_stats_obj_key(
    paths: object, species_code: str, version_year: int
) -> Optional[str]:
    if not isinstance(paths, list):
        return None
    str_paths = [p for p in paths if isinstance(p, str)]
    for p in str_paths:
        if p.endswith("species_stats.csv"):
            return p

    sp = species_code.strip().lower()
    y = str(int(version_year))
    suffix = f"{sp}_species_{y}.zip"
    for p in str_paths:
        if p.lower().endswith(suffix):
            return p

    for p in str_paths:
        pl = p.replace("\\", "/").lower()
        if "web_download" not in pl:
            continue
        if not pl.endswith(".zip"):
            continue
        if sp not in pl:
            continue
        if "species" in pl and "regional" not in pl:
            return p

    for p in str_paths:
        pl = p.lower()
        if pl.endswith(".zip") and "ebird-trends" in pl and "species" in pl:
            return p

    for p in str_paths:
        pl = p.lower()
        if pl.endswith(".zip") and "species" in pl and "regional" not in pl:
            return p

    return None


def _csv_text_from_fetch_response(r: requests.Response, *, kind: str = "regional") -> str:
    raw = r.content
    ct = (r.headers.get("Content-Type") or "").lower()
    is_zip = "zip" in ct or (len(raw) >= 4 and raw[:4] == b"PK\x03\x04")
    if not is_zip:
        r.encoding = r.encoding or getattr(r, "apparent_encoding", None) or "utf-8"
        return r.text

    with zipfile.ZipFile(io.BytesIO(raw), "r") as zf:
        names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not names:
            raise ValueError("ZIP contains no .csv file")

        def sort_key_regional(n: str) -> tuple:
            nl = n.lower()
            return (
                0 if nl.endswith("regional_stats.csv") else 1,
                0 if "regional" in nl else 1,
                len(n),
            )

        def sort_key_species(n: str) -> tuple:
            nl = n.lower()
            return (
                0 if nl.endswith("species_stats.csv") else 1,
                0 if "species" in nl and "regional" not in nl else 1,
                len(n),
            )

        names.sort(key=sort_key_species if kind == "species" else sort_key_regional)
        return zf.read(names[0]).decode("utf-8", errors="replace")


def ebird_st_access_key_from_local_py() -> str:
    path = os.path.join(_repo_root(), "jizz", "settings", "local.py")
    if not os.path.isfile(path):
        return ""
    try:
        text = open(path, encoding="utf-8").read()
    except OSError:
        return ""
    m = re.search(
        r"EBIRD_ST_ACCESS_KEY\s*=\s*os\.environ\.get\s*\(\s*['\"]EBIRD_ST_ACCESS_KEY['\"]\s*,\s*['\"]([^'\"]*)['\"]\s*\)",
        text,
    )
    if m:
        return m.group(1).strip()
    m = re.search(r"EBIRD_ST_ACCESS_KEY\s*=\s*['\"]([^'\"]+)['\"]", text)
    return m.group(1).strip() if m else ""


def expand_region_codes(country_code: str) -> List[str]:
    """
    eBird ST ``regional_stats`` uses ISO-3166 alpha-3 for ``region_code`` on country rows.

    For app country **NL** (European Netherlands), use **NLD** only. Do not merge Caribbean
    Netherlands (``BON``, ``SXM``, etc.); those are separate regions in ST.
    The legacy second code ``NL`` is not used here: it does not appear as ``region_code``
    in ST exports and could be ambiguous.
    """
    cc = country_code.strip().upper()
    if cc == "NL":
        return ["NLD"]
    return [cc]


def download_regional_stats(
    species_code: str,
    access_key: str,
    version_year: int,
    data_dir: str,
    use_cache: bool,
    session: requests.Session,
    paths: Optional[List[Any]] = None,
) -> Optional[pd.DataFrame]:
    species_code = normalize_st_species_code(species_code)
    os.makedirs(data_dir, exist_ok=True)
    cache_path = os.path.join(data_dir, f"{species_code}_regional_stats.csv")

    if use_cache and os.path.isfile(cache_path):
        try:
            return pd.read_csv(cache_path)
        except Exception:
            pass

    if not access_key:
        print(f"  [skip] {species_code}: missing cache and no access key", file=sys.stderr)
        return None

    if not paths:
        paths = list_st_objects(session, species_code, version_year, access_key)
    if not paths:
        return None

    obj_key = _select_regional_obj_key(paths, species_code, version_year)
    if not obj_key:
        print(
            f"  [retry] {species_code}: no regional asset in listing, retrying list-obj …",
            file=sys.stderr,
        )
        time.sleep(_ST_DOWNLOAD_RETRY_DELAY_SEC)
        paths = list_st_objects(session, species_code, version_year, access_key)
        if not paths:
            print(
                f"  [skip] {species_code}: no regional_stats.csv or web_download regional ZIP in listing",
                file=sys.stderr,
            )
            return None
        obj_key = _select_regional_obj_key(paths, species_code, version_year)
    if not obj_key:
        print(
            f"  [skip] {species_code}: no regional_stats.csv or web_download regional ZIP in listing",
            file=sys.stderr,
        )
        return None

    text: Optional[str] = None
    fetch_err: Optional[BaseException] = None
    for fetch_attempt in range(2):
        if fetch_attempt > 0:
            time.sleep(_ST_DOWNLOAD_RETRY_DELAY_SEC)
            print(f"  [retry] {species_code}: fetch regional ZIP/CSV …", file=sys.stderr)
        try:
            r = session.get(
                st_fetch_url(),
                params={"objKey": obj_key, "key": access_key},
                timeout=120,
            )
            r.raise_for_status()
            text = _csv_text_from_fetch_response(r, kind="regional")
            break
        except (requests.RequestException, ValueError) as e:
            fetch_err = e
            if fetch_attempt == 1:
                print(f"  [skip] {species_code}: fetch failed: {e}", file=sys.stderr)
                return None
    if text is None:
        return None

    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(text)

    try:
        return pd.read_csv(cache_path)
    except Exception as e:
        print(f"  [skip] {species_code}: parse CSV failed: {e}", file=sys.stderr)
        return None


def ensure_species_stats_csv(
    species_code: str,
    access_key: str,
    version_year: int,
    data_dir: str,
    use_cache: bool,
    session: requests.Session,
    paths: Optional[List[Any]],
) -> bool:
    species_code = normalize_st_species_code(species_code)
    os.makedirs(data_dir, exist_ok=True)
    cache_path = os.path.join(data_dir, f"{species_code}_species_stats.csv")

    if use_cache and os.path.isfile(cache_path):
        return True

    if not access_key:
        return False

    if not paths:
        paths = list_st_objects(session, species_code, version_year, access_key)
    if not paths:
        return False

    obj_key = _select_species_stats_obj_key(paths, species_code, version_year)
    if not obj_key:
        print(
            f"  [retry] {species_code}: no species_stats asset in listing, retrying list-obj …",
            file=sys.stderr,
        )
        time.sleep(_ST_DOWNLOAD_RETRY_DELAY_SEC)
        paths = list_st_objects(session, species_code, version_year, access_key)
        if not paths:
            return False
        obj_key = _select_species_stats_obj_key(paths, species_code, version_year)
    if not obj_key:
        return False

    text: Optional[str] = None
    for fetch_attempt in range(2):
        if fetch_attempt > 0:
            time.sleep(_ST_DOWNLOAD_RETRY_DELAY_SEC)
            print(f"  [retry] {species_code}: fetch species_stats …", file=sys.stderr)
        try:
            r = session.get(
                st_fetch_url(),
                params={"objKey": obj_key, "key": access_key},
                timeout=120,
            )
            r.raise_for_status()
            text = _csv_text_from_fetch_response(r, kind="species")
            break
        except (requests.RequestException, ValueError) as e:
            if fetch_attempt == 1:
                print(f"  [skip] {species_code}: species_stats fetch failed: {e}", file=sys.stderr)
                return False
    if text is None:
        return False

    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(text)

    print(f"  saved → {cache_path}", flush=True)
    return True


def _column_mean(sub: pd.DataFrame, col: str) -> Optional[float]:
    if col not in sub.columns:
        return None
    s = pd.to_numeric(sub[col], errors="coerce")
    if s.isna().all():
        return None
    return float(s.mean())


def _column_max(sub: pd.DataFrame, col: str) -> Optional[float]:
    if col not in sub.columns:
        return None
    s = pd.to_numeric(sub[col], errors="coerce")
    if s.isna().all():
        return None
    return float(s.max())


def _linear_combo_to_unit(score_linear: float) -> float:
    """Map weighted linear combo to [0, 1] for tiering."""
    v = (score_linear + _SCORE_LINEAR_SHIFT) / _SCORE_LINEAR_SCALE
    return max(0.0, min(1.0, v))


def _rarity_cap_from_maxes(
    range_total_percent_max: Optional[float],
    total_pop_percent_max: Optional[float],
    range_days_occupation_max: Optional[float],
) -> Optional[str]:
    """Hard gates before scoring; ``range_occupied_percent`` is not used here."""
    if (
        range_total_percent_max is None
        or total_pop_percent_max is None
        or range_days_occupation_max is None
    ):
        return None
    rt = float(range_total_percent_max)
    tp = float(total_pop_percent_max)
    dmax = float(range_days_occupation_max)
    if dmax <= 7 and rt < 0.00005 and tp < 0.00005:
        return "extremely_rare"
    if dmax <= 30 and rt < 0.0001 and tp < 0.0001:
        return "rare"
    return None


def parse_species_commonness(
    df: pd.DataFrame,
    country_code: str,
) -> Optional[dict]:
    if df is None or df.empty:
        return None

    codes = expand_region_codes(country_code)
    rc = df["region_code"].astype(str).str.strip().str.upper()
    mask = rc.isin([c.upper() for c in codes])
    if "region_type" in df.columns:
        mask &= df["region_type"].astype(str).str.strip().str.lower().eq("country")
    sub = df[mask].copy()
    if sub.empty:
        return None

    if "abundance_mean" not in sub.columns:
        return None

    am = pd.to_numeric(sub["abundance_mean"], errors="coerce")
    if am.isna().all():
        return None
    abundance_mean_avg = float(am.mean())
    abundance_mean_max = float(am.max())

    range_total_percent_max = _column_max(sub, "range_total_percent")
    total_pop_percent_max = _column_max(sub, "total_pop_percent")
    range_days_occupation_max = _column_max(sub, "range_days_occupation")

    range_occupied_percent_max: Optional[float] = None
    for name in ("range_occupied_percent", "range_percent_occupied"):
        range_occupied_percent_max = _column_max(sub, name)
        if range_occupied_percent_max is not None:
            break

    if range_total_percent_max is None or total_pop_percent_max is None:
        return None
    if range_days_occupation_max is None:
        return None

    rarity_cap = _rarity_cap_from_maxes(
        range_total_percent_max,
        total_pop_percent_max,
        range_days_occupation_max,
    )

    abundance_component = math.log1p(max(abundance_mean_avg, 0.0))
    range_component = max(
        math.log10(max(range_total_percent_max, 1e-12)) + 8.0,
        0.0,
    ) / 8.0
    pop_component = max(
        math.log10(max(total_pop_percent_max, 1e-12)) + 8.0,
        0.0,
    ) / 8.0
    days_component = (
        min(max(float(range_days_occupation_max), 0.0), _ST_RANGE_DAYS_YEAR)
        / _ST_RANGE_DAYS_YEAR
    )

    score_linear = (
        0.50 * abundance_component
        + 0.20 * range_component
        + 0.20 * days_component
        + 0.10 * pop_component
    )

    score = _linear_combo_to_unit(score_linear)

    occ_debug_pct = (
        occupancy_raw_to_pct(float(range_occupied_percent_max))
        if range_occupied_percent_max is not None
        else None
    )
    freq_pct = score * 100.0

    return {
        "abundance": abundance_component,
        "abundance_mean_avg": abundance_mean_avg,
        "abundance_mean_max": abundance_mean_max,
        "range_total_percent": range_total_percent_max,
        "total_pop_percent": total_pop_percent_max,
        "range_days_occupation": range_days_occupation_max,
        "occupancy": occ_debug_pct,
        "score": score,
        "rarity_cap": rarity_cap,
        "frequency_pct": freq_pct,
        "debug_score_linear": score_linear,
        "debug_range_component": range_component,
        "debug_pop_component": pop_component,
        "debug_days_component": days_component,
        "debug_range_occupied_max": range_occupied_percent_max,
    }


def _classify_from_score(score: float) -> str:
    """Tier from normalized score only (before ``rarity_cap``)."""
    if score >= 0.72:
        return "abundant"
    if score >= 0.55:
        return "very_common"
    if score >= 0.38:
        return "common"
    if score >= 0.22:
        return "uncommon"
    if score >= 0.12:
        return "scarce"
    if score >= 0.05:
        return "rare"
    return "extremely_rare"


def classify(score: float, rarity_cap: Optional[str] = None) -> str:
    """
    eBird S&T commonness tier on normalized ``score`` in [0, 1] (see ``_linear_combo_to_unit``).

    Same values as ``CountrySpecies.frequency`` / ``CountrySpeciesFrequency.frequency``.
    If ``rarity_cap`` is set from ``parse_species_commonness`` hard gates, it overrides
    or caps the score-based label.
    """
    label = _classify_from_score(score)
    if rarity_cap == "extremely_rare":
        return "extremely_rare"
    if rarity_cap == "rare":
        rare_idx = _FREQUENCY_ORDER.index("rare")
        label_idx = _FREQUENCY_ORDER.index(label)
        if label_idx < rare_idx:
            return "rare"
        return label
    return label


def occupancy_raw_to_pct(raw: float) -> float:
    """
    eBird ST ``range_occupied_percent`` may be a 0–1 fraction or already 0–100.
    Store as percentage 0–100 for CountrySpecies.frequency_pct.
    """
    v = float(raw)
    if v > 1.5:
        return min(v, 100.0)
    return v * 100.0


def load_species_codes_from_file(path: str) -> List[str]:
    with open(path, encoding="utf-8") as f:
        return [
            normalize_st_species_code(line.split()[0])
            for line in f
            if line.strip() and not line.strip().startswith("#")
        ]


def species_codes_from_data_dir(data_dir: str) -> List[str]:
    out: List[str] = []
    for pattern, suffix in (
        ("*_regional_stats.csv", "_regional_stats.csv"),
        ("*_species_stats.csv", "_species_stats.csv"),
    ):
        for path in glob.glob(os.path.join(data_dir, pattern)):
            base = os.path.basename(path)
            code = base.replace(suffix, "")
            if code:
                out.append(normalize_st_species_code(code))
    return sorted(set(out))


def write_commonness_outputs(
    result: pd.DataFrame,
    sqlite_path: str,
    csv_path: str,
) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(sqlite_path)) or ".", exist_ok=True)
    conn = sqlite3.connect(sqlite_path)
    try:
        result.to_sql("commonness", conn, if_exists="replace", index=False)
    finally:
        conn.close()
    os.makedirs(os.path.dirname(os.path.abspath(csv_path)) or ".", exist_ok=True)
    result.to_csv(csv_path, index=False)
