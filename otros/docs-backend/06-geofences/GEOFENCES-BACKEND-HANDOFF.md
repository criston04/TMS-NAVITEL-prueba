# MODULO GEOFENCES — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 3 de 6 endpoints funcionan (50.0%). Los 3 endpoints bloqueados sufren el bug NGINX `:id`. Path activo descubierto: `/api/v1/geofences` (NO `/api/v1/master/geofences`).

---

## INDICE

1. Resumen ejecutivo
2. Bug critico transversal: NGINX y rutas con `:id`
3. Path canonico y problema de descubrimiento
4. Lista de endpoints que el frontend USA
5. Detalle por endpoint
6. Otros bugs y observaciones
7. Cambios recientes en el frontend
8. Checklist para el backend
9. Apendice: como reproducir

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Geofences

Gestion de geocercas (zonas geograficas con alertas) para monitoreo de la flota. Incluye:
- Tipos de geometria: `POLYGON` (poligono libre, 3+ puntos) y `CIRCLE` (centro + radio en metros)
- Categorias: warehouse, customer, plant, port, checkpoint, restricted, delivery, other
- Alertas: on-entry (al entrar), on-exit (al salir), on-dwell (al permanecer X minutos)
- Notificacion por email cuando se dispara alerta
- Tags libres para clasificacion adicional
- Vinculacion a customer especifico (zona de entrega de un cliente)
- Color y opacidad para visualizacion en mapa
- Importacion y exportacion KML
- Status: active, inactive (soft-delete con `deleted_at`)

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 6 (CRUD basico + stats) |
| Funcionando OK en produccion | 3 (50.0%) |
| Bloqueados por bug NGINX `:id` | 3 |
| Errores 5xx | 0 |

### Endpoints OPERATIVOS (3)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/geofences` | Listar geocercas paginadas |
| POST | `/api/v1/geofences` | Crear geocerca |
| GET | `/api/v1/geofences/stats` | Stats globales |

### Endpoints BLOQUEADOS por bug NGINX `:id` (3)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/geofences/:id` | Detalle de una geocerca |
| PUT | `/api/v1/geofences/:id` | Actualizar geocerca |
| DELETE | `/api/v1/geofences/:id` | Eliminar (soft-delete) |

### Impacto en el usuario final

Sin estos 3 endpoints arreglados, el usuario NO puede:
- Ver el detalle individual de una geocerca (sus puntos exactos, tags, alertas, vinculacion a cliente)
- Editar una geocerca existente (mover puntos, cambiar radio, modificar alertas)
- Eliminar una geocerca

El frontend SI puede crear, listar, ver stats y exportar/importar KML (usando solo el listado completo).

---

## 2. BUG CRITICO TRANSVERSAL: NGINX Y RUTAS CON `:id`

### Que es NGINX y por que importa

NGINX es el proxy reverso del servidor backend. Antes de que cualquier peticion HTTP llegue al codigo del backend de aplicacion, debe pasar por NGINX. Si la ruta no esta en su configuracion, la rechaza con su pagina default `404 Not Found`.

```
Frontend → Internet → NGINX (filtro) → Backend de aplicacion → Base de datos
                       ↑
                       Aqui se rechazan las peticiones con :id
```

### Como se manifiesta el bug en el modulo Geofences

**Caso de uso real:** un usuario abre el mapa con sus 50 geocercas, hace click en una para ver el detalle (sus alertas configuradas, los puntos exactos, la fecha de creacion).

1. Usuario hace click en geocerca "Almacen Lima Centro" (id `GEO-012055` o uuid)
2. Frontend: `GET /api/v1/geofences/{id}`
3. NGINX rechaza con `404` body `"Not Found"` plain text 9 bytes
4. Frontend muestra error o banner explicativo

El backend de aplicacion **nunca recibe la peticion**. POST /geofences SI funciona y persiste, lo que confirma que el codigo de aplicacion esta bien.

### Por que afecta a TODOS los modulos del backend

El bug aparece en 7 modulos. Las rutas con string o numero en path param funcionan; solo UUIDs (y aparentemente codes alfanumericos en geofences) son rechazados.

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

`nginx -s reload`. Esto arregla los 3 endpoints bloqueados de Geofences + 30+ de los otros modulos.

---

## 3. PATH CANONICO Y PROBLEMA DE DESCUBRIMIENTO

### Confusion historica

El frontend probo 3 paths candidatos para geofences:

| Path | Status |
|---|---|
| `/geofences` (root, sin /api/v1) | 404 segun "Excel oficial" del backend pero responde 404 en realidad |
| `/api/v1/master/geofences` | 404 (legacy, no existe) |
| **`/api/v1/geofences`** | **200 OK ← PATH ACTIVO** |

El path canonico real es `/api/v1/geofences`. El frontend implemento un mecanismo `tryEndpoints` que prueba los 3 hasta encontrar el que responde, y cachea el resultado. Confirmado por test E2E del 2026-05-03: el path activo es `/api/v1/geofences`.

### Sugerencia

El equipo backend debe confirmar oficialmente que `/api/v1/geofences` es el path canonico y actualizar la tabla maestra. Si en el futuro se mueve a otro path, comunicar para actualizar el frontend.

---

## 4. LISTA DE ENDPOINTS QUE EL FRONTEND USA

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | GET | `/api/v1/geofences` | parcial | SI | SI | 200 | OK |
| 2 | POST | `/api/v1/geofences` | parcial | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/geofences/stats` | parcial | SI | SI | 200 | OK |
| 4 | GET | `/api/v1/geofences/:id` | parcial | SI | SI | 404 | BLOQUEADO NGINX |
| 5 | PUT | `/api/v1/geofences/:id` | parcial | SI | SI | 404 | BLOQUEADO NGINX |
| 6 | DELETE | `/api/v1/geofences/:id` | parcial | SI | SI | 404 | BLOQUEADO NGINX |

**Funcional: 3/6 = 50.0%**

Si el backend arregla NGINX, funcional sube a 6/6 = 100%.

---

## 5. DETALLE DE CADA ENDPOINT

### 5.1. POST /api/v1/geofences — Crear geocerca

**Estado:** Funciona OK (200)

**Llamado por:**
- Componente: pagina mapa de geocercas, dialogo "Crear geocerca" (selecciona en mapa polygon o circle)
- Service: `geofencesService.create(data)` (`src/services/master/geofences.service.ts:417`)

**Cuando se llama:** Usuario dibuja una geocerca en el mapa (polygon o circle), llena nombre/categoria/alertas, click en "Guardar".

**Request body real (mapper aplica `mapGeofenceToBackend()`):**

```json
{
  "code": "GEO-012055",
  "name": "Almacen Lima Centro",
  "shortName": "GEO-012055",
  "description": "Almacen principal en Lima Cercado",
  "address": "Av. Argentina 1500, Lima",
  "category": "warehouse",
  "color": "#3b82f6",
  "opacity": 0.2,
  "alt": 0,
  "type": "CIRCLE",
  "lat": -12.046374,
  "lng": -77.042793,
  "radius": 500,
  "gpoints": null,
  "alerts": {
    "onEntry": true,
    "onExit": true,
    "onDwell": false,
    "dwellTimeMinutes": null,
    "notifyEmails": ["alertas@gruponavitel.com"]
  },
  "tags": ["lima", "warehouse"],
  "status": "active",
  "customer_id": "1d818bf5-0bb1-48bc-832e-24782de0a349"
}
```

Para tipo polygon, en lugar de `lat`/`lng`/`radius` se envia:

```json
{
  "type": "POLYGON",
  "lat": -12.046374,
  "lng": -77.042793,
  "gpoints": [
    {"lat": -12.040, "lng": -77.040},
    {"lat": -12.045, "lng": -77.040},
    {"lat": -12.045, "lng": -77.050},
    {"lat": -12.040, "lng": -77.050}
  ],
  "radius": null
}
```

(`lat`/`lng` para POLYGON es el centroide aproximado, calculado promediando los puntos.)

**Response (200):** El backend devuelve un shape no-canonico (con campos legacy `Geofenceid`, `geofencename`, etc.). El frontend extrae el id y hace re-fetch via GET `/:id` (que falla por NGINX). Como fallback, usa los datos enviados localmente.

**OBSERVACION CRITICA — Response inconsistente:**

El POST devuelve un shape distinto al GET:
- POST devuelve: `Geofenceid`, `geofencename`, `gpsSyncError` (a veces), array o objeto unico, etc.
- GET (lista) devuelve: `geofenceid`, `gname`, `gshortname`, `gpoints` (JSON string), etc.

**Sugerencia:** unificar el shape entre POST y GET. POST deberia devolver el mismo objeto que GET /:id.

**Reglas de negocio:**
- `code`: requerido, unico por tenant. Sirve como upsert key.
- `name`: requerido, min 3 chars.
- `type`: enum `["CIRCLE", "POLYGON"]` UPPERCASE OBLIGATORIO. Si se envia "circle"/"polygon" → 400 con mensaje "Type must be CIRCLE or POLYGON". CONFIRMADO.
- `lat`, `lng`: requeridos. Para polygon es el centroide; para circle es el centro.
- `radius`: requerido si type=CIRCLE. > 0.
- `gpoints`: requerido si type=POLYGON. Array de `{lat, lng}` con minimo 3 puntos.
- `category`: enum (ver lista en seccion 1). Backend acepta `delivery_zone` y otros aliases que el mapper normaliza.
- `customer_id`: REQUERIDO. El frontend lo inyecta desde el JWT si el form no provee uno explicito.
- `alerts.dwellTimeMinutes`: requerido si `alerts.onDwell === true`.
- `alerts.notifyEmails`: array de emails validos.
- `tags`: array de strings, max 10.
- `tenant_id`: del JWT, no del body.

---

### 5.2. GET /api/v1/geofences — Listar geocercas

**Estado:** Funciona OK (200)

**Query params:**

```
?page=1&pageSize=20&search=warehouse&category=warehouse&status=active
```

**Response (200):** El backend usa shape "legacy" con field names `geofenceid, gname, gshortname, glat, glng, grad, gpoints, gaddress, status (0|1), date_created, date_modified, ggroup, category, color, customer_id, tags, alert_on_entry, alert_on_exit, alert_on_dwell, dwell_time_minutes, notify_emails, deleted_at`.

```json
{
  "items": [
    {
      "geofenceid": "f1e2d3c4-...",
      "tenantid": "tenant-001",
      "gname": "Almacen Lima Centro",
      "gshortname": "GEO-012055",
      "gaddress": "Av. Argentina 1500, Lima",
      "glat": -12.046374,
      "glng": -77.042793,
      "alt": 0,
      "type": "CIRCLE",
      "gpoints": null,
      "grad": 500,
      "date_created": "2026-05-03T...",
      "date_modified": "2026-05-03T...",
      "ggroup": null,
      "category": "warehouse",
      "color": "#3b82f6",
      "customer_id": "1d818bf5-...",
      "tags": "[\"lima\",\"warehouse\"]",
      "status": 1,
      "alert_on_entry": 1,
      "alert_on_exit": 1,
      "alert_on_dwell": 0,
      "dwell_time_minutes": null,
      "notify_emails": "[\"alertas@gruponavitel.com\"]",
      "deleted_at": null
    }
  ],
  "meta": {"page": 1, "pageSize": 20, "total": 10, "totalPages": 1}
}
```

**Post-processing:** El frontend mapea cada item con `mapBackendGeofence()` que:
- Convierte `geofenceid` → `id`
- Convierte `gname` → `name`, `gshortname` → `code`
- Reconstruye `geometry` desde `glat/glng/grad` (circle) o `gpoints` (polygon)
- Parsea `tags` y `notify_emails` (vienen como JSON strings, deberian ser arrays)
- Convierte booleans 0/1 a true/false
- Normaliza category con aliases (`delivery_zone` → `delivery`)

**Sugerencia:** unificar el shape de respuesta entre lista y POST. Idealmente, todos los endpoints deberian devolver el mismo formato canonico:

```json
{
  "id": "...",
  "code": "...",
  "name": "...",
  "geometry": {"type": "circle", "center": {"lat": ..., "lng": ...}, "radius": 500},
  "alerts": {"onEntry": true, ...},
  "tags": ["..."],
  ...
}
```

Asi el frontend no necesita el mapper complejo.

---

### 5.3. GET /api/v1/geofences/stats — Stats

**Estado:** Funciona OK (200)

**Response (200):**

```json
{
  "data": {
    "total": 10,
    "polygons": 6,
    "circles": 4,
    "byCategory": {
      "warehouse": 3,
      "customer": 5,
      "plant": 1,
      "port": 0,
      "checkpoint": 0,
      "restricted": 1,
      "delivery": 0,
      "other": 0
    },
    "tagsCount": 8
  }
}
```

**Reglas:** count de geofences no eliminadas, agrupadas por type y category.

---

### 5.4. GET /api/v1/geofences/:id — Detalle (BLOQUEADO NGINX)

**Estado:** BLOQUEADO. NGINX devuelve 404.

**Response esperada cuando NGINX este arreglado (200):** mismo shape que el item del listado (5.2), con `gpoints` poblado si type=POLYGON.

---

### 5.5. PUT /api/v1/geofences/:id — Actualizar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Request body:** mismo shape que POST. Solo los campos que cambian.

**Reglas:**
- `code` no se puede cambiar (es la upsert key).
- `customer_id` no se puede cambiar (la geocerca pertenece a su cliente).
- Si la geocerca esta `deleted_at != null`: 404.

---

### 5.6. DELETE /api/v1/geofences/:id — Eliminar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Reglas:**
- Soft delete: `deleted_at = NOW()`. NO borrado fisico.
- Si la geocerca tiene eventos historicos asociados (entry/exit/dwell), conservarlos.
- Si esta vinculada a una orden activa, advertencia pero no abortar.

---

## 6. OTROS BUGS Y OBSERVACIONES

### 6.1. Shape de POST distinto del shape de GET

Detallado en seccion 5.1. El POST devuelve campos legacy (`Geofenceid`, `geofencename`) mientras que el GET usa otros (`geofenceid`, `gname`). Esto fuerza al frontend a hacer re-fetch.

**Sugerencia:** unificar el shape — POST devuelve lo mismo que GET /:id.

### 6.2. Field names "legacy" en el listado

`gname`, `gshortname`, `glat`, `glng`, `grad`, `gpoints`, `gaddress`, etc. parecen heredados de un schema antiguo. Idealmente se renombrarian a `name`, `code`, `lat`, `lng`, `radius`, `points`, `address`. No es bloqueante pero ensucia el API.

### 6.3. `tags` y `notify_emails` como JSON strings

El backend los devuelve como JSON strings (e.g., `"tags": "[\"lima\",\"warehouse\"]"`) en vez de arrays JSON nativos. El frontend tiene que hacer `JSON.parse` extra.

**Sugerencia:** persistir como JSONB en Postgres (si esta es la stack) y devolverlos como arrays nativos.

### 6.4. `type` UPPERCASE obligatorio

El backend rechaza con 400 si se envia `"circle"` o `"polygon"` lowercase. Solo acepta `"CIRCLE"` o `"POLYGON"`. El mapper del frontend ya maneja esto, pero es un detalle inconsistente con el resto del sistema (otros enums son lowercase).

**Sugerencia:** aceptar ambos formatos (case-insensitive) para mayor robustez.

### 6.5. status como `0|1` en GET pero `"active"|"inactive"` en POST

El listado devuelve `status: 1` (numero) pero el POST acepta y prefiere `status: "active"` (string). Inconsistencia.

**Sugerencia:** aceptar y devolver siempre el mismo formato (preferiblemente string `"active"|"inactive"`).

### 6.6. Sync con proveedor GPS opcional

A veces el POST devuelve `gpsSyncError` cuando la geocerca se creo localmente pero no se sincronizo con el proveedor GPS externo. El frontend lo loguea pero no aborta.

**Sugerencia:** documentar este campo y definir cuando puede aparecer.

### 6.7. Bug NGINX

Detallado en seccion 2.

---

## 7. CAMBIOS RECIENTES EN EL FRONTEND

### 7.1. Path discovery con `tryEndpoints()`

El service prueba 3 paths candidatos hasta encontrar el activo (descubierto: `/api/v1/geofences`).

### 7.2. Inyeccion automatica de `customer_id`

El frontend lee el `tenantId` del JWT y lo inyecta como `customer_id` si el form no provee uno explicito.

### 7.3. Mapper bidireccional

`mapBackendGeofence()` para BACKEND→FRONTEND y `mapGeofenceToBackend()` para FRONTEND→BACKEND. Maneja:
- Field names legacy (`gname`, `gshortname`, etc.)
- Reconstruccion de geometry desde campos planos
- Parsing de tags y emails como JSON strings
- Booleans 0/1
- type UPPERCASE
- status string vs numero

### 7.4. Re-fetch despues de POST

Como el shape del POST es distinto del GET, el frontend hace GET `/:id` despues de crear (ahora bloqueado por NGINX, hace fallback a datos locales).

---

## 8. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico

- [ ] **Arreglar bug NGINX** (ver seccion 2). Desbloquea 3 endpoints de Geofences + 30+ de otros modulos.

### Alta prioridad

- [ ] Unificar el shape de POST y GET — POST debe devolver el mismo objeto que GET /:id.
- [ ] Decidir formato canonico de field names: o legacy (`geofenceid`, `gname`) o moderno (`id`, `name`). Recomendamos moderno.
- [ ] Persistir y devolver `tags` y `notify_emails` como arrays JSON nativos, no como strings.
- [ ] Aceptar `type` case-insensitive: tanto `circle` como `CIRCLE`.
- [ ] Confirmar oficialmente el path canonico en la tabla maestra: `/api/v1/geofences`.

### Media

- [ ] Aceptar y devolver `status` siempre como string `"active"|"inactive"` (no numero `0|1`).
- [ ] Documentar el flag `gpsSyncError` y cuando aparece.
- [ ] En POST, si el form no provee `customer_id`, usar el `tenant_id` del JWT (actualmente lo exige obligatorio).

### Documentacion

- [ ] Actualizar tabla maestra con el path canonico real `/api/v1/geofences`.
- [ ] Documentar los field names legacy del GET.
- [ ] Actualizar Postman/Bruno collection.

---

## 9. APENDICE: COMO REPRODUCIR LOS TESTS

### Test E2E completo

```bash
cd C:/Users/CRISTON/Desktop/Nueva\ carpeta\ \(3\)/TMS-NAVITEL-prueba
node otros/testing/test-geofences-full.mjs
```

Salida esperada:

```
✓ Path activo descubierto: /api/v1/geofences (status 200)
✅ 200 GET /api/v1/geofences (listar)
✅ 200 POST /api/v1/geofences (crear)
❌ 404 GET /api/v1/geofences/:id (detalle)         BUG NGINX :id
❌ 404 PUT /api/v1/geofences/:id (actualizar)      BUG NGINX :id
✅ 200 GET /api/v1/geofences/stats
❌ 404 DELETE /api/v1/geofences/:id

PORCENTAJE FUNCIONAL: 50.0%  (3/6)
```

Despues del fix NGINX: `100%  (6/6)`.

---

**Fin del documento.**

Cualquier duda, contactar al equipo frontend con el id de este documento (GEOFENCES-BACKEND-HANDOFF v1.0).
