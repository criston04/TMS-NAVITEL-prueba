# Bruno collection — TMS Navitel

Colección Bruno para probar todos los endpoints que el frontend de TMS-NAVITEL consume del backend (`api-service.gruponavitel.com`).

> **Compatibilidad: API v3 Rev3 (2026-04-27).** Los `Create` / `Update` reflejan el shape exacto que envía el frontend tras la actualización a v3 Rev3.

## 1. Cargar la colección

1. Instalar [Bruno](https://www.usebruno.com/).
2. Open Collection -> seleccionar la carpeta `otros/testing/bruno/`.
3. Bruno detecta `bruno.json` y carga las 16 carpetas (01-Auth … 16-Settings).

## 2. Setear el environment Dev

1. En el selector de environments (esquina superior derecha) elegir **Dev**.
2. Verificar las variables en `environments/Dev.bru`:
   - `rootUrl` = `https://api-service.gruponavitel.com`
   - `baseUrl` = `https://api-service.gruponavitel.com/api/v1`
   - `username` / `password` = credenciales admin
   - `authToken` (secret) — se rellena automáticamente al ejecutar `01-Auth/Login`.
   - `refreshToken` — se rellena automáticamente al ejecutar `01-Auth/Login` y se rota en `01-Auth/Refresh`.
   - `lastCustomerId`, `lastDriverId`, `lastVehicleId`, … — se rellenan automáticamente al ejecutar los `Create.bru` correspondientes.

## 3. Auth v3 Rev3 (importante)

- **`POST /auth/login`** (sin prefijo `/api/v1`):
  - Body: `{ "username": "...", "password": "..." }` — el campo es `username`, no `email`.
  - Response: `{ "success": true, "data": { "user": {...}, "accessToken": "...", "refreshToken": "..." } }`.
  - El script post-response guarda `authToken` ← `data.accessToken` y `refreshToken` ← `data.refreshToken`.
- **`POST /auth/refresh`** — NUEVO en v3 Rev3:
  - Body: `{ "refreshToken": "..." }`.
  - Devuelve un nuevo `accessToken` (y opcionalmente un `refreshToken` rotado).
  - El frontend (api-client v3 Rev3) llama este endpoint automáticamente al recibir 401, antes de reintentar la request original. Si el refresh falla, dispara logout.
- **`POST /auth/logout`**: body `{}`, requiere `Authorization: Bearer <accessToken>`.

## 4. Orden recomendado de ejecución

Para probar el flujo completo end-to-end:

1. **`01-Auth/Login.bru`** → guarda `authToken` y `refreshToken` automáticamente.
2. **`03-Master-Customers/02-Create.bru`** → guarda `lastCustomerId`.
3. **`07-Master-Operators/02-Create.bru`** → guarda `lastOperatorId`.
4. **`04-Master-Drivers/02-Create.bru`** → guarda `lastDriverId`.
5. **`05-Master-Vehicles/02-Create.bru`** → guarda `lastVehicleId`.
6. **`06-Master-Products/02-Create.bru`** → guarda `lastProductId`.
7. **`02-Geofences/...`** → crear geofences (origen + destino) → setear `lastGeofenceId` automáticamente vía script.
8. **`09-Workflows/02-Create.bru`** → guarda `lastWorkflowId`.
9. **`08-Orders/02-Create.bru`** → guarda `lastOrderId` (consume todos los `lastXxxId` de pasos previos + `items[]` inline).
10. **`08-Orders/04-Update.bru`**, **`05-ChangeStatus.bru`**, **`08-AssignResources.bru`**, **`09-Close.bru`** → flujo de la orden.
11. **`10-Bitacora/...`** → eventos de bitácora.
12. Finanzas (13), Reports (14), Maintenance (15), Settings (16) — independientes, cada uno con su flujo.

## 5. Variables que se setean automáticamente

Cada `Create.bru` tiene un `script:post-response` que extrae el `id` del response y lo guarda en la env var correspondiente:

| Request                                   | Variable seteada       |
|-------------------------------------------|------------------------|
| `01-Auth/Login`                           | `authToken`, `refreshToken` |
| `01-Auth/Refresh`                         | `authToken` (rotado), `refreshToken` (rotado) |
| `03-Master-Customers/02-Create`           | `lastCustomerId`       |
| `04-Master-Drivers/02-Create`             | `lastDriverId`         |
| `05-Master-Vehicles/02-Create`            | `lastVehicleId`        |
| `06-Master-Products/02-Create`            | `lastProductId`        |
| `07-Master-Operators/02-Create`           | `lastOperatorId`       |
| `08-Orders/02-Create`                     | `lastOrderId`          |
| `09-Workflows/02-Create`                  | `lastWorkflowId`       |
| `10-Bitacora/02-Create`                   | `lastBitacoraEntryId`  |
| `13-Finance/10-Invoice-Create`            | `lastInvoiceId`        |

## 6. Cambios de paths v3 Rev3

| Antes | Ahora |
|-------|-------|
| `/master/audit/...` | `/audit/...` |
| `/master/assignments/...` | `/assignments/...` |
| `/master/medical-exams/...` | `/medical-exams/...` |
| `/master/maintenance/...` | `/maintenance/...` |
| `/workflows` (list/CRUD definiciones) | `/workflows/definitions` |
| `/workflows/.../apply` (executions) | `/workflows/executions` |

> Nota: en esta colección sólo Workflows tenía `.bru` afectados — los demás módulos no estaban duplicados bajo `/master/`. Si en el futuro se agregan, deberán usar el path nuevo sin `/master/`.

## 7. Cambios de shape v3 Rev3 (resumen por módulo)

- **Geofences (`/geofences`)**: shape plano estándar — `name`, `shortName`, `address`, `lat`, `lng`, `radius`. Sin prefijos `g*`. `type` lowercase (`"polygon"`/`"circle"`). `status` string (`"active"`/`"inactive"`). `alerts{onEntry, onExit, onDwell, dwellTimeMinutes, notifyEmails}` anidado. **NO enviar `customer_id`** — el backend lo resuelve del JWT. POST acepta objeto único o array.
- **Operators (`/master/operators`)**: `name` (no `business_name`), `document_type` + `document_number` (no `ruc`), `address` (no `fiscal_address`), `type:"carrier"`, `city`, `country`, `contract_start_date`, `contract_end_date`.
- **Products (`/master/products`)**: `code` (no `sku`), `weight_kg` / `volume_m3` (no `weight` / `volume`), `unit` (no `unit_of_measure`), `is_dangerous: boolean` nuevo. Sin `dimensions{}` ni `transport_conditions{}`.
- **Vehicles (`/master/vehicles`)**: planos al raíz (`plate`, `brand`, `model`, `year`, `type`, `fuel_type`, `capacity_kg`, `capacity_m3`, `color`, `vin`, `operator_id`). `specs{engine_type, engine_displacement, axles, tires}`. `capacity{max_weight_kg, max_volume_m3, max_pallets}`. `insurance{type, policy_number, insurer, start_date, end_date, coverage_amount}` nuevo.
- **Orders (`/orders`)**: nuevos campos hidratados `customer_name`, `driver_name`, `vehicle_plate`, `estimated_distance_km`. `items[]` aceptado inline en el POST.

## 8. Diseño de los payloads

Los `Create.bru` y `Update.bru` envían el shape v3 Rev3 oficial. En módulos que aún transicionan (Customers, Drivers) se mantienen sub-objetos del frontend (`addresses[]`, `contacts[]`, `billing_config{}`, `license{}`, `emergency_contact{}`, `documents[]`, `checklist{}`) — coincide con los transformers en `src/lib/transformers/*.ts`. El backend ignora silenciosamente lo que no soporta.

## 9. Notas operativas

- **`/stats` endpoints** sufren de BUG #1 del backend: el router resuelve `/:id` antes de `/stats` y devuelve 404 cuando no hay un recurso con id "stats". Frontend tiene fallback que calcula stats a partir del listado.
- **Endpoints inexistentes** (mantenidos en la colección para tracking): `/master/operators/by-ruc`, `/by-code`, `/orders/by-number`, `/orders/by-driver/:id`, `/orders/by-vehicle/:id`, `/incidents/...`, `/notifications/...`. Ver comentarios en cada `.bru`.
- **`PATCH /orders/:id`** se usa como workaround para asignar `vehicle_id`, `driver_id`, `workflow_id`, `operator_id` — el backend NO expone endpoints dedicados de assign-*.
- **Refresh automático**: el frontend reintenta automáticamente toda request 401 una vez tras pedir `/auth/refresh`. En Bruno, si una request falla con 401, ejecutar manualmente `01-Auth/Refresh.bru` y reintentar.
