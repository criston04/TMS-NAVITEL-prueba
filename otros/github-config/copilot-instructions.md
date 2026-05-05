# TMS-NAVITEL — Copilot Instructions

You are working in a production-oriented fullstack TMS (Transport Management System) codebase called **Navitel**.

## Stack

- **Framework**: Next.js 16+ (App Router, Turbopack)
- **Language**: TypeScript 5+ (strict mode)
- **React**: 19+ (React Compiler enabled)
- **Styling**: Tailwind CSS 4 (no CSS inline, no styled-components)
- **UI primitives**: Radix UI via shadcn/ui pattern (`components/ui/`)
- **Icons**: Lucide React
- **Variants**: class-variance-authority (cva) + clsx + tailwind-merge
- **Maps**: Leaflet + React-Leaflet 5
- **Charts**: Recharts 3
- **Forms**: React Hook Form + Zod 4
- **Testing**: Vitest + React Testing Library + MSW + Playwright
- **i18n**: Custom system (`src/locales/`, `src/config/i18n.ts`) — Spanish (default) + English
- **Theming**: next-themes (light/dark)

## Architecture

Feature-first modular structure. Each business module (orders, scheduling, monitoring, finance, etc.) has its own folder under `components/`, a page under `app/(dashboard)/`, a service under `services/`, types under `types/`, hooks under `hooks/`, and mocks under `mocks/`.

```
src/
├── app/(auth)/           # Auth routes (login, register)
├── app/(dashboard)/      # All dashboard routes per module
├── components/ui/        # shadcn/ui primitives — NEVER add business logic here
├── components/<module>/  # Feature components per module
├── services/             # API services extending base.service.ts
├── hooks/                # Custom hooks (use- prefix)
├── contexts/             # React contexts (auth, locale, route-planner, customer-categories)
├── types/                # TypeScript type definitions per module
├── config/               # App configuration (api, navigation, i18n)
├── mocks/                # Mock data for development and testing
├── locales/              # Translation files
├── lib/                  # Utilities (cn(), api client)
└── tests/                # Centralized test files
```

## Core Behavior

- Prioritize correctness over speed.
- Prefer small, reversible, low-risk changes.
- Reuse existing patterns in the repository before introducing new abstractions.
- Follow existing naming conventions and file organization consistently.
- If critical context is missing, ask before making architectural assumptions.
- Do not generate placeholder or demo code presented as production-ready.

## Mandatory Conventions

### TypeScript
- **No `any`**. Always define explicit or inferred types.
- **No `var`**. Use `const` by default; `let` only when reassignment is necessary.
- Use strict typing at module boundaries (props, service returns, API responses).
- Prefer discriminated unions for multi-state flows.
- Narrow `unknown` values safely.

### Imports
- **Always use the `@/` alias** for imports. No deep relative paths (`../../..`).
- Use barrel exports (`index.ts`) per module folder.

### Components
- **No UI components from scratch** — use/extend `components/ui/` (shadcn/ui).
- Keep components small with single responsibility.
- Handle all states explicitly: loading, empty, error, success.
- Separate data-fetching hooks from presentational components.
- Use semantic HTML and ensure keyboard accessibility + ARIA attributes.

### Services
- All services extend or follow the pattern in `services/base.service.ts`.
- Services check `apiConfig.useMocks` to switch between mock and real API.
- Keep business logic in hooks/services, not in components.

### Styling
- **Tailwind CSS only**. No CSS inline, no styled-components.
- Use `cn()` from `@/lib/utils` for conditional class merging.
- Use cva for component variants.

### Forms
- Use React Hook Form + Zod schemas for validation.
- Handle: validation errors, disabled states, submit loading, field-level errors.

### Testing
- Tests go in `src/tests/` following the established structure.
- Reuse mocks from `src/mocks/`.
- Test behavior, not implementation.
- Use MSW for API mocking, not direct fetch mocking.
- Run: `npm run test` (Vitest), `npm run test:watch` (watch mode).

## Build and Dev

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest run
npm run test:watch   # Vitest watch
```

## Code Change Protocol

Before proposing implementation:
1. Summarize understanding in short bullets.
2. List files likely affected.
3. Identify risks/edge cases.
4. State the recommended approach briefly.

When providing code:
1. Keep it minimal but complete.
2. Preserve repository conventions (naming, structure, patterns).
3. Mention assumptions.
4. Include validation and error handling where needed.
5. Suggest tests.

## What to Avoid

- Giant refactors without request
- Hidden breaking changes
- Inconsistent naming or file placement
- Duplicated business rules across layers
- Silent error swallowing
- Weak typing or `any` usage
- Fake placeholder implementations
- New libraries when existing tools suffice
- Modifying `components/ui/` directly — create wrappers in the module folder
- `console.log` in committed code
- Hardcoded secrets, tokens, or credentials
