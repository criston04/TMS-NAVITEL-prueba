# MODULO MAINTENANCE — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 8 de 10 endpoints funcionan en lectura (80.0%). Los 2 endpoints con `:id` sufren bug NGINX. Es el modulo con mayor cobertura de los testeados.

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

### Que hace el modulo Maintenance

Gestion del ciclo de mantenimiento de la flota:
- Vehiculos en mantenimiento (estado actual)
- Schedules de mantenimiento (programaciones preventivas: cada N km, cada N meses)
- Work orders (ordenes de trabajo abiertas: tipo, descripcion, fecha, costo, tecnico)
- Inspections (inspecciones tecnicas, revisiones)
- Parts (catalogo de repuestos: codigo, marca, costo, stock)
- Workshops (talleres asociados con datos de contacto)
- Breakdowns (averias reportadas en ruta)
- Alerts (alertas de mantenimientos por vencer, kilometraje, etc.)

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 10 |
| Funcionando OK | 8 (80.0%) |
| Bloqueados por NGINX `:id` | 2 |

### Endpoints OPERATIVOS (8)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/maintenance/vehicles` |
| GET | `/api/v1/maintenance/schedules` |
| GET | `/api/v1/maintenance/work-orders` |
| GET | `/api/v1/maintenance/inspections` |
| GET | `/api/v1/maintenance/parts` |
| GET | `/api/v1/maintenance/workshops` |
| GET | `/api/v1/maintenance/breakdowns` |
| GET | `/api/v1/maintenance/alerts` |

### Endpoints BLOQUEADOS (2 en este test, mas otros con `:id` que no se probaron)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/maintenance/work-orders/:id` |
| GET | `/api/v1/maintenance/schedules/:id` |

(Nota: este modulo tiene tambien CRUD de cada subentidad — POST, PUT, DELETE — que no se testearon en E2E pero seguramente sufren el mismo bug NGINX en sus rutas con `:id`.)

---

## 2. BUG NGINX `:id`

Mismo bug global. La fix en NGINX desbloquea los detalles individuales y todos los CRUD de subentidades.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/maintenance/vehicles` | OK |
| 2 | GET | `/api/v1/maintenance/schedules` | OK |
| 3 | GET | `/api/v1/maintenance/work-orders` | OK |
| 4 | GET | `/api/v1/maintenance/inspections` | OK |
| 5 | GET | `/api/v1/maintenance/parts` | OK |
| 6 | GET | `/api/v1/maintenance/workshops` | OK |
| 7 | GET | `/api/v1/maintenance/breakdowns` | OK |
| 8 | GET | `/api/v1/maintenance/alerts` | OK |
| 9 | GET | `/api/v1/maintenance/work-orders/:id` | 404 BUG NGINX |
| 10 | GET | `/api/v1/maintenance/schedules/:id` | 404 BUG NGINX |

**Funcional: 8/10 = 80.0%** (mejor cobertura entre los modulos testeados).

---

## 4. DETALLE POR ENDPOINT

### 4.1. GET /maintenance/vehicles

Lista de vehiculos con resumen de estado de mantenimiento (ultimo servicio, proximo servicio, alertas activas).

### 4.2. GET /maintenance/schedules

Programaciones preventivas. Items: cada N km cambio de aceite, cada N meses revision, etc.

### 4.3. GET /maintenance/work-orders

Ordenes de trabajo abiertas o en historial. Filtros: status, vehicle_id, workshop_id, date range.

**Sub-entidades CRUD esperadas (cuando NGINX se arregle):**
- POST /maintenance/work-orders → crear
- PUT /maintenance/work-orders/:id → actualizar
- DELETE /maintenance/work-orders/:id → eliminar
- POST /maintenance/work-orders/:id/complete → marcar completada

### 4.4. GET /maintenance/inspections

Inspecciones tecnicas (revisiones del MTC, certificaciones).

### 4.5. GET /maintenance/parts

Catalogo de repuestos con stock.

### 4.6. GET /maintenance/workshops

Talleres asociados con datos: nombre, RUC, direccion, telefono, especialidad.

### 4.7. GET /maintenance/breakdowns

Averias reportadas. Status: open, in-progress, resolved.

### 4.8. GET /maintenance/alerts

Alertas activas: mantenimiento por vencer, kilometraje cerca del proximo servicio, parts con stock bajo.

### 4.9-4.10. GET /:id (BLOQUEADO NGINX)

Detalle de work-order o schedule. Bloqueado por bug NGINX. Cuando se arregle, devuelve el shape completo con sub-objetos relacionados.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Bug NGINX

Detallado en seccion 2.

### 5.2. Sin endpoint de stats agregados

Util tener `GET /maintenance/stats` con metricas globales: costo total mensual, work orders abiertas, vehiculos en mantenimiento, etc.

### 5.3. Sin endpoint para subir fotos/documentos

Las work orders y inspecciones podrian tener evidencia fotografica. Sin endpoint dedicado para upload.

**Sugerencia:** anadir `POST /maintenance/work-orders/:id/attachments` con multipart/form-data.

### 5.4. Catalogo de parts sin endpoint de busqueda por SKU

Como en Products, util `GET /maintenance/parts/by-sku/:sku`.

---

## 6. CAMBIOS EN EL FRONTEND

Sin cambios estructurales pendientes. El service ya esta bien organizado. Solo falta que el backend arregle NGINX para acceder a detalles individuales.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Arreglar bug NGINX (afecta detalles y CRUD de sub-entidades).

### Alta prioridad

- [ ] Anadir `GET /maintenance/stats` con metricas agregadas.
- [ ] Documentar enums: `work_order.status`, `breakdown.severity`, `alert.type`.

### Media

- [ ] Anadir `POST /maintenance/work-orders/:id/attachments` para fotos/documentos.
- [ ] Anadir `GET /maintenance/parts/by-sku/:sku`.

### Documentacion

- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-maintenance-full.mjs
```

Salida esperada:

```
✅ 200 GET /maintenance/vehicles
✅ 200 GET /maintenance/schedules
✅ 200 GET /maintenance/work-orders
✅ 200 GET /maintenance/inspections
✅ 200 GET /maintenance/parts
✅ 200 GET /maintenance/workshops
✅ 200 GET /maintenance/breakdowns
✅ 200 GET /maintenance/alerts
❌ 404 GET /maintenance/work-orders/:id   BUG NGINX :id
❌ 404 GET /maintenance/schedules/:id     BUG NGINX :id

PORCENTAJE FUNCIONAL: 80.0%  (8/10)
```

Despues del fix NGINX: `100%  (10/10)`.

---

**Fin del documento.** MAINTENANCE-BACKEND-HANDOFF v1.0
