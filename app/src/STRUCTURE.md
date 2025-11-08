# Application Structure

This document describes the restructured application architecture following React and Chakra UI best practices.

## Directory Structure

```
src/
├── api/                    # API layer - HTTP client and services
│   ├── client.ts          # HTTP client with configurable base URL and auth
│   ├── types.ts           # Centralized type definitions
│   └── services/          # API service implementations
│       ├── index.ts       # Service factory and exports
│       ├── player.service.ts
│       ├── game.service.ts
│       ├── species.service.ts
│       ├── country.service.ts
│       ├── language.service.ts
│       ├── taxonomy.service.ts
│       ├── challenge.service.ts
│       └── flag.service.ts
│
├── services/              # Business logic services
│   └── websocket.service.ts  # WebSocket connection management
│
├── contexts/              # React contexts for dependency injection
│   ├── services.context.tsx   # Provides API services
│   └── websocket.context.tsx  # Provides WebSocket service
│
├── hooks/                 # Custom React hooks
│   ├── use-countries.ts
│   ├── use-languages.ts
│   ├── use-tax-orders.ts
│   ├── use-tax-families.ts
│   └── index.ts
│
├── shared/                # Shared components and utilities
│   ├── components/        # Reusable UI components
│   │   ├── layout/        # Layout components (moved from pages/layout)
│   │   ├── forms/         # Form components
│   │   ├── ui/            # Basic UI components (buttons, inputs, etc.)
│   │   └── ...
│   ├── utils/             # Utility functions
│   └── constants/        # Constants and configuration
│
├── features/              # Feature-based modules
│   ├── auth/              # Authentication feature
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── game/              # Game feature
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   ├── challenge/         # Challenge feature
│   └── species/           # Species-related features
│
├── pages/                 # Page components (route handlers)
│   ├── home.tsx
│   ├── start.tsx
│   ├── join.tsx
│   └── ...
│
├── __tests__/             # Test utilities and mocks
│   ├── mocks/
│   │   ├── api.mock.ts
│   │   └── websocket.mock.ts
│   └── test-utils.tsx
│
├── core/                  # Core application logic (legacy - to be migrated)
├── components/            # Legacy components (to be reorganized)
├── user/                  # Legacy hooks (to be migrated to hooks/)
└── ...
```

## Key Principles

### 1. Separation of Concerns

- **API Layer** (`api/`): All HTTP communication is abstracted into services
- **Service Layer** (`services/`): Business logic and external integrations (WebSocket)
- **Context Layer** (`contexts/`): Dependency injection for services
- **Hooks Layer** (`hooks/`): Data fetching and state management hooks
- **Component Layer** (`shared/`, `features/`): UI components

### 2. Dependency Injection

Services are provided through React contexts, making them easily mockable for testing:

```typescript
// In tests
const mockServices = createMockServices();
render(<Component />, { services: mockServices });

// In production
<ServicesProvider>
  <App />
</ServicesProvider>
```

### 3. Testability

- All services implement interfaces, allowing easy mocking
- Test utilities provide pre-configured mocks
- Services can be injected at test time

### 4. Type Safety

- Centralized type definitions in `api/types.ts`
- Service interfaces ensure consistent API contracts
- TypeScript throughout

## Migration Guide

### Using Services in Components

**Before:**
```typescript
const response = await fetch('/api/player/', { ... });
```

**After:**
```typescript
const { player: playerService } = useServices();
const player = await playerService.createPlayer(name, language);
```

### Using Custom Hooks

**Before:**
```typescript
const [countries, setCountries] = useState([]);
useEffect(() => {
  fetch('/api/countries/').then(res => res.json()).then(setCountries);
}, []);
```

**After:**
```typescript
const { countries, loading, error } = useCountries();
```

### Testing with Mocks

```typescript
import { render, createMockServices, MockWebSocketService } from '../test-utils';

test('component renders correctly', () => {
  const mockServices = createMockServices();
  const mockWs = new MockWebSocketService();
  
  render(<MyComponent />, {
    services: mockServices,
    websocketService: mockWs,
  });
  
  // Test your component
});
```

## Next Steps

1. ✅ Create API service layer
2. ✅ Create WebSocket service
3. ✅ Create context providers for dependency injection
4. ✅ Create custom hooks
5. ⏳ Migrate existing components to use new services
6. ⏳ Reorganize components into shared/features structure
7. ⏳ Update context providers to use services
8. ⏳ Add comprehensive tests

