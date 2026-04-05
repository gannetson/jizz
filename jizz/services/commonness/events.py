"""Rebuild OccurrenceEvent rows from GbifOccurrenceRaw via SQL."""

from __future__ import annotations

import logging
from typing import Any

from django.db import connection

logger = logging.getLogger(__name__)


def delete_events_for_country(country_pk: str, dedup_mode: str) -> None:
    from jizz.models import OccurrenceEvent

    OccurrenceEvent.objects.filter(country_id=country_pk, dedup_mode=dedup_mode).delete()


def build_events_from_raw(country_pk: str, dedup_mode: str) -> int:
    """
    Delete existing events for (country, mode) and INSERT … SELECT from raw.

    Returns cursor.rowcount if available.
    """
    delete_events_for_country(country_pk, dedup_mode)
    if dedup_mode == 'relaxed':
        sql = """
            INSERT INTO jizz_occurrenceevent (
                country_id, species_key, scientific_name, h3_cell, event_date,
                dedup_mode, basis_of_record, dataset_key, raw_records_in_event
            )
            SELECT
                country_id,
                species_key,
                MAX(scientific_name),
                h3_cell,
                event_date,
                %s,
                '',
                '',
                COUNT(*)::integer
            FROM jizz_gbifoccurrenceraw
            WHERE country_id = %s
              AND event_date IS NOT NULL
            GROUP BY country_id, species_key, h3_cell, event_date
        """
        params: list[Any] = [dedup_mode, country_pk]
    elif dedup_mode == 'strict':
        sql = """
            INSERT INTO jizz_occurrenceevent (
                country_id, species_key, scientific_name, h3_cell, event_date,
                dedup_mode, basis_of_record, dataset_key, raw_records_in_event
            )
            SELECT
                country_id,
                species_key,
                MAX(scientific_name),
                h3_cell,
                event_date,
                %s,
                COALESCE(basis_of_record, ''),
                COALESCE(dataset_key, ''),
                COUNT(*)::integer
            FROM jizz_gbifoccurrenceraw
            WHERE country_id = %s
              AND event_date IS NOT NULL
            GROUP BY
                country_id,
                species_key,
                h3_cell,
                event_date,
                COALESCE(basis_of_record, ''),
                COALESCE(dataset_key, '')
        """
        params = [dedup_mode, country_pk]
    else:
        raise ValueError(f'unknown dedup_mode: {dedup_mode}')

    with connection.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount if cur.rowcount is not None else -1
