# MÓDULO ORDERS — Reporte de Bugs al Backend

> Para enviar al equipo de backend.
> Cada bug incluye reproducción exacta con curl, evidencia y prioridad.

---

## 🔴 BUG #1 — CRÍTICO — Routing `:id` devuelve 404 en TODOS los endpoints

**Prioridad:** 🔴 CRÍTICA — bloquea 12 endpoints (~52% del módulo Orders)

**Endpoints afectados:**

| Método | Endpoint |
|---|---|
| `GET`    | `/api/v1/orders/:id` |
| `PATCH`  | `/api/v1/orders/:id` |
| `DELETE` | `/api/v1/orders/:id` |
| `PATCH`  | `/api/v1/orders/:id/status` |
| `PATCH`  | `/api/v1/orders/:id/assign` |
| `POST`   | `/api/v1/orders/:id/cancel` |
| `POST`   | `/api/v1/orders/:id/close` |
| `POST`   | `/api/v1/orders/:id/items` |
| `GET`    | `/api/v1/orders/:id/tracking` |
| `GET`    | `/api/v1/orders/:id/workflow-progress` |
| `PATCH`  | `/api/v1/orders/:id/milestones/:milestoneId` |
| `GET`    | `/api/v1/operations/orders/by-driver/:id` |
| `GET`    | `/api/v1/operations/orders/by-vehicle/:id` |
| `PATCH`  | `/api/v1/operations/orders/:id/start-trip` |

**Síntoma:** Todos devuelven `404 Not Found` aunque el recurso exista.

**Patrón identificado:** El bug solo afecta endpoints con `:id` (UUID) como path parameter. Endpoints que reciben otros tipos de parámetros (ej. `/by-number/:orderNumber`) funcionan correctamente.

**Hipótesis:** Routing del backend con regex incorrecto para UUIDs, o middleware que filtra mal IDs UUID v4, o namespace `/orders/:id/*` mal montado en Express/Fastify.

### Reproducción exacta

```bash
# 1. Login
TOKEN=$(curl -s -X POST https://api-service.gruponavitel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1432!"}' | jq -r '.data.accessToken')

# 2. Obtener un customer real
CUSTOMER_ID=$(curl -s "https://api-service.gruponavitel.com/api/v1/master/customers?pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')

# 3. Crear orden
ORDER_ID=$(curl -s -X POST "https://api-service.gruponavitel.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"delivery\",\"priority\":\"high\",\"customer_id\":\"$CUSTOMER_ID\"}" \
  | jq -r '.data.id')

echo "Orden creada: $ORDER_ID"

# 4. Verificar que aparece en listado
curl -s "https://api-service.gruponavitel.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" | jq ".items[] | select(.id == \"$ORDER_ID\")"
# → ✅ Devuelve la orden

# 5. GET por ID — FALLA
curl -s -w "\nStatus: %{http_code}\n" \
  "https://api-service.gruponavitel.com/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
# → ❌ Status: 404
# → Body: "Not Found"

# 6. PATCH por ID — FALLA
curl -s -w "\nStatus: %{http_code}\n" -X PATCH \
  "https://api-service.gruponavitel.com/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priority":"urgent"}'
# → ❌ Status: 404
```

### Impacto en producción

- **Usuarios NO pueden ver el detalle** de una orden (frontend tiene workaround pero es ineficiente: trae 200 órdenes en vez de 1)
- **Usuarios NO pueden editar** órdenes existentes
- **Usuarios NO pueden cambiar estados** (draft → pending → assigned → in_transit → ...)
- **Usuarios NO pueden asignar conductor/vehículo** a una orden
- **Usuarios NO pueden cancelar, cerrar ni eliminar** órdenes

### Documentación oficial

El Excel oficial `endpoints_navitel_tms.xlsx` y la doc Rev3 listan todos estos endpoints como existentes:
```
Orders | GET    | /api/v1/orders/:id          | Obtener orden detalle...
Orders | PATCH  | /api/v1/orders/:id          | Actualizar orden...
Orders | DELETE | /api/v1/orders/:id          | Eliminación lógica...
```

---

## 🔴 BUG #2 — CRÍTICO — `GET /orders/stats` devuelve 500

**Prioridad:** 🔴 ALTA — bloquea el dashboard de estadísticas

### Reproducción

```bash
curl -s -w "\nStatus: %{http_code}\n" \
  "https://api-service.gruponavitel.com/api/v1/orders/stats" \
  -H "Authorization: Bearer $TOKEN"
# → Status: 500
# → Body: vacío o error genérico
```

### Response esperada (según Rev3)

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

**Probable causa:** Error en query SQL o agregación, división por cero, o JOIN sobre tabla vacía.

---

## 🟡 BUG #3 — MEDIO — Enum `type` rechaza valores documentados

**Prioridad:** 🟡 MEDIA — frontend tiene workaround mapeando todo a `"delivery"`

### Síntoma

El frontend envía valores como:
- `distribucion`, `importacion`, `exportacion`, `transporte_minero`,
- `transporte_residuos`, `interprovincial`, `mudanza`, `courier`, `otro`

El backend acepta el POST con `201 Created`, pero en la respuesta el campo `type` sale **vacío** (`""`).

Solo si se envía `type: "delivery"` el campo se persiste correctamente.

### Reproducción

```bash
# Test 1: enviar type="distribucion"
curl -X POST "https://api-service.gruponavitel.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"distribucion","priority":"normal","customer_id":"<id>"}' \
  | jq '.data.type'
# → ""    ❌ vacío

# Test 2: enviar type="delivery"
curl -X POST "https://api-service.gruponavitel.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"delivery","priority":"normal","customer_id":"<id>"}' \
  | jq '.data.type'
# → "delivery"    ✅
```

### Pregunta para backend

- ¿Cuál es la lista oficial de valores válidos para el campo `type`?
- ¿Solo `"delivery"` está implementado actualmente?
- ¿Tienen planeado soportar los enums del frontend (distribucion, importacion, etc.)?
- ¿Sería preferible cambiar el enum del backend o el del frontend?

**Acción tomada por frontend:** Mapear todos los valores a `"delivery"` provisionalmente.

---

## 🟢 BUG #4 — BAJO — Campos del payload se descartan silenciosamente

**Prioridad:** 🟢 BAJA — frontend ya filtró estos campos del payload

### Campos descartados por el backend

El frontend (antes de los fixes) enviaba estos campos que el backend ignora silenciosamente:

| Campo enviado | Estado en response | Notas |
|---|---|---|
| `carrier_id` | descartado | Backend no soporta concepto de carrier en orders |
| `external_reference` | descartado | Backend solo soporta `reference` |
| `service_type` | descartado | Backend solo usa `type` |
| `cargo{}` (sub-objeto) | descartado | Backend usa `total_weight`/`volume`/`packages` planos |
| `milestones[]` (array) | descartado | Backend usa `origin_*`/`destination_*` planos |
| `tags[]` | descartado | Backend no implementa tags |
| `gps_operator_id` | descartado | Backend no soporta gps_operator |
| `scheduled_start_date` | descartado | Backend solo usa `scheduled_pickup_at` |
| `scheduled_end_date` | descartado | Backend solo usa `scheduled_delivery_at` |

### ¿Es bug o es feature?

Si el backend NUNCA va a soportar estos campos, **OK** — el frontend ya los filtró.

Si el backend planea soportarlos en el futuro, **debería**:
- Devolver un warning header (`X-Ignored-Fields: carrier_id,tags,...`)
- O rechazar con `400 Bad Request` con detalle de campos no soportados
- O documentarlo explícitamente en Rev4

### Acción tomada por frontend

Limpieza completa de `mapOrderToBackend()` en `src/lib/transformers/order.transformer.ts` para enviar SOLO los campos que el backend persiste según Rev3.

---

## 📊 RESUMEN

| Bug | Prioridad | Endpoints afectados | Workaround frontend |
|---|---|---|---|
| #1 — Routing `:id` 404 | 🔴 Crítico | 12 | Fallback parcial (solo getOrderById) |
| #2 — `/stats` 500 | 🔴 Crítico | 1 | Sin workaround posible |
| #3 — Enum `type` | 🟡 Medio | POST/PATCH /orders | Mapeo a "delivery" |
| #4 — Campos descartados | 🟢 Bajo | POST /orders | Filtrado preventivo |

### Si el backend arregla #1 y #2 → módulo Orders sube de **40.9% a 95.5%** funcional.

---

## 📞 Contacto

Reportado por: Equipo Frontend TMS-NAVITEL
Fecha: 2026-05-02
Versión backend probada: producción `https://api-service.gruponavitel.com/api/v1`
Doc base: `endpoints_navitel_tms.xlsx` + Rev3 markdown
