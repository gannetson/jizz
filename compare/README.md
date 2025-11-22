# Compare App

A Django app for extracting species traits from Birds of the World and generating AI-powered comparisons between species, families, or orders.

## Features

- **Species Trait Extraction**: Scrape and store detailed species information from [Birds of the World](https://birdsoftheworld.org)
- **AI-Powered Comparisons**: Generate detailed comparisons between two species using OpenAI GPT models
- **Structured Data**: Store traits organized by category (plumage, behavior, habitat, etc.)
- **REST API**: Full API endpoints for accessing traits and comparisons
- **Management Commands**: Easy-to-use commands for scraping and generating comparisons

## Models

### SpeciesTrait
Stores extracted traits and characteristics of species from Birds of the World.

**Fields:**
- `species`: Foreign key to Species
- `category`: Category of trait (size, plumage, behavior, habitat, etc.)
- `title`: Short title/heading
- `content`: Detailed description
- `source_url`: URL from Birds of the World
- `section`: Section name from source
- `is_verified`: Whether manually verified

### SpeciesComparison
Stores AI-generated comparisons between species, families, or orders.

**Fields:**
- `comparison_type`: Type of comparison (species, family, order, etc.)
- `species_1`, `species_2`: Species being compared (if applicable)
- `family_1`, `family_2`: Families being compared (if applicable)
- `order_1`, `order_2`: Orders being compared (if applicable)
- `summary`: Brief summary of key differences
- `detailed_comparison`: Full comparison text
- Structured sections: `size_comparison`, `plumage_comparison`, `behavior_comparison`, etc.
- `identification_tips`: Tips for distinguishing between the two
- `ai_model`: AI model used (default: gpt-4)
- `is_verified`: Whether manually verified

### ComparisonRequest
Tracks requests for generating comparisons.

## API Endpoints

### Traits
- `GET /api/compare/traits/` - List all traits
- `GET /api/compare/traits/{id}/` - Get specific trait
- Query parameters:
  - `species_id`: Filter by species ID
  - `category`: Filter by category

### Comparisons
- `GET /api/compare/comparisons/` - List all comparisons
- `GET /api/compare/comparisons/{id}/` - Get specific comparison
- Query parameters:
  - `species_1_id`: Filter by first species
  - `species_2_id`: Filter by second species
  - `comparison_type`: Filter by type

### Comparison Requests
- `POST /api/compare/request/` - Create a new comparison request
  - Body: `{ "comparison_type": "species", "species_1_id": 1, "species_2_id": 2 }`
- `GET /api/compare/request/` - List your comparison requests

### Scraping
- `POST /api/compare/scrape/` - Scrape species data from Birds of the World
  - Body: `{ "species_id": 1 }` or `{ "species_code": "bkpwar" }` or `{ "url": "..." }`

## Management Commands

### Scrape Species Data

Scrape species data from Birds of the World:

```bash
# Scrape a specific species by ID
python manage.py scrape_species --species-id 1

# Scrape by species code
python manage.py scrape_species --species-code bkpwar

# Scrape from a specific URL
python manage.py scrape_species --species-code bkpwar --url https://birdsoftheworld.org/bow/species/bkpwar/cur/identification

# Update existing traits
python manage.py scrape_species --species-id 1 --update

# Scrape all species (use with caution!)
python manage.py scrape_species --all
```

### Generate Comparisons

Generate AI-powered comparisons between species:

```bash
# Generate comparison by species IDs
python manage.py generate_comparison --species-1-id 1 --species-2-id 2

# Generate comparison by species codes
python manage.py generate_comparison --species-1-code bkpwar --species-2-code btbwar

# Force regeneration even if comparison exists
python manage.py generate_comparison --species-1-id 1 --species-2-id 2 --force
```

## Setup

1. **Install dependencies:**
   ```bash
   pip install beautifulsoup4 openai
   ```

2. **Set OpenAI API key:**
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```
   Or add to your Django settings/local.py:
   ```python
   OPENAI_API_KEY = 'your_api_key_here'
   ```

3. **Run migrations:**
   ```bash
   python manage.py makemigrations compare
   python manage.py migrate
   ```

4. **Scrape some species data:**
   ```bash
   python manage.py scrape_species --species-code bkpwar
   ```

5. **Generate a comparison:**
   ```bash
   python manage.py generate_comparison --species-1-code bkpwar --species-2-code btbwar
   ```

## Usage Example

### 1. Scrape Species Traits

First, scrape trait data for the species you want to compare:

```bash
python manage.py scrape_species --species-code bkpwar
python manage.py scrape_species --species-code btbwar
```

### 2. Generate Comparison via API

```python
import requests

# Create a comparison request
response = requests.post('http://localhost:8000/api/compare/request/', json={
    'comparison_type': 'species',
    'species_1_id': 1,
    'species_2_id': 2
})

comparison = response.json()
print(comparison['summary'])
print(comparison['identification_tips'])
```

### 3. Generate Comparison via Command

```bash
python manage.py generate_comparison --species-1-id 1 --species-2-id 2
```

## Scraper Details

The scraper extracts the following sections from Birds of the World:

- **Identification**: Main identification characteristics
- **Similar Species**: Information about similar species
- **Plumages**: Plumage descriptions and molts
- **Measurements**: Size and measurement data
- **Habitat**: Habitat preferences
- **Vocalization**: Sounds and calls
- **Diet**: Diet and foraging behavior
- **Behavior**: General behavior patterns

## AI Comparison Service

The AI service uses OpenAI's GPT models (default: GPT-4) to generate comprehensive comparisons. The service:

1. Takes trait data from both species
2. Builds a detailed prompt with structured information
3. Generates a comparison covering:
   - Summary
   - Size comparison
   - Plumage comparison
   - Behavior comparison
   - Habitat comparison
   - Vocalization comparison
   - Identification tips

## Future Enhancements

- Support for family and order comparisons
- Batch processing for multiple comparisons
- Caching and rate limiting
- Quality scoring and feedback
- Integration with Celery for async processing
- Support for other AI providers (Anthropic, etc.)

## Notes

- The scraper respects the structure of Birds of the World website and may need updates if the site structure changes
- AI comparisons require an OpenAI API key and will incur API costs
- For production use, consider implementing rate limiting and caching
- The scraper includes basic error handling but may need additional robustness for large-scale scraping

