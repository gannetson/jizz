"""H3 spatial indexing for deduplication."""

from __future__ import annotations

import logging
import math

import h3

logger = logging.getLogger(__name__)


def valid_coordinates(latitude: float, longitude: float) -> bool:
    if not math.isfinite(latitude) or not math.isfinite(longitude):
        return False
    return -90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0


def lat_lng_to_h3_cell(latitude: float, longitude: float, resolution: int) -> str:
    if not valid_coordinates(latitude, longitude):
        raise ValueError(f'invalid coordinates: {latitude}, {longitude}')
    return h3.latlng_to_cell(latitude, longitude, resolution)


def safe_h3_cell(latitude: float, longitude: float, resolution: int) -> str | None:
    try:
        return lat_lng_to_h3_cell(latitude, longitude, resolution)
    except (ValueError, TypeError) as e:
        logger.debug('h3 failed for %s,%s: %s', latitude, longitude, e)
        return None
