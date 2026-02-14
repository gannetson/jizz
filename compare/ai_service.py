"""
AI service for generating species comparisons using OpenAI or other AI providers.
"""
import os
import re
from typing import Dict, Optional, List
from django.conf import settings


class AIComparisonService:
    """
    Service for generating comparison texts using AI.
    Supports OpenAI GPT models by default, but can be extended for other providers.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = 'gpt-4o-mini'):
        """
        Initialize the AI service.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model to use (defaults to 'gpt-4o-mini')
        """
        self.api_key = settings.OPENAI_API_KEY
        self.model = model
        
        if not self.api_key:
            print("Warning: OPENAI_API_KEY not set. AI comparisons will not work.")
    
    def _call_openai(self, prompt: str, max_tokens: int = 2000) -> Optional[str]:
        """
        Call OpenAI API with a prompt.
        
        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens in response
        
        Returns:
            Generated text or None if error
        """
        if not self.api_key:
            return None
        
        try:
            from openai import OpenAI
            import openai
            import os
            
            # Check OpenAI library version for compatibility
            try:
                openai_version = openai.__version__
                version_parts = [int(x) for x in openai_version.split('.')[:2]]
                if version_parts[0] < 1 or (version_parts[0] == 1 and version_parts[1] < 12):
                    print(f"Warning: OpenAI library version {openai_version} may be incompatible. Recommended: >=1.12.0")
            except (AttributeError, ValueError):
                pass  # Version check failed, continue anyway
            
            # Temporarily remove proxy environment variables if they exist
            # Some versions of the OpenAI library try to use these and pass them incorrectly
            original_proxy_vars = {}
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']
            for var in proxy_vars:
                if var in os.environ:
                    original_proxy_vars[var] = os.environ[var]
                    del os.environ[var]
            
            try:
                # Try to use httpx directly to avoid proxy issues
                try:
                    import httpx
                    # Create an httpx client without any proxy configuration
                    # httpx doesn't use proxies parameter in Client constructor
                    http_client = httpx.Client(timeout=60.0)
                    client = OpenAI(api_key=self.api_key, http_client=http_client)
                except ImportError:
                    # httpx not available, fall back to standard initialization
                    # Initialize client with only the api_key parameter
                    # Explicitly avoid passing proxies or other parameters that might cause issues
                    client = OpenAI(api_key=self.api_key)
            finally:
                # Restore proxy environment variables
                for var, value in original_proxy_vars.items():
                    os.environ[var] = value
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert ornithologist helping birdwatchers identify and compare bird species. Provide detailed, accurate, and helpful comparisons."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=max_tokens,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        except ImportError:
            print("Error: openai package not installed. Install with: pip install openai")
            return None
        except TypeError as e:
            # Handle case where proxies or other unsupported arguments are being passed
            error_msg = str(e)
            if 'proxies' in error_msg or '__init__' in error_msg:
                import traceback
                print(f"Error: OpenAI client initialization failed. This may be due to an incompatible library version or configuration.")
                print(f"Details: {error_msg}")
                print(f"Full traceback:")
                traceback.print_exc()
                print("\nTroubleshooting:")
                print("1. Check OpenAI library version: pip show openai")
                print("2. Upgrade if needed: pip install --upgrade 'openai>=1.12.0'")
                print("3. Check for proxy environment variables: echo $HTTP_PROXY $HTTPS_PROXY")
                print("4. If proxies are set, they may need to be unset for OpenAI API calls")
                return None
            else:
                print(f"TypeError calling OpenAI API: {e}")
                import traceback
                traceback.print_exc()
                return None
        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            return None
    
    def generate_species_comparison(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str
    ) -> Dict[str, str]:
        """
        Generate a comprehensive comparison between two species.
        
        Args:
            species_1_traits: Dictionary of traits for first species
            species_2_traits: Dictionary of traits for second species
            species_1_name: Name of first species
            species_2_name: Name of second species
        
        Returns:
            Dictionary with comparison sections
        """
        # Check for Similar Species mentions from Birds of the World
        # Try to get scientific names from traits if available
        species_1_latin = species_1_traits.get('name_latin') or None
        species_2_latin = species_2_traits.get('name_latin') or None
        
        similar_species_info = self._extract_similar_species_mentions(
            species_1_traits, species_2_traits, species_1_name, species_2_name,
            species_1_latin, species_2_latin
        )
        
        # Build prompt
        prompt = self._build_comparison_prompt(
            species_1_traits, species_2_traits, species_1_name, species_2_name, similar_species_info
        )
        print("Prompt:")
        print("###--------------------------------")
        print(prompt)
        print("###--------------------------------")
        
        # Generate comparison
        full_comparison = self._call_openai(prompt, max_tokens=3000)
        
        if not full_comparison:
            return {
                'summary': 'Unable to generate comparison. AI service unavailable.',
                'detailed_comparison': '',
            }
        
        # Parse and structure the response
        return self._parse_comparison_response(full_comparison, species_1_name, species_2_name)
    
    def _extract_similar_species_mentions(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str,
        species_1_latin: str = None,
        species_2_latin: str = None
    ) -> Dict[str, List]:
        """
        Extract mentions of one species in the other species' text from ALL sections.
        Searches through all trait sections (Identification, Plumage, Behavior, Habitat, etc.),
        not just "Similar Species".
        Returns dict with lists of mentions found in each section.
        """
        result = {
            'species_1_mentions_species_2': [],  # List of mentions found in species_1's text
            'species_2_mentions_species_1': []  # List of mentions found in species_2's text
        }
        
        def build_name_variations(name, latin_name=None):
            """Build various name variations to search for, including Latin abbreviations."""
            variations = set()
            
            def add_variation(value):
                if value:
                    variations.add(value.strip())
            
            add_variation(name)
            
            # Add first word and first two words from common name
            if name and ' ' in name:
                parts = name.split()
                add_variation(parts[0])
                if len(parts) > 1:
                    add_variation(' '.join(parts[:2]))
            
            if latin_name:
                add_variation(latin_name)
                latin_parts = latin_name.split()
                if latin_parts:
                    genus = latin_parts[0]
                    add_variation(genus)
                    if len(latin_parts) > 1:
                        species_epithet = latin_parts[1]
                        add_variation(species_epithet)
                        
                        # Add genus initial formats e.g., P. modularis / P modularis
                        genus_initial = genus[0]
                        add_variation(f"{genus_initial}. {species_epithet}")
                        add_variation(f"{genus_initial} {species_epithet}")
                        add_variation(f"{genus[:2]}. {species_epithet}")
            
            # Return list preserving insertion order
            return list(variations)
        
        def search_content_for_mentions(content, variations, section_name):
            """Search content for any of the name variations and return matches."""
            mentions = []
            if not content:
                return mentions
            
            content_str = content if isinstance(content, str) else str(content)
            
            for variation in variations:
                # Escape special regex characters but allow flexible spacing and periods
                escaped = re.escape(variation).replace(r'\ ', r'[\s\.]+')
                # Word boundary pattern that also handles periods (for "P. modularis")
                pattern = r'(?<!\w)' + escaped + r'(?!\w)'
                matches = re.finditer(pattern, content_str, re.IGNORECASE)
                for match in matches:
                    # Extract context around the match (100 chars before and after)
                    start = max(0, match.start() - 100)
                    end = min(len(content_str), match.end() + 100)
                    context = content_str[start:end].strip()
                    mentions.append({
                        'section': section_name,
                        'matched_variation': variation,
                        'context': context,
                        'full_content': content_str
                    })
                    break  # Only need one match per variation per section
            
            return mentions
        
        # Build name variations for both species
        species_2_variations = build_name_variations(species_2_name, species_2_latin)
        species_1_variations = build_name_variations(species_1_name, species_1_latin)
        
        # Search through ALL sections of species_1's traits for mentions of species_2
        for section_name, section_data in species_1_traits.items():
            if section_name == 'name_latin':  # Skip metadata fields
                continue
            
            content = None
            if isinstance(section_data, dict):
                content = section_data.get('content', '')
            elif isinstance(section_data, str):
                content = section_data
            
            if content:
                mentions = search_content_for_mentions(content, species_2_variations, section_name)
                result['species_1_mentions_species_2'].extend(mentions)
        
        # Search through ALL sections of species_2's traits for mentions of species_1
        for section_name, section_data in species_2_traits.items():
            if section_name == 'name_latin':  # Skip metadata fields
                continue
            
            content = None
            if isinstance(section_data, dict):
                content = section_data.get('content', '')
            elif isinstance(section_data, str):
                content = section_data
            
            if content:
                mentions = search_content_for_mentions(content, species_1_variations, section_name)
                result['species_2_mentions_species_1'].extend(mentions)
        
        return result
    
    def _build_comparison_prompt(
        self,
        species_1_traits: Dict,
        species_2_traits: Dict,
        species_1_name: str,
        species_2_name: str,
        similar_species_info: Dict = None
    ) -> str:
        """Build the prompt for AI comparison."""
        
        # Format traits for prompt (excluding similar_species as we handle it separately)
        def format_traits(traits_dict, exclude_category=None):
            formatted = []
            for category, trait_data in traits_dict.items():
                if exclude_category and category == exclude_category:
                    continue  # Skip similar_species, we'll add it separately
                if isinstance(trait_data, dict) and 'content' in trait_data:
                    formatted.append(f"{category.upper()}:\n{trait_data['content']}")
                elif isinstance(trait_data, str):
                    formatted.append(f"{category.upper()}:\n{trait_data}")
            return '\n\n'.join(formatted)
        
        species_1_text = format_traits(species_1_traits, exclude_category='similar_species')
        species_2_text = format_traits(species_2_traits, exclude_category='similar_species')
        
        # Build the mentions section with high priority - includes all sections, not just Similar Species
        mentions_section = ""
        expert_diagnostics = []
        
        if similar_species_info:
            # Process mentions found in species_1's text about species_2
            if similar_species_info.get('species_1_mentions_species_2'):
                mentions = similar_species_info['species_1_mentions_species_2']
                for mention in mentions:
                    section = mention.get('section', 'Unknown')
                    match_token = mention.get('matched_variation', '')
                    content = mention.get('full_content', mention.get('context', ''))
                    expert_diagnostics.append(
                        f"{species_1_name} - {section.upper()} section (Birds of the World) mentions {species_2_name} (matched on '{match_token}'):\n{content}"
                    )
            
            # Process mentions found in species_2's text about species_1
            if similar_species_info.get('species_2_mentions_species_1'):
                mentions = similar_species_info['species_2_mentions_species_1']
                for mention in mentions:
                    section = mention.get('section', 'Unknown')
                    match_token = mention.get('matched_variation', '')
                    content = mention.get('full_content', mention.get('context', ''))
                    expert_diagnostics.append(
                        f"{species_2_name} - {section.upper()} section (Birds of the World) mentions {species_1_name} (matched on '{match_token}'):\n{content}"
                    )
        
        if expert_diagnostics:
            mentions_section = "\n\n⚠️ IMPORTANT - EXPERT SOURCE FROM BIRDS OF THE WORLD:\n" + "\n\n---\n\n".join(expert_diagnostics)
        
        prompt = f"""Compare the following two bird species and provide a detailed comparison focusing on key differences that would help birdwatchers distinguish between them.

SPECIES 1: {species_1_name}
{species_1_text}

SPECIES 2: {species_2_name}
{species_2_text}
{mentions_section}

⚠️ CRITICAL INSTRUCTION: If there are mentions above from Birds of the World (from any section: Similar Species, Identification, Plumage, Behavior, Habitat, etc.), this is EXPERT-REVIEWED information and should be given HIGHEST PRIORITY. Use this information as the foundation for your comparison, especially in the "Identification Tips" section. These direct mentions from Birds of the World are more authoritative than general trait comparisons.

In the **Identification Tips** section you MUST:
1. Begin with a subsection titled "Birds of the World Similar-Species Diagnostics" summarizing the literal expert references (do not paraphrase away the evidence). Cite which species' Similar Species section the quote came from.
2. Follow with a subsection titled "AI Field Diagnostics" for any additional insights you infer from the other trait data. Make it clear these points are AI-generated suggestions rather than expert quotes.

Please provide a comprehensive comparison in the following format:

## SUMMARY
[A brief 2-3 sentence summary of the key differences]

## DETAILED COMPARISON
[Detailed comparison covering:]

### Size
[Compare sizes, measurements, body proportions]

### Plumage
[Compare plumage patterns, colors, distinctive markings]

### Behavior
[Compare behaviors, foraging patterns, flight style]

### Habitat
[Compare habitat preferences and distribution]

### Vocalization
[Compare calls and songs if information is available]

### Identification Tips
[CRITICAL: This section MUST be filled with practical identification tips. Structure as follows:

1. **Birds of the World Similar-Species Diagnostics** (if available from the Similar Species sections above):
   - Start with the expert-reviewed information from Birds of the World's Similar Species sections
   - Quote or paraphrase the specific diagnostic features mentioned
   - This is the most authoritative source

2. **AI Field Diagnostics**:
   - Provide additional practical tips based on the trait comparisons
   - Focus on field-identifiable differences: size, shape, plumage patterns, behavior, habitat
   - Include what to look for and common confusion points
   - Make it actionable for birdwatchers

If no Similar Species information is available, provide comprehensive AI-generated identification tips covering all key distinguishing features.]

Focus on practical, field-identifiable differences that would help a birdwatcher tell these species apart. The Identification Tips section is critical and must be comprehensive."""
        
        return prompt
    
    def _parse_comparison_response(self, response: str, species_1_name: str, species_2_name: str) -> Dict[str, str]:
        """
        Parse the AI response into structured sections.
        
        Args:
            response: The full AI response text
            species_1_name: Name of first species
            species_2_name: Name of second species
        
        Returns:
            Dictionary with parsed sections
        """
        result = {
            'summary': '',
            'detailed_comparison': response,
            'size_comparison': '',
            'plumage_comparison': '',
            'behavior_comparison': '',
            'habitat_comparison': '',
            'vocalization_comparison': '',
            'identification_tips': '',
        }
        
        # Try to extract sections
        sections = {
            'summary': r'## SUMMARY\s*\n(.*?)(?=##|$)',
            'size': r'### Size\s*\n(.*?)(?=###|##|$)',
            'plumage': r'### Plumage\s*\n(.*?)(?=###|##|$)',
            'behavior': r'### Behavior\s*\n(.*?)(?=###|##|$)',
            'habitat': r'### Habitat\s*\n(.*?)(?=###|##|$)',
            'vocalization': r'### Vocalization\s*\n(.*?)(?=###|##|$)',
            'identification_tips': r'### Identification Tips\s*\n(.*?)(?=###|##|$)',
        }
        
        import re
        for key, pattern in sections.items():
            match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)
            if match:
                text = match.group(1).strip()
                if key == 'summary':
                    result['summary'] = text
                elif key == 'size':
                    result['size_comparison'] = text
                elif key == 'plumage':
                    result['plumage_comparison'] = text
                elif key == 'behavior':
                    result['behavior_comparison'] = text
                elif key == 'habitat':
                    result['habitat_comparison'] = text
                elif key == 'vocalization':
                    result['vocalization_comparison'] = text
                elif key == 'identification_tips':
                    result['identification_tips'] = text
        
        # If summary wasn't extracted, use first paragraph
        if not result['summary']:
            first_para = response.split('\n\n')[0] if response else ''
            result['summary'] = first_para[:500]  # Limit to 500 chars
        
        # Ensure identification_tips is filled - if not extracted, try to find it in the response
        if not result['identification_tips']:
            # Look for "Identification Tips" or "Identification" anywhere in the response
            import re
            # Try various patterns
            patterns = [
                r'(?:Identification Tips|Identification|ID Tips|Distinguishing Features)[:\s]*\n(.*?)(?=\n##|\n###|$)',
                r'## Identification Tips\s*\n(.*?)(?=##|$)',
                r'### Identification Tips\s*\n(.*?)(?=###|##|$)',
            ]
            for pattern in patterns:
                match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)
                if match:
                    result['identification_tips'] = match.group(1).strip()
                    break
            
            # If still not found, use the last section or a portion of detailed_comparison
            if not result['identification_tips']:
                # Try to extract from detailed_comparison if it exists
                if result['detailed_comparison']:
                    # Look for any section that might contain identification info
                    lines = result['detailed_comparison'].split('\n')
                    # Find lines that might be identification-related
                    id_lines = []
                    for i, line in enumerate(lines):
                        if any(keyword in line.lower() for keyword in ['identif', 'distinguish', 'field', 'look for', 'note']):
                            # Take this line and following lines until next heading
                            for j in range(i, min(i + 10, len(lines))):
                                if lines[j].startswith('#'):
                                    break
                                id_lines.append(lines[j])
                            break
                    if id_lines:
                        result['identification_tips'] = '\n'.join(id_lines).strip()
        
        # Final fallback: if identification_tips is still empty, create a basic one from available info
        if not result['identification_tips']:
            tips_parts = []
            if result['size_comparison']:
                tips_parts.append(f"**Size:** {result['size_comparison'][:200]}")
            if result['plumage_comparison']:
                tips_parts.append(f"**Plumage:** {result['plumage_comparison'][:200]}")
            if tips_parts:
                result['identification_tips'] = '\n\n'.join(tips_parts)
            else:
                result['identification_tips'] = "Compare size, plumage patterns, and behavior to distinguish these species."
        
        return result
    
    def generate_family_comparison(self, family_1: str, family_2: str, species_list_1: List, species_list_2: List) -> Dict[str, str]:
        """
        Generate a comparison between two families.
        
        Args:
            family_1: Name of first family
            family_2: Name of second family
            species_list_1: List of species in first family
            species_list_2: List of species in second family
        
        Returns:
            Dictionary with comparison sections
        """
        prompt = f"""Compare the following two bird families and describe their key differences:

FAMILY 1: {family_1}
Representative species: {', '.join(species_list_1[:10])}

FAMILY 2: {family_2}
Representative species: {', '.join(species_list_2[:10])}

Provide a comparison covering:
- General characteristics and morphology
- Typical behaviors
- Habitat preferences
- Key distinguishing features
- Notable species differences

Format as:
## SUMMARY
[Brief summary]

## DETAILED COMPARISON
[Detailed comparison]"""
        
        full_comparison = self._call_openai(prompt, max_tokens=2000)
        
        return {
            'summary': full_comparison.split('\n\n')[0] if full_comparison else '',
            'detailed_comparison': full_comparison or '',
        }

