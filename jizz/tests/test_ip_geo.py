from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from jizz.ip_geo import enrich_ip_rows, format_ip_location, lookup_ip_country_mmdb, lookup_ip_location, mmdb_available


class IpGeoTests(SimpleTestCase):
    def test_private_ip_labelled_local(self):
        location = lookup_ip_location('127.0.0.1')
        self.assertEqual(location['country_name'], 'Private/local')
        self.assertEqual(format_ip_location(location), 'Private/local')

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
    def test_public_ip_uses_mmdb_then_api(self, mock_mmdb, mock_api):
        mock_mmdb.return_value = {}
        mock_api.return_value = {
            'country_code': 'US',
            'country_name': 'United States',
            'city': 'Ashburn',
        }
        lookup_ip_location.cache_clear()
        location = lookup_ip_location('8.8.8.8')
        self.assertEqual(location['country_code'], 'US')
        self.assertEqual(format_ip_location(location), 'Ashburn, United States')
        mock_mmdb.assert_called_once_with('8.8.8.8')
        mock_api.assert_called_once_with('8.8.8.8')

    @patch('jizz.ip_geo.lookup_ip_location')
    def test_enrich_ip_rows(self, mock_lookup):
        mock_lookup.return_value = {
            'country_code': 'DE',
            'country_name': 'Germany',
            'city': 'Berlin',
        }
        rows = enrich_ip_rows([{'ip_address': '198.51.100.1', 'events': 3}])
        self.assertEqual(rows[0]['geo_country_code'], 'DE')
        self.assertEqual(rows[0]['geo_label'], 'Berlin, Germany')

    @override_settings(GEOIP_COUNTRY_DB='/nonexistent/path.mmdb')
    def test_missing_mmdb_does_not_crash(self):
        lookup_ip_location.cache_clear()
        with patch('jizz.ip_geo._lookup_via_ip_api', return_value={}):
            location = lookup_ip_location('8.8.8.8')
        self.assertEqual(location, {})

    @override_settings(GEOIP_COUNTRY_DB='/nonexistent/path.mmdb')
    def test_mmdb_available_false_when_db_missing(self):
        import jizz.ip_geo as ip_geo_module

        ip_geo_module._geo_reader = None
        ip_geo_module._geo_reader_failed = False
        self.assertFalse(mmdb_available())
