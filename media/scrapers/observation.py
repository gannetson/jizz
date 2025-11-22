"""
Observation.org scraper for images.
Uses the photos endpoint: https://observation.org/photos/?species={species_id}
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
import logging
import re
from urllib.parse import urljoin, urlparse

logger = logging.getLogger(__name__)


class ObservationScraper(BaseMediaScraper):
    """Scraper for Observation.org images."""
    
    BASE_URL = "https://observation.org"
    PHOTOS_URL = "https://observation.org/photos/"
    
    def search_species(self, scientific_name: str, common_name: str = None) -> List[Dict]:
        """
        Search Observation.org for images.
        
        Args:
            scientific_name: Scientific name
            common_name: Common name (optional)
        
        Returns:
            List of image media items
        """
        results = []
        
        # Normalize scientific name
        normalized_name = self.normalize_scientific_name(scientific_name)
        
        # First, find the species ID
        species_id = self._find_species_id(normalized_name)
        
        if not species_id:
            logger.warning(f"Could not find species ID for {scientific_name} on Observation.org")
            return results
        
        # Use the photos endpoint with species ID
        page = 1
        max_pages = 10  # Limit to 10 pages
        
        while page <= max_pages:
            params = {
                'species': species_id,
                'sort': 'date',  # Sort by date (newest first)
                'type': 'photo',  # Only photos
                'license': '',  # All licenses (can filter later if needed)
            }
            
            soup = self._fetch_page(self.PHOTOS_URL, params)
            
            if not soup:
                break
            
            # Find photo containers - Observation.org uses specific structure
            # Look for photo links/containers
            photo_links = soup.find_all('a', href=re.compile(r'/photos/\d+', re.I))
            
            if not photo_links:
                # Try alternative structure - look for images in photo containers
                photo_containers = soup.find_all(['div', 'article', 'figure'], class_=re.compile(r'photo|image|observation', re.I))
                
                for container in photo_containers:
                    img = container.find('img')
                    if img:
                        photo_item = self._extract_photo_from_container(img, container)
                        if photo_item:
                            results.append(photo_item)
            else:
                # Extract photos from links
                for link in photo_links[:50]:  # Limit per page
                    photo_item = self._extract_photo_from_link(link)
                    if photo_item:
                        results.append(photo_item)
            
            # Check for pagination
            next_link = soup.find('a', string=re.compile(r'next|»', re.I))
            if not next_link or page >= max_pages:
                break
            
            page += 1
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} Observation.org images for {scientific_name}")
        return results
    
    def _find_species_id(self, scientific_name: str) -> Optional[int]:
        """
        Find the species ID on Observation.org by searching for the scientific name.
        """
        try:
            # Try searching via the species page
            search_name = scientific_name.replace(' ', '_').lower()
            species_url = f"{self.BASE_URL}/species/{search_name}/"
            
            soup = self._fetch_page(species_url)
            
            if soup:
                # Look for species ID in the page - might be in a data attribute or URL
                # Check for links that contain species ID
                species_links = soup.find_all('a', href=re.compile(r'species=\d+', re.I))
                if species_links:
                    match = re.search(r'species=(\d+)', species_links[0].get('href', ''))
                    if match:
                        return int(match.group(1))
                
                # Alternative: look for data attributes or script tags with species ID
                scripts = soup.find_all('script')
                for script in scripts:
                    if script.string:
                        match = re.search(r'species[_\s]*id[_\s]*[:=][_\s]*(\d+)', script.string, re.I)
                        if match:
                            return int(match.group(1))
            
            # Fallback: try to extract from photos page by searching
            # This is less reliable but might work
            params = {'search': scientific_name}
            soup = self._fetch_page(self.PHOTOS_URL, params)
            
            if soup:
                # Look for species parameter in links
                links = soup.find_all('a', href=re.compile(r'species=\d+', re.I))
                if links:
                    match = re.search(r'species=(\d+)', links[0].get('href', ''))
                    if match:
                        return int(match.group(1))
            
            return None
        except Exception as e:
            logger.debug(f"Error finding species ID for {scientific_name}: {e}")
            return None
    
    def _extract_photo_from_link(self, link) -> Optional[Dict]:
        """Extract photo information from a link element."""
        try:
            href = link.get('href', '')
            if not href:
                return None
            
            # Construct full URL
            if href.startswith('//'):
                page_url = 'https:' + href
            elif href.startswith('/'):
                page_url = self.BASE_URL + href
            else:
                page_url = href
            
            # Find image in the link
            img = link.find('img')
            if not img:
                return None
            
            img_src = img.get('src') or img.get('data-src') or img.get('data-lazy-src', '')
            if not img_src:
                return None
            
            # Construct full image URL
            if img_src.startswith('//'):
                img_url = 'https:' + img_src
            elif img_src.startswith('/'):
                img_url = self.BASE_URL + img_src
            else:
                img_url = urljoin(self.BASE_URL, img_src)
            
            # Get contributor from alt text, title, or nearby text
            contributor = img.get('alt', '') or link.get('title', '')
            
            # Try to find license/copyright info
            copyright_text = ""
            parent = link.find_parent(['div', 'article', 'figure'])
            if parent:
                copyright_elem = parent.find(string=re.compile(r'copyright|license|©|CC', re.I))
                if copyright_elem:
                    copyright_text = copyright_elem.strip()
            
            # Calculate quality score
            quality_score = self._calculate_quality_score_from_link(link, img)
            
            return {
                'url': img_url,
                'link': page_url,
                'contributor': contributor,
                'copyright': copyright_text,
                'title': '',
                'source': 'observation',
                'quality_score': quality_score
            }
        except Exception as e:
            logger.debug(f"Error extracting photo from link: {e}")
            return None
    
    def _extract_photo_from_container(self, img, container) -> Optional[Dict]:
        """Extract photo information from a container with an image."""
        try:
            img_src = img.get('src') or img.get('data-src') or img.get('data-lazy-src', '')
            if not img_src:
                return None
            
            # Construct full image URL
            if img_src.startswith('//'):
                img_url = 'https:' + img_src
            elif img_src.startswith('/'):
                img_url = self.BASE_URL + img_src
            else:
                img_url = urljoin(self.BASE_URL, img_src)
            
            # Get page link
            link = container.find('a', href=True) or img.find_parent('a', href=True)
            page_url = None
            if link:
                href = link.get('href', '')
                if href.startswith('//'):
                    page_url = 'https:' + href
                elif href.startswith('/'):
                    page_url = self.BASE_URL + href
                else:
                    page_url = href
            
            # Get contributor
            contributor = img.get('alt', '') or ''
            
            # Get copyright
            copyright_elem = container.find(string=re.compile(r'copyright|license|©|CC', re.I))
            copyright_text = copyright_elem.strip() if copyright_elem else ""
            
            # Calculate quality score
            quality_score = self._calculate_quality_score(img, container)
            
            return {
                'url': img_url,
                'link': page_url,
                'contributor': contributor,
                'copyright': copyright_text,
                'title': '',
                'source': 'observation',
                'quality_score': quality_score
            }
        except Exception as e:
            logger.debug(f"Error extracting photo from container: {e}")
            return None
    
    def _calculate_quality_score(self, img, container) -> float:
        """Calculate quality score for Observation.org image."""
        score = 0.5  # Base score
        
        # Has link (more complete)
        if container and container.find('a', href=True):
            score += 0.2
        
        # Has contributor info
        alt_text = img.get('alt', '')
        if alt_text:
            score += 0.2
        
        # Has copyright info
        if container:
            copyright_elem = container.find(string=re.compile(r'copyright|license|©|CC', re.I))
            if copyright_elem:
                score += 0.2
        
        # Prefer larger images (check for size indicators in URL or attributes)
        img_src = img.get('src', '')
        if 'large' in img_src.lower() or 'original' in img_src.lower():
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_quality_score_from_link(self, link, img) -> float:
        """Calculate quality score for Observation.org image from a link."""
        score = 0.5  # Base score
        
        # Has href (more complete)
        if link.get('href'):
            score += 0.2
        
        # Has contributor info
        alt_text = img.get('alt', '') or link.get('title', '')
        if alt_text:
            score += 0.2
        
        # Prefer larger images
        img_src = img.get('src', '')
        if 'large' in img_src.lower() or 'original' in img_src.lower():
            score += 0.1
        
        return min(1.0, score)

