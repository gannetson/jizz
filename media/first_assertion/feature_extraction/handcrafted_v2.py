"""
Handcrafted image features from bytes + optional URL signals (handcrafted_v2).

Vector layout (fixed-length; see `feature_names()` for exact order):

Quality
- log_w, log_h, aspect_ratio
- log_file_size (0 if unknown)
- brightness_mean, brightness_std, contrast
- saturation_mean, saturation_std
- blur_lap_var_log1p
- overexposed_ratio, underexposed_ratio
- low_color_score, edge_density

Composition
- center_brightness_mean, center_blur_lap_var_log1p
- center_edge_density, center_edge_ratio
- border_uniformity_score, entropy

Rubbish proxies
- illustration_score
- text_logo_score
- has_alpha
- empty_like_score

URL/domain signals (binary)
- ext_{jpg,png,webp,gif,svg}
- token_{egg,eggs,nest,feather,wing,butterfly,moth,insect,bee,wasp,dragonfly}
- token_{mammal,deer,fox,dog,cat}
- token_{plant,flower,leaf}
- token_{map,logo,icon,svg,text,diagram,chart,graph,drawing,illustration,cartoon}
"""

from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
from typing import Optional, Tuple

import numpy as np
from PIL import Image

from media.first_assertion.feature_extraction.base import (
    ExtractorInput,
    UnreadableImageError,
    ensure_1d_float64,
)
from media.first_assertion.feature_extraction.url_features import ext_flag, parse_url_signals, token_flag
from media.first_assertion.feature_extraction.yolo import yolo_bird_features


def _to_working_rgb_and_gray(
    image_bytes: bytes,
    *,
    max_side: int = 512,
) -> Tuple[np.ndarray, np.ndarray, int, int, bool]:
    """
    Returns: (rgb_u8[H,W,3], gray_u8[H,W], orig_w, orig_h, has_alpha)
    """
    try:
        im = Image.open(BytesIO(image_bytes))
    except Exception as exc:
        raise UnreadableImageError(str(exc)) from exc

    has_alpha = (im.mode in ('RGBA', 'LA')) or ('transparency' in (im.info or {}))
    orig_w, orig_h = im.size

    # Convert first so resize is deterministic across modes.
    if im.mode not in ('RGB', 'RGBA'):
        try:
            im = im.convert('RGBA' if has_alpha else 'RGB')
        except Exception:
            im = im.convert('RGB')

    # Downscale for speed and stability (keep aspect).
    w, h = im.size
    scale = min(1.0, float(max_side) / float(max(w, h, 1)))
    if scale < 1.0:
        im = im.resize((max(1, int(round(w * scale))), max(1, int(round(h * scale)))), Image.Resampling.LANCZOS)

    # Composite alpha on white for feature stability.
    if im.mode == 'RGBA':
        bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(bg, im).convert('RGB')
    else:
        im = im.convert('RGB')

    rgb = np.asarray(im, dtype=np.uint8)
    gray = np.asarray(im.convert('L'), dtype=np.uint8)
    return rgb, gray, orig_w, orig_h, has_alpha


def _entropy_u8(gray: np.ndarray) -> float:
    hist = np.bincount(gray.reshape(-1), minlength=256).astype(np.float64)
    p = hist / max(hist.sum(), 1.0)
    p = p[p > 0]
    ent = -np.sum(p * np.log2(p))
    # Normalize by max entropy log2(256)=8 so range is ~[0,1]
    return float(ent / 8.0)


def _safe_ratio(num: float, den: float) -> float:
    return float(num / den) if den > 1e-12 else 0.0


@dataclass(frozen=True)
class _Cv:
    cv2: object


def _cv() -> _Cv:
    # Keep OpenCV import local so non-v2 paths don't import it.
    import cv2  # type: ignore

    return _Cv(cv2=cv2)


class HandcraftedV2Extractor:
    features_version = 'handcrafted_v2'

    def feature_names(self) -> list[str]:
        names = [
            # quality
            'log_w',
            'log_h',
            'aspect_ratio',
            'log_file_size',
            'brightness_mean',
            'brightness_std',
            'contrast',
            'saturation_mean',
            'saturation_std',
            'blur_lap_var_log1p',
            'overexposed_ratio',
            'underexposed_ratio',
            'low_color_score',
            'edge_density',
            # composition
            'center_brightness_mean',
            'center_blur_lap_var_log1p',
            'center_edge_density',
            'center_edge_ratio',
            'border_uniformity_score',
            'entropy',
            # rubbish proxies
            'illustration_score',
            'text_logo_score',
            'has_alpha',
            'empty_like_score',
            # ext flags
            'ext_jpg',
            'ext_png',
            'ext_webp',
            'ext_gif',
            'ext_svg',
            # subject-ish tokens
            'tok_egg',
            'tok_eggs',
            'tok_nest',
            'tok_feather',
            'tok_wing',
            'tok_butterfly',
            'tok_moth',
            'tok_insect',
            'tok_bee',
            'tok_wasp',
            'tok_dragonfly',
            'tok_mammal',
            'tok_deer',
            'tok_fox',
            'tok_dog',
            'tok_cat',
            'tok_plant',
            'tok_flower',
            'tok_leaf',
            # non-photo-ish tokens
            'tok_map',
            'tok_logo',
            'tok_icon',
            'tok_svg',
            'tok_text',
            'tok_diagram',
            'tok_chart',
            'tok_graph',
            'tok_drawing',
            'tok_illustration',
            'tok_cartoon',
        ]
        return names

    def extract(self, inp: ExtractorInput) -> np.ndarray:
        rgb_u8, gray_u8, orig_w, orig_h, has_alpha = _to_working_rgb_and_gray(inp.image_bytes)
        h, w = gray_u8.shape[:2]
        ar = float(orig_w) / float(max(orig_h, 1))

        # Normalize to [0,1] floats
        gray = gray_u8.astype(np.float64) / 255.0
        rgb = rgb_u8.astype(np.float64) / 255.0

        brightness_mean = float(gray.mean())
        brightness_std = float(gray.std())
        contrast = brightness_std

        # HSV saturation (OpenCV expects BGR)
        cv = _cv().cv2
        bgr = rgb_u8[:, :, ::-1]
        hsv = cv.cvtColor(bgr, cv.COLOR_BGR2HSV)
        sat = hsv[:, :, 1].astype(np.float64) / 255.0
        saturation_mean = float(sat.mean())
        saturation_std = float(sat.std())

        # Blur: Laplacian variance on gray
        lap = cv.Laplacian(gray_u8, cv.CV_64F)
        blur_lap = float(np.log1p(max(float(lap.var()), 1e-12)))

        overexposed = float(np.mean(gray >= 0.98))
        underexposed = float(np.mean(gray <= 0.02))

        # Low-color score: near-gray pixels ratio (max-min per pixel small)
        rgb_range = (rgb.max(axis=2) - rgb.min(axis=2))
        low_color_score = float(np.mean(rgb_range <= 0.04))

        # Edge density via Canny on gray
        edges = cv.Canny(gray_u8, 60, 180)
        edge_density = float(np.mean(edges > 0))

        # Center crop stats
        cy0, cy1 = int(0.25 * h), int(0.75 * h)
        cx0, cx1 = int(0.25 * w), int(0.75 * w)
        center_gray_u8 = gray_u8[cy0:cy1, cx0:cx1]
        center_gray = center_gray_u8.astype(np.float64) / 255.0
        center_brightness_mean = float(center_gray.mean()) if center_gray.size else 0.0
        center_lap = cv.Laplacian(center_gray_u8, cv.CV_64F)
        center_blur_lap = float(np.log1p(max(float(center_lap.var()), 1e-12))) if center_gray_u8.size else 0.0
        center_edges = cv.Canny(center_gray_u8, 60, 180) if center_gray_u8.size else np.zeros((1, 1), dtype=np.uint8)
        center_edge_density = float(np.mean(center_edges > 0)) if center_gray_u8.size else 0.0

        # Saliency proxy: center edge density relative to borders
        border_mask = np.ones((h, w), dtype=bool)
        border_mask[cy0:cy1, cx0:cx1] = False
        border_edge_density = float(np.mean((edges > 0)[border_mask])) if border_mask.any() else 0.0
        center_edge_ratio = _safe_ratio(center_edge_density, border_edge_density + 1e-6)

        # Border uniformity: borders are often background; low variance implies uniform background
        border_gray = gray[border_mask] if border_mask.any() else gray.reshape(-1)
        border_var = float(np.var(border_gray)) if border_gray.size else 0.0
        border_uniformity_score = float(np.exp(-10.0 * border_var))

        entropy = _entropy_u8(gray_u8)

        # Rubbish proxies
        # Illustration: low texture + low entropy + lots of low-color pixels
        illustration_score = float(
            0.5 * low_color_score
            + 0.3 * (1.0 - entropy)
            + 0.2 * (1.0 - min(1.0, edge_density * 4.0))
        )

        # Text/logo/map: high edges + low entropy/texture tends to happen for line art
        text_logo_score = float(
            min(1.0, edge_density * 3.0) * 0.6
            + (1.0 - entropy) * 0.2
            + low_color_score * 0.2
        )

        # Empty-ish: very uniform + low edges (blank, border-only, etc.)
        empty_like_score = float(border_uniformity_score * (1.0 - min(1.0, edge_density * 5.0)))

        # URL signals
        signals = parse_url_signals(inp.url)

        ext_jpg = float(ext_flag(signals, 'jpg') or ext_flag(signals, 'jpeg'))
        ext_png = float(ext_flag(signals, 'png'))
        ext_webp = float(ext_flag(signals, 'webp'))
        ext_gif = float(ext_flag(signals, 'gif'))
        ext_svg = float(ext_flag(signals, 'svg'))

        # tokens
        tok = lambda *c: float(token_flag(signals, *c))

        # file size: prefer passed file_size_bytes; else 0
        fs = inp.file_size_bytes
        log_file_size = float(np.log1p(fs)) if fs is not None and fs >= 0 else 0.0

        vec = np.array(
            [
                np.log1p(orig_w),
                np.log1p(orig_h),
                ar,
                log_file_size,
                brightness_mean,
                brightness_std,
                contrast,
                saturation_mean,
                saturation_std,
                blur_lap,
                overexposed,
                underexposed,
                low_color_score,
                edge_density,
                center_brightness_mean,
                center_blur_lap,
                center_edge_density,
                center_edge_ratio,
                border_uniformity_score,
                entropy,
                illustration_score,
                text_logo_score,
                1.0 if has_alpha else 0.0,
                empty_like_score,
                ext_jpg,
                ext_png,
                ext_webp,
                ext_gif,
                ext_svg,
                tok('egg'),
                tok('eggs'),
                tok('nest'),
                tok('feather'),
                tok('wing'),
                tok('butterfly'),
                tok('moth'),
                tok('insect', 'insects'),
                tok('bee', 'bees'),
                tok('wasp', 'wasps'),
                tok('dragonfly', 'dragonflies'),
                tok('mammal', 'mammals'),
                tok('deer'),
                tok('fox'),
                tok('dog', 'dogs'),
                tok('cat', 'cats'),
                tok('plant', 'plants'),
                tok('flower', 'flowers'),
                tok('leaf', 'leaves'),
                tok('map', 'maps'),
                tok('logo', 'logos'),
                tok('icon', 'icons'),
                tok('svg'),
                tok('text'),
                tok('diagram'),
                tok('chart', 'charts'),
                tok('graph', 'graphs'),
                tok('drawing', 'drawings'),
                tok('illustration', 'illustrations'),
                tok('cartoon', 'cartoons'),
            ],
            dtype=np.float64,
        )
        return ensure_1d_float64(vec)


class HandcraftedV2YoloExtractor(HandcraftedV2Extractor):
    """
    Same as handcrafted_v2, plus YOLO bird detector summary features.

    YOLO runs offline during train/infer only; if no ONNX model is configured,
    YOLO features are zeros (vector stays stable).
    """

    features_version = 'handcrafted_v2_yolo'

    def feature_names(self) -> list[str]:
        base = super().feature_names()
        return base + [
            'yolo_bird_max_conf',
            'yolo_bird_num_boxes',
            'yolo_bird_max_area_ratio',
        ]

    def extract(self, inp: ExtractorInput) -> np.ndarray:
        base_vec = super().extract(inp)
        # We need RGB bytes again; re-decode cheaply from the already handled bytes.
        rgb_u8, _gray_u8, _ow, _oh, _has_alpha = _to_working_rgb_and_gray(inp.image_bytes)
        y = yolo_bird_features(rgb_u8)
        extra = np.array([y.bird_max_conf, float(y.bird_num_boxes), y.bird_max_area_ratio], dtype=np.float64)
        return ensure_1d_float64(np.concatenate([base_vec, extra]))

