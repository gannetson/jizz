"""
Wikimedia Commons scraper for images and videos.
API Documentation: https://www.mediawiki.org/wiki/API:Main_page
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
import logging
import re

logger = logging.getLogger(__name__)

MAX_RESULTS = 20


class WikimediaScraper(BaseMediaScraper):
    """Scraper for Wikimedia Commons images and videos."""
    
    API_BASE = "https://commons.wikimedia.org/w/api.php"
    
    # Keywords that indicate the image is NOT a wild bird photo
    EXCLUDE_KEYWORDS = [
        'egg', 'eggs', 'nest', 'nests', 'nesting',
        'stamp', 'stamps', 'postage',
        'drawing', 'drawings', 'illustration', 'illustrations',
        'painting', 'paintings', 'artwork', 'art',
        'specimen', 'specimens', 'museum', 'taxidermy',
        'skeleton', 'skull', 'bone', 'bones',
        'map', 'maps', 'distribution',
        'diagram', 'diagrams', 'chart', 'charts',
        'logo', 'logos', 'emblem', 'badge',
        'coin', 'coins', 'medal', 'medals',
    ]
    
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
                        
                        # Get description and title
                        description = extmetadata.get('ImageDescription', {}).get('value', '') or \
                                     extmetadata.get('Description', {}).get('value', '')
                        title_text = title.lower() if title else ''
                        description_text = description.lower() if description else ''
                        
                        # Check if this is a wild bird photo (exclude unwanted content)
                        combined_text = f"{title_text} {description_text}"
                        if self._should_exclude(combined_text):
                            continue
                        
                        # Calculate quality score
                        quality_score = self._calculate_quality_score(imageinfo, extmetadata, title, description)
                        
                        results.append({
                            'url': url,
                            'link': page_url,
                            'contributor': contributor,
                            'copyright_text': copyright_text,
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
        return results[:MAX_RESULTS]
    
    def _should_exclude(self, text: str) -> bool:
        """
        Check if the text contains keywords that indicate this is NOT a wild bird photo.
        
        Args:
            text: Combined title and description text (lowercase)
        
        Returns:
            True if should be excluded, False otherwise
        """
        if not text:
            return False
        
        # Check for exclude keywords (case-insensitive)
        text_lower = text.lower()
        for keyword in self.EXCLUDE_KEYWORDS:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
            if re.search(pattern, text_lower):
                logger.debug(f"Excluding image due to keyword: {keyword}")
                return True
        
        return False
    
    def _calculate_quality_score(self, imageinfo: Dict, extmetadata: Dict, title: str = '', description: str = '') -> float:
        """
        Calculate quality score for Wikimedia media.
        Higher scores indicate better quality images of wild birds.
        """
        score = 0.5  # Base score
        
        # File size (larger files often better quality)
        size = imageinfo.get('size', 0) or 0
        if size > 2000000:  # > 2MB
            score += 0.15
        elif size > 1000000:  # > 1MB
            score += 0.1
        elif size > 500000:  # > 500KB
            score += 0.05
        
        # Width/height (higher resolution = better)
        width = imageinfo.get('width', 0) or 0
        height = imageinfo.get('height', 0) or 0
        if width > 3000 or height > 3000:
            score += 0.15
        elif width > 2000 or height > 2000:
            score += 0.1
        elif width > 1000 or height > 1000:
            score += 0.05
        
        # Has detailed description (more complete metadata)
        if description:
            score += 0.1
            # Bonus for longer, more descriptive text
            if len(description) > 100:
                score += 0.05
        
        # Has title
        if title:
            score += 0.05
        
        # Has contributor/author info
        if extmetadata.get('Artist') or extmetadata.get('Author'):
            score += 0.05
        
        # Prefer images with license information
        if extmetadata.get('License') or extmetadata.get('LicenseShortName'):
            score += 0.05
        
        return min(1.0, score)

