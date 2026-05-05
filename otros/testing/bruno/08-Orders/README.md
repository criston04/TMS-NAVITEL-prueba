# Orders — Ciclo CRUD completo en Bruno

**Objetivo:** Validar que el backend maneja correctamente un ciclo CRUD de Orders antes de tocar el frontend.

## Pre-requisito

**Tener un customer ya creado.** Esto setea la env var `lastCustomerId` que usamos en el Create.

1. Ejecutar `01-Auth/Login`
2. Ejecutar `03-Master-Customers/02-Create` (crea un customer y guarda su `id`)

Verificar que `lastCustomerId` tenga un valor real (no `{{lastCustomerId}}` literal) yendo a **Environments → Dev → Variables**.

---

## Flujo de testing — Orders (6 pasos)

### Paso 1: List inicial
**Request:** `01-List`
**Esperado:**
- Status 200
- `meta.total` = N (número actual de orders)
- `items: []` o con las orders previas

**Anota el total.** Después de crear una orden, debe subir a N+1.

### Paso 2: Create order
**Request:** `02-Create`
**Payload enviado:** shape FLAT con `customer_id`, `origin_address/lat/lng`, `destination_*`, `total_weight`, `scheduled_*_at`, etc.

**Esperado:**
- Status 201 Created
- Response con `id` y `order_number` generados
- **Verificar en el response:** los campos que mandamos NO deben venir null:
  - ✅ `customer_id`: tiene valor real
  - ✅ `origin_address`: "Almacen Lima Centro"
  - ✅ `origin_lat`: -12.0464
  - ✅ `total_weight`: 1000
  - ✅ `scheduled_pickup_at`: fecha ISO
  - ✅ `notes`: texto

**Si algún campo viene null:** el backend lo ignoró. Probamos otros nombres.

### Paso 3: Get by ID
**Request:** `03-GetById`
**Esperado:**
- Status 200
- La orden completa con TODOS los campos que mandamos en el Create populados
- Confirmar persistencia en BD

**Verificar:** los mismos valores del Paso 2 deben venir en el GET. Si el Create los devolvió pero el GET los muestra null, hay un bug en el backend (o no persistió).

### Paso 4: Update (PATCH)
**Request:** `04-Update`
**Payload:** solo cambiamos `priority`, `notes`, `total_weight`, `reference`

**Esperado:**
- Status 200 (o 204)
- Response con los valores nuevos

**Ejecutar `03-GetById` otra vez** después del update para confirmar que:
- Los campos cambiados tienen los valores nuevos
- Los campos NO cambiados (customer_id, origin_*, etc.) siguen iguales

### Paso 5: Change status
**Request:** `05-ChangeStatus`
**Payload:** `{ "status": "pending" }`

**Esperado:**
- Status 200
- Orden con `status: "pending"` ahora

**Probar:** cambiar a otros estados para ver la máquina de estados.
- `pending` → `assigned` (puede requerir vehicle_id, driver_id)
- `draft` → `cancelled` (directo)
- `completed` → `closed` (solo admin)

### Paso 6: Delete
**Request:** `06-Delete`
**Esperado:**
- Status 200/204 si la orden está en `draft` o `cancelled`
- Status 409/400 si está en otro estado (backend valida que solo se elimine draft)

**Ejecutar `01-List` después** para verificar que la orden ya NO aparece.

---

## Qué aprenderemos del test

| Pregunta | Cómo la respondemos |
|---|---|
| ¿Backend acepta shape FLAT con `origin_address`? | Paso 2: verificar si esos campos vienen populados en la response |
| ¿Persiste los datos? | Paso 3: GET los trae iguales |
| ¿Update parcial funciona? | Paso 4+3: confirmar solo cambió lo que mandamos |
| ¿Máquina de estados valida transiciones? | Paso 5: ver si acepta los cambios |
| ¿Delete tiene restricciones por estado? | Paso 6: qué estados permiten delete |

## Si algo sale mal — qué pasarme

**Para cada paso que falle:**
- Número del paso (1-6)
- Status code del response
- Response body completo

Con eso ajustamos el transformer del frontend antes de tocar la UI.
