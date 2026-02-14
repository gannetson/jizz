"""
EOL (Encyclopedia of Life) scraper for images and videos.
API Documentation: https://eol.org/api/docs
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
import logging

logger = logging.getLogger(__name__)


class EOLScraper(BaseMediaScraper):
    """Scraper for EOL media."""
    
    API_BASE = "https://eol.org/api"
    
    def __init__(self, rate_limit_delay: float = 1.0):
        """Initialize EOL scraper with SSL verification disabled (EOL has SSL issues)."""
        super().__init__(rate_limit_delay=rate_limit_delay, verify_ssl=False)
    
    def search_species(self, scientific_name: str, common_name: str = None, media_type: str = 'images') -> List[Dict]:
        """
        Search EOL for media.
        
        Args:
            scientific_name: Scientific name
            common_name: Common name (optional)
            media_type: 'images' or 'videos'
        
        Returns:
            List of media items
        """
        results = []
        
        # Normalize scientific name
        normalized_name = self.normalize_scientific_name(scientific_name)
        
        # First, search for the species page
        search_params = {
            'q': normalized_name,
            'page': 1,
            'exact': 'true'
        }
        
        search_data = self._fetch_json(f"{self.API_BASE}/search/1.0.json", search_params)
        
        if not search_data or 'results' not in search_data:
            return results
        
        # Get the first matching species ID
        for result in search_data.get('results', []):
            page_id = result.get('id')
            if not page_id:
                continue
            
            # Get media for this species
            media_params = {
                'images_per_page': 75 if media_type == 'images' else 0,
                'videos_per_page': 75 if media_type == 'videos' else 0,
                'sounds_per_page': 0,
                'maps_per_page': 0,
                'texts_per_page': 0
            }
            
            page_data = self._fetch_json(f"{self.API_BASE}/pages/1.0/{page_id}.json", media_params)
            
            if not page_data:
                continue
            
            # Process images
            if media_type == 'images':
                data_objects = page_data.get('dataObjects', [])
                for obj in data_objects:
                    if obj.get('dataType') == 'http://purl.org/dc/dcmitype/StillImage':
                        try:
                            media_url = obj.get('eolMediaURL', '')
                            if not media_url:
                                continue
                            
                            # Get page URL
                            page_url = f"https://eol.org/pages/{page_id}" if page_id else None
                            
                            # Get contributor
                            agents = obj.get('agents', [])
                            contributor = ', '.join([a.get('full_name', '') for a in agents if a.get('full_name')])
                            
                            # Get license
                            license_info = obj.get('license', '')
                            copyright_text = f"License: {license_info}" if license_info else ""
                            
                            # Get title/description
                            title = obj.get('title', '') or obj.get('description', '')
                            
                            # Calculate quality score
                            quality_score = self._calculate_quality_score(obj)
                            
                            results.append({
                                'url': media_url,
                                'link': page_url,
                                'contributor': contributor,
                                'copyright_text': copyright_text,
                                'title': title,
                                'source': 'eol',
                                'quality_score': quality_score
                            })
                        except Exception as e:
                            logger.error(f"Error processing EOL image: {e}")
                            continue
            
            # Process videos
            elif media_type == 'videos':
                data_objects = page_data.get('dataObjects', [])
                for obj in data_objects:
                    if obj.get('dataType') == 'http://purl.org/dc/dcmitype/MovingImage':
                        try:
                            media_url = obj.get('eolMediaURL', '')
                            if not media_url:
                                continue
                            
                            page_url = f"https://eol.org/pages/{page_id}" if page_id else None
                            
                            agents = obj.get('agents', [])
                            contributor = ', '.join([a.get('full_name', '') for a in agents if a.get('full_name')])
                            
                            license_info = obj.get('license', '')
                            copyright_text = f"License: {license_info}" if license_info else ""
                            
                            title = obj.get('title', '') or obj.get('description', '')
                            
                            # Calculate quality score
                            quality_score = self._calculate_quality_score(obj)
                            
                            results.append({
                                'url': media_url,
                                'link': page_url,
                                'contributor': contributor,
                                'copyright_text': copyright_text,
                                'title': title,
                                'source': 'eol',
                                'quality_score': quality_score
                            })
                        except Exception as e:
                            logger.error(f"Error processing EOL video: {e}")
                            continue
            
            # Only process first matching species
            break
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} EOL {media_type} for {scientific_name}")
        return results
    
    def _calculate_quality_score(self, obj: Dict) -> float:
        """Calculate quality score for EOL media."""
        score = 0.5  # Base score
        
        # Has title/description (more complete)
        if obj.get('title') or obj.get('description'):
            score += 0.2
        
        # Has agents/contributors (better attribution)
        if obj.get('agents'):
            score += 0.1
        
        # Has license (better for reuse)
        if obj.get('license'):
            score += 0.2
        
        return min(1.0, score)

