"""
API for Birdr Journey — solo level progression per country.
"""

from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from jizz.models import BirdrJourney, ChallengeLevel, Country
from jizz.serializers import BirdrJourneySerializer
from jizz.views import GetPlayerMixin

MAX_JOURNEY_SEQUENCE = 7


class BirdrJourneyView(APIView, GetPlayerMixin):
    """GET ?country_code=XX — load journey; POST { country_code } — get or create at sequence 0."""

    permission_classes = (AllowAny,)

    def _resolve_owner(self, request):
        if request.user and request.user.is_authenticated:
            return {'user': request.user, 'player': None}
        try:
            player = self.get_player_from_request(request)
        except AuthenticationFailed:
            raise AuthenticationFailed(
                'Authentication required. Log in or provide a valid player token.'
            )
        return {'user': None, 'player': player}

    def _get_country(self, country_code):
        if not country_code or not str(country_code).strip():
            raise ValidationError({'country_code': 'This field is required.'})
        code = str(country_code).strip().upper()
        try:
            return Country.objects.get(pk=code)
        except Country.DoesNotExist:
            raise ValidationError({'country_code': f'Unknown country: {code}'})

    def _journey_queryset(self, owner):
        qs = BirdrJourney.objects.select_related('country', 'user', 'player')
        if owner['user']:
            return qs.filter(user=owner['user'])
        return qs.filter(player=owner['player'])

    def _get_journey(self, owner, country):
        return self._journey_queryset(owner).filter(country=country).first()

    def get(self, request):
        owner = self._resolve_owner(request)
        country_code = request.query_params.get('country_code')
        country = self._get_country(country_code)
        journey = self._get_journey(owner, country)
        if not journey:
            raise Http404('No journey found for this country.')
        return Response(BirdrJourneySerializer(journey).data)

    def post(self, request):
        owner = self._resolve_owner(request)
        country_code = request.data.get('country_code')
        country = self._get_country(country_code)
        if owner['user']:
            journey, created = BirdrJourney.objects.get_or_create(
                user=owner['user'],
                country=country,
                defaults={'current_sequence': 0, 'player': None},
            )
        else:
            journey, created = BirdrJourney.objects.get_or_create(
                player=owner['player'],
                country=country,
                defaults={'current_sequence': 0, 'user': None},
            )
        serializer = BirdrJourneySerializer(journey)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


def build_roadmap(current_sequence):
    """Roadmap nodes 0..MAX_JOURNEY_SEQUENCE with status completed/current/locked."""
    roadmap = []
    for seq in range(MAX_JOURNEY_SEQUENCE + 1):
        if seq < current_sequence:
            node_status = 'completed'
        elif seq == current_sequence:
            node_status = 'current'
        else:
            node_status = 'locked'
        roadmap.append({'sequence': seq, 'status': node_status})
    return roadmap


def get_challenge_level_for_sequence(sequence):
    if sequence > MAX_JOURNEY_SEQUENCE:
        return None
    return ChallengeLevel.objects.filter(sequence=sequence).first()
