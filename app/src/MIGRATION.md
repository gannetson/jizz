# Migration Guide

This guide shows how to migrate existing code to use the new service-based architecture.

## Overview

The new structure separates concerns into:
- **API Services**: Handle all HTTP requests
- **WebSocket Service**: Handles WebSocket connections
- **Custom Hooks**: Provide data fetching with loading/error states
- **Context Providers**: Inject services for dependency injection

## Step-by-Step Migration

### Step 1: Replace Direct API Calls with Services

**Before (in context provider):**
```typescript
const createPlayer = async () => {
  const response = await fetch('/api/player/', {
    method: 'POST',
    headers: { ...noCacheHeaders },
    body: JSON.stringify({ name: playerName, language: language })
  })
  const data = await response.json();
  // ...
}
```

**After:**
```typescript
import { useServices } from '../contexts/services.context';

const { player: playerService } = useServices();

const createPlayer = async () => {
  const data = await playerService.createPlayer(playerName, language);
  // ...
}
```

### Step 2: Replace Custom Hooks

**Before:**
```typescript
// user/use-countries.tsx
export const UseCountries = () => {
  const [countries, setCountries] = useState<Country[]>([])
  useEffect(() => {
    fetch(`/api/countries/`)
      .then((res) => res.json())
      .then((data) => setCountries(data));
  }, [])
  return { countries }
}
```

**After:**
```typescript
// hooks/use-countries.ts (already created)
import { useCountries } from '../hooks';

const { countries, loading, error } = useCountries();
```

### Step 3: Update Context Providers

**Before:**
```typescript
// Direct fetch calls in provider
const AppContextProvider = ({ children }) => {
  const createPlayer = async () => {
    const response = await fetch('/api/player/', { ... });
    // ...
  }
  // ...
}
```

**After:**
```typescript
// Use services from context
import { useServices } from '../contexts/services.context';

const AppContextProvider = ({ children }) => {
  const services = useServices();
  
  const createPlayer = async () => {
    const player = await services.player.createPlayer(name, language);
    // ...
  }
  // ...
}
```

### Step 4: Update WebSocket Usage

**Before:**
```typescript
// Direct WebSocket in provider
const ws = new WebSocket(socketUrl);
ws.onopen = () => { ... };
ws.onmessage = (event) => { ... };
```

**After:**
```typescript
// Use WebSocket service
import { useWebSocketService } from '../contexts/websocket.context';

const wsService = useWebSocketService();
const ws = wsService.connect(game, player, language, {
  onPlayersUpdate: (players) => setPlayers(players),
  onNewQuestion: (question) => setQuestion(question),
  // ...
});
```

### Step 5: Update App Setup

**Before:**
```typescript
<AppContextProvider>
  <WebsocketContextProvider>
    <MainContent />
  </WebsocketContextProvider>
</AppContextProvider>
```

**After:**
```typescript
<ServicesProvider>
  <WebSocketServiceProvider>
    <AppContextProvider>
      <WebsocketContextProvider>
        <MainContent />
      </WebsocketContextProvider>
    </AppContextProvider>
  </WebSocketServiceProvider>
</ServicesProvider>
```

## Example: Migrating a Component

### Before
```typescript
// components/select-country.tsx
export function SelectCountry() {
  const [countries, setCountries] = useState([]);
  
  useEffect(() => {
    fetch('/api/countries/')
      .then(res => res.json())
      .then(setCountries);
  }, []);
  
  return <Select options={countries} />;
}
```

### After
```typescript
// components/select-country.tsx
import { useCountries } from '../hooks';

export function SelectCountry() {
  const { countries, loading, error } = useCountries();
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <Select options={countries} />;
}
```

## Testing Migration

### Before
```typescript
// Hard to test - real API calls
test('component loads countries', async () => {
  render(<SelectCountry />);
  // Wait for real API call...
});
```

### After
```typescript
// Easy to test - mock services
import { render, createMockServices } from '../test-utils';

test('component loads countries', async () => {
  const mockServices = createMockServices();
  mockServices.country.getCountries = jest.fn().mockResolvedValue([
    { code: 'NL', name: 'Netherlands' }
  ]);
  
  render(<SelectCountry />, { services: mockServices });
  // Test with mocked data
});
```

## Benefits

1. **Testability**: All services are mockable
2. **Maintainability**: API changes only affect service layer
3. **Reusability**: Services can be used across components
4. **Type Safety**: Centralized types ensure consistency
5. **Error Handling**: Consistent error handling in hooks
6. **Loading States**: Built-in loading states in hooks

## Next Steps

1. Start with low-level hooks (useCountries, useLanguages)
2. Migrate context providers to use services
3. Update components to use new hooks
4. Move layout components to shared/
5. Organize feature-specific components

