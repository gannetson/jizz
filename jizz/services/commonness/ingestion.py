"""Bulk ingest GBIF rows into GbifOccurrenceRaw (idempotent on gbif_id)."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from typing import Any

from jizz.models import GbifOccurrenceRaw

logger = logging.getLogger(__name__)


def bulk_ingest_raw_dicts(rows: Iterable[dict[str, Any]], batch_size: int = 500) -> int:
    """
    Insert normalized dicts using ``bulk_create(..., ignore_conflicts=True)``.

    Returns count of rows attempted (not necessarily inserted).
    """
    batch: list[GbifOccurrenceRaw] = []
    attempted = 0
    for d in rows:
        batch.append(GbifOccurrenceRaw(**d))
        if len(batch) >= batch_size:
            GbifOccurrenceRaw.objects.bulk_create(batch, batch_size=batch_size, ignore_conflicts=True)
            attempted += len(batch)
            logger.debug('bulk_create raw batch %s', len(batch))
            batch = []
    if batch:
        GbifOccurrenceRaw.objects.bulk_create(batch, batch_size=batch_size, ignore_conflicts=True)
        attempted += len(batch)
    return attempted
