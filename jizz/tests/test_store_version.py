from unittest.mock import patch

from django.test import SimpleTestCase

from jizz.store_version import clear_store_release_label_cache, get_store_release_labels


class StoreVersionTestCase(SimpleTestCase):
    def tearDown(self):
        clear_store_release_label_cache()

    @patch('jizz.store_version._fetch_play_release_label', return_value='Little Grebe')
    @patch('jizz.store_version._fetch_itunes_release_label', return_value='Little Grebe')
    def test_get_store_release_labels_caches_results(self, *_mocks):
        clear_store_release_label_cache()
        first = get_store_release_labels()
        second = get_store_release_labels()
        self.assertEqual(first, {'ios': 'Little Grebe', 'android': 'Little Grebe'})
        self.assertEqual(second, first)
        self.assertEqual(_mocks[0].call_count, 1)
        self.assertEqual(_mocks[1].call_count, 1)
