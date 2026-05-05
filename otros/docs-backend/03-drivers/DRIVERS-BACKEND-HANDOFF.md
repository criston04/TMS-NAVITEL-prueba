# MODULO DRIVERS — Documento para el Equipo Backend

**Version:** 2.0 (diagnostico corregido)
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 7 de 16 endpoints funcionan en produccion (43.8%). Diagnostico real: el backend NO ha implementado la mayoria de rutas con `:id` aunque el Excel oficial las documente. **No es bug NGINX** (descartado por evidencia).

---

## INDICE

1. Resumen ejecutivo
2. Diagnostico real (correccion del documento v1.0)
3. Cross-check Frontend / Excel oficial / Produccion
4. Detalle por endpoint
5. Otros bugs y observaciones
6. Cambios recientes en el frontend
7. Checklist de acciones para el backend
8. Apendice: como reproducir los tests

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Drivers

Gestion de los conductores del tenant. Incluye:
- Crear, listar, ver detalle, editar y eliminar conductores
- Manejar tipos de documento: DNI, CE, PASSPORT
- Datos personales, contacto, laborales, licencia de conducir, contacto de emergencia
- Disponibilidad (`available, on-route, resting, vacation`) y status (`active, inactive, blocked, on_leave, terminated`)
- Habilitar/bloquear (via PATCH `/:id/status`)
- Asignar y desasignar vehiculos
- Buscar por documento
- Estadisticas globales y licencias por vencer
- Bulk delete

### Estado actual del modulo (cross-check riguroso)

| Categoria | Conteo |
|---|---|
| Endpoints en el Excel oficial | 9 |
| Endpoints que el frontend usa | 16 (los 9 del Excel + 5 inventados + 2 que el backend tiene pero NO documentados) |
| **Funcionando OK en produccion** | **7 (43.8%)** |
| Endpoints documentados en Excel pero NO implementados en backend | 4 |
| Endpoints que el frontend invento (no estan en Excel) | 5 |
| Endpoints que el backend tiene pero NO documento en Excel | 1 (`/by-document/:doc`) |

### Endpoints OPERATIVOS (7)

| Metodo | Endpoint | En Excel | En produccion |
|---|---|:---:|:---:|
| POST | `/api/v1/master/drivers` | SI | OK 201 |
| GET | `/api/v1/master/drivers` | SI | OK 200 |
| GET | `/api/v1/master/drivers/stats` | SI | OK 200 |
| GET | `/api/v1/master/drivers/expiring-licenses` | SI | OK 200 |
| GET | `/api/v1/master/drivers/by-document/:doc` | NO | **OK 200** ← endpoint NO documentado |
| POST | `/api/v1/master/drivers/bulk-delete` | SI | OK 200 |
| POST | `/api/v1/master/drivers` (segundo crear test) | SI | OK 201 |

### Endpoints DOCUMENTADOS pero NO IMPLEMENTADOS por el backend (4)

Estos estan en el Excel oficial pero devuelven 404 en produccion. **El backend debe implementarlos.**

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/drivers/:id` | Detalle de un conductor |
| PUT | `/api/v1/master/drivers/:id` | Actualizar conductor |
| DELETE | `/api/v1/master/drivers/:id` | Eliminar conductor (soft delete) |
| PATCH | `/api/v1/master/drivers/:id/status` | Cambiar status (active/blocked/on_leave/terminated) |

### Endpoints que el FRONTEND INVENTO (5)

Estos NO estan en el Excel oficial. El frontend los usa pero el backend nunca los planifico.
**Decisiones tomadas:**

| Metodo | Endpoint | Decision tomada |
|---|---|---|
| POST | `/api/v1/master/drivers/:id/enable` | **Eliminado del frontend.** Reemplazado por `PATCH /:id/status` con `{status: "active"}`. |
| POST | `/api/v1/master/drivers/:id/block` | **Eliminado del frontend.** Reemplazado por `PATCH /:id/status` con `{status: "blocked", reason}`. |
| GET | `/api/v1/master/drivers/:id/checklist` | **Eliminado del frontend.** Calculo client-side en el transformer (basado en campos del driver). |
| POST | `/api/v1/master/drivers/:id/assign-vehicle` | **Pendiente.** Probable que vaya por `/master/assignments` (existe en backend pero da 500). Esperando definicion del backend. |
| POST | `/api/v1/master/drivers/:id/unassign-vehicle` | **Pendiente.** Misma situacion. |

### Impacto en el usuario final

Sin los endpoints documentados pero no implementados, el usuario NO puede:
- Ver el detalle individual de un conductor (con sub-objetos completos: licencia, emergency contact, documentos)
- Editar un conductor existente
- Eliminar un conductor individual (solo bulk delete)
- Habilitar/bloquear, cambiar status (vacaciones, licencia medica, terminated)
- Asignar vehiculo a conductor (decision pendiente sobre `/master/assignments`)

El frontend SI puede crear, listar, ver stats, ver licencias por vencer, buscar por documento, eliminar masivamente. Tambien calcula el checklist client-side.

---

## 2. DIAGNOSTICO REAL (correccion del documento v1.0)

### Lo que DECIA la version 1.0 (incorrecto)

> "Los 9 endpoints bloqueados sufren el mismo bug NGINX `:id`. La fix de un solo `location /api/v1/` desbloquea todo."

### Lo que la INVESTIGACION RIGUROSA confirmo

**NO es bug NGINX.** Evidencia recolectada el 2026-05-03 con `otros/testing/deep-diag-drivers.mjs`, `deep-diag-2.mjs`, `deep-diag-3.mjs`, `deep-diag-4.mjs`:

#### Prueba 1: Sin token de autenticacion

Si el bug fuera NGINX (rechazo antes del backend), las URLs sin auth tambien deberian dar 404 plain text. Pero:

```
GET /api/v1/master/drivers (sin auth)            → 401 JSON {"message":"Authentication Error"}
GET /api/v1/master/drivers/<UUID> (sin auth)     → 401 JSON {"message":"Authentication Error"}
GET /api/v1/totalmente-inventado (sin auth)      → 401 JSON {"message":"Authentication Error"}
GET /random-path-xyz (sin auth)                  → 401 JSON {"message":"Authentication Error"}
```

**TODAS las URLs (validas o inventadas) llegan al backend** y son rechazadas por el middleware de auth con `401 JSON Authentication Error`. Si NGINX bloqueara, las URLs no llegarian al middleware y devolverian 404 NGINX default. Esto **descarta NGINX como causa**.

#### Prueba 2: Con token valido

```
GET /api/v1/master/drivers (con auth)            → 200 application/json (datos)
GET /api/v1/master/drivers/<UUID> (con auth)     → 404 text/plain "Not Found" (9 bytes)
GET /api/v1/totalmente-inventado (con auth)      → 404 text/plain "Not Found" (9 bytes)
GET /api/v1/master/no-existe (con auth)          → 404 text/plain "Not Found" (9 bytes)
```

El `"Not Found"` plain text 9 bytes **es el handler 404 default del framework backend** (probablemente Fastify), NO de NGINX. Todas las URLs llegan al router del backend; las que no estan registradas reciben este handler.

#### Prueba 3: Variantes para descartar mismatch de path

Probamos 23 variantes de path/metodo/body para `getById`, `update`, `enable`, `block`, `checklist`, `assign-vehicle`. Todas devuelven `"Not Found"` 9 bytes. **No hay shape alternativo que el backend acepte.** El unico hallazgo positivo:
- `GET /api/v1/master/drivers?id=<UUID>` → 200, pero ignora el query param y devuelve toda la lista (no filtra)
- `POST /api/v1/master/assignments` → existe (no da 404) pero da 500 con cualquier body

### Diagnostico correcto

| Aspecto | v1.0 (incorrecto) | v2.0 (correcto) |
|---|---|---|
| Causa | Bug NGINX que rechaza UUIDs en path | Backend no implemento la ruta |
| Quien responde 404 | NGINX (default page) | Backend (handler 404 del framework) |
| Solucion | Configurar NGINX con `location /api/v1/` | Backend escribir los controllers de las rutas |
| Esfuerzo | 1 cambio de config | N controllers (uno por ruta) |
| Frontend afectado | No tocar | Corregir paths inventados (5 endpoints) |

---

## 3. CROSS-CHECK FRONTEND / EXCEL OFICIAL / PRODUCCION

### Tabla maestra (cross-check riguroso)

| # | Metodo | Endpoint | En Excel | En Frontend (antes de v2) | En Frontend (despues de v2) | Produccion | Categoria |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | POST | `/master/drivers` | SI | SI | SI | 201 | OK |
| 2 | GET | `/master/drivers` | SI | SI | SI | 200 | OK |
| 3 | GET | `/master/drivers/stats` | SI | SI | SI | 200 | OK |
| 4 | GET | `/master/drivers/expiring-licenses` | SI | SI | SI | 200 | OK |
| 5 | POST | `/master/drivers/bulk-delete` | SI | SI | SI | 200 | OK |
| 6 | GET | `/master/drivers/by-document/:doc` | **NO** | SI | SI | 200 | **No documentado en Excel** |
| 7 | GET | `/master/drivers/:id` | SI | SI | SI | 404 | **Backend no implemento** |
| 8 | PUT | `/master/drivers/:id` | SI | SI | SI | 404 | **Backend no implemento** |
| 9 | DELETE | `/master/drivers/:id` | SI | SI | SI | 404 | **Backend no implemento** |
| 10 | PATCH | `/master/drivers/:id/status` | SI | NO | SI (nuevo) | 404 | **Backend no implemento** |
| 11 | POST | `/master/drivers/:id/enable` | NO | SI | **eliminado** | 404 | Frontend invento — corregido en v2 |
| 12 | POST | `/master/drivers/:id/block` | NO | SI | **eliminado** | 404 | Frontend invento — corregido en v2 |
| 13 | GET | `/master/drivers/:id/checklist` | NO | SI | **eliminado** | 404 | Frontend invento — calculo client-side ahora |
| 14 | POST | `/master/drivers/:id/assign-vehicle` | NO | SI | SI (con flag) | 404 | Pendiente (probable `/master/assignments`) |
| 15 | POST | `/master/drivers/:id/unassign-vehicle` | NO | SI | SI (con flag) | 404 | Pendiente |
| 16 | POST | `/master/drivers` (segundo create test) | SI | — | — | 201 | OK (duplicado del #1) |

### Resumen de cambios frontend en v2

- Eliminados 3 endpoints inventados (`enable`, `block`, `checklist`)
- Reemplazados por:
  - `enable()` → `PATCH /:id/status` con `{status: "active"}`
  - `block(reason)` → `PATCH /:id/status` con `{status: "blocked", reason}`
  - `checklist` → `computeChecklistFromBackendDriver()` en el transformer (calculo client-side)
- Mantenidos 2 endpoints inventados (`assign-vehicle`, `unassign-vehicle`) pendientes de definicion del backend sobre `/master/assignments`.

---

## 4. DETALLE DE CADA ENDPOINT

### 4.1. POST /api/v1/master/drivers — Crear conductor

**Estado:** OK 201. Documentado en Excel.

**Llamado por:**
- Componente: `DriverFormModal` (`src/app/(dashboard)/master/drivers/components/driver-form-modal.tsx`)
- Service: `driversService.create(data)` (`src/services/master/drivers.service.ts:90`)

**Request body real (transformer aplica `mapDriverToBackend()`):**

```json
{
  "code": "DRV-2026-001",
  "document_type": "DNI",
  "document_number": "45678123",
  "first_name": "Juan",
  "last_name": "Perez",
  "mother_last_name": "Garcia",
  "birth_date": "1985-06-15",
  "blood_type": "O+",
  "nationality": "PE",
  "email": "juan.perez@gruponavitel.com",
  "phone": "+51 999 111 222",
  "alternative_phone": "+51 988 444 555",
  "address": "Av. Industrial 123, Lima",
  "district": "San Isidro",
  "province": "Lima",
  "department": "Lima",
  "hire_date": "2022-03-01",
  "availability": "available",
  "operator_id": null,
  "status": "active",
  "tags": ["heavy-cargo"],
  "notes": "...",
  "license": {
    "category": "AIII",
    "number": "Q12345678",
    "issue_date": "2020-06-15",
    "expiry_date": "2027-06-15",
    "issuing_authority": "MTC",
    "issuing_country": "PE",
    "points": 100,
    "max_points": 100,
    "verification_status": "pending",
    "restrictions": {
      "requires_glasses": false,
      "requires_hearing_aid": false,
      "automatic_only": false,
      "other_restrictions": []
    }
  },
  "emergency_contact": {
    "name": "Rosa Perez",
    "relationship": "spouse",
    "phone": "+51 999 555 666",
    "alternative_phone": "+51 988 777 888",
    "email": "rosa@example.com",
    "address": "..."
  },
  "documents": [
    {"name": "Licencia de conducir", "is_required": true, "status": "valid", "expiration_date": "2027-06-15"}
  ]
}
```

**Response (201):** El backend devuelve solo los campos planos. Los sub-objetos `license`, `emergency_contact`, `documents` se aceptan pero NO se devuelven (probable: SI persisten pero la serializacion no los incluye — habria que confirmar cuando GET /:id se implemente).

**Reglas de negocio:**
- `code`: opcional, unico por tenant.
- `document_number`: unico por tenant. 409 si duplicado.
- `document_type`: enum `["DNI", "CE", "PASSPORT"]`.
- `email`: unico por tenant.
- `birth_date`: edad minima 18 anios.
- `license.expiry_date`: no anterior a hoy.
- `availability`: enum `["available", "on-route", "resting", "vacation"]`.
- `status`: enum `["active", "inactive", "blocked", "suspended", "on_leave", "terminated"]`.
- `tenant_id`: del JWT.

---

### 4.2. GET /api/v1/master/drivers — Listar

**Estado:** OK 200. Documentado en Excel.

Query params: `page, pageSize, search, sortBy, sortOrder, status, availability`.

Response: envelope `{items[], meta}`. El frontend mapea con `mapDriverFromBackend()` que rellena defaults para sub-objetos faltantes y calcula checklist client-side.

---

### 4.3. GET /api/v1/master/drivers/stats — Stats globales

**Estado:** OK 200. Documentado en Excel.

```json
{
  "data": {
    "total": 37,
    "enabled": 30,
    "blocked": 4,
    "expiringSoon": 3,
    "expired": 0,
    "available": 25,
    "onRoute": 5,
    "resting": 1,
    "onVacation": 6,
    "withOpenIncidents": 0
  }
}
```

Fallback frontend: si `/stats` falla, recalcula desde el listado.

---

### 4.4. GET /api/v1/master/drivers/expiring-licenses — Licencias por vencer

**Estado:** OK 200. Documentado en Excel.

Query: `?daysAhead=30` (default 30, max 365).

Devuelve lista de drivers con licencia que vence en N dias.

---

### 4.5. GET /api/v1/master/drivers/by-document/:doc — Buscar por documento

**Estado:** OK 200. **NO esta en el Excel oficial pero el backend SI lo implementa.**

Path param: numero de documento. Path NO es UUID, no sufre el problema de los `:id`.

Response: driver completo o `{data: null}` si no existe.

**Recomendacion al backend:** anadir este endpoint al Excel oficial para que quede documentado.

---

### 4.6. POST /api/v1/master/drivers/bulk-delete — Eliminar varios

**Estado:** OK 200. Documentado en Excel.

Body: `{ids: [...]}`. Soft delete.

---

### 4.7. GET /api/v1/master/drivers/:id — Detalle (NO IMPLEMENTADO)

**Estado:** 404 — **Documentado en Excel pero el backend no lo implemento.**

**Llamado por:**
- Componente: `DriverDetailDrawer`
- Service: `driversService.getById(id)` (`src/services/master/drivers.service.ts:79`)

**Comportamiento del frontend cuando falla:** el helper `withMissingEndpointDetection` lanza un Error con `backendNotImplemented: true` y mensaje explicativo: "Detalle conductor (GET /master/drivers/:id) no esta disponible: el backend devuelve 404 porque esta ruta NO esta implementada en produccion."

**Response esperada cuando se implemente (200):**

```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "...",
    "code": "DRV-2026-001",
    "document_type": "DNI",
    "document_number": "45678123",
    "first_name": "Juan",
    "last_name": "Perez",
    "...": "(todos los campos planos)",
    "license": { "...sub-objeto completo..." },
    "emergency_contact": { "...sub-objeto completo..." },
    "documents": [ "...array..." ],
    "created_at": "...",
    "updated_at": "...",
    "deleted_at": null
  }
}
```

**Reglas de negocio para implementar:**
- Solo drivers del tenant actual (filtro por JWT).
- Si tiene `deleted_at != null`: 404 con JSON estructurado (no plain text).
- Si el id no es UUID valido: 400.
- Devolver sub-objetos completos (license, emergency_contact, documents).

---

### 4.8. PUT /api/v1/master/drivers/:id — Actualizar (NO IMPLEMENTADO)

**Estado:** 404 — **Documentado en Excel pero el backend no lo implemento.**

**Request body:** mismo shape que POST. Solo campos que cambian (los `undefined` se omiten).

**Reglas de negocio para implementar:**
- `document_number` o `email`: 409 si cambia y duplicado.
- `license.expiry_date`: no anterior a hoy.
- Si `deleted_at != null`: 404.
- Auditoria: actualizar `updated_at`.

---

### 4.9. DELETE /api/v1/master/drivers/:id — Eliminar (NO IMPLEMENTADO)

**Estado:** 404 — **Documentado en Excel pero el backend no lo implemento.**

**Reglas de negocio para implementar:**
- Soft delete: `deleted_at = NOW()`.
- Si tiene ordenes `in_transit`: 422.
- Si tiene vehiculo asignado, desasignar primero.
- Auditar quien lo elimino.

---

### 4.10. PATCH /api/v1/master/drivers/:id/status — Cambiar status (NO IMPLEMENTADO)

**Estado:** 404 — **Documentado en Excel pero el backend no lo implemento.**

**Llamado por (frontend v2):**
- `driversService.enable(id)` → `PATCH /:id/status` body `{status: "active"}`
- `driversService.block(id, reason)` → `PATCH /:id/status` body `{status: "blocked", reason}`
- `driversService.changeStatus(id, status, reason?)` → `PATCH /:id/status` body `{status, reason?}`

Antes de v2, el frontend usaba `POST /:id/enable` y `POST /:id/block` (paths inventados, no en Excel). En v2 esto se corrigio.

**Request body:**

```json
{
  "status": "active" | "inactive" | "blocked" | "suspended" | "on_leave" | "terminated",
  "reason": "(opcional, requerido para blocked/suspended/terminated/on_leave)"
}
```

**Response esperada (200):**

```json
{
  "data": {
    "id": "uuid",
    "status": "blocked",
    "blocked_reason": "...",
    "blocked_at": "...",
    "blocked_by": "user-uuid",
    "updated_at": "..."
  }
}
```

**Reglas de negocio para implementar:**
- `status`: enum estricto.
- Validar transiciones (terminated no vuelve a active sin rehire).
- Si `status === "blocked"` y reason ausente: 422.
- Si `status === "active"` desde `blocked`: borrar campos `blocked_*`.
- Si checklist incompleto y status="active": 422 ("faltan documentos").
- Auditoria en `driver_status_history`.

---

### 4.11-4.13. Endpoints inventados eliminados del frontend en v2

#### 4.11. POST /:id/enable
**Estado:** ELIMINADO. Reemplazado por PATCH /:id/status (4.10).

#### 4.12. POST /:id/block
**Estado:** ELIMINADO. Reemplazado por PATCH /:id/status (4.10).

#### 4.13. GET /:id/checklist
**Estado:** ELIMINADO. El frontend ahora calcula el checklist client-side en el transformer (`computeChecklistFromBackendDriver()`).

**Items que el checklist evalua client-side:**
- Documento de identidad (basado en `document_number` presente)
- Datos de contacto (email + phone presentes)
- Estado activo del conductor (`status === "active"`)

Cuando el backend implemente `GET /:id` y devuelva los sub-objetos completos (`license`, `emergency_contact`, `documents`), el checklist client-side podra evaluar tambien:
- Licencia vigente (no vencida)
- Contacto de emergencia completo
- Documentos requeridos validos

**Recomendacion al backend:** **NO necesita implementar** este endpoint. El frontend calcula el checklist a partir de los datos ya disponibles. Solo necesita devolver los sub-objetos completos en GET /:id (cuando se implemente).

---

### 4.14-4.15. POST /:id/assign-vehicle, /:id/unassign-vehicle (PENDIENTES)

**Estado:** 404 — **Frontend usa estos paths pero NO estan en el Excel.** Se mantienen en v2 con detector de "no implementado" hasta que el backend defina la ruta correcta.

**Hallazgo:** existe el modulo `/master/assignments` en el backend (`GET` devuelve `{data:[], total:0}`, `POST` devuelve 500 con cualquier body). Probablemente sea ahi donde se centralizan las asignaciones driver-vehicle.

**Solicitud al backend:**
1. Definir donde van las asignaciones driver-vehicle:
   - Opcion A: `POST /master/drivers/:id/assign-vehicle` (en cada modulo, lo que el frontend asumio)
   - Opcion B: `POST /master/assignments` con body `{driver_id, vehicle_id}` (modulo central)
2. Documentar en el Excel oficial.
3. Implementar el handler. Si es opcion B, arreglar el 500 actual.

**Reglas de negocio (independiente de la opcion):**
- driver y vehicle deben existir en el mismo tenant.
- Vehiculo no debe estar asignado a otro driver activamente.
- Driver con `status === "active"` y licencia compatible con tipo de vehiculo.
- Auditoria en tabla `driver_vehicle_assignments`.

---

### 4.16. POST /api/v1/master/drivers (segundo create, test E2E)

Mismo endpoint que 4.1. Listado por separado porque el test E2E lo ejecuta dos veces.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Sub-objetos no devueltos en POST/listado

El backend acepta `license`, `emergency_contact`, `documents` en POST sin error pero los devuelve solo en los campos planos del primer nivel. No podemos verificar si se persisten realmente hasta que `GET /:id` se implemente.

**Solicitud al backend:** confirmar que SI persisten en BD; devolverlos completos en POST response y en GET /:id.

### 5.2. Ambiguedad en categoria de licencia: AIII vs A-IIIc

El frontend permite ambos formatos. El test E2E envia `"AIII"` y el backend lo acepta sin error. La tabla maestra/Rev3 sugieren formato peruano oficial `["A-I", "A-IIa", "A-IIb", "A-IIIa", "A-IIIb", "A-IIIc"]`.

**Solicitud al backend:** validar enum estricto. Si llega `"AIII"`, normalizar a `"A-IIIc"` o devolver 422.

### 5.3. Field `assigned_vehicle_id` en POST no es bidireccional

Si en POST se envia `assigned_vehicle_id`, el backend lo acepta pero no actualiza la relacion en la tabla `vehicles`.

**Solicitud al backend:** decidir si rechazar el campo en POST (forzando uso de `/assign-vehicle` o `/master/assignments`) o hacerlo bidireccional automaticamente.

### 5.4. Stats no agrupan por operator

El frontend tiene una vista por operador y necesita stats filtradas por `operator_id`.

**Solicitud al backend:** aceptar `?operatorId=xxx` en `/stats`.

### 5.5. /by-document/:doc no esta en el Excel

El backend lo tiene implementado pero no documentado.

**Solicitud al backend:** anadir al Excel oficial.

### 5.6. `/master/assignments` POST devuelve 500

El modulo existe (GET 200) pero POST con cualquier body devuelve "Internal Server Error".

**Solicitud al backend:** documentar el shape esperado del POST body, arreglar el 500.

---

## 6. CAMBIOS RECIENTES EN EL FRONTEND (v2)

### 6.1. Diagnostico corregido: NO era bug NGINX

Se renombro el helper `withIdBugDetection` a `withMissingEndpointDetection`. El mensaje de error ahora es preciso: en lugar de "bug NGINX, afecta a todos los modulos" dice "esta ruta NO esta implementada en produccion".

### 6.2. enable/block reemplazados por PATCH /:id/status

Antes:
```typescript
async enable(driverId) → POST /:id/enable
async block(driverId, reason) → POST /:id/block { reason }
```

Ahora:
```typescript
async enable(driverId) → PATCH /:id/status { status: "active" }
async block(driverId, reason) → PATCH /:id/status { status: "blocked", reason }
async changeStatus(driverId, status, reason?) → PATCH /:id/status { status, reason? }
```

### 6.3. Checklist calculado client-side en el transformer

`computeChecklistFromBackendDriver(b)` reemplaza al endpoint inventado `/:id/checklist`. Calcula completionPercentage real basado en campos del driver (no default 0%).

### 6.4. assignVehicle/unassignVehicle pendientes

Se mantienen los paths originales con detector de "no implementado". Decision pendiente del backend sobre si usar `/:id/assign-vehicle` (opcion A) o `/master/assignments` (opcion B).

### 6.5. Fallback de stats client-side conservado

Si `/stats` falla (404 o 500), el frontend recalcula desde el listado.

---

## 7. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico (4 endpoints documentados pero NO implementados)

- [ ] **Implementar `GET /master/drivers/:id`** (devolver driver completo con license, emergency_contact, documents).
- [ ] **Implementar `PUT /master/drivers/:id`** (actualizar con validaciones).
- [ ] **Implementar `DELETE /master/drivers/:id`** (soft delete con validacion de ordenes activas).
- [ ] **Implementar `PATCH /master/drivers/:id/status`** (cambio de status con auditoria; el frontend ya usa este path para enable/block/changeStatus).

### Alta prioridad

- [ ] **Decidir y implementar assign/unassign vehicle**: o bien `POST /master/drivers/:id/assign-vehicle` (frontend ya lo intenta) o bien `POST /master/assignments` (existe pero da 500). Documentar en Excel.
- [ ] En POST/PUT, persistir y devolver sub-objetos `license`, `emergency_contact`, `documents` completos (actualmente acepta pero no devuelve).
- [ ] Validar `license.expiry_date` no anterior a hoy en POST y PUT.
- [ ] Validar edad minima 18 anios en `birth_date`.
- [ ] Normalizar `license.category` al formato peruano oficial.

### Media

- [ ] Agregar al Excel oficial el endpoint `GET /by-document/:doc` que ya esta implementado.
- [ ] Aceptar `?operatorId=xxx` en `/stats` para filtrar por operador.
- [ ] Validar transiciones de status (terminated no vuelve a active sin rehire).

### Documentacion

- [ ] Actualizar Excel oficial con todos los endpoints reales (incluido el caso de `/by-document/:doc`).
- [ ] Postman/Bruno collection.

---

## 8. APENDICE: COMO REPRODUCIR LOS TESTS

### Test E2E completo

```bash
cd C:/Users/CRISTON/Desktop/Nueva\ carpeta\ \(3\)/TMS-NAVITEL-prueba
node otros/testing/test-drivers-full.mjs
```

Variables de entorno (defaults):

```bash
API_BASE=https://api-service.gruponavitel.com
LOGIN_USER=admin
LOGIN_PASSWORD=Admin1432!
```

Salida esperada (estado actual produccion 2026-05-03):

```
✅ 201 POST /master/drivers (crear)
✅ 200 GET /master/drivers (listar)
❌ 404 GET /master/drivers/:id (detalle)         Excel: SI / Backend: NO IMPLEMENTADO
❌ 404 PUT /master/drivers/:id (actualizar)      Excel: SI / Backend: NO IMPLEMENTADO
✅ 200 GET /master/drivers/stats
✅ 200 GET /master/drivers/expiring-licenses
✅ 200 GET /master/drivers/by-document/:doc
❌ 404 GET /master/drivers/:id/checklist         NO en Excel; calculo client-side
❌ 404 PATCH /master/drivers/:id/status (active) Excel: SI / Backend: NO IMPLEMENTADO
❌ 404 PATCH /master/drivers/:id/status (blocked) Excel: SI / Backend: NO IMPLEMENTADO
❌ 404 PATCH /master/drivers/:id/status (on_leave) Excel: SI / Backend: NO IMPLEMENTADO
❌ 404 POST /master/drivers/:id/assign-vehicle    NO en Excel; ver /master/assignments
❌ 404 POST /master/drivers/:id/unassign-vehicle  NO en Excel; ver /master/assignments
✅ 201 POST /master/drivers (segundo)
✅ 200 POST /master/drivers/bulk-delete
❌ 404 DELETE /master/drivers/:id                Excel: SI / Backend: NO IMPLEMENTADO

PORCENTAJE FUNCIONAL: 43.8% (7/16)
```

### Tests de diagnostico profundo

Para reproducir la investigacion que descarto NGINX como causa:

```bash
node otros/testing/deep-diag-drivers.mjs    # firma del 404, variantes de path/UUID
node otros/testing/deep-diag-2.mjs          # con/sin auth para descartar NGINX
node otros/testing/deep-diag-3.mjs          # 23 variantes de shape de cada operacion
node otros/testing/deep-diag-4.mjs          # PATCH /:id/status, /master/assignments
```

### Despues de las implementaciones del backend

Cuando el backend implemente:
- GET /:id, PUT /:id, DELETE /:id, PATCH /:id/status
- Defina assign/unassign vehicle

Re-ejecutar `test-drivers-full.mjs` y se espera ver:

```
PORCENTAJE FUNCIONAL: 100% (16/16)
```

Sin necesidad de cambios en el frontend (ya esta listo para esos endpoints).

---

**Fin del documento.**

Cualquier duda sobre estos endpoints, contactar al equipo frontend con el id de este documento (DRIVERS-BACKEND-HANDOFF v2.0 — diagnostico corregido).
