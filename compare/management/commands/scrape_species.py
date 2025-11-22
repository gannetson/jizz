"""
Management command to scrape species data from Birds of the World.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from jizz.models import Species
from compare.models import SpeciesTrait
from compare.scraper import BirdsOfTheWorldScraper


class Command(BaseCommand):
    help = 'Scrape species data from Birds of the World website'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--species-id',
            type=int,
            help='ID of the species to scrape'
        )
        parser.add_argument(
            '--species-code',
            type=str,
            help='Code of the species to scrape (e.g., bkpwar)'
        )
        parser.add_argument(
            '--url',
            type=str,
            help='Full URL to scrape (optional)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Scrape all species (use with caution!)'
        )
        parser.add_argument(
            '--update',
            action='store_true',
            help='Update existing traits instead of skipping'
        )
    
    def handle(self, *args, **options):
        scraper = BirdsOfTheWorldScraper()
        
        if options['all']:
            self.stdout.write(self.style.WARNING('Scraping all species. This may take a long time...'))
            species_list = Species.objects.all()
            total = species_list.count()
            
            for idx, species in enumerate(species_list, 1):
                self.stdout.write(f'[{idx}/{total}] Scraping {species.name} ({species.code})...')
                self._scrape_species(scraper, species, options['update'], options.get('url'))
        else:
            if options['species_id']:
                species = Species.objects.get(id=options['species_id'])
            elif options['species_code']:
                species = Species.objects.get(code=options['species_code'])
            else:
                self.stdout.write(self.style.ERROR('Please provide --species-id or --species-code'))
                return
            
            self._scrape_species(scraper, species, options['update'])
    
    def _scrape_species(self, scraper: BirdsOfTheWorldScraper, species: Species, update: bool, url: str = None):
        """Scrape a single species."""
        try:
            scraped_data = scraper.scrape_species(
                species.code,
                url=url,
                species_name=species.name,
                scientific_name=species.name_latin
            )
            
            if not scraped_data or 'traits' not in scraped_data:
                self.stdout.write(
                    self.style.WARNING(f'No data found for {species.name}')
                )
                return
            
            traits_created = 0
            traits_updated = 0
            
            with transaction.atomic():
                for category, trait_data in scraped_data['traits'].items():
                    trait, created = SpeciesTrait.objects.get_or_create(
                        species=species,
                        category=category,
                        title=trait_data['title'],
                        defaults={
                            'content': trait_data['content'],
                            'source_url': scraped_data.get('source_url'),
                            'section': trait_data.get('section')
                        }
                    )
                    
                    if created:
                        traits_created += 1
                    elif update:
                        trait.content = trait_data['content']
                        trait.source_url = scraped_data.get('source_url')
                        trait.section = trait_data.get('section')
                        trait.save()
                        traits_updated += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully scraped {species.name}: '
                    f'{traits_created} traits created, {traits_updated} traits updated'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error scraping {species.name}: {e}')
            )

