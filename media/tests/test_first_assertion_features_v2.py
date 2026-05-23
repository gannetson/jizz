from __future__ import annotations

from io import BytesIO

import numpy as np
from django.test import SimpleTestCase
from PIL import Image, ImageDraw, ImageFilter

from media.first_assertion.feature_extraction.base import ExtractorInput
from media.first_assertion.feature_extraction.handcrafted_v2 import HandcraftedV2Extractor, HandcraftedV2YoloExtractor


def _png_bytes(im: Image.Image) -> bytes:
    buf = BytesIO()
    im.save(buf, format='PNG')
    return buf.getvalue()


class HandcraftedV2FeatureVectorTestCase(SimpleTestCase):
    def setUp(self):
        self.ext = HandcraftedV2Extractor()
        self.names = self.ext.feature_names()
        self.idx = {n: i for i, n in enumerate(self.names)}

    def test_feature_names_unique_and_vector_length_matches(self):
        self.assertEqual(len(self.names), len(set(self.names)))
        im = Image.new('RGB', (128, 96), (128, 128, 128))
        vec = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(im), url='https://x/y.jpg', file_size_bytes=123))
        self.assertEqual(vec.shape, (len(self.names),))
        self.assertTrue(np.all(np.isfinite(vec)))

    def test_alpha_flag(self):
        im = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
        vec = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(im), url='https://x/y.png'))
        self.assertEqual(vec[self.idx['has_alpha']], 1.0)

    def test_blur_score_orders_sharp_higher_than_blurred(self):
        base = Image.new('RGB', (256, 256), (255, 255, 255))
        d = ImageDraw.Draw(base)
        for x in range(0, 256, 8):
            d.line([(x, 0), (x, 255)], fill=(0, 0, 0), width=2)
        sharp = base
        blurred = base.filter(ImageFilter.GaussianBlur(radius=3))
        v_sharp = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(sharp), url='https://x/sharp.jpg'))
        v_blur = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(blurred), url='https://x/blur.jpg'))
        self.assertGreater(v_sharp[self.idx['blur_lap_var_log1p']], v_blur[self.idx['blur_lap_var_log1p']])

    def test_entropy_and_edges_higher_for_noise_than_solid(self):
        solid = Image.new('RGB', (256, 256), (127, 127, 127))
        rng = np.random.default_rng(0)
        noise_arr = (rng.integers(0, 256, size=(256, 256, 3))).astype(np.uint8)
        noise = Image.fromarray(noise_arr, mode='RGB')
        v_solid = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(solid), url='https://x/solid.jpg'))
        v_noise = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(noise), url='https://x/noise.jpg'))
        self.assertGreater(v_noise[self.idx['entropy']], v_solid[self.idx['entropy']])
        self.assertGreater(v_noise[self.idx['edge_density']], v_solid[self.idx['edge_density']])

    def test_text_logo_score_higher_for_line_art_than_noise(self):
        canvas = Image.new('RGB', (256, 256), (255, 255, 255))
        d = ImageDraw.Draw(canvas)
        d.rectangle([20, 40, 236, 80], outline=(0, 0, 0), width=3)
        d.text((30, 45), 'BIRD', fill=(0, 0, 0))
        line_art = canvas

        rng = np.random.default_rng(1)
        noise_arr = (rng.integers(0, 256, size=(256, 256, 3))).astype(np.uint8)
        noise = Image.fromarray(noise_arr, mode='RGB')

        v_line = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(line_art), url='https://x/logo.png'))
        v_noise = self.ext.extract(ExtractorInput(image_bytes=_png_bytes(noise), url='https://x/noise.jpg'))
        self.assertGreater(v_line[self.idx['text_logo_score']], v_noise[self.idx['text_logo_score']])


class HandcraftedV2YoloVectorTestCase(SimpleTestCase):
    def test_yolo_vector_length_stable_without_model(self):
        ext = HandcraftedV2YoloExtractor()
        names = ext.feature_names()
        self.assertIn('yolo_bird_max_conf', names)
        im = Image.new('RGB', (64, 64), (128, 128, 128))
        vec = ext.extract(ExtractorInput(image_bytes=_png_bytes(im), url='https://x/bird.jpg'))
        self.assertEqual(vec.shape, (len(names),))

