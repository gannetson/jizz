"""Country coverage and SpeciesCountryStats SQL."""

from __future__ import annotations

from datetime import date
from typing import Any

from django.db import connection, transaction
from django.utils import timezone as dj_tz

from jizz.models import Country, CountryCoverageStats, SpeciesCountryStats
from jizz.services.commonness.config import CommonnessSettings


def min_recent_year(recent_years: int, *, today: date | None = None) -> int:
    today = today or date.today()
    return today.year - recent_years + 1


def refresh_country_coverage(country: Country, cfg: CommonnessSettings) -> CountryCoverageStats:
    """Compute coverage from occurrence_event and upsert CountryCoverageStats."""
    min_year = min_recent_year(cfg.recent_years)
    coverage_sql = """
        WITH ev AS (
            SELECT h3_cell, event_date FROM jizz_occurrenceevent
            WHERE country_id = %s AND dedup_mode = %s
        )
        SELECT
            (SELECT COUNT(DISTINCT h3_cell) FROM ev) AS cells_all,
            (SELECT COUNT(DISTINCT h3_cell) FROM ev WHERE EXTRACT(YEAR FROM event_date) >= %s) AS cells_recent,
            (SELECT COUNT(*) FROM ev) AS events_all,
            (SELECT COUNT(*) FROM ev WHERE EXTRACT(YEAR FROM event_date) >= %s) AS events_recent
    """
    with connection.cursor() as cur:
        cur.execute(coverage_sql, [country.pk, cfg.dedup_mode, min_year, min_year])
        row = cur.fetchone()
    if not row:
        cells_all = cells_recent = events_all = events_recent = 0
    else:
        cells_all, cells_recent, events_all, events_recent = (
            int(row[0] or 0),
            int(row[1] or 0),
            int(row[2] or 0),
            int(row[3] or 0),
        )
    passes = cells_all >= cfg.min_country_cells and events_all >= cfg.min_country_events
    now = dj_tz.now()
    cov, _ = CountryCoverageStats.objects.update_or_create(
        country=country,
        defaults={
            'total_bird_cells_all': cells_all,
            'total_bird_cells_recent': cells_recent,
            'total_dedup_events_all': events_all,
            'total_dedup_events_recent': events_recent,
            'recent_years': cfg.recent_years,
            'passes_coverage_gate': passes,
            'computed_at': now,
        },
    )
    return cov


def refresh_species_country_stats(country: Country, cfg: CommonnessSettings) -> int:
    """Rebuild SpeciesCountryStats for one country."""
    min_year = min_recent_year(cfg.recent_years)
    try:
        cov = CountryCoverageStats.objects.get(country=country)
    except CountryCoverageStats.DoesNotExist:
        cov = refresh_country_coverage(country, cfg)
    total_cells_all = cov.total_bird_cells_all
    total_cells_recent = cov.total_bird_cells_recent
    now = dj_tz.now()

    SpeciesCountryStats.objects.filter(country=country).delete()

    sql = """
        WITH raw_counts AS (
            SELECT
                species_key,
                MAX(scientific_name) AS scientific_name,
                COUNT(*)::integer AS raw_record_count
            FROM jizz_gbifoccurrenceraw
            WHERE country_id = %s
            GROUP BY species_key
        ),
        event_agg AS (
            SELECT
                species_key,
                MAX(scientific_name) AS scientific_name,
                COUNT(*)::integer AS dedup_event_count,
                COUNT(DISTINCT h3_cell)::integer AS occupied_cell_count,
                COUNT(DISTINCT h3_cell) FILTER (
                    WHERE EXTRACT(YEAR FROM event_date) >= %s
                )::integer AS occupied_cell_count_recent,
                COUNT(DISTINCT EXTRACT(YEAR FROM event_date))::integer AS years_present_count,
                COUNT(DISTINCT EXTRACT(YEAR FROM event_date)) FILTER (
                    WHERE EXTRACT(YEAR FROM event_date) >= %s
                )::integer AS years_present_recent,
                MIN(EXTRACT(YEAR FROM event_date))::integer AS first_year,
                MAX(EXTRACT(YEAR FROM event_date))::integer AS last_year
            FROM jizz_occurrenceevent
            WHERE country_id = %s AND dedup_mode = %s
            GROUP BY species_key
        ),
        species_keys AS (
            SELECT species_key FROM raw_counts
            UNION
            SELECT species_key FROM event_agg
        )
        INSERT INTO jizz_speciescountrystats (
            country_id, gbif_species_key, scientific_name,
            raw_record_count, dedup_event_count,
            occupied_cell_count, occupied_cell_count_recent,
            years_present_count, years_present_recent,
            first_year, last_year,
            total_country_cells_all, total_country_cells_recent,
            occupancy_ratio, recent_occupancy_ratio,
            computed_at, country_species_id
        )
        SELECT
            %s,
            sk.species_key,
            COALESCE(e.scientific_name, r.scientific_name),
            COALESCE(r.raw_record_count, 0),
            COALESCE(e.dedup_event_count, 0),
            COALESCE(e.occupied_cell_count, 0),
            COALESCE(e.occupied_cell_count_recent, 0),
            COALESCE(e.years_present_count, 0),
            COALESCE(e.years_present_recent, 0),
            e.first_year,
            e.last_year,
            %s,
            %s,
            CASE WHEN %s > 0
                THEN COALESCE(e.occupied_cell_count, 0)::float / %s
                ELSE NULL END,
            CASE WHEN %s > 0
                THEN COALESCE(e.occupied_cell_count_recent, 0)::float / %s
                ELSE NULL END,
            %s,
            NULL
        FROM species_keys sk
        LEFT JOIN raw_counts r ON r.species_key = sk.species_key
        LEFT JOIN event_agg e ON e.species_key = sk.species_key
    """
    params: list[Any] = [
        country.pk,
        min_year,
        min_year,
        country.pk,
        cfg.dedup_mode,
        country.pk,
        total_cells_all,
        total_cells_recent,
        total_cells_all,
        total_cells_all,
        total_cells_recent,
        total_cells_recent,
        now,
    ]
    with connection.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount if cur.rowcount is not None else 0


def run_classify_and_persist(country: Country, cfg: CommonnessSettings) -> int:
    """Classify from SpeciesCountryStats; write SpeciesCommonnessClassification."""
    from jizz.models import SpeciesCommonnessClassification
    from jizz.services.commonness.classify import ClassificationConfig, SpeciesStatRow, classify_rows
    from jizz.services.commonness.config import config_fingerprint

    cov = CountryCoverageStats.objects.filter(country=country).first()
    if cov is None:
        cov = refresh_country_coverage(country, cfg)

    cc = ClassificationConfig(
        weight_occupied_cells=cfg.weight_occupied_cells,
        weight_occupied_cells_recent=cfg.weight_occupied_cells_recent,
        weight_years_recent=cfg.weight_years_recent,
        weight_dedup_events=cfg.weight_dedup_events,
        percentile_thresholds=cfg.percentile_thresholds,
        min_species_cells_medium=cfg.min_species_cells_medium,
        min_species_events_high=cfg.min_species_events_high,
    )

    stats_qs = SpeciesCountryStats.objects.filter(country=country)
    rows = [
        SpeciesStatRow(
            country_pk=country.pk,
            gbif_species_key=int(s.gbif_species_key),
            scientific_name=s.scientific_name,
            raw_record_count=s.raw_record_count,
            dedup_event_count=s.dedup_event_count,
            occupied_cell_count=s.occupied_cell_count,
            occupied_cell_count_recent=s.occupied_cell_count_recent,
            years_present_count=s.years_present_count,
            years_present_recent=s.years_present_recent,
            first_year=s.first_year,
            last_year=s.last_year,
        )
        for s in stats_qs
    ]

    results = classify_rows(
        rows,
        passes_coverage_gate=cov.passes_coverage_gate,
        country_cells_all=cov.total_bird_cells_all,
        country_events_all=cov.total_dedup_events_all,
        config=cc,
    )

    cfg_hash = config_fingerprint(cfg)
    now = dj_tz.now()

    with transaction.atomic():
        SpeciesCommonnessClassification.objects.filter(country=country).delete()
        SpeciesCommonnessClassification.objects.bulk_create(
            [
                SpeciesCommonnessClassification(
                    country=country,
                    gbif_species_key=r.gbif_species_key,
                    scientific_name=r.scientific_name,
                    score=r.score,
                    classification=r.classification,
                    confidence=r.confidence,
                    raw_record_count=r.raw_record_count,
                    dedup_event_count=r.dedup_event_count,
                    occupied_cell_count=r.occupied_cell_count,
                    years_present_recent=r.years_present_recent,
                    last_year=r.last_year,
                    config_hash=cfg_hash,
                    computed_at=now,
                )
                for r in results
            ],
            batch_size=500,
        )
    return len(results)
