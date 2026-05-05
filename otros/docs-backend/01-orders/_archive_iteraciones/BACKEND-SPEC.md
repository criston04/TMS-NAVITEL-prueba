# MÓDULO ORDERS — Especificación Backend

> **Versión:** 1.0
> **Fecha:** 2026-05-02
> **Frontend:** TMS-NAVITEL Next.js 16
> **Backend objetivo:** `https://api-service.gruponavitel.com/api/v1`
> **Estado actual:** 40.9% funcional (9/22 endpoints OK)

---

## 1. RESUMEN EJECUTIVO

### ¿Qué hace el módulo Orders?

Gestión completa del **ciclo de vida de las órdenes de transporte**:
- Captura de pedidos del cliente
- Definición de la carga (peso, volumen, items)
- Definición de origen, destino e hitos intermedios
- Asignación de recursos (conductor, vehículo, transportista, operador GPS)
- Programación de fechas
- Workflow de estados (draft → pending → assigned → in_transit → completed → closed)
- Cancelación, cierre, eliminación
- Sincronización con plataforma GPS externa

### Estado actual del backend

| Métrica | Valor |
|---|---|
| Total endpoints documentados (Rev3) | 22 |
| Funcionando OK | 9 (40.9%) |
| Bloqueados por bug `:id` | 12 |
| Errores 500 | 1 (`/orders/stats`) |

### Bugs críticos pendientes

1. **🔴 Routing `:id` roto** — TODOS los endpoints con UUID en path devuelven 404 aunque la orden exista
2. **🔴 `GET /orders/stats` → 500** — Error interno del servidor
3. **🟡 Enum `type`** — Solo acepta `"delivery"`; los demás valores devuelven `type: ""` silenciosamente

---

## 2. FLUJOS DE USUARIO

### Flujo A — Crear orden (Wizard de 4 pasos)

**Páginas:** `/orders/new`
**Componente:** `src/components/orders/order-form-wizard.tsx`

```
┌──────────────────────┐
│ Paso 1: Datos        │ → customerId, priority, serviceType,
│ Cliente y Carga      │   externalReference, cargo (description,
│                      │   type, weightKg, volumeM3, quantity, ...)
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Paso 2: Workflow     │ → workflowId (auto o manual),
│ y Ruta               │   milestones[] (origin, destinations, waypoints)
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Paso 3: Asignación   │ → carrierId, vehicleId, driverId,
│ (opcional)           │   gpsOperatorId, milestoneSchedules
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ Paso 4: Confirmación │ → notes, tags
└──────────┬───────────┘
           ↓
   POST /api/v1/orders
```

**Backend recibe** (después del transformer del frontend):
```json
{
  "type": "delivery",
  "priority": "high",
  "customer_id": "uuid",
  "customer_name": "ACME SA",
  "driver_id": "uuid",
  "driver_name": "Juan Pérez",
  "vehicle_id": "uuid",
  "vehicle_plate": "ABC-123",
  "origin_address": "Av. Industrial 123, Lima",
  "origin_lat": -12.046,
  "origin_lng": -77.042,
  "origin_geofence_id": "uuid",
  "destination_address": "Jr. Comercio 456",
  "destination_lat": -12.054,
  "destination_lng": -77.123,
  "destination_geofence_id": "uuid",
  "scheduled_pickup_at": "2026-05-04T08:00:00.000Z",
  "scheduled_delivery_at": "2026-05-04T14:00:00.000Z",
  "estimated_distance_km": 25.5,
  "total_weight": 1500,
  "total_volume": 5.2,
  "total_packages": 10,
  "reference": "REF-2026-001",
  "notes": "Entrega urgente",
  "internal_notes": "Cliente VIP",
  "items": [
    { "product_id": "uuid", "product_name": "Item 1", "quantity": 5, "unit": "bag", "weight": 100, "volume": 0.1 }
  ]
}
```

### Flujo B — Listar órdenes con filtros

**Página:** `/orders`
**Hook:** `useOrders()` en `src/hooks/useOrders.ts`

Filtros aplicados desde la UI:
- Búsqueda por texto (orderNumber, reference)
- Estado (draft, pending, assigned, in_transit, ...)
- Cliente, vehículo, conductor
- Prioridad, tipo de servicio
- Rango de fechas
- Selección masiva con checkboxes

```
GET /api/v1/orders?page=1&pageSize=20&search=...&status=pending&customerId=...
```

### Flujo C — Ver detalle de orden

**Página:** `/orders/:id`
**Hook:** `useOrder(id)`

```
GET /api/v1/orders/:id   ← BLOQUEADO POR BUG, frontend hace fallback a lista
```

**Workaround actual del frontend:** Si el GET por ID devuelve 404, el frontend hace `GET /orders?pageSize=200` y filtra client-side por ID. Funciona pero es ineficiente.

### Flujo D — Editar orden

**Página:** `/orders/:id/edit`
**Hook:** `useOrder().update()`

```
PATCH /api/v1/orders/:id   ← BLOQUEADO POR BUG
```

**Estado:** No funcional. Frontend muestra mensaje claro al usuario.

### Flujo E — Cambiar estado de orden

**Componente:** Botones en página de detalle
**Hook:** `useOrder().changeStatus(newStatus)`

```
PATCH /api/v1/orders/:id/status   ← BLOQUEADO POR BUG
Body: { "status": "in_transit", "reason": "Salida del almacén" }
```

### Flujo F — Asignar conductor/vehículo

**Componente:** Wizard paso 3 + acción en detalle
**Hook:** `orderService.assignVehicleAndDriver()`

```
PATCH /api/v1/orders/:id/assign   ← BLOQUEADO POR BUG
Body: { "vehicle_id": "uuid", "driver_id": "uuid" }
```

### Flujo G — Cancelar / Cerrar / Eliminar

```
POST   /api/v1/orders/:id/cancel    ← BLOQUEADO POR BUG
POST   /api/v1/orders/:id/close     ← BLOQUEADO POR BUG
DELETE /api/v1/orders/:id           ← BLOQUEADO POR BUG
```

### Flujo H — Envío masivo a GPS (sin GPS conectado)

```
POST /api/v1/orders/bulk-send
Body: { "orderIds": ["uuid1", "uuid2", ...] }
```

**Estado:** Endpoint existe pero requiere GPS para que funcione completamente.

---

## 3. MODELO DE DATOS

### 3.1 Campos del formulario (frontend → backend)

| Frontend (camelCase) | Backend (snake_case) | Tipo | Required | Validación frontend | Notas |
|---|---|---|:---:|---|---|
| `orderNumber` | `order_number` | string | ❌ | max 100 | Auto-generado por backend si no se envía |
| `customerId` | `customer_id` | UUID | ✅ | min 1 char | FK a customers |
| `priority` | `priority` | enum | ✅ | low\|normal\|high\|urgent | Default "normal" |
| `serviceType` | `type` | string | ✅ | enum 9 valores frontend | Frontend mapea TODO a "delivery" provisionalmente |
| `cargo.description` | `notes` (combinado) | string | ✅ | 3-500 chars | Frontend lo combina en `notes` |
| `cargo.type` | (no se envía) | enum | ✅ | enum 7 valores | Backend no acepta este campo |
| `cargo.weightKg` | `total_weight` | number | ✅ | >0, ≤100k | En kg |
| `cargo.volumeM3` | `total_volume` | number | ❌ | >0, ≤1k | En m³ |
| `cargo.quantity` | `total_packages` | number | ❌ | int, >0, ≤99k | Default 1 |
| `cargo.declaredValue` | (no se envía) | number | ❌ | ≥0 | Backend no acepta este campo |
| `cargo.handlingInstructions` | `notes` (combinado) | string | ❌ | - | Frontend lo combina en `notes` |
| `carrierId` | (no se envía) | UUID | ❌ | - | Backend no soporta carriers en orders |
| `vehicleId` | `vehicle_id` | UUID | ❌ | - | FK a vehicles |
| `driverId` | `driver_id` | UUID | ❌ | - | FK a drivers |
| `workflowId` | `workflow_id` | UUID | ❌ | - | FK a workflows |
| `gpsOperatorId` | (no se envía) | UUID | ❌ | - | Backend no soporta gps_operator_id |
| `externalReference` | (no se envía) | string | ❌ | max 100 | Backend solo soporta `reference` |
| `reference` | `reference` | string | ❌ | max 100 | PO/Booking ref |
| `notes` | `notes` | string | ❌ | max 1000 | Notas visibles al cliente |
| `internalNotes` | `internal_notes` | string | ❌ | - | Notas internas (no visible cliente) |
| `tags` | (no se envía) | string[] | ❌ | ea. 1-50 chars | Backend no acepta tags |
| `scheduledStartDate` | `scheduled_pickup_at` | ISO 8601 | ✅ | ≤endDate | Fecha de recojo |
| `scheduledEndDate` | `scheduled_delivery_at` | ISO 8601 | ✅ | ≥startDate | Fecha de entrega |
| `estimatedDistanceKm` | `estimated_distance_km` | number | ❌ | ≥0 | Calculado por planner de rutas |
| `milestones[].type` | (aplanado) | enum | ✅ | origin\|waypoint\|destination | Mín 2 (origen+destino) |
| `milestones[].address` | `origin_address` / `destination_address` | string | ✅ | - | Solo origin y destination |
| `milestones[].coordinates` | `origin_lat/lng` / `destination_lat/lng` | numbers | ✅ | -90 to 90 / -180 to 180 | |
| `milestones[].geofenceId` | `origin_geofence_id` / `destination_geofence_id` | UUID | ❌ | - | FK a geofences |
| `items[]` | `items[]` | array | ❌ | - | SI se persiste según Bruno test |

### 3.2 Campos que el backend genera automáticamente

| Campo | Tipo | Ejemplo |
|---|---|---|
| `id` | UUID | `48736b06-fae9-449e-a66b-be494ad3802d` |
| `tenant_id` | UUID | Inferido del JWT |
| `order_number` | string | `ORD-2026-77040` (auto, formato `ORD-YYYY-NNNNN`) |
| `status` | enum | `"draft"` por defecto |
| `created_at` | ISO 8601 | Timestamp |
| `updated_at` | ISO 8601 | Timestamp |
| `created_by` | string | Username del usuario autenticado |
| `sync_status` | enum | `"not_sent"` inicial |

### 3.3 Campos NULL esperados (sin GPS conectado)

```
current_lat, current_lng,
actual_pickup_at, actual_delivery_at,
actual_distance_km, actual_duration_min,
estimated_duration_min, estimated_delivery_at,
pod_signature_url, receiver_name,
vehicle_imei, webhook_url,
sync_error_message, last_sync_attempt
```

### 3.4 Enums del módulo

#### `OrderStatus` (9 estados — máquina de estados)
```
draft → pending → assigned → in_transit → at_milestone → delayed → completed → closed
                                                                               ↓
                                                                          cancelled
```

#### `OrderPriority`
- `low`, `normal`, `high`, `urgent`

#### `ServiceType` (frontend)
- `distribucion`, `importacion`, `exportacion`, `transporte_minero`,
- `transporte_residuos`, `interprovincial`, `mudanza`, `courier`, `otro`

> **⚠️ El backend solo acepta `"delivery"`**. El frontend mapea todos a `"delivery"` provisionalmente.

#### `CargoType` (frontend, no se persiste en backend)
- `general`, `refrigerated`, `hazardous`, `fragile`, `oversized`, `liquid`, `bulk`

---

## 4. REFERENCIA DE ENDPOINTS

### 4.1 ✅ Endpoints OPERATIVOS

#### POST `/api/v1/orders` — Crear orden ✅

**Llamado por:**
- `OrderService.createOrder(data)` en `src/services/orders/OrderService.ts:223`
- Usado desde `OrderFormWizard.handleSubmit()` cuando el usuario completa el wizard

**Cuándo se llama:** Usuario en `/orders/new` completa los 4 pasos del wizard y hace click en "Crear orden".

**Request body:** Ver sección 2 (Flujo A).

**Response:** `201 Created`
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "uuid",
    "order_number": "ORD-2026-NNNNN",
    "status": "draft",
    "type": "delivery",
    "priority": "high",
    "customer_id": "...",
    ... resto de campos persistidos
  }
}
```

**Códigos esperados:**
- `201` Created
- `400` Validation error
- `401` Unauthorized
- `409` Conflict (recurso ya asignado, etc.)

**Reglas de negocio:**
1. `tenant_id` se infiere del JWT — el frontend NO lo envía
2. `order_number` se genera automáticamente — el frontend NO lo envía si `autoGenerateNumber=true`
3. `status` se setea automáticamente a `"draft"`
4. `created_by` se infiere del JWT
5. Si se envía `vehicle_id`, validar que el vehículo exista en el tenant y tenga `status=active`
6. Si se envía `driver_id`, validar que el conductor exista, tenga licencia vigente, exámenes médicos OK
7. Si se envía `workflow_id`, validar que el workflow exista y esté activo
8. `scheduled_pickup_at` < `scheduled_delivery_at` (validar)

---

#### GET `/api/v1/orders` — Listar órdenes ✅

**Llamado por:**
- `OrderService.getOrders(filters)` en `src/services/orders/OrderService.ts:32`
- Hook `useOrders()` lo invoca al cargar `/orders`

**Cuándo se llama:** Usuario abre `/orders` o cambia filtros/página.

**Query params soportados (deben funcionar):**
```
page=1                 // Página, default 1
pageSize=20            // Tamaño página, max 100
search=ORD-2026        // Búsqueda en orderNumber, reference, notes
status=draft,pending   // Filtro por status (CSV o array)
customerId=uuid        // Filtro por cliente
vehicleId=uuid         // Filtro por vehículo
driverId=uuid          // Filtro por conductor
priority=high          // Filtro por prioridad
type=delivery          // Filtro por tipo
startDate=2026-04-01   // Filtro fecha inicio
endDate=2026-04-30     // Filtro fecha fin
sortBy=created_at      // Campo de ordenamiento
sortOrder=desc         // asc | desc
```

**Response esperada:**
```json
{
  "data": [ { ...order }, ... ],
  "meta": { "total": 450, "page": 1, "pageSize": 20, "totalPages": 23 }
}
```

**Reglas de negocio:**
1. Filtrar SIEMPRE por `tenant_id` del JWT (RLS o filtro explícito)
2. Excluir `deleted_at IS NOT NULL` por defecto
3. Soportar búsqueda case-insensitive en text fields

---

#### GET `/api/v1/operations/orders/by-number/:orderNumber` — Buscar por número ✅

**Llamado por:**
- `OrderService.getOrderByNumber(orderNumber)` en `OrderService.ts:116`

**Cuándo se llama:** Búsqueda rápida por número de orden desde la UI.

**Response:** `200 OK` con `{ data: { ...order, items: [...], tracking: [...] } }`

---

#### GET `/api/v1/operations/orders/status-counts` — Contadores por estado ✅

**Llamado por:** Dashboard de Orders (cards de KPI por estado)

**Response:**
```json
{
  "data": {
    "draft": 12, "pending": 45, "assigned": 30,
    "in_transit": 18, "at_milestone": 5, "delayed": 3,
    "completed": 320, "closed": 280, "cancelled": 17
  }
}
```

**Reglas:** Filtrar por `tenant_id` del JWT.

---

#### GET `/api/v1/orders/export` — Exportar CSV ✅

**Llamado por:** Botón "Exportar" en `/orders`

**Response:** Archivo CSV con `Content-Type: text/csv`

---

### 4.2 🔴 Endpoints BLOQUEADOS por bug `:id`

#### GET `/api/v1/orders/:id` — Detalle ❌ 404

**Llamado por:** `OrderService.getOrderById(id)` en `OrderService.ts:81`

**Cuándo se llama:** Usuario abre `/orders/:id` para ver detalle.

**Bug:** Devuelve 404 aunque la orden exista en `GET /orders` (lista).

**Reproducción:**
```bash
1. POST /api/v1/orders → 201 con id "abc-123"
2. GET /api/v1/orders → la orden abc-123 aparece en items
3. GET /api/v1/orders/abc-123 → 404 ❌
```

**Workaround del frontend:** Si recibe 404, hace `GET /orders?pageSize=200` y filtra client-side. Funciona pero es ineficiente.

**Lo que el backend DEBE devolver (cuando se arregle):**
```json
{
  "data": {
    "id": "abc-123", "order_number": "ORD-...",
    "status": "draft", "type": "delivery",
    "items": [ ... ],         // todos los items asociados
    "tracking": [ ... ],      // historial de tracking si existe
    "milestones": [ ... ],    // hitos del workflow
    ... resto de campos
  }
}
```

---

#### PATCH `/api/v1/orders/:id` — Actualizar ❌ 404

**Llamado por:** `OrderService.updateOrder(id, data)` en `OrderService.ts:244`

**Cuándo se llama:** Usuario en `/orders/:id/edit` completa el wizard en modo edición.

**Bug:** Devuelve 404 igual que GET por id.

**Body esperado** (campos opcionales, COALESCE update):
```json
{
  "type": "pickup",
  "priority": "urgent",
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "scheduled_delivery_at": "2026-04-28T10:00:00.000Z",
  "notes": "Actualizado",
  "internal_notes": "..."
}
```

**Reglas de negocio (cuando se arregle):**
1. Solo permitir update si `status IN ('draft', 'pending')`
2. Si la orden está `assigned` o más avanzada, devolver `409 Conflict`
3. Validar que el nuevo `vehicle_id`/`driver_id` esté disponible en la fecha
4. Actualizar `updated_at`

---

#### PATCH `/api/v1/orders/:id/status` — Cambiar estado ❌ 404

**Llamado por:** `OrderService.changeStatus(id, status)` en `OrderService.ts:279`

**Cuándo se llama:** Botones de transición de estado en página de detalle.

**Body:**
```json
{
  "status": "in_transit",
  "reason": "Salida del almacén",
  "lat": -12.046,
  "lng": -77.042
}
```

**Transiciones válidas:**
| Desde | Hacia |
|---|---|
| `draft` | `pending`, `cancelled` |
| `pending` | `assigned`, `cancelled` |
| `assigned` | `in_transit`, `cancelled` |
| `in_transit` | `at_milestone`, `delayed`, `completed`, `cancelled` |
| `at_milestone` | `in_transit`, `delayed`, `completed`, `cancelled` |
| `delayed` | `in_transit`, `at_milestone`, `completed`, `cancelled` |
| `completed` | `closed` |

**Response esperada:**
```json
{
  "data": {
    "id": "uuid",
    "oldStatus": "pending",
    "newStatus": "in_transit"
  }
}
```

---

#### PATCH `/api/v1/orders/:id/assign` — Asignar recursos ❌ 404

**Llamado por:** `OrderService.assignVehicleAndDriver(id, vehicleId, driverId)` en `OrderService.ts:290`

**Cuándo se llama:** Wizard paso 3 al editar, o botón "Asignar" en detalle.

**Body:**
```json
{
  "vehicle_id": "uuid",
  "vehicle_plate": "ABC-123",
  "driver_id": "uuid",
  "driver_name": "Juan Pérez"
}
```

**Reglas:**
1. Validar disponibilidad del vehículo en el rango de fechas
2. Validar disponibilidad del conductor en el rango de fechas
3. Validar que el vehículo tenga capacidad suficiente para `total_weight`/`total_volume`
4. Actualizar `assigned` (o transicionar status si está en `pending`)

---

#### POST `/api/v1/orders/:id/cancel` — Cancelar ❌ 404

**Body:** `{ "reason": "Cliente canceló pedido" }`

**Reglas:** Solo permitir si status NO es `closed` ni `cancelled`.

---

#### POST `/api/v1/orders/:id/close` — Cerrar ❌ 404

**Llamado por:** `OrderService.closeOrder(id, closureData)` en `OrderService.ts:362`

**Cuándo se llama:** Solo si la orden está en `completed` y todos los milestones están terminados.

**Body:** `{ "notes": "Cierre administrativo", "closedBy": "user-uuid" }`

**Reglas:**
1. Validar `status === 'completed'` antes de cerrar
2. Validar que todos los milestones estén `completed` o `skipped`
3. Detener el feed de GPS asociado
4. Marcar `closed_at`

---

#### POST `/api/v1/orders/:id/items` — Agregar items ❌ 404

**Llamado por:** No expuesto aún en UI (preparado en backend según Rev3)

**Body:**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Fertilizante NPK",
      "quantity": 5,
      "unit": "bag",
      "weight": 250,
      "volume": 0.25,
      "notes": null
    }
  ]
}
```

**Reglas:** Solo permitir si status IN `('draft', 'pending', 'assigned')`. Recalcular `total_weight`, `total_volume`, `total_packages`.

---

#### DELETE `/api/v1/orders/:id` — Eliminar ❌ 404

**Llamado por:** `OrderService.deleteOrder(id)` en `OrderService.ts:272`

**Reglas:** Solo permitir si `status === 'draft'`. Soft-delete (marcar `deleted_at`).

---

#### GET `/api/v1/orders/:id/tracking` — Tracking ❌ 404

**No probado** (requiere GPS conectado).

---

#### GET `/api/v1/orders/:id/workflow-progress` — Progreso de workflow ❌ 404

**Llamado por:** Hook `useWorkflowProgress(id)` en página de detalle.

**Response esperada:**
```json
{
  "data": {
    "orderId": "uuid",
    "orderStatus": "in_transit",
    "workflowId": "uuid",
    "completionPercentage": 40,
    "completedMilestones": 2,
    "totalMilestones": 5,
    "milestones": [ ... ]
  }
}
```

---

#### PATCH `/api/v1/orders/:id/milestones/:milestoneId` — Actualizar hito ❌ 404

**Llamado por:**
- `OrderService.updateMilestone(orderId, milestoneId, data)` en `OrderService.ts:386`
- `OrderService.enterMilestone()` y `exitMilestone()` (helpers que delegan)

**Body:** `{ "entryType": "arrival", "reason": "...", "observation": "..." }`

---

### 4.3 🔴 Endpoints con error 5xx

#### GET `/api/v1/orders/stats` — Estadísticas ❌ 500

**Llamado por:** Dashboard general de Orders.

**Bug:** Devuelve 500 Internal Server Error sin response body útil.

**Response esperada (cuando se arregle):**
```json
{
  "data": {
    "total": 450,
    "draft": 12, "pending": 45, "assigned": 30,
    "inTransit": 18, "atMilestone": 5, "delayed": 3,
    "completed": 320, "closed": 280, "cancelled": 17
  }
}
```

---

### 4.4 ⛔ Endpoints relacionados con GPS (no probados sin GPS)

```
POST /api/v1/orders/:id/transit-update
POST /api/v1/orders/:id/deliver
POST /api/v1/orders/:id/send-external
POST /api/v1/orders/bulk-send
POST /api/v1/orders/bulk-send-external
PATCH /api/v1/operations/orders/:id/start-trip
GET   /api/v1/operations/orders/by-driver/:id   ← devuelve 404 también
GET   /api/v1/operations/orders/by-vehicle/:id  ← devuelve 404 también
```

---

## 5. CASOS DE USO COMPLETOS

### Caso 1: Crear orden con asignación inmediata

```
1. Frontend POST /api/v1/orders
   Body: { customer_id, type, priority, origin_*, destination_*,
           scheduled_*, total_*, vehicle_id, driver_id, ... }

2. Backend valida:
   - customer_id existe en tenant
   - vehicle_id existe, status=active, capacidad ≥ total_weight
   - driver_id existe, licencia vigente
   - scheduled_pickup_at < scheduled_delivery_at

3. Backend crea:
   - INSERT INTO orders (...) RETURNING id, order_number, status
   - Si vehicle_id + driver_id → status='assigned' (en lugar de 'draft')
   - Si solo customer_id → status='draft'
   - INSERT INTO order_items (...) si el body trae items[]

4. Backend devuelve: 201 con la orden completa
```

### Caso 2: Editar orden en estado draft

```
1. Frontend GET /api/v1/orders/:id      ← carga datos en wizard
2. Usuario modifica campos
3. Frontend PATCH /api/v1/orders/:id
   Body: { priority: "urgent", notes: "..." }
4. Backend valida status IN ('draft', 'pending')
5. Backend UPDATE orders SET ... WHERE id = ? AND tenant_id = ?
6. Backend devuelve: 200 con orden actualizada
```

### Caso 3: Transición de estado draft → pending → assigned → in_transit

```
1. Crear: POST /orders → status='draft'
2. Confirmar: PATCH /orders/:id/status { status: 'pending' }
3. Asignar: PATCH /orders/:id/assign { vehicle_id, driver_id }
   → backend transiciona automáticamente a status='assigned'
4. Iniciar viaje: PATCH /orders/:id/status { status: 'in_transit' }
5. (con GPS) Updates automáticos via webhooks de GPS
6. Marcar entregada: POST /orders/:id/deliver { pod_signature, receiver }
   → status='completed'
7. Cerrar admin: POST /orders/:id/close { notes }
   → status='closed'
```

---

## 6. BUGS REPORTADOS — DETALLES PARA REPRODUCIR

### Bug #1 (CRÍTICO): Routing `:id` devuelve 404 en TODOS los endpoints

**Endpoints afectados:**
- `GET /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id`
- `DELETE /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id/status`
- `PATCH /api/v1/orders/:id/assign`
- `POST /api/v1/orders/:id/cancel`
- `POST /api/v1/orders/:id/close`
- `POST /api/v1/orders/:id/items`
- `GET /api/v1/orders/:id/tracking`
- `GET /api/v1/orders/:id/workflow-progress`
- `PATCH /api/v1/orders/:id/milestones/:milestoneId`
- `GET /api/v1/operations/orders/by-driver/:id`
- `GET /api/v1/operations/orders/by-vehicle/:id`

**Reproducción exacta:**
```bash
# 1. Login
curl -X POST https://api-service.gruponavitel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1432!"}'
# → 200 OK, devuelve accessToken

# 2. Crear orden
curl -X POST https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"delivery","priority":"high","customer_id":"<id-real>",...}'
# → 201 Created, devuelve { data: { id: "abc-123", order_number: "ORD-..." } }

# 3. Listar — la orden aparece
curl https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer {token}"
# → 200 OK, abc-123 está en items

# 4. GET por ID — FALLA
curl https://api-service.gruponavitel.com/api/v1/orders/abc-123 \
  -H "Authorization: Bearer {token}"
# → 404 Not Found ❌  (BUG)
```

**Patrón:** TODOS los endpoints con UUID como path parameter devuelven 404. El único que funciona con parámetro es `/by-number/:orderNumber` (que usa el número, no el UUID).

**Hipótesis:** El router del backend tiene mal el regex del UUID o un middleware que filtra mal IDs UUID v4.

**Prioridad:** 🔴 CRÍTICO — bloquea 12 endpoints, dejando el módulo al 40.9%.

---

### Bug #2 (ALTO): `GET /orders/stats` devuelve 500

```bash
curl https://api-service.gruponavitel.com/api/v1/orders/stats \
  -H "Authorization: Bearer {token}"
# → 500 Internal Server Error
```

Sin response body útil. Probable error en query SQL o agregación.

---

### Bug #3 (MEDIO): Enum `type` rechaza valores documentados

El frontend usa estos valores para `serviceType`:
- `distribucion`, `importacion`, `exportacion`, `transporte_minero`,
- `transporte_residuos`, `interprovincial`, `mudanza`, `courier`, `otro`

**Comportamiento actual del backend:**
- Si se envía `"delivery"` → se persiste correctamente en `type` ✅
- Si se envía cualquiera de los anteriores → backend devuelve `type: ""` (vacío) silenciosamente sin error ❌

**Workaround actual del frontend:** mapear todos los valores del frontend a `"delivery"`.

**Pregunta para backend:**
- ¿Cuál es la lista oficial de valores válidos para `type`?
- ¿Solo `delivery` está implementado o hay otros?
- ¿Es posible aceptar los enums del frontend o necesitamos otro tipo de operación?

---

## 7. CHECKLIST PARA EL EQUIPO BACKEND

### 🔴 Críticos (bloquean el módulo)

- [ ] Arreglar routing de `:id` en TODOS los endpoints listados en Bug #1
- [ ] Arreglar el 500 en `GET /orders/stats`
- [ ] Confirmar la lista oficial de valores válidos para enum `type`

### 🟡 Altos (mejoras importantes)

- [ ] Implementar `POST /orders/:id/cancel` con regla de negocio (no permitir si ya cancelled/closed)
- [ ] Implementar `POST /orders/:id/items` para agregar items posteriormente
- [ ] Soportar parámetros de filtro avanzados en `GET /orders` (driverId, vehicleId, dateRange)
- [ ] Implementar `GET /operations/orders/by-driver/:id` con stats reales (no solo lista)
- [ ] Implementar `GET /operations/orders/by-vehicle/:id` con stats reales
- [ ] Agregar `statusCounts` al response de `GET /orders` (frontend lo calcula client-side actualmente)

### 🟢 Medios (nice to have)

- [ ] Soportar `carrier_id` (transportista) en orders — actualmente se descarta
- [ ] Soportar `external_reference` separado de `reference` para PO/Booking del cliente
- [ ] Soportar `tags[]` en orders (backend descarta el array actualmente)
- [ ] Persistir el sub-objeto `cargo{}` para detalles ricos de carga
- [ ] Persistir el array `milestones[]` para hitos intermedios (no solo origen/destino)
- [ ] Implementar `gps_operator_id` cuando se conecte la integración GPS

### 📋 Documentación

- [ ] Confirmar lista exacta de valores válidos por enum:
  - `type` (actualmente solo "delivery" funciona)
  - `priority` (frontend usa low|normal|high|urgent)
  - `status` (frontend usa 9 estados, confirmar transiciones)
- [ ] Documentar si las acciones de status (start-trip, deliver, cancel, close) emiten eventos webhook
- [ ] Documentar el formato exacto del response de `GET /orders/:id` cuando incluye items y tracking

---

## 8. APÉNDICE — Referencia de archivos del frontend

| Archivo | Propósito |
|---|---|
| `src/types/order.ts` | Interfaces TypeScript del modelo Order |
| `src/lib/validators/order-validators.ts` | Validaciones zod (createOrderSchema, updateOrderSchema) |
| `src/lib/transformers/order.transformer.ts` | Mapeo camelCase ↔ snake_case |
| `src/services/orders/OrderService.ts` | Service layer con todos los métodos HTTP |
| `src/hooks/useOrders.ts` | Hooks: useOrders, useOrder, useOrderFilters, useOrderRealtime |
| `src/components/orders/order-form-wizard.tsx` | Wizard de 4 pasos para crear/editar |
| `src/app/(dashboard)/orders/page.tsx` | Página de listado |
| `src/app/(dashboard)/orders/new/page.tsx` | Página de creación |
| `src/app/(dashboard)/orders/[id]/page.tsx` | Página de detalle |
| `src/app/(dashboard)/orders/[id]/edit/page.tsx` | Página de edición |
| `src/config/api.config.ts` | Configuración de endpoints |

---

**Fin del documento.** Para preguntas o aclaraciones, consultar al equipo de frontend.
