"""
Flickr Creative Commons scraper for images.
API Documentation: https://www.flickr.com/services/api/
Note: Requires API key - will need to be configured in settings
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class FlickrScraper(BaseMediaScraper):
    """Scraper for Flickr Creative Commons images."""
    
    API_BASE = "https://api.flickr.com/services/rest"
    
    def __init__(self, rate_limit_delay: float = 0.1):
        """Initialize with faster rate limit (Flickr allows more requests)."""
        super().__init__(rate_limit_delay)
        self.api_key = getattr(settings, 'FLICKR_API_KEY', None)
        if not self.api_key:
            logger.warning("FLICKR_API_KEY not set. Flickr scraping will not work.")
    
    def search_species(self, scientific_name: str, common_name: str = None) -> List[Dict]:
        """
        Search Flickr for Creative Commons images.
        
        Args:
            scientific_name: Scientific name
            common_name: Common name (optional)
        
        Returns:
            List of image media items
        """
        results = []
        
        if not self.api_key:
            return results
        
        # Normalize scientific name
        normalized_name = self.normalize_scientific_name(scientific_name)
        
        # Build search query
        search_terms = [normalized_name]
        if common_name:
            search_terms.append(common_name)
        
        for search_term in search_terms:
            page = 1
            max_pages = 5
            
            while page <= max_pages:
                params = {
                    'method': 'flickr.photos.search',
                    'api_key': self.api_key,
                    'text': search_term,
                    'license': '1,2,3,4,5,6,7,8',  # All Creative Commons licenses
                    'content_type': 1,  # Photos only
                    'media': 'photos',
                    'per_page': 100,
                    'page': page,
                    'format': 'json',
                    'nojsoncallback': 1,
                    'extras': 'owner_name,license,url_l,url_o,description'
                }
                
                data = self._fetch_json(self.API_BASE, params)
                
                if not data or data.get('stat') != 'ok' or 'photos' not in data:
                    break
                
                photos = data['photos'].get('photo', [])
                if not photos:
                    break
                
                for photo in photos:
                    try:
                        # Get image URL (prefer large, fallback to original)
                        url = photo.get('url_l') or photo.get('url_o', '')
                        if not url:
                            continue
                        
                        # Get page URL
                        photo_id = photo.get('id')
                        owner = photo.get('owner')
                        page_url = f"https://www.flickr.com/photos/{owner}/{photo_id}" if photo_id and owner else None
                        
                        # Get contributor
                        contributor = photo.get('ownername', '')
                        
                        # Get license
                        license_id = photo.get('license')
                        license_map = {
                            '1': 'CC BY-NC-SA 2.0',
                            '2': 'CC BY-NC 2.0',
                            '3': 'CC BY-NC-ND 2.0',
                            '4': 'CC BY 2.0',
                            '5': 'CC BY-SA 2.0',
                            '6': 'CC BY-ND 2.0',
                            '7': 'No known copyright restrictions',
                            '8': 'US Government Work'
                        }
                        license_text = license_map.get(str(license_id), '')
                        copyright_text = f"License: {license_text}" if license_text else ""
                        
                        # Get title/description
                        title = photo.get('title', '')
                        description = photo.get('description', {}).get('_content', '') if isinstance(photo.get('description'), dict) else ''
                        
                        # Calculate quality score
                        quality_score = self._calculate_quality_score(photo)
                        
                        results.append({
                            'url': url,
                            'link': page_url,
                            'contributor': contributor,
                            'copyright': copyright_text,
                            'title': title or description,
                            'source': 'flickr',
                            'quality_score': quality_score
                        })
                    except Exception as e:
                        logger.error(f"Error processing Flickr photo: {e}")
                        continue
                
                # Check if there are more pages
                pages = data['photos'].get('pages', 1)
                if page >= pages:
                    break
                
                page += 1
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} Flickr images for {scientific_name}")
        return results
    
    def _calculate_quality_score(self, photo: Dict) -> float:
        """Calculate quality score for Flickr photo."""
        score = 0.5  # Base score
        
        # Prefer larger images (url_l > url_o indicates large size)
        if photo.get('url_l'):
            score += 0.2
        elif photo.get('url_o'):
            score += 0.1
        
        # License type (more permissive = better)
        license_id = photo.get('license')
        if license_id in ['4', '5', '6']:  # CC BY, CC BY-SA, CC BY-ND
            score += 0.2
        elif license_id in ['1', '2', '3']:  # CC BY-NC variants
            score += 0.1
        
        # Has description/title (more complete)
        if photo.get('title') or photo.get('description'):
            score += 0.1
        
        return min(1.0, score)

