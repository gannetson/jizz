"""Punch chroma-key cyan backgrounds from stylish still-life PNGs.

Source files are the cyan-backed generations in the Cursor assets folder.
Outputs overwrite app/public/images/stylish and mobile/assets/stylish.
"""
from __future__ import annotations

import shutil
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ASSETS = Path(
    '/Users/gannetson/.cursor/projects/Users-gannetson-Projects-jizz/assets'
)
WEB = Path('/Users/gannetson/Projects/jizz/app/public/images/stylish')
MOB = Path('/Users/gannetson/Projects/jizz/mobile/assets/stylish')
NAMES = [
    'waiting',
    'success',
    'failed',
    'stressed',
    'no-image',
    'start-game',
    'flock-invite',
    'leaderboard',
    'level0',
    'level1',
    'level2',
    'level3',
    'level4',
    'level5',
    'level6',
    'level7',
]


def chroma_cut(im: Image.Image) -> Image.Image:
    arr = np.array(im.convert('RGBA')).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    gb = (g + b) / 2.0
    chroma = (g + b) / (r + g + b + 1.0)
    is_cyan = ((g > r + 22) & (b > r + 22) & (gb > 70)) | (
        (chroma > 0.70) & (gb > 55)
    )
    grown = ndimage.binary_dilation(is_cyan, iterations=1)
    soft = (g > r + 8) & (b > r + 8)
    eaten = is_cyan | (grown & soft)

    alpha = np.where(eaten, 0.0, 255.0)
    dt = ndimage.distance_transform_edt(~eaten)
    feather = 1.6
    ring = (dt > 0) & (dt <= feather)
    alpha[ring] = 255.0 * (dt[ring] / feather)

    spill = np.maximum(0.0, np.minimum(g, b) - r)
    partial = alpha < 254
    rgb = arr[:, :, :3].copy()
    rgb[:, :, 1] = np.where(partial, np.clip(g - 0.9 * spill, 0, 255), g)
    rgb[:, :, 2] = np.where(partial, np.clip(b - 0.9 * spill, 0, 255), b)
    rgb[alpha < 1] = 0
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8))


def main() -> None:
    WEB.mkdir(parents=True, exist_ok=True)
    MOB.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        src = ASSETS / f'stylish-{name}-chroma.png'
        cut = chroma_cut(Image.open(src))
        dest_name = f'birdr-{name}.png'
        cut.save(WEB / dest_name, format='PNG', optimize=True)
        shutil.copy2(WEB / dest_name, MOB / dest_name)
        band = cut.split()[-1]
        hist = band.histogram()
        total = sum(hist) or 1
        print(
            f'{dest_name}: transparent={hist[0] / total * 100:.0f}%'
        )
    print('done')


if __name__ == '__main__':
    main()
