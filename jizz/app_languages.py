"""Supported app UI languages (BCP-47). Distinct from bird-name `UserProfile.language`."""

APP_LANGUAGES = frozenset({'en', 'nl', 'es', 'fr', 'de', 'pt-BR', 'ja'})


def normalize_app_language(value: str | None) -> str:
    """Return a supported app locale, or '' if unset/unknown."""
    raw = (value or '').strip()
    if not raw:
        return ''
    if raw in APP_LANGUAGES:
        return raw
    lower = raw.lower().replace('_', '-')
    if lower.startswith('pt'):
        return 'pt-BR'
    prefix = lower.split('-')[0]
    if prefix in APP_LANGUAGES:
        return prefix
    return ''
