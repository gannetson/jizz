# Compare App - Implementation Plan

## Overview
The compare app extracts species traits from Birds of the World and uses AI to generate detailed comparisons between species, families, or orders to help birdwatchers identify and distinguish between similar birds.

## Architecture

### 1. Data Models
- **SpeciesTrait**: Stores extracted traits organized by category
- **SpeciesComparison**: Stores AI-generated comparison texts
- **ComparisonRequest**: Tracks comparison generation requests

### 2. Scraper Module
- **BirdsOfTheWorldScraper**: Extracts data from https://birdsoftheworld.org
  - Parses HTML using BeautifulSoup
  - Extracts sections: Identification, Plumages, Habitat, Vocalization, etc.
  - Handles different page structures

### 3. AI Service
- **AIComparisonService**: Generates comparisons using OpenAI GPT models
  - Builds structured prompts from trait data
  - Parses AI responses into structured sections
  - Supports species, family, and order comparisons

### 4. API Endpoints
- RESTful API using Django REST Framework
- Endpoints for traits, comparisons, and scraping
- Request/response serialization

### 5. Management Commands
- `scrape_species`: Scrape species data from Birds of the World
- `generate_comparison`: Generate AI comparisons between species

## Data Flow

1. **Scraping Phase:**
   ```
   User/Command → Scraper → Birds of the World → Parse HTML → Store Traits
   ```

2. **Comparison Generation:**
   ```
   API Request → Get Traits for Both Species → AI Service → Generate Comparison → Store & Return
   ```

3. **Retrieval:**
   ```
   API Request → Query Database → Return Comparison
   ```

## Key Features

### Scraping
- Extracts multiple sections from Birds of the World
- Categorizes traits (plumage, behavior, habitat, etc.)
- Stores source URLs for reference
- Supports updates to existing traits

### AI Comparison
- Uses GPT-4 by default (configurable)
- Generates structured comparisons with:
  - Summary
  - Size comparison
  - Plumage comparison
  - Behavior comparison
  - Habitat comparison
  - Vocalization comparison
  - Identification tips
- Handles missing trait data gracefully

### API Design
- RESTful endpoints
- Filtering and querying support
- Error handling
- Authentication support (optional)

## Future Enhancements

1. **Async Processing**: Use Celery for background comparison generation
2. **Caching**: Cache comparisons to reduce API calls
3. **Rate Limiting**: Protect against abuse
4. **Quality Scoring**: Evaluate comparison quality
5. **Batch Operations**: Process multiple comparisons at once
6. **Alternative AI Providers**: Support Anthropic, local models, etc.
7. **Visual Comparisons**: Add image-based comparisons
8. **User Feedback**: Allow users to rate/improve comparisons

## Dependencies

- `beautifulsoup4`: HTML parsing
- `openai`: AI comparison generation
- `requests`: HTTP requests for scraping

## Configuration

- `OPENAI_API_KEY`: Required for AI comparisons
- `AI_MODEL`: Default model (default: 'gpt-4')

## Database Schema

### SpeciesTrait
- Links to Species model
- Category-based organization
- Source tracking

### SpeciesComparison
- Flexible comparison types
- Structured comparison sections
- AI metadata tracking

### ComparisonRequest
- Request tracking
- Status management
- Error logging

## Testing Strategy

1. **Unit Tests**: Test scraper parsing, AI service prompt building
2. **Integration Tests**: Test full comparison generation flow
3. **API Tests**: Test all endpoints
4. **Mock Tests**: Mock external API calls

## Deployment Considerations

1. **Rate Limiting**: Implement for OpenAI API
2. **Error Handling**: Robust error handling for scraping failures
3. **Monitoring**: Track comparison generation success rates
4. **Cost Management**: Monitor OpenAI API usage
5. **Data Quality**: Implement verification workflows

