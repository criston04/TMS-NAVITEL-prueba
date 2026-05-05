---
description: "Use when creating, editing, or reviewing test files. Covers Vitest configuration, React Testing Library patterns, MSW for API mocking, test structure, mock reuse from src/mocks/, and coverage requirements for TMS-NAVITEL."
applyTo: "src/tests/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx,vitest.config.ts"
---

# Testing Instructions — TMS-NAVITEL

## Stack

- **Runner**: Vitest 4+ (globals enabled)
- **DOM**: jsdom
- **Component testing**: React Testing Library
- **User simulation**: `@testing-library/user-event`
- **API mocking**: MSW 2+ (Mock Service Worker)
- **E2E**: Playwright
- **Setup**: `src/tests/setup.ts`
- **Coverage target**: 80% minimum

## Test Structure

```
src/tests/
├── setup.ts                    # Global test setup
├── utils/                      # Custom render, mock helpers
│   ├── render.tsx              # Render with providers (auth, locale, theme)
│   └── mocks.ts                # Shared mock factories
├── unit/
│   ├── components/             # Component behavior tests
│   ├── hooks/                  # Hook logic tests
│   └── utils/                  # Utility function tests
├── integration/                # Cross-module workflow tests
└── services/                   # Service + API contract tests
```

## Principles

1. **Test behavior, not implementation**. Assert what the user sees and does, not internal state.
2. **Reuse existing mocks** from `src/mocks/`. Don't create duplicate mock data.
3. **No `any` in tests**. Type mocks and fixtures explicitly.
4. **No Enzyme**. Use React Testing Library exclusively.
5. **No direct fetch mocking**. Use MSW to intercept network requests.
6. **No snapshot tests for logic**. Only for static UI when justified.
7. **Deterministic tests**. No reliance on timing, network, or randomness.
8. **Independent tests**. Each test must be runnable in isolation.

## Component Testing Pattern

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderCard } from '@/components/orders/order-card';
import { mockOrders } from '@/mocks/orders/orders.mock';

describe('OrderCard', () => {
  const order = mockOrders[0];

  it('renders order number and customer', () => {
    render(<OrderCard order={order} />);
    expect(screen.getByText(order.orderNumber)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    render(<OrderCard order={order} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('article'));
    expect(onSelect).toHaveBeenCalledWith(order);
  });

  it.each(['pending', 'in_transit', 'completed'] as const)(
    'displays correct badge for %s status',
    (status) => {
      render(<OrderCard order={{ ...order, status }} />);
      // Assert visible status indicator
    }
  );
});
```

## Hook Testing Pattern

```typescript
import { renderHook, waitFor } from '@testing-library/react';

describe('useOrders', () => {
  it('returns loading state initially', () => {
    const { result } = renderHook(() => useOrders());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.orders).toEqual([]);
  });

  it('returns orders after fetch', async () => {
    const { result } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.orders).toHaveLength(expect.any(Number));
  });
});
```

## Service Testing Pattern

Use MSW to intercept HTTP calls:

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/orders', () => {
    return HttpResponse.json({ data: mockOrders, total: mockOrders.length });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Coverage Categories

Prioritize tests in this order:
1. **Services**: Contract and mock-switching correctness
2. **Hooks**: State transitions, error handling, data transformation
3. **Integration**: Cross-module workflows (Orders → Workflows → Scheduling)
4. **Components**: User interaction, state rendering, accessibility
5. **Utils**: Edge cases in utility functions

## Commands

```bash
npm run test              # Single run
npm run test:watch        # Watch mode
npm run test:route-planner # Module-specific run
```

## What to Avoid

- Brittle snapshot abuse
- Tests coupled to CSS class names or DOM structure
- Asserting private/internal state
- Over-mocking internal code paths (mock only external boundaries)
- Fake coverage with low-value tests
- `console.log` in test files
