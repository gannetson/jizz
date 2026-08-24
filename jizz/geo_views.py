from __future__ import annotations

import re

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from jizz.ip_geo import lookup_ip_country_mmdb
from jizz.models import Country
from jizz.usage_analytics import get_client_ip

_COUNTRY_RE = re.compile(r'^[A-Z]{2}$')
_SKIP_CF_CODES = {'', 'XX', 'T1'}


def _normalize_country_code(raw: str | None) -> str:
    if not isinstance(raw, str):
        return ''
    code = raw.strip().upper()
    if code in _SKIP_CF_CODES or not _COUNTRY_RE.match(code):
        return ''
    return code


def _quiz_country_code(code: str) -> str | None:
    row = (
        Country.objects.filter(code__iexact=code)
        .exclude(countryspecies__isnull=True)
        .only('code')
        .first()
    )
    return row.code if row else None


def guessed_request_country_code(request) -> str | None:
    """Cloudflare header first, then local MaxMind. Never uses profile or ip-api."""
    code = _normalize_country_code(request.META.get('HTTP_CF_IPCOUNTRY'))
    if not code:
        ip = get_client_ip(request) or ''
        location = lookup_ip_country_mmdb(ip)
        code = _normalize_country_code((location or {}).get('country_code'))
    if not code:
        return None
    return _quiz_country_code(code)


class GeoCountryView(APIView):
    """Public IP country guess for quiz defaults. Profile is never consulted."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        response = Response({'country_code': guessed_request_country_code(request)})
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        return response
