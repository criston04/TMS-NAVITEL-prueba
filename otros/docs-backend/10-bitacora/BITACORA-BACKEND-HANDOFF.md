# MODULO BITACORA — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 7 de 14 endpoints funcionan (50.0%). Los 7 endpoints bloqueados sufren bug NGINX `:id`.

---

## INDICE

1. Resumen ejecutivo
2. Bug NGINX `:id`
3. Lista de endpoints
4. Detalle por endpoint
5. Otros bugs y observaciones
6. Cambios en el frontend
7. Checklist para el backend
8. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Bitacora

Registro de eventos operativos del sistema. Es el "log" oficial del TMS donde quedan asentados todos los hechos relevantes:
- Eventos de geocercas: entrada, salida, permanencia (geofence breaches)
- Eventos de drivers: cambios de status, infracciones
- Eventos de vehicles: mantenimientos, incidentes, kilometraje
- Eventos de ordenes: creacion, asignacion, en transito, completada
- Eventos de monitoring: alertas GPS, perdida de senal, exceso de velocidad
- Asociacion entre eventos y ordenes
- Marcado de eventos como revisados, descartados o completados
- Notas/observaciones por evento
- Stats agregados por vehiculo y geocerca
- Exportacion a CSV

### Estado actual del modulo

| Metrica | Valor |
|---|---|
| Total endpoints que el frontend usa | 14 |
| Funcionando OK | 7 (50.0%) |
| Bloqueados por NGINX `:id` | 7 |

### Endpoints OPERATIVOS (7)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/bitacora` |
| GET | `/api/v1/bitacora/stats` |
| GET | `/api/v1/bitacora/summary/vehicles` |
| GET | `/api/v1/bitacora/summary/geofences` |
| GET | `/api/v1/bitacora/geofence-breaches` |
| GET | `/api/v1/bitacora/export?format=csv` |
| POST | `/api/v1/bitacora` |

### Endpoints BLOQUEADOS (7)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/bitacora/vehicle/:vehicleId` |
| PUT | `/api/v1/bitacora/:id/review` |
| PUT | `/api/v1/bitacora/:id/dismiss` |
| PUT | `/api/v1/bitacora/:id/notes` |
| PUT | `/api/v1/bitacora/:id/assign-order` |
| POST | `/api/v1/bitacora/:id/create-order` |
| PUT | `/api/v1/bitacora/:id/complete` |

---

## 2. BUG NGINX `:id`

Los 7 endpoints con UUID en path devuelven 404 NGINX. Note que `/vehicle/:vehicleId` tambien sufre el bug (path con UUID aunque sea parametro nombrado distinto). Mismo fix global de NGINX desbloquea todos.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/bitacora` | OK |
| 2 | GET | `/api/v1/bitacora/stats` | OK |
| 3 | GET | `/api/v1/bitacora/summary/vehicles` | OK |
| 4 | GET | `/api/v1/bitacora/summary/geofences` | OK |
| 5 | GET | `/api/v1/bitacora/geofence-breaches` | OK |
| 6 | GET | `/api/v1/bitacora/export?format=csv` | OK |
| 7 | POST | `/api/v1/bitacora` | OK |
| 8 | GET | `/api/v1/bitacora/vehicle/:vehicleId` | 404 BUG NGINX |
| 9 | PUT | `/api/v1/bitacora/:id/review` | 404 BUG NGINX |
| 10 | PUT | `/api/v1/bitacora/:id/dismiss` | 404 BUG NGINX |
| 11 | PUT | `/api/v1/bitacora/:id/notes` | 404 BUG NGINX |
| 12 | PUT | `/api/v1/bitacora/:id/assign-order` | 404 BUG NGINX |
| 13 | POST | `/api/v1/bitacora/:id/create-order` | 404 BUG NGINX |
| 14 | PUT | `/api/v1/bitacora/:id/complete` | 404 BUG NGINX |

**Funcional: 7/14 = 50.0%** → con NGINX arreglado: 14/14 = 100%.

---

## 4. DETALLE POR ENDPOINT

### 4.1. GET /api/v1/bitacora — Listar entradas (OK)

Query params: `?page=&pageSize=&search=&from=&to=&type=&vehicleId=&geofenceId=&status=`.

**Tipos de evento:** `geofence_entry, geofence_exit, geofence_dwell, vehicle_status_change, driver_infraction, order_created, order_assigned, order_picked_up, order_delivered, gps_signal_loss, speeding, hard_braking, etc.`

**Status:** `new, reviewed, dismissed, completed`.

### 4.2. GET /bitacora/stats (OK)

Stats globales: total, new, reviewed, by-type, by-vehicle.

### 4.3. GET /bitacora/summary/vehicles (OK)

Resumen por vehiculo: cuantos eventos en el periodo, tipos, ultima alerta.

### 4.4. GET /bitacora/summary/geofences (OK)

Resumen por geocerca: entradas, salidas, dwell, vehiculos involucrados.

### 4.5. GET /bitacora/geofence-breaches (OK)

Subset de bitacora filtrado a eventos de tipo `geofence_*`.

### 4.6. GET /bitacora/export?format=csv (OK)

Devuelve archivo CSV. Soporta `format=excel|csv|json`.

### 4.7. POST /api/v1/bitacora — Crear entrada (OK)

Para creacion manual desde el frontend (eventos que el usuario reporta, no automaticos).

**Body real:**

```json
{
  "event_type": "vehicle_incident",
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "order_id": "uuid (opcional)",
  "geofence_id": "uuid (opcional)",
  "description": "Choque leve en interseccion Av. X con Av. Y",
  "severity": "medium",
  "location": {"lat": -12.046, "lng": -77.042},
  "occurred_at": "2026-05-03T14:30:00Z",
  "photos": ["https://...", "https://..."]
}
```

**Reglas:**
- `event_type`: enum requerido.
- Al menos uno de `vehicle_id`, `driver_id`, `order_id` debe existir.
- `severity`: enum `["low", "medium", "high", "critical"]`.
- `tenant_id`: del JWT.
- Setear `created_by = currentUser.id`, `status = "new"`.

### 4.8-4.14. Endpoints con `:id` (BLOQUEADOS NGINX)

- **GET /bitacora/vehicle/:vehicleId** → eventos filtrados por vehicle.
- **PUT /:id/review** → marcar como revisado.
- **PUT /:id/dismiss** → descartar (con `reason`).
- **PUT /:id/notes** → anadir/editar notas.
- **PUT /:id/assign-order** → vincular evento con orden existente.
- **POST /:id/create-order** → crear nueva orden a partir del evento.
- **PUT /:id/complete** → marcar como completado.

Todos siguen el mismo patron de bug NGINX.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Bug NGINX

Detallado en seccion 2.

### 5.2. Falta endpoint /by-driver/:driverId

Util para auditoria por conductor. (Cuando se anada, idealmente como `/driver/:driverId` para mantener convencion con `/vehicle/:vehicleId` que ya existe pero esta bloqueado.)

### 5.3. Sin endpoint de bulk operations

No hay endpoint para marcar varios como revisados/descartados de una vez. Util en pantallas de auditoria masiva.

**Sugerencia:** anadir `POST /bitacora/bulk-review` con body `{ids[], reviewedBy}`.

### 5.4. POST acepta IDs sinteticos sin validar

El test E2E creo una entry con `vehicle_id: "test"` (no es UUID) y devolvio 201. El backend NO valida que el vehicle_id exista.

**Sugerencia:** validar foreign keys en POST y devolver 422 si no existen.

---

## 6. CAMBIOS EN EL FRONTEND

### 6.1. Service usa `getOptional` para detalle

`bitacora.service.ts:64` usa `getOptional<BitacoraEntry>` para el GET por ID, que tolera 404 devolviendo null. Cuando NGINX se arregle, esto funcionara correctamente.

### 6.2. Sin cambios estructurales pendientes

El service ya esta bien estructurado. Solo falta que el backend arregle NGINX.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Arreglar bug NGINX (afecta 7 endpoints).

### Alta prioridad

- [ ] Validar foreign keys en POST (`vehicle_id`, `driver_id`, `order_id`, `geofence_id` deben existir).
- [ ] Anadir `GET /bitacora/driver/:driverId` (para consistencia con `/vehicle/:vehicleId`).

### Media

- [ ] Anadir `POST /bitacora/bulk-review`, `/bulk-dismiss`.
- [ ] Implementar polling endpoint `GET /bitacora/recent` que devuelva solo eventos nuevos (para notificaciones realtime).

### Documentacion

- [ ] Documentar enum completo de `event_type`.
- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-bitacora-full.mjs
```

Salida esperada:

```
✅ 200 GET /bitacora
✅ 200 GET /bitacora/stats
✅ 200 GET /bitacora/summary/vehicles
✅ 200 GET /bitacora/summary/geofences
✅ 200 GET /bitacora/geofence-breaches
✅ 200 GET /bitacora/export?format=csv
❌ 404 GET /bitacora/vehicle/:vehicleId   BUG NGINX :id
✅ 201 POST /bitacora
❌ 404 PUT /bitacora/:id/review           BUG NGINX :id
❌ 404 PUT /bitacora/:id/dismiss          BUG NGINX :id
❌ 404 PUT /bitacora/:id/notes            BUG NGINX :id
❌ 404 PUT /bitacora/:id/assign-order     BUG NGINX :id
❌ 404 POST /bitacora/:id/create-order    BUG NGINX :id
❌ 404 PUT /bitacora/:id/complete         BUG NGINX :id

PORCENTAJE FUNCIONAL: 50.0%  (7/14)
```

Despues del fix NGINX: `100%  (14/14)`.

---

**Fin del documento.** BITACORA-BACKEND-HANDOFF v1.0
