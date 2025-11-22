"""
Wikimedia Commons scraper for images and videos.
API Documentation: https://www.mediawiki.org/wiki/API:Main_page
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
import logging

logger = logging.getLogger(__name__)


class WikimediaScraper(BaseMediaScraper):
    """Scraper for Wikimedia Commons images and videos."""
    
    API_BASE = "https://commons.wikimedia.org/w/api.php"
    
    def search_species(self, scientific_name: str, common_name: str = None, media_type: str = 'images') -> List[Dict]:
        """
        Search Wikimedia Commons for media.
        
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
        
        # Build search query
        search_terms = [normalized_name]
        if common_name:
            search_terms.append(common_name)
        
        for search_term in search_terms:
            page = 1
            max_pages = 5
            
            while page <= max_pages:
                params = {
                    'action': 'query',
                    'format': 'json',
                    'generator': 'search',
                    'gsrsearch': f'filetype:{"bitmap" if media_type == "images" else "video"} {search_term}',
                    'gsrnamespace': 6,  # File namespace
                    'gsrlimit': 50,
                    'gsroffset': (page - 1) * 50,
                    'prop': 'imageinfo|info',
                    'iiprop': 'url|extmetadata',
                    'iiurlwidth': 800,  # Get medium-sized image
                }
                
                data = self._fetch_json(self.API_BASE, params)
                
                if not data or 'query' not in data or 'pages' not in data['query']:
                    break
                
                pages = data['query']['pages']
                if not pages:
                    break
                
                for page_id, page_data in pages.items():
                    try:
                        imageinfo = page_data.get('imageinfo', [{}])[0]
                        if not imageinfo:
                            continue
                        
                        url = imageinfo.get('url', '')
                        if not url:
                            continue
                        
                        # Get metadata
                        extmetadata = imageinfo.get('extmetadata', {})
                        contributor = extmetadata.get('Artist', {}).get('value', '') or \
                                     extmetadata.get('Author', {}).get('value', '')
                        
                        license_info = extmetadata.get('License', {}).get('value', '') or \
                                      extmetadata.get('LicenseShortName', {}).get('value', '')
                        copyright_text = f"License: {license_info}" if license_info else ""
                        
                        # Get page URL
                        title = page_data.get('title', '')
                        page_url = f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}" if title else None
                        
                        # Get description
                        description = extmetadata.get('ImageDescription', {}).get('value', '') or \
                                     extmetadata.get('Description', {}).get('value', '')
                        
                        # Calculate quality score
                        quality_score = self._calculate_quality_score(imageinfo, extmetadata)
                        
                        results.append({
                            'url': url,
                            'link': page_url,
                            'contributor': contributor,
                            'copyright': copyright_text,
                            'title': description,
                            'source': 'wikimedia',
                            'quality_score': quality_score
                        })
                    except Exception as e:
                        logger.error(f"Error processing Wikimedia media: {e}")
                        continue
                
                # Check for continuation
                if 'continue' not in data:
                    break
                
                page += 1
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} Wikimedia {media_type} for {scientific_name}")
        return results[:10]
    
    def _calculate_quality_score(self, imageinfo: Dict, extmetadata: Dict) -> float:
        """Calculate quality score for Wikimedia media."""
        score = 0.6  # Base score (Wikimedia is generally high quality)
        
        # File size (larger files often better quality)
        size = imageinfo.get('size', 0) or 0
        if size > 1000000:  # > 1MB
            score += 0.2
        elif size > 500000:  # > 500KB
            score += 0.1
        
        # Width/height (higher resolution = better)
        width = imageinfo.get('width', 0) or 0
        height = imageinfo.get('height', 0) or 0
        if width > 2000 or height > 2000:
            score += 0.1
        elif width > 1000 or height > 1000:
            score += 0.05
        
        # Has description (more complete metadata)
        if extmetadata.get('ImageDescription') or extmetadata.get('Description'):
            score += 0.1
        
        return min(1.0, score)

