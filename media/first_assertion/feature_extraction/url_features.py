from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse


_TOKEN_PAT = re.compile(r'[^a-z0-9]+', re.IGNORECASE)


@dataclass(frozen=True)
class UrlSignals:
    ext: str
    tokens: set[str]


def parse_url_signals(url: Optional[str]) -> UrlSignals:
    if not url:
        return UrlSignals(ext='', tokens=set())

    try:
        p = urlparse(url)
        path = p.path or ''
    except Exception:
        path = url

    base = os.path.basename(path).lower()
    ext = ''
    if '.' in base:
        _name, ext = base.rsplit('.', 1)
        ext = ext.lower()

    toks = [t for t in _TOKEN_PAT.split(base.lower()) if t]
    return UrlSignals(ext=ext, tokens=set(toks))


def token_flag(signals: UrlSignals, *candidates: str) -> float:
    return 1.0 if any(c in signals.tokens for c in candidates) else 0.0


def ext_flag(signals: UrlSignals, ext: str) -> float:
    return 1.0 if signals.ext == ext.lower().lstrip('.') else 0.0

