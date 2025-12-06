"""
Xeno-Canto scraper for bird audio recordings.
API Documentation: https://xeno-canto.org/explore/api
"""
import re
from typing import List, Dict, Optional
from .base import BaseMediaScraper
import logging

logger = logging.getLogger(__name__)


class XenoCantoScraper(BaseMediaScraper):
    """Scraper for Xeno-Canto bird audio recordings."""
    
    API_BASE = "https://xeno-canto.org/api/2"
    
    def search_species(self, scientific_name: str, common_name: str = None) -> List[Dict]:
        """
        Search Xeno-Canto for audio recordings.
        
        Args:
            scientific_name: Scientific name (e.g., "Turdus merula")
            common_name: Common name (optional)
        
        Returns:
            List of audio media items
        """
        results = []
        
        # Normalize scientific name
        normalized_name = self.normalize_scientific_name(scientific_name)
        name_parts = normalized_name.split()
        
        # Build query - try different formats
        queries_to_try = []
        
        if len(name_parts) >= 2:
            # Full scientific name: "gen:Anser sp:cygnoides"
            queries_to_try.append(f'gen:{name_parts[0]} sp:{name_parts[1]}')
            # Also try with full name as single query
            queries_to_try.append(normalized_name)
        elif len(name_parts) == 1:
            # Only genus: "gen:Anser"
            queries_to_try.append(f'gen:{name_parts[0]}')
            queries_to_try.append(name_parts[0])
        else:
            # Fallback to full name
            queries_to_try.append(normalized_name)
        
        # Try each query format
        for query in queries_to_try:
            page = 1
            max_pages = 5  # Limit to first 5 pages (50 results per page = 250 max)
            
            while page <= max_pages:
                params = {
                    'query': query,
                    'page': page
                }
                
                data = self._fetch_json(f"{self.API_BASE}/recordings", params)
                
                # If we get a 404 or error, try next query format
                if data is None:
                    break
                
                if 'recordings' not in data:
                    # Check if it's an error response
                    if data.get('numRecordings') == 0:
                        # No results, but valid response - try next query
                        break
                    # Otherwise, might be error - try next query
                    break
            
                recordings = data.get('recordings', [])
                if not recordings:
                    # If we got results from this query, stop trying other queries
                    if results:
                        break
                    # Otherwise, try next query format
                    break
                
                for recording in recordings:
                    try:
                        # Get the file URL
                        file_url = recording.get('file', '')
                        if not file_url:
                            continue
                        
                        # Construct full URL if relative
                        if file_url.startswith('//'):
                            file_url = 'https:' + file_url
                        elif file_url.startswith('/'):
                            file_url = 'https://xeno-canto.org' + file_url
                        
                        # Get page URL
                        xc_id = recording.get('id', '')
                        page_url = f"https://xeno-canto.org/{xc_id}" if xc_id else None
                        
                        # Get contributor (recorder)
                        contributor = recording.get('rec', '') or recording.get('recordist', '')
                        
                        # Get license/copyright info
                        license_info = recording.get('lic', '')
                        copyright_text = f"License: {license_info}" if license_info else ""
                        
                        # Get additional metadata
                        country = recording.get('cnt', '')
                        location = recording.get('loc', '')
                        date = recording.get('date', '')
                        
                        title_parts = []
                        if country:
                            title_parts.append(country)
                        if location:
                            title_parts.append(location)
                        if date:
                            title_parts.append(date)
                        title = ', '.join(title_parts) if title_parts else None
                        
                        # Calculate quality score
                        quality_score = self._calculate_quality_score(recording)
                        
                        results.append({
                            'url': file_url,
                            'link': page_url,
                            'contributor': contributor,
                            'copyright_text': copyright_text,
                            'title': title,
                            'source': 'xeno_canto',
                            'quality_score': quality_score
                        })
                    except Exception as e:
                        logger.error(f"Error processing Xeno-Canto recording: {e}")
                        continue
            
                # Check if there are more pages
                num_pages = data.get('numPages', 1)
                if page >= num_pages:
                    break
                
                page += 1
            
            # If we got results, don't try other query formats
            if results:
                break
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} Xeno-Canto recordings for {scientific_name}")
        return results
    
    def _calculate_quality_score(self, recording: Dict) -> float:
        """Calculate quality score for Xeno-Canto recording."""
        score = 0.5  # Base score
        
        # Quality rating (if available)
        q = recording.get('q', '')
        if q == 'A':
            score += 0.3
        elif q == 'B':
            score += 0.2
        elif q == 'C':
            score += 0.1
        
        # Number of ratings (more ratings = more reliable)
        rating_count = recording.get('ratings', 0) or 0
        if rating_count > 0:
            score += min(0.1, rating_count * 0.01)
        
        # Length (longer recordings often better)
        length = recording.get('length', '')
        if length:
            try:
                # Parse "1:23" format
                parts = length.split(':')
                if len(parts) == 2:
                    minutes = int(parts[0])
                    seconds = int(parts[1])
                    total_seconds = minutes * 60 + seconds
                    if total_seconds > 30:
                        score += 0.1
            except:
                pass
        
        return min(1.0, score)

