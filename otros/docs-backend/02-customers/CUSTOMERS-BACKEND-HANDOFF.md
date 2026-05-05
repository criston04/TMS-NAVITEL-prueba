# MODULO CUSTOMERS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 10 de 18 endpoints funcionan (55.6%). Los 8 endpoints bloqueados sufren el mismo bug NGINX `:id` que afecta al modulo Orders y a otros 5 modulos mas (problema global del proxy reverso).

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

### Que hace el modulo Customers

Gestion de los clientes del tenant. Incluye:
- Crear, listar, ver detalle, editar y eliminar clientes
- Manejar tipos: empresa (RUC) o persona (DNI/CE/PASAPORTE)
- Direcciones multiples (con coordenadas para geocoding)
- Contactos multiples (con flags de notificacion)
- Configuracion de facturacion (terminos de pago, moneda, limite de credito)
- Estadisticas operacionales por cliente (ordenes, % entregas a tiempo, fidelidad)
- Importacion masiva desde CSV/Excel
- Exportacion a CSV
- Bulk delete (eliminar varios a la vez)
- Cambio de status (activo/inactivo, suspendido, terminated)

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 18 |
| Funcionando OK en produccion | 10 (55.6%) |
| Bloqueados por bug NGINX `:id` | 8 |
| Errores 5xx | 0 |

### Endpoints OPERATIVOS (10)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| POST | `/api/v1/master/customers` | Crear cliente |
| GET | `/api/v1/master/customers` | Listar clientes paginados con filtros |
| GET | `/api/v1/master/customers/stats` | Stats globales (total, activos, por categoria) |
| GET | `/api/v1/master/customers/cities` | Lista de ciudades distintas |
| GET | `/api/v1/master/customers/find-by-document?documentNumber=` | Busqueda exacta por documento (query param) |
| GET | `/api/v1/master/customers/by-document/:documentNumber` | Mismo proposito (path param NO-UUID) |
| GET | `/api/v1/master/customers/export/csv` | Exportar todos a CSV |
| POST | `/api/v1/master/customers/import` | Importacion masiva desde array |
| POST | `/api/v1/master/customers/bulk-delete` | Eliminar varios por IDs (en body, no path) |

### Endpoints BLOQUEADOS por bug NGINX `:id` (8)

| Metodo | Endpoint | Para que sirve |
|---|---|---|
| GET | `/api/v1/master/customers/:id` | Detalle de un cliente |
| PUT | `/api/v1/master/customers/:id` | Actualizar cliente |
| DELETE | `/api/v1/master/customers/:id` | Eliminar cliente |
| POST | `/api/v1/master/customers/:id/toggle-status` | Toggle active/inactive |
| PATCH | `/api/v1/master/customers/:id/status` | Cambiar status especifico |
| GET | `/api/v1/master/customers/:id/operational-stats` | Stats operacionales del cliente |
| GET | `/api/v1/master/customers/:id/orders` | Historial de ordenes del cliente |
| POST | `/api/v1/master/customers/:id/refresh-stats` | Recalcular stats |

### Impacto en el usuario final

Sin estos 8 endpoints arreglados, el usuario NO puede:
- Ver el detalle completo de un cliente individual (con sus direcciones, contactos, billing)
- Editar un cliente existente
- Eliminar un cliente individual
- Activar/desactivar un cliente
- Ver las estadisticas operacionales (ordenes asociadas, % entregas, etc.)
- Ver el historial de ordenes del cliente

El frontend SI puede crear, listar, exportar, importar y eliminar masivamente. Tambien tiene workarounds parciales para mostrar detalle (filtra la lista local por id), pero es ineficiente.

---

## 2. BUG CRITICO TRANSVERSAL: NGINX Y RUTAS CON `:id`

### Que es NGINX y por que importa

NGINX es el proxy reverso (o "guardia de entrada") del servidor backend. Antes de que cualquier peticion HTTP llegue al codigo del backend de aplicacion (Express/Fastify/Node.js), debe pasar por NGINX. NGINX revisa una lista de rutas permitidas y, si la ruta no esta en su configuracion, rechaza la peticion con su pagina default `404 Not Found`.

En produccion, ese flujo se ve asi:

```
Frontend → Internet → NGINX (filtro) → Backend de aplicacion → Base de datos
                       ↑
                       Aqui se rechazan las peticiones con :id
```

### Como se manifiesta el bug en el modulo Customers

**Caso de uso real:** un usuario abre la lista de clientes en `/master/customers`, ve la tabla con sus 50 clientes, y hace click en uno especifico para ver su detalle.

Paso a paso lo que ocurre:

1. Usuario hace click en el cliente "Bruno Corp" (id `88453c77-a8a9-49a7-bc75-cb8121328de1`)
2. El frontend construye la URL: `GET /api/v1/master/customers/88453c77-a8a9-49a7-bc75-cb8121328de1`
3. La peticion sale al servidor `api-service.gruponavitel.com`
4. NGINX recibe la peticion y busca en su lista de rutas permitidas
5. NGINX encuentra `/api/v1/master/customers` (sin id, para listar) pero NO encuentra una regla que cubra `/api/v1/master/customers/{cualquier-uuid}`
6. NGINX rechaza la peticion sin pasarla al backend
7. NGINX devuelve su 404 default: status `404`, body `"Not Found"` en text/plain de 9 bytes
8. El frontend recibe el 404 y muestra error al usuario

El backend de aplicacion **nunca recibe la peticion**. El controller del modulo Customers funciona perfectamente, pero NGINX nunca le pasa nada para procesar.

### Como sabemos que es NGINX y no el backend

La respuesta tiene una firma muy especifica que delata a NGINX:

| Endpoint | Status | Content-Type | Body | Quien respondio |
|---|:---:|---|---|---|
| GET /master/customers | 200 | application/json | JSON con `items[]` y `meta` | Backend (paso por NGINX) |
| GET /master/customers/stats | 200 | application/json | JSON con stats agrupadas | Backend |
| GET /master/customers/{uuid} | 404 | text/plain | `"Not Found"` (9 bytes exactos) | NGINX (rechazo antes del backend) |
| GET /master/customers/by-document/123456 | 200 | application/json | JSON con datos | Backend |

El cuerpo `"Not Found"` en text/plain de exactamente 9 bytes es la pagina 404 default de NGINX. Si el backend hubiera respondido un 404 real (porque el customer no existe), el cuerpo seria un JSON estructurado tipo `{"code": 404, "message": "Customer not found"}`.

Otra prueba: si pones cualquier URL inventada en el navegador como `https://api-service.gruponavitel.com/cualquier-cosa-inexistente`, recibis EXACTAMENTE el mismo "Not Found" de 9 bytes. Es la firma de NGINX.

### Por que afecta a TODOS los modulos del backend

El test `otros/testing/bug-deep-investigation.mjs` confirmo que el mismo bug aparece en 7 modulos distintos:

```
404   GET /api/v1/orders/{uuid}
404   GET /api/v1/master/customers/{uuid}        ← este modulo
404   GET /api/v1/master/drivers/{uuid}
404   GET /api/v1/master/vehicles/{uuid}
404   GET /api/v1/master/operators/{uuid}
404   GET /api/v1/master/products/{uuid}
404   GET /api/v1/maintenance/work-orders/{uuid}
404   GET /api/v1/finance/invoices/{uuid}
```

Esto descarta que sea bug del modulo Customers y confirma que es un problema global de configuracion del proxy.

Adicionalmente, el bug afecta SOLO a UUIDs en path param. Las rutas con string o numero en path param funcionan:

```
200   GET /api/v1/master/customers/by-document/123456            (numero, NO UUID)
200   GET /api/v1/operations/orders/by-number/ORD-2026-001       (string, NO UUID)
```

Esto sugiere que NGINX tiene reglas escritas para ciertos formatos pero olvido cubrir el formato UUID v4.

### Causa raiz probable

NGINX tiene `location` blocks que cubren rutas estaticas exactas pero no cubren las dinamicas con UUID. Una configuracion tipica que produciria este bug:

```nginx
# Esta linea SI funciona — match exacto a /master/customers
location = /api/v1/master/customers {
    proxy_pass http://backend-app:3000;
}

# Esta linea TAMBIEN funciona — match exacto a /master/customers/stats
location = /api/v1/master/customers/stats {
    proxy_pass http://backend-app:3000;
}

# FALTA esta linea — sin ella, /master/customers/{uuid} devuelve 404 default de NGINX
location ~ ^/api/v1/master/customers/[a-f0-9-]+$ {
    proxy_pass http://backend-app:3000;
}
```

El operador `=` significa "match exacto, sin nada despues". Cualquier URL con `/algo-mas` despues NO matchea esa regla.

### Solucion sugerida

La forma mas robusta y mantenible es usar UN solo location block con prefijo (`/api/v1/`) que enrute TODAS las rutas del backend de una sola vez:

```nginx
location /api/v1/ {
    proxy_pass http://backend-app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

El operador sin `=` significa "match por prefijo". Cualquier URL que empiece con `/api/v1/` se enruta al backend, incluyendo todas las rutas con `:id` de cualquier modulo. Asi se arreglan los 8 endpoints bloqueados de Customers Y los 30+ endpoints bloqueados de los otros modulos en un solo cambio.

Despues de aplicar el cambio: `nginx -s reload` (no requiere reiniciar todo el servicio).

### Verificacion sugerida

1. **Confirmar el diagnostico antes de cambiar config:** revisar los logs del backend de aplicacion (no de NGINX) cuando el frontend hace `GET /api/v1/master/customers/{uuid}`. Si en los logs del backend no aparece la peticion, esta confirmado que NGINX la esta rechazando antes (CONFIRMA el diagnostico).

2. **Aplicar el fix:** editar `/etc/nginx/conf.d/api.conf` (o donde este la configuracion) y agregar el `location /api/v1/` con prefijo. Reload con `nginx -s reload`.

3. **Verificar despues del fix:**

```bash
# Crear cliente de prueba
TOKEN="<token de admin>"
CUSTOMER=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/master/customers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"TEST-001","type":"company","document_type":"RUC","document_number":"20111222999","name":"Test","email":"t@t.com","phone":"+51 999 111 222"}')

# Extraer ID
CUSTOMER_ID=$(echo "$CUSTOMER" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).data.id)})")

# Probar GET por ID — DEBE devolver 200 con JSON
curl -v -H "Authorization: Bearer $TOKEN" \
  "https://api-service.gruponavitel.com/api/v1/master/customers/$CUSTOMER_ID"
```

Resultado esperado: `200 OK` con JSON estructurado del cliente. Si sigue dando `404 "Not Found"` en text/plain, el fix de NGINX no se aplico bien.

---

## 3. LISTA DE ENDPOINTS QUE EL FRONTEND USA

Esta es la lista exacta de endpoints que el frontend del modulo Customers consume. Cross-checkeada contra:
- **Tabla maestra**: la tabla oficial de endpoints proporcionada por el equipo backend
- **Rev2** y **Rev3**: documentacion oficial v3 (markdown)
- **Produccion**: estado real del endpoint en `https://api-service.gruponavitel.com`

### Tabla resumen

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | POST | `/api/v1/master/customers` | SI | SI | SI | 201 | OK |
| 2 | GET | `/api/v1/master/customers` | SI | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/master/customers/stats` | SI | SI | SI | 200 | OK |
| 4 | GET | `/api/v1/master/customers/cities` | SI | SI | SI | 200 | OK |
| 5 | GET | `/api/v1/master/customers/find-by-document?documentNumber=` | SI | SI | SI | 200 | OK |
| 6 | GET | `/api/v1/master/customers/by-document/:documentNumber` | SI | SI | SI | 200 | OK |
| 7 | GET | `/api/v1/master/customers/export/csv` | SI | SI | SI | 200 | OK |
| 8 | POST | `/api/v1/master/customers/import` | SI | SI | SI | 200 | OK |
| 9 | POST | `/api/v1/master/customers/bulk-delete` | SI | SI | SI | 200 | OK |
| 10 | GET | `/api/v1/master/customers/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 11 | PUT | `/api/v1/master/customers/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 12 | DELETE | `/api/v1/master/customers/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 13 | POST | `/api/v1/master/customers/:id/toggle-status` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 14 | PATCH | `/api/v1/master/customers/:id/status` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 15 | GET | `/api/v1/master/customers/:id/operational-stats` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 16 | GET | `/api/v1/master/customers/:id/orders` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 17 | POST | `/api/v1/master/customers/:id/refresh-stats` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 18 | POST | `/api/v1/master/customers` (segundo crear, para test) | — | — | — | 201 | OK |

**Funcional: 10/18 = 55.6%**

Si el backend arregla el bug de NGINX (un solo cambio), funcional sube automaticamente a 18/18 = 100%.

---

## 4. DETALLE DE CADA ENDPOINT

Por cada endpoint se documenta:
- **Llamado por**: que componente, hook y service del frontend lo usa
- **Cuando se llama**: que accion del usuario lo dispara
- **Request body real**: el JSON literal que el frontend envia
- **Response esperada**: el shape que el frontend procesa
- **Post-processing**: que hace el frontend con la respuesta
- **Reglas de negocio**: lo que el backend debe validar/aplicar

---

### 4.1. POST /api/v1/master/customers — Crear cliente

**Estado:** Funciona OK (status 201)

**Llamado por:**
- Componente: `CustomerFormModal` (`src/components/customers/customer-form-modal.tsx`)
- Hook: `useCustomers().createCustomer()` (`src/hooks/useCustomers.ts:208`)
- Service: `customersService.createCustomer(data)` o `.create()` (`src/services/master/customers.service.ts:98` y `:247`)

**Cuando se llama:** El usuario abre el modal "Crear cliente", llena los 4 tabs (General, Direcciones, Contactos, Facturacion) y hace click en "Guardar".

**Request body real (generado por `mapCustomerToBackend()`):**

```json
{
  "code": "CUST-12345",
  "type": "company",
  "document_type": "RUC",
  "document_number": "20111222333",
  "name": "Transportes SAC",
  "trade_name": "TransSAC",
  "email": "admin@transsac.pe",
  "phone": "+51 999 111 222",
  "phone2": null,
  "address": "Av. Industrial 123, Lima",
  "category": "standard",
  "credit_limit": 50000,
  "industry": "Transporte de carga",
  "website": "https://transsac.pe",
  "notes": "Cliente VIP",
  "tags": ["mineria", "lima"],
  "addresses": [
    {
      "label": "Principal",
      "street": "Av. Industrial 123",
      "city": "Lima",
      "state": "Lima",
      "country": "PE",
      "zip_code": null,
      "reference": "Esquina con Av. Argentina",
      "is_default": true,
      "lat": -12.046374,
      "lng": -77.042793
    }
  ],
  "contacts": [
    {
      "name": "Maria Lopez",
      "email": "mlopez@transsac.pe",
      "phone": "+51 999 333 444",
      "position": "Gerente de Logistica",
      "department": "Operaciones",
      "is_primary": true,
      "notify_deliveries": true,
      "notify_incidents": true
    }
  ],
  "billing_config": {
    "payment_terms": "30_days",
    "currency": "PEN",
    "requires_po": false,
    "billing_email": "facturacion@transsac.pe",
    "volume_discount": 5,
    "tax_exempt": false
  }
}
```

**Notas importantes sobre el payload:**

- **`code` es REQUERIDO por el backend**: si el frontend no lo envia, backend responde `422`. El frontend lo autogenera con `generateCustomerCode()` si el formulario no lo incluye (verificado por sniff 2026-04-30).
- **`type` solo acepta `"company"` o `"person"`** en ingles. El backend rechaza valores en espanol.
- **`document_type`** acepta: `RUC`, `DNI`, `CE`, `PASSPORT`. El frontend valida formato antes de enviar:
  - RUC: 11 digitos, prefijos validos (10, 15, 16, 17, 20), digito verificador modulo 11
  - DNI: 8 digitos, sin patrones repetitivos (00000000, 11111111, etc.)
  - CE: 7-12 caracteres alfanumericos
  - PASSPORT: 6-12 caracteres alfanumericos
- **`addresses[].coordinates`** se aplana en `lat`/`lng` directos (no como sub-objeto). El backend espera `addresses[].lat` y `addresses[].lng` planos, no `addresses[].coordinates.lat`.
- **`address` (string plano)** se envia ADEMAS de `addresses[]` por compatibilidad con backend actual. Es la concatenacion `street, city, state, country` de la primera direccion.
- **`billing_config.billing_address`** NO se envia aunque el frontend lo soporte. Causa HTTP 500 en el backend (bug confirmado).

**Response esperada (status 201):**

```json
{
  "data": {
    "id": "uuid-generado",
    "tenant_id": "uuid-tenant",
    "code": "CUST-12345",
    "type": "company",
    "document_type": "RUC",
    "document_number": "20111222333",
    "name": "Transportes SAC",
    "trade_name": "TransSAC",
    "email": "admin@transsac.pe",
    "phone": "+51 999 111 222",
    "address": "Av. Industrial 123, Lima",
    "status": "active",
    "category": "standard",
    "credit_limit": 50000,
    "credit_used": 0,
    "created_at": "2026-05-03T...",
    "updated_at": "2026-05-03T...",
    "deleted_at": null
  }
}
```

**Post-processing del frontend:**
1. `mapCustomerFromBackend()` convierte snake_case a camelCase (Customer interno)
2. Modal cierra, dialog "Cliente creado exitosamente"
3. Lista se recarga con `refresh()`

**Reglas de negocio que el backend debe aplicar:**
1. `tenant_id` se infiere del JWT (frontend NO lo envia)
2. `code` REQUERIDO (validar y devolver 422 si falta)
3. `document_number` validar formato segun `document_type`
4. `document_number` debe ser UNICO en el tenant (devolver 409 si ya existe)
5. `email` formato valido
6. `status` arranca en `"active"` por defecto
7. `credit_used` arranca en `0`
8. `created_at`, `updated_at` los pone el backend
9. `addresses[]` y `contacts[]` se persisten en tablas relacionadas (uno-a-muchos)

---

### 4.2. GET /api/v1/master/customers — Listar clientes

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Pagina: `/master/customers/page.tsx` (lista principal)
- Hook: `useCustomers()` (`src/hooks/useCustomers.ts:92-478`)
- Service: `customersService.getFiltered(filters, page, pageSize)` (`customers.service.ts:126`)

**Cuando se llama:** El usuario abre `/master/customers`, cambia filtros, cambia pagina, hace refresh.

**Query params:**

```
?page=1
&pageSize=20
&search=Transportes
&status=active
&type=company
&category=premium
&sortBy=name
&sortOrder=asc
```

**Response esperada:**

```json
{
  "items": [
    {
      "id": "uuid",
      "code": "CUST-001",
      "type": "company",
      "document_type": "RUC",
      "document_number": "20111222333",
      "name": "Transportes SAC",
      "trade_name": "TransSAC",
      "email": "admin@transsac.pe",
      "phone": "+51 999 111 222",
      "address": "Av. Industrial 123, Lima",
      "status": "active",
      "category": "standard",
      "credit_limit": 50000,
      "credit_used": 12000,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": { "total": 80, "page": 1, "pageSize": 20, "totalPages": 4 }
}
```

**Reglas de negocio:**
1. Filtrar siempre por `tenant_id` del JWT
2. Excluir `deleted_at IS NOT NULL` por defecto
3. Busqueda case-insensitive en `name`, `trade_name`, `document_number`, `email`, `code`
4. Default `sortBy=created_at`, `sortOrder=desc`
5. Default `pageSize=20`, maximo 200

---

### 4.3. GET /api/v1/master/customers/stats — Estadisticas globales

**Estado:** Funciona OK (status 200)

**Llamado por:** Cards KPI en la pagina de lista (`useCustomers().stats`)

**Response:**

```json
{
  "data": {
    "total": 80,
    "active": 72,
    "inactive": 5,
    "blocked": 3,
    "newThisMonth": 4,
    "byCategory": {
      "standard": 50,
      "premium": 20,
      "vip": 10,
      "wholesale": 0,
      "corporate": 0,
      "government": 0
    },
    "totalCreditLimit": 4500000,
    "totalCreditUsed": 1200000
  }
}
```

**Notas:**
- El frontend tambien tiene un fallback `computeStatsFromList()` que calcula estos numeros client-side si el endpoint falla (resiliencia)
- Filtrar por `tenant_id` del JWT
- `newThisMonth` cuenta los `created_at` desde el dia 1 del mes actual

---

### 4.4. GET /api/v1/master/customers/cities — Lista de ciudades

**Estado:** Funciona OK (status 200)

**Llamado por:** Filtros del listado para mostrar el dropdown de ciudades.

**Response:**

```json
{
  "data": ["Lima", "Arequipa", "Trujillo", "Cusco", "Piura"]
}
```

Es un array de strings simple. Distinct values de la columna `city` de las direcciones de los clientes del tenant.

---

### 4.5. GET /api/v1/master/customers/find-by-document?documentNumber= y by-document/:documentNumber

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Validacion de duplicados en tiempo real cuando el usuario escribe el RUC/DNI en el formulario
- Service: `customersService.findByDocument(documentNumber)` (`customers.service.ts:306`)

**Diferencia entre ambos endpoints:**
- `/find-by-document?documentNumber=XXX` → **query param** (lo que el frontend usa)
- `/by-document/:documentNumber` → **path param** (alternativo, ambos funcionan)

**Cuando se llama:** El usuario escribe en el campo "Numero de documento" del formulario. Despues de 300ms de debounce, el frontend consulta este endpoint para verificar si ya existe un cliente con ese documento.

**Response:**

```json
{
  "data": {
    "id": "uuid",
    "code": "CUST-001",
    "name": "Transportes SAC",
    ...resto de campos
  }
}
```

Si NO existe un cliente con ese documento, el backend puede devolver:
- `200 OK` con `{"data": null}` (preferido)
- O `404 Not Found` (el frontend lo trata como "no existe")

**Reglas:**
- Filtrar por `tenant_id`
- Match exacto del documento (no busqueda parcial)
- Devolver el cliente completo o null

---

### 4.6. POST /api/v1/master/customers/import — Importacion masiva

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Componente: `CustomerImportModal`
- Service: `customersService.importCustomers(customers[])` (`customers.service.ts:332`)

**Cuando se llama:** El usuario carga un archivo CSV/Excel desde el modal de importacion. El frontend parsea el archivo, valida cada fila, muestra preview, y al confirmar envia el array al backend.

**IMPORTANTE — formato del body:**

El backend espera un **ARRAY DIRECTO** de clientes, NO un objeto envuelto:

```json
[
  { "code": "CUST-IMP-1", "type": "company", "document_type": "RUC", ... },
  { "code": "CUST-IMP-2", "type": "person", "document_type": "DNI", ... }
]
```

NO funciona enviar `{"customers": [...]}` (devuelve 422).

**Response:**

```json
{
  "created": 2,
  "errors": 0,
  "errorDetails": []
}
```

Si hay errores en algunas filas:

```json
{
  "created": 1,
  "errors": 1,
  "errorDetails": [
    { "row": 2, "message": "document_number ya existe" }
  ]
}
```

**Reglas de negocio:**
1. Procesar cada cliente del array independientemente
2. Si uno falla, continuar con los demas (no abortar todo el batch)
3. Validar `document_number` unico contra la BD
4. Devolver detalle de errores con row index

---

### 4.7. GET /api/v1/master/customers/export/csv — Exportar a CSV

**Estado:** Funciona OK (status 200)

**Response:** archivo CSV con `Content-Type: text/csv`

El frontend lo descarga como `clientes_YYYY-MM-DD.csv`.

**Reglas:** mismos filtros que el listado, pero exportar TODAS las paginas, no solo la actual.

---

### 4.8. POST /api/v1/master/customers/bulk-delete — Eliminar varios

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Componente: `CustomerBulkDeleteDialog` (cuando hay seleccionados con checkboxes)
- Service: `customersService.bulkDeleteCustomers(ids)` (`customers.service.ts:282`)

**Body:**

```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response:**

```json
{
  "data": {
    "success": ["uuid-1", "uuid-2"],
    "failed": [
      { "id": "uuid-3", "reason": "Cliente tiene ordenes activas" }
    ]
  }
}
```

**Reglas:**
1. Soft-delete (marcar `deleted_at`)
2. Validar que no tenga ordenes activas (estado != closed/cancelled) antes de eliminar
3. Si tiene ordenes activas, devolver en `failed[]` con la razon
4. Procesar cada uno independientemente (no abortar batch)

---

### 4.9. GET /api/v1/master/customers/:id — Detalle de cliente — BLOQUEADO

**Estado:** 404 NGINX (ver seccion 2 del documento para detalle del bug)

**Llamado por:**
- Pagina de detalle: `/master/customers/[id]/page.tsx`
- Hook: `useCustomerDetail(id)` (`src/hooks/useCustomerDetail.ts:35`)
- Service: `customersService.getById(id)` (`customers.service.ts:84`)

**Cuando se llama:** El usuario hace click en una fila del listado para ver el detalle completo del cliente, o entra directamente con la URL `/master/customers/<uuid>`.

**Response esperada (cuando se arregle el bug NGINX):**

```json
{
  "data": {
    "id": "uuid",
    "code": "CUST-001",
    "type": "company",
    "document_type": "RUC",
    "document_number": "20111222333",
    "name": "Transportes SAC",
    "trade_name": "TransSAC",
    "email": "admin@transsac.pe",
    "phone": "+51 999 111 222",
    "status": "active",
    "category": "premium",
    "credit_limit": 100000,
    "credit_used": 25000,
    "addresses": [
      {
        "id": "addr-uuid",
        "label": "Principal",
        "street": "Av. Industrial 123",
        "city": "Lima",
        "state": "Lima",
        "country": "PE",
        "is_default": true,
        "lat": -12.046374,
        "lng": -77.042793,
        "geofence_id": null
      }
    ],
    "contacts": [
      {
        "id": "contact-uuid",
        "name": "Maria Lopez",
        "email": "mlopez@transsac.pe",
        "phone": "+51 999 333 444",
        "position": "Gerente de Logistica",
        "is_primary": true,
        "notify_deliveries": true,
        "notify_incidents": true
      }
    ],
    "billing_config": {
      "id": "bc-uuid",
      "payment_terms": "30_days",
      "currency": "PEN",
      "requires_po": false,
      "billing_email": "facturacion@transsac.pe",
      "volume_discount": 5
    },
    "created_at": "...",
    "updated_at": "..."
  }
}
```

**Reglas:**
1. Filtrar por `tenant_id` del JWT
2. Excluir `deleted_at IS NOT NULL`
3. Incluir relaciones: `addresses[]`, `contacts[]`, `billing_config{}`

---

### 4.10. PUT /api/v1/master/customers/:id — Actualizar cliente — BLOQUEADO

**Estado:** 404 NGINX

**Llamado por:** El mismo modal `CustomerFormModal` en modo edicion. Hook `useCustomers().updateCustomer(id, data)`.

**Body:** mismo shape que POST (todos opcionales, COALESCE update)

**Reglas:**
1. Validar que el cliente existe (devolver 404 si no)
2. Validar `tenant_id`
3. Si se cambia `document_number`, verificar unicidad
4. Update con COALESCE (solo cambia campos enviados)
5. Actualizar `updated_at`

---

### 4.11. DELETE /api/v1/master/customers/:id — Eliminar cliente — BLOQUEADO

**Estado:** 404 NGINX

**Llamado por:** Boton "Eliminar" en la fila del listado o en el detalle. Confirma con `CustomerDeleteDialog`.

**Reglas:**
1. Validar que NO tenga ordenes activas
2. Soft-delete: marcar `deleted_at = NOW()`
3. Si tiene ordenes activas, devolver `409 Conflict`

---

### 4.12. POST /api/v1/master/customers/:id/toggle-status — Toggle status — BLOQUEADO

**Estado:** 404 NGINX

**Llamado por:** Boton "Activar/Desactivar" en la fila o en el detalle. Hook `useCustomers().toggleCustomerStatus(id)`.

**Body:** `{}` (sin body, el backend hace el toggle automatico)

**Response:**
```json
{
  "data": { "id": "uuid", "status": "inactive" }
}
```

**Reglas:**
1. Si status era `active` → cambiar a `inactive`
2. Si status era `inactive` → cambiar a `active`
3. Actualizar `updated_at`

---

### 4.13. PATCH /api/v1/master/customers/:id/status — Cambiar a status especifico — BLOQUEADO

**Estado:** 404 NGINX

**Body:**
```json
{ "status": "blocked" }
```

Valores: `active`, `inactive`, `pending`, `blocked`, `suspended`, `terminated`

**Reglas:** Permitir todas las transiciones. Validar que el status enviado sea valido.

---

### 4.14. GET /api/v1/master/customers/:id/operational-stats — Stats operacionales — BLOQUEADO

**Estado:** 404 NGINX

**Llamado por:** Tab "Operaciones" del detalle del cliente. Hook `useCustomerOperationalStats(customerId)`.

**Response esperada:**
```json
{
  "data": {
    "totalOrders": 120,
    "completedOrders": 108,
    "cancelledOrders": 5,
    "onTimeDeliveryRate": 95.5,
    "totalVolumeKg": 540000,
    "lastOrderDate": "2026-04-28T...",
    "totalBilledAmount": 1500000
  }
}
```

**Reglas:**
1. Calcular agregados desde la tabla `orders` filtrada por `customer_id`
2. `onTimeDeliveryRate` = `completedOrders` con `actual_delivery_at <= scheduled_delivery_at` / `completedOrders` * 100
3. `totalVolumeKg` = SUM de `total_weight` de todas las ordenes completadas

---

### 4.15. GET /api/v1/master/customers/:id/orders — Historial de ordenes — BLOQUEADO

**Estado:** 404 NGINX

**Query params:** `limit`, `status`, `startDate`, `endDate`

**Response esperada:**
```json
{
  "data": {
    "orders": [
      {
        "id": "order-uuid",
        "order_number": "ORD-2026-001",
        "status": "completed",
        "created_at": "...",
        "completed_at": "...",
        "total_weight": 1500
      }
    ],
    "summary": {
      "total": 120,
      "completed": 108,
      "in_progress": 7,
      "cancelled": 5
    }
  }
}
```

**Reglas:**
1. Filtrar ordenes donde `customer_id = :id`
2. Aplicar filtros opcionales (`status`, `startDate`, `endDate`)
3. Ordenar por `created_at` desc
4. Default `limit=50`

---

### 4.16. POST /api/v1/master/customers/:id/refresh-stats — Recalcular stats — BLOQUEADO

**Estado:** 404 NGINX

**Body:** `{}` (sin body)

**Response:** El cliente actualizado con sus stats recalculados.

**Reglas:**
1. Recalcular `total_orders`, `completed_orders`, `last_order_date`, `total_billed_amount` desde la tabla `orders`
2. Persistir los valores actualizados en una columna `cached_stats` (JSON) o columnas dedicadas
3. Devolver el cliente con los stats nuevos

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Bug: `billing_config.billing_address` rompe el backend con 500

**Sintoma:** Si el frontend envia el sub-objeto `billing_address` dentro de `billing_config` en el POST/PUT, el backend responde HTTP 500.

**Estado actual:** El frontend ya tiene el workaround en `mapCustomerToBackend()` (linea 294-321 del transformer). Detecta si el DTO tiene `billing_config.billing_address` y lo descarta antes de enviar.

**Que deberia hacer el backend:**
- Aceptar el campo y persistirlo (idealmente)
- O rechazarlo con `400 Bad Request` y mensaje claro `"billing_address no soportado todavia"`
- NO devolver 500 (eso indica error no controlado)

### 5.2. Endpoint `/import` espera array directo, no objeto envuelto

**Confirmado por test:** el endpoint funciona si se envia `[customer1, customer2, ...]` pero falla con 422 si se envia `{"customers": [customer1, ...]}`.

El frontend YA envia el formato correcto (array directo). Si el backend quiere cambiar a `{customers: [...]}` para consistencia con otros endpoints similares, deberia documentarlo y avisar al frontend.

### 5.3. El backend acepta UUIDs invalidos en campos de relacion (a verificar)

**A verificar:** en Orders confirmamos que el backend acepta strings que NO son UUID en `customer_id` y los persiste como `null`. No se ha probado si Customers tiene el mismo problema en sus campos de relacion (ej. `preferred_workflow_id`).

**Sugerencia:** Validar que los UUIDs sean validos antes de persistir. Devolver `400 Bad Request` si el formato es invalido.

### 5.4. `code` REQUERIDO en POST aunque la documentacion sugiere que es opcional

**Comportamiento actual:** Si el frontend envia POST sin `code`, el backend responde `422 Validation Error`.

**Workaround del frontend:** Autogenerar `code` con `generateCustomerCode()` antes de enviar (linea 100-102 del service). Verificado por sniff 2026-04-30.

**Pregunta para backend:** Es esto deliberado? Si el frontend siempre tiene que enviarlo, podria documentarse mas explicitamente. Si puede ser opcional (con autogeneracion server-side), seria mas limpio.

---

## 6. CAMBIOS RECIENTES EN EL FRONTEND (2026-05-03)

### Fix 1 — Helper `withIdBugDetection()` para mensajes claros

**Problema:** Antes, cuando el usuario intentaba editar/eliminar/ver detalle de un cliente, el frontend mostraba un error generico tipo "Algo salio mal" cuando el backend devolvia el 404 NGINX.

**Solucion:** Se agrego un helper privado `withIdBugDetection()` en el service. Cuando una operacion con `:id` falla con 404, lanza un Error con propiedad `backendBug: true` y mensaje explicativo:

> "Actualizar cliente (PUT /master/customers/:id) no esta disponible: el backend devuelve 404 en rutas con :id (bug NGINX reportado, afecta a todos los modulos). El equipo backend debe corregir la configuracion del proxy reverso."

**Archivos:** `src/services/master/customers.service.ts:265+`

**Endpoints afectados (todos los `:id`):**
- `getById()`, `update()`, `delete()` (heredados de BaseService, override con bug detection)
- `updateCustomer()`, `deleteCustomer()`, `toggleStatus()`
- `getOperationalStats()`, `getOrderHistory()`, `refreshOperationalStats()`

### Fix 2 — Limpieza del comentario obsoleto sobre `/stats` y `/cities`

**Problema:** El comentario en el codigo decia "BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes" pero los tests confirmaron que el endpoint SI funciona.

**Solucion:** Actualizado el comentario para reflejar la realidad. El fallback `computeStatsFromList()` se mantiene como defensive programming en caso de downtime intermitente.

**Archivo:** `src/services/master/customers.service.ts:165-180`

### Fix 3 — Test E2E corregido para import

**Problema:** El test E2E enviaba `{customers: [...]}` y recibia 422.

**Solucion:** Actualizado para enviar el array directo. Confirmado que el endpoint del backend espera ARRAY DIRECTO, no objeto envuelto.

**Archivo:** `otros/testing/test-customers-full.mjs:223+`

---

## 7. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico — bloquea funcionalidad del modulo

- [ ] Arreglar configuracion de NGINX para que las rutas con `:id` (UUID) no devuelvan 404. Ver seccion 2 del documento. Un solo cambio (location block con prefijo) arregla los 8 endpoints bloqueados de Customers Y los 30+ de los otros modulos.

### Alto — bugs especificos del modulo

- [ ] Bug del 500 al enviar `billing_config.billing_address`. Investigar y arreglar.
- [ ] Validar que los UUIDs en campos de relacion sean validos (rechazar con 400 en lugar de aceptar strings invalidos).

### Medio — mejoras de validacion

- [ ] Validar `document_number` con la regla correspondiente al `document_type` (RUC modulo 11, DNI sin patrones repetidos, CE alfanumerico, PASSPORT alfanumerico)
- [ ] Validar unicidad de `document_number` en el tenant (devolver 409 si duplicado)
- [ ] Documentar oficialmente que `code` es REQUERIDO (o hacer que sea opcional con autogeneracion)

### Bajo — observaciones

- [ ] Confirmar que `/find-by-document?documentNumber=` y `/by-document/:documentNumber` son ambos canonicos o eliminar uno de los dos
- [ ] Documentar formato exacto de response de `/operational-stats` y `/orders` (cuando se arregle NGINX)
- [ ] Considerar agregar `tags[]` real al modelo (frontend lo soporta y el backend lo recibe pero no se ha verificado que persista)

---

## 8. APENDICE: COMO REPRODUCIR LOS TESTS

### Credenciales

```
URL:      https://api-service.gruponavitel.com
Username: admin
Password: Admin1432!
```

### Test E2E completo del modulo Customers

```bash
cd "TMS-NAVITEL-prueba"
node otros/testing/test-customers-full.mjs
```

Ejecuta los 18 endpoints del modulo y reporta el porcentaje funcional.

### Test del bug NGINX :id

```bash
node otros/testing/bug-investigation-orders-id.mjs   # 12 variantes basicas
node otros/testing/bug-deep-investigation.mjs        # 30+ variantes para descartar problemas frontend
```

### Test minimo manual con curl

```bash
# 1. Login
TOKEN=$(curl -s -X POST https://api-service.gruponavitel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1432!"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).data.accessToken)})")

# 2. Crear customer
CUSTOMER=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/master/customers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"code":"TEST-MANUAL","type":"company","document_type":"RUC","document_number":"20111222999","name":"Test Manual","email":"t@t.com","phone":"+51 999 111 222"}')
echo "Creado: $CUSTOMER"

# 3. Extraer ID
CUSTOMER_ID=$(echo "$CUSTOMER" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).data.id)})")

# 4. Verificar que aparece en lista (debe funcionar)
curl -s "https://api-service.gruponavitel.com/api/v1/master/customers" \
  -H "Authorization: Bearer $TOKEN" | head -c 500

# 5. Intentar GET por ID (DEBE FALLAR con 404 NGINX hasta que se arregle el bug)
curl -v "https://api-service.gruponavitel.com/api/v1/master/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Si en el paso 5 recibis `404` con body `"Not Found"` en text/plain, es la firma del bug NGINX descrito en seccion 2.

