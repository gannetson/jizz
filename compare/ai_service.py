"""
AI service for generating species comparisons using OpenAI.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class ComparisonGenerationError(Exception):
    """Raised when a comparison cannot be generated."""


def _friendly_openai_error(exc: BaseException) -> str:
    text = str(exc).lower()
    if any(
        token in text
        for token in (
            'insufficient_quota',
            'credit_balance_exhausted',
            'credit_balance_exhausted',
            'no credits remaining',
            'you have no credits remaining',
            '429',
        )
    ):
        return (
            'The AI comparison service is out of credits right now. '
            'You can still write a better description if you are logged in.'
        )
    if 'rate limit' in text or '429' in text:
        return 'The AI comparison service is busy. Please try again in a moment.'
    return 'Could not generate the comparison. Please try again.'

PROMPT_VERSION = 'v2'
DEFAULT_MODEL = 'gpt-4o'

# First tokens that match too many unrelated passages in Birds of the World text.
_GENERIC_NAME_TOKENS = frozenset({
    'american', 'arctic', 'atlantic', 'black', 'blue', 'brown', 'common',
    'desert', 'eastern', 'eurasian', 'european', 'great', 'greater', 'green',
    'grey', 'gray', 'house', 'indian', 'lesser', 'little', 'long', 'marsh',
    'northern', 'pacific', 'red', 'reed', 'rock', 'sand', 'sea', 'short',
    'southern', 'steppe', 'tree', 'water', 'western', 'white', 'wood',
    'yellow',
})

_TRAIT_ORDER = (
    'identification',
    'similar_species',
    'measurements',
    'size',
    'plumage',
    'vocalization',
    'habitat',
    'behavior',
    'diet',
    'distribution',
    'other',
    'taxonomy',
)

_TRAIT_CHAR_LIMITS = {
    'similar_species': 2200,
    'identification': 2200,
    'measurements': 1400,
    'plumage': 1400,
    'vocalization': 1400,
    'size': 1000,
    'habitat': 1000,
    'behavior': 1000,
    'diet': 800,
    'distribution': 800,
    'other': 800,
    'taxonomy': 400,
}

_JSON_KEYS = (
    'summary',
    'size_comparison',
    'plumage_comparison',
    'behavior_comparison',
    'habitat_comparison',
    'vocalization_comparison',
    'identification_tips',
)

SYSTEM_PROMPT = (
    'You are a field-guide editor for Birdr, writing for birdwatchers who need '
    'to tell two similar species apart in the field. Be precise, practical and '
    'honest about uncertainty. Prefer diagnostic, observable differences over '
    'encyclopedic lists. Do not invent measurements, ranges or voice details. '
    'If sources conflict, prefer Birds of the World similar-species passages. '
    'Reply with a JSON object only.'
)


def comparison_model_name() -> str:
    return (getattr(settings, 'COMPARISON_AI_MODEL', None) or DEFAULT_MODEL).strip() or DEFAULT_MODEL


def name_search_terms(name: str, latin_name: str | None = None) -> list[str]:
    """Tokens worth searching for in Birds of the World text."""
    terms: list[str] = []
    seen: set[str] = set()

    def add(value: str | None):
        token = (value or '').strip()
        if not token:
            return
        key = token.lower()
        if key in seen:
            return
        seen.add(key)
        terms.append(token)

    add(name)
    parts = [p for p in (name or '').split() if p]
    if len(parts) >= 2:
        add(' '.join(parts[:2]))
    if parts:
        first = re.sub(r"[^\w']", '', parts[0]).lower()
        if first and first not in _GENERIC_NAME_TOKENS and len(first) >= 5:
            add(parts[0])

    if latin_name:
        add(latin_name)
        latin_parts = latin_name.split()
        if latin_parts:
            genus = latin_parts[0]
            add(genus)
            if len(latin_parts) > 1:
                epithet = latin_parts[1]
                add(epithet)
                initial = genus[0]
                add(f'{initial}. {epithet}')
                add(f'{initial} {epithet}')

    return terms


def _clip(text: str, limit: int) -> str:
    value = (text or '').strip()
    if len(value) <= limit:
        return value
    return value[: limit - 1].rsplit(' ', 1)[0] + '…'


def _trait_content(section_data) -> str:
    if isinstance(section_data, dict):
        return section_data.get('content') or ''
    if isinstance(section_data, str):
        return section_data
    return ''


class AIComparisonService:
    """Generate structured comparison texts with OpenAI."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = (api_key or getattr(settings, 'OPENAI_API_KEY', None) or '').strip()
        self.model = model or comparison_model_name()
        self.prompt_version = getattr(settings, 'COMPARISON_AI_PROMPT_VERSION', None) or PROMPT_VERSION
        if not self.api_key:
            logger.warning('OPENAI_API_KEY is not set; species comparisons cannot be generated')

    def _call_openai(self, prompt: str, max_tokens: int = 2000, *, json_object: bool = False) -> Optional[str]:
        if not self.api_key:
            raise ComparisonGenerationError(
                'Comparisons cannot be generated because the AI service is not configured.'
            )

        try:
            from openai import OpenAI
        except ImportError as exc:
            logger.exception('openai package is not installed')
            raise ComparisonGenerationError(
                'Comparisons cannot be generated because the AI library is missing.'
            ) from exc

        try:
            client = OpenAI(api_key=self.api_key, timeout=90.0)
            kwargs: Dict[str, Any] = {
                'model': self.model,
                'messages': [
                    {'role': 'system', 'content': SYSTEM_PROMPT},
                    {'role': 'user', 'content': prompt},
                ],
                'temperature': 0.3,
                'max_tokens': max_tokens,
            }
            if json_object:
                kwargs['response_format'] = {'type': 'json_object'}
            response = client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content or ''
            return content.strip() or None
        except Exception as exc:
            logger.exception('OpenAI comparison request failed (model=%s)', self.model)
            raise ComparisonGenerationError(_friendly_openai_error(exc)) from exc

    def generate_species_comparison(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str,
        species_1_latin: str | None = None,
        species_2_latin: str | None = None,
    ) -> Dict[str, str]:
        latin_1 = species_1_latin or species_1_traits.get('name_latin') or None
        latin_2 = species_2_latin or species_2_traits.get('name_latin') or None

        similar_species_info = self._extract_similar_species_mentions(
            species_1_traits,
            species_2_traits,
            species_1_name,
            species_2_name,
            latin_1,
            latin_2,
        )
        prompt = self._build_comparison_prompt(
            species_1_traits,
            species_2_traits,
            species_1_name,
            species_2_name,
            similar_species_info,
            latin_1,
            latin_2,
        )
        logger.info(
            'Generating %s vs %s comparison (%s, prompt %s chars)',
            species_1_name,
            species_2_name,
            self.model,
            len(prompt),
        )

        raw = self._call_openai(prompt, max_tokens=3500, json_object=True)
        if not raw:
            raise ComparisonGenerationError(
                'The comparison model returned an empty response. Please try again.'
            )

        parsed = self._parse_json_response(raw)
        if not parsed.get('summary'):
            parsed = self._parse_comparison_response(raw, species_1_name, species_2_name)
        if not parsed.get('summary'):
            raise ComparisonGenerationError(
                'The comparison model returned an empty response. Please try again.'
            )

        parsed['detailed_comparison'] = self._assemble_detailed(parsed)
        return parsed

    def _extract_similar_species_mentions(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str,
        species_1_latin: str = None,
        species_2_latin: str = None,
    ) -> Dict[str, List]:
        result = {
            'species_1_mentions_species_2': [],
            'species_2_mentions_species_1': [],
        }

        def search_content(content, variations, section_name):
            mentions = []
            if not content:
                return mentions
            content_str = content if isinstance(content, str) else str(content)
            for variation in variations:
                escaped = re.escape(variation).replace(r'\ ', r'[\s.]+')
                pattern = r'(?<!\w)' + escaped + r'(?!\w)'
                match = re.search(pattern, content_str, re.IGNORECASE)
                if not match:
                    continue
                start = max(0, match.start() - 280)
                end = min(len(content_str), match.end() + 280)
                mentions.append({
                    'section': section_name,
                    'matched_variation': variation,
                    'context': content_str[start:end].strip(),
                })
                break
            return mentions

        terms_2 = name_search_terms(species_2_name, species_2_latin)
        terms_1 = name_search_terms(species_1_name, species_1_latin)

        for section_name, section_data in species_1_traits.items():
            if section_name == 'name_latin':
                continue
            content = _trait_content(section_data)
            if content:
                result['species_1_mentions_species_2'].extend(
                    search_content(content, terms_2, section_name)
                )

        for section_name, section_data in species_2_traits.items():
            if section_name == 'name_latin':
                continue
            content = _trait_content(section_data)
            if content:
                result['species_2_mentions_species_1'].extend(
                    search_content(content, terms_1, section_name)
                )

        return result

    def _format_traits(self, traits_dict: Dict) -> str:
        chunks = []
        seen = set()
        keys = [key for key in _TRAIT_ORDER if key in traits_dict]
        keys.extend(key for key in traits_dict if key not in seen and key not in _TRAIT_ORDER and key != 'name_latin')
        for category in keys:
            if category in seen or category == 'name_latin':
                continue
            seen.add(category)
            content = _clip(_trait_content(traits_dict.get(category)), _TRAIT_CHAR_LIMITS.get(category, 900))
            if not content:
                continue
            chunks.append(f'{category.upper().replace("_", " ")}:\n{content}')
        return '\n\n'.join(chunks) if chunks else '(No extracted handbook notes for this species.)'

    def _build_comparison_prompt(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str,
        similar_species_info: Dict = None,
        species_1_latin: str | None = None,
        species_2_latin: str | None = None,
    ) -> str:
        label_1 = species_1_name + (f' ({species_1_latin})' if species_1_latin else '')
        label_2 = species_2_name + (f' ({species_2_latin})' if species_2_latin else '')
        species_1_text = self._format_traits(species_1_traits)
        species_2_text = self._format_traits(species_2_traits)

        expert_bits = []
        seen_expert = set()
        if similar_species_info:
            for source_name, mentions, other_name in (
                (species_1_name, similar_species_info.get('species_1_mentions_species_2') or [], species_2_name),
                (species_2_name, similar_species_info.get('species_2_mentions_species_1') or [], species_1_name),
            ):
                for mention in mentions:
                    section = mention.get('section') or 'Unknown'
                    key = (source_name, section, mention.get('matched_variation') or '')
                    if key in seen_expert:
                        continue
                    seen_expert.add(key)
                    expert_bits.append(
                        f'{source_name} · {section.replace("_", " ")} mentions {other_name} '
                        f'(matched “{mention.get("matched_variation") or ""}”):\n'
                        f'{mention.get("context") or ""}'
                    )

        expert_block = ''
        if expert_bits:
            expert_block = (
                '\n\nEXPERT CROSS-MENTIONS FROM BIRDS OF THE WORLD (highest priority):\n'
                + '\n\n---\n\n'.join(expert_bits)
            )

        return f"""Compare these two species for a birdwatcher who has just mixed them up in a quiz.

SPECIES A: {label_1}
{species_1_text}

SPECIES B: {label_2}
{species_2_text}
{expert_block}

Write for someone with binoculars, not a monograph. Lead with the most reliable field mark in the summary. If the two species are close relatives, compare structure first (bill, primary projection / wing formula, tail length, supercilium shape) before colour tone — colour is often the least reliable mark. Then cover song and call when they differ. If a feature is similar, say so in one clause and move on. Do not invent measurements, songs or ranges that are not in the notes. If notes are thin, use well-established field knowledge of these taxa and say when you are unsure.

Identification tips should be ordered checks (most reliable first), including season, age or sex pitfalls when the sources mention them. You may cite Birds of the World once when using those expert passages. Do not use headings like "AI Field Diagnostics".

Return a JSON object with these string keys (markdown allowed inside strings: bold field marks, short lists):
- summary: 2–3 sentences
- size_comparison
- plumage_comparison
- behavior_comparison
- habitat_comparison
- vocalization_comparison
- identification_tips
Use empty strings only when the sources truly have nothing useful."""

    def _parse_json_response(self, response: str) -> Dict[str, str]:
        text = (response or '').strip()
        if text.startswith('```'):
            text = re.sub(r'^```(?:json)?\s*', '', text)
            text = re.sub(r'\s*```$', '', text)
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if not match:
                return {}
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                return {}
        if not isinstance(data, dict):
            return {}
        parsed = {key: '' for key in _JSON_KEYS}
        for key in _JSON_KEYS:
            value = data.get(key)
            if isinstance(value, str):
                parsed[key] = value.strip()
        return parsed

    def _assemble_detailed(self, parsed: Dict[str, str]) -> str:
        parts = []
        if parsed.get('summary'):
            parts.append(f"## SUMMARY\n{parsed['summary']}")
        for heading, key in (
            ('Size', 'size_comparison'),
            ('Plumage', 'plumage_comparison'),
            ('Behavior', 'behavior_comparison'),
            ('Habitat', 'habitat_comparison'),
            ('Vocalization', 'vocalization_comparison'),
            ('Identification Tips', 'identification_tips'),
        ):
            if parsed.get(key):
                parts.append(f'### {heading}\n{parsed[key]}')
        return '\n\n'.join(parts)

    def _parse_comparison_response(self, response: str, species_1_name: str, species_2_name: str) -> Dict[str, str]:
        """Fallback parser for markdown-shaped replies."""
        result = {key: '' for key in _JSON_KEYS}
        result['detailed_comparison'] = response or ''
        sections = {
            'summary': r'## SUMMARY\s*\n(.*?)(?=##|$)',
            'size_comparison': r'### Size\s*\n(.*?)(?=###|##|$)',
            'plumage_comparison': r'### Plumage\s*\n(.*?)(?=###|##|$)',
            'behavior_comparison': r'### Behavior\s*\n(.*?)(?=###|##|$)',
            'habitat_comparison': r'### Habitat\s*\n(.*?)(?=###|##|$)',
            'vocalization_comparison': r'### Vocalization\s*\n(.*?)(?=###|##|$)',
            'identification_tips': r'### Identification Tips\s*\n(.*?)(?=###|##|$)',
        }
        for key, pattern in sections.items():
            match = re.search(pattern, response or '', re.DOTALL | re.IGNORECASE)
            if match:
                result[key] = match.group(1).strip()
        if not result['summary']:
            first_para = (response or '').split('\n\n')[0]
            result['summary'] = first_para[:500]
        return result

    def generate_family_comparison(self, family_1: str, family_2: str, species_list_1: List, species_list_2: List) -> Dict[str, str]:
        prompt = f"""Compare the following two bird families and describe their key differences:

FAMILY 1: {family_1}
Representative species: {', '.join(species_list_1[:10])}

FAMILY 2: {family_2}
Representative species: {', '.join(species_list_2[:10])}

Return JSON with keys summary and detailed_comparison."""
        full_comparison = self._call_openai(prompt, max_tokens=2000, json_object=True)
        if not full_comparison:
            return {'summary': '', 'detailed_comparison': ''}
        try:
            data = json.loads(full_comparison)
        except json.JSONDecodeError:
            return {
                'summary': full_comparison.split('\n\n')[0],
                'detailed_comparison': full_comparison,
            }
        if not isinstance(data, dict):
            return {'summary': full_comparison, 'detailed_comparison': full_comparison}
        return {
            'summary': (data.get('summary') or '').strip(),
            'detailed_comparison': (data.get('detailed_comparison') or data.get('summary') or '').strip(),
        }
