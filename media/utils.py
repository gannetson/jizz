"""
Utility functions for media processing.
"""
import re


def parse_copyright(copyright_text):
    """
    Parse copyright text and return (standardized_notation, non_commercial_only).
    
    Args:
        copyright_text: The copyright text as received from scraper
    
    Returns:
        tuple: (standardized_notation, non_commercial_only)
    """
    if not copyright_text:
        return '', False
    
    text = copyright_text.upper().strip()
    
    # Creative Commons licenses
    cc_patterns = [
        (r'CC\s*BY\s*NC\s*ND', 'CC BY-NC-ND'),  # Must check NC before BY
        (r'CC\s*BY\s*NC\s*SA', 'CC BY-NC-SA'),
        (r'CC\s*BY\s*NC', 'CC BY-NC'),
        (r'CC\s*BY\s*SA', 'CC BY-SA'),
        (r'CC\s*BY\s*ND', 'CC BY-ND'),
        (r'CC\s*BY', 'CC BY'),
        (r'CC0', 'CC0'),
        (r'CC\s*ZERO', 'CC0'),
    ]
    
    for pattern, standardized in cc_patterns:
        if re.search(pattern, text):
            non_commercial = 'NC' in standardized
            return standardized, non_commercial
    
    # Check for explicit Creative Commons mentions
    if 'CREATIVE COMMONS' in text or 'CC ' in text:
        # Try to extract version
        version_match = re.search(r'CC\s*(\d+\.?\d*)', text)
        version = version_match.group(1) if version_match else ''
        
        # Check for attributes
        has_nc = 'NON-COMMERCIAL' in text or 'NC' in text
        has_sa = 'SHARE-ALIKE' in text or 'SA' in text
        has_nd = 'NO DERIVATIVES' in text or 'ND' in text
        
        if has_nc and has_sa:
            return f'CC BY-NC-SA {version}'.strip(), True
        elif has_nc and has_nd:
            return f'CC BY-NC-ND {version}'.strip(), True
        elif has_nc:
            return f'CC BY-NC {version}'.strip(), True
        elif has_sa:
            return f'CC BY-SA {version}'.strip(), False
        elif has_nd:
            return f'CC BY-ND {version}'.strip(), False
        else:
            return f'CC BY {version}'.strip(), False
    
    # Public Domain
    if 'PUBLIC DOMAIN' in text or 'PD' in text or 'CC0' in text:
        return 'Public Domain', False
    
    # All Rights Reserved
    if 'ALL RIGHTS RESERVED' in text or 'COPYRIGHT' in text:
        return 'All Rights Reserved', True  # Assume non-commercial if all rights reserved
    
    # GNU licenses
    if 'GPL' in text:
        return 'GPL', False
    if 'LGPL' in text:
        return 'LGPL', False
    
    # MIT License
    if 'MIT' in text and 'LICENSE' in text:
        return 'MIT', False
    
    # Apache License
    if 'APACHE' in text:
        return 'Apache', False
    
    # If we can't parse it, return empty but check for non-commercial keywords
    non_commercial_keywords = ['NON-COMMERCIAL', 'NC', 'NOT FOR COMMERCIAL']
    has_nc = any(keyword in text for keyword in non_commercial_keywords)
    
    return '', has_nc

