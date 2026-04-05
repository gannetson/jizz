"""GBIF occurrence search API client."""

from __future__ import annotations

import logging
import time
from collections.abc import Iterator
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from jizz.services.commonness.config import CommonnessSettings, get_commonness_settings
from jizz.services.commonness.dateutil import parse_event_date
from jizz.services.commonness.grids import safe_h3_cell

logger = logging.getLogger(__name__)


def normalize_gbif_record(
    rec: dict[str, Any],
    country_pk: str,
    h3_resolution: int,
) -> dict[str, Any] | None:
    """Map GBIF JSON to GbifOccurrenceRaw field dict. Returns None if unusable."""
    key = rec.get('key')
    species_key = rec.get('speciesKey')
    lat = rec.get('decimalLatitude')
    lng = rec.get('decimalLongitude')
    if key is None or species_key is None or lat is None or lng is None:
        return None
    try:
        gbif_id = int(key)
        sk = int(species_key)
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return None

    year = rec.get('year')
    month = rec.get('month')
    day = rec.get('day')
    y = int(year) if year is not None else None
    m = int(month) if month is not None else None
    d = int(day) if day is not None else None
    ev = parse_event_date(rec.get('eventDate'), y, m, d)
    if ev is None:
        return None

    h3_cell = safe_h3_cell(lat_f, lng_f, h3_resolution)
    if not h3_cell:
        return None

    return {
        'country_id': country_pk,
        'gbif_id': gbif_id,
        'species_key': sk,
        'scientific_name': rec.get('scientificName'),
        'species': rec.get('species'),
        'decimal_latitude': lat_f,
        'decimal_longitude': lng_f,
        'event_date': ev,
        'year': y,
        'month': m,
        'day': d,
        'basis_of_record': rec.get('basisOfRecord'),
        'occurrence_status': rec.get('occurrenceStatus'),
        'dataset_key': rec.get('datasetKey'),
        'publisher': rec.get('publishingOrg'),
        'taxon_rank': rec.get('taxonRank'),
        'taxonomic_class': rec.get('class'),
        'taxonomic_order': rec.get('order'),
        'family': rec.get('family'),
        'genus': rec.get('genus'),
        'h3_cell': h3_cell,
    }


class GbifOccurrenceApiClient:
    """Paged ``/occurrence/search`` with retries."""

    def __init__(self, cfg: CommonnessSettings | None = None) -> None:
        self._cfg = cfg or get_commonness_settings()

    def _base(self) -> str:
        return self._cfg.gbif_api_base.rstrip('/')

    @retry(
        reraise=True,
        stop=stop_after_attempt(5),
        wait=wait_exponential_jitter(initial=1, max=120),
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
    )
    def _fetch(self, client: httpx.Client, params: dict[str, Any]) -> dict[str, Any]:
        url = f'{self._base()}/occurrence/search'
        r = client.get(url, params=params)
        if r.status_code == 429:
            wait_s = float(r.headers.get('Retry-After', '10'))
            logger.warning('GBIF 429; sleeping %s s', wait_s)
            time.sleep(wait_s)
            r = client.get(url, params=params)
        r.raise_for_status()
        return r.json()

    def iter_normalized_dicts(
        self,
        country_code: str,
        *,
        max_records: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        cc = country_code.strip().upper()
        page_size = self._cfg.gbif_page_size
        offset = 0
        yielded = 0
        params_base: dict[str, Any] = {
            'country': cc,
            'taxonKey': self._cfg.gbif_taxon_aves_key,
            'hasCoordinate': 'true',
            'limit': page_size,
        }
        if self._cfg.gbif_occurrence_status:
            params_base['occurrenceStatus'] = self._cfg.gbif_occurrence_status

        with httpx.Client(
            timeout=httpx.Timeout(self._cfg.gbif_timeout_seconds),
            headers={'User-Agent': 'jizz-django/GBIF-commonness (research)'},
        ) as client:
            while True:
                params = {**params_base, 'offset': offset}
                try:
                    data = self._fetch(client, params)
                except httpx.HTTPStatusError as e:
                    if e.response is not None and e.response.status_code >= 500:
                        time.sleep(5)
                        continue
                    raise

                results = data.get('results') or []
                if not results:
                    break
                for rec in results:
                    row = normalize_gbif_record(rec, cc, self._cfg.h3_resolution)
                    if row is None:
                        continue
                    yield row
                    yielded += 1
                    if max_records is not None and yielded >= max_records:
                        return
                offset += len(results)
                if data.get('endOfRecords'):
                    break
