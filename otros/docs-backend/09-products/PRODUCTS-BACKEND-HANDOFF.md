# MODULO PRODUCTS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 3 de 8 endpoints funcionan (37.5%). Los 5 endpoints bloqueados sufren el bug NGINX `:id`.

---

## INDICE

1. Resumen ejecutivo
2. Bug NGINX y rutas con `:id`
3. Lista de endpoints
4. Detalle por endpoint
5. Otros bugs y observaciones
6. Cambios en el frontend
7. Checklist para el backend
8. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Products

Catalogo de productos transportables del tenant. Incluye:
- Tipos de productos: general, perecible, peligroso, fragil, refrigerado
- Unidades de medida: unidad, caja, paquete, palet, kg, tonelada, m³
- Especificaciones fisicas: peso (kg), volumen (m³), dimensiones
- Codigos: code interno, SKU, codigo de barras
- Caracteristicas: peligroso, perecible, requiere refrigeracion
- Status: active, inactive
- Stats globales y por categoria
- Duplicacion de productos
- Buscar por SKU o por codigo de barras (via search en listado, no endpoints dedicados)

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 8 |
| Funcionando OK | 3 (37.5%) |
| Bloqueados por NGINX `:id` | 5 |

### Endpoints OPERATIVOS (3)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/master/products` |
| GET | `/api/v1/master/products/stats` |
| POST | `/api/v1/master/products` |

### Endpoints BLOQUEADOS (5)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/master/products/:id` |
| PUT | `/api/v1/master/products/:id` |
| DELETE | `/api/v1/master/products/:id` |
| PATCH | `/api/v1/master/products/:id/status` |
| POST | `/api/v1/master/products/:id/duplicate` |

---

## 2. BUG NGINX Y RUTAS CON `:id`

NGINX rechaza rutas con UUID en path con `404 "Not Found"` plain text 9 bytes. Mismo bug global. Solucion en seccion del backend handoff de cualquier modulo anterior. La fix de un solo `location /api/v1/` desbloquea los 5 endpoints de Products.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | GET | `/api/v1/master/products` | SI | SI | SI | 200 | OK |
| 2 | GET | `/api/v1/master/products/stats` | SI | SI | SI | 200 | OK |
| 3 | POST | `/api/v1/master/products` | SI | SI | SI | 201 | OK |
| 4 | GET | `/api/v1/master/products/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 5 | PUT | `/api/v1/master/products/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 6 | DELETE | `/api/v1/master/products/:id` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 7 | PATCH | `/api/v1/master/products/:id/status` | SI | SI | SI | 404 | BLOQUEADO NGINX |
| 8 | POST | `/api/v1/master/products/:id/duplicate` | SI | SI | SI | 404 | BLOQUEADO NGINX |

**Funcional: 3/8 = 37.5%** → con NGINX arreglado: 8/8 = 100%.

---

## 4. DETALLE DE CADA ENDPOINT

### 4.1. POST /api/v1/master/products — Crear producto (OK 201)

**Request body real:**

```json
{
  "code": "PRD-001",
  "sku": "SKU-12345",
  "barcode": "7501234567890",
  "name": "Caja de cerveza Cusqueña 24 botellas",
  "description": "Caja con 24 botellas de 330ml",
  "category": "perecible",
  "unit": "caja",
  "weight_kg": 8.5,
  "volume_m3": 0.025,
  "is_hazardous": false,
  "is_perishable": true,
  "requires_refrigeration": true,
  "min_temperature_celsius": 4,
  "max_temperature_celsius": 8,
  "status": "active",
  "tags": ["bebidas", "cerveza"],
  "notes": "Mantener refrigerado siempre"
}
```

**Response (201):** mismo objeto con `id`, `tenant_id`, `created_at`, `updated_at`.

**Reglas:**
- `code` y `sku`: unicos por tenant. 409 si duplicados.
- `category`: enum `["general", "perecible", "peligroso", "fragil", "refrigerado"]`.
- `unit`: enum `["unidad", "caja", "paquete", "palet", "kg", "tonelada", "m3"]`.
- `weight_kg`, `volume_m3`: numeros positivos.
- `is_hazardous` true → requiere `hazard_class` (si existe esa columna).
- `requires_refrigeration` true → validar `min_temperature_celsius` y `max_temperature_celsius`.
- `tenant_id`: del JWT.

### 4.2. GET /api/v1/master/products — Listar (OK 200)

Query params: `?page=&pageSize=&search=&category=&status=&sortBy=&sortOrder=`.

`search`: busca en code, sku, name, barcode.

### 4.3. GET /api/v1/master/products/stats — Stats (OK 200)

Response:

```json
{
  "data": {
    "total": 50,
    "active": 45,
    "inactive": 5,
    "byCategory": {"general": 30, "perecible": 10, "peligroso": 2, "fragil": 5, "refrigerado": 3},
    "byUnit": {"unidad": 25, "caja": 15, "palet": 10},
    "hazardousCount": 2,
    "perishableCount": 10
  }
}
```

**Fallback frontend:** si /stats falla con 404, recalcula desde el listado.

### 4.4. GET /api/v1/master/products/:id (BLOQUEADO NGINX)

Detalle completo del producto con todos los campos.

### 4.5. PUT /api/v1/master/products/:id (BLOQUEADO NGINX)

Mismo body que POST. Solo campos que cambian.

### 4.6. DELETE /api/v1/master/products/:id (BLOQUEADO NGINX)

Soft delete. Si tiene ordenes activas con el producto: 422.

### 4.7. PATCH /api/v1/master/products/:id/status (BLOQUEADO NGINX)

Body: `{"status": "active" | "inactive"}`.

### 4.8. POST /api/v1/master/products/:id/duplicate (BLOQUEADO NGINX)

Body: `{}` o `{"newCode": "PRD-002"}`. Crea un nuevo producto con los mismos campos pero `code` y `sku` distintos (auto-generados o provistos).

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Falta endpoint /by-sku y /by-barcode

El frontend espera buscar productos por SKU y codigo de barras (para escaneo). Como no existen endpoints dedicados, hace `GET /master/products?search=...` y filtra client-side.

**Sugerencia:** anadir:
- `GET /master/products/by-sku/:sku`
- `GET /master/products/by-barcode/:barcode`

(NO usan UUID, no sufririan bug NGINX.)

### 5.2. Bug NGINX

Detallado en seccion 2.

### 5.3. Stats no incluye totales por unidad de venta

Util para reportes de ventas (cuantos productos en kg, en cajas, en paletas).

---

## 6. CAMBIOS EN EL FRONTEND

### 6.1. `withIdBugDetection()` aplicado

Aplicado a: `getById`, `update`, `delete`, `changeStatus`. Mensaje explicativo en lugar de 404 crudo.

### 6.2. Fallback de stats

Si /stats falla, recalcula desde el listado.

### 6.3. Busqueda por SKU/barcode via `search`

Como no hay endpoints dedicados, el frontend filtra client-side.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Arreglar bug NGINX (afecta 5 endpoints).

### Alta prioridad

- [ ] Anadir `GET /master/products/by-sku/:sku` y `/by-barcode/:barcode` (path no-UUID, no sufren NGINX bug).
- [ ] En POST/PUT, validar enums `category` y `unit`.
- [ ] En POST/PUT, si `requires_refrigeration=true`, exigir min/max temperature.

### Media

- [ ] Anadir endpoint `POST /master/products/bulk-delete` (consistencia con otros modulos).
- [ ] Stats: anadir `byUnit` y totales fisicos (kg totales, m3 totales).

### Documentacion

- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-products-full.mjs
```

Salida esperada:

```
✅ 200 GET /master/products
✅ 200 GET /master/products/stats
✅ 201 POST /master/products
❌ 404 GET /master/products/:id          BUG NGINX :id
❌ 404 PUT /master/products/:id          BUG NGINX :id
❌ 404 PATCH /master/products/:id/status
❌ 404 POST /master/products/:id/duplicate
❌ 404 DELETE /master/products/:id

PORCENTAJE FUNCIONAL: 37.5%  (3/8)
```

Despues del fix NGINX: `100%  (8/8)`.

---

**Fin del documento.** PRODUCTS-BACKEND-HANDOFF v1.0
