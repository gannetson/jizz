"""Link GBIF stats/classifications to CountrySpecies via Species.gbif_species_key."""

from __future__ import annotations

import logging

from django.db import transaction

from jizz.models import Country, CountrySpecies, Species, SpeciesCommonnessClassification, SpeciesCountryStats

logger = logging.getLogger(__name__)


def sync_country_gbif_to_countryspecies(country: Country) -> tuple[int, int]:
    """
    For each Species with ``gbif_species_key`` set, attach ``CountrySpecies`` rows
    and copy labels onto ``CountrySpecies`` GBIF fields.

    Returns (stats_linked, classifications_linked).
    """
    species_by_key = {
        int(s.gbif_species_key): s
        for s in Species.objects.exclude(gbif_species_key__isnull=True)
    }

    stats_linked = 0
    cls_linked = 0

    with transaction.atomic():
        for st in SpeciesCountryStats.objects.filter(country=country):
            sp = species_by_key.get(int(st.gbif_species_key))
            if not sp:
                st.country_species = None
                st.save(update_fields=['country_species'])
                continue
            cs = CountrySpecies.objects.filter(country=country, species=sp).first()
            st.country_species = cs
            st.save(update_fields=['country_species'])
            if cs:
                stats_linked += 1

        for cl in SpeciesCommonnessClassification.objects.filter(country=country):
            sp = species_by_key.get(int(cl.gbif_species_key))
            if not sp:
                cl.country_species = None
                cl.save(update_fields=['country_species'])
                continue
            cs = CountrySpecies.objects.filter(country=country, species=sp).first()
            cl.country_species = cs
            cl.save(update_fields=['country_species'])
            if cs:
                cls_linked += 1
                cs.gbif_commonness = cl.classification
                cs.gbif_commonness_score = cl.score
                cs.gbif_commonness_confidence = cl.confidence
                cs.gbif_commonness_computed_at = cl.computed_at
                cs.gbif_occupied_cells = cl.occupied_cell_count
                cs.gbif_dedup_events = cl.dedup_event_count
                cs.gbif_years_present_recent = cl.years_present_recent
                cs.gbif_last_year = cl.last_year
                cs.save(
                    update_fields=[
                        'gbif_commonness',
                        'gbif_commonness_score',
                        'gbif_commonness_confidence',
                        'gbif_commonness_computed_at',
                        'gbif_occupied_cells',
                        'gbif_dedup_events',
                        'gbif_years_present_recent',
                        'gbif_last_year',
                    ],
                )

    logger.info(
        'sync_countryspecies %s: stats_links=%s class_links=%s',
        country.pk,
        stats_linked,
        cls_linked,
    )
    return stats_linked, cls_linked
