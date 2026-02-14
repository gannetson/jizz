# Media Scraping System - Implementation Summary

## Overview

A comprehensive media scraping system has been built for the Django `media` app. This system can scrape images, videos, and audio from 8 different platforms to populate a database for ~10,000 bird species.

## What Was Built

### 1. Models (`media/models.py`)
- **Image**: Stores images with source, contributor, copyright, and link
- **Video**: Stores videos with source, contributor, copyright, and link
- **Audio**: Stores audio with source, contributor, copyright, and link

All models include:
- `source` field to track which platform the media came from
- Foreign key to `jizz.Species`
- `contributor`, `copyright`, `link` fields for attribution
- Optional `media` file field (for future file downloads)

### 2. Scrapers (`media/scrapers/`)

#### Base Scraper (`base.py`)
- Abstract base class with rate limiting
- Session management with proper headers
- JSON and HTML fetching utilities
- Scientific name normalization

#### Platform-Specific Scrapers

**Audio:**
- `xeno_canto.py`: Xeno-Canto API for bird audio recordings

**Images:**
- `inaturalist.py`: iNaturalist API for citizen science observations
- `wikimedia.py`: Wikimedia Commons API for open-licensed images
- `gbif.py`: GBIF API for biodiversity data
- `flickr.py`: Flickr Creative Commons API (requires API key)
- `eol.py`: Encyclopedia of Life API
- `observation.py`: Observation.org web scraper

**Videos:**
- `wikimedia.py`: Wikimedia Commons videos
- `inaturalist.py`: iNaturalist video observations
- `youtube.py`: YouTube Creative Commons (requires API key)
- `eol.py`: EOL videos

### 3. Management Command (`media/management/commands/scrape_media.py`)

A comprehensive Django management command with options:
- `--species-id`: Scrape specific species by ID
- `--species-code`: Scrape specific species by code
- `--all`: Scrape all species (with warnings)
- `--limit`: Limit number of species to process
- `--skip-existing`: Skip species that already have media
- `--sources`: Specify which platforms to scrape
- `--media-types`: Specify which media types to scrape

### 4. Admin Interface (`media/admin.py`)

Django admin configured for all three models with:
- List displays including source
- Filtering by source, species, date
- Search functionality
- Raw ID fields for species

## Platform Details

### API-Based Scrapers (No Authentication Required)
- **Xeno-Canto**: Public API, no key needed
- **iNaturalist**: Public API, no key needed
- **Wikimedia Commons**: Public API, no key needed
- **GBIF**: Public API, no key needed
- **EOL**: Public API, no key needed

### API-Based Scrapers (Require API Keys)
- **Flickr**: Requires API key (free from flickr.com/services/api/)
- **YouTube**: Requires API key (free from Google Cloud Console)

### Web Scrapers
- **Observation.org**: HTML scraping (may need adjustments based on site structure)

## Usage Examples

### Test with a Single Species
```bash
python manage.py scrape_media --species-code bkpwar
```

### Scrape First 10 Species (All Media Types)
```bash
python manage.py scrape_media --limit 10
```

### Scrape Only Audio from Xeno-Canto
```bash
python manage.py scrape_media --all --sources xeno_canto --media-types audio
```

### Scrape Only Images from Multiple Sources
```bash
python manage.py scrape_media --all --sources inaturalist wikimedia gbif --media-types images
```

### Scrape All Species (Long Running!)
```bash
python manage.py scrape_media --all --skip-existing
```

## Setup Requirements

### 1. Run Migrations
```bash
python manage.py makemigrations media
python manage.py migrate
```

### 2. Optional: Add API Keys

For Flickr and YouTube, add to `jizz/settings/local.py`:
```python
FLICKR_API_KEY = 'your_key_here'
YOUTUBE_API_KEY = 'your_key_here'
```

Without API keys, those scrapers will skip (with warnings).

## Rate Limiting

All scrapers include built-in rate limiting:
- Default: 1 second between requests
- Faster platforms: 0.1 seconds (Flickr, YouTube)
- Adjustable per scraper

## Data Storage Strategy

Currently, the system stores:
- **Links**: URLs to original media pages (for attribution)
- **Metadata**: Contributor, copyright, source
- **File Field**: Empty by default (for future file downloads)

This approach:
- Respects platform terms of service
- Provides proper attribution
- Allows future file downloads if needed
- Keeps database size manageable

## Testing Strategy

### Phase 1: Single Species Test
```bash
python manage.py scrape_media --species-code bkpwar
```
Verify all scrapers work and data is stored correctly.

### Phase 2: Small Batch Test
```bash
python manage.py scrape_media --limit 50
```
Test with 50 species to check for rate limits and errors.

### Phase 3: Full Scrape
```bash
python manage.py scrape_media --all --skip-existing
```
Run for all ~10,000 species. This will take many hours/days.

### Phase 4: Incremental Updates
```bash
python manage.py scrape_media --all --skip-existing
```
Re-run periodically to get new media without duplicates.

## Error Handling

- Scrapers log errors but continue processing
- Duplicate detection prevents re-adding same media
- Rate limiting prevents API bans
- Individual species failures don't stop the process

## Performance Considerations

### Estimated Time for Full Scrape
- ~10,000 species
- ~8 sources per species
- ~1-2 seconds per source (with rate limiting)
- **Total: ~20-40 hours** (can run in background)

### Optimization Tips
1. Use `--skip-existing` to avoid re-scraping
2. Run different sources separately
3. Use `--limit` for testing
4. Monitor for rate limit errors

## Future Enhancements

1. **File Downloads**: Download and store actual media files
2. **Caching**: Cache API responses to avoid re-scraping
3. **Progress Tracking**: Save progress to resume interrupted scrapes
4. **Quality Filtering**: Filter by image quality, license type, etc.
5. **Admin Actions**: Add admin actions to scrape selected species
6. **Scheduled Tasks**: Set up cron jobs for periodic updates

## Notes

- Some platforms may have daily API quotas
- Web scrapers (Observation.org) may need adjustments if site structure changes
- Not all species will have media on all platforms (this is normal)
- The system is designed to be resilient and continue even if some sources fail

