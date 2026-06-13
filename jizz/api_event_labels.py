from __future__ import annotations

import re

# (url_name, HTTP method) -> dashboard label
API_EVENT_LABELS: dict[tuple[str, str], str] = {
    ('answer-create', 'POST'): 'Question answered',
    ('game-list', 'POST'): 'Game created',
    ('player-create', 'POST'): 'Player created',
    ('player-link', 'POST'): 'Player linked to account',
    ('player-load', 'GET'): 'Player profile loaded',
    ('player-stats', 'GET'): 'Player stats viewed',
    ('birdr-journey-start-step', 'POST'): 'Journey step started',
    ('birdr-journey-complete-step', 'POST'): 'Journey step completed',
    ('birdr-journey-advance-level', 'POST'): 'Journey level advanced',
    ('birdr-journey', 'GET'): 'Journey list viewed',
    ('birdr-journey-detail', 'GET'): 'Journey detail viewed',
    ('checklist', 'GET'): 'Checklist viewed',
    ('checklist', 'PATCH'): 'Checklist updated',
    ('checklist', 'PUT'): 'Checklist updated',
    ('feedback', 'POST'): 'Feedback submitted',
    ('register', 'POST'): 'Account registered',
    ('google-login', 'POST'): 'Logged in (Google)',
    ('apple-login', 'POST'): 'Logged in (Apple)',
    ('profile', 'GET'): 'Profile viewed',
    ('profile', 'PATCH'): 'Profile updated',
    ('profile', 'PUT'): 'Profile updated',
    ('user-games', 'GET'): 'My games viewed',
    ('user-game-detail', 'GET'): 'Game detail viewed',
    ('game-detail', 'GET'): 'Game viewed',
    ('game-detail-with-answers', 'GET'): 'Game review viewed',
    ('scores', 'GET'): 'High scores viewed',
    ('review-media-create', 'POST'): 'Media reviewed',
    ('review-media-first-assertion', 'POST'): 'First assertion reviewed',
    ('flag-media-create', 'POST'): 'Media flagged',
    ('media-review-species', 'GET'): 'Media review list viewed',
    ('species-review-stats', 'GET'): 'Species review stats viewed',
    ('updates', 'GET'): 'Updates viewed',
    ('reactions', 'POST'): 'Update reaction submitted',
    ('password-reset-request', 'POST'): 'Password reset requested',
    ('password-reset-confirm', 'POST'): 'Password reset completed',
    ('daily-challenge-list-create', 'POST'): 'Daily challenge created',
    ('daily-challenge-list-create', 'GET'): 'Daily challenges listed',
    ('daily-challenge-detail', 'GET'): 'Daily challenge viewed',
    ('daily-challenge-invite', 'POST'): 'Daily challenge invite sent',
    ('daily-challenge-accept', 'POST'): 'Daily challenge accepted',
    ('daily-challenge-accept-by-token', 'POST'): 'Daily challenge accepted (link)',
    ('daily-challenge-accept-by-token-get', 'GET'): 'Daily challenge invite opened',
    ('daily-challenge-decline', 'POST'): 'Daily challenge declined',
    ('daily-challenge-start', 'POST'): 'Daily challenge started',
    ('daily-challenge-round', 'GET'): 'Daily challenge round viewed',
    ('friends-list', 'GET'): 'Friends list viewed',
    ('friends-requests', 'GET'): 'Friend requests viewed',
    ('friends-request', 'POST'): 'Friend request sent',
    ('friends-accept', 'POST'): 'Friend request accepted',
    ('friends-decline', 'POST'): 'Friend request declined',
    ('device-token-create', 'POST'): 'Push device registered',
    ('device-token-delete', 'DELETE'): 'Push device removed',
    ('mobile-push-register', 'POST'): 'Mobile push registered',
    ('family-list', 'GET'): 'Taxonomic families listed',
    ('order-list', 'GET'): 'Taxonomic orders listed',
}

# Never log — high-volume, internal, or recursive
API_SKIP_URL_NAMES: frozenset[str] = frozenset({
    'analytics-event',
    'app-version',
    'species-list',
    'species-detail',
    'species-cover',
    'language-list',
    'countries',
    'country-detail',
    'media-list',
    'page-list',
    'page-detail',
    'game-question-detail',
    'question-detail',
    'question-next-media',
    'question-media-ready',
    'answer-detail',
    'token-obtain-pair',
    'token-refresh',
})

WEBSOCKET_EVENT_LABELS: dict[str, str] = {
    'join_game': 'Joined game lobby',
    'start_game': 'Game started',
    'next_question': 'Next question',
    'submit_answer': 'Question answered',
    'rematch': 'Rematch created',
    'end_game': 'Game ended',
}

_URL_NAME_RE = re.compile(r'^[a-z0-9_-]+$')


def _humanize_url_name(url_name: str) -> str:
    return url_name.replace('-', ' ').replace('_', ' ').strip().title()


def resolve_api_event_label(url_name: str | None, method: str, path: str = '') -> str | None:
    """Return a dashboard label for this API call, or None to skip logging."""
    if path.startswith('/api/compare/'):
        return None
    if not url_name:
        return None
    if url_name in API_SKIP_URL_NAMES:
        return None

    key = (url_name, method.upper())
    if key in API_EVENT_LABELS:
        return API_EVENT_LABELS[key]

    if not _URL_NAME_RE.match(url_name):
        return None

    return f'API · {_humanize_url_name(url_name)}'


def resolve_websocket_event_label(action: str) -> str | None:
    return WEBSOCKET_EVENT_LABELS.get(action)
