"""
Management command to generate species comparisons using AI.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from jizz.models import Species
from compare.models import SpeciesComparison, SpeciesTrait
from compare.ai_service import AIComparisonService


class Command(BaseCommand):
    help = 'Generate species comparisons using AI'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--species-1-id',
            type=int,
            help='ID of the first species'
        )
        parser.add_argument(
            '--species-2-id',
            type=int,
            help='ID of the second species'
        )
        parser.add_argument(
            '--species-1-code',
            type=str,
            help='Code of the first species'
        )
        parser.add_argument(
            '--species-2-code',
            type=str,
            help='Code of the second species'
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration even if comparison exists'
        )
    
    def handle(self, *args, **options):
        # Get species
        if options['species_1_id']:
            species_1 = Species.objects.get(id=options['species_1_id'])
        elif options['species_1_code']:
            species_1 = Species.objects.get(code=options['species_1_code'])
        else:
            self.stdout.write(self.style.ERROR('Please provide --species-1-id or --species-1-code'))
            return
        
        if options['species_2_id']:
            species_2 = Species.objects.get(id=options['species_2_id'])
        elif options['species_2_code']:
            species_2 = Species.objects.get(code=options['species_2_code'])
        else:
            self.stdout.write(self.style.ERROR('Please provide --species-2-id or --species-2-code'))
            return
        
        # Check if comparison exists
        if not options['force']:
            existing = SpeciesComparison.objects.filter(
                comparison_type='species',
                species_1=species_1,
                species_2=species_2
            ).first()
            
            if existing:
                self.stdout.write(
                    self.style.WARNING(
                        f'Comparison already exists for {species_1.name} vs {species_2.name}. '
                        'Use --force to regenerate.'
                    )
                )
                return
        
        # Get traits
        self.stdout.write(f'Fetching traits for {species_1.name}...')
        traits_1 = self._get_species_traits(species_1)
        
        self.stdout.write(f'Fetching traits for {species_2.name}...')
        traits_2 = self._get_species_traits(species_2)
        
        if not traits_1:
            self.stdout.write(
                self.style.WARNING(
                    f'No traits found for {species_1.name}. '
                    'Please scrape species data first using scrape_species command.'
                )
            )
            return
        
        if not traits_2:
            self.stdout.write(
                self.style.WARNING(
                    f'No traits found for {species_2.name}. '
                    'Please scrape species data first using scrape_species command.'
                )
            )
            return
        
        # Generate comparison
        self.stdout.write('Generating comparison using AI...')
        ai_service = AIComparisonService()
        
        try:
            comparison_data = ai_service.generate_species_comparison(
                traits_1, traits_2, species_1.name, species_2.name
            )
            
            # Create or update comparison
            comparison, created = SpeciesComparison.objects.update_or_create(
                comparison_type='species',
                species_1=species_1,
                species_2=species_2,
                defaults=comparison_data
            )
            
            action = 'created' if created else 'updated'
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully {action} comparison for {species_1.name} vs {species_2.name}'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generating comparison: {e}')
            )
    
    def _get_species_traits(self, species: Species) -> dict:
        """Get traits for a species, organized by category."""
        traits = SpeciesTrait.objects.filter(species=species)
        
        result = {}
        for trait in traits:
            if trait.category not in result:
                result[trait.category] = []
            result[trait.category].append({
                'title': trait.title,
                'content': trait.content
            })
        
        # Convert to format expected by AI service
        formatted = {}
        for category, trait_list in result.items():
            formatted[category] = {
                'title': category.replace('_', ' ').title(),
                'content': '\n\n'.join([t['content'] for t in trait_list])
            }
        
        return formatted

