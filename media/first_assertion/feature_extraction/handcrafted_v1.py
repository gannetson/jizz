from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

from media.first_assertion.feature_extraction.base import (
    ExtractorInput,
    FeatureExtractor,
    UnreadableImageError,
    ensure_1d_float64,
)

RESIZE = (256, 256)
HIST_BINS = 16


class HandcraftedV1Extractor:
    features_version = 'handcrafted_v1'

    def feature_names(self) -> list[str]:
        names = [
            'log_w',
            'log_h',
            'aspect_ratio',
            'rgb_mean_r',
            'rgb_mean_g',
            'rgb_mean_b',
            'rgb_std_r',
            'rgb_std_g',
            'rgb_std_b',
            'gray_mean',
            'gray_std',
            'laplacian_var_log1p',
        ]
        names.extend([f'luma_hist_{i:02d}' for i in range(HIST_BINS)])
        return names

    def extract(self, inp: ExtractorInput) -> np.ndarray:
        try:
            im = Image.open(BytesIO(inp.image_bytes)).convert('RGB')
        except Exception as exc:  # Pillow raises many types
            raise UnreadableImageError(str(exc)) from exc

        w, h = im.size
        small = im.resize(RESIZE, Image.Resampling.LANCZOS)
        arr = np.asarray(small, dtype=np.float64) / 255.0
        rgb = arr.reshape(-1, 3)
        r_m, g_m, b_m = rgb.mean(axis=0)
        r_s, g_s, b_s = rgb.std(axis=0)

        gray = np.asarray(small.convert('L'), dtype=np.float64) / 255.0
        g_mean = float(gray.mean())
        g_std = float(gray.std())

        g64 = np.asarray(
            im.convert('L').resize((64, 64), Image.Resampling.LANCZOS),
            dtype=np.float64,
        )
        lap = (
            4 * g64[1:-1, 1:-1]
            - g64[:-2, 1:-1]
            - g64[2:, 1:-1]
            - g64[1:-1, :-2]
            - g64[1:-1, 2:]
        )
        lap_var = float(np.log1p(max(lap.var(), 1e-12)))

        hist, _ = np.histogram(gray.flatten(), bins=HIST_BINS, range=(0.0, 1.0), density=True)
        hist = hist.astype(np.float64)
        if hist.sum() > 0:
            hist = hist / hist.sum()

        ar = w / max(h, 1)
        head = np.array(
            [
                np.log1p(w),
                np.log1p(h),
                ar,
                r_m,
                g_m,
                b_m,
                r_s,
                g_s,
                b_s,
                g_mean,
                g_std,
                lap_var,
            ],
            dtype=np.float64,
        )
        vec = np.concatenate([head, hist])
        return ensure_1d_float64(vec)

