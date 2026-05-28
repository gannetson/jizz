from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from jizz.services.checklist import ChecklistParams, build_checklist
from jizz.views import _set_no_cache_headers


class ChecklistView(APIView):
    """GET /api/checklist/ — species checklist for the user's preferred country."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            page = int(request.query_params.get('page', 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(request.query_params.get('page_size', 50))
        except (TypeError, ValueError):
            page_size = 50

        language = request.query_params.get('language', '').strip()
        if not language:
            try:
                language = request.user.profile.language or 'en'
            except Exception:
                language = 'en'

        params = ChecklistParams(
            country_code=request.query_params.get('country_code'),
            status=request.query_params.get('status', 'all') or 'all',
            tax_order=request.query_params.get('tax_order') or None,
            sort=request.query_params.get('sort', 'recent') or 'recent',
            search=request.query_params.get('search') or None,
            page=page,
            page_size=page_size,
            source=request.query_params.get('source', 'all_games') or 'all_games',
            language=language,
        )

        if params.status not in ('all', 'identified', 'missed', 'unseen', 'very_rare'):
            return Response(
                {'detail': 'Invalid status filter.'},
                status=400,
            )
        if params.sort not in ('recent', 'species', 'name', 'rarity'):
            return Response(
                {'detail': 'Invalid sort.'},
                status=400,
            )

        result = build_checklist(request.user, params, request=request)
        if result.get('error') == 'no_country':
            return Response(
                {
                    'detail': (
                        'No country selected. Set a preferred country on your profile '
                        'or pass country_code.'
                    ),
                },
                status=400,
            )

        response = Response(result)
        return _set_no_cache_headers(response)
