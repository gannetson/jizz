"""Orchestrate GBIF commonness pipeline steps for one country."""

from __future__ import annotations

import logging

from jizz.models import Country
from jizz.services.commonness.config import get_commonness_settings
from jizz.services.commonness.events import build_events_from_raw
from jizz.services.commonness.gbif_client import GbifOccurrenceApiClient
from jizz.services.commonness.ingestion import bulk_ingest_raw_dicts
from jizz.services.commonness.stats_aggregate import (
    refresh_country_coverage,
    refresh_species_country_stats,
    run_classify_and_persist,
)
from jizz.services.commonness.sync_countryspecies import sync_country_gbif_to_countryspecies

logger = logging.getLogger(__name__)


def run_commonness_pipeline_for_country(
    country_code: str,
    *,
    limit: int | None = None,
    skip_ingest: bool = False,
    batch_size: int = 500,
) -> Country:
    """
    Full pipeline: ingest (optional) → events → stats → classify → sync CountrySpecies.

    Returns the ``Country`` instance.
    """
    cc = country_code.strip().upper()
    country = Country.objects.get(pk=cc)
    cfg = get_commonness_settings()

    if not skip_ingest:
        client = GbifOccurrenceApiClient(cfg)
        attempted = bulk_ingest_raw_dicts(client.iter_normalized_dicts(cc, max_records=limit), batch_size)
        logger.info('ingest %s: attempted %s rows', cc, attempted)

    build_events_from_raw(cc, cfg.dedup_mode)
    refresh_country_coverage(country, cfg)
    refresh_species_country_stats(country, cfg)
    run_classify_and_persist(country, cfg)
    sync_country_gbif_to_countryspecies(country)
    return country
