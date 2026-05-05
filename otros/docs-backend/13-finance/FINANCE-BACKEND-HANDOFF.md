# MODULO FINANCE — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 8 de 11 endpoints funcionan (72.7%). Bug NGINX `:id` afecta 3 endpoints.

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

### Que hace el modulo Finance

Gestion financiera del TMS:
- Invoices (facturas a clientes)
- Payments (pagos recibidos y emitidos)
- Costs (costos operativos: combustible, peajes, sueldos)
- Rates (tarifas: por km, por hora, por orden)
- Stats globales: facturado, cobrado, pendiente
- Aging (antigueedad de cuentas por cobrar: 0-30, 31-60, 61-90, +90 dias)
- Profitability (rentabilidad por orden, ruta, cliente, vehiculo)
- Cash flow (proyeccion de ingresos/egresos)
- Customer summary (resumen financiero por cliente)

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 11 |
| Funcionando OK | 8 (72.7%) |
| Bloqueados por NGINX `:id` | 3 |

### Endpoints OPERATIVOS (8)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/finance/invoices` |
| GET | `/api/v1/finance/payments` |
| GET | `/api/v1/finance/costs` |
| GET | `/api/v1/finance/rates` |
| GET | `/api/v1/finance/stats` |
| GET | `/api/v1/finance/aging` |
| GET | `/api/v1/finance/profitability` |
| GET | `/api/v1/finance/cash-flow` |

### Endpoints BLOQUEADOS (3)

| Metodo | Endpoint |
|---|---|
| GET | `/api/v1/finance/invoices/:id` |
| GET | `/api/v1/finance/payments/:id` |
| GET | `/api/v1/finance/clientes/:id/summary` |

(Nota: el path es `/finance/clientes/...` en espanol — probablemente una decision del backend.)

---

## 2. BUG NGINX `:id`

Mismo bug global. La fix desbloquea estos 3 endpoints + posibles CRUD de invoices/payments con `:id`.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/finance/invoices` | OK |
| 2 | GET | `/api/v1/finance/payments` | OK |
| 3 | GET | `/api/v1/finance/costs` | OK |
| 4 | GET | `/api/v1/finance/rates` | OK |
| 5 | GET | `/api/v1/finance/stats` | OK |
| 6 | GET | `/api/v1/finance/aging` | OK |
| 7 | GET | `/api/v1/finance/profitability` | OK |
| 8 | GET | `/api/v1/finance/cash-flow` | OK |
| 9 | GET | `/api/v1/finance/invoices/:id` | 404 BUG NGINX |
| 10 | GET | `/api/v1/finance/payments/:id` | 404 BUG NGINX |
| 11 | GET | `/api/v1/finance/clientes/:id/summary` | 404 BUG NGINX |

**Funcional: 8/11 = 72.7%** → con NGINX arreglado: 11/11 = 100%.

---

## 4. DETALLE POR ENDPOINT

### 4.1. GET /finance/invoices (OK)

Lista de facturas con filtros: `status`, `customer_id`, `from`, `to`, `due_date_from`, `due_date_to`.

**Status posibles:** `draft, issued, sent, paid, partially_paid, overdue, cancelled`.

### 4.2. GET /finance/payments (OK)

Pagos recibidos. Filtros: `customer_id`, `payment_method`, `from`, `to`.

### 4.3. GET /finance/costs (OK)

Costos operativos. Filtros: `category` (combustible, peajes, sueldos, mantenimiento, otros), `vehicle_id`, `from`, `to`.

### 4.4. GET /finance/rates (OK)

Catalogo de tarifas: por km, por hora, por orden, por palet, etc. Por cliente o globales.

### 4.5. GET /finance/stats (OK)

Stats globales del periodo: total facturado, cobrado, pendiente, gastos, utilidad.

### 4.6. GET /finance/aging (OK)

Aging de cuentas por cobrar agrupado:

```json
{
  "data": {
    "current": 45000,
    "1-30": 12000,
    "31-60": 5000,
    "61-90": 2000,
    "90+": 1500
  }
}
```

### 4.7. GET /finance/profitability (OK)

Rentabilidad agrupada. Filtros: `groupBy=order|customer|route|vehicle|driver`.

### 4.8. GET /finance/cash-flow (OK)

Proyeccion de ingresos/egresos a 30, 60, 90 dias.

### 4.9-4.11. GET con `:id` (BLOQUEADOS)

Detalles individuales. Bloqueados por bug NGINX.

---

## 5. OTROS BUGS Y OBSERVACIONES

### 5.1. Path mixto espanol/ingles

`/finance/clientes/:id/summary` esta en espanol mientras que el resto del API usa ingles (`/customers`, `/invoices`, etc.).

**Sugerencia:** unificar. O bien renombrar a `/finance/customers/:id/summary` o documentar la excepcion.

### 5.2. Sin endpoints de mutacion testeados aqui

El modulo tiene CRUD completo (POST, PUT, DELETE de invoices, payments, costs, rates) que no se testearon en E2E con datos sinteticos. Probablemente sufren el mismo bug NGINX en sus rutas con `:id`.

### 5.3. Bug NGINX

Detallado en seccion 2.

---

## 6. CAMBIOS EN EL FRONTEND

Sin cambios estructurales pendientes.

---

## 7. CHECKLIST PARA EL BACKEND

### Critico

- [ ] Arreglar bug NGINX (afecta 3 endpoints visibles + CRUD de mutaciones).

### Alta prioridad

- [ ] Renombrar `/finance/clientes/:id/summary` a `/finance/customers/:id/summary` (consistencia con el resto del API).
- [ ] Documentar enums de status, payment_method, cost_category.

### Media

- [ ] Endpoints de export financiero: `GET /finance/invoices/export?format=xlsx` (relevante para contabilidad).
- [ ] Webhooks o polling endpoint para nuevas facturas (notificaciones).

### Documentacion

- [ ] Postman/Bruno collection.

---

## 8. APENDICE

```bash
node otros/testing/test-finance-full.mjs
```

Salida esperada:

```
✅ 200 GET /finance/invoices
✅ 200 GET /finance/payments
✅ 200 GET /finance/costs
✅ 200 GET /finance/rates
✅ 200 GET /finance/stats
✅ 200 GET /finance/aging
✅ 200 GET /finance/profitability
✅ 200 GET /finance/cash-flow
❌ 404 GET /finance/invoices/:id              BUG NGINX
❌ 404 GET /finance/payments/:id              BUG NGINX
❌ 404 GET /finance/clientes/:id/summary      BUG NGINX

PORCENTAJE FUNCIONAL: 72.7%  (8/11)
```

---

**Fin del documento.** FINANCE-BACKEND-HANDOFF v1.0
