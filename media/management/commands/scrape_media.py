"""
Management command to scrape media for species from various platforms.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from jizz.models import Species
from media.models import Media
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


class Command(BaseCommand):
    help = 'Scrape media (image, video, audio) for species from various platforms'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--species-id',
            type=int,
            help='ID of a specific species to scrape'
        )
        parser.add_argument(
            '--species-code',
            type=str,
            help='Code of a specific species to scrape (e.g., bkpwar)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Scrape all species (use with caution - this will take a very long time!)'
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='Limit number of species to process (default: 10)'
        )
        parser.add_argument(
            '--skip-existing',
            action='store_true',
            help='Skip species that already have media'
        )
        parser.add_argument(
            '--sources',
            type=str,
            nargs='+',
            choices=['xeno_canto', 'inaturalist', 'wikimedia', 'gbif', 'flickr', 'eol', 'observation', 'youtube'],
            help='Specific sources to scrape (default: all)'
        )
        parser.add_argument(
            '--media-types',
            type=str,
            nargs='+',
            choices=['image', 'video', 'audio'],
            help='Media types to scrape (default: all)'
        )
    
    def handle(self, *args, **options):
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
        
        # Determine which sources to use
        sources_to_use = options.get('sources') or list(scrapers.keys())
        media_types = options.get('media_types') or ['image', 'video', 'audio']
        
        # Get species to process
        if options.get('species_id'):
            species_list = Species.objects.filter(id=options['species_id'])
        elif options.get('species_code'):
            species_list = Species.objects.filter(code=options['species_code'])
        elif options.get('all'):
            species_list = Species.objects.all()
        else:
            species_list = Species.objects.all()[:options.get('limit', 10)]
        
        total_species = species_list.count()
        self.stdout.write(self.style.SUCCESS(f'Processing {total_species} species...'))
        
        processed = 0
        skipped = 0
        errors = 0
        
        for species in species_list:
            processed += 1
            self.stdout.write(f'\n[{processed}/{total_species}] Processing {species.name} ({species.name_latin})...')
            
            # Skip if already has media and --skip-existing
            if options.get('skip_existing'):
                # Single query to get all existing media types for this species
                existing_types = set(
                    Media.objects.filter(species=species, type__in=media_types)
                    .values_list('type', flat=True)
                    .distinct()
                )
                
                # Check if any requested media type already exists
                if existing_types:
                    self.stdout.write(self.style.WARNING(
                        f'  Skipping {species.name} - already has {", ".join(existing_types)}'
                    ))
                    skipped += 1
                    continue
            
            try:
                # Scrape audio
                if 'audio' in media_types and 'xeno_canto' in sources_to_use:
                    self._scrape_audio(species, scrapers['xeno_canto'])
                
                # Scrape image
                if 'image' in media_types:
                    if 'inaturalist' in sources_to_use:
                        self._scrape_image(species, scrapers['inaturalist'], 'inaturalist')
                    if 'wikimedia' in sources_to_use:
                        self._scrape_image(species, scrapers['wikimedia'], 'wikimedia')
                    if 'gbif' in sources_to_use:
                        self._scrape_image(species, scrapers['gbif'], 'gbif')
                    if 'flickr' in sources_to_use:
                        self._scrape_image(species, scrapers['flickr'], 'flickr')
                    if 'eol' in sources_to_use:
                        self._scrape_image(species, scrapers['eol'], 'eol')
                    if 'observation' in sources_to_use:
                        self._scrape_image(species, scrapers['observation'], 'observation')
                
                # Scrape video
                if 'video' in media_types:
                    if 'wikimedia' in sources_to_use:
                        self._scrape_video(species, scrapers['wikimedia'], 'wikimedia')
                    if 'inaturalist' in sources_to_use:
                        self._scrape_video(species, scrapers['inaturalist'], 'inaturalist')
                    if 'youtube' in sources_to_use:
                        self._scrape_video(species, scrapers['youtube'], 'youtube')
                    if 'eol' in sources_to_use:
                        self._scrape_video(species, scrapers['eol'], 'eol')
            
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  Error processing {species.name}: {e}'))
                logger.exception(f"Error processing species {species.id}: {e}")
                errors += 1
                continue
        
        self.stdout.write(self.style.SUCCESS(
            f'\n\nCompleted! Processed: {processed}, Skipped: {skipped}, Errors: {errors}'
        ))
    
    def _scrape_audio(self, species, scraper):
        """Scrape audio for a species."""
        self.stdout.write(f'  Scraping audio from {scraper.__class__.__name__}...')
        
        media_items = scraper.search_species(species.name_latin, species.name)
        
        created_count = 0
        for item in media_items:
            # Check if already exists (by URL)
            if Media.objects.filter(species=species, url=item.get('url'), type='audio').exists():
                continue
            
            Media.objects.create(
                species=species,
                type='audio',
                source='xeno_canto',
                contributor=safe_truncate(item.get('contributor'), 500),
                copyright_text=safe_truncate(item.get('copyright_text'), 500),
                url=item.get('url'),
                link=item.get('link'),
            )
            created_count += 1
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'    Created {created_count} audio record(s)'))
    
    def _scrape_image(self, species, scraper, source):
        """Scrape image for a species."""
        self.stdout.write(f'  Scraping image from {scraper.__class__.__name__}...')
        
        if isinstance(scraper, iNaturalistScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='photos')
        elif isinstance(scraper, WikimediaScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='images')
        elif isinstance(scraper, EOLScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='images')
        else:
            media_items = scraper.search_species(species.name_latin, species.name)
        
        created_count = 0
        print(f"{len(media_items)} plaatjes found")
        for item in media_items:
            # Check if already exists (by URL)
            if Media.objects.filter(species=species, url=item.get('url'), source=source, type='image').exists():
                continue
            if 'sounds' in item.get('link'):
                continue

            Media.objects.create(
                species=species,
                type='image',
                source=source,
                contributor=safe_truncate(item.get('contributor'), 500),
                copyright_text=safe_truncate(item.get('copyright_text'), 500),
                url=item.get('url'),
                link=item.get('link'),
            )
            created_count += 1
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'    Created {created_count} image record(s)'))
    
    def _scrape_video(self, species, scraper, source):
        """Scrape video for a species."""
        self.stdout.write(f'  Scraping video from {scraper.__class__.__name__}...')
        
        if isinstance(scraper, iNaturalistScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='videos')
        elif isinstance(scraper, WikimediaScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='videos')
        elif isinstance(scraper, EOLScraper):
            media_items = scraper.search_species(species.name_latin, species.name, media_type='videos')
        else:
            media_items = scraper.search_species(species.name_latin, species.name)
        
        created_count = 0
        for item in media_items:
            # Check if already exists (by URL)
            if Media.objects.filter(species=species, link=item.get('link'), source=source, type='video').exists():
                continue
            
            Media.objects.create(
                species=species,
                type='video',
                source=source,
                contributor=safe_truncate(item.get('contributor'), 500),
                copyright_text=safe_truncate(item.get('copyright_text'), 500),
                url=item.get('url'),
                link=item.get('link')
            )
            created_count += 1
        
        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'    Created {created_count} video record(s)'))

