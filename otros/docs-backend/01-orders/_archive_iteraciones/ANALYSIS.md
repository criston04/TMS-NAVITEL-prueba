# MÓDULO ORDERS — Análisis del Frontend

> **Documento técnico interno** — Mapa exhaustivo de cómo está construido
> el módulo Orders en el frontend para que sirva de fuente de verdad al
> generar la documentación al backend (`BACKEND-SPEC.md`).

---

## 1. ARQUITECTURA DEL MÓDULO

```
┌─────────────────────────────────────────────────────────────┐
│                  PÁGINAS (App Router)                       │
│  /orders                — listado con filtros               │
│  /orders/new            — wizard creación                   │
│  /orders/[id]           — detalle (workaround GET 404)      │
│  /orders/[id]/edit      — wizard edición (bloqueado bug)    │
│  /orders/import         — importación CSV/Excel             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  HOOKS (orquestadores)                      │
│  useOrders()             — lista + CRUD + bulk + selección  │
│  useOrder(id)            — detalle + acciones individuales  │
│  useOrderFilters()       — opciones de filtros (selectors)  │
│  useOrderRealtime()      — eventos en tiempo real           │
│  useWorkflowProgress()   — progreso del workflow            │
│  useOrderIncidents()     — incidentes asociados             │
│  useOrderImportExport()  — import/export CSV/Excel          │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  SERVICE LAYER                              │
│  OrderService (singleton)                                   │
│    .getOrders()             ✅ funciona                     │
│    .getOrderById()          ⚠️ workaround 404→lista         │
│    .getOrderByNumber()      ✅ funciona                     │
│    .createOrder()           ✅ funciona                     │
│    .updateOrder()           ❌ 404 + Error explícito        │
│    .deleteOrder()           ❌ 404 + Error explícito        │
│    .changeStatus()          ❌ delega a updateOrder         │
│    .assignVehicleAndDriver()❌ 404 + Error explícito        │
│    .startTrip()             ❌ 404 + Error explícito        │
│    .closeOrder()            ❌ 404 + Error explícito        │
│    .updateMilestone()       ❌ 404 + Error explícito        │
│    .enterMilestone()        ❌ delega                       │
│    .exitMilestone()         ❌ delega                       │
│    .sendToExternal()        ✅ usa /bulk-send (workaround)  │
│    .bulkSendToExternal()    ✅ funciona                     │
│    .getCustomers()          ✅ delega a customersService    │
│    .getCarriers()           ✅ delega a operatorsService    │
│    .getGPSOperators()       ⚠️ devuelve []                  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                  TRANSFORMER                                │
│  mapOrderToBackend(dto)     — camelCase → snake_case        │
│  mapOrderFromBackend(raw)   — snake_case → camelCase        │
│  mapServiceTypeToBackend()  — enum mapping (→"delivery")    │
│  buildMilestonesFromFlatFields() — sintetiza milestones    │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
                  apiClient (HTTP)
```

---

## 2. WIZARD DE CREACIÓN — Detalle por paso

**Archivo:** `src/components/orders/order-form-wizard.tsx` (1253 líneas)

### Paso 0 — Datos Cliente y Carga
**Estado React (líneas 187-201):**
- `orderNumber: string` — opcional, manual o auto
- `autoGenerateNumber: boolean`
- `customerId: string` — required, dropdown maestro
- `priority: OrderPriority` — required, default "normal"
- `serviceType: ServiceType` — required, enum 9 valores
- `externalReference: string` — opcional
- `orderContact: OrderContactInfo | null` — contacto específico
- `cargoDescription: string` — required, 3-500 chars
- `cargoType: CargoType` — required, default "general"
- `cargoWeight: string` — required, > 0, ≤ 100k
- `cargoVolume: string` — opcional
- `cargoQuantity: string` — opcional
- `cargoDeclaredValue: string` — opcional, USD

### Paso 1 — Workflow y Ruta
**Estado React (líneas 204-212):**
- `workflows: Workflow[]` — lista cargada del backend
- `selectedWorkflow: Workflow | null`
- `workflowReason: string`
- `suggestedWorkflowId: string | null` — auto-sugerido
- `isWorkflowAutoAssigned: boolean`
- `isManualWorkflowOverride: boolean`
- `milestones: MilestoneFormData[]` — array de hitos

### Paso 2 — Asignación (OPCIONAL, línea 123)
**Estado React (líneas 215-219):**
- `carrierId: string` — operador transportista
- `vehicleId: string` — vehículo
- `driverId: string` — conductor
- `gpsOperatorId: string` — operador GPS (no usado)
- `milestoneSchedules: MilestoneScheduleData[]`

### Paso 3 — Confirmación
**Estado React (líneas 222-224):**
- `notes: string` — notas visibles
- `tags: string[]` — etiquetas
- `tagInput: string` — buffer para input

### Submit handler
**Función:** `handleSubmit` (líneas 701-778)
**Llama:** `onSubmit(data: CreateOrderDTO)` → `orderService.createOrder()`

---

## 3. VALIDACIONES ZOD

**Archivo:** `src/lib/validators/order-validators.ts`

### `createOrderSchema` (líneas 162-197)

```typescript
{
  customerId: z.string().min(1),
  carrierId: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  workflowId: z.string().optional(),
  priority: z.enum(['low','normal','high','urgent']),
  serviceType: z.enum([
    'distribucion','importacion','exportacion','transporte_minero',
    'transporte_residuos','interprovincial','mudanza','courier','otro'
  ]),
  orderNumber: z.string().optional(),
  externalReference: z.string().max(100).optional(),
  gpsOperatorId: z.string().optional(),
  cargo: cargoSchema,  // sub-schema
  milestones: z.array(milestoneSchema).min(2),
  scheduledStartDate: z.string().min(1),
  scheduledEndDate: z.string().min(1),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  orderContact: orderContactSchema.optional(),
}
.refine(d => d.scheduledStartDate <= d.scheduledEndDate)
```

### `cargoSchema`
```typescript
{
  description: z.string().min(3).max(500),
  type: z.enum([
    'general','refrigerated','hazardous','fragile',
    'oversized','liquid','bulk'
  ]),
  weightKg: z.number().positive().max(100_000),
  volumeM3: z.number().positive().max(1000).optional(),
  quantity: z.number().int().positive().max(99_999),
  declaredValue: z.number().min(0).optional(),
}
```

---

## 4. TIPOS TYPESCRIPT

**Archivo:** `src/types/order.ts`

### Enums clave
- `OrderStatus` (9 valores): `draft`, `pending`, `assigned`, `in_transit`, `at_milestone`, `delayed`, `completed`, `closed`, `cancelled`
- `OrderPriority` (4): `low`, `normal`, `high`, `urgent`
- `ServiceType` (9): listed above
- `CargoType` (7): `general`, `refrigerated`, `hazardous`, `fragile`, `oversized`, `liquid`, `bulk`
- `OrderSyncStatus`: `not_sent`, `pending`, `sent`, `error`
- `MilestoneStatus`: `pending`, `in_progress`, `completed`, `skipped`

### `CreateOrderDTO` (líneas 380-396)
Campos required: `customerId`, `priority`, `serviceType`, `cargo`, `milestones`, `scheduledStartDate`, `scheduledEndDate`
Campos opcionales: `carrierId`, `vehicleId`, `driverId`, `workflowId`, `externalReference`, `notes`, `tags`, `orderContact`, `reference`

### `Order` (líneas 287-374)
Entidad completa con todos los campos populados (incluye `customer`, `driver`, `vehicle` denormalizados, `statusHistory`, `cargo`, `milestones`, etc.)

### `UpdateOrderDTO` (líneas 402-404)
Partial<CreateOrderDTO> + opcional `status`

---

## 5. FLUJOS USUARIO → BACKEND

| Acción del usuario | Componente | Hook | Service | Endpoint backend |
|---|---|---|---|---|
| Ver listado | `/orders/page.tsx` | `useOrders()` | `getOrders()` | `GET /orders` ✅ |
| Filtrar lista | `OrderFilters` | `useOrderFilters()` | `getCustomers()`, `getCarriers()` | `GET /master/customers`, `GET /master/operators` ✅ |
| Crear orden | `OrderFormWizard` | `useOrders()` | `createOrder()` | `POST /orders` ✅ |
| Ver detalle | `[id]/page.tsx` | `useOrder(id)` | `getOrderById()` | `GET /orders/:id` ❌ (workaround→lista) |
| Editar orden | `[id]/edit/page.tsx` | `useOrder().update()` | `updateOrder()` | `PATCH /orders/:id` ❌ |
| Cambiar estado | Botones detalle | `useOrder().changeStatus()` | `changeStatus()` | `PATCH /orders/:id` ❌ |
| Asignar recursos | Wizard paso 3 | - | `assignVehicleAndDriver()` | `PATCH /orders/:id/assign` ❌ |
| Iniciar viaje | Botón detalle | `useOrder().startTrip()` | `startTrip()` | `PATCH /orders/:id/status` ❌ |
| Cerrar orden | Botón detalle | `useOrder().close()` | `closeOrder()` | `POST /orders/:id/close` ❌ |
| Eliminar orden | Botón detalle | - | `deleteOrder()` | `DELETE /orders/:id` ❌ |
| Envío masivo GPS | `OrderBulkActions` | `useOrders().bulkSend()` | `bulkSendToExternal()` | `POST /orders/bulk-send` ✅ |
| Buscar por número | UI search | - | `getOrderByNumber()` | `GET /operations/orders/by-number/:n` ✅ |
| Exportar CSV | Botón Exportar | `useOrderExport()` | - | `GET /orders/export` ✅ |
| Importar CSV | `/import/page.tsx` | `useOrderImportExport()` | `OrderImportService` | múltiples `POST /orders` ✅ |

---

## 6. WORKAROUNDS APLICADOS EN EL FRONTEND

### Workaround 1: `getOrderById()` con fallback a lista

**Archivo:** `src/services/orders/OrderService.ts:81-111`
**Bug del backend:** `GET /orders/:id` → 404 aunque la orden exista
**Workaround:** Si recibe 404, hace `GET /orders?pageSize=200` y filtra client-side por ID
**Costo:** Trae 200 órdenes en vez de 1, pero funciona

### Workaround 2: Helper `withBugDetection()` para errores claros

**Archivo:** `src/services/orders/OrderService.ts` (línea ~234)
**Bug del backend:** TODOS los `:id` devuelven 404
**Workaround:** Cuando algún método con `:id` recibe 404, lanza Error con `backendBug: true` y mensaje explicativo
**Beneficio:** UI puede mostrar mensaje específico ("backend tiene bug, contactar soporte") en vez de error genérico

### Workaround 3: `getOrderByNumber()` usa `?search=`

**Archivo:** `src/services/orders/OrderService.ts:116-125`
**Justificación:** Backend tiene `/operations/orders/by-number/:n` pero el frontend prefiere `/orders?search=` por consistencia
**Status:** Funciona

### Workaround 4: `getOrdersByDriver()` y `getOrdersByVehicle()` usan query params

**Archivo:** `src/services/orders/OrderService.ts:137-218`
**Bug del backend:** `/operations/orders/by-driver/:id` y `/by-vehicle/:id` devuelven 404
**Workaround:** Usar `GET /orders?driverId=X` y calcular stats vacíos client-side

### Workaround 5: `sendToExternal()` usa `/bulk-send`

**Archivo:** `src/services/orders/OrderService.ts:419-423`
**Bug del backend:** No tiene endpoint single `/orders/:id/send-external`
**Workaround:** Llamar `/bulk-send` con array de un solo ID

### Workaround 6: `mapServiceTypeToBackend()` mapea todos a "delivery"

**Archivo:** `src/lib/transformers/order.transformer.ts:504-514`
**Bug del backend:** Solo acepta `type="delivery"`, los demás devuelven `type: ""` silenciosamente
**Workaround:** Frontend mapea sus 9 valores de `serviceType` a `"delivery"` siempre

### Workaround 7: Cálculo de `statusCounts` client-side

**Archivo:** `src/services/orders/OrderService.ts:54-64`
**Bug del backend:** No retorna `statusCounts` en el response de lista
**Workaround:** Frontend itera la página actual y cuenta por status (aproximación, no es el total)

---

## 7. COMPONENTES DEL FRONTEND

**Ubicación:** `src/components/orders/`

### Principales
- `order-form-wizard.tsx` (1253 líneas) — Wizard completo de creación/edición
- `order-list.tsx` — Renderiza lista (delegate a table o card)
- `order-table.tsx` — Vista tabla con selección masiva
- `order-card.tsx` — Vista card en grid
- `order-filters.tsx` — Panel de filtros
- `order-stats.tsx` — Cards KPI por estado
- `order-summary.tsx` — Resumen ejecutivo
- `order-timeline.tsx` — Timeline de eventos
- `order-bulk-actions.tsx` — Acciones en lote
- `order-print-report.tsx` — Reporte imprimible

### Sub-componentes del wizard
- `wizard-navigation.tsx` — Controles del wizard (Anterior/Siguiente)
- `milestone-editor.tsx` — Editor de hitos
- `milestone-scheduling.tsx` — Scheduler de hitos
- `milestone-manual-entry-modal.tsx` — Entrada manual de hito
- `carrier-selector.tsx` — Dropdown de transportistas
- `gps-operator-selector.tsx` — Dropdown de operadores GPS
- `customer-contact-card.tsx` — Card de contacto del cliente
- `order-number-field.tsx` — Input para número de orden (manual/auto)
- `conflict-warning.tsx` — Alerta visual de conflictos de recursos
- `workflow-selector.tsx` — Dropdown de workflow
- `workflow-steps-preview.tsx` — Preview de pasos del workflow
- `route-preview-map.tsx` — Mini-mapa de la ruta

---

## 8. ENDPOINTS CONFIGURADOS

**Archivo:** `src/config/api.config.ts:88-93`

```typescript
operations: {
  orders: "/orders",                              // POST/GET/PATCH/DELETE
  scheduling: "/operations/scheduling",
  incidents: "/incidents",                        // NO existe en backend
  orderWorkflows: "/workflows",
}
```

---

## 9. RESUMEN DE FIXES APLICADOS

Lista cronológica de fixes aplicados al frontend para mitigar problemas del backend:

| Fix | Archivo | Línea | Descripción |
|---|---|---|---|
| 1 | `transformer.ts` | 491-687 | Limpieza de `mapOrderToBackend` (solo campos Rev3) |
| 2 | `transformer.ts` | 504-514 | `mapServiceTypeToBackend()` → "delivery" |
| 3 | `OrderService.ts` | 81-111 | Workaround `getOrderById` 404→lista |
| 4 | `OrderService.ts` | 234-260 | Helper `withBugDetection()` |
| 5 | `transformer.ts` | (varias) | Restaurar `internal_notes` (Bruno confirma persistencia) |
| 6 | `OrderService.ts` | 244+ | `updateOrder` con `withBugDetection` |
| 7 | `OrderService.ts` | 272+ | `deleteOrder` con `withBugDetection` |
| 8 | `OrderService.ts` | 290+ | `assignVehicleAndDriver` con `withBugDetection` |
| 9 | `OrderService.ts` | 307+ | `startTrip` con `withBugDetection` |
| 10 | `OrderService.ts` | 362+ | `closeOrder` con `withBugDetection` |
| 11 | `OrderService.ts` | 386+ | `updateMilestone` con `withBugDetection` |

---

## 10. ESTADO POST-FIXES

### % funcional final
- Endpoints aplicables (sin GPS): 22
- Funcionando: 9 (40.9%)
- Bloqueados por bug backend `:id`: 12
- Error 500: 1 (`/orders/stats`)

### Calidad del frontend
- ✅ TypeCheck pasa (0 errores)
- ✅ Payload limpio (solo campos oficiales Rev3)
- ✅ Workarounds implementados con mensajes claros
- ✅ Tests E2E pasan en endpoints aplicables
- ✅ Documentación generada para backend

### Lo que falta (depende del backend)
- 🔴 Arreglar routing `:id` (afecta 12 endpoints)
- 🔴 Arreglar 500 en `/orders/stats`
- 🟡 Confirmar enums oficiales para `type`
- 🟡 Implementar persistencia de `cargo{}`, `milestones[]`, `tags[]`, `carrier_id`
- 🟡 Implementar endpoints `/by-driver/:id` y `/by-vehicle/:id` reales

---

**Fin del análisis.**
