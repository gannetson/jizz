"""
Scraper for extracting species traits from Birds of the World website.
"""
import requests
from bs4 import BeautifulSoup
import re
from typing import Dict, List, Optional
from urllib.parse import urljoin, urlparse
from django.conf import settings


class BirdsOfTheWorldScraper:
    """
    Scraper for https://birdsoftheworld.org
    """
    
    BASE_URL = "https://birdsoftheworld.org"
    IDENTIFICATION_URL_TEMPLATE = "https://birdsoftheworld.org/bow/species/{species_code}/cur/identification"
    INTRODUCTION_URL_TEMPLATE = "https://birdsoftheworld.org/bow/species/{species_code}/cur/introduction"
    SEARCH_URL = "https://birdsoftheworld.org/bow/search"
    LOGIN_URL = "https://birdsoftheworld.org/bow/user/login"
    
    def __init__(self, authenticate: bool = True):
        """
        Initialize the scraper.
        
        Args:
            authenticate: Whether to authenticate with Cornell credentials (default: True)
        """
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.authenticated = False
        
        if authenticate:
            self.login()
    
    def login(self) -> bool:
        """
        Log in to Birds of the World using Cornell credentials.
        
        Returns:
            True if login successful, False otherwise
        """
        try:
            # Get credentials from settings
            username = getattr(settings, 'CORNELL_USERNAME', None)
            password = getattr(settings, 'CORNELL_PASSWORD', None)
            
            if not username or not password:
                print("Warning: CORNELL_USERNAME or CORNELL_PASSWORD not set. Continuing without authentication.")
                return False
            
            # First, get the login page to extract any CSRF tokens or form data
            login_page = self.session.get(self.LOGIN_URL, timeout=10)
            if login_page.status_code != 200:
                print(f"Warning: Could not access login page (status {login_page.status_code})")
                return False
            
            soup = BeautifulSoup(login_page.content, 'html.parser')
            
            # Look for login form - Birds of the World might use different form structures
            # Try to find form fields
            form = soup.find('form')
            if not form:
                # Try alternative login approach - direct POST
                login_data = {
                    'name': username,
                    'pass': password,
                    'form_id': 'user_login_form',
                    'op': 'Log in'
                }
            else:
                # Extract form fields
                login_data = {}
                for input_field in form.find_all(['input', 'select']):
                    name = input_field.get('name')
                    value = input_field.get('value', '')
                    input_type = input_field.get('type', '')
                    
                    if name and input_type != 'submit':
                        login_data[name] = value
                
                # Add credentials
                login_data['name'] = username
                login_data['pass'] = password
            
            # Submit login
            login_response = self.session.post(
                self.LOGIN_URL,
                data=login_data,
                allow_redirects=True,
                timeout=10
            )
            
            # Check if login was successful
            # Look for indicators of successful login (e.g., user menu, logout link, etc.)
            if login_response.status_code == 200:
                # Check if we're logged in by looking for user-specific content
                response_text = login_response.text.lower()
                if 'logout' in response_text or 'my account' in response_text or 'welcome' in response_text:
                    self.authenticated = True
                    print("Successfully authenticated with Birds of the World")
                    return True
                else:
                    # Might still be logged in, try accessing a protected page
                    # Or check cookies
                    if self.session.cookies:
                        self.authenticated = True
                        print("Authentication appears successful (cookies set)")
                        return True
            
            print("Warning: Login may have failed - continuing without authentication")
            return False
            
        except Exception as e:
            print(f"Error during login: {e}")
            return False
    
    def find_species_code_by_name(self, species_name: str, scientific_name: str = None) -> Optional[str]:
        """
        Try to find the Birds of the World species code by searching for the species name.
        This is useful when the code in the database doesn't match Birds of the World format.
        """
        try:
            # Try searching by common name
            search_params = {'q': species_name}
            response = self.session.get(self.SEARCH_URL, params=search_params, timeout=10)
            
            if response.status_code == 200:
                soup = BeautifulSoup(response.content, 'html.parser')
                # Look for species links in search results
                species_links = soup.find_all('a', href=re.compile(r'/bow/species/([^/]+)/'))
                if species_links:
                    # Extract code from first result
                    match = re.search(r'/bow/species/([^/]+)/', species_links[0].get('href', ''))
                    if match:
                        return match.group(1)
            
            # If common name search fails and we have scientific name, try that
            if scientific_name:
                search_params = {'q': scientific_name}
                response = self.session.get(self.SEARCH_URL, params=search_params, timeout=10)
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    species_links = soup.find_all('a', href=re.compile(r'/bow/species/([^/]+)/'))
                    if species_links:
                        match = re.search(r'/bow/species/([^/]+)/', species_links[0].get('href', ''))
                        if match:
                            return match.group(1)
        except Exception as e:
            print(f"Error searching for species code: {e}")
        
        return None
    
    def get_species_code_from_url(self, url: str) -> Optional[str]:
        """
        Extract species code from a Birds of the World URL.
        Example: https://birdsoftheworld.org/bow/species/bkpwar/cur/identification -> bkpwar
        """
        match = re.search(r'/bow/species/([^/]+)/', url)
        return match.group(1) if match else None
    
    def build_identification_url(self, species_code: str) -> str:
        """Build the identification URL for a species code."""
        return self.IDENTIFICATION_URL_TEMPLATE.format(species_code=species_code)
    
    def build_introduction_url(self, species_code: str) -> str:
        """Build the introduction URL for a species code."""
        return self.INTRODUCTION_URL_TEMPLATE.format(species_code=species_code)
    
    def fetch_page(self, url: str, follow_redirects: bool = True) -> Optional[BeautifulSoup]:
        """Fetch and parse a page."""
        try:
            response = self.session.get(url, timeout=30, allow_redirects=follow_redirects)
            
            # Handle redirects
            if response.status_code in [301, 302, 303, 307, 308]:
                if follow_redirects:
                    # Already followed, check final URL
                    if 'species' not in response.url:
                        print(f"Warning: Redirected from {url} to {response.url} - page may not exist")
                        return None
                else:
                    # Get redirect location
                    redirect_url = response.headers.get('Location', '')
                    if redirect_url:
                        print(f"Redirect {response.status_code} from {url} to {redirect_url}")
                        return self.fetch_page(redirect_url, follow_redirects=True)
                    return None
            
            # Check status code
            if response.status_code == 404:
                print(f"Error: Page not found (404) for {url}")
                # Try with "1" appended to the species code if this is a species page
                if '/bow/species/' in url:
                    # Extract species code and try with "1" appended
                    match = re.search(r'/bow/species/([^/]+)/', url)
                    if match:
                        original_code = match.group(1)
                        # Only try if code doesn't already end with a digit
                        if not original_code[-1].isdigit():
                            new_code = original_code + '1'
                            new_url = url.replace(f'/{original_code}/', f'/{new_code}/')
                            print(f"Trying fallback URL with code '{new_code}': {new_url}")
                            return self.fetch_page(new_url, follow_redirects)
                return None
            
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Check if page has meaningful content
            page_text = soup.get_text(strip=True)
            
            # Check for common error indicators, but only treat as error if page has very little content
            error_indicators = [
                'page not found',
                'not found',
                '404',
                'does not exist',
                'no results'
            ]
            page_text_lower = page_text.lower()
            has_error_indicator = False
            for indicator in error_indicators:
                if indicator in page_text_lower:
                    has_error_indicator = True
                    break
            
            # Only treat as error if BOTH conditions are true:
            # 1. Has an error indicator AND
            # 2. Has very little content (< 200 chars)
            # This allows pages with "not found" text but actual content to be processed
            if has_error_indicator and len(page_text) < 200:
                print(f"Warning: Page {url} appears to be an error page (contains error indicator and has only {len(page_text)} chars)")
                return None
            
            # If page has very little content regardless of error indicators, warn but still try to process
            if len(page_text) < 100:
                print(f"Warning: Page {url} seems to have very little content ({len(page_text)} chars). May require authentication or page doesn't exist, but will attempt to extract content.")
            
            # Check for actual content elements (headings, paragraphs, etc.) to verify page has structure
            has_content = False
            # Check for headings
            if soup.find_all(['h1', 'h2', 'h3', 'h4']):
                has_content = True
            # Check for paragraphs or divs with substantial text
            if not has_content:
                paragraphs = soup.find_all(['p', 'div'])
                for p in paragraphs:
                    text = p.get_text(strip=True)
                    if len(text) > 50:  # Substantial paragraph
                        has_content = True
                        break
            
            # If we have error indicators but also have content structure, proceed anyway
            if has_error_indicator and has_content:
                print(f"Note: Page {url} contains error indicator but also has content structure. Proceeding with extraction.")
            
            return soup
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                print(f"Error: Page not found (404) for {url}")
                # Try with "1" appended to the species code if this is a species page
                if '/bow/species/' in url:
                    # Extract species code and try with "1" appended
                    match = re.search(r'/bow/species/([^/]+)/', url)
                    if match:
                        original_code = match.group(1)
                        # Only try if code doesn't already end with a digit
                        if not original_code[-1].isdigit():
                            new_code = original_code + '1'
                            new_url = url.replace(f'/{original_code}/', f'/{new_code}/')
                            print(f"Trying fallback URL with code '{new_code}': {new_url}")
                            return self.fetch_page(new_url, follow_redirects)
            else:
                print(f"Error fetching {url}: HTTP {e.response.status_code} - {e}")
            return None
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
    
    def extract_identification_section(self, soup: BeautifulSoup) -> Dict[str, str]:
        """
        Extract the Identification section content.
        Returns a dict with 'identification' and 'similar_species' keys.
        """
        content = {}
        
        # Try multiple ways to find the Identification section
        # Method 1: Look for h2 with "Identification" or "Field Identification"
        identification_heading = None
        for heading in soup.find_all(['h2', 'h1', 'h3']):
            text = heading.get_text(strip=True)
            if re.search(r'Identification', text, re.I) and not re.search(r'Similar', text, re.I):
                identification_heading = heading
                break
        
        if identification_heading:
            identification_text = []
            # Collect all content until next major section
            # Use find_next instead of find_next_sibling to get nested content
            current = identification_heading.next_sibling if hasattr(identification_heading, 'next_sibling') else None
            
            # If no sibling, try finding the parent container and getting its siblings
            if not current or (hasattr(current, 'name') and current.name is None):
                # Try to find the section container
                parent = identification_heading.parent
                if parent:
                    current = identification_heading
                    # Get all siblings after the heading
                    found_heading = False
                    for sibling in parent.children:
                        if found_heading:
                            if hasattr(sibling, 'name') and sibling.name in ['h1', 'h2', 'h3']:
                                # Check if it's Similar Species or next major section
                                if 'Similar Species' in sibling.get_text():
                                    break
                                if sibling.name in ['h1', 'h2']:
                                    break
                            elif hasattr(sibling, 'get_text'):
                                text = sibling.get_text(strip=True)
                                if text and len(text) > 20:
                                    identification_text.append(text)
                        elif sibling == identification_heading:
                            found_heading = True
            else:
                # Original method: collect siblings
                while current:
                    # Stop at next h2 or h1 (major section)
                    if hasattr(current, 'name'):
                        if current.name in ['h2', 'h1']:
                            # Check if it's a subsection (h3) or similar species
                            if current.name == 'h3' and 'Similar Species' in current.get_text():
                                break
                            elif current.name in ['h2', 'h1']:
                                break
                        
                        # Collect text from paragraphs, divs, etc.
                        text = current.get_text(strip=True) if hasattr(current, 'get_text') else ''
                        if text and len(text) > 20:  # Only add substantial text
                            identification_text.append(text)
                    
                    current = current.next_sibling if hasattr(current, 'next_sibling') else None
                    if not current or (hasattr(current, 'name') and current.name is None):
                        break
            
            # Alternative: Try to find content in the same section/div as the heading
            if not identification_text:
                # Find the section containing the heading
                section = identification_heading.find_parent(['section', 'div', 'article'])
                if section:
                    # Get all text after the heading within this section
                    section_text = section.get_text(separator='\n', strip=True)
                    # Try to extract just the identification part
                    heading_pos = section_text.find(identification_heading.get_text(strip=True))
                    if heading_pos >= 0:
                        # Get text after heading, stop at "Similar Species" or next major heading
                        after_heading = section_text[heading_pos + len(identification_heading.get_text(strip=True)):]
                        # Split by common section markers
                        parts = re.split(r'\n\s*(Similar Species|Plumages|Habitat|Behavior|Diet|Sounds)', after_heading, flags=re.I)
                        if parts:
                            id_text = parts[0].strip()
                            if len(id_text) > 50:
                                identification_text = [id_text]
            
            if identification_text:
                content['identification'] = '\n\n'.join(identification_text)
        
        # Find Similar Species section (can be h2 or h3)
        similar_heading = None
        for heading in soup.find_all(['h2', 'h3']):
            text = heading.get_text(strip=True)
            if re.search(r'Similar Species', text, re.I):
                similar_heading = heading
                break
        
        if similar_heading:
            similar_text = []
            # Try multiple methods to get content
            # Method 1: Get next siblings
            current = similar_heading.next_sibling if hasattr(similar_heading, 'next_sibling') else None
            while current:
                if hasattr(current, 'name'):
                    # Stop at next major section
                    if current.name in ['h2', 'h1']:
                        break
                    if current.name == 'h3' and 'Similar Species' not in current.get_text():
                        # Check if it's a different h3 subsection
                        break
                    
                    text = current.get_text(strip=True) if hasattr(current, 'get_text') else ''
                    if text and len(text) > 20:
                        similar_text.append(text)
                
                current = current.next_sibling if hasattr(current, 'next_sibling') else None
                if not current or (hasattr(current, 'name') and current.name is None):
                    break
            
            # Method 2: Get content from parent section
            if not similar_text:
                section = similar_heading.find_parent(['section', 'div', 'article'])
                if section:
                    section_text = section.get_text(separator='\n', strip=True)
                    heading_pos = section_text.find(similar_heading.get_text(strip=True))
                    if heading_pos >= 0:
                        after_heading = section_text[heading_pos + len(similar_heading.get_text(strip=True)):]
                        # Stop at next major section
                        parts = re.split(r'\n\s*(Plumages|Habitat|Behavior|Diet|Sounds|Distribution)', after_heading, flags=re.I)
                        if parts:
                            similar_text_content = parts[0].strip()
                            if len(similar_text_content) > 50:
                                similar_text = [similar_text_content]
            
            if similar_text:
                content['similar_species'] = '\n\n'.join(similar_text)
        
        return content
    
    def _extract_fallback_section(self, soup: BeautifulSoup, keywords: List[str]) -> Optional[str]:
        """
        Fallback method to extract section content when standard methods fail.
        Searches for keywords in the page and extracts surrounding content.
        """
        # Get all text with structure preserved
        page_text = soup.get_text(separator='\n', strip=True)
        
        for keyword in keywords:
            # Find keyword in text (case insensitive)
            pattern = re.compile(re.escape(keyword), re.IGNORECASE)
            matches = list(pattern.finditer(page_text))
            
            for match in matches:
                start_pos = match.start()
                # Get text after the keyword
                after_keyword = page_text[start_pos + len(keyword):]
                
                # Try to extract a reasonable chunk (stop at next major section)
                # Look for common section markers
                next_section_pattern = r'\n\s*(Plumages|Habitat|Behavior|Diet|Sounds|Distribution|Systematics|Movements|Breeding|Conservation)'
                next_match = re.search(next_section_pattern, after_keyword, re.IGNORECASE)
                
                if next_match:
                    content = after_keyword[:next_match.start()].strip()
                else:
                    # Take first 2000 characters if no section marker found
                    content = after_keyword[:2000].strip()
                
                # Clean up: remove very short lines and normalize whitespace
                lines = [line.strip() for line in content.split('\n') if len(line.strip()) > 10]
                content = '\n\n'.join(lines)
                
                if len(content) > 100:  # Only return if we have substantial content
                    return content
        
        return None
    
    def extract_plumage_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract the Plumages, Molts, and Structure section."""
        # Look for Plumages section (can be h2 or h1)
        plumages_heading = None
        for heading in soup.find_all(['h2', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'Plumages', text, re.I):
                plumages_heading = heading
                break
        
        if plumages_heading:
            plumage_text = []
            current = plumages_heading.find_next_sibling()
            while current:
                # Stop at next major section (h2 or h1)
                if current.name in ['h2', 'h1']:
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 20:
                    plumage_text.append(text)
                
                current = current.find_next_sibling()
            
            if plumage_text:
                return '\n\n'.join(plumage_text)
        
        # Fallback method
        plumage_fallback = self._extract_fallback_section(soup, ['Plumages', 'Plumage', 'Molts'])
        if plumage_fallback:
            return plumage_fallback
        
        return None
    
    def extract_measurements_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract measurements data."""
        measurements_heading = None
        for heading in soup.find_all(['h2', 'h3', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'Measurements', text, re.I):
                measurements_heading = heading
                break
        
        if measurements_heading:
            measurements_text = []
            current = measurements_heading.find_next_sibling()
            while current:
                # Stop at next heading of same or higher level
                if current.name in ['h1', 'h2']:
                    break
                if current.name == 'h3' and 'Measurements' not in current.get_text():
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 10:  # Measurements can be shorter
                    measurements_text.append(text)
                
                current = current.find_next_sibling()
            
            if measurements_text:
                return '\n\n'.join(measurements_text)
        return None
    
    def extract_habitat_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract habitat information."""
        habitat_heading = None
        for heading in soup.find_all(['h2', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'^Habitat$', text, re.I):
                habitat_heading = heading
                break
        
        if habitat_heading:
            habitat_text = []
            current = habitat_heading.find_next_sibling()
            while current:
                if current.name in ['h2', 'h1']:
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 20:
                    habitat_text.append(text)
                
                current = current.find_next_sibling()
            
            if habitat_text:
                return '\n\n'.join(habitat_text)
        
        # Fallback method
        habitat_fallback = self._extract_fallback_section(soup, ['Habitat'])
        if habitat_fallback:
            return habitat_fallback
        
        return None
    
    def extract_vocalization_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract vocalization information."""
        vocal_heading = None
        for heading in soup.find_all(['h2', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'Sounds and Vocal Behavior', text, re.I):
                vocal_heading = heading
                break
        
        if vocal_heading:
            vocal_text = []
            current = vocal_heading.find_next_sibling()
            while current:
                if current.name in ['h2', 'h1']:
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 20:
                    vocal_text.append(text)
                
                current = current.find_next_sibling()
            
            if vocal_text:
                return '\n\n'.join(vocal_text)
        
        # Fallback method
        vocal_fallback = self._extract_fallback_section(soup, ['Sounds and Vocal Behavior', 'Vocalizations', 'Vocalization'])
        if vocal_fallback:
            return vocal_fallback
        
        return None
    
    def extract_diet_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract diet and foraging information."""
        diet_heading = None
        for heading in soup.find_all(['h2', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'Diet and Foraging', text, re.I):
                diet_heading = heading
                break
        
        if diet_heading:
            diet_text = []
            current = diet_heading.find_next_sibling()
            while current:
                if current.name in ['h2', 'h1']:
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 20:
                    diet_text.append(text)
                
                current = current.find_next_sibling()
            
            if diet_text:
                return '\n\n'.join(diet_text)
        
        # Fallback method
        diet_fallback = self._extract_fallback_section(soup, ['Diet and Foraging', 'Diet', 'Foraging'])
        if diet_fallback:
            return diet_fallback
        
        return None
    
    def extract_behavior_section(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract behavior information."""
        behavior_heading = None
        for heading in soup.find_all(['h2', 'h1']):
            text = heading.get_text(strip=True)
            if re.search(r'^Behavior$', text, re.I):
                behavior_heading = heading
                break
        
        if behavior_heading:
            behavior_text = []
            current = behavior_heading.find_next_sibling()
            while current:
                if current.name in ['h2', 'h1']:
                    break
                
                text = current.get_text(strip=True)
                if text and len(text) > 20:
                    behavior_text.append(text)
                
                current = current.find_next_sibling()
            
            if behavior_text:
                return '\n\n'.join(behavior_text)
        
        # Fallback method
        behavior_fallback = self._extract_fallback_section(soup, ['Behavior', 'Behaviour'])
        if behavior_fallback:
            return behavior_fallback
        
        return None
    
    def scrape_species(self, species_code: str, url: Optional[str] = None, 
                      species_name: str = None, scientific_name: str = None) -> Dict[str, any]:
        """
        Scrape all available information for a species.
        
        Args:
            species_code: The species code (e.g., 'bkpwar')
            url: Optional full URL (if provided, species_code is extracted from it)
            species_name: Optional common name (used to search if code doesn't work)
            scientific_name: Optional scientific name (used to search if code doesn't work)
        
        Returns:
            Dictionary with extracted traits organized by category
        """
        if url:
            species_code = self.get_species_code_from_url(url) or species_code
            identification_url = url
        else:
            identification_url = self.build_identification_url(species_code)
        
        print(f"Attempting to scrape: {species_code} from {identification_url}")
        
        soup = self.fetch_page(identification_url)
        
        # If identification page failed, try introduction page
        if not soup:
            print(f"Identification page not found, trying introduction page...")
            introduction_url = self.build_introduction_url(species_code)
            soup = self.fetch_page(introduction_url)
            if soup:
                identification_url = introduction_url  # Update URL for source tracking
                print(f"Successfully loaded introduction page for {species_code}")
        
        # If page fetch failed and we have species name, try searching for the correct code
        if not soup and (species_name or scientific_name):
            print(f"Initial attempt failed for {species_code}, trying to find correct Birds of the World code...")
            found_code = self.find_species_code_by_name(species_name or '', scientific_name)
            if found_code:
                print(f"Found Birds of the World code: {found_code} (original: {species_code})")
                # Try identification first
                identification_url = self.build_identification_url(found_code)
                soup = self.fetch_page(identification_url)
                # If that fails, try introduction
                if not soup:
                    introduction_url = self.build_introduction_url(found_code)
                    soup = self.fetch_page(introduction_url)
                    if soup:
                        identification_url = introduction_url
                        species_code = found_code
                else:
                    species_code = found_code
        
        if not soup:
            print(f"Failed to fetch page for {species_code}")
            if species_name:
                print(f"  Species: {species_name}")
            if scientific_name:
                print(f"  Scientific name: {scientific_name}")
            print(f"  Tried both /identification and /introduction pages")
            print(f"  You may need to manually find the correct Birds of the World URL for this species")
            return {}
        
        # Debug: Print what headings we found
        all_headings = soup.find_all(['h1', 'h2', 'h3'])
        if not all_headings:
            print(f"Warning: No headings found on page for {species_code}. Page may be empty or require authentication.")
            # Try to find any content at all
            main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=lambda x: x and 'content' in x.lower())
            if not main_content:
                print(f"No main content area found for {species_code}")
                return {}
        else:
            print(f"Found {len(all_headings)} headings on page for {species_code}")
            # Print first few headings for debugging
            heading_texts = [h.get_text(strip=True)[:50] for h in all_headings[:5]]
            print(f"  Sample headings: {heading_texts}")
        
        traits = {
            'species_code': species_code,
            'source_url': identification_url,
            'traits': {}
        }
        
        # Extract different sections
        identification_data = self.extract_identification_section(soup)
        if identification_data.get('identification'):
            traits['traits']['identification'] = {
                'title': 'Identification',
                'content': identification_data['identification'],
                'section': 'Identification'
            }
            print(f"  ✓ Extracted identification section for {species_code}")
        else:
            # Fallback: try to extract any identification-like content
            id_fallback = self._extract_fallback_section(soup, ['Identification', 'Field Identification', 'ID'])
            if id_fallback:
                traits['traits']['identification'] = {
                    'title': 'Identification',
                    'content': id_fallback,
                    'section': 'Identification'
                }
                print(f"  ✓ Extracted identification section (fallback method) for {species_code}")
        
        if identification_data.get('similar_species'):
            traits['traits']['similar_species'] = {
                'title': 'Similar Species',
                'content': identification_data['similar_species'],
                'section': 'Similar Species'
            }
            print(f"  ✓ Extracted similar species section for {species_code}")
        else:
            # Fallback: try to extract similar species content
            similar_fallback = self._extract_fallback_section(soup, ['Similar Species'])
            if similar_fallback:
                traits['traits']['similar_species'] = {
                    'title': 'Similar Species',
                    'content': similar_fallback,
                    'section': 'Similar Species'
                }
                print(f"  ✓ Extracted similar species section (fallback method) for {species_code}")
        
        plumage = self.extract_plumage_section(soup)
        if plumage:
            traits['traits']['plumage'] = {
                'title': 'Plumages, Molts, and Structure',
                'content': plumage,
                'section': 'Plumages'
            }
            print(f"  ✓ Extracted plumage section for {species_code}")
        
        measurements = self.extract_measurements_section(soup)
        if measurements:
            traits['traits']['measurements'] = {
                'title': 'Measurements',
                'content': measurements,
                'section': 'Measurements'
            }
            print(f"  ✓ Extracted measurements section for {species_code}")
        
        habitat = self.extract_habitat_section(soup)
        if habitat:
            traits['traits']['habitat'] = {
                'title': 'Habitat',
                'content': habitat,
                'section': 'Habitat'
            }
            print(f"  ✓ Extracted habitat section for {species_code}")
        
        vocalization = self.extract_vocalization_section(soup)
        if vocalization:
            traits['traits']['vocalization'] = {
                'title': 'Sounds and Vocal Behavior',
                'content': vocalization,
                'section': 'Vocalization'
            }
            print(f"  ✓ Extracted vocalization section for {species_code}")
        
        diet = self.extract_diet_section(soup)
        if diet:
            traits['traits']['diet'] = {
                'title': 'Diet and Foraging',
                'content': diet,
                'section': 'Diet'
            }
            print(f"  ✓ Extracted diet section for {species_code}")
        
        behavior = self.extract_behavior_section(soup)
        if behavior:
            traits['traits']['behavior'] = {
                'title': 'Behavior',
                'content': behavior,
                'section': 'Behavior'
            }
            print(f"  ✓ Extracted behavior section for {species_code}")
        
        if not traits['traits']:
            print(f"  ⚠ No traits extracted for {species_code} - page may have different structure or require authentication")
        else:
            print(f"  ✓ Successfully extracted {len(traits['traits'])} trait categories for {species_code}")
        
        return traits

