"""Allowlisted HTML for marketing CMS bodies."""

from __future__ import annotations

import re
from html import escape, unescape
from html.parser import HTMLParser
from urllib.parse import urlparse

import markdown


ALLOWED_TAGS = {
    'p', 'br', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'u',
    'a', 'blockquote', 'img',
}
VOID_TAGS = {'br', 'img'}
ALLOWED_ATTRS = {
    'a': {'href'},
    'img': {'src', 'alt'},
}


def _safe_url(value: str) -> str | None:
    raw = (value or '').strip()
    if not raw:
        return None
    if raw.startswith('/') and not raw.startswith('//'):
        return raw
    parsed = urlparse(raw)
    if parsed.scheme in ('http', 'https') and parsed.netloc:
        return raw
    if parsed.scheme == 'mailto' and parsed.path:
        return raw
    return None


class _Sanitizer(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED_TAGS:
            return
        allowed = ALLOWED_ATTRS.get(tag, set())
        bits = []
        for name, value in attrs:
            if name not in allowed or value is None:
                continue
            if name in ('href', 'src'):
                value = _safe_url(value)
                if not value:
                    continue
            bits.append(f'{name}="{escape(value, quote=True)}"')
        attr = (' ' + ' '.join(bits)) if bits else ''
        if tag in VOID_TAGS:
            self.parts.append(f'<{tag}{attr}>')
        else:
            self.parts.append(f'<{tag}{attr}>')

    def handle_endtag(self, tag):
        if tag in ALLOWED_TAGS and tag not in VOID_TAGS:
            self.parts.append(f'</{tag}>')

    def handle_data(self, data):
        self.parts.append(escape(data, quote=False))

    def handle_entityref(self, name):
        self.parts.append(escape(unescape(f'&{name};'), quote=False))

    def handle_charref(self, name):
        self.parts.append(escape(unescape(f'&#{name};'), quote=False))


def sanitize_html(value: str) -> str:
    parser = _Sanitizer()
    parser.feed(value or '')
    parser.close()
    return ''.join(parser.parts).strip()


def markdown_to_safe_html(value: str) -> str:
    """Render comparison markdown to allowlisted HTML."""
    text = (value or '').strip()
    if not text:
        return ''
    html = markdown.markdown(text, extensions=['extra', 'nl2br'])
    return sanitize_html(html)


_TAG_RE = re.compile(r'<[^>]+>')


def html_plain_text(value: str, limit: int = 180) -> str:
    text = unescape(_TAG_RE.sub(' ', value or ''))
    text = ' '.join(text.replace('\xa0', ' ').split())
    if limit and len(text) > limit:
        return text[: limit - 1].rstrip() + '…'
    return text


def html_has_text(value: str) -> bool:
    text = unescape(_TAG_RE.sub('', value or ''))
    return bool(text.replace('\xa0', ' ').strip())


def to_safe_html(value: str) -> str:
    """Sanitize stored HTML, or render markdown from older plain-text fields."""
    text = (value or '').strip()
    if not text:
        return ''
    if text.startswith('<'):
        return sanitize_html(text)
    return markdown_to_safe_html(text)
