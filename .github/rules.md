# Guía de Desarrollo Frontend - TMS Navitel

## Stack Tecnológico

### Core
- **Framework**: Next.js 16+ (App Router)
- **Lenguaje**: TypeScript 5+ (strict mode)
- **React**: 19+ (con React Compiler)
- **Estilos**: Tailwind CSS 4

### UI Components
- **Primitivos**: Radix UI (shadcn/ui pattern)
  - `@radix-ui/react-checkbox`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-tooltip`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-avatar`
  - `@radix-ui/react-progress`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slot`
- **Iconos**: Lucide React
- **Variantes**: class-variance-authority (cva)
- **Merge de clases**: clsx + tailwind-merge

### Visualización
- **Mapas**: Leaflet + React-Leaflet 5
- **Gráficos**: Recharts 3
- **Temas**: next-themes

### Utilidades
- **Animaciones**: tw-animate-css

## Restricciones
- **No utilizar `any` en TypeScript.** Siempre definir tipos explícitos o inferidos.
- **No utilizar CSS inline ni styled-components.** Usar exclusivamente Tailwind CSS.
- **No utilizar `var`.** Usar `const` por defecto, `let` solo cuando sea necesario.
- **No mezclar lógica de negocio con lógica de presentación.**
- **No usar imports relativos profundos.** Usar alias `@/` siempre.
- **No crear componentes UI desde cero.** Usar/extender los de `components/ui/`.

---

## Principios de Arquitectura

### Alta Cohesión
Cada módulo, componente o función debe tener una **única responsabilidad bien definida**:

```typescript
// ✅ CORRECTO - Alta cohesión
// hooks/useUser.ts - Solo maneja estado del usuario
export const useUser = () => { ... }

// services/userService.ts - Solo operaciones API de usuario
export const userService = { ... }

// components/UserProfile.tsx - Solo renderiza perfil
export const UserProfile = () => { ... }

// ❌ INCORRECTO - Baja cohesión
// components/UserProfile.tsx - Mezcla API, estado global y UI
export const UserProfile = () => {
  const fetchUser = async () => { ... } // Lógica de API
  const updateGlobalState = () => { ... } // Estado global
  return <div>...</div> // UI
}
```

### Bajo Acoplamiento
Los componentes deben ser **independientes y reutilizables**:

```typescript
// ✅ CORRECTO - Bajo acoplamiento (inyección de dependencias)
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ onClick, children, variant = 'primary' }: ButtonProps) => (
  <button onClick={onClick} className={buttonVariants[variant]}>
    {children}
  </button>
);

// ❌ INCORRECTO - Alto acoplamiento (dependencia directa)
export const SubmitButton = () => {
  const { submitForm } = useFormContext(); // Acoplado al contexto
  return <button onClick={submitForm}>Enviar</button>;
}
```

---

## Estructura de Proyecto

```
src/
├── app/                          # App Router de Next.js
│   ├── globals.css               # Estilos globales
│   ├── layout.tsx                # Layout raíz
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   └── (dashboard)/              # Grupo de rutas del dashboard
│       ├── layout.tsx            # Layout con sidebar/navbar
│       ├── loading.tsx           # Loading state
│       ├── page.tsx              # Dashboard principal
│       ├── fleet/                # Módulo: Flota
│       │   ├── page.tsx
│       │   `── loading.tsx`
│       ├── orders/               # Módulo: Órdenes
│       │   ├── page.tsx
│       │   ├── [id]/
│       │   │   └── page.tsx
│       │   └── loading.tsx
│       ├── scheduling/           # Módulo: Programación
│       │   ├── page.tsx
│       │   └── loading.tsx
│       └── tracking/             # Módulo: Seguimiento GPS
│           ├── page.tsx
│           └── loading.tsx
│
├── components/
│   ├── ui/                       # Primitivos UI (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── checkbox.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── skeleton.tsx
│   │   └── ...
│   ├── layout/                   # Componentes de layout
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   ├── nav-link.tsx
│   │   └── nav-group.tsx
│   ├── brand/                    # Identidad visual
│   │   └── navitel-logo.tsx
│   ├── dashboard/                # Componentes del dashboard
│   │   ├── stat-card.tsx
│   │   ├── vehicle-overview.tsx
│   │   ├── shipment-statistics.tsx
│   │   ├── activity-feed.tsx
│   │   ├── dashboard-map-widget.tsx
│   │   └── dashboard-skeleton.tsx
│   ├── fleet/                    # Componentes de flota
│   │   ├── index.ts              # Barrel export
│   │   ├── vehicle-card.tsx
│   │   ├── vehicle-list.tsx
│   │   └── fleet-map.tsx
│   ├── orders/                   # Componentes de órdenes
│   │   ├── index.ts
│   │   ├── order-card.tsx
│   │   ├── order-list.tsx
│   │   ├── order-table.tsx
│   │   ├── order-filters.tsx
│   │   └── order-detail.tsx
│   ├── scheduling/               # Componentes de programación
│   │   ├── index.ts
│   │   ├── scheduling-calendar.tsx
│   │   ├── scheduling-sidebar.tsx
│   │   ├── scheduling-timeline.tsx
│   │   └── assignment-modal.tsx
│   └── skeletons/                # Skeletons reutilizables
│       └── index.tsx
│
├── hooks/                        # Custom hooks
│   ├── use-navigation.ts
│   ├── use-orders.ts
│   ├── use-fleet.ts
│   └── use-scheduling.ts
│
├── services/                     # Servicios de API
│   ├── api-client.ts             # Cliente HTTP base
│   ├── order-service.ts
│   ├── fleet-service.ts
│   └── scheduling-service.ts
│
├── contexts/                     # React Contexts
│   ├── auth-context.tsx
│   └── locale-context.tsx
│
├── types/                        # Tipos TypeScript
│   ├── order.ts
│   ├── fleet.ts
│   ├── scheduling.ts
│   ├── navigation.ts
│   └── common.ts
│
├── lib/                          # Utilidades
│   └── utils.ts                  # cn() y helpers
│
├── config/                       # Configuración
│   ├── navigation.ts
│   └── i18n.ts
│
├── locales/                      # Internacionalización
│   └── translations.ts
│
├── styles/                       # Estilos adicionales
│   └── leaflet-custom.css
│
└── mocks/                        # Datos mock para desarrollo
    ├── orders.ts
    ├── fleet.ts
    └── scheduling.ts
```

### Principios de la Estructura

1. **Feature-First:** Cada módulo de negocio (`orders/`, `fleet/`, `scheduling/`) tiene su propia carpeta en `components/` y su página en `app/(dashboard)/`.

2. **Barrel Exports:** Cada módulo usa `index.ts` para exportaciones limpias:
   ```typescript
   // components/orders/index.ts
   export { OrderCard } from './order-card';
   export { OrderList } from './order-list';
   export { OrderTable } from './order-table';
   ```

3. **Colocation:** Los componentes viven cerca de donde se usan. Los que son específicos de un módulo van en su carpeta.

4. **Primitivos Separados:** `components/ui/` solo contiene componentes genéricos sin lógica de negocio (shadcn/ui).

---

## Reglas de Código Limpio

### 1. Nomenclatura

```typescript
// Componentes: PascalCase
export const UserProfile = () => { ... }

// Hooks: camelCase con prefijo "use"
export const useUserData = () => { ... }

// Funciones y variables: camelCase
const handleSubmit = () => { ... }
const userData = { ... }

// Constantes: SCREAMING_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Tipos e Interfaces: PascalCase con sufijo descriptivo
interface UserResponse { ... }
type ButtonVariant = 'primary' | 'secondary';

// Eventos de tracking: snake_case
const TRACKING_EVENTS = {
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
} as const;
```

### 2. Componentes

```typescript
// ✅ Estructura de componente ideal
'use client'; // Solo si es necesario

import { type FC, useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { useTracking } from '@/tracking/hooks/useTracking';

// 1. Tipos al inicio
interface CardProps {
  title: string;
  description?: string;
  onAction?: () => void;
  className?: string;
}

// 2. Constantes específicas del componente
const DEFAULT_DESCRIPTION = 'Sin descripción';

// 3. Componente con tipado explícito
export const Card: FC<CardProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  onAction,
  className,
}) => {
  // 4. Hooks primero
  const { trackEvent } = useTracking();
  const [isExpanded, setIsExpanded] = useState(false);

  // 5. Handlers con useCallback si se pasan como props
  const handleClick = useCallback(() => {
    trackEvent('card_click', { title });
    onAction?.();
  }, [trackEvent, title, onAction]);

  // 6. Early returns para estados especiales
  if (!title) return null;

  // 7. Render limpio
  return (
    <article
      className={cn(
        'rounded-lg border border-gray-200 p-4 shadow-sm',
        'hover:shadow-md transition-shadow duration-200',
        className
      )}
      onClick={handleClick}
    >
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </article>
  );
};
```

### 3. Custom Hooks

```typescript
// ✅ Hook bien estructurado
import { useState, useEffect, useCallback } from 'react';
import { userService } from '@/services/userService';
import type { User } from '@/types/user';

interface UseUserOptions {
  enabled?: boolean;
}

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useUser = (
  userId: string,
  options: UseUserOptions = {}
): UseUserReturn => {
  const { enabled = true } = options;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await userService.getById(userId);
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, isLoading, error, refetch: fetchUser };
};
```

### 4. Servicios

```typescript
// ✅ Servicio con responsabilidad única
import { apiClient } from '@/config/apiClient';
import type { User, CreateUserDTO, UpdateUserDTO } from '@/types/user';

class UserService {
  private readonly basePath = '/users';

  async getAll(): Promise<User[]> {
    const response = await apiClient.get<User[]>(this.basePath);
    return response.data;
  }

  async getById(id: string): Promise<User> {
    const response = await apiClient.get<User>(`${this.basePath}/${id}`);
    return response.data;
  }

  async create(data: CreateUserDTO): Promise<User> {
    const response = await apiClient.post<User>(this.basePath, data);
    return response.data;
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    const response = await apiClient.patch<User>(`${this.basePath}/${id}`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/${id}`);
  }
}

export const userService = new UserService();
```

---

## Componentes UI (shadcn/ui Pattern)

### Creación de Componentes Base

Los componentes en `components/ui/` siguen el patrón shadcn/ui: primitivos de Radix UI + estilos Tailwind.

```typescript
// components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### Extensión de Componentes

Nunca modificar directamente los componentes de `ui/`. Crear wrappers en el módulo correspondiente:

```typescript
// ❌ INCORRECTO - Modificar ui/button.tsx directamente
// components/ui/button.tsx
export const Button = () => {
  // Lógica específica de órdenes aquí...
}

// ✅ CORRECTO - Crear wrapper en el módulo
// components/orders/order-action-button.tsx
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OrderActionButtonProps extends ButtonProps {
  action: 'approve' | 'reject' | 'assign';
}

export const OrderActionButton = ({ action, className, ...props }: OrderActionButtonProps) => {
  const actionStyles = {
    approve: 'bg-green-600 hover:bg-green-700',
    reject: 'bg-red-600 hover:bg-red-700',
    assign: 'bg-blue-600 hover:bg-blue-700',
  };

  return (
    <Button className={cn(actionStyles[action], className)} {...props} />
  );
};
```

---

## Mapas con Leaflet

### Configuración Básica

```typescript
// components/maps/base-map.tsx
'use client';

import { MapContainer, TileLayer, type MapContainerProps } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface BaseMapProps extends Omit<MapContainerProps, 'children'> {
  children?: React.ReactNode;
}

export const BaseMap = ({ children, ...props }: BaseMapProps) => {
  return (
    <MapContainer
      center={[-12.0464, -77.0428]} // Lima, Perú
      zoom={13}
      className="h-full w-full"
      {...props}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {children}
    </MapContainer>
  );
};
```

### Importante: SSR con Leaflet

Leaflet no funciona en SSR. Siempre usar `dynamic` import:

```typescript
// app/(dashboard)/fleet/page.tsx
import dynamic from 'next/dynamic';

const FleetMap = dynamic(
  () => import('@/components/shared/fleet/fleet-map').then(mod => mod.FleetMap),
  { 
    ssr: false,
    loading: () => <MapSkeleton />
  }
);
```

---

## Reglas de Tailwind CSS

### 1. Organización de Clases

```typescript
// ✅ Orden recomendado de clases Tailwind
<div
  className={cn(
    // 1. Layout (display, position)
    'flex flex-col items-center justify-center',
    'relative',
    // 2. Spacing (margin, padding)
    'mx-auto my-4 p-6',
    // 3. Sizing (width, height)
    'w-full max-w-md h-auto',
    // 4. Typography
    'text-base font-medium text-gray-900',
    // 5. Visual (background, border, shadow)
    'bg-white rounded-lg border border-gray-200 shadow-sm',
    // 6. States & Transitions
    'hover:shadow-md focus:ring-2 focus:ring-primary',
    'transition-all duration-200',
    // 7. Responsive
    'md:flex-row md:p-8 lg:max-w-lg',
    // 8. Dark mode
    'dark:bg-gray-800 dark:text-white',
    // 9. Props dinámicas
    className
  )}
/>
```

### 2. Utilidad cn() para Clases Condicionales

```typescript
// utils/cn.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

// Uso
<button
  className={cn(
    'px-4 py-2 rounded-md font-medium',
    isActive && 'bg-primary text-white',
    isDisabled && 'opacity-50 cursor-not-allowed',
    variant === 'outline' && 'border-2 border-primary bg-transparent'
  )}
/>
```

### 3. Componentes con Variantes

```typescript
// components/ui/Button.tsx
import { type FC, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary/90',
        secondary: 'bg-secondary text-white hover:bg-secondary/90',
        outline: 'border-2 border-primary text-primary hover:bg-primary/10',
        ghost: 'hover:bg-gray-100 text-gray-900',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button: FC<ButtonProps> = ({
  className,
  variant,
  size,
  isLoading,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};
```

---

## Patrones Recomendados

### 1. Composición sobre Herencia

```typescript
// ✅ Composición
const Card = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border p-4">{children}</div>
);

const CardHeader = ({ children }: { children: ReactNode }) => (
  <div className="border-b pb-4">{children}</div>
);

const CardBody = ({ children }: { children: ReactNode }) => (
  <div className="py-4">{children}</div>
);

// Uso
<Card>
  <CardHeader>Título</CardHeader>
  <CardBody>Contenido</CardBody>
</Card>
```

### 2. Container/Presentational Pattern

```typescript
// Container (lógica)
const UserListContainer: FC = () => {
  const { users, isLoading, error } = useUsers();
  const { trackEvent } = useTracking();

  const handleUserClick = (userId: string) => {
    trackEvent('user_click', { user_id: userId });
  };

  if (isLoading) return <UserListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <UserList users={users} onUserClick={handleUserClick} />;
};

// Presentational (UI pura)
interface UserListProps {
  users: User[];
  onUserClick: (userId: string) => void;
}

const UserList: FC<UserListProps> = ({ users, onUserClick }) => (
  <ul className="space-y-2">
    {users.map((user) => (
      <li key={user.id} onClick={() => onUserClick(user.id)}>
        {user.name}
      </li>
    ))}
  </ul>
);
```

### 3. Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import { trackingService } from '@/tracking/trackingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    trackingService.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      component_stack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultErrorFallback />;
    }

    return this.props.children;
  }
}
```

---

## Checklist de Código

### Antes de hacer commit:
- [ ] Sin errores de TypeScript (`npx tsc --noEmit`)
- [ ] Sin errores de ESLint (`npm run lint`)
- [ ] Formato correcto (`npm run format`)
- [ ] Tests pasando (`npm run test`)
- [ ] Tracking implementado en acciones de usuario
- [ ] Componentes con props tipados
- [ ] Sin `console.log` en producción
- [ ] Responsive verificado (mobile-first)
- [ ] Accesibilidad básica (alt, aria-labels)

### Performance:
- [ ] Imágenes optimizadas con `next/image`
- [ ] Lazy loading para componentes pesados
- [ ] Memoización donde sea necesario (`useMemo`, `useCallback`, `memo`)
- [ ] Bundle size monitoreado

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build y verificación
npm run build
npm run lint
npm run type-check

# Testing
npm run test
npm run test:watch
npm run test:coverage

# Formato
npm run format
npm run format:check
```