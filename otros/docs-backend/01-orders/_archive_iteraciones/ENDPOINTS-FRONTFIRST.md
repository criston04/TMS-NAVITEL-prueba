# MÓDULO ORDERS — Referencia de Endpoints (FRONT-FIRST)

> **Perspectiva:** lo que el FRONTEND usa, manda, recibe y hace.
> **Cross-check:** Tabla maestra oficial vs Rev2 vs Rev3 vs producción.
> **Versión:** 2.0 — 2026-05-02

---

## ¿Cómo leer este documento?

Cada endpoint tiene 6 secciones:

| Sección | Contenido |
|---|---|
| 📍 **USO EN FRONTEND** | Componente, hook, service y cuándo se llama |
| 📤 **REQUEST que el frontend envía** | Body literal generado por `mapOrderToBackend()` |
| 📥 **RESPONSE que el frontend espera** | Shape que el código procesa |
| 🔄 **POST-PROCESSING** | mapper, navegación, eventos disparados |
| ✅ **CROSS-CHECK FUENTES** | Tabla maestra, Rev2, Rev3, producción |
| 📋 **REGLAS DE NEGOCIO** | Lo que el backend debe enforce |

---

## 🟢 Endpoints OPERATIVOS (5)

### 1. `POST /api/v1/orders` — Crear orden ✅

**📍 USO EN FRONTEND**
- **Componente:** `OrderFormWizard` (`src/components/orders/order-form-wizard.tsx:701-778`)
- **Hook:** `useOrders().createOrder()` (`src/hooks/useOrders.ts:215`)
- **Service:** `OrderService.createOrder()` (`src/services/orders/OrderService.ts:223`)
- **Cuándo:** Usuario completa los 4 pasos del wizard de creación y hace click en "Crear orden" en `/orders/new`

**📤 REQUEST que el frontend envía**

Generado por `mapOrderToBackend()` (transformer.ts:516). Solo campos oficiales Rev3:

```json
{
  "type": "delivery",
  "priority": "high",
  "customer_id": "uuid-customer",
  "customer_name": "Cliente ACME SA",
  "driver_id": "uuid-driver",
  "driver_name": "Juan Pérez",
  "vehicle_id": "uuid-vehicle",
  "vehicle_plate": "ABC-123",
  "origin_address": "Av. Industrial 123, Lima",
  "origin_lat": -12.046,
  "origin_lng": -77.042,
  "origin_geofence_id": "uuid-geofence-origin",
  "destination_address": "Jr. Comercio 456",
  "destination_lat": -12.054,
  "destination_lng": -77.123,
  "destination_geofence_id": "uuid-geofence-dest",
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
    { "product_id": "uuid", "product_name": "Item 1", "quantity": 5,
      "unit": "bag", "weight": 100, "volume": 0.1 }
  ]
}
```

**Campos descartados intencionalmente** (frontend NO los envía aunque los tenga internamente):
- `service_type` — backend solo usa `type`
- `carrier_id`, `gps_operator_id` — backend no los soporta
- `cargo{}` (sub-objeto) — backend usa `total_*` planos
- `milestones[]` (array rico) — backend usa `origin_*`/`destination_*` planos
- `tags[]`, `external_reference`, `scheduled_start_date`, `scheduled_end_date` — no soportados

**📥 RESPONSE que el frontend espera**

Status `201 Created`:
```json
{
  "data": {
    "id": "uuid-generated",
    "tenant_id": "uuid",
    "order_number": "ORD-2026-NNNNN",
    "status": "draft",
    "type": "delivery",
    "priority": "high",
    "customer_id": "uuid",
    "customer_name": "Cliente ACME SA",
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    ... resto de campos persistidos
  }
}
```

**🔄 POST-PROCESSING**
1. `mapOrderFromBackend()` convierte snake_case → camelCase del modelo `Order`
2. Wizard cierra con dialog "Orden creada"
3. Usuario navega automáticamente a `/orders/:id`
4. Hook `useOrders` hace `refresh()` para recargar lista

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra oficial | ✅ Listado |
| Rev2 | ✅ Documentado |
| Rev3 | ✅ Documentado |
| Producción | ✅ Status 201 OK confirmado |

**📋 REGLAS DE NEGOCIO**
1. `tenant_id` se infiere del JWT — NO se envía
2. `order_number` se autogenera con formato `ORD-YYYY-NNNNN` si no se envía
3. `status` siempre arranca en `"draft"` (incluso si se envía otro)
4. `created_by` se infiere del JWT
5. `created_at`, `updated_at` los pone el backend
6. Si `vehicle_id` se envía, validar: existe, status=active, capacidad ≥ `total_weight`
7. Si `driver_id` se envía, validar: existe, licencia vigente, exámenes médicos OK
8. `scheduled_pickup_at` < `scheduled_delivery_at` (validar)
9. `items[]` se persiste (confirmado por test Bruno)
10. `internal_notes` se persiste (confirmado por Rev2 + test Bruno)

---

### 2. `GET /api/v1/orders` — Listar órdenes ✅

**📍 USO EN FRONTEND**
- **Componente:** `/orders/page.tsx` (página principal de listado)
- **Hook:** `useOrders()` (`src/hooks/useOrders.ts:94-342`)
- **Service:** `OrderService.getOrders(filters)` (`OrderService.ts:32-67`)
- **Cuándo:** Usuario abre `/orders`, cambia filtros, cambia página, o hace `refresh()`

**📤 QUERY PARAMS que el frontend envía**

```
?page=1
&pageSize=20
&search=ORD-2026          (texto en orderNumber, reference, notes)
&status=pending           (single o múltiple)
&customerId=uuid
&vehicleId=uuid
&driverId=uuid
&priority=high
&type=delivery
&startDate=2026-04-01
&endDate=2026-04-30
&sortBy=created_at
&sortOrder=desc
```

**📥 RESPONSE que el frontend espera**

```json
{
  "items": [
    {
      "id": "uuid",
      "order_number": "ORD-2026-00045",
      "status": "in_transit",
      "type": "delivery",
      "priority": "high",
      "customer_id": "uuid",
      "customer_name": "...",
      "driver_id": "uuid",
      "driver_name": "...",
      "vehicle_id": "uuid",
      "vehicle_plate": "ABC-123",
      "origin_address": "...",
      "destination_address": "...",
      "scheduled_pickup_at": "...",
      "scheduled_delivery_at": "...",
      "total_weight": 1200,
      "total_volume": 4.5,
      "total_packages": 8,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": { "total": 450, "page": 1, "pageSize": 20, "totalPages": 23 }
}
```

**🔄 POST-PROCESSING**
1. Cada item pasa por `mapOrderFromBackend()` → `Order` camelCase
2. Si el backend NO incluye `statusCounts`, se calcula client-side desde la página actual (aproximación)
3. Resultado se carga en hook `useOrders` y renderiza `OrderList` o `OrderTable`

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra oficial | ✅ Listado |
| Rev2 | ✅ Documentado |
| Rev3 | ✅ Documentado |
| Producción | ✅ Status 200 OK confirmado |

**📋 REGLAS DE NEGOCIO**
1. Filtrar por `tenant_id` del JWT (siempre)
2. Excluir `deleted_at IS NOT NULL` por defecto
3. Búsqueda case-insensitive en `order_number`, `reference`, `notes`
4. Default `sortBy=created_at`, `sortOrder=desc`
5. Default `pageSize=20`, máximo 200
6. Mejora sugerida: incluir `statusCounts` en el response para evitar cálculo client-side

---

### 3. `GET /api/v1/orders/export` — Exportar CSV ✅

**📍 USO EN FRONTEND**
- **Componente:** Botón "Exportar" en `/orders/page.tsx`
- **Hook:** `useOrderExport()`
- **Cuándo:** Usuario hace click en "Exportar" para descargar listado actual

**📤 REQUEST**: GET sin body, mismos query params de filtros que `/orders`

**📥 RESPONSE**: archivo CSV
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="orders-YYYYMMDD.csv"`

**🔄 POST-PROCESSING**: navegador descarga el archivo

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ Listado |
| Rev2 | ✅ |
| Rev3 | ✅ |
| Producción | ✅ Status 200 OK confirmado |

**📋 REGLAS**: respetar mismos filtros que el listado, exportar todas las páginas, no solo la actual.

---

### 4. `POST /api/v1/orders/bulk-send` — Envío masivo a GPS ✅

**📍 USO EN FRONTEND**
- **Componente:** `OrderBulkActions` (botón "Enviar a GPS")
- **Service:** `OrderService.bulkSendToExternal()` (`OrderService.ts:428`)
- **También:** `OrderService.sendToExternal(id)` lo usa con array de 1 ID
- **Cuándo:** Usuario selecciona órdenes y click en "Enviar a GPS"

**📤 REQUEST**
```json
{ "orderIds": ["uuid-1", "uuid-2", "uuid-3"] }
```

**📥 RESPONSE**
```json
{
  "message": "3/3 orders sent to GPS platform",
  "results": [
    { "orderId": "uuid-1", "success": true },
    { "orderId": "uuid-2", "success": true },
    { "orderId": "uuid-3", "success": false, "error": "GPS timeout" }
  ]
}
```

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ Listado |
| Rev2 | ✅ |
| Rev3 | ✅ |
| Producción | ✅ Status 200 OK |

**📋 REGLAS**
1. Validar que cada `orderId` exista y esté en estado válido (`assigned` o más avanzado)
2. Marcar `sync_status = "pending"` antes de enviar a GPS
3. Si GPS responde OK → `sync_status = "sent"`, guardar `external_order_id`
4. Si GPS falla → `sync_status = "error"`, guardar `sync_error_message`
5. Devolver resultado por orden (success/error) sin abortar el batch

---

### 5. `GET /api/v1/operations/orders/status-counts` — Contadores por estado ✅

**📍 USO EN FRONTEND**
- **Componente:** Cards KPI en `/orders/page.tsx` (top de la página)
- **Service:** `OrderService.getStatusCounts()` (`OrderService.ts:130-132`)
- **Cuándo:** Al cargar la página de órdenes para mostrar las cards de estados

**📤 REQUEST**: GET sin body ni query params

**📥 RESPONSE**
```json
{
  "data": {
    "draft": 12,
    "pending": 45,
    "assigned": 30,
    "in_transit": 18,
    "at_milestone": 5,
    "delayed": 3,
    "completed": 320,
    "closed": 280,
    "cancelled": 17
  }
}
```

**🔄 POST-PROCESSING**: render directo en cards de KPI por estado

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ❌ NO listado |
| Rev2 | ✅ Documentado |
| Rev3 | ✅ Documentado |
| Producción | ✅ Status 200 OK confirmado en test E2E |

**📋 NOTA IMPORTANTE**
La tabla maestra oficial NO lista este endpoint, pero **funciona en producción y devuelve datos válidos**. El frontend lo usa.

**Pregunta para backend:** ¿Es endpoint oficial soportado o es legacy?

**📋 REGLAS**: contar todas las órdenes del tenant (no solo página actual), agrupando por `status`. Excluir `deleted_at`.

---

## 🔴 Endpoints BLOQUEADOS por bug `:id` (12)

> Todos estos endpoints están **documentados en la tabla maestra oficial** y **listados en Rev2/Rev3**, pero el backend devuelve **404** aunque la orden exista. Bug crítico de routing del backend.

### 6. `GET /api/v1/orders/:id` — Detalle de orden ❌ 404

**📍 USO EN FRONTEND**
- **Página:** `/orders/[id]/page.tsx`
- **Hook:** `useOrder(id)` (`src/hooks/useOrders.ts:380`)
- **Service:** `OrderService.getOrderById(id)` (`OrderService.ts:81`)
- **Cuándo:** Usuario abre la página de detalle de una orden específica

**📤 REQUEST**: GET sin body, `:id` es UUID v4 de la orden

**📥 RESPONSE que el frontend espera**
```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-00045",
    "status": "in_transit",
    "type": "delivery",
    "priority": "high",
    "customer_id": "...", "customer_name": "...",
    "driver_id": "...", "driver_name": "...",
    "vehicle_id": "...", "vehicle_plate": "...",
    "origin_address": "...", "origin_lat": -12.046, "origin_lng": -77.042,
    "destination_address": "...", "destination_lat": -12.054, "destination_lng": -77.123,
    "scheduled_pickup_at": "...", "scheduled_delivery_at": "...",
    "actual_pickup_at": "..." | null,
    "actual_delivery_at": "..." | null,
    "total_weight": 1200, "total_volume": 4.5, "total_packages": 8,
    "estimated_distance_km": 25.5,
    "notes": "...", "internal_notes": "...", "reference": "...",
    "items": [
      {
        "id": "uuid", "product_id": "...", "product_name": "...",
        "quantity": 5, "unit": "bag", "weight": 100, "volume": 0.1
      }
    ],
    "tracking": [
      {
        "id": "uuid", "status": "in_transit", "description": "...",
        "lat": -12.046, "lng": -77.042,
        "recorded_by": "uuid", "created_at": "..."
      }
    ],
    "created_at": "...", "updated_at": "..."
  }
}
```

**🔄 POST-PROCESSING**
1. `mapOrderFromBackend()` convierte a `Order` camelCase
2. Página renderiza: header con info, timeline, items, tracking, mapa, botones de acción

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ Listado |
| Rev2 | ✅ Documentado |
| Rev3 | ✅ Documentado |
| **Producción** | ❌ **404 Not Found** (BUG) |

**🐛 ESTADO ACTUAL: BUG CRÍTICO DEL BACKEND**

Reproducción:
```bash
# Crear orden
ORDER_ID=$(curl -X POST .../api/v1/orders ... | jq -r '.data.id')
# → 201 OK, devuelve id

# Verificar en lista
curl .../api/v1/orders | jq ".items[] | select(.id == \"$ORDER_ID\")"
# → ✅ aparece

# GET detalle
curl .../api/v1/orders/$ORDER_ID
# → ❌ 404 Not Found
```

**Workaround del frontend:** Si recibe 404, hace `GET /orders?pageSize=200` y filtra client-side por id. Funciona pero ineficiente.

**📋 REGLAS DE NEGOCIO**
1. Filtrar por `tenant_id` del JWT
2. Excluir `deleted_at IS NOT NULL`
3. Incluir relaciones: `items[]`, `tracking[]`
4. Devolver `404 Not Found` solo si la orden NO existe (actualmente devuelve 404 aunque exista)

---

### 7. `PATCH /api/v1/orders/:id` — Actualizar orden ❌ 404

**📍 USO EN FRONTEND**
- **Página:** `/orders/[id]/edit/page.tsx`
- **Hook:** `useOrder().update(data)`
- **Service:** `OrderService.updateOrder(id, data)` (`OrderService.ts:244`)
- **Cuándo:** Usuario edita una orden existente desde el wizard en modo edición

**📤 REQUEST que el frontend envía** (campos opcionales, COALESCE update)
```json
{
  "type": "delivery",
  "priority": "urgent",
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "origin_address": "Nueva dirección",
  "origin_lat": -12.046,
  "origin_lng": -77.042,
  "destination_address": "Nueva destino",
  "destination_lat": -12.054,
  "destination_lng": -77.123,
  "scheduled_pickup_at": "2026-04-28T08:00:00.000Z",
  "scheduled_delivery_at": "2026-04-28T14:00:00.000Z",
  "total_weight": 1500,
  "total_volume": 5.2,
  "total_packages": 10,
  "notes": "Actualizado",
  "internal_notes": "Cambio solicitado por cliente"
}
```

Solo se envían los campos que cambian (no es un PUT completo).

**📥 RESPONSE esperada**
```json
{ "data": { ...order actualizado completo } }
```

**🔄 POST-PROCESSING**
1. `mapOrderFromBackend()` convierte a `Order`
2. Hook actualiza el estado local
3. UI muestra toast "Orden actualizada"

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ Listado |
| Rev2 | ✅ Documentado |
| Rev3 | ✅ Documentado |
| **Producción** | ❌ **404 Not Found** (BUG) |

**🐛 ESTADO ACTUAL: BUG CRÍTICO DEL BACKEND**

Workaround del frontend: lanza Error con `backendBug: true` y mensaje claro:
> "La edición de órdenes no está disponible: el backend devuelve 404 en rutas con :id (bug reportado)"

**📋 REGLAS DE NEGOCIO (cuando se arregle)**
1. Solo permitir update si `status IN ('draft', 'pending')`
2. Si status `assigned` o más avanzado → `409 Conflict`
3. Validar que nuevo `vehicle_id`/`driver_id` esté disponible en la fecha
4. Update con COALESCE (solo cambia los campos enviados)
5. Actualizar `updated_at`

---

### 8. `DELETE /api/v1/orders/:id` — Eliminar orden (soft) ❌ 404

**📍 USO EN FRONTEND**
- **Componente:** Botón "Eliminar" en página de detalle
- **Service:** `OrderService.deleteOrder(id)` (`OrderService.ts:272`)
- **Cuándo:** Usuario confirma eliminación de una orden en draft

**📤 REQUEST**: DELETE sin body

**📥 RESPONSE**
```json
{ "message": "Order deleted" }
```

**🔄 POST-PROCESSING**
1. Cierra modal de confirmación
2. Navega de vuelta a `/orders`
3. Hook hace `refresh()` para recargar lista

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ |
| Rev2 | ✅ |
| Rev3 | ✅ |
| **Producción** | ❌ **404 Not Found** (BUG) |

**🐛 ESTADO ACTUAL**: bloqueado por bug `:id`. Frontend lanza error explicativo.

**📋 REGLAS**
1. Solo permitir si `status === 'draft'`
2. Soft-delete: marcar `deleted_at = NOW()`
3. Devolver `409 Conflict` si la orden no está en draft
4. Devolver `404 Not Found` solo si la orden NO existe

---

### 9. `PATCH /api/v1/orders/:id/status` — Cambiar estado ❌ 404

**📍 USO EN FRONTEND**
- **Componente:** Botones de transición en página de detalle ("Confirmar", "Asignar", "Iniciar viaje", etc.)
- **Hook:** `useOrder().changeStatus(newStatus)` y `startTrip()`
- **Service:** `OrderService.changeStatus(id, status)` y `OrderService.startTrip(id)`
- **Cuándo:** Usuario hace click en un botón de transición de estado

**📤 REQUEST**
```json
{
  "status": "in_transit",
  "reason": "Salida del almacén",
  "lat": -12.046,
  "lng": -77.042
}
```

**Transiciones que el frontend permite:**

| Desde | Hacia |
|---|---|
| `draft` | `pending`, `cancelled` |
| `pending` | `assigned`, `cancelled` |
| `assigned` | `in_transit`, `cancelled` |
| `in_transit` | `at_milestone`, `delayed`, `completed`, `cancelled` |
| `at_milestone` | `in_transit`, `delayed`, `completed`, `cancelled` |
| `delayed` | `in_transit`, `at_milestone`, `completed`, `cancelled` |
| `completed` | `closed` |

**📥 RESPONSE esperada**
```json
{
  "data": {
    "id": "uuid",
    "oldStatus": "pending",
    "newStatus": "in_transit"
  }
}
```

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ |
| Rev2 | ✅ |
| Rev3 | ✅ |
| **Producción** | ❌ **404** (BUG) |

**📋 REGLAS**
1. Validar que la transición sea válida según matriz arriba
2. Si transición inválida → `400 Bad Request` con `{validTransitions: [...]}`
3. Persistir `lat`/`lng` como tracking entry si se proveen
4. Persistir `reason` en historial de status

---

### 10. `PATCH /api/v1/orders/:id/assign` — Asignar recursos ❌ 404

**📍 USO EN FRONTEND**
- **Service:** `OrderService.assignVehicleAndDriver(id, vehicleId, driverId)` (`OrderService.ts:290`)
- **Cuándo:** Wizard paso 3 (asignación opcional) o desde botón "Asignar" en detalle

**📤 REQUEST**
```json
{
  "vehicle_id": "uuid",
  "driver_id": "uuid"
}
```

**📥 RESPONSE**
```json
{
  "data": {
    "id": "uuid",
    "vehicle_id": "uuid",
    "driver_id": "uuid",
    "assigned": true,
    ...resto de la orden actualizada
  }
}
```

**✅ CROSS-CHECK FUENTES**
| Fuente | Estado |
|---|---|
| Tabla maestra | ✅ |
| Rev2 | ✅ |
| Rev3 | ✅ |
| **Producción** | ❌ **404** (BUG) |

**📋 REGLAS**
1. Validar disponibilidad del vehículo en el rango de fechas
2. Validar disponibilidad del conductor (no asignado a otra orden conflicto)
3. Validar capacidad del vehículo ≥ `total_weight` y `total_volume`
4. Si la orden está en `pending`, transicionar automáticamente a `assigned`
5. Devolver `409 Conflict` si hay conflictos

---

### 11. `POST /api/v1/orders/:id/cancel` — Cancelar orden ❌ 404

**📍 USO EN FRONTEND**
- **Componente:** Botón "Cancelar" en página de detalle
- **Cuándo:** Usuario decide cancelar una orden activa

**📤 REQUEST**
```json
{ "reason": "Cliente canceló pedido" }
```

**📥 RESPONSE**
```json
{
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancel_reason": "Cliente canceló pedido",
    "cancelled_at": "...",
    "cancelled_by": "user-uuid"
  }
}
```

**✅ CROSS-CHECK FUENTES**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404

**📋 REGLAS**
1. Solo permitir si status NO es `closed` ni `cancelled`
2. Liberar recursos (vehículo, conductor) asignados
3. Persistir `cancel_reason`, `cancelled_at`, `cancelled_by`

---

### 12. `POST /api/v1/orders/:id/close` — Cerrar orden (admin) ❌ 404

**📍 USO EN FRONTEND**
- **Componente:** Botón "Cerrar" en detalle (solo si está `completed`)
- **Hook:** `useOrder().close(closureData)`
- **Service:** `OrderService.closeOrder(id, closureData)` (`OrderService.ts:362`)

**📤 REQUEST**
```json
{
  "notes": "Cierre administrativo - documentación completa",
  "closedBy": "user-uuid"
}
```

**📥 RESPONSE**
```json
{
  "data": {
    "id": "uuid",
    "status": "closed",
    "closed_at": "..."
  }
}
```

**🔄 POST-PROCESSING**
1. Frontend valida pre-condiciones con `canCloseOrder()` antes de llamar
2. Tras éxito, publica evento `order:closed` en `tmsEventBus`

**✅ CROSS-CHECK FUENTES**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404

**📋 REGLAS**
1. Solo permitir si `status === 'completed'`
2. Validar que todos los milestones estén `completed` o `skipped`
3. Detener feed de GPS asociado
4. Marcar `closed_at`, `closed_by`

---

### 13. `POST /api/v1/orders/:id/items` — Agregar items ❌ 404

**📍 USO EN FRONTEND**
- **No expuesto aún en UI** pero el backend lo acepta según Rev3

**📤 REQUEST**
```json
{
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Item",
      "quantity": 5,
      "unit": "bag",
      "weight": 250,
      "volume": 0.25,
      "notes": null
    }
  ]
}
```

**📥 RESPONSE**
```json
{
  "data": {
    "orderId": "uuid",
    "addedItems": [{"id": "uuid", "productName": "..."}],
    "totalWeight": 1450,
    "totalVolume": 4.75,
    "totalPackages": 13
  }
}
```

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404

**📋 REGLAS**
1. Solo si `status IN ('draft', 'pending', 'assigned')`
2. Recalcular `total_weight`, `total_volume`, `total_packages`

---

### 14. `GET /api/v1/orders/:id/tracking` — Tracking GPS ❌ 404

**📍 USO EN FRONTEND**
- **Componente:** Timeline en página de detalle
- **Estado:** No probado en producción (también requiere GPS)

**📥 RESPONSE esperada**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "in_transit",
      "description": "Trip started",
      "lat": -12.046,
      "lng": -77.042,
      "recorded_by": "driver-uuid",
      "created_at": "..."
    }
  ]
}
```

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404 (sin GPS)

---

### 15. `GET /api/v1/orders/:id/workflow-progress` — Progreso del workflow ❌ 404

**📍 USO EN FRONTEND**
- **Hook:** `useWorkflowProgress(id)` en página de detalle
- **Cuándo:** Mostrar progreso de hitos al usuario

**📥 RESPONSE esperada**
```json
{
  "data": {
    "orderId": "uuid",
    "orderStatus": "in_transit",
    "workflowId": "uuid",
    "completionPercentage": 40,
    "completedMilestones": 2,
    "totalMilestones": 5,
    "milestones": [
      {
        "id": "uuid",
        "name": "Recojo en almacén",
        "type": "pickup",
        "sequence": 1,
        "status": "completed",
        "estimatedArrival": "...",
        "actualArrival": "...",
        "actualDeparture": "...",
        "dwellTimeMin": 15,
        "delayMinutes": 15,
        "isManual": false
      }
    ]
  }
}
```

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404

---

### 16. `PATCH /api/v1/orders/:id/milestones/:milestoneId` — Actualizar hito ❌ 404

**📍 USO EN FRONTEND**
- **Service:** `OrderService.updateMilestone()`, `enterMilestone()`, `exitMilestone()` (`OrderService.ts:386-413`)
- **Componente:** `MilestoneManualEntryModal` para entrada manual sin GPS

**📤 REQUEST**
```json
{
  "entryType": "arrival",
  "reason": "Llegué al punto",
  "observation": "Portón cerrado",
  "evidence": "https://storage.../img.jpg"
}
```

`entryType`: `arrival` | `departure`

**📥 RESPONSE**
```json
{
  "data": {
    "milestoneId": "uuid",
    "entryType": "arrival",
    "newStatus": "in_progress",
    "completionPercentage": 60,
    "isManual": true
  }
}
```

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | Producción ❌ 404

**📋 REGLAS**
1. Auto-completar la orden si es el último milestone tipo `destination` con `entryType=arrival`
2. Calcular `dwell_time_minutes` cuando llega `departure` después de un `arrival`
3. Marcar `is_manual: true` si la entrada es manual (no GPS)

---

### 17. `POST /api/v1/orders/:id/transit-update` — Update tránsito (GPS) ⛔

**No usado por frontend** sin GPS. Endpoint disponible para futuro.

**📥 EXPECTED REQUEST**
```json
{
  "currentLat": -12.05,
  "currentLng": -77.08,
  "newEta": "2026-04-27T13:30:00.000Z",
  "notes": "Tráfico en Av. Faucett"
}
```

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅

---

### 18. `POST /api/v1/orders/:id/deliver` — Marcar como entregada (POD) ⛔

**No usado por frontend** sin POD/GPS. Endpoint disponible para futuro.

**📥 EXPECTED REQUEST**
```json
{
  "podSignatureUrl": "https://storage.../sig.png",
  "receiverName": "Carlos Mendoza",
  "notes": "...",
  "lat": -12.054,
  "lng": -77.123
}
```

**✅ CROSS-CHECK Deliver**: Tabla ✅ | Rev2 ✅ | Rev3 ✅

---

## 🔴 Endpoint con error 5xx (1)

### 19. `GET /api/v1/orders/stats` — Estadísticas globales ❌ 500

**📍 USO EN FRONTEND**
- **No conectado a UI todavía**, pero existe en código del service

**📥 RESPONSE esperada**
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

**✅ CROSS-CHECK**: Tabla ✅ | Rev2 ✅ | Rev3 ✅ | **Producción ❌ 500 Internal Server Error**

**🐛 ESTADO ACTUAL**
Devuelve `500` sin response body útil. Probable error en query SQL o agregación.

**📋 REGLAS**: contar todas las órdenes del tenant agrupadas por status, excluyendo `deleted_at`.

---

## ⚠️ Endpoints en Rev2/Rev3 NO listados en tabla maestra (6)

> Estos endpoints están documentados en Rev2 y Rev3 pero NO aparecen en la tabla maestra oficial.
> El frontend NO los usa directamente — implementa workarounds vía query params o `/orders` plano.
> **Pregunta para backend:** ¿son legacy/deprecated, o están operativos pero sin documentar?

### 20. `GET /api/v1/operations/orders/by-number/:orderNumber` ⚠️
**📍 USO EN FRONTEND**: NO usado directamente. El frontend usa `GET /orders?search=ORD-XXX` en su lugar.
**Producción**: ✅ Status 200 OK confirmado en test E2E (funciona aunque no está en tabla maestra)

### 21. `GET /api/v1/operations/orders/by-driver/:driverId` ⚠️
**📍 USO EN FRONTEND**: NO usado. Frontend usa `GET /orders?driverId=uuid` con stats client-side vacíos.
**Producción**: ❌ 404 (mismo bug `:id`)

### 22. `GET /api/v1/operations/orders/by-vehicle/:vehicleId` ⚠️
**📍 USO EN FRONTEND**: NO usado. Frontend usa `GET /orders?vehicleId=uuid`.
**Producción**: ❌ 404

### 23. `PATCH /api/v1/operations/orders/:id/start-trip` ⚠️
**📍 USO EN FRONTEND**: NO usado. `OrderService.startTrip()` usa `PATCH /orders/:id/status` con `{status: 'in_transit'}`.
**Producción**: ❌ 404

### 24. `POST /api/v1/operations/orders/:id/send-external` ⚠️
**📍 USO EN FRONTEND**: NO usado. `OrderService.sendToExternal()` usa `POST /orders/bulk-send` con array de 1 ID.

### 25. `POST /api/v1/orders/bulk-send-external` ⚠️
**📍 USO EN FRONTEND**: NO usado. `OrderService.bulkSendToExternal()` usa `POST /orders/bulk-send`.

### 26. `POST /api/v1/orders/import` ⚠️ STUB
**Estado oficial:** Documentado como **STUB - 501 Not Implemented**.
El frontend implementa import client-side parseando CSV/Excel y haciendo múltiples `POST /orders` individuales.

---

## 📊 RESUMEN DE COBERTURA

### Endpoints que el frontend USA (15 reales)

| # | Endpoint | Estado |
|---|---|:---:|
| 1 | `POST /orders` | ✅ |
| 2 | `GET /orders` | ✅ |
| 3 | `GET /orders/export` | ✅ |
| 4 | `POST /orders/bulk-send` | ✅ |
| 5 | `GET /operations/orders/status-counts` | ✅ |
| 6 | `GET /orders/:id` | ❌ 404 |
| 7 | `PATCH /orders/:id` | ❌ 404 |
| 8 | `DELETE /orders/:id` | ❌ 404 |
| 9 | `PATCH /orders/:id/status` | ❌ 404 |
| 10 | `PATCH /orders/:id/assign` | ❌ 404 |
| 11 | `POST /orders/:id/cancel` | ❌ 404 |
| 12 | `POST /orders/:id/close` | ❌ 404 |
| 13 | `POST /orders/:id/items` | ❌ 404 |
| 14 | `GET /orders/:id/workflow-progress` | ❌ 404 |
| 15 | `PATCH /orders/:id/milestones/:milestoneId` | ❌ 404 |

**Funcional**: 5/15 = **33.3%** de los endpoints REALMENTE usados por el frontend

---

## 🎯 IMPACTO EN EL FRONTEND

### Lo que funciona al 100%
- ✅ Crear orden completa (con items, asignación, fechas)
- ✅ Listar órdenes con filtros
- ✅ Cards de KPI por estado
- ✅ Exportar CSV
- ✅ Envío masivo a GPS

### Lo que está BLOQUEADO por bug `:id` del backend
- ❌ Ver detalle de una orden (workaround: trae 200 órdenes)
- ❌ Editar orden existente
- ❌ Eliminar orden draft
- ❌ Cambiar estado (draft→pending→assigned→in_transit→...)
- ❌ Asignar/reasignar conductor o vehículo
- ❌ Cancelar orden
- ❌ Cerrar orden completada
- ❌ Agregar items posteriormente
- ❌ Ver progreso de workflow
- ❌ Actualizar hitos manualmente

### Lo que requiere GPS (no aplica todavía)
- ⛔ Tracking en tiempo real
- ⛔ Updates de tránsito
- ⛔ POD (proof of delivery)

---

## 📞 PARA EL EQUIPO BACKEND

### Prioridad #1 (CRÍTICA): arreglar routing `:id`
**12 endpoints bloqueados** porque devuelven 404 aunque la orden exista. Patrón claro: cualquier ruta con UUID como path parameter falla.

### Prioridad #2 (ALTA): `GET /orders/stats` devuelve 500

### Prioridad #3 (MEDIA): aclarar endpoints `/operations/orders/*`
¿Son oficiales? Si sí, agregar a tabla maestra. Si no, marcar como deprecated.

### Pregunta abierta: enum `type`
Frontend usa 9 valores pero solo `"delivery"` se persiste. ¿Cuál es la lista oficial?

---

**Fin del documento. Versión 2.0 — perspectiva front-first con cross-check completo.**

