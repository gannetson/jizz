"""
YouTube Creative Commons scraper for videos.
Note: Requires YouTube Data API v3 key
"""
from typing import List, Dict, Optional
from .base import BaseMediaScraper
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class YouTubeScraper(BaseMediaScraper):
    """Scraper for YouTube Creative Commons videos."""
    
    API_BASE = "https://www.googleapis.com/youtube/v3"
    
    def __init__(self, rate_limit_delay: float = 0.1):
        """Initialize with faster rate limit."""
        super().__init__(rate_limit_delay)
        self.api_key = getattr(settings, 'YOUTUBE_API_KEY', None)
        if not self.api_key:
            logger.warning("YOUTUBE_API_KEY not set. YouTube scraping will not work.")
    
    def search_species(self, scientific_name: str, common_name: str = None) -> List[Dict]:
        """
        Search YouTube for Creative Commons videos.
        
        Args:
            scientific_name: Scientific name
            common_name: Common name (optional)
        
        Returns:
            List of video media items
        """
        results = []
        
        if not self.api_key:
            return results
        
        # Normalize scientific name
        normalized_name = self.normalize_scientific_name(scientific_name)
        
        # Build search query
        search_query = normalized_name
        if common_name:
            search_query += f" {common_name}"
        search_query += " bird"  # Add "bird" to narrow results
        
        page_token = None
        max_results = 50  # YouTube allows up to 50 per page
        
        for _ in range(5):  # Limit to 5 pages (250 videos max)
            params = {
                'part': 'snippet',
                'q': search_query,
                'type': 'video',
                'videoLicense': 'creativeCommon',  # Only Creative Commons
                'maxResults': max_results,
                'key': self.api_key,
                'order': 'relevance'
            }
            
            if page_token:
                params['pageToken'] = page_token
            
            data = self._fetch_json(f"{self.API_BASE}/search", params)
            
            if not data or 'items' not in data:
                break
            
            videos = data.get('items', [])
            if not videos:
                break
            
            # Get video details to get embed URLs
            video_ids = [video['id']['videoId'] for video in videos if 'id' in video and 'videoId' in video['id']]
            
            if video_ids:
                details_params = {
                    'part': 'snippet,contentDetails',
                    'id': ','.join(video_ids),
                    'key': self.api_key
                }
                
                details_data = self._fetch_json(f"{self.API_BASE}/videos", details_params)
                
                if details_data and 'items' in details_data:
                    for video in details_data['items']:
                        try:
                            video_id = video['id']
                            snippet = video.get('snippet', {})
                            
                            # YouTube embed URL (we'll use this as the "url")
                            embed_url = f"https://www.youtube.com/embed/{video_id}"
                            
                            # Page URL
                            page_url = f"https://www.youtube.com/watch?v={video_id}"
                            
                            # Get channel/contributor
                            channel_title = snippet.get('channelTitle', '')
                            
                            # YouTube Creative Commons videos have license info
                            copyright_text = "License: Creative Commons Attribution"
                            
                            # Get title
                            title = snippet.get('title', '')
                            
                            # Calculate quality score
                            quality_score = self._calculate_quality_score(video, snippet)
                            
                            results.append({
                                'url': embed_url,  # Embed URL for playback
                                'link': page_url,
                                'contributor': channel_title,
                                'copyright_text': copyright_text,
                                'title': title,
                                'source': 'youtube',
                                'quality_score': quality_score
                            })
                        except Exception as e:
                            logger.error(f"Error processing YouTube video: {e}")
                            continue
            
            # Check for next page
            page_token = data.get('nextPageToken')
            if not page_token:
                break
        
        # Sort by quality score (highest first)
        results.sort(key=lambda x: x.get('quality_score', 0), reverse=True)
        
        logger.info(f"Found {len(results)} YouTube videos for {scientific_name}")
        return results
    
    def _calculate_quality_score(self, video: Dict, snippet: Dict) -> float:
        """Calculate quality score for YouTube video."""
        score = 0.5  # Base score
        
        # Video duration (longer videos often more informative)
        duration = video.get('contentDetails', {}).get('duration', '')
        if duration:
            # Parse ISO 8601 duration (PT1M30S)
            try:
                import re
                hours = re.search(r'(\d+)H', duration)
                minutes = re.search(r'(\d+)M', duration)
                seconds = re.search(r'(\d+)S', duration)
                total_seconds = 0
                if hours:
                    total_seconds += int(hours.group(1)) * 3600
                if minutes:
                    total_seconds += int(minutes.group(1)) * 60
                if seconds:
                    total_seconds += int(seconds.group(1))
                
                if total_seconds > 60:
                    score += 0.1
                if total_seconds > 180:
                    score += 0.1
            except:
                pass
        
        # Has description (more complete)
        if snippet.get('description'):
            score += 0.1
        
        # Has channel (better attribution)
        if snippet.get('channelTitle'):
            score += 0.1
        
        return min(1.0, score)

