# MODULO WORKFLOWS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 5 de 13 endpoints funcionan (38.5%). Bug de path equivocado en frontend (corregido) + bug NGINX `:id` afecta a 7 endpoints.

---

## INDICE

1. Resumen ejecutivo
2. Bug critico: path equivocado en frontend (CORREGIDO)
3. Bug critico transversal: NGINX y rutas con `:id`
4. Lista de endpoints que el frontend USA
5. Detalle por endpoint
6. Otros bugs y observaciones
7. Cambios recientes en el frontend
8. Checklist para el backend
9. Apendice: como reproducir

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Workflows

Definir flujos de trabajo automatizados que se aplican a las ordenes. Incluye:
- Definicion de workflows con steps (recoger, transportar, entregar, etc.)
- Cada step tiene: nombre, secuencia, duracion estimada, geofence asociada (opcional)
- Trigger event: que evento dispara el workflow (`order_created`, `order_assigned`, etc.)
- Actions: que acciones ejecutar (notificaciones, asignaciones automaticas, etc.)
- Reglas de escalacion: que pasa si el workflow no avanza en X tiempo
- Aplicabilidad: a que cargo types, customers, carriers se aplica
- Status: active, inactive
- Duplicar workflows existentes
- Validar geocercas asociadas
- Calcular duracion total programada
- Aplicar workflow a una orden especifica

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 13 |
| Funcionando OK en produccion | 5 (38.5%) |
| Bloqueados por bug NGINX `:id` | 7 |
| Endpoint inexistente | 1 (`/default`) |
| Errores 5xx | 0 |

### Endpoints OPERATIVOS (5)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/workflows` | Listar workflows |
| GET | `/api/v1/master/workflows/active` | Listar workflows activos |
| GET | `/api/v1/master/workflows/helpers/available-geofences` | Geocercas disponibles para asociar a steps |
| GET | `/api/v1/master/workflows/helpers/available-customers` | Customers disponibles |
| POST | `/api/v1/master/workflows` | Crear workflow |

### Endpoints BLOQUEADOS por bug NGINX `:id` (7)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/workflows/:id` | Detalle de workflow |
| PUT | `/api/v1/master/workflows/:id` | Actualizar |
| DELETE | `/api/v1/master/workflows/:id` | Eliminar |
| PATCH | `/api/v1/master/workflows/:id/status` | Cambiar status |
| POST | `/api/v1/master/workflows/:id/duplicate` | Duplicar |
| GET | `/api/v1/master/workflows/:id/validate-geofences` | Validar geocercas asociadas |
| GET | `/api/v1/master/workflows/:id/schedule-duration` | Calcular duracion |

### Endpoint inexistente (1)

| Metodo | Endpoint | Estado |
|---|---|---|
| GET | `/api/v1/master/workflows/default` | 404 — no esta implementado en el backend |

---

## 2. BUG CRITICO: PATH EQUIVOCADO EN FRONTEND (CORREGIDO)

### Que paso

El frontend tenia configurado el path como `/api/v1/workflows` (sin `/master`), y todas las llamadas devolvian 404.

**Investigacion:** se probaron 5 paths candidatos y se encontro que el path correcto es `/api/v1/master/workflows`. Los otros 4 (`/api/v1/workflows`, `/api/v1/workflows/definitions`, `/api/v1/orders/workflows`, `/workflows`) responden 404.

**Fix aplicado en frontend:** se actualizo `src/config/api.config.ts` linea 82-84 y 92, cambiando `"/workflows"` a `"/master/workflows"`. Despues del fix, el listado, /active, los helpers y el POST funcionan.

**Impacto en este documento:** los endpoints documentados en seccion 4-5 ya usan el path correcto (`/api/v1/master/workflows`). El equipo backend deberia confirmar que este path es definitivo y no se va a cambiar.

---

## 3. BUG CRITICO TRANSVERSAL: NGINX Y RUTAS CON `:id`

### Que es NGINX y por que importa

NGINX es el proxy reverso del servidor backend. Si la ruta no esta en su configuracion, la rechaza con `404 Not Found` plain text.

### Como se manifiesta en Workflows

Los 7 endpoints con `:id` (UUID en path) devuelven 404 con body `"Not Found"` 9 bytes (firma de NGINX). Igual que en los otros 6 modulos afectados.

### Solucion sugerida

Usar UN solo location block con prefijo:

```nginx
location /api/v1/ {
    proxy_pass http://backend-app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

`nginx -s reload`. Arregla los 7 endpoints bloqueados de Workflows + 30+ de los otros modulos.

---

## 4. LISTA DE ENDPOINTS QUE EL FRONTEND USA

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | GET | `/api/v1/master/workflows` | path? | SI | SI | 200 | OK |
| 2 | GET | `/api/v1/master/workflows/active` | path? | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/master/workflows/helpers/available-geofences` | path? | SI | SI | 200 | OK |
| 4 | GET | `/api/v1/master/workflows/helpers/available-customers` | path? | SI | SI | 200 | OK |
| 5 | POST | `/api/v1/master/workflows` | path? | SI | SI | 201 | OK |
| 6 | GET | `/api/v1/master/workflows/default` | NO | SI | SI | 404 | NO IMPLEMENTADO |
| 7 | GET | `/api/v1/master/workflows/:id` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 8 | PUT | `/api/v1/master/workflows/:id` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 9 | DELETE | `/api/v1/master/workflows/:id` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 10 | PATCH | `/api/v1/master/workflows/:id/status` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 11 | POST | `/api/v1/master/workflows/:id/duplicate` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 12 | GET | `/api/v1/master/workflows/:id/validate-geofences` | path? | SI | SI | 404 | BLOQUEADO NGINX |
| 13 | GET | `/api/v1/master/workflows/:id/schedule-duration` | path? | SI | SI | 404 | BLOQUEADO NGINX |

**Funcional: 5/13 = 38.5%**

Notas:
- "path?" significa que el path en la tabla maestra esta inconsistente (decia `/api/v1/workflows`, real es `/api/v1/master/workflows`).
- Si el backend arregla NGINX e implementa `/default`, funcional sube a 13/13 = 100%.

---

## 5. DETALLE DE CADA ENDPOINT

### 5.1. POST /api/v1/master/workflows — Crear workflow

**Estado:** Funciona OK (201)

**Llamado por:**
- Componente: `WorkflowFormModal` o pagina de definicion de workflows
- Service: `unifiedWorkflowService.create(data)` (`src/services/workflow.service.ts:137`)

**Request body real:**

```json
{
  "code": "WF-2026-001",
  "name": "Workflow Entrega Estandar",
  "description": "Workflow para ordenes de entrega regular",
  "status": "active",
  "triggerEvent": "order_created",
  "actions": [
    {"type": "notify", "target": "manager", "message": "Nueva orden creada"}
  ],
  "applicableCargoTypes": ["general"],
  "applicableCustomerIds": [],
  "applicableCarrierIds": [],
  "steps": [
    {"id": "s1", "name": "Recoger en almacen", "sequence": 1, "estimatedDuration": 30, "type": "pickup"},
    {"id": "s2", "name": "Entregar al cliente", "sequence": 2, "estimatedDuration": 60, "type": "delivery"}
  ],
  "escalationRules": []
}
```

**Response (201):**

```json
{
  "data": {
    "id": "36c8c363-...",
    "tenant_id": "...",
    "code": "WF-2026-001",
    "name": "Workflow Entrega Estandar",
    "description": "...",
    "status": "active",
    "triggerEvent": "order_created",
    "actions": [...],
    "steps": [...],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Reglas de negocio que el backend debe validar:**

- `name`: REQUERIDO. Si falta → 400.
- `triggerEvent`: REQUERIDO. Si falta → 400. Enum sugerido: `["order_created", "order_assigned", "order_picked_up", "order_in_transit", "order_delivered", "order_cancelled"]`.
- `actions`: REQUERIDO array, min 1 item. Si falta → 400. Validado por test E2E.
- `code`: opcional, unico por tenant si se provee.
- `status`: enum `["active", "inactive"]`.
- `steps`: array. Si presente, validar que cada step tenga `name`, `sequence`, `estimatedDuration`.
- `tenant_id`: del JWT.

**Validacion CONFIRMADA por test E2E:** el backend devuelve `400 "name, triggerEvent, actions required"` si faltan estos 3 campos. Bien.

---

### 5.2. GET /api/v1/master/workflows — Listar

**Estado:** Funciona OK (200)

**Query params:** filtros como `status`, `triggerEvent`, `applicableCargoType`.

**Response (200):**

```json
{
  "data": [
    {
      "id": "...",
      "code": "WF-2026-001",
      "name": "Workflow Entrega Estandar",
      "status": "active",
      "triggerEvent": "order_created",
      "steps": [...]
    }
  ]
}
```

O con envelope `{"items": [], "meta": {...}}`. El frontend acepta ambos.

**Post-processing:** El frontend normaliza con `normalizeWorkflow()` que garantiza que `steps`, `escalationRules`, `applicableCargoTypes`, etc. siempre sean arrays (a veces el backend los omite).

---

### 5.3. GET /api/v1/master/workflows/active — Listar activos

**Estado:** Funciona OK (200)

Igual que el listado pero filtrado por `status === "active"`. Para llenar selects de "Aplicar workflow" en otros modulos.

---

### 5.4. GET /api/v1/master/workflows/helpers/available-geofences

**Estado:** Funciona OK (200)

**Para que sirve:** El form de definir steps necesita una lista de geocercas para asociar (cada step puede estar atado a un geofence: "el step se completa cuando el vehiculo entra a la geocerca X").

**Response (200):**

```json
{
  "data": [
    {
      "id": "...",
      "name": "Almacen Lima",
      "code": "GEO-001",
      "type": "circle",
      "category": "warehouse",
      "color": "#3b82f6",
      "address": "Av. Industrial 123",
      "coordinates": {"lat": -12.046, "lng": -77.042}
    }
  ]
}
```

---

### 5.5. GET /api/v1/master/workflows/helpers/available-customers

**Estado:** Funciona OK (200)

**Para que sirve:** El form de definir aplicabilidad necesita lista de customers para checkear "este workflow aplica solo a estos customers".

**Response (200):**

```json
{
  "data": [
    {"id": "...", "name": "Bruno Corp", "code": "CUST-001"}
  ]
}
```

---

### 5.6. GET /api/v1/master/workflows/default — NO IMPLEMENTADO

**Estado:** 404. No existe en el backend.

**Para que sirve:** El frontend espera obtener el workflow marcado como "default" del tenant (el que se aplica a ordenes que no matchean ninguna regla especifica).

**Sugerencia:** o bien implementar este endpoint, o bien anadir un campo `is_default` al schema de workflow y derivarlo del listado.

---

### 5.7. GET /api/v1/master/workflows/:id — Detalle (BLOQUEADO NGINX)

**Estado:** BLOQUEADO. NGINX devuelve 404.

**Llamado por:** detalle de workflow para editar.

**Response esperada (200):** mismo shape del POST response, con steps, actions, escalationRules poblados.

---

### 5.8. PUT /api/v1/master/workflows/:id — Actualizar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Reglas:** mismas validaciones que POST.

---

### 5.9. DELETE /api/v1/master/workflows/:id — Eliminar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Reglas:**
- Soft delete.
- Si el workflow tiene ordenes asociadas activamente, advertencia pero no abortar.
- Si es el workflow default del tenant, no permitir eliminar (422).

---

### 5.10. PATCH /api/v1/master/workflows/:id/status — Cambiar status (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:** `{"status": "active" | "inactive"}`

---

### 5.11. POST /api/v1/master/workflows/:id/duplicate — Duplicar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:** `{"newName": "Workflow Entrega Estandar - Copia"}`

**Reglas:** crear un nuevo workflow con los mismos steps/actions, status="inactive", `code` auto-generado.

---

### 5.12. GET /api/v1/master/workflows/:id/validate-geofences (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Para que sirve:** Validar que las geocercas asociadas a los steps existen y son utilizables.

**Response esperada (200):**

```json
{
  "valid": true,
  "issues": [
    {"stepId": "s2", "stepName": "Entregar", "issue": "La geocerca asociada fue eliminada"}
  ]
}
```

---

### 5.13. GET /api/v1/master/workflows/:id/schedule-duration (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Para que sirve:** Calcular cuanto tiempo total tomaria ejecutar este workflow.

**Response esperada (200):**

```json
{
  "totalMinutes": 90,
  "totalHours": 1.5,
  "breakdown": [
    {"stepName": "Recoger", "minutes": 30},
    {"stepName": "Entregar", "minutes": 60}
  ]
}
```

---

## 6. OTROS BUGS Y OBSERVACIONES

### 6.1. Path inconsistente en tabla maestra

La tabla maestra y la doc Rev3 indicaban `/api/v1/workflows` (sin `/master`). El path real es `/api/v1/master/workflows`. El test E2E del 2026-05-03 confirmo el path correcto.

**Sugerencia:** actualizar tabla maestra y doc Rev3 con el path real.

### 6.2. /default no implementado

El frontend hace GET `/master/workflows/default` esperando obtener el workflow default del tenant. El backend no lo implementa.

**Sugerencia:** o implementar el endpoint, o derivar del listado con un campo `is_default`.

### 6.3. Bug NGINX

Detallado en seccion 3.

### 6.4. Validacion de POST exigente pero clara

El backend valida bien `name, triggerEvent, actions` y devuelve mensaje claro: `"name, triggerEvent, actions required"`. Bien hecho.

### 6.5. Steps anidados aceptados pero estado de persistencia desconocido

Se envia `steps[]` y `escalationRules[]` en POST pero como GET /:id esta bloqueado, no podemos confirmar si se persisten correctamente.

**Sugerencia:** confirmar esto cuando NGINX se arregle. Si no se persisten, anadir a la lista de TODOs del backend.

---

## 7. CAMBIOS RECIENTES EN EL FRONTEND

### 7.1. Path corregido en api.config.ts

`workflows: "/workflows"` → `workflows: "/master/workflows"` (lineas 82-84 y 92). El comentario del header del archivo tambien fue actualizado.

### 7.2. `normalizeWorkflow()` helper

Garantiza que `steps`, `escalationRules`, `applicableCargoTypes`, `applicableCustomerIds`, `applicableCarrierIds` siempre sean arrays. Evita crashes en componentes que hacen `workflow.steps.length`.

---

## 8. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico

- [ ] **Arreglar bug NGINX** (ver seccion 3). Desbloquea 7 endpoints de Workflows + 30+ de otros modulos.
- [ ] **Confirmar path canonico** `/api/v1/master/workflows` en tabla maestra y Rev3.

### Alta prioridad

- [ ] Implementar `GET /master/workflows/default` (workflow default del tenant).
- [ ] Confirmar que `steps[]`, `actions[]`, `escalationRules[]` se persisten correctamente en POST/PUT.
- [ ] Documentar enum de `triggerEvent`.

### Media

- [ ] En DELETE, validar que no sea el workflow default.
- [ ] Endpoint `POST /master/workflows/:id/apply` con body `{orderId}` para aplicar a una orden.

### Documentacion

- [ ] Actualizar tabla maestra con el path correcto `/api/v1/master/workflows`.
- [ ] Actualizar Postman/Bruno collection.

---

## 9. APENDICE: COMO REPRODUCIR LOS TESTS

```bash
node otros/testing/test-workflows-full.mjs
```

Salida esperada:

```
✅ 200 GET /master/workflows
✅ 200 GET /master/workflows/active
❌ 404 GET /master/workflows/default
✅ 200 GET /master/workflows/helpers/available-geofences
✅ 200 GET /master/workflows/helpers/available-customers
✅ 201 POST /master/workflows (crear)
❌ 404 GET /master/workflows/:id                BUG NGINX :id
❌ 404 PUT /master/workflows/:id                BUG NGINX :id
❌ 404 PATCH /master/workflows/:id/status       BUG NGINX :id
❌ 404 POST /master/workflows/:id/duplicate     BUG NGINX :id
❌ 404 GET /master/workflows/:id/validate-geofences  BUG NGINX :id
❌ 404 GET /master/workflows/:id/schedule-duration  BUG NGINX :id
❌ 404 DELETE /master/workflows/:id             BUG NGINX :id

PORCENTAJE FUNCIONAL: 38.5%  (5/13)
```

Despues del fix NGINX + implementacion de `/default`: `100%  (13/13)`.

---

**Fin del documento.**

Cualquier duda, contactar al equipo frontend con el id de este documento (WORKFLOWS-BACKEND-HANDOFF v1.0).
