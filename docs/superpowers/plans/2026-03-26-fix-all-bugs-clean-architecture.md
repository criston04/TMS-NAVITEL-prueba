# TMS-NAVITEL Full Bug Fix & Architecture Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 38 identified frontend bugs, unify types with RFC, optimize performance, and prepare codebase for backend integration.

**Architecture:** Foundation-first approach. Phase 1 unifies types (RFC as source of truth). Phase 2 fixes contexts/hooks infrastructure. Phase 3 fixes functional bugs by module. Phase 4 fixes build, memory leaks, and cleanup.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, Leaflet, Radix UI

---

## Phase 1: Type Unification (RFC-aligned)

### Task 1: Create shared type aliases for route-planner module

The `route-planner.ts` defines its own `OrderStatus` (4 values), `Vehicle`, and `Driver` that conflict with canonical types. Replace with `Pick<>` from canonical models.

**Files:**
- Modify: `src/types/route-planner.ts:1-120`

- [ ] **Step 1: Replace OrderStatus with canonical import**

In `src/types/route-planner.ts`, replace the 4-value OrderStatus with a re-export from order.ts:

```typescript
// BEFORE (line 6):
// export type OrderStatus = "pending" | "assigned" | "in_transit" | "delivered";

// AFTER:
import type { OrderStatus as CanonicalOrderStatus } from "./order";
export type OrderStatus = CanonicalOrderStatus;
```

- [ ] **Step 2: Replace Vehicle with Pick from canonical model**

```typescript
// BEFORE (lines 74-89): full Vehicle interface redefinition

// AFTER:
import type { Vehicle as CanonicalVehicle } from "./models/vehicle";

export type RoutePlannerVehicle = Pick<CanonicalVehicle, 'id' | 'plate' | 'brand' | 'model' | 'year' | 'status'> & {
  capacity: { weight: number; volume: number; units: number };
  fuelType: string;
  fuelConsumption: number;
  features: string[];
};

// Keep backward compat alias
export type Vehicle = RoutePlannerVehicle;
```

- [ ] **Step 3: Replace Driver with Pick from canonical model**

```typescript
// BEFORE (lines 94-107): full Driver interface redefinition

// AFTER:
import type { Driver as CanonicalDriver } from "./models/driver";

export type RoutePlannerDriver = Pick<CanonicalDriver, 'id' | 'firstName' | 'lastName' | 'status'> & {
  phone: string;
  rating: number;
  totalDeliveries: number;
  specializations: string[];
  currentLocation?: { lat: number; lng: number };
};

export type Driver = RoutePlannerDriver;
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No errors related to route-planner types (warnings from other files are ok for now).

- [ ] **Step 5: Commit**

```bash
git add src/types/route-planner.ts
git commit -m "refactor(types): align route-planner types with canonical models

Route-planner OrderStatus now re-exports the full 9-value canonical type.
Vehicle and Driver use Pick<> from models/ instead of redefining.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix fleet.ts Vehicle type to extend canonical

The `fleet.ts` Vehicle is a monitoring-specific view. Rename to avoid collision and import shared fields.

**Files:**
- Modify: `src/types/fleet.ts`
- Modify: `src/components/shared/fleet/fleet-map.tsx`
- Modify: `src/components/shared/fleet/vehicle-list.tsx`
- Modify: `src/components/shared/fleet/vehicle-card.tsx`
- Modify: `src/components/dashboard/dashboard-map-widget.tsx`

- [ ] **Step 1: Rename Vehicle to FleetVehicle in fleet.ts**

In `src/types/fleet.ts`, rename the `Vehicle` interface to `FleetVehicle` and add an alias:

```typescript
// Rename the interface (line 41):
export interface FleetVehicle {
  id: string;
  code: string;
  location: VehicleLocation;
  address: string;
  city: string;
  country: string;
  progress: number;
  driver: string;
  status: "en-ruta" | "entregando" | "completado" | "esperando";
  tracking: TrackingEvent[];
}

// Backward compat alias
export type Vehicle = FleetVehicle;
```

- [ ] **Step 2: Update imports in 4 consumer files**

In each file that imports `Vehicle` from `@/types/fleet`, update to use `FleetVehicle`:

`src/components/shared/fleet/fleet-map.tsx`:
```typescript
import type { FleetVehicle } from "@/types/fleet";
// Replace all usage of Vehicle with FleetVehicle in this file
```

`src/components/shared/fleet/vehicle-list.tsx`:
```typescript
import type { FleetVehicle } from "@/types/fleet";
```

`src/components/shared/fleet/vehicle-card.tsx`:
```typescript
import type { FleetVehicle } from "@/types/fleet";
```

`src/components/dashboard/dashboard-map-widget.tsx`:
```typescript
import type { FleetVehicle } from "@/types/fleet";
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/fleet.ts src/components/shared/fleet/ src/components/dashboard/dashboard-map-widget.tsx
git commit -m "refactor(types): rename fleet Vehicle to FleetVehicle to avoid collision

Canonical Vehicle lives in models/vehicle.ts. Fleet-specific view
is now FleetVehicle with backward-compat alias.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix maintenance.ts Vehicle/VehicleType collision

The `maintenance.ts` exports `Vehicle` and `VehicleType` that conflict with `models/vehicle.ts`.

**Files:**
- Modify: `src/types/maintenance.ts:1-30`

- [ ] **Step 1: Rename to MaintenanceVehicle and MaintenanceVehicleType**

```typescript
// BEFORE:
// export type VehicleStatus = 'active' | 'maintenance' | 'out_of_service' | 'reserved';
// export type VehicleType = 'truck' | 'van' | 'pickup' | 'trailer' | 'car';
// export interface Vehicle { ... }

// AFTER:
export type MaintenanceVehicleStatus = 'active' | 'maintenance' | 'out_of_service' | 'reserved';
export type MaintenanceVehicleType = 'truck' | 'van' | 'pickup' | 'trailer' | 'car';

export interface MaintenanceVehicle {
  id: string;
  plate: string;
  type: MaintenanceVehicleType;
  brand: string;
  model: string;
  year: number;
  fuelType: FuelType;
  capacityKg: number;
  capacityM3?: number;
  currentMileage: number;
  lastMileageUpdate: string;
  status: MaintenanceVehicleStatus;
  // ... rest of fields unchanged
}

// Backward compat aliases
export type VehicleStatus = MaintenanceVehicleStatus;
export type VehicleType = MaintenanceVehicleType;
export type Vehicle = MaintenanceVehicle;
```

- [ ] **Step 2: Update imports in maintenance consumers**

Search all files importing `Vehicle` from `@/types/maintenance` and update to `MaintenanceVehicle`. The 20 consumer files mostly use it via the maintenance service, so verify each import.

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add src/types/maintenance.ts src/app/ src/services/maintenance/ src/hooks/useMaintenance.ts src/mocks/maintenance/
git commit -m "refactor(types): rename maintenance Vehicle to MaintenanceVehicle

Avoids collision with canonical Vehicle from models/vehicle.ts.
Backward-compat aliases preserved.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Clean barrel exports in types/index.ts

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add explicit comment about collision avoidance**

The file already has a comment at line 28-31 about fleet/maintenance/route-planner. Verify it's accurate and no conflicting names leak through.

```typescript
export * from "./common";
export * from "./navigation";
export * from "./models";
export * from "./order";
export * from "./incident";
export * from "./scheduling";
export * from "./workflow";
export * from "./monitoring";
export * from "./notification";
export * from "./geofence-events";
export * from "./finance";
export * from "./report";
export * from "./settings";

// Module-specific types with potential name collisions.
// Import directly from their file:
//   import type { FleetVehicle } from '@/types/fleet';
//   import type { MaintenanceVehicle } from '@/types/maintenance';
//   import type { RoutePlannerVehicle } from '@/types/route-planner';
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "refactor(types): update barrel export comments for type collision guidance

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Context & Hook Infrastructure

### Task 5: Memoize AuthContext value and callbacks

**Files:**
- Modify: `src/contexts/auth-context.tsx:207-320`

- [ ] **Step 1: Wrap login/logout/updateUser with useCallback**

```typescript
// BEFORE (lines 207-232): inline function definitions
// const login = async (userData: ...) => { ... }

// AFTER:
const login = useCallback(async (userData: AuthUser) => {
  const newUser = { ...userData, lastLogin: new Date().toISOString() };
  setUser(newUser);
  localStorage.setItem("tms_user", JSON.stringify(newUser));

  if (isPlatformUser(newUser)) {
    setPlatformUser(newUser);
  }
}, []);

const logout = useCallback(() => {
  setUser(null);
  setPlatformUser(null);
  localStorage.removeItem("tms_user");
  localStorage.removeItem("tms_access_token");
  localStorage.removeItem("tms_refresh_token");
  router.push("/login");
}, [router]);

const updateUser = useCallback((updates: Partial<AuthUser>) => {
  setUser(prev => {
    if (!prev) return null;
    const updated = { ...prev, ...updates };
    localStorage.setItem("tms_user", JSON.stringify(updated));
    return updated;
  });
}, []);
```

- [ ] **Step 2: Wrap permission functions with useCallback**

```typescript
const can = useCallback((resource: string, action: string): boolean => {
  if (!user) return false;
  const currentTier = user.tier;
  if (currentTier === "platform") return true;
  if (currentTier === "tenant_admin") return true;
  const permissions = user.permissions || [];
  return permissions.some(
    (p) => p.resource === resource && p.actions.includes(action)
  );
}, [user]);

const hasRoleFn = useCallback((role: string): boolean => {
  if (!user) return false;
  return user.role === role;
}, [user]);

const inGroupFn = useCallback((group: string): boolean => {
  if (!user) return false;
  return user.groups?.includes(group) ?? false;
}, [user]);

const hasModuleEnabledFn = useCallback((module: string): boolean => {
  if (!user) return true; // fallback
  if (user.tier === "platform") return true;
  const modules = user.enabledModules || [];
  if (modules.length === 0) return false; // FIX: restrictive by default
  return modules.includes(module);
}, [user]);
```

Note: `hasModuleEnabledFn` now returns `false` when `enabledModules` is empty (was `true` - Bug #24 fix).

- [ ] **Step 3: Memoize the context value**

```typescript
const value = useMemo<AuthContextType>(() => ({
  user,
  platformUser,
  isLoading,
  isAuthenticated: !!user,
  login,
  logout,
  updateUser,
  can,
  hasRole: hasRoleFn,
  inGroup: inGroupFn,
  isPlatform: isPlatformFlag,
  isMasterUser: isMasterUserFlag,
  isSubUser: isSubUserFlag,
  currentRole,
  currentTier,
  enabledModules,
  currentScope,
  restrictions,
  capabilities,
  hasModuleEnabled: hasModuleEnabledFn,
  requiresPasswordChange,
}), [
  user, platformUser, isLoading,
  login, logout, updateUser,
  can, hasRoleFn, inGroupFn,
  isPlatformFlag, isMasterUserFlag, isSubUserFlag,
  currentRole, currentTier, enabledModules,
  currentScope, restrictions, capabilities,
  hasModuleEnabledFn, requiresPasswordChange,
]);
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add src/contexts/auth-context.tsx
git commit -m "perf(auth): memoize AuthContext value and all callbacks

Prevents re-rendering all useAuth() consumers on every state change.
Also fixes hasModuleEnabled to be restrictive when modules list is empty.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Memoize RoutePlannerContext value

**Files:**
- Modify: `src/contexts/route-planner-context.tsx:620-667`

- [ ] **Step 1: Memoize allRoutesAssigned computation**

```typescript
// BEFORE (line 620-621):
// const allRoutesAssigned = routes.length > 0 && routes.every(r => r.assignedVehicle && r.assignedDriver);

// AFTER:
const allRoutesAssigned = useMemo(
  () => routes.length > 0 && routes.every(r => r.assignedVehicle && r.assignedDriver),
  [routes]
);
```

- [ ] **Step 2: Memoize the context value object**

Wrap the entire `value` object (lines 623-660) in `useMemo` with all its dependencies.

```typescript
const value = useMemo(() => ({
  // ... all properties
}), [
  // ... all dependencies
]);
```

- [ ] **Step 3: Fix reorderStops stale closure**

In `reorderStops` (line 326), use functional state update:

```typescript
// BEFORE:
// const reorderedStops = [...currentRoute.stops];
// AFTER:
setCurrentRoute(prev => {
  if (!prev) return prev;
  const reorderedStops = [...prev.stops];
  // ... rest of reorder logic using prev instead of currentRoute
  return { ...prev, stops: reorderedStops, /* updated fields */ };
});
```

- [ ] **Step 4: Verify and commit**

```bash
git add src/contexts/route-planner-context.tsx
git commit -m "perf(route-planner): memoize context value and fix stale closure

Prevents unnecessary re-renders of all route-planner consumers.
Fixes reorderStops capturing stale currentRoute.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Memoize CustomerCategoriesContext

**Files:**
- Modify: `src/contexts/customer-categories-context.tsx:54-136`

- [ ] **Step 1: Memoize buildDerivedMaps**

```typescript
// BEFORE (called inline during render):
// const { categoryValues, labelMap, badgeMap, colorMap, filterOptions } = buildDerivedMaps(categories);

// AFTER:
const derivedMaps = useMemo(() => buildDerivedMaps(categories), [categories]);
const { categoryValues, labelMap, badgeMap, colorMap, filterOptions } = derivedMaps;
```

- [ ] **Step 2: Wrap CRUD callbacks with useCallback**

```typescript
const addCategory = useCallback((category: CustomerCategory) => {
  setCategories(prev => [...prev, category]);
}, []);

const updateCategory = useCallback((id: string, updates: Partial<CustomerCategory>) => {
  setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
}, []);

const removeCategory = useCallback((id: string) => {
  setCategories(prev => prev.filter(c => c.id !== id));
}, []);
```

- [ ] **Step 3: Memoize context value**

```typescript
const value = useMemo(() => ({
  categories,
  categoryValues,
  labelMap,
  badgeMap,
  colorMap,
  filterOptions,
  addCategory,
  updateCategory,
  removeCategory,
}), [categories, categoryValues, labelMap, badgeMap, colorMap, filterOptions, addCategory, updateCategory, removeCategory]);
```

- [ ] **Step 4: Commit**

```bash
git add src/contexts/customer-categories-context.tsx
git commit -m "perf(customers): memoize CustomerCategoriesContext value and derived data

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Fix double-fetch in useCustomers, useVehicles, useDrivers

**Files:**
- Modify: `src/hooks/useCustomers.ts:421-435`
- Modify: `src/hooks/useVehicles.ts:488-498`
- Modify: `src/hooks/useDrivers.ts:411-421`

- [ ] **Step 1: Fix useCustomers - merge two useEffects into one**

```typescript
// BEFORE: Two separate useEffects that both fire on mount

// AFTER: Single useEffect
useEffect(() => {
  if (autoLoad) {
    loadCustomers();
    loadStats();
    loadCities();
  }
}, [filters, page, pageSize, autoLoad, loadCustomers, loadStats, loadCities]);
```

Remove the first useEffect entirely.

- [ ] **Step 2: Fix useVehicles - remove redundant mount effect**

```typescript
// BEFORE: Two useEffects
// AFTER: Single useEffect
React.useEffect(() => {
  if (autoFetch) {
    fetchVehicles();
  }
}, [filters, state.currentPage, state.pageSize, autoFetch, fetchVehicles]);
```

Remove the first `autoFetch`-only useEffect.

- [ ] **Step 3: Fix useDrivers - same pattern**

```typescript
React.useEffect(() => {
  if (autoFetch) {
    fetchDrivers();
  }
}, [filters, state.currentPage, state.pageSize, autoFetch, fetchDrivers]);
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCustomers.ts src/hooks/useVehicles.ts src/hooks/useDrivers.ts
git commit -m "fix(hooks): eliminate double-fetch on mount in data hooks

Merged overlapping useEffects in useCustomers, useVehicles, useDrivers.
Each now has a single effect that handles both initial load and filter changes.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Fix useNotifications stale page in loadMore

**Files:**
- Modify: `src/hooks/useNotifications.ts:214-219`

- [ ] **Step 1: Use functional setState and pass page directly**

```typescript
// BEFORE:
// const loadMore = useCallback(() => {
//   setPage(prev => prev + 1);
//   loadNotifications(false);
// }, [loadNotifications]);

// AFTER:
const loadMore = useCallback(() => {
  setPage(prev => {
    const nextPage = prev + 1;
    // Load with the new page value directly
    loadNotifications(false, nextPage);
    return nextPage;
  });
}, [loadNotifications]);
```

This requires `loadNotifications` to accept an optional `pageOverride` parameter. If that's too invasive, use a ref:

```typescript
const pageRef = useRef(page);
pageRef.current = page;

const loadMore = useCallback(() => {
  const nextPage = pageRef.current + 1;
  setPage(nextPage);
  loadNotifications(false, nextPage);
}, [loadNotifications]);
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useNotifications.ts
git commit -m "fix(notifications): fix stale page in loadMore causing repeated fetches

Uses ref to ensure loadNotifications gets the updated page value.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Fix useProducts search not triggering re-fetch

**Files:**
- Modify: `src/hooks/useProducts.ts:13-26`

- [ ] **Step 1: Add search to useService deps**

```typescript
// BEFORE:
// const { data: products, ... } = useService(
//   () => productsService.getAll(),
//   { immediate: true }
// );

// AFTER:
const { data: products, loading, error, execute: reloadProducts } = useService(
  () => productsService.getAll({ search }),
  { immediate: true, deps: [search] }
);
```

If `productsService.getAll` doesn't accept a search param, filter client-side but still trigger refetch:

```typescript
const { data: products, loading, error, execute: reloadProducts } = useService(
  () => productsService.getAll(),
  { immediate: true, deps: [search] }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProducts.ts
git commit -m "fix(products): trigger re-fetch when search term changes

Added search to useService deps array.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11: Fix useWorkflowIntegration missing initial load

**Files:**
- Modify: `src/hooks/useWorkflowIntegration.ts:213-245`

- [ ] **Step 1: Add useEffect for initial load**

```typescript
// Inside useOrderWorkflowInfo:
const [workflowInfo, setWorkflowInfo] = useState(null);
const [isLoading, setIsLoading] = useState(false);

const loadInfo = useCallback(async () => {
  if (!workflowId) return;
  setIsLoading(true);
  try {
    const info = await moduleConnectorService.getWorkflowStepsForScheduling(workflowId);
    setWorkflowInfo(info);
  } catch (err) {
    console.error('Failed to load workflow info:', err);
  } finally {
    setIsLoading(false);
  }
}, [workflowId]);

// ADD THIS: Initial load effect
useEffect(() => {
  loadInfo();
}, [loadInfo]);

return { workflowInfo, isLoading, refresh: loadInfo };
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWorkflowIntegration.ts
git commit -m "fix(workflows): add initial load effect to useOrderWorkflowInfo

Hook was never loading data on mount, always showing null.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 12: Fix useWorkflowEscalation not reloading on order change

**Files:**
- Modify: `src/hooks/useWorkflows.ts:290-298`

- [ ] **Step 1: Remove isInitializedRef gate, use workflowId as dep**

```typescript
// BEFORE:
// useEffect with isInitializedRef preventing re-check

// AFTER:
useEffect(() => {
  if (!order?.workflowId) return;
  queueMicrotask(async () => {
    try {
      const result = await workflowService.checkEscalations(order.workflowId);
      setEscalations(result);
    } catch {
      // silent
    }
  });
}, [order?.workflowId]); // Re-run when workflowId changes
```

Remove the `isInitializedRef` entirely.

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWorkflows.ts
git commit -m "fix(workflows): reload escalation data when order changes

Removed isInitializedRef that prevented reloading for different orders.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 13: Fix WebSocket re-subscribe loop in useVehicleTracking

**Files:**
- Modify: `src/hooks/monitoring/use-vehicle-tracking.ts:228-249`

- [ ] **Step 1: Remove vehicles from useEffect dependency array**

```typescript
// BEFORE (line 228):
// useEffect(() => {
//   monitoringWebSocketService.onMessage(...);
//   ...
// }, [vehicles, ...]);

// AFTER: Use refs for handlers that need current state
const vehiclesRef = useRef(vehicles);
vehiclesRef.current = vehicles;

useEffect(() => {
  const unsubMessage = monitoringWebSocketService.onMessage((msg) => {
    // Use vehiclesRef.current instead of vehicles directly
    handleWebSocketMessage(msg);
  });
  const unsubConnect = monitoringWebSocketService.onConnect(() => {
    const ids = Array.from(vehiclesRef.current.keys());
    if (ids.length > 0) {
      subscribeToVehicles(ids);
    }
  });
  const unsubDisconnect = monitoringWebSocketService.onDisconnect(() => {
    setIsConnected(false);
  });

  return () => {
    unsubMessage();
    unsubConnect();
    unsubDisconnect();
  };
}, []); // Empty deps - handlers use refs
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/monitoring/use-vehicle-tracking.ts
git commit -m "fix(monitoring): prevent WebSocket handler churn on every position update

Use ref for vehicles state instead of putting Map in useEffect deps.
Eliminates teardown/re-setup cycle on every GPS position update.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: Functional Bug Fixes

### Task 14: Fix finance service duplicate data on re-merge

**Files:**
- Modify: `src/services/finance.service.ts:46-80`

- [ ] **Step 1: Add idempotency guard**

```typescript
private mergedCostsOnce = false;

private mergeAutoGeneratedCosts(): void {
  if (this.mergedCostsOnce) return; // Prevent duplicate merges
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('tms-auto-costs');
    if (!raw) return;
    const autoCosts: TransportCost[] = JSON.parse(raw);
    const existingIds = new Set(this.costs.map(c => c.id));
    const newCosts = autoCosts.filter(c => !existingIds.has(c.id));
    if (newCosts.length > 0) {
      this.costs.push(...newCosts);
    }
    this.mergedCostsOnce = true;
  } catch { }
}
```

Apply the same pattern to `mergeAutoGeneratedInvoices()` with `mergedInvoicesOnce`.

- [ ] **Step 2: Commit**

```bash
git add src/services/finance.service.ts
git commit -m "fix(finance): prevent duplicate data from repeated merge calls

Added idempotency flags to mergeAutoGeneratedCosts/Invoices.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 15: Fix OrderService generateOrderId

**Files:**
- Modify: `src/services/orders/OrderService.ts:59-62`

- [ ] **Step 1: Use instance orders length**

```typescript
// BEFORE:
// const generateOrderId = (): string => {
//   const sequence = mockOrders.length + 1;
//   return `ord-${String(sequence).padStart(5, '0')}`;
// };

// Move inside the class as a method:
private generateOrderId(): string {
  const sequence = this.orders.length + 1;
  return `ord-${String(sequence).padStart(5, '0')}`;
}
```

Update all calls from `generateOrderId()` to `this.generateOrderId()`.

- [ ] **Step 2: Commit**

```bash
git add src/services/orders/OrderService.ts
git commit -m "fix(orders): use instance array length for ID generation

Was using mockOrders.length (import-time constant) instead of
this.orders.length (runtime state), causing duplicate IDs.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 16: Fix XSS in route-preview-map popup

**Files:**
- Modify: `src/components/orders/route-preview-map.tsx:259-269`

- [ ] **Step 1: Sanitize popup content**

```typescript
// Add helper at top of file:
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// BEFORE (line 259-269):
// .bindPopup(`<strong>${point.name}</strong>...`)

// AFTER:
.bindPopup(`
  <div style="min-width: 120px;">
    <strong>${escapeHtml(point.name)}</strong>
    <br/>
    <span style="color: #666; font-size: 12px;">
      ${point.type === 'origin' ? 'Origen' :
        point.type === 'destination' ? 'Destino' :
        'Parada ' + point.sequence}
    </span>
  </div>
`)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/orders/route-preview-map.tsx
git commit -m "fix(security): sanitize user input in Leaflet popup to prevent XSS

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 17: Fix milestone-editor sort mutation

**Files:**
- Modify: `src/components/orders/milestone-editor.tsx:482-484`

- [ ] **Step 1: Use toSorted or spread before sort**

```typescript
// BEFORE:
// {milestones.sort((a, b) => a.sequence - b.sequence).map(...)

// AFTER:
{[...milestones].sort((a, b) => a.sequence - b.sequence).map((milestone, index) => (
```

- [ ] **Step 2: Commit**

```bash
git add src/components/orders/milestone-editor.tsx
git commit -m "fix(orders): prevent sort mutation of milestones prop array

Spread before sort to avoid mutating parent state during render.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 18: Fix division by zero in route-stats-panel

**Files:**
- Modify: `src/components/monitoring/historical/route-stats-panel.tsx:111-126`

- [ ] **Step 1: Add safe percentage helper**

```typescript
// BEFORE:
// width: `${(stats.movingTimeSeconds / stats.totalTimeSeconds) * 100}%`

// AFTER:
const safePercent = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

// In JSX:
style={{
  width: `${safePercent(stats.movingTimeSeconds, stats.totalTimeSeconds)}%`,
}}
// ...
style={{
  width: `${safePercent(stats.stoppedTimeSeconds, stats.totalTimeSeconds)}%`,
}}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/monitoring/historical/route-stats-panel.tsx
git commit -m "fix(monitoring): prevent division by zero in route stats progress bar

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 19: Fix HOS violation showing green text

**Files:**
- Modify: `src/components/scheduling/assignment-modal.tsx:170-185`

- [ ] **Step 1: Make text color conditional**

```typescript
// BEFORE:
// <div className="flex-1 font-medium text-green-700 dark:text-green-300">
//   {isValid ? 'HOS Valido' : 'Violacion HOS'}
// </div>

// AFTER:
<div className={cn(
  "flex-1 font-medium",
  isValid
    ? "text-green-700 dark:text-green-300"
    : "text-red-700 dark:text-red-300"
)}>
  {isValid ? 'HOS Valido' : 'Violacion HOS'}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/scheduling/assignment-modal.tsx
git commit -m "fix(scheduling): show red text for HOS violations instead of green

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 20: Fix frozen today in scheduling Gantt

**Files:**
- Modify: `src/components/scheduling/scheduling-gantt.tsx:197`

- [ ] **Step 1: Remove useMemo, compute inline**

```typescript
// BEFORE:
// const today = useMemo(() => new Date(), []);

// AFTER:
const today = new Date();
```

This is cheap to compute and ensures correctness across midnight.

- [ ] **Step 2: Commit**

```bash
git add src/components/scheduling/scheduling-gantt.tsx
git commit -m "fix(scheduling): recalculate today on each render for midnight correctness

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 21: Fix record-cost-dialog hardcoded data and empty SelectItem

**Files:**
- Modify: `src/components/finance/record-cost-dialog.tsx:45-56, 164-189`

- [ ] **Step 1: Replace hardcoded vehicles/orders with hook data**

```typescript
// BEFORE (lines 45-56): hardcoded const arrays

// AFTER:
import { useVehicles } from "@/hooks/useVehicles";
import { useOrders } from "@/hooks/useOrders";

// Inside component:
const { vehicles: vehicleList } = useVehicles({ autoFetch: true });
const { orders: orderList } = useOrders();

const vehicles = (vehicleList || []).map(v => ({ id: v.id, plate: v.plate }));
const orders = (orderList || []).map(o => ({ id: o.id, number: o.orderNumber }));
```

- [ ] **Step 2: Fix empty string SelectItem value**

```typescript
// BEFORE (line 170):
// <SelectItem value="">Sin asignar</SelectItem>

// AFTER:
<SelectItem value="none">Sin asignar</SelectItem>
```

Update the submit handler to convert `"none"` back to empty/null:

```typescript
const vehicleValue = vehicleId === "none" ? undefined : vehicleId;
const orderValue = orderId === "none" ? undefined : orderId;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/finance/record-cost-dialog.tsx
git commit -m "fix(finance): use real data in cost dialog, fix empty SelectItem value

Replaced hardcoded 4 vehicles / 3 orders with hook data.
Changed SelectItem value='' to value='none' (Radix requirement).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 22: Fix record-payment-dialog stale preselectedInvoiceId

**Files:**
- Modify: `src/components/finance/record-payment-dialog.tsx:47-59`

- [ ] **Step 1: Add sync effect**

```typescript
const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || "");

// ADD: Sync when prop changes
useEffect(() => {
  if (preselectedInvoiceId) {
    setInvoiceId(preselectedInvoiceId);
  }
}, [preselectedInvoiceId]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/finance/record-payment-dialog.tsx
git commit -m "fix(finance): sync invoiceId when preselectedInvoiceId prop changes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 23: Fix search-form missing date validation

**Files:**
- Modify: `src/components/monitoring/historical/search-form.tsx:47-57`

- [ ] **Step 1: Add date order validation**

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!vehicleId) return;
  if (new Date(startDateTime) >= new Date(endDateTime)) return; // ADD validation
  onSearch({ vehicleId, startDateTime, endDateTime });
};

const isFormValid = vehicleId && startDateTime && endDateTime &&
  new Date(startDateTime) < new Date(endDateTime); // ADD check
```

- [ ] **Step 2: Commit**

```bash
git add src/components/monitoring/historical/search-form.tsx
git commit -m "fix(monitoring): validate start date is before end date in historical search

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 24: Fix PDF header width for landscape mode

**Files:**
- Modify: `src/services/pdf-report.service.ts:342-376`

- [ ] **Step 1: Use dynamic page width**

```typescript
// BEFORE:
// doc.rect(0, 0, 210, 40, 'F');
// doc.text(`Generado:...`, 150, 18);

// AFTER:
private addHeader(doc: jsPDF, title: string, subtitle?: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(this.logo, 20, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Sistema de Gestion de Transporte', 20, 28);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')}`, pageWidth - 60, 18);
  doc.text(`Hora: ${new Date().toLocaleTimeString('es-PE')}`, pageWidth - 60, 25);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 50, { align: 'center' });
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, 58, { align: 'center' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/pdf-report.service.ts
git commit -m "fix(pdf): use dynamic page width in header for landscape support

Was hardcoded to 210mm (A4 portrait). Now uses doc.internal.pageSize.getWidth().

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: Build, Memory Leaks & Cleanup

### Task 25: Fix build - tw-animate-css import

**Files:**
- Modify: `src/app/globals.css:2`

- [ ] **Step 1: Check if tw-animate-css is installed correctly**

Run: `ls node_modules/tw-animate-css/index.css 2>/dev/null && echo "EXISTS" || echo "MISSING"`

If missing, it may need to be in `dependencies` instead of `devDependencies`:

Run: `npm ls tw-animate-css`

- [ ] **Step 2: Move to dependencies or fix import**

Option A: If package exists but Turbopack can't resolve:
```css
/* BEFORE: */
/* @import "tw-animate-css"; */

/* AFTER: */
@import "tw-animate-css/css";
```

Option B: If the package path is different:
```css
@import "tw-animate-css/dist/index.css";
```

Option C: Move from devDependencies to dependencies in package.json:
```json
// Move "tw-animate-css" from devDependencies to dependencies
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css package.json
git commit -m "fix(build): resolve tw-animate-css import for production build

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 26: Fix reminder.service.ts interval memory leak

**Files:**
- Modify: `src/services/reminder.service.ts:21-27, 179-187, 291`

- [ ] **Step 1: Guard against SSR and add lazy initialization**

```typescript
class ReminderService {
  private storageKey = 'tms_reminders';
  private checkInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    // Don't start in SSR
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return; // Prevent duplicate intervals
    this.isMonitoring = true;
    this.checkInterval = setInterval(() => {
      this.checkReminders();
    }, 60000);
    this.checkReminders();
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/reminder.service.ts
git commit -m "fix(reminders): prevent interval leak and SSR crash

Guard against SSR, prevent duplicate intervals on HMR.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 27: Fix geocoding cache unbounded growth

**Files:**
- Modify: `src/services/geocoding.service.ts`

- [ ] **Step 1: Add LRU-style cache eviction**

```typescript
private cache = new Map<string, GeocodingResult>();
private readonly CACHE_MAX_SIZE = 200;

// In the method that adds to cache, after setting:
private addToCache(key: string, result: GeocodingResult): void {
  if (this.cache.size >= this.CACHE_MAX_SIZE) {
    // Evict oldest entry (first key in Map iteration order)
    const firstKey = this.cache.keys().next().value;
    if (firstKey !== undefined) {
      this.cache.delete(firstKey);
    }
  }
  this.cache.set(key, result);
}
```

Replace all `this.cache.set(key, result)` calls with `this.addToCache(key, result)`.

- [ ] **Step 2: Commit**

```bash
git add src/services/geocoding.service.ts
git commit -m "fix(geocoding): add cache size limit to prevent memory leak

Evicts oldest entries when cache exceeds 200 entries.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 28: Fix WebSocket mock timeout not cleared on disconnect

**Files:**
- Modify: `src/services/monitoring/websocket.service.ts:119-185`

- [ ] **Step 1: Store and clear the connection timeout**

```typescript
private connectionTimeout: ReturnType<typeof setTimeout> | null = null;

private connectMock(): void {
  this.connectionTimeout = setTimeout(() => {
    this.isConnected = true;
    this.startMockSimulation();
    this.emit('connect');
    this.connectionTimeout = null;
  }, 500);
}

disconnect(): void {
  // Clear pending connection timeout
  if (this.connectionTimeout) {
    clearTimeout(this.connectionTimeout);
    this.connectionTimeout = null;
  }
  // ... rest of disconnect logic
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/monitoring/websocket.service.ts
git commit -m "fix(websocket): clear mock connection timeout on disconnect

Prevents mock simulation from starting after disconnect is called.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 29: Fix routing service rate limiting race condition

**Files:**
- Modify: `src/services/routing.service.ts:51-64`

- [ ] **Step 1: Use a promise-based mutex for rate limiting**

```typescript
private rateLimitPromise: Promise<void> = Promise.resolve();

private async waitForRateLimit(): Promise<void> {
  // Chain onto existing promise to serialize requests
  this.rateLimitPromise = this.rateLimitPromise.then(async () => {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve =>
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - elapsed)
      );
    }
    this.lastRequestTime = Date.now();
  });
  return this.rateLimitPromise;
}
```

- [ ] **Step 2: Apply same pattern to geocoding.service.ts**

Same mutex pattern in `src/services/geocoding.service.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/routing.service.ts src/services/geocoding.service.ts
git commit -m "fix(services): serialize rate-limited requests with promise chain

Prevents concurrent requests from both passing the rate limit check.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 30: Remove duplicate togeojson dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Check if togeojson (standalone) is used anywhere**

Run: `grep -r "from ['\"]togeojson['\"]" src/ || echo "NOT_USED"`

- [ ] **Step 2: Remove if unused**

Run: `npm uninstall togeojson`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): remove duplicate togeojson package

Only @mapbox/togeojson is used in the codebase.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification

### Task 31: Final verification

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors (or same baseline as before changes).

- [ ] **Step 2: Run tests**

Run: `npm run test`
Expected: All 363 tests still pass.

- [ ] **Step 3: Dev server smoke test**

Run: `npm run dev` and verify the app loads without console errors.

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds (after tw-animate-css fix).
