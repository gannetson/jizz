"""Parse genus and other taxonomy fragments from eBird scientific names."""

from __future__ import annotations


def parse_genus_from_sci_name(sci_name: str) -> str | None:
    """
    Return the genus (first word) from a binomial sciName, or None for hybrids/sp.

    Hybrids (\" x \", \" × \") and sp./spp. entries are skipped per product rules.
    """
    sci_name = (sci_name or '').strip()
    if not sci_name:
        return None
    lower = sci_name.lower()
    if ' x ' in lower or ' × ' in sci_name:
        return None
    if ' sp.' in lower or lower.endswith(' sp.') or ' spp.' in lower:
        return None

    parts = sci_name.split()
    if len(parts) < 2:
        return None

    genus = parts[0]
    if not genus or not genus[0].isupper():
        return None
    return genus
