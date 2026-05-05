# MODULO OPERATORS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 7 de 10 endpoints funcionan (70.0%). Los 3 endpoints bloqueados sufren el mismo bug NGINX `:id` que afecta a otros 6 modulos (problema global del proxy reverso).

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

### Que hace el modulo Operators

Gestion de los Operadores Logisticos (transportistas) que el tenant contrata. Incluye:
- Tipos: `propio` (flota propia gestionada como operador), `tercero` (subcontratado externo), `asociado` (alianza)
- En el backend, todos viajan con `type: "carrier"` (el subtipo se infiere por `tenant_id`)
- Datos fiscales: RUC (11 digitos, validado), razon social, nombre comercial
- Datos de contacto: email, telefono, direccion fiscal, ciudad, pais
- Contactos multiples (gerente, contador, despacho) con flag de primario
- Contrato: fecha inicio, fecha fin
- Stats: cantidad de drivers asignados, cantidad de vehiculos, rating
- Checklist de validacion (documentos, requisitos legales)
- Documentos asociados (RUC PDF, contrato firmado, certificados)
- Estado: enabled, blocked, pending
- Buscar por RUC (path NO-UUID)
- Buscar por code (path NO-UUID)
- Buscar por texto (query param)

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 10 |
| Funcionando OK en produccion | 7 (70.0%) |
| Bloqueados por bug NGINX `:id` | 3 |
| Errores 5xx | 0 |

### Endpoints OPERATIVOS (7)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| POST | `/api/v1/master/operators` | Crear operador |
| GET | `/api/v1/master/operators` | Listar operadores paginados con filtros |
| GET | `/api/v1/master/operators/stats` | Stats globales (total, enabled, blocked, pending, propios, terceros) |
| GET | `/api/v1/master/operators/by-ruc/:ruc` | Busqueda por RUC (path NO-UUID) |
| GET | `/api/v1/master/operators/by-code/:code` | Busqueda por code interno (path NO-UUID) |
| GET | `/api/v1/master/operators?search=...` | Busqueda por texto (query param) |
| GET | `/api/v1/master/operators?status=active` | Filtro por status (query param) |

### Endpoints BLOQUEADOS por bug NGINX `:id` (3)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/operators/:id` | Detalle de un operador |
| PUT | `/api/v1/master/operators/:id` | Actualizar operador |
| DELETE | `/api/v1/master/operators/:id` | Eliminar operador |

### Impacto en el usuario final

Sin estos 3 endpoints arreglados, el usuario NO puede:
- Ver el detalle completo de un operador (con sus contactos, checklist, documentos)
- Editar un operador existente (telefono, contrato, contactos)
- Eliminar un operador

Operations dependientes que el frontend implementa via fetch+modify+update generico (todas pasan por PUT /:id que esta bloqueado):
- `changeStatus()` → habilitar / bloquear / pending
- `updateChecklist()` → marcar items del checklist
- `checkItem()` → marcar UN item del checklist
- `addDocument()` → adjuntar un nuevo documento
- `addContact()` → agregar un contacto

Todas estas operaciones estan bloqueadas indirectamente. El frontend SI puede crear, listar, ver stats, buscar por RUC, code o texto.

---

## 2. BUG CRITICO TRANSVERSAL: NGINX Y RUTAS CON `:id`

### Que es NGINX y por que importa

NGINX es el proxy reverso del servidor backend. Antes de que cualquier peticion HTTP llegue al codigo del backend de aplicacion (Express/Fastify/Node.js), debe pasar por NGINX. Si la ruta no esta en su configuracion, la rechaza con su pagina default `404 Not Found`.

```
Frontend → Internet → NGINX (filtro) → Backend de aplicacion → Base de datos
                       ↑
                       Aqui se rechazan las peticiones con :id
```

### Como se manifiesta el bug en el modulo Operators

**Caso de uso real:** un usuario abre la pagina de operadores en `/master/operators`, ve la tabla con sus 9 transportistas asociados, y hace click en uno (por ejemplo "Transportes ABC SAC", id `23732cfd-...`) para ver su contrato, sus contactos y su checklist de validacion.

Paso a paso:

1. Usuario hace click en "Transportes ABC SAC" (id `23732cfd-...`)
2. El frontend construye la URL: `GET /api/v1/master/operators/23732cfd-...`
3. La peticion sale al servidor `api-service.gruponavitel.com`
4. NGINX recibe y busca en su lista de rutas permitidas
5. NGINX encuentra `/api/v1/master/operators` (sin id) pero NO `/api/v1/master/operators/{cualquier-uuid}`
6. NGINX rechaza sin pasar al backend
7. NGINX devuelve `404` con body `"Not Found"` plain text 9 bytes
8. El frontend muestra error o (en el frontend actualizado) un banner explicativo

### Como sabemos que es NGINX y no el backend

| Endpoint | Status | Content-Type | Body | Quien respondio |
|---|:---:|---|---|---|
| GET /master/operators | 200 | application/json | JSON con `items[]` | Backend |
| GET /master/operators/stats | 200 | application/json | JSON con stats | Backend |
| GET /master/operators/{uuid} | 404 | text/plain | `"Not Found"` (9 bytes) | NGINX |
| GET /master/operators/by-ruc/20111222333 | 200 | application/json | JSON con datos | Backend |
| GET /master/operators/by-code/OPL-XXX | 200 | application/json | JSON con datos | Backend |

El cuerpo `"Not Found"` plain text de exactamente 9 bytes es la pagina default de NGINX. Si el backend hubiera respondido un 404 real, seria JSON estructurado.

### Por que afecta a TODOS los modulos del backend

El bug afecta SOLO a UUIDs en path param. Las rutas con string o numero funcionan:

```
200   GET /api/v1/master/operators/by-ruc/20111222333         (numero, NO UUID)
200   GET /api/v1/master/operators/by-code/OPL-MGYHX0J        (string, NO UUID)
404   GET /api/v1/master/operators/{uuid}                     (UUID v4 en path)
```

NGINX tiene reglas escritas para ciertos formatos pero olvido cubrir el formato UUID v4.

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

Despues: `nginx -s reload`. Esto arregla los 3 endpoints bloqueados de Operators + 30+ de los otros modulos en un solo cambio.

### Verificacion sugerida

```bash
TOKEN="<token>"
OP=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/master/operators \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"OPL-001","ruc":"20111222333","document_number":"20111222333","name":"Test","email":"t@t.com","phone":"+51 999 111 222","fiscal_address":"Lima","type":"carrier"}')

OP_ID=$(echo "$OP" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).data.id)})")

curl -v -H "Authorization: Bearer $TOKEN" \
  "https://api-service.gruponavitel.com/api/v1/master/operators/$OP_ID"
```

Resultado esperado: `200 OK` con JSON estructurado.

---

## 3. LISTA DE ENDPOINTS QUE EL FRONTEND USA

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | POST | `/api/v1/master/operators` | SI | SI | SI | 201 | OK |
| 2 | GET | `/api/v1/master/operators` | SI | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/master/operators/stats` | SI | SI | SI | 200 | OK |
| 4 | GET | `/api/v1/master/operators/by-ruc/:ruc` | SI | SI | SI | 200 | OK |
| 5 | GET | `/api/v1/master/operators/by-code/:code` | SI | SI | SI | 200 | OK |
| 6 | GET | `/api/v1/master/operators?search=` | SI | SI | SI | 200 | OK |
| 7 | GET | `/api/v1/master/operators?status=active` | SI | SI | SI | 200 | OK |
| 8 | GET | `/api/v1/master/operators/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 9 | PUT | `/api/v1/master/operators/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 10 | DELETE | `/api/v1/master/operators/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |

**Funcional: 7/10 = 70.0%**

Si el backend arregla NGINX, funcional sube a 10/10 = 100%.

---

## 4. DETALLE DE CADA ENDPOINT

### 4.1. POST /api/v1/master/operators — Crear operador

**Estado:** Funciona OK (201)

**Llamado por:**
- Componente: `OperatorFormModal` (form con tabs: Datos fiscales, Contactos, Contrato, Documentos)
- Service: `operatorsService.create(data)` (`src/services/master/operators.service.ts:153`)

**Cuando se llama:** Usuario abre modal "Crear operador", llena datos del transportista, click en "Guardar".

**Auto-generacion de code:** Si el form no envia `code`, el frontend lo auto-genera con formato `OPL-{timestamp-base36}`. El backend lo exige obligatorio (devuelve 400 si falta).

**Request body real (generado por `mapOperatorToBackend()`):**

```json
{
  "code": "OPL-MGYHX0J",
  "type": "carrier",
  "document_type": "RUC",
  "document_number": "20111222333",
  "ruc": "20111222333",
  "name": "Transportes ABC SAC",
  "business_name": "Transportes ABC SAC",
  "trade_name": "TransABC",
  "contact_name": "Juan Gerente",
  "email": "contacto@transabc.pe",
  "phone": "+51 999 111 222",
  "address": "Av. Industrial 123",
  "fiscal_address": "Av. Industrial 123, Lima",
  "city": "Lima",
  "country": "PE",
  "status": "active",
  "contract_start_date": "2025-01-01",
  "contract_end_date": "2026-12-31",
  "notes": "Operador con flota de 15 unidades",
  "contacts": [
    {"name": "Juan Gerente", "position": "Gerente General", "email": "juan@transabc.pe", "phone": "+51 999 111 222", "is_primary": true},
    {"name": "Rosa Contadora", "position": "Contadora", "email": "rosa@transabc.pe", "phone": "+51 999 333 444", "is_primary": false}
  ]
}
```

**Response esperada (201):**

```json
{
  "data": {
    "id": "23732cfd-...",
    "tenant_id": "tenant-001",
    "code": "OPL-MGYHX0J",
    "name": "Transportes ABC SAC",
    "trade_name": "TransABC",
    "type": "carrier",
    "document_type": "RUC",
    "document_number": "20111222333",
    "ruc": "20111222333",
    "contact_name": "Juan Gerente",
    "email": "contacto@transabc.pe",
    "phone": "+51 999 111 222",
    "address": "Av. Industrial 123",
    "fiscal_address": "Av. Industrial 123, Lima",
    "city": "Lima",
    "country": "PE",
    "status": "active",
    "contract_start_date": "2025-01-01",
    "contract_end_date": "2026-12-31",
    "drivers_count": 0,
    "vehicles_count": 0,
    "rating": null,
    "notes": "Operador con flota de 15 unidades",
    "business_name": null,
    "created_at": "2026-05-03T...",
    "updated_at": "2026-05-03T...",
    "deleted_at": null
  }
}
```

**OBSERVACIONES IMPORTANTES:**

1. El backend SIEMPRE devuelve `business_name: null` aunque se envie en POST. El nombre real va en `name`.
2. El backend acepta `contacts[]` pero NO los persiste (los ignora silenciosamente). Igual que con vehicles, esto es deuda backend.
3. El backend acepta `checklist` y `documents[]` pero tampoco los persiste.

**Reglas de negocio que el backend debe validar:**

- `code`: obligatorio, unico por tenant. Si falta → 400. Si duplicado → 409.
- `ruc` o `document_number`: obligatorio, 11 digitos para Peru, validar checksum (modulo 11). Unico por tenant.
- `email`: formato valido, unico por tenant.
- `type`: enum (en backend: `carrier`. En frontend se mapea desde `propio | tercero | asociado` segun la relacion con el tenant).
- `name`: obligatorio, min 3 chars.
- `phone`: formato libre, min 9 digitos.
- `fiscal_address`: obligatorio.
- `country`: codigo ISO 2 letras (`PE`, `CO`, `EC`, etc.).
- `contract_start_date`, `contract_end_date`: si presentes, end > start.
- `tenant_id`: del JWT, no del body.

---

### 4.2. GET /api/v1/master/operators — Listar operadores

**Estado:** Funciona OK (200)

**Llamado por:** pagina `/master/operators` con tabla y filtros.

**Query params:**

```
?page=1&pageSize=20&search=ABC&type=carrier&status=active&sortBy=name&sortOrder=asc
```

**Response (200):**

```json
{
  "items": [
    {
      "id": "23732cfd-...",
      "code": "OPL-MGYHX0J",
      "name": "Transportes ABC SAC",
      "trade_name": "TransABC",
      "type": "carrier",
      "ruc": "20111222333",
      "email": "contacto@transabc.pe",
      "phone": "+51 999 111 222",
      "city": "Lima",
      "country": "PE",
      "status": "active",
      "drivers_count": 12,
      "vehicles_count": 8,
      "rating": 4.5,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {"page": 1, "pageSize": 20, "total": 9, "totalPages": 1}
}
```

**Reglas de negocio:**
- Filtros con AND.
- `search`: busca en `code`, `name`, `trade_name`, `ruc`, `email`.
- `pageSize`: max 100.
- Solo del tenant actual. Excluye `deleted_at != null`.

---

### 4.3. GET /api/v1/master/operators/stats — Stats globales

**Estado:** Funciona OK (200)

**Response (200):**

```json
{
  "data": {
    "total": 9,
    "enabled": 7,
    "blocked": 1,
    "pendingValidation": 1,
    "propios": 1,
    "terceros": 8
  }
}
```

**Reglas de negocio:**
- `total`: count del tenant, no eliminados.
- `enabled`: `status === "active"` o `"enabled"`.
- `blocked`: `status === "blocked"`.
- `pendingValidation`: `status === "pending"`.
- `propios`/`terceros`: count por subtipo (frontend infiere por `tenant_id`).

**Cache client-side:** El frontend cachea por 60s para mitigar rate limit 429 que el backend aplica a `/stats`.

**Fallback:** Si devuelve 404 o 429, recalcula desde el listado.

---

### 4.4. GET /api/v1/master/operators/by-ruc/:ruc — Buscar por RUC

**Estado:** Funciona OK (200) — no UUID, no sufre bug NGINX.

**Llamado por:** form de crear/editar, al perder foco del campo RUC, para detectar duplicados.

**Path param:** `:ruc` ej. `20111222333` (11 digitos).

**Response (200):**

```json
{
  "data": {
    "id": "23732cfd-...",
    "ruc": "20111222333",
    "name": "Transportes ABC SAC",
    "code": "OPL-MGYHX0J",
    "status": "active"
  }
}
```

Si no existe: `null` con 200 o 404 con JSON estructurado.

**Reglas:** Solo tenant actual. Excluye eliminados.

---

### 4.5. GET /api/v1/master/operators/by-code/:code — Buscar por code

**Estado:** Funciona OK (200) — no UUID, no sufre bug NGINX.

**Path param:** `:code` ej. `OPL-MGYHX0J`.

Mismas reglas que by-ruc.

---

### 4.6. GET /api/v1/master/operators?search=:texto — Buscar por texto

**Estado:** Funciona OK (200)

**Query param:** `?search=...`

Devuelve la misma lista paginada que el listado normal pero filtrada.

---

### 4.7. GET /api/v1/master/operators?status=active — Filtro por status

**Estado:** Funciona OK (200)

**Query param:** `?status=active`

Para llenar selects en otros modulos (ordenes, asignaciones).

---

### 4.8. GET /api/v1/master/operators/:id — Detalle (BLOQUEADO NGINX)

**Estado:** BLOQUEADO. NGINX devuelve 404.

**Llamado por:** `OperatorDetailDrawer` con tabs (General, Contactos, Contrato, Checklist, Documentos).

**Response esperada cuando NGINX este arreglado (200):**

```json
{
  "data": {
    "id": "23732cfd-...",
    "tenant_id": "tenant-001",
    "code": "OPL-MGYHX0J",
    "name": "Transportes ABC SAC",
    "trade_name": "TransABC",
    "type": "carrier",
    "document_type": "RUC",
    "document_number": "20111222333",
    "ruc": "20111222333",
    "contact_name": "Juan Gerente",
    "email": "contacto@transabc.pe",
    "phone": "+51 999 111 222",
    "address": "Av. Industrial 123",
    "fiscal_address": "Av. Industrial 123, Lima",
    "city": "Lima",
    "country": "PE",
    "status": "active",
    "contract_start_date": "2025-01-01",
    "contract_end_date": "2026-12-31",
    "drivers_count": 12,
    "vehicles_count": 8,
    "rating": 4.5,
    "notes": "...",
    "contacts": [
      {"id": "c-1", "name": "Juan Gerente", "position": "Gerente General", "email": "juan@...", "phone": "+51 999 111 222", "is_primary": true}
    ],
    "checklist": {
      "items": [
        {"id": "i-1", "label": "RUC vigente", "checked": true, "date": "2025-01-15"},
        {"id": "i-2", "label": "Contrato firmado", "checked": true, "date": "2025-01-15"},
        {"id": "i-3", "label": "Polizas vigentes", "checked": false}
      ],
      "isComplete": false,
      "lastUpdated": "2026-05-03T..."
    },
    "documents": [
      {"id": "d-1", "name": "RUC PDF", "is_required": true, "status": "valid", "file_url": "https://..."}
    ],
    "created_at": "...",
    "updated_at": "...",
    "deleted_at": null
  }
}
```

**Workaround actual del frontend:** El service detecta el 404 y lanza un `Error` con flag `backendBug: true` y mensaje explicativo.

---

### 4.9. PUT /api/v1/master/operators/:id — Actualizar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Llamado por:** form en modo edicion, y por todas las operations indirectas (`changeStatus`, `updateChecklist`, `addContact`, `addDocument`).

**Request body:** mismo shape que POST. Solo los campos que cambian (los `undefined` se omiten).

**Reglas:**
- `ruc` si cambia y duplicado → 409.
- `email` si cambia y duplicado → 409.
- Si esta `deleted_at != null`: 404.

---

### 4.10. DELETE /api/v1/master/operators/:id — Eliminar (BLOQUEADO NGINX)

**Estado:** BLOQUEADO.

**Reglas:**
- Soft delete: `deleted_at = NOW()`.
- Si tiene drivers o vehicles asociados activos: 422 con mensaje "No se puede eliminar el operador: tiene N drivers y M vehicles asociados".
- Si tiene ordenes activas: 422.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. `business_name` siempre devuelto como null

El backend descarta el campo `business_name` que envia el frontend; siempre devuelve `null`. La razon social real va en `name`.

**Sugerencia:** o persistirlo separado o documentar que `name` es la razon social y `trade_name` el comercial.

### 5.2. `contacts[]`, `checklist`, `documents[]` no persisten

El backend acepta estos sub-objetos en POST/PUT pero NO los persiste. El frontend usa fetch+modify+update generico para simular operaciones (pero todo va por PUT /:id que esta bloqueado).

**Sugerencia:** crear las tablas relacionadas (`operator_contacts`, `operator_checklist_items`, `operator_documents`) y persistir.

### 5.3. No hay endpoints dedicados para sub-operaciones

El frontend espera tener:
- `POST /master/operators/:id/contacts` para anadir contacto
- `POST /master/operators/:id/documents` para anadir documento
- `PUT /master/operators/:id/checklist/:itemId` para marcar item

Como estos no existen, el frontend hace fetch+modify+update generico. Cuando el backend arregle el PUT /:id (bug NGINX), estas operaciones funcionaran. Pero seria mas eficiente y atomico tener endpoints dedicados.

### 5.4. Rate limit agresivo en /stats

El backend devuelve 429 con frecuencia para `/stats`. El frontend cachea por 60s para mitigar.

**Sugerencia:** subir el rate limit para `/stats` a 60 req/min por tenant, o no aplicar rate limit a endpoints de lectura.

### 5.5. type "carrier" hardcoded

Aunque el frontend modela `propio | tercero | asociado`, el backend solo persiste `carrier`. La distincion se infiere por el tenant_id del JWT vs el operator (un operador "propio" tiene el mismo tenant_id que el usuario). Esto funciona para casos simples pero limita reportes.

**Sugerencia:** anadir un campo `subtype` enum `["propio", "tercero", "asociado"]`.

### 5.6. Bug NGINX

Detallado en seccion 2.

---

## 6. CAMBIOS RECIENTES EN EL FRONTEND

### 6.1. Helper `withIdBugDetection()` aplicado en `operators.service.ts`

Aplicado a: `getById`, `update`, `delete`. Lanza Error con `backendBug: true` cuando detecta el 404 de NGINX.

### 6.2. Auto-generacion de code

El frontend auto-genera `code` con formato `OPL-{timestamp-base36}` si el form no lo provee.

### 6.3. Cache de stats

`getStats()` cachea client-side 60s para mitigar rate limit del backend.

### 6.4. Operations indirectas via update generico

Como no hay endpoints dedicados, `changeStatus`, `updateChecklist`, `checkItem`, `addDocument`, `addContact` usan internamente PUT /:id (bloqueado por NGINX). Cuando el bug se arregle, todas estas operaciones funcionaran.

---

## 7. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico

- [ ] **Arreglar bug NGINX** (ver seccion 2). Desbloquea 3 endpoints de Operators + 30+ de otros modulos.

### Alta prioridad

- [ ] Persistir sub-objetos `contacts[]`, `checklist`, `documents[]` en POST/PUT. Crear las tablas relacionadas.
- [ ] En GET /:id, devolver los sub-objetos poblados.
- [ ] Validar checksum de RUC peruano (modulo 11) en POST y PUT.
- [ ] Decidir el manejo de `business_name` vs `name` (o persistirlo separado o documentar la convencion).

### Media

- [ ] Crear endpoints dedicados:
  - `POST /master/operators/:id/contacts`
  - `DELETE /master/operators/:id/contacts/:contactId`
  - `POST /master/operators/:id/documents`
  - `PUT /master/operators/:id/checklist/:itemId`
- [ ] En DELETE, validar que no tenga drivers/vehicles/ordenes activas.
- [ ] Considerar persistir `subtype: "propio" | "tercero" | "asociado"`.
- [ ] Revisar el rate limit de `/stats` (subir a 60 req/min por tenant).

### Documentacion

- [ ] Confirmar enums actuales (`type`, `status`, `document_type`).
- [ ] Actualizar Postman/Bruno collection.

---

## 8. APENDICE: COMO REPRODUCIR LOS TESTS

### Test E2E completo

```bash
cd C:/Users/CRISTON/Desktop/Nueva\ carpeta\ \(3\)/TMS-NAVITEL-prueba
node otros/testing/test-operators-full.mjs
```

Salida esperada:

```
✅ 201 POST /master/operators (crear)
✅ 200 GET /master/operators (listar)
❌ 404 GET /master/operators/:id (detalle)             BUG NGINX :id
❌ 404 PUT /master/operators/:id (actualizar)          BUG NGINX :id
✅ 200 GET /master/operators/stats
✅ 200 GET /master/operators/by-ruc/:ruc
✅ 200 GET /master/operators/by-code/:code
✅ 200 GET /master/operators?search=Test
✅ 200 GET /master/operators?status=active
❌ 404 DELETE /master/operators/:id                    BUG NGINX :id

PORCENTAJE FUNCIONAL: 70.0%  (7/10)
```

Despues del fix de NGINX: `100%  (10/10)`.

---

**Fin del documento.**

Cualquier duda, contactar al equipo frontend con el id de este documento (OPERATORS-BACKEND-HANDOFF v1.0).
