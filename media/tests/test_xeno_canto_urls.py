from django.test import SimpleTestCase

from media.xeno_canto_urls import (
    is_xeno_canto_download_url,
    is_xeno_canto_uploaded_mp3_url,
    xeno_canto_playback_url_from_recording,
    xeno_canto_recording_id,
)


WAV_RECORDING = {
    'id': '805373',
    'file': 'https://xeno-canto.org/805373/download',
    'file-name': 'XC805373-269078811.wav',
    'sono': {
        'small': 'https://xeno-canto.org/sounds/spectrograms/RCTJJHSQGO/805373/grey-small.png',
    },
}

SPACED_MP3_RECORDING = {
    'id': '272994',
    'file': 'https://xeno-canto.org/272994/download',
    'file-name': 'XC272994-Pale-legged QQ warbler song AA 1.mp3',
    'sono': {
        'small': 'https://xeno-canto.org/sounds/spectrograms/OOECIWCSWV/272994/grey-small.png',
    },
}


class XenoCantoUrlTests(SimpleTestCase):
    def test_recording_id_from_download_or_page(self):
        self.assertEqual(
            xeno_canto_recording_id('https://xeno-canto.org/805373/download'),
            '805373',
        )
        self.assertEqual(
            xeno_canto_recording_id(None, 'https://www.xeno-canto.org/805373'),
            '805373',
        )

    def test_download_vs_uploaded_mp3(self):
        self.assertTrue(is_xeno_canto_download_url('https://xeno-canto.org/805373/download'))
        self.assertFalse(
            is_xeno_canto_download_url(
                'https://xeno-canto.org/sounds/uploaded/RCTJJHSQGO/XC805373-269078811.mp3'
            )
        )
        self.assertTrue(
            is_xeno_canto_uploaded_mp3_url(
                'https://xeno-canto.org/sounds/uploaded/RCTJJHSQGO/XC805373-269078811.mp3'
            )
        )

    def test_wav_original_becomes_mp3(self):
        self.assertEqual(
            xeno_canto_playback_url_from_recording(WAV_RECORDING),
            'https://xeno-canto.org/sounds/uploaded/RCTJJHSQGO/XC805373-269078811.mp3',
        )

    def test_encodes_spaces_in_file_name(self):
        self.assertEqual(
            xeno_canto_playback_url_from_recording(SPACED_MP3_RECORDING),
            'https://xeno-canto.org/sounds/uploaded/OOECIWCSWV/'
            'XC272994-Pale-legged%20QQ%20warbler%20song%20AA%201.mp3',
        )

    def test_keeps_uploaded_mp3_file_field(self):
        rec = {
            'file': 'https://xeno-canto.org/sounds/uploaded/ABC/already.mp3',
            'file-name': 'other.wav',
            'sono': {'small': 'https://xeno-canto.org/sounds/spectrograms/ZZZ/1/grey-small.png'},
        }
        self.assertEqual(
            xeno_canto_playback_url_from_recording(rec),
            'https://xeno-canto.org/sounds/uploaded/ABC/already.mp3',
        )

    def test_falls_back_to_download_without_sono(self):
        rec = {
            'file': 'https://xeno-canto.org/1/download',
            'file-name': 'clip.wav',
        }
        self.assertEqual(
            xeno_canto_playback_url_from_recording(rec),
            'https://xeno-canto.org/1/download',
        )
