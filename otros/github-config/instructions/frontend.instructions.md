---
description: "Use when creating, editing, or reviewing React components, pages, layouts, hooks, or any UI code. Covers component architecture, accessibility, state management, styling with Tailwind CSS 4, shadcn/ui patterns, and React 19+ best practices for the TMS-NAVITEL frontend."
applyTo: "src/components/**,src/app/**,src/hooks/**,src/contexts/**"
---

# Frontend Instructions — TMS-NAVITEL

## Component Architecture

### Structure Pattern
Every component file must follow this order:
1. `'use client'` directive (only when needed — event handlers, hooks, browser APIs)
2. Imports (React, then `@/` aliases, then relative)
3. Types/interfaces
4. Constants specific to the component
5. Component definition with explicit `FC` or props type
6. Hooks first inside the component body
7. Handlers (with `useCallback` if passed as props to children)
8. Early returns for edge states
9. Clean JSX return

### Component Rules
- Keep components under ~150 lines. Extract sub-components or hooks when exceeding.
- Separation of concerns: presentational components receive data via props; container components use hooks for data fetching.
- Use `cn()` from `@/lib/utils` for all conditional class merging.
- Use cva from `class-variance-authority` for component variants.
- **Never modify `components/ui/`** — create wrappers in the module folder.

```typescript
// ✅ Module wrapper example
// components/orders/order-action-button.tsx
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderActionButtonProps extends ButtonProps {
  action: 'approve' | 'reject' | 'assign';
}

export const OrderActionButton = ({ action, className, ...props }: OrderActionButtonProps) => {
  const styles = {
    approve: 'bg-green-600 hover:bg-green-700',
    reject: 'bg-red-600 hover:bg-red-700',
    assign: 'bg-blue-600 hover:bg-blue-700',
  };
  return <Button className={cn(styles[action], className)} {...props} />;
};
```

### State Management
- Use `useState` for local UI state.
- Use React contexts (`src/contexts/`) for cross-component shared state (auth, locale, route-planner).
- Avoid prop drilling deeper than 2 levels — prefer composition or context.
- Use `useCallback` and `useMemo` only when there is a demonstrated performance need.

### Hooks Pattern
- All custom hooks use `use-` prefix in kebab-case filenames.
- Return typed objects (not tuples) with clear property names: `{ data, isLoading, error, refetch }`.
- Hooks that fetch data must return loading, error, and empty states.
- Follow the pattern from existing hooks in `src/hooks/`.

```typescript
// ✅ Hook pattern
interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useOrders = (filters?: OrderFilters): UseOrdersReturn => { ... };
```

## UI Quality Checklist

For every component, verify:
- [ ] Responsive behavior (mobile, tablet, desktop)
- [ ] Focus states for interactive elements
- [ ] `aria-label` / `aria-describedby` where needed
- [ ] Color contrast awareness (light + dark themes via next-themes)
- [ ] Meaningful empty states (not blank screens)
- [ ] Skeleton loading (prefer over blocking spinners) — use `src/components/skeletons/`
- [ ] Keyboard navigation for all interactive elements
- [ ] Explicit handling of: loading, empty, error, success states

## Styling Rules

- **Tailwind CSS only**. No `style={}`, no CSS-in-JS, no styled-components.
- Use design tokens from the Tailwind theme (colors, spacing, typography).
- Prefer responsive utilities (`sm:`, `md:`, `lg:`) over media queries.
- Dark mode: use `dark:` variant classes (next-themes handles the toggle).
- Animation: use `tw-animate-css` classes or Tailwind transitions. Framer Motion for complex sequences only.

## i18n

- All user-facing strings must be translatable via the i18n system (`src/locales/`).
- Configuration in `src/config/i18n.ts`. Default locale: `es`.
- Use the locale context from `src/contexts/locale-context.tsx`.

## What to Avoid in Frontend Code

- Business logic inside presentational components
- Untyped props or `any` in component interfaces
- State explosions (too many `useState` in one component)
- Effect abuse (`useEffect` for derived state — use computation instead)
- Hidden side effects in render functions
- Direct DOM manipulation (use refs only when strictly necessary)
- Inline event handlers that create new functions on every render (when passed to child components)
