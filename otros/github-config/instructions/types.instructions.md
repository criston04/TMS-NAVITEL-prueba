---
description: "Use when creating, editing, or reviewing TypeScript type definitions, interfaces, DTOs, discriminated unions, or shared types. Covers type modeling patterns, common base types, and module type organization for TMS-NAVITEL."
applyTo: "src/types/**"
---

# Types & Type Modeling Instructions — TMS-NAVITEL

## Organization

One file per business module in `src/types/`:
- `order.ts`, `scheduling.ts`, `fleet.ts`, `monitoring.ts`, `finance.ts`, `maintenance.ts`, etc.
- `common.ts` — Shared base types: `BaseEntity`, `PaginatedResponse`, `SearchParams`, `CreateDTO<T>`, `UpdateDTO<T>`.
- `navigation.ts` — Nav item types with permission metadata.
- `index.ts` — Barrel re-exports.

## Base Types (from `common.ts`)

All entities extend `BaseEntity`. Use the established generics:

```typescript
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

type CreateDTO<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateDTO<T> = Partial<CreateDTO<T>>;

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface SearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: unknown;
}
```

## Type Modeling Rules

1. **No `any`**. Use `unknown` for truly unknown types, then narrow safely.
2. **Explicit at boundaries**: Props, service returns, and API responses must have explicit types.
3. **Inferred internally**: Let TypeScript infer within function bodies when the type is obvious.
4. **Discriminated unions** for multi-state flows:

```typescript
// ✅ Order status as discriminated union
type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';

interface Order extends BaseEntity {
  orderNumber: string;
  status: OrderStatus;
  customer: CustomerRef;
  // ...
}
```

5. **Prefer `interface` for objects** (extendable) and `type` for unions/intersections/aliases.
6. **No empty interfaces** — they add noise without value.
7. **Readonly when immutable**: Use `readonly` for props that should not be mutated.

## Module Type Pattern

Each module type file should contain:
- The main entity interface (extending `BaseEntity`)
- Related sub-types and enums (as string literal unions, not TypeScript `enum`)
- Filter/params types specific to the module
- Component prop interfaces (can also live in the component file if small)

```typescript
// types/order.ts
import { BaseEntity } from './common';

export type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled';
export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Order extends BaseEntity {
  orderNumber: string;
  status: OrderStatus;
  priority: OrderPriority;
  customerId: string;
  // ...
}

export interface OrderFilters {
  status?: OrderStatus;
  priority?: OrderPriority;
  dateFrom?: string;
  dateTo?: string;
}
```

## What to Avoid

- TypeScript `enum` — use string literal unions instead (better tree-shaking, simpler)
- Overly generic types that lose meaning (`Record<string, any>`)
- Duplicating types across modules — extract to `common.ts`
- Optional properties everywhere — be explicit about what's required vs optional
- Type assertions (`as`) — prefer type guards and narrowing
