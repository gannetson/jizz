from unittest.mock import patch

from django.test import TestCase, override_settings

from jizz.ip_geo import (
    enrich_ip_rows,
    format_ip_location,
    lookup_ip_country_mmdb,
    lookup_ip_location,
    lookup_ip_locations,
    mmdb_available,
    refresh_ip_geo_cache,
)
from jizz.models import IpGeoCache


class IpGeoTests(TestCase):
    def setUp(self):
        IpGeoCache.objects.all().delete()

    def test_private_ip_labelled_local_and_cached(self):
        location = lookup_ip_location('127.0.0.1')
        self.assertEqual(location['country_name'], 'Private/local')
        self.assertEqual(format_ip_location(location), 'Private/local')
        self.assertTrue(IpGeoCache.objects.filter(ip_address='127.0.0.1', is_private=True).exists())

        with patch('jizz.ip_geo._resolve_ip_location_live') as mock_live:
            cached = lookup_ip_location('127.0.0.1')
        self.assertEqual(cached['country_name'], 'Private/local')
        mock_live.assert_not_called()

    @patch('jizz.ip_geo._lookup_via_mmdb')
    def test_lookup_ip_country_mmdb_never_calls_api(self, mock_mmdb):
        mock_mmdb.return_value = {'country_code': 'NL', 'country_name': 'Netherlands', 'city': ''}
        lookup_ip_country_mmdb.cache_clear()
        with patch('jizz.ip_geo._lookup_via_ip_api') as mock_api:
            location = lookup_ip_country_mmdb('84.85.68.210')
        self.assertEqual(location['country_code'], 'NL')
        mock_api.assert_not_called()

    @patch('jizz.ip_geo._lookup_via_ip_api')
    @patch('jizz.ip_geo._lookup_via_mmdb')
    def test_public_ip_uses_mmdb_then_api_and_persists(self, mock_mmdb, mock_api):
        mock_mmdb.return_value = {}
        mock_api.return_value = {
            'country_code': 'US',
            'country_name': 'United States',
            'city': 'Ashburn',
        }
        location = lookup_ip_location('8.8.8.8')
        self.assertEqual(location['country_code'], 'US')
        self.assertEqual(format_ip_location(location), 'Ashburn, United States')
        mock_mmdb.assert_called_once_with('8.8.8.8')
        mock_api.assert_called_once_with('8.8.8.8')

        mock_mmdb.reset_mock()
        mock_api.reset_mock()
        with patch('jizz.ip_geo._lookup_via_mmdb') as mock_mmdb_cached, patch(
            'jizz.ip_geo._lookup_via_ip_api'
        ) as mock_api_cached:
            cached = lookup_ip_location('8.8.8.8')
        self.assertEqual(cached['country_code'], 'US')
        mock_mmdb_cached.assert_not_called()
        mock_api_cached.assert_not_called()

    def test_db_cache_used_without_live_lookup(self):
        IpGeoCache.objects.create(
            ip_address='84.85.68.210',
            country_code='NL',
            country_name='Netherlands',
            city='Buren',
        )
        with patch('jizz.ip_geo._resolve_ip_location_live') as mock_live:
            location = lookup_ip_location('84.85.68.210')
        self.assertEqual(location['country_code'], 'NL')
        self.assertEqual(location['city'], 'Buren')
        mock_live.assert_not_called()

    @patch('jizz.ip_geo._lookup_via_ip_api')
    @patch('jizz.ip_geo._lookup_via_mmdb')
    def test_refresh_ip_geo_cache_overwrites_stale_entry(self, mock_mmdb, mock_api):
        IpGeoCache.objects.create(
            ip_address='84.85.68.210',
            country_code='XX',
            country_name='Wrong',
            city='Nowhere',
        )
        mock_mmdb.return_value = {}
        mock_api.return_value = {
            'country_code': 'NL',
            'country_name': 'Netherlands',
            'city': 'Buren',
        }
        location = refresh_ip_geo_cache('84.85.68.210')
        self.assertEqual(location['country_code'], 'NL')
        row = IpGeoCache.objects.get(ip_address='84.85.68.210')
        self.assertEqual(row.country_code, 'NL')
        self.assertEqual(row.city, 'Buren')

    def test_lookup_ip_locations_bulk_loads_cache(self):
        IpGeoCache.objects.create(
            ip_address='84.85.68.210',
            country_code='NL',
            country_name='Netherlands',
            city='',
        )
        with patch('jizz.ip_geo._resolve_ip_location_live') as mock_live:
            locations = lookup_ip_locations(['84.85.68.210', '139.178.131.76'])
        self.assertEqual(locations['84.85.68.210']['country_code'], 'NL')
        mock_live.assert_called_once_with('139.178.131.76')

    @patch('jizz.ip_geo.lookup_ip_locations')
    def test_enrich_ip_rows(self, mock_lookup):
        mock_lookup.return_value = {
            '198.51.100.1': {
                'country_code': 'DE',
                'country_name': 'Germany',
                'city': 'Berlin',
            },
        }
        rows = enrich_ip_rows([{'ip_address': '198.51.100.1', 'events': 3}])
        self.assertEqual(rows[0]['geo_country_code'], 'DE')
        self.assertEqual(rows[0]['geo_label'], 'Berlin, Germany')

    @override_settings(GEOIP_COUNTRY_DB='/nonexistent/path.mmdb')
    def test_missing_mmdb_does_not_crash(self):
        with patch('jizz.ip_geo._lookup_via_ip_api', return_value={}):
            location = lookup_ip_location('8.8.8.8')
        self.assertEqual(location, {})

    @override_settings(GEOIP_COUNTRY_DB='/nonexistent/path.mmdb')
    def test_mmdb_available_false_when_db_missing(self):
        import jizz.ip_geo as ip_geo_module

        ip_geo_module._geo_reader = None
        ip_geo_module._geo_reader_failed = False
        self.assertFalse(mmdb_available())
