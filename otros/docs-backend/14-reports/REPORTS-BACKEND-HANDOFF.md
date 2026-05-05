# MODULO REPORTS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 5 de 10 endpoints funcionan (50.0%). 2 endpoints `:id` bloqueados por NGINX, 2 endpoints requieren query params, 1 POST requiere payload valido.

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

### Que hace el modulo Reports

Sistema de reportes del TMS:
- Definitions: catalogo de tipos de reportes disponibles (operational, financial, fleet, etc.)
- Templates: plantillas reutilizables con campos predefinidos
- Generated: reportes ya generados (historico)
- Schedules: reportes programados (diarios, semanales, mensuales)
- Data operational: datos crudos para reportes operacionales (KMs recorridos, ordenes, alertas)
- Data financial: datos crudos para reportes financieros (facturado, cobrado, costos)
- Usage stats: estadisticas de uso del sistema (cuantos reportes se generaron, mas usados)
- Generacion on-demand de reportes desde templates

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 10 |
| Funcionando OK | 5 (50.0%) |
| Bloqueados por NGINX `:id` | 2 |
| 400 por validacion (query params/payload) | 3 |

### Endpoints OPERATIVOS (5)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/reports/definitions` |
| GET | `/api/v1/reports/templates` |
| GET | `/api/v1/reports/generated` |
| GET | `/api/v1/reports/schedules` |
| GET | `/api/v1/reports/usage-stats` |

### Endpoints con 400 (datos sinteticos en E2E)

| Metodo | Endpoint | Status | Causa |
|---|---|---|---|
| GET | `/api/v1/reports/data/operational` | 400 | Faltan query params (probable: `from`, `to`) |
| GET | `/api/v1/reports/data/financial` | 400 | Faltan query params (probable: `from`, `to`) |
| POST | `/api/v1/reports/generate` | 400 | Payload incompleto (templateId real requerido) |

### Endpoints BLOQUEADOS NGINX (2)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/reports/definitions/:id` |
| GET | `/api/v1/reports/templates/:id` |

---

## 2. BUG NGINX `:id`

Mismo patron global. La fix desbloquea estos detalles.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/reports/definitions` | OK |
| 2 | GET | `/api/v1/reports/templates` | OK |
| 3 | GET | `/api/v1/reports/generated` | OK |
| 4 | GET | `/api/v1/reports/schedules` | OK |
| 5 | GET | `/api/v1/reports/data/operational` | 400 (query params) |
| 6 | GET | `/api/v1/reports/data/financial` | 400 (query params) |
| 7 | GET | `/api/v1/reports/usage-stats` | OK |
| 8 | GET | `/api/v1/reports/definitions/:id` | 404 BUG NGINX |
| 9 | GET | `/api/v1/reports/templates/:id` | 404 BUG NGINX |
| 10 | POST | `/api/v1/reports/generate` | 400 (payload) |

**Funcional confirmado: 5/10 = 50.0%**

---

## 4. DETALLE POR ENDPOINT

### 4.1. GET /reports/definitions (OK)

Catalogo de tipos de reportes.

### 4.2. GET /reports/templates (OK)

Plantillas reutilizables.

### 4.3. GET /reports/generated (OK)

Historico de reportes generados con metadata: tipo, fecha, parametros, archivo descargable.

### 4.4. GET /reports/schedules (OK)

Programaciones de reportes (cron-like).

### 4.5-4.6. GET /reports/data/operational, /financial (400 — exigen params)

**Query params probables obligatorios:** `from`, `to`, opcionalmente `vehicle_id`, `customer_id`, `groupBy`.

### 4.7. GET /reports/usage-stats (OK)

Stats de uso del sistema de reportes.

### 4.8-4.9. GET /:id (BLOQUEADO NGINX)

Detalle de definition o template.

### 4.10. POST /reports/generate

**Body real esperado:**

```json
{
  "templateId": "uuid-real",
  "parameters": {
    "from": "2026-05-01",
    "to": "2026-05-31",
    "vehicleIds": ["uuid"]
  },
  "format": "pdf"
}
```

**Reglas:** `templateId` debe existir, `format` enum `["pdf", "xlsx", "csv", "json"]`.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Sin endpoint de download

El frontend espera descargar un reporte generado. Probable que sea via `GET /reports/generated/:id/download` o un URL en el response del POST /generate.

**Sugerencia:** documentar el flujo de descarga.

### 5.2. Sin endpoint de progreso

Los reportes pueden tomar tiempo. Util tener `GET /reports/jobs/:jobId/status` para polling.

### 5.3. Bug NGINX

Detallado en seccion 2.

---

## 6. CAMBIOS EN EL FRONTEND

Sin cambios estructurales pendientes.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Arreglar bug NGINX (afecta 2 endpoints + posibles CRUD).

### Alta prioridad

- [ ] Documentar query params obligatorios de `/data/operational` y `/data/financial`.
- [ ] Documentar payload completo de POST /generate.
- [ ] Implementar/documentar flujo de download de reportes generados.

### Media

- [ ] Implementar endpoint de status de generacion para reportes async.
- [ ] Endpoints CRUD de schedules (POST, PUT, DELETE).

### Documentacion

- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-reports-full.mjs
```

Salida esperada: `5/10 = 50.0%`. Con NGINX arreglado y datos reales: `100%`.

---

**Fin del documento.** REPORTS-BACKEND-HANDOFF v1.0
