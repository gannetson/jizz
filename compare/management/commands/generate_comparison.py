"""
Management command to generate species comparisons using AI.
"""
from django.core.management.base import BaseCommand
from jizz.models import Species
from compare.generation import get_or_create_species_comparison


class Command(BaseCommand):
    help = 'Generate species comparisons using AI'

    def add_arguments(self, parser):
        parser.add_argument('--species-1-id', type=int, help='ID of the first species')
        parser.add_argument('--species-2-id', type=int, help='ID of the second species')
        parser.add_argument('--species-1-code', type=str, help='Code of the first species')
        parser.add_argument('--species-2-code', type=str, help='Code of the second species')
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force regeneration even if comparison exists',
        )

    def handle(self, *args, **options):
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

        self.stdout.write(f'Generating comparison for {species_1.name} vs {species_2.name}...')
        comparison = get_or_create_species_comparison(
            species_1,
            species_2,
            force=options['force'],
        )
        if comparison is None:
            self.stdout.write(self.style.ERROR('Comparison was not generated.'))
            return
        self.stdout.write(
            self.style.SUCCESS(f'Ready: {comparison.species_1.name} vs {comparison.species_2.name}')
        )
