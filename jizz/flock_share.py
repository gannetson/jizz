"""Generate Open Graph share cards for flock challenge leaderboards."""

from __future__ import annotations

import io
from datetime import timedelta
from pathlib import Path
from typing import Sequence

from django.conf import settings
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont


OG_WIDTH = 1200
OG_HEIGHT = 630

# Birdr primary / birdr palette (app/src/theme.ts)
BIRDR_50 = '#f5ede0'
BIRDR_100 = '#e8d4b8'
BIRDR_200 = '#d4b88a'
BIRDR_500 = '#8b6419'
BIRDR_600 = '#6d4e14'
BIRDR_800 = '#31220a'


def _font(size: int, *, bold: bool = False) -> ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ]
        )
    else:
        candidates.extend(
            [
                '/System/Library/Fonts/Supplemental/Arial.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            ]
        )
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _leaderboard_art_path() -> Path | None:
    # settings.BASE_DIR is the inner `jizz/` package directory.
    package_dir = Path(settings.BASE_DIR)
    project_root = package_dir.parent
    candidates = [
        project_root / 'app' / 'public' / 'images' / 'birdr-leaderboard.png',
        project_root / 'mobile' / 'assets' / 'birdr-leaderboard.png',
        project_root / 'mobile' / 'public' / 'images' / 'birdr-leaderboard.png',
        package_dir / 'static' / 'images' / 'birdr-leaderboard.png',
        project_root / 'static' / 'images' / 'birdr-leaderboard.png',
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def _load_leaderboard_art(max_size: tuple[int, int] = (280, 280)) -> Image.Image | None:
    path = _leaderboard_art_path()
    if not path:
        return None
    try:
        art = Image.open(path).convert('RGBA')
        art.thumbnail(max_size, Image.Resampling.LANCZOS)
        return art
    except Exception:
        return None


def _load_logo(flock) -> Image.Image | None:
    if not flock.logo:
        return None
    try:
        img = Image.open(flock.logo.path).convert('RGBA')
        img.thumbnail((120, 120), Image.Resampling.LANCZOS)
        return img
    except Exception:
        return None


def _countdown_label(ends_at) -> str:
    now = timezone.now()
    if ends_at is None or ends_at <= now:
        return 'Ended'
    remaining = ends_at - now
    if remaining > timedelta(days=1):
        days = remaining.days
        hours = remaining.seconds // 3600
        return f'{days}d {hours:02d}h left'
    total_sec = int(remaining.total_seconds())
    hours = total_sec // 3600
    mins = (total_sec % 3600) // 60
    return f'{hours:02d}:{mins:02d} left'


def render_challenge_og_image(
    *,
    flock,
    challenge,
    top_entries: Sequence[dict],
    participant_count: int,
) -> bytes:
    """Return PNG bytes for a 1200×630 flock challenge leaderboard card."""
    img = Image.new('RGB', (OG_WIDTH, OG_HEIGHT), BIRDR_50)
    draw = ImageDraw.Draw(img)

    # Soft brand panels
    draw.rectangle((0, 0, OG_WIDTH, 210), fill=BIRDR_100)
    draw.rounded_rectangle((48, 248, OG_WIDTH - 48, 540), radius=24, fill='#ffffff')
    draw.rounded_rectangle(
        (48, 248, OG_WIDTH - 48, 540),
        radius=24,
        outline=BIRDR_200,
        width=3,
    )

    brand = _font(28, bold=True)
    title = _font(50, bold=True)
    countdown_font = _font(64, bold=True)
    subtitle = _font(30)
    row_font = _font(32, bold=True)
    meta = _font(26)

    draw.text((56, 28), 'BIRDR', fill=BIRDR_500, font=brand)

    art = _load_leaderboard_art((220, 220))
    logo = _load_logo(flock)
    text_x = 56
    header_y = 78

    if art:
        ax = OG_WIDTH - art.width - 56
        ay = max(24, (210 - art.height) // 2)
        base = img.convert('RGBA')
        base.paste(art, (ax, ay), art)
        img = base.convert('RGB')
        draw = ImageDraw.Draw(img)

    if logo:
        lx, ly = 56, header_y
        plate = Image.new('RGBA', (logo.width + 16, logo.height + 16), (255, 255, 255, 240))
        base = img.convert('RGBA')
        base.paste(plate, (lx - 8, ly - 8), plate)
        base.paste(logo, (lx, ly), logo)
        img = base.convert('RGB')
        draw = ImageDraw.Draw(img)
        text_x = lx + logo.width + 24

    name = (flock.name or 'Flock')[:36]
    draw.text((text_x, header_y + 18), name, fill=BIRDR_800, font=title)

    countdown = _countdown_label(getattr(challenge, 'ends_at', None))
    bbox = draw.textbbox((0, 0), countdown, font=countdown_font)
    cw = bbox[2] - bbox[0]
    # Keep countdown clear of the art on the right
    max_right = OG_WIDTH - (art.width + 80 if art else 56)
    cx = min(max(56, (OG_WIDTH - cw) // 2), max(56, max_right - cw))
    draw.text((cx, 155), countdown, fill=BIRDR_500, font=countdown_font)

    y = 278
    if top_entries:
        for entry in top_entries[:5]:
            rank = entry.get('rank', '')
            display = (entry.get('display_name') or 'Player')[:28]
            score = entry.get('score_label') or ''
            left = f'#{rank}  {display}'
            draw.text((80, y), left, fill=BIRDR_800, font=row_font)
            bbox = draw.textbbox((0, 0), score, font=row_font)
            sw = bbox[2] - bbox[0]
            draw.text((OG_WIDTH - 80 - sw, y), score, fill=BIRDR_500, font=row_font)
            y += 42
    else:
        draw.text(
            (80, y + 40),
            'No scores yet — be the first to play!',
            fill=BIRDR_600,
            font=subtitle,
        )

    footer = 'Join the challenge on Birdr'
    if participant_count:
        footer = f'{participant_count} played · {footer}'
    draw.text((56, OG_HEIGHT - 62), footer, fill=BIRDR_600, font=meta)

    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
