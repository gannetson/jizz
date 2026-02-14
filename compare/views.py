from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import SpeciesTrait, SpeciesComparison, ComparisonRequest
from .serializers import (
    SpeciesTraitSerializer, SpeciesComparisonSerializer,
    ComparisonRequestSerializer, CreateComparisonRequestSerializer
)
from .ai_service import AIComparisonService
from .scraper import BirdsOfTheWorldScraper
from jizz.models import Species


class SpeciesTraitViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing species traits.
    """
    queryset = SpeciesTrait.objects.all()
    serializer_class = SpeciesTraitSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required
    
    def get_queryset(self):
        queryset = SpeciesTrait.objects.select_related('species')
        
        # Filter by species
        species_id = self.request.query_params.get('species_id', None)
        if species_id:
            queryset = queryset.filter(species_id=species_id)
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset


class SpeciesComparisonViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing species comparisons.
    """
    queryset = SpeciesComparison.objects.all()
    serializer_class = SpeciesComparisonSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required
    
    def get_queryset(self):
        queryset = SpeciesComparison.objects.select_related('species_1', 'species_2')
        
        # Filter by species
        species_1_id = self.request.query_params.get('species_1_id', None)
        if species_1_id:
            queryset = queryset.filter(species_1_id=species_1_id)
        
        species_2_id = self.request.query_params.get('species_2_id', None)
        if species_2_id:
            queryset = queryset.filter(species_2_id=species_2_id)
        
        # Filter by comparison type
        comparison_type = self.request.query_params.get('comparison_type', None)
        if comparison_type:
            queryset = queryset.filter(comparison_type=comparison_type)
        
        return queryset


class ComparisonRequestView(APIView):
    """
    API endpoint for creating and retrieving comparison requests.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required
    
    def post(self, request):
        """
        Create a new comparison request.
        If a comparison already exists, return it. Otherwise, generate a new one.
        """
        serializer = CreateComparisonRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        comparison_type = data['comparison_type']
        
        # Check if comparison already exists
        existing_comparison = None
        if comparison_type == 'species':
            existing_comparison = SpeciesComparison.objects.filter(
                comparison_type='species',
                species_1_id=data['species_1_id'],
                species_2_id=data['species_2_id']
            ).first()
        elif comparison_type == 'family':
            existing_comparison = SpeciesComparison.objects.filter(
                comparison_type='family',
                family_1=data['family_1'],
                family_2=data['family_2']
            ).first()
        elif comparison_type == 'order':
            existing_comparison = SpeciesComparison.objects.filter(
                comparison_type='order',
                order_1=data['order_1'],
                order_2=data['order_2']
            ).first()
        
        if existing_comparison:
            # Return existing comparison
            return Response(
                SpeciesComparisonSerializer(existing_comparison).data,
                status=status.HTTP_200_OK
            )
        
        # Create new comparison request
        request_obj = ComparisonRequest.objects.create(
            comparison_type=comparison_type,
            species_1_id=data.get('species_1_id'),
            species_2_id=data.get('species_2_id'),
            family_1=data.get('family_1'),
            family_2=data.get('family_2'),
            order_1=data.get('order_1'),
            order_2=data.get('order_2'),
            requested_by=request.user if request.user.is_authenticated else None,
            status='processing'
        )
        
        # Generate comparison asynchronously (in production, use Celery)
        try:
            comparison = self._generate_comparison(data, comparison_type)
            request_obj.comparison = comparison
            request_obj.status = 'completed'
            request_obj.save()
            
            return Response(
                SpeciesComparisonSerializer(comparison).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            request_obj.status = 'failed'
            request_obj.error_message = str(e)
            request_obj.save()
            
            return Response(
                {'error': 'Failed to generate comparison', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_comparison(self, data: dict, comparison_type: str) -> SpeciesComparison:
        """Generate a comparison using AI."""
        from compare.scraper import BirdsOfTheWorldScraper
        from compare.models import SpeciesTrait
        from django.db import transaction
        
        ai_service = AIComparisonService()
        scraper = BirdsOfTheWorldScraper()
        
        if comparison_type == 'species':
            species_1 = get_object_or_404(Species, id=data['species_1_id'])
            species_2 = get_object_or_404(Species, id=data['species_2_id'])
            
            # Get traits for both species, scrape if needed
            traits_1 = self._get_species_traits(species_1)
            if not traits_1:
                # Scrape species 1
                scraped_data = scraper.scrape_species(
                    species_1.code,
                    species_name=species_1.name,
                    scientific_name=species_1.name_latin
                )
                if scraped_data and 'traits' in scraped_data:
                    with transaction.atomic():
                        for category, trait_data in scraped_data['traits'].items():
                            SpeciesTrait.objects.get_or_create(
                                species=species_1,
                                category=category,
                                title=trait_data['title'],
                                defaults={
                                    'content': trait_data['content'],
                                    'source_url': scraped_data.get('source_url'),
                                    'section': trait_data.get('section')
                                }
                            )
                    traits_1 = self._get_species_traits(species_1)
            
            traits_2 = self._get_species_traits(species_2)
            if not traits_2:
                # Scrape species 2
                scraped_data = scraper.scrape_species(
                    species_2.code,
                    species_name=species_2.name,
                    scientific_name=species_2.name_latin
                )
                if scraped_data and 'traits' in scraped_data:
                    with transaction.atomic():
                        for category, trait_data in scraped_data['traits'].items():
                            SpeciesTrait.objects.get_or_create(
                                species=species_2,
                                category=category,
                                title=trait_data['title'],
                                defaults={
                                    'content': trait_data['content'],
                                    'source_url': scraped_data.get('source_url'),
                                    'section': trait_data.get('section')
                                }
                            )
                    traits_2 = self._get_species_traits(species_2)
            
            # Check if we have traits after scraping
            if not traits_1:
                raise ValueError(f"No traits found for {species_1.name} even after scraping")
            if not traits_2:
                raise ValueError(f"No traits found for {species_2.name} even after scraping")
            
            # Add scientific names for better name matching in Similar Species section
            traits_1['name_latin'] = species_1.name_latin
            traits_2['name_latin'] = species_2.name_latin
            
            # Generate comparison
            comparison_data = ai_service.generate_species_comparison(
                traits_1, traits_2, species_1.name, species_2.name
            )
            
            # Create comparison object
            comparison = SpeciesComparison.objects.create(
                comparison_type='species',
                species_1=species_1,
                species_2=species_2,
                **comparison_data
            )
            
            return comparison
        
        elif comparison_type == 'family':
            # For family comparisons, we'd need to aggregate species data
            # This is a simplified version
            comparison_data = ai_service.generate_family_comparison(
                data['family_1'], data['family_2'], [], []
            )
            
            comparison = SpeciesComparison.objects.create(
                comparison_type='family',
                family_1=data['family_1'],
                family_2=data['family_2'],
                **comparison_data
            )
            
            return comparison
        
        else:
            raise ValueError(f"Unsupported comparison type: {comparison_type}")
    
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
    
    def get(self, request):
        """List comparison requests."""
        requests = ComparisonRequest.objects.filter(
            requested_by=request.user if request.user.is_authenticated else None
        ).order_by('-requested_at')[:20]
        
        serializer = ComparisonRequestSerializer(requests, many=True)
        return Response(serializer.data)


class ScrapeSpeciesView(APIView):
    """
    API endpoint for scraping species data from Birds of the World.
    """
    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication required
    
    def post(self, request):
        """Scrape species data."""
        species_id = request.data.get('species_id')
        species_code = request.data.get('species_code')
        url = request.data.get('url')
        
        if not species_id and not species_code:
            return Response(
                {'error': 'Either species_id or species_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get species
        if species_id:
            species = get_object_or_404(Species, id=species_id)
        else:
            species = get_object_or_404(Species, code=species_code)
        
        # Scrape data
        scraper = BirdsOfTheWorldScraper()
        scraped_data = scraper.scrape_species(
            species.code, 
            url=url,
            species_name=species.name,
            scientific_name=species.name_latin
        )
        
        if not scraped_data or 'traits' not in scraped_data:
            return Response(
                {'error': 'Failed to scrape data or no data found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Save traits
        created_traits = []
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
            if not created:
                # Update existing trait
                trait.content = trait_data['content']
                trait.source_url = scraped_data.get('source_url')
                trait.section = trait_data.get('section')
                trait.save()
            
            created_traits.append(trait)
        
        return Response({
            'species_id': species.id,
            'species_name': species.name,
            'traits_created': len(created_traits),
            'traits': SpeciesTraitSerializer(created_traits, many=True).data
        }, status=status.HTTP_201_CREATED)

