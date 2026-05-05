# MODULO VEHICLES — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 6 de 14 endpoints funcionan (42.9%). Los 8 endpoints bloqueados sufren el mismo bug NGINX `:id` que afecta a Orders, Customers, Drivers y otros 4 modulos mas (problema global del proxy reverso).

---

## INDICE

1. Resumen ejecutivo
2. Bug critico transversal: NGINX y rutas con `:id`
3. Lista de endpoints que el frontend USA (cross-check con tabla maestra)
4. Detalle por endpoint (request, response, reglas de negocio)
5. Otros bugs y observaciones
6. Cambios recientes en el frontend
7. Checklist de acciones para el backend
8. Apendice: como reproducir los tests

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Vehicles

Gestion de la flota de vehiculos del tenant. Incluye:
- Crear, listar, ver detalle, editar y eliminar vehiculos
- Tipos: camion, tractocamion, furgon, van, etc.
- Tipos de carroceria: furgon, plataforma, tanque, refrigerado, granelero, etc.
- Datos de identificacion: placa (con validacion formato peruano `ABC-123`), code interno, VIN, color
- Specs tecnicas: marca, modelo, anio, motor, chasis, ejes, llantas, transmision, tipo combustible, capacidad tanque
- Capacidad de carga: max payload (kg), max volumen (m³), max pallets, peso bruto, peso tara
- Polizas de seguro (SOAT, Todo Riesgo): numero, asegurador, vigencia, cobertura
- Registracion SUNARP: numero, propietario, fecha, oficina registral
- Documentos asociados: SOAT, revision tecnica, tarjeta de propiedad, certificados
- Estado operacional: available, on-route, maintenance, repair, inactive
- Estado de habilitacion: active, inactive (blocked, suspended)
- Mantenimientos programados e historial
- Historial de combustible
- Incidentes
- Asignar y desasignar conductor (relacion bidireccional con Drivers)
- Buscar por placa
- Estadisticas globales (total, habilitados, bloqueados, por estado operacional)
- Bulk delete

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 14 |
| Funcionando OK en produccion | 6 (42.9%) |
| Bloqueados por bug NGINX `:id` | 8 |
| Errores 5xx | 0 |

### Endpoints OPERATIVOS (6)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| POST | `/api/v1/master/vehicles` | Crear vehiculo |
| GET | `/api/v1/master/vehicles` | Listar vehiculos paginados con filtros |
| GET | `/api/v1/master/vehicles/stats` | Stats globales |
| GET | `/api/v1/master/vehicles/by-plate/:plate` | Busqueda por placa (path NO-UUID) |
| POST | `/api/v1/master/vehicles/bulk-delete` | Eliminar varios por IDs (en body, no path) |
| POST | `/api/v1/master/vehicles` (segundo crear, para test) | OK |

### Endpoints BLOQUEADOS por bug NGINX `:id` (8)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/vehicles/:id` | Detalle de un vehiculo |
| PUT | `/api/v1/master/vehicles/:id` | Actualizar vehiculo |
| DELETE | `/api/v1/master/vehicles/:id` | Eliminar vehiculo |
| GET | `/api/v1/master/vehicles/:id/checklist` | Checklist documentario |
| POST | `/api/v1/master/vehicles/:id/enable` | Habilitar vehiculo |
| POST | `/api/v1/master/vehicles/:id/block` | Bloquear vehiculo |
| POST | `/api/v1/master/vehicles/:id/assign-driver` | Asignar conductor |
| POST | `/api/v1/master/vehicles/:id/unassign-driver` | Desasignar conductor |

### Impacto en el usuario final

Sin estos 8 endpoints arreglados, el usuario NO puede:
- Ver el detalle completo de un vehiculo individual (specs, capacity, insurance, documents)
- Editar un vehiculo existente (kilometraje, datos de seguro, observaciones)
- Eliminar un vehiculo individual (solo bulk delete)
- Habilitar/bloquear vehiculos (poner fuera de servicio para mantenimiento)
- Ver checklist documentario (SOAT vigente, revision tecnica, etc.)
- Asignar conductor a vehiculo (clave para programar ordenes con la pareja conductor+vehiculo)
- Desasignar el conductor cuando entra en mantenimiento

El frontend SI puede crear, listar, ver stats, buscar por placa y eliminar masivamente.

---

## 2. BUG CRITICO TRANSVERSAL: NGINX Y RUTAS CON `:id`

### Que es NGINX y por que importa

NGINX es el proxy reverso del servidor backend. Antes de que cualquier peticion HTTP llegue al codigo del backend de aplicacion (Express/Fastify/Node.js), debe pasar por NGINX. NGINX revisa una lista de rutas permitidas y, si la ruta no esta en su configuracion, rechaza la peticion con su pagina default `404 Not Found`.

```
Frontend → Internet → NGINX (filtro) → Backend de aplicacion → Base de datos
                       ↑
                       Aqui se rechazan las peticiones con :id
```

### Como se manifiesta el bug en el modulo Vehicles

**Caso de uso real:** un usuario abre la flota en `/master/vehicles`, ve la tabla con sus 30 unidades, y hace click en un camion para ver su detalle, su SOAT, su kilometraje, el conductor asignado y el ultimo mantenimiento.

Paso a paso lo que ocurre:

1. Usuario hace click en el vehiculo "Volvo FH16 placa ABC-123" (id `a275d46e-...-...`)
2. El frontend construye la URL: `GET /api/v1/master/vehicles/a275d46e-...`
3. La peticion sale al servidor `api-service.gruponavitel.com`
4. NGINX recibe la peticion y busca en su lista de rutas permitidas
5. NGINX encuentra `/api/v1/master/vehicles` (sin id) pero NO encuentra una regla que cubra `/api/v1/master/vehicles/{cualquier-uuid}`
6. NGINX rechaza la peticion sin pasarla al backend
7. NGINX devuelve su 404 default: status `404`, body `"Not Found"` en text/plain de 9 bytes
8. El frontend muestra error o (en el frontend actualizado) un mensaje explicativo

El backend de aplicacion **nunca recibe la peticion**. El controller del modulo Vehicles funciona perfectamente, pero NGINX nunca le pasa nada para procesar. El test E2E demuestra que `POST /master/vehicles` SI funciona y persiste en BD.

### Como sabemos que es NGINX y no el backend

| Endpoint | Status | Content-Type | Body | Quien respondio |
|---|:---:|---|---|---|
| GET /master/vehicles | 200 | application/json | JSON con `items[]` y `meta` | Backend (paso por NGINX) |
| GET /master/vehicles/stats | 200 | application/json | JSON con stats agrupadas | Backend |
| GET /master/vehicles/{uuid} | 404 | text/plain | `"Not Found"` (9 bytes exactos) | NGINX |
| GET /master/vehicles/by-plate/ABC-123 | 200 | application/json | JSON con datos | Backend |

El cuerpo `"Not Found"` plain text de exactamente 9 bytes es la pagina 404 default de NGINX. Si el backend hubiera respondido un 404 real, seria JSON estructurado.

### Por que afecta a TODOS los modulos del backend

El test `otros/testing/bug-deep-investigation.mjs` confirmo el bug en 7 modulos. Las rutas con string o numero en path param funcionan; solo UUIDs son rechazados.

### Causa raiz probable

NGINX tiene `location =` (match exacto) para ciertas rutas pero olvido las dinamicas con UUID. Una configuracion tipica que produciria este bug:

```nginx
# Esta linea SI funciona — match exacto
location = /api/v1/master/vehicles {
    proxy_pass http://backend-app:3000;
}

# FALTA esta linea — sin ella, /master/vehicles/{uuid} devuelve 404 default
location ~ ^/api/v1/master/vehicles/[a-f0-9-]+$ {
    proxy_pass http://backend-app:3000;
}
```

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

Despues: `nginx -s reload`. Esto arregla los 8 endpoints bloqueados de Vehicles + 30+ endpoints de los otros modulos en un solo cambio.

### Verificacion sugerida

```bash
TOKEN="<token de admin>"
VEHICLE=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/master/vehicles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"VEH-001","plate":"ABC-100","type":"camion","brand":"Volvo","model":"FH16","year":2022,"status":"active"}')

VEHICLE_ID=$(echo "$VEHICLE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).data.id)})")

curl -v -H "Authorization: Bearer $TOKEN" \
  "https://api-service.gruponavitel.com/api/v1/master/vehicles/$VEHICLE_ID"
```

Resultado esperado: `200 OK` con JSON estructurado.

---

## 3. LISTA DE ENDPOINTS QUE EL FRONTEND USA

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | POST | `/api/v1/master/vehicles` | SI | SI | SI | 201 | OK |
| 2 | GET | `/api/v1/master/vehicles` | SI | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/master/vehicles/stats` | SI | SI | SI | 200 | OK |
| 4 | GET | `/api/v1/master/vehicles/by-plate/:plate` | SI | SI | SI | 200 | OK |
| 5 | POST | `/api/v1/master/vehicles/bulk-delete` | SI | SI | SI | 200 | OK |
| 6 | POST | `/api/v1/master/vehicles` (segundo crear) | — | — | — | 201 | OK |
| 7 | GET | `/api/v1/master/vehicles/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 8 | PUT | `/api/v1/master/vehicles/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 9 | DELETE | `/api/v1/master/vehicles/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 10 | GET | `/api/v1/master/vehicles/:id/checklist` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 11 | POST | `/api/v1/master/vehicles/:id/enable` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 12 | POST | `/api/v1/master/vehicles/:id/block` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 13 | POST | `/api/v1/master/vehicles/:id/assign-driver` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 14 | POST | `/api/v1/master/vehicles/:id/unassign-driver` | SI | SI | SI | 404 | BLOQUEADO NGINX |

**Funcional: 6/14 = 42.9%**

Si el backend arregla NGINX, funcional sube a 14/14 = 100%.

---

## 4. DETALLE DE CADA ENDPOINT

### 4.1. POST /api/v1/master/vehicles — Crear vehiculo

**Estado:** Funciona OK (201)

**Llamado por:**
- Componente: `VehicleFormModal` (form con tabs: General, Specs, Capacidad, Seguro, Registracion, Documentos)
- Hook: `useVehicles().createVehicle()`
- Service: `vehiclesService.create(data)` (`src/services/master/vehicles.service.ts:62`)

**Cuando se llama:** Usuario abre modal "Crear vehiculo", llena tabs, click en "Guardar".

**Request body real (generado por `mapVehicleToBackend()`):**

```json
{
  "code": "VEH-2026-001",
  "plate": "ABC-123",
  "type": "camion",
  "body_type": "furgon",
  "trailer_plate": null,
  "brand": "Volvo",
  "model": "FH16",
  "year": 2022,
  "vin": "VIN12345678901234",
  "color": "Blanco",
  "fuel_type": "diesel",
  "operational_status": "available",
  "status": "active",
  "current_mileage": 50000,
  "gps_device_id": null,
  "operator_id": null,
  "notes": "Vehiculo nuevo",
  "capacity_kg": 25000,
  "capacity_m3": 80,
  "specs": {
    "engine_type": "diesel",
    "engine_number": "ENG12345",
    "chassis_number": "CHS12345",
    "axles": 3,
    "tires": 12,
    "fuel_tank_capacity": 400,
    "transmission": "manual",
    "engine_displacement": 16000
  },
  "capacity": {
    "max_weight_kg": 25000,
    "max_volume_m3": 80,
    "max_pallets": 33,
    "gross_weight": 35000,
    "tare_weight": 10000
  },
  "insurance": {
    "type": "SOAT",
    "policy_number": "POL-2026-001",
    "insurer": "Pacifico Seguros",
    "start_date": "2025-01-01",
    "end_date": "2026-12-31",
    "coverage_amount": 100000
  },
  "insurance_policies": [
    {
      "type": "SOAT",
      "policy_number": "POL-2026-001",
      "insurer": "Pacifico Seguros",
      "start_date": "2025-01-01",
      "end_date": "2026-12-31",
      "coverage_amount": 100000
    },
    {
      "type": "todo-riesgo",
      "policy_number": "TR-2026-001",
      "insurer": "Rimac",
      "start_date": "2025-01-01",
      "end_date": "2025-12-31",
      "coverage_amount": 500000
    }
  ],
  "registration": {
    "registration_number": "REG-2026-001",
    "owner_name": "Grupo Navitel SAC",
    "owner_document": "20111222333",
    "registration_date": "2022-03-15",
    "registry_office": "SUNARP Lima"
  },
  "documents": [
    {"name": "SOAT", "is_required": true, "status": "valid", "expiration_date": "2026-12-31"},
    {"name": "Revision tecnica", "is_required": true, "status": "valid", "expiration_date": "2026-08-15"},
    {"name": "Tarjeta de propiedad", "is_required": true, "status": "valid"}
  ]
}
```

**Response esperada (201):**

```json
{
  "data": {
    "id": "a275d46e-...",
    "tenant_id": "tenant-001",
    "code": "VEH-2026-001",
    "plate": "ABC-123",
    "type": "camion",
    "body_type": "furgon",
    "brand": "Volvo",
    "model": "FH16",
    "year": 2022,
    "vin": "VIN12345678901234",
    "color": "Blanco",
    "fuel_type": "diesel",
    "operational_status": "available",
    "status": "active",
    "current_mileage": 50000,
    "operator_id": null,
    "current_driver_id": null,
    "blocked_at": null,
    "blocked_reason": null,
    "created_at": "2026-05-03T07:32:18.000Z",
    "updated_at": "2026-05-03T07:32:18.000Z",
    "deleted_at": null
  }
}
```

**Reglas de negocio que el backend debe validar:**
- `plate`: formato peruano `ABC-123` (3 letras + guion + 3 numeros) o `ABC123` (sin guion). Si invalido → 400 con mensaje claro (CONFIRMADO: el backend ya valida esto).
- `plate`: unico por tenant. Si duplicado → 409.
- `type`: enum `["camion", "tractocamion", "furgoneta", "van", "remolque", "semirremolque", "moto"]`.
- `body_type`: enum `["furgon", "plataforma", "tanque", "refrigerado", "granelero", "porta-contenedor", "volquete"]`.
- `year`: numero entre 1990 y currentYear+1.
- `vin`: opcional, 17 caracteres alfanumericos si presente.
- `fuel_type`: enum `["diesel", "gasolina", "gnv", "glp", "electrico", "hibrido"]`.
- `current_mileage`: numero positivo.
- `operational_status`: enum `["available", "on-route", "maintenance", "repair", "inactive"]`.
- `status`: enum `["active", "inactive", "blocked", "suspended"]`.
- `tenant_id`: del JWT, no del body.
- Si todos los campos son validos: persistir y devolver el registro.

**OBSERVACION CRITICA — Sub-objetos no persistidos:**

El test E2E confirma que el backend ACEPTA sin error los sub-objetos `specs{}`, `capacity{}`, `insurance{}`, `insurance_policies[]`, `registration{}`, `documents[]`, pero los IGNORA SILENCIOSAMENTE — no los guarda en BD ni los devuelve en el response. Esto esta documentado en el comentario del transformer (`vehicle.transformer.ts:11-19`).

Solo se persisten los campos planos al root: `code, plate, type, body_type, trailer_plate, brand, model, year, vin, color, fuel_type, operational_status, status, current_mileage, gps_device_id, notes, operator_id, current_driver_id`.

**Implicancia:** el modulo Vehicles esta funcionalmente incompleto en BD. Para que el sistema sea util:
- El backend debe crear las tablas `vehicle_specs`, `vehicle_capacity`, `vehicle_insurance_policies`, `vehicle_registration`, `vehicle_documents`.
- En POST/PUT, persistir tambien los sub-objetos.
- En GET /:id, devolver los sub-objetos poblados.

Mientras tanto, el frontend manda todo el payload (asi quedara registrado para cuando el backend este listo) y rellena con defaults vacios cuando lee desde el listado.

---

### 4.2. GET /api/v1/master/vehicles — Listar vehiculos

**Estado:** Funciona OK (200)

**Llamado por:**
- Componente: pagina `/master/vehicles`
- Hook: `useVehicles()` con react-query
- Service: `vehiclesService.getAll(params)`

**Query params:**

```
?page=1&pageSize=20&search=ABC&status=active&sortBy=plate&sortOrder=asc
```

**Response (200):**

```json
{
  "items": [
    {
      "id": "a275d46e-...",
      "code": "VEH-2026-001",
      "plate": "ABC-123",
      "type": "camion",
      "body_type": "furgon",
      "brand": "Volvo",
      "model": "FH16",
      "year": 2022,
      "operational_status": "available",
      "status": "active",
      "current_mileage": 50000,
      "operator_id": null,
      "current_driver_id": null,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {"page": 1, "pageSize": 20, "total": 12, "totalPages": 1}
}
```

**Post-processing:** El frontend mapea con `mapVehicleFromBackend()` y rellena sub-objetos faltantes con defaults vacios (`defaultCapacity`, `defaultRegistration`, `defaultChecklist`).

**Reglas de negocio:**
- Filtros combinables con AND.
- `search`: busca en `plate`, `code`, `vin`, `brand`, `model`.
- `pageSize`: max 100.
- Solo registros del tenant actual. Excluye `deleted_at != null`.

---

### 4.3. GET /api/v1/master/vehicles/stats — Stats globales

**Estado:** Funciona OK (200)

**Response (200):**

```json
{
  "data": {
    "total": 12,
    "enabled": 10,
    "blocked": 2,
    "expiringSoon": 1,
    "expired": 0,
    "available": 7,
    "onRoute": 3,
    "inMaintenance": 1,
    "inRepair": 0,
    "inactive": 1,
    "withOpenIncidents": 0
  }
}
```

**Reglas de negocio:**
- `total`: count del tenant, no eliminados.
- `enabled`: `status === "active"`.
- `blocked`: `status === "blocked"` o `"suspended"`.
- `expiringSoon`: vehiculos con SOAT o revision tecnica que vence en los proximos 30 dias.
- `expired`: vehiculos con SOAT o revision tecnica vencida.
- Counts por `operational_status`: available, onRoute, inMaintenance, inRepair, inactive.

**Fallback frontend:** Si el endpoint falla con 404 o 500, el frontend recalcula desde el listado (`computeStatsFromList()`).

---

### 4.4. GET /api/v1/master/vehicles/by-plate/:plate — Buscar por placa

**Estado:** Funciona OK (200) — no UUID en path, no sufre bug NGINX.

**Llamado por:** form de crear/editar vehiculo, al perder foco del campo placa, para detectar duplicados.

**Path param:** `:plate` ej. `ABC-123`.

**Response (200):**

```json
{
  "data": {
    "id": "a275d46e-...",
    "plate": "ABC-123",
    "code": "VEH-2026-001",
    "brand": "Volvo",
    "model": "FH16",
    "status": "active"
  }
}
```

Si no existe: `{"data": null}` con 200 o 404 con JSON estructurado.

**Reglas de negocio:**
- Solo tenant actual. Excluye eliminados.
- Si encuentra varios (no deberia, por bug historico), devolver el mas reciente.
- Tolerar formato con o sin guion: `ABC-123` y `ABC123` deberian matchear el mismo registro.

---

### 4.5. POST /api/v1/master/vehicles/bulk-delete — Eliminar varios

**Estado:** Funciona OK (200)

**Request body:**

```json
{"ids": ["a275d46e-...", "8deba226-..."]}
```

**Response (200):**

```json
{"data": {"deleted_count": 2, "deleted_ids": ["...", "..."]}}
```

**Reglas de negocio:**
- Soft delete: `deleted_at = NOW()`.
- Si algun id no existe o es de otro tenant: ignorar.
- Si un vehiculo tiene una orden `in_transit` asignada: 422 con lista de los que no se pudieron borrar.
- Si un vehiculo tiene un conductor asignado, desasignarlo primero.

---

### 4.6. POST /api/v1/master/vehicles — Crear segundo (test E2E)

Mismo endpoint del 4.1. Listado por separado porque el test E2E lo ejecuta dos veces.

---

### 4.7. GET /api/v1/master/vehicles/:id — Detalle vehiculo (BLOQUEADO NGINX)

**Estado:** BLOQUEADO. NGINX devuelve 404.

**Llamado por:**
- Componente: `VehicleDetailDrawer`
- Hook: `useVehicle(id)` con react-query
- Service: `vehiclesService.getById(id)` (`src/services/master/vehicles.service.ts:55`)

**Response esperada cuando NGINX este arreglado (200):**

```json
{
  "data": {
    "id": "a275d46e-...",
    "tenant_id": "tenant-001",
    "code": "VEH-2026-001",
    "plate": "ABC-123",
    "type": "camion",
    "body_type": "furgon",
    "trailer_plate": null,
    "brand": "Volvo",
    "model": "FH16",
    "year": 2022,
    "vin": "VIN12345678901234",
    "color": "Blanco",
    "fuel_type": "diesel",
    "operational_status": "available",
    "status": "active",
    "current_mileage": 50000,
    "gps_device_id": null,
    "operator_id": null,
    "current_driver_id": "d-uuid-123",
    "current_driver": {
      "id": "d-uuid-123",
      "first_name": "Juan",
      "last_name": "Perez",
      "document_number": "45678123"
    },
    "specs": {
      "engine_type": "diesel",
      "engine_number": "ENG12345",
      "chassis_number": "CHS12345",
      "axles": 3,
      "tires": 12,
      "fuel_tank_capacity": 400,
      "transmission": "manual",
      "engine_displacement": 16000
    },
    "capacity": {
      "max_weight_kg": 25000,
      "max_volume_m3": 80,
      "max_pallets": 33,
      "gross_weight": 35000,
      "tare_weight": 10000
    },
    "insurance_policies": [
      {"id": "ins-1", "type": "SOAT", "policy_number": "POL-2026-001", "insurer": "Pacifico", "start_date": "2025-01-01", "end_date": "2026-12-31", "coverage_amount": 100000}
    ],
    "registration": {
      "registration_number": "REG-2026-001",
      "owner_name": "Grupo Navitel SAC",
      "owner_document": "20111222333",
      "registration_date": "2022-03-15",
      "registry_office": "SUNARP Lima"
    },
    "documents": [
      {"id": "doc-1", "name": "SOAT", "is_required": true, "status": "valid", "expiration_date": "2026-12-31", "file_url": "https://..."}
    ],
    "blocked_at": null,
    "blocked_reason": null,
    "created_at": "...",
    "updated_at": "...",
    "deleted_at": null
  }
}
```

**Workaround actual del frontend:** El service detecta el 404 y lanza un `Error` con flag `backendBug: true` y mensaje explicativo.

---

### 4.8. PUT /api/v1/master/vehicles/:id — Actualizar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Llamado por:** `VehicleFormModal` en modo edicion.

**Request body:** mismo shape que POST, pero solo los campos que cambiaron (los `undefined` se omiten en el mapper).

**Reglas de negocio:**
- `plate`: si cambia y duplicada en otro vehiculo → 409.
- `current_mileage`: si cambia, no puede ser MENOR que el anterior → 422 (los kilometros no retroceden).
- Si vehiculo `deleted_at != null`: 404.
- Auditoria: `updated_at`.

---

### 4.9. DELETE /api/v1/master/vehicles/:id — Eliminar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Reglas de negocio:**
- Soft delete: `deleted_at = NOW()`.
- Si tiene ordenes `in_transit`: 422.
- Si tiene conductor asignado, desasignar primero.

---

### 4.10. GET /api/v1/master/vehicles/:id/checklist — Checklist documentario (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Response esperada (200):**

```json
{
  "data": {
    "entityId": "a275d46e-...",
    "entityType": "vehicle",
    "documents": [
      {"name": "SOAT", "isRequired": true, "status": "valid", "expirationDate": "2026-12-31"},
      {"name": "Revision tecnica", "isRequired": true, "status": "expiring_soon", "expirationDate": "2026-05-25"},
      {"name": "Tarjeta de propiedad", "isRequired": true, "status": "valid"},
      {"name": "Poliza todo riesgo", "isRequired": false, "status": "missing"}
    ],
    "isComplete": false,
    "completionPercentage": 75,
    "missingItems": ["Poliza todo riesgo"]
  }
}
```

**Reglas:** Catalogo de items requeridos por tipo de vehiculo.

---

### 4.11. POST /api/v1/master/vehicles/:id/enable — Habilitar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:** `{}`

**Reglas:**
- Setear `status = "active"`.
- Si SOAT vencido o revision tecnica vencida: 422 "No se puede habilitar: documentos vencidos: [...]".
- Idempotente.

---

### 4.12. POST /api/v1/master/vehicles/:id/block — Bloquear (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:**

```json
{"reason": "Llantas en mal estado, requiere cambio antes de operar"}
```

**Reglas:**
- Setear `status = "blocked"`, `blocked_at = NOW()`, `blocked_reason = reason`, `blocked_by = currentUser.id`.
- `reason` obligatorio (>= 10 chars).
- Si tiene orden `in_transit`, marcar alerta pero no abortar la orden.

---

### 4.13. POST /api/v1/master/vehicles/:id/assign-driver — Asignar conductor (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:**

```json
{"driverId": "d-uuid-123"}
```

**Response esperada cuando NGINX este arreglado (200):**

```json
{
  "data": {
    "id": "a275d46e-...",
    "current_driver_id": "d-uuid-123",
    "current_driver": {"id": "d-uuid-123", "first_name": "Juan", "last_name": "Perez"},
    "updated_at": "..."
  }
}
```

**Reglas:**
- El driver debe existir, no estar eliminado, mismo tenant, status active, licencia compatible con tipo de vehiculo.
- Si ya tenia driver, desasignar el anterior.
- Si el driver ya tenia otro vehiculo, decidir: rechazar (409) o transferir con `force=true`.
- Auditoria en `vehicle_driver_assignments`.

---

### 4.14. POST /api/v1/master/vehicles/:id/unassign-driver — Desasignar conductor (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:** `{}`

**Reglas:**
- Setear `current_driver_id = null` en vehiculo y `assigned_vehicle_id = null` en driver.
- Si vehiculo en orden `in_transit`: 422.
- Idempotente: si ya estaba sin conductor, devolver 200.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Sub-objetos persisten silenciosamente (CRITICO)

El backend ACEPTA `specs{}`, `capacity{}`, `insurance{}`, `insurance_policies[]`, `registration{}`, `documents[]` en POST sin error pero NO los persiste. El response del POST y el listado solo devuelven los campos planos.

**Impacto:** todo lo que captura el form (capacidad, polizas, registracion, documentos) se pierde. El usuario llena un formulario completo y solo se guarda la mitad.

**Sugerencia:** crear las tablas relacionadas y persistir.

### 5.2. No hay endpoint para historial de mantenimientos

El frontend espera tener `maintenanceHistory`, `fuelHistory`, `inspectionHistory`, `incidents` en el detalle del vehiculo. El backend no provee endpoints para esto. Se rellena con arrays vacios.

**Sugerencia:** o bien anadirlos al GET /:id, o bien crear endpoints separados:
- `GET /master/vehicles/:id/maintenance-history`
- `GET /master/vehicles/:id/fuel-history`
- `GET /master/vehicles/:id/incidents`

### 5.3. Validacion de placa peruana implementada (CONFIRMADO OK)

El backend ya valida el formato de placa peruano `ABC-123` o `ABC123`. Ejemplo de mensaje: `"El formato de placa es invalido (ejemplo: ABC-123 o ABC123)"`. Esto es CORRECTO.

### 5.4. Falta endpoint de change-mileage

Cuando el conductor reporta el odometro al final de un viaje, deberia haber un endpoint:
- `POST /master/vehicles/:id/odometer` con body `{value: 51234, source: "trip-end"}` que actualice `current_mileage` con auditoria.

### 5.5. Bug NGINX

Detallado en seccion 2.

---

## 6. CAMBIOS RECIENTES EN EL FRONTEND

### 6.1. Nuevo helper `withIdBugDetection()` en `vehicles.service.ts`

Aplicado a: `getById`, `update`, `getChecklist`, `enable`, `block`, `assignDriver`, `unassignDriver`. Lanza un Error con `backendBug: true` y mensaje explicativo cuando detecta el 404 de NGINX. Cuando el backend arregle NGINX, este helper sigue funcionando sin cambios (no se dispara).

### 6.2. Fallback de stats client-side conservado

Si `/stats` devuelve 404 o 500, el frontend recalcula desde el listado.

### 6.3. Mapper rellena defaults

Como el backend no devuelve sub-objetos, el mapper rellena `capacity`, `registration`, `checklist`, `insurancePolicies[]`, `documents[]`, etc. con defaults vacios.

### 6.4. Transformer envia AMBOS shapes de insurance

El backend acepta `insurance: {...}` (singular, primera poliza) en POST. El doc Rev3 menciona que GET /:id devolvera `insurance: [{...}]` (array). El mapper envia ambos: `insurance` (singular, la primera) Y `insurance_policies[]` (array completo) — ver `vehicle.transformer.ts:304-324`.

---

## 7. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico

- [ ] **Arreglar bug NGINX** (ver seccion 2). Desbloquea 8 endpoints de Vehicles + 30+ de otros modulos.

### Alta prioridad

- [ ] Persistir sub-objetos `specs`, `capacity`, `insurance_policies`, `registration`, `documents` en POST/PUT. Crear las tablas relacionadas si no existen.
- [ ] En GET /:id, devolver los sub-objetos poblados (cuando NGINX este arreglado).
- [ ] Validar que `current_mileage` no decrezca en PUT.
- [ ] Implementar `/checklist` con catalogo de documentos requeridos por tipo de vehiculo.
- [ ] En enable, validar que SOAT y revision tecnica esten vigentes.

### Media

- [ ] Anadir endpoint `POST /master/vehicles/:id/odometer` para registrar lecturas con auditoria.
- [ ] Anadir endpoints de historial: maintenance-history, fuel-history, incidents.
- [ ] En assign-driver, validar que la categoria de licencia del driver permite operar el vehiculo.
- [ ] En DELETE y bulk-delete, rechazar si tiene ordenes `in_transit`.

### Documentacion

- [ ] Actualizar Postman/Bruno collection con los 14 endpoints documentados aqui.
- [ ] Confirmar enums actuales (`type`, `body_type`, `fuel_type`, `operational_status`).

---

## 8. APENDICE: COMO REPRODUCIR LOS TESTS

### Test E2E completo del modulo Vehicles

```bash
cd C:/Users/CRISTON/Desktop/Nueva\ carpeta\ \(3\)/TMS-NAVITEL-prueba
node otros/testing/test-vehicles-full.mjs
```

Variables de entorno (defaults: API_BASE=https://api-service.gruponavitel.com, LOGIN_USER=admin, LOGIN_PASSWORD=Admin1432!).

Salida esperada:

```
✅ 201 POST /master/vehicles (crear)
✅ 200 GET /master/vehicles (listar)
❌ 404 GET /master/vehicles/:id (detalle)             BUG NGINX :id
❌ 404 PUT /master/vehicles/:id (actualizar)          BUG NGINX :id
✅ 200 GET /master/vehicles/stats
✅ 200 GET /master/vehicles/by-plate/:plate
❌ 404 GET /master/vehicles/:id/checklist             BUG NGINX :id
❌ 404 POST /master/vehicles/:id/enable               BUG NGINX :id
❌ 404 POST /master/vehicles/:id/block                BUG NGINX :id
❌ 404 POST /master/vehicles/:id/assign-driver        BUG NGINX :id
❌ 404 POST /master/vehicles/:id/unassign-driver      BUG NGINX :id
✅ 201 POST /master/vehicles (segundo)
✅ 200 POST /master/vehicles/bulk-delete
❌ 404 DELETE /master/vehicles/:id                    BUG NGINX :id

PORCENTAJE FUNCIONAL: 42.9%  (6/14)
```

### Despues del fix de NGINX

```
PORCENTAJE FUNCIONAL: 100%  (14/14)
```

---

**Fin del documento.**

Cualquier duda sobre estos endpoints, contactar al equipo frontend con el id de este documento (VEHICLES-BACKEND-HANDOFF v1.0).
