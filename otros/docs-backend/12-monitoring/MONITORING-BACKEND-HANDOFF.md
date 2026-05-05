# MODULO MONITORING — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 3 de 8 endpoints funcionan (37.5%). Bug NGINX `:id` afecta 2 endpoints, /historical exige query params (400), /tracking/realtime y /retransmission/request no existen (404).

---

## INDICE

1. Resumen ejecutivo
2. Bugs identificados
3. Lista de endpoints
4. Detalle por endpoint
5. Otros bugs y observaciones
6. Cambios en el frontend
7. Checklist para el backend
8. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Monitoring

Monitoreo en tiempo real y consulta historica de la flota:
- Tracking en vivo: posicion GPS actual de cada vehiculo
- Tracking historico: trayectoria de un vehiculo en un periodo
- Eventos de geocercas: cuando un vehiculo entro/salio de una geocerca
- Retransmision: pedir al dispositivo GPS que reenvie datos perdidos
- Websocket: para updates de posicion en tiempo real

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 8 |
| Funcionando OK | 3 (37.5%) |
| Bloqueados por NGINX `:id` | 2 |
| Endpoints faltantes | 2 (`/tracking/realtime`, `/retransmission/request`) |
| 400 por validacion | 1 (`/historical` exige query params) |

### Endpoints OPERATIVOS (3)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/monitoring/tracking` |
| GET | `/api/v1/monitoring/retransmission` |
| GET | `/api/v1/monitoring/geofence-events` |

### Endpoints con problemas (5)

| Metodo | Endpoint | Status | Causa |
|---|---|---|---|
| GET | `/api/v1/monitoring/tracking/realtime` | 404 | No existe |
| GET | `/api/v1/monitoring/historical` | 400 | Faltan query params requeridos |
| GET | `/api/v1/monitoring/tracking/:id` | 404 | BUG NGINX `:id` |
| GET | `/api/v1/monitoring/historical/:id` | 404 | BUG NGINX `:id` |
| POST | `/api/v1/monitoring/retransmission/request` | 404 | No existe |

---

## 2. BUGS IDENTIFICADOS

### 2.1. Endpoint `/tracking/realtime` no existe

El frontend espera tener un endpoint que devuelva la posicion mas reciente de TODOS los vehiculos en una sola llamada (mas eficiente que listar y luego pedir cada uno).

**Sugerencia:** o bien implementar este endpoint, o documentar que la forma de obtener tracking realtime es via WebSocket (`/monitoring/websocket`).

### 2.2. `/historical` exige query params

El endpoint exige `vehicle_id`, `from`, `to` como query params obligatorios. Sin ellos devuelve 400.

**Frontend:** ya tiene la logica para enviarlos, no es bug en sentido estricto, solo falta documentar.

### 2.3. `/retransmission/request` no existe (POST)

El frontend tiene `monitoring.retransmission.requestRetransmission(vehicleId, from, to)` que hace POST a este endpoint. Devuelve 404.

**Sugerencia:** implementar el endpoint o cambiar el path canonico.

### 2.4. Bug NGINX `:id`

Detallado en docs anteriores. Mismo fix global desbloquea los detalles individuales.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/monitoring/tracking` | OK |
| 2 | GET | `/api/v1/monitoring/tracking/realtime` | 404 NO EXISTE |
| 3 | GET | `/api/v1/monitoring/historical` | 400 (faltan params) |
| 4 | GET | `/api/v1/monitoring/retransmission` | OK |
| 5 | GET | `/api/v1/monitoring/geofence-events` | OK |
| 6 | GET | `/api/v1/monitoring/tracking/:vehicleId` | 404 BUG NGINX |
| 7 | GET | `/api/v1/monitoring/historical/:vehicleId` | 404 BUG NGINX |
| 8 | POST | `/api/v1/monitoring/retransmission/request` | 404 NO EXISTE |

**Funcional confirmado: 3/8 = 37.5%**

---

## 4. DETALLE POR ENDPOINT

### 4.1. GET /monitoring/tracking (OK)

Lista de tracking actual con paginacion.

**Response:**

```json
{
  "items": [
    {
      "vehicleId": "uuid",
      "plate": "ABC-123",
      "position": {"lat": -12.046, "lng": -77.042},
      "speed": 45,
      "heading": 180,
      "timestamp": "2026-05-03T...",
      "ignition": "on",
      "driverId": "uuid",
      "currentGeofence": "GEO-001"
    }
  ],
  "meta": {...}
}
```

### 4.2. GET /monitoring/historical (requiere params)

**Query params obligatorios:** `vehicle_id`, `from`, `to`.

**Response:** array de posiciones GPS en el rango temporal.

### 4.3. GET /monitoring/retransmission (OK)

Lista de solicitudes de retransmision pendientes/completadas.

### 4.4. GET /monitoring/geofence-events (OK)

Eventos de entrada/salida/permanencia en geocercas.

**Filtros:** `vehicle_id`, `geofence_id`, `from`, `to`, `event_type`.

### 4.5. POST /monitoring/retransmission/request (NO EXISTE — 404)

**Body esperado:**

```json
{
  "vehicleId": "uuid",
  "from": "2026-05-01T00:00:00Z",
  "to": "2026-05-02T00:00:00Z"
}
```

**Para que sirve:** pedir al dispositivo GPS del vehiculo que reenvie los datos perdidos en ese periodo (cuando hubo perdida de senal).

### 4.6-4.7. GET /monitoring/tracking/:id, /historical/:id (BLOQUEADO NGINX)

Detalles individuales por vehiculo.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. WebSocket endpoint no testeado

`/monitoring/websocket` no se prueba aqui (es WS, no HTTP). El frontend lo usa para actualizaciones en tiempo real.

### 5.2. Sin endpoint de stats agregados

Util tener `GET /monitoring/stats` con: vehiculos online/offline, alertas activas, kilometraje del dia, etc.

### 5.3. Sin endpoint de exportacion de tracking

Para reportes operativos, util `GET /monitoring/historical/export?format=kml|gpx|csv`.

---

## 6. CAMBIOS EN EL FRONTEND

Sin cambios estructurales pendientes. El service ya esta bien estructurado.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Implementar `GET /monitoring/tracking/realtime` (snapshot de TODOS los vehiculos).
- [ ] Implementar `POST /monitoring/retransmission/request`.
- [ ] Arreglar bug NGINX `:id`.

### Alta prioridad

- [ ] Documentar query params obligatorios de `/historical`.
- [ ] Implementar `GET /monitoring/stats` con metricas globales.

### Media

- [ ] Implementar export de tracking historico (KML, GPX, CSV).
- [ ] Documentar protocolo del WebSocket.

### Documentacion

- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-monitoring-full.mjs
```

Salida esperada:

```
✅ 200 GET /monitoring/tracking
❌ 404 GET /monitoring/tracking/realtime          NO EXISTE
❌ 400 GET /monitoring/historical                 (faltan query params)
✅ 200 GET /monitoring/retransmission
✅ 200 GET /monitoring/geofence-events
❌ 404 GET /monitoring/tracking/:id               BUG NGINX
❌ 404 GET /monitoring/historical/:id             BUG NGINX
❌ 404 POST /monitoring/retransmission/request    NO EXISTE

PORCENTAJE FUNCIONAL: 37.5%  (3/8)
```

Despues del fix NGINX + implementacion de los faltantes: `100%  (8/8)`.

---

**Fin del documento.** MONITORING-BACKEND-HANDOFF v1.0
