# MODULO SCHEDULING — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 5 de 15 endpoints funcionan en lectura (33.3%). Los POST de mutacion fallan con 400 por validacion (el frontend usa datos sinteticos en E2E pero funcionan con IDs reales). Hay 2 errores 500 reales y 2 endpoints con bug NGINX `:id`.

---

## INDICE

1. Resumen ejecutivo
2. Bugs reales detectados (500s)
3. Bug NGINX y rutas con `:id`
4. Lista de endpoints
5. Detalle por endpoint
6. Otros bugs y observaciones
7. Cambios recientes en el frontend
8. Checklist para el backend
9. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Scheduling

Programar (asignar driver+vehicle+fecha) ordenes operativas. Incluye:
- Listado de ordenes pendientes de programar
- KPIs de scheduling (cantidad programadas, en transito, completadas, conflictos)
- Vista Gantt de programaciones
- Detectar conflictos (mismo driver/vehicle programado dos veces)
- Validar HOS (Hours of Service - reglamento de horas de conduccion)
- Asignar driver+vehicle a una orden
- Reasignar (cambiar driver, vehicle o fecha)
- Asignacion masiva (bulk-assign)
- Auto-schedule (sugerir asignaciones automaticamente con algoritmo)
- Sugerencias por orden
- Calculo de duracion de workflow asociado
- Bloqueo de dias (dias no laborables, mantenimiento de flota)
- Notificaciones de scheduling (cambios, conflictos, cancelaciones)
- Audit logs

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 15 |
| GET de lectura funcionando OK | 5 (orders, audit-logs, blocked-days, notifications, gantt) |
| GET con error 500 | 1 (`/kpis`) |
| GET con NGINX `:id` | 2 (`/suggestions/:id`, `/workflow-info/:id`) |
| POST con error 400 (validacion, datos sinteticos) | 6 |
| POST con error 500 | 1 (`/auto-schedule`) |

### Endpoints OPERATIVOS confirmados (5)

| Metodo | Endpoint | Estado |
|---|---|---|
| GET | `/api/v1/operations/scheduling/orders` | 200 OK |
| GET | `/api/v1/operations/scheduling/audit-logs` | 200 OK |
| GET | `/api/v1/operations/scheduling/blocked-days` | 200 OK |
| GET | `/api/v1/operations/scheduling/notifications` | 200 OK |
| GET | `/api/v1/operations/scheduling/gantt` | 200 OK |

### Endpoints con BUG REAL (3)

| Metodo | Endpoint | Status | Tipo |
|---|---|---|---|
| GET | `/api/v1/operations/scheduling/kpis` | 500 | Bug backend |
| POST | `/api/v1/operations/scheduling/auto-schedule` | 500 | Bug backend |
| GET | `/api/v1/operations/scheduling/suggestions/:orderId` | 404 | Bug NGINX `:id` |
| GET | `/api/v1/operations/scheduling/workflow-info/:wfId` | 404 | Bug NGINX `:id` |

### Endpoints POST con validacion estricta (6)

Estos devuelven 400 con datos sinteticos del E2E pero funcionarian con IDs reales en el frontend de produccion:

| Metodo | Endpoint | Status |
|---|---|---|
| POST | `/api/v1/operations/scheduling/validate-hos` | 400 |
| POST | `/api/v1/operations/scheduling/detect-conflicts` | 400 |
| POST | `/api/v1/operations/scheduling/assign` | 400 |
| POST | `/api/v1/operations/scheduling/reschedule` | 400 |
| POST | `/api/v1/operations/scheduling/bulk-assign` | 400 |
| POST | `/api/v1/operations/scheduling/block-day` | 400 |

---

## 2. BUGS REALES DETECTADOS (errores 500)

### 2.1. GET /operations/scheduling/kpis devuelve 500

El endpoint que calcula los KPIs (cantidad de ordenes programadas, en transito, etc.) falla con error 500 Internal Server Error.

**Caso de uso afectado:** la pagina principal de scheduling muestra cards con KPIs en el header. Sin este endpoint, las cards no cargan o muestran "Error".

**Workaround actual del frontend:** El frontend tiene un fallback que computa KPIs client-side desde el listado de ordenes. Pero es ineficiente con muchos registros y no incluye todos los KPIs (latencias, eficiencia, etc.).

**Sugerencia:** revisar la query del controller `/kpis`. Probable que tenga una query SQL que falla cuando ciertas tablas estan vacias (e.g., si no hay ordenes, hace un AVG sobre 0 rows y rompe).

### 2.2. POST /operations/scheduling/auto-schedule devuelve 500

El algoritmo de auto-asignacion falla con 500.

**Caso de uso afectado:** el manager selecciona N ordenes pendientes y hace click en "Auto-asignar". El algoritmo deberia matchear ordenes con drivers/vehicles disponibles minimizando conflictos. En produccion, el endpoint falla con 500 incluso con payload valido.

**Sugerencia:** revisar logs del backend cuando se llama este endpoint. Probable que el algoritmo de optimizacion tenga un crash en algun caso edge (ordenes sin geocercas, drivers sin licencia, etc.).

---

## 3. BUG NGINX Y RUTAS CON `:id`

Los 2 endpoints con UUID en path devuelven 404 NGINX:

- `GET /operations/scheduling/suggestions/:orderId`
- `GET /operations/scheduling/workflow-info/:workflowId`

Detallado en docs de modulos anteriores. La fix en NGINX desbloquea estos.

---

## 4. LISTA DE ENDPOINTS QUE EL FRONTEND USA

| # | Metodo | Endpoint | Estado | Notas |
|---|---|---|:---:|---|
| 1 | GET | `/operations/scheduling/orders` | OK | Listado de ordenes para programar |
| 2 | GET | `/operations/scheduling/kpis` | 500 | BUG backend |
| 3 | GET | `/operations/scheduling/audit-logs` | OK | Logs de cambios |
| 4 | GET | `/operations/scheduling/blocked-days` | OK | Dias bloqueados |
| 5 | GET | `/operations/scheduling/notifications` | OK | Notificaciones |
| 6 | GET | `/operations/scheduling/gantt` | OK | Vista Gantt |
| 7 | POST | `/operations/scheduling/validate-hos` | 400 | Valida con IDs reales |
| 8 | POST | `/operations/scheduling/detect-conflicts` | 400 | Valida con IDs reales |
| 9 | POST | `/operations/scheduling/auto-schedule` | 500 | BUG backend |
| 10 | POST | `/operations/scheduling/assign` | 400 | Valida con IDs reales |
| 11 | POST | `/operations/scheduling/reschedule` | 400 | Valida con IDs reales |
| 12 | POST | `/operations/scheduling/bulk-assign` | 400 | Valida con IDs reales |
| 13 | POST | `/operations/scheduling/block-day` | 400 | Valida con IDs reales |
| 14 | GET | `/operations/scheduling/suggestions/:orderId` | 404 | BUG NGINX `:id` |
| 15 | GET | `/operations/scheduling/workflow-info/:wfId` | 404 | BUG NGINX `:id` |
| 16 | DELETE | `/operations/scheduling/block-day/:blockId` | n/d | BUG NGINX `:id` (no testeado, mismo patron) |

**Funcional confirmado: 5/15 = 33.3%** (solo lecturas con datos reales en BD).

---

## 5. DETALLE POR ENDPOINT (resumen)

### 5.1. GET /operations/scheduling/orders

**Estado:** OK. Lista las ordenes que estan en estado "pending_scheduling" o similar.

**Response:** array de ordenes con metadata adicional para scheduling (workflow asociado, geofences, etc.).

### 5.2. GET /operations/scheduling/kpis

**Estado:** 500. BUG.

**Response esperada (cuando funcione):**

```json
{
  "data": {
    "totalScheduled": 45,
    "totalInTransit": 12,
    "totalCompleted": 30,
    "totalConflicts": 2,
    "averageDelay": 15,
    "onTimeRate": 0.92
  }
}
```

### 5.3. POST /operations/scheduling/assign

**Body real:**

```json
{
  "orderId": "uuid",
  "driverId": "uuid",
  "vehicleId": "uuid",
  "scheduledStart": "2026-05-04T08:00:00Z",
  "scheduledEnd": "2026-05-04T18:00:00Z",
  "workflowId": "uuid (opcional)"
}
```

**Reglas:**
- Validar que driver, vehicle, order existan y pertenezcan al tenant.
- Validar HOS del driver (no exceder horas de conduccion).
- Detectar conflictos (driver/vehicle ya asignados a otra orden en ese periodo).
- Si todo OK, crear `ScheduledOrder` y actualizar status de la orden a `assigned`.

### 5.4. POST /operations/scheduling/validate-hos

Valida que el horario propuesto no exceda las Horas de Servicio (HOS) reglamentarias del driver.

**Body real:** `{driverId, scheduledStart, scheduledEnd}`.

**Response:** `{isValid, reason?, hoursAfter, hoursAvailable}`.

### 5.5. POST /operations/scheduling/detect-conflicts

Detecta conflictos antes de asignar.

**Body:** `{orders[], drivers[], vehicles[]}` o algun shape similar.

**Response:** array de conflictos.

### 5.6. POST /operations/scheduling/auto-schedule

**Estado:** 500. BUG.

Algoritmo de auto-asignacion. Ver seccion 2.2.

### 5.7. POST /operations/scheduling/reschedule, bulk-assign, block-day

Operaciones de mutacion. Funcionan con IDs reales del frontend.

### 5.8. GET /operations/scheduling/suggestions/:orderId, /workflow-info/:wfId

Ambos bloqueados por NGINX `:id`.

### 5.9. GET /operations/scheduling/audit-logs, blocked-days, notifications, gantt

Lecturas que funcionan OK. Devuelven listas filtradas por tenant.

---

## 6. OTROS BUGS Y OBSERVACIONES

### 6.1. KPIs con error 500

Detallado en seccion 2.1.

### 6.2. Auto-schedule con error 500

Detallado en seccion 2.2.

### 6.3. NGINX bug en endpoints con `:id`

Detallado en seccion 3.

### 6.4. Sin endpoint de export de schedule

El frontend no tiene un endpoint para exportar la planificacion a CSV/Excel/iCal. Esto seria util para gerentes que quieren ver el plan de la semana.

**Sugerencia:** anadir `GET /operations/scheduling/export?format=csv|excel|ical`.

### 6.5. Validacion de payloads exigente pero clara

Los POSTs devuelven 400 con mensajes de validacion claros cuando faltan campos. Bien hecho.

---

## 7. CAMBIOS RECIENTES EN EL FRONTEND

### 7.1. Fallback client-side de KPIs

Como `/kpis` da 500, el frontend computa KPIs basicos desde el listado de ordenes. No es completo pero evita pantalla en blanco.

### 7.2. Service tiene wrapping para errores

Cada metodo del service esta wrapeado en try/catch que loggea pero no rompe la UI. El usuario ve un toast de error en lugar de white screen.

---

## 8. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico

- [ ] **Arreglar el 500 en `GET /kpis`**. Probable bug en query SQL cuando ciertas tablas estan vacias.
- [ ] **Arreglar el 500 en `POST /auto-schedule`**. Crash del algoritmo en algun caso edge.
- [ ] **Arreglar bug NGINX** (afecta `/suggestions/:id`, `/workflow-info/:id`, `/block-day/:id`).

### Alta prioridad

- [ ] Verificar que los POSTs (`assign`, `reschedule`, `bulk-assign`, `validate-hos`, `detect-conflicts`, `block-day`) realmente funcionan con IDs reales — el frontend lo confirma en uso normal pero el E2E con datos sinteticos solo prueba que el endpoint existe y valida el shape.
- [ ] Anadir `GET /operations/scheduling/export?format=...` para descargar el plan.
- [ ] Confirmar que `DELETE /block-day/:blockId` funciona (no testeado).

### Media

- [ ] Documentar enums de `triggerEvent` en notifications.
- [ ] Documentar formato de payload para `auto-schedule` (constraints).

### Documentacion

- [ ] Actualizar Postman/Bruno collection.

---

## 9. APENDICE: COMO REPRODUCIR LOS TESTS

```bash
node otros/testing/test-scheduling-full.mjs
```

Salida esperada:

```
✅ 200 GET /operations/scheduling/orders
❌ 500 GET /operations/scheduling/kpis            BUG backend
✅ 200 GET /operations/scheduling/audit-logs
✅ 200 GET /operations/scheduling/blocked-days
✅ 200 GET /operations/scheduling/notifications
✅ 200 GET /operations/scheduling/gantt
❌ 400 POST /operations/scheduling/validate-hos    Validar con IDs reales
❌ 400 POST /operations/scheduling/detect-conflicts Validar con IDs reales
❌ 500 POST /operations/scheduling/auto-schedule    BUG backend
❌ 400 POST /operations/scheduling/assign           Validar con IDs reales
❌ 400 POST /operations/scheduling/reschedule       Validar con IDs reales
❌ 400 POST /operations/scheduling/bulk-assign      Validar con IDs reales
❌ 400 POST /operations/scheduling/block-day        Validar con IDs reales
❌ 404 GET /operations/scheduling/suggestions/:id   BUG NGINX :id
❌ 404 GET /operations/scheduling/workflow-info/:id BUG NGINX :id

PORCENTAJE FUNCIONAL (lecturas): 5/15 = 33.3%
```

---

**Fin del documento.**

Cualquier duda, contactar al equipo frontend con el id de este documento (SCHEDULING-BACKEND-HANDOFF v1.0).
