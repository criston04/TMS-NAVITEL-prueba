---
description: "Use when creating, editing, or reviewing API services, the base service, API client, or mock/real API integration. Covers service patterns, mock switching via apiConfig, DTOs, error handling, and the IBaseService/IBulkService contracts in TMS-NAVITEL."
applyTo: "src/services/**,src/lib/api.*,src/config/api.config.ts"
---

# Services & API Layer Instructions — TMS-NAVITEL

## Service Architecture

All services follow the pattern established in `src/services/base.service.ts`:
- Implement `IBaseService<T>` (CRUD) or `IBulkService<T>` (CRUD + import/export/bulk).
- Use `BaseEntity` from `src/types/common` as the base type constraint.
- Return typed `PaginatedResponse<T>` for list operations.
- Accept `SearchParams` for filtering, sorting, and pagination.

## Mock/Real API Switching

Services must check `apiConfig.useMocks` to decide the data source:

```typescript
import { apiConfig } from '@/config/api.config';
import { apiClient } from '@/lib/api';

class OrderService implements IBaseService<Order> {
  async getAll(params?: SearchParams): Promise<PaginatedResponse<Order>> {
    if (apiConfig.useMocks) {
      return getMockOrders(params);  // from src/mocks/
    }
    return apiClient.get<PaginatedResponse<Order>>('/orders', { params });
  }
}
```

- Mock data lives in `src/mocks/` organized by module.
- The `NEXT_PUBLIC_USE_MOCKS` env var overrides default mock behavior.
- Never hardcode `useMocks: true/false` inside service methods — always delegate to `apiConfig`.

## Service Rules

1. **One service per business module**: `orders/`, `scheduling/`, `finance/`, etc.
2. **Thin services**: Services handle API communication and mock switching. Business logic belongs in hooks or dedicated use-case functions.
3. **Typed DTOs**: Use `CreateDTO<T>` and `UpdateDTO<T>` from `src/types/common` for mutation inputs.
4. **Consistent error handling**: Catch and rethrow with meaningful context. Never swallow errors silently.
5. **No direct fetch calls** in components — always go through a service.
6. **Barrel exports**: Each service module folder must have an `index.ts`.

## API Client (`src/lib/api`)

- Centralized HTTP client with interceptors for auth, error formatting, and timeout.
- Timeout configured per environment in `src/config/api.config.ts`.
- All requests go through this client — no raw `fetch()` calls in services.

## Endpoint Organization

Endpoints are organized by module in `apiConfig.endpoints` (defined in `src/config/api.config.ts`):
- Follow Open/Closed Principle: add new modules without modifying existing code.
- Use RESTful naming: `/orders`, `/orders/:id`, `/orders/:id/status`.

## What to Avoid

- Business logic inside service classes (move to hooks/use-cases)
- Returning raw API responses without typing
- Mixing mock logic and real API logic in the same code path
- Hardcoding URLs — use `apiConfig.endpoints`
- Exposing internal error details to the UI layer
- Creating services that don't follow the `IBaseService` interface pattern
