"""
Utility functions for media processing.
"""
import re
from typing import List, Dict, Optional
from django.db import transaction


def parse_copyright(copyright_text):
    """
    Parse copyright text and return (standardized_notation, non_commercial_only).
    
    Args:
        copyright_text: The copyright text as received from scraper
    
    Returns:
        tuple: (standardized_notation, non_commercial_only)
    """
    if not copyright_text:
        return '', False
    
    text = copyright_text.upper().strip()
    
    # Handle license URLs (e.g., from GBIF: "http://creativecommons.org/licenses/by/4.0/")
    if 'CREATIVECOMMONS.ORG' in text or 'LICENSES' in text:
        if '/BY-NC-ND/' in text:
            return 'CC BY-NC-ND', True
        elif '/BY-NC-SA/' in text:
            return 'CC BY-NC-SA', True
        elif '/BY-NC/' in text:
            return 'CC BY-NC', True
        elif '/BY-SA/' in text:
            return 'CC BY-SA', False
        elif '/BY-ND/' in text:
            return 'CC BY-ND', False
        elif '/BY/' in text:
            return 'CC BY', False
        elif '/PUBLICDOMAIN/' in text or '/ZERO/' in text:
            return 'CC0', False
    
    # Handle lowercase hyphenated formats (e.g., from iNaturalist: "cc-by", "cc-by-nc")
    # Normalize to check patterns - replace hyphens and underscores with spaces
    normalized = text.replace('-', ' ').replace('_', ' ')
    
    # Direct string checks for common formats (faster and more reliable)
    # Check normalized text for patterns like "CC BY NC ND", "CC BY NC", etc.
    if 'CC BY NC ND' in normalized or 'CCBYNCND' in normalized.replace(' ', ''):
        return 'CC BY-NC-ND', True
    elif 'CC BY NC SA' in normalized or 'CCBYNCSA' in normalized.replace(' ', ''):
        return 'CC BY-NC-SA', True
    elif 'CC BY NC' in normalized or 'CCBYNC' in normalized.replace(' ', ''):
        return 'CC BY-NC', True
    elif 'CC BY SA' in normalized or 'CCBYSA' in normalized.replace(' ', ''):
        return 'CC BY-SA', False
    elif 'CC BY ND' in normalized or 'CCBYND' in normalized.replace(' ', ''):
        return 'CC BY-ND', False
    elif 'CC BY' in normalized or 'CCBY' in normalized.replace(' ', ''):
        return 'CC BY', False
    elif 'CC0' in text or 'CC ZERO' in normalized:
        return 'CC0', False
    
    # Creative Commons licenses - regex patterns as fallback
    # Patterns to match various formats: "CC BY", "CC-BY", "cc-by", "CC BY NC", etc.
    cc_patterns = [
        (r'CC\s*BY\s*NC\s*ND', 'CC BY-NC-ND'),  # Must check NC before BY
        (r'CC\s*BY\s*NC\s*SA', 'CC BY-NC-SA'),
        (r'CC\s*BY\s*NC', 'CC BY-NC'),
        (r'CC\s*BY\s*SA', 'CC BY-SA'),
        (r'CC\s*BY\s*ND', 'CC BY-ND'),
        (r'CC\s*BY', 'CC BY'),
        (r'CC0', 'CC0'),
        (r'CC\s*ZERO', 'CC0'),
    ]
    
    # Check both original and normalized text with regex
    for pattern, standardized in cc_patterns:
        if re.search(pattern, text) or re.search(pattern, normalized):
            non_commercial = 'NC' in standardized
            return standardized, non_commercial
    
    # Check for explicit Creative Commons mentions (including "License: Creative Commons...")
    # Remove common prefixes like "License:", "Licensed under", etc.
    clean_text = re.sub(r'^(LICENSE|LICENSED UNDER|LICENSE:)\s*', '', text, flags=re.IGNORECASE)
    
    if 'CREATIVE COMMONS' in clean_text or 'CC ' in clean_text or 'CC-' in clean_text:
        # Try to extract version
        version_match = re.search(r'(\d+\.?\d*)', clean_text)
        version = version_match.group(1) if version_match else ''
        
        # Check for attributes (check both original and normalized)
        has_nc = ('NON-COMMERCIAL' in clean_text or 'NC' in clean_text or 
                  'NON-COMMERCIAL' in normalized or ' NC' in normalized)
        has_sa = ('SHARE-ALIKE' in clean_text or 'SA' in clean_text or
                  'SHARE-ALIKE' in normalized or ' SA' in normalized)
        has_nd = ('NO DERIVATIVES' in clean_text or 'ND' in clean_text or
                  'NO DERIVATIVES' in normalized or ' ND' in normalized)
        
        if has_nc and has_sa:
            return f'CC BY-NC-SA {version}'.strip(), True
        elif has_nc and has_nd:
            return f'CC BY-NC-ND {version}'.strip(), True
        elif has_nc:
            return f'CC BY-NC {version}'.strip(), True
        elif has_sa:
            return f'CC BY-SA {version}'.strip(), False
        elif has_nd:
            return f'CC BY-ND {version}'.strip(), False
        else:
            return f'CC BY {version}'.strip(), False
    
    # Public Domain
    if 'PUBLIC DOMAIN' in text or 'PD' in text or 'CC0' in text:
        return 'Public Domain', False
    
    # All Rights Reserved - be specific to avoid false positives
    # Only match if it explicitly says "all rights reserved" and doesn't mention Creative Commons
    # Handle both "all rights reserved" and "allrightsreserved" formats
    if ('ALL RIGHTS RESERVED' in text or 'ALLRIGHTSRESERVED' in normalized) and \
       'CREATIVE COMMONS' not in text and 'CC ' not in text and 'CC-' not in text:
        return 'All Rights Reserved', True  # Assume non-commercial if all rights reserved
    
    # GNU licenses
    if 'GPL' in text:
        return 'GPL', False
    if 'LGPL' in text:
        return 'LGPL', False
    
    # MIT License
    if 'MIT' in text and 'LICENSE' in text:
        return 'MIT', False
    
    # Apache License
    if 'APACHE' in text:
        return 'Apache', False
    
    # If we can't parse it, return empty but check for non-commercial keywords
    non_commercial_keywords = ['NON-COMMERCIAL', 'NC', 'NOT FOR COMMERCIAL']
    has_nc = any(keyword in text for keyword in non_commercial_keywords)
    
    return '', has_nc


def safe_truncate(value, max_length=200):
    """
    Safely truncate a value to max_length, handling None and non-string types.
    Handles multi-byte characters by encoding to bytes and truncating if needed.
    """
    if value is None:
        return ''
    value_str = str(value)
    
    # If string is already short enough, return as-is
    if len(value_str) <= max_length:
        return value_str
    
    # Truncate by characters first
    truncated = value_str[:max_length]
    
    # Check byte length (PostgreSQL counts bytes, not characters)
    # If bytes exceed max_length, truncate further
    while len(truncated.encode('utf-8')) > max_length and len(truncated) > 0:
        truncated = truncated[:-1]
    
    return truncated


def get_species_media(
    species,
    media_types: Optional[List[str]] = None,
    sources: Optional[List[str]] = None
) -> Dict[str, List[Dict]]:
    """
    Scrape media for a species from all available sources.
    
    Args:
        species: Species model instance
        media_types: List of media types to scrape ('image', 'video', 'audio'). 
                    Defaults to all types.
        sources: List of sources to scrape from. Available sources:
                'xeno_canto', 'inaturalist', 'wikimedia', 'gbif', 'flickr', 
                'eol', 'observation', 'youtube'. Defaults to all sources.
    
    Returns:
        Dictionary with keys 'image', 'video', 'audio', each containing a list
        of media item dictionaries with keys:
        - url: Direct URL to the media file
        - link: Page URL where media is hosted
        - contributor: Contributor name
        - copyright_text: Copyright information
        - source: Source platform name
        - type: Media type ('image', 'video', or 'audio')
        - title: Optional title/description
    """
    from media.scrapers.xeno_canto import XenoCantoScraper
    from media.scrapers.inaturalist import iNaturalistScraper
    from media.scrapers.wikimedia import WikimediaScraper
    from media.scrapers.gbif import GBIFScraper
    from media.scrapers.flickr import FlickrScraper
    from media.scrapers.eol import EOLScraper
    from media.scrapers.observation import ObservationScraper
    from media.scrapers.youtube import YouTubeScraper
    import logging
    
    logger = logging.getLogger(__name__)
    
    # Default to all media types and sources if not specified
    if media_types is None:
        media_types = ['image', 'video', 'audio']
    if sources is None:
        sources = ['xeno_canto', 'inaturalist', 'wikimedia', 'gbif', 'flickr', 
                  'eol', 'observation', 'youtube']
    
    # Initialize scrapers
    scrapers = {
        'xeno_canto': XenoCantoScraper(),
        'inaturalist': iNaturalistScraper(),
        'wikimedia': WikimediaScraper(),
        'gbif': GBIFScraper(),
        'flickr': FlickrScraper(),
        'eol': EOLScraper(),
        'observation': ObservationScraper(),
        'youtube': YouTubeScraper(),
    }
    
    # Results dictionary
    results = {
        'image': [],
        'video': [],
        'audio': []
    }
    
    # Scrape audio
    if 'audio' in media_types and 'xeno_canto' in sources:
        try:
            media_items = scrapers['xeno_canto'].search_species(
                species.name_latin, 
                species.name
            )
            for item in media_items:
                item['type'] = 'audio'
                item['source'] = 'xeno_canto'
                results['audio'].append(item)
        except Exception as e:
            logger.error(f"Error scraping audio from xeno_canto for {species.name}: {e}")
    
    # Scrape images
    if 'image' in media_types:
        image_sources = {
            'inaturalist': ('inaturalist', 'photos'),
            'wikimedia': ('wikimedia', 'images'),
            'gbif': ('gbif', None),
            'flickr': ('flickr', None),
            'eol': ('eol', 'images'),
            'observation': ('observation', None),
        }
        
        for source_name, (scraper_key, media_type_param) in image_sources.items():
            if source_name in sources:
                try:
                    scraper = scrapers[scraper_key]
                    if media_type_param:
                        if isinstance(scraper, iNaturalistScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='photos'
                            )
                        elif isinstance(scraper, WikimediaScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='images'
                            )
                        elif isinstance(scraper, EOLScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='images'
                            )
                        else:
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name
                            )
                    else:
                        media_items = scraper.search_species(
                            species.name_latin, 
                            species.name
                        )
                    
                    for item in media_items:
                        # Skip if it's actually a sound file
                        if 'sounds' in item.get('link', ''):
                            continue
                        item['type'] = 'image'
                        item['source'] = source_name
                        results['image'].append(item)
                except Exception as e:
                    logger.error(f"Error scraping images from {source_name} for {species.name}: {e}")
    
    # Scrape videos
    if 'video' in media_types:
        video_sources = {
            'wikimedia': ('wikimedia', 'videos'),
            'inaturalist': ('inaturalist', 'videos'),
            'youtube': ('youtube', None),
            'eol': ('eol', 'videos'),
        }
        
        for source_name, (scraper_key, media_type_param) in video_sources.items():
            if source_name in sources:
                try:
                    scraper = scrapers[scraper_key]
                    if media_type_param:
                        if isinstance(scraper, iNaturalistScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='videos'
                            )
                        elif isinstance(scraper, WikimediaScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='videos'
                            )
                        elif isinstance(scraper, EOLScraper):
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name, 
                                media_type='videos'
                            )
                        else:
                            media_items = scraper.search_species(
                                species.name_latin, 
                                species.name
                            )
                    else:
                        media_items = scraper.search_species(
                            species.name_latin, 
                            species.name
                        )
                    
                    for item in media_items:
                        item['type'] = 'video'
                        item['source'] = source_name
                        results['video'].append(item)
                except Exception as e:
                    logger.error(f"Error scraping videos from {source_name} for {species.name}: {e}")
    
    return results

