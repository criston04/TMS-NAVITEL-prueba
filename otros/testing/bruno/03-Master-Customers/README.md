# Customers — Testing completo en Bruno

**Total: 14 requests** cubriendo los 13 endpoints del Excel + 1 de debug.

---

## Mapa de endpoints Excel ↔ Bruno

| # Excel | Método | Path | Request Bruno | Frontend lo usa |
|---|---|---|---|---|
| 1 | GET | `/master/customers` | `01-List` | ✅ (getFiltered) |
| 2 | GET | `/master/customers/:id` | `03-GetById` | ✅ (getById inherit) |
| 3 | POST | `/master/customers` | `02-Create` | ✅ (createCustomer) |
| 4 | PUT | `/master/customers/:id` | `04-Update` | ✅ (updateCustomer) |
| 5 | PATCH | `/master/customers/:id/status` | `05-ChangeStatus` | ⚠️ no usado (frontend usa toggle-status) |
| 6 | DELETE | `/master/customers/:id` | `06-Delete` | ✅ (deleteCustomer) |
| 7 | POST | `/master/customers/bulk-delete` | `11-BulkDelete` | ✅ (bulkDelete) |
| 8 | POST | `/master/customers/:id/toggle-status` | `12-ToggleStatus` | ✅ (toggleStatus) |
| 9 | GET | `/master/customers/stats` | `08-Stats` | ✅ (getStats) |
| 10 | GET | `/master/customers/find-by-document?documentNumber=X` | `10-FindByDocument` | ✅ (findByDocument) |
| 11 | POST | `/master/customers/import` | `14-Import` | ✅ (importCustomers) |
| 12 | GET | `/master/customers/export/csv` | `13-ExportCsv` | ✅ (exportToCSV) |
| 13 | GET | `/master/customers/cities` | `09-Cities` | ✅ (getCities) |
| — | POST | (debug variantes naming) | `07-Debug-TypeAddress` | n/a (debug) |

---

## Flujo de testing sugerido

**Pre-requisito:** Login en `01-Auth/Login` + refresh de Bruno (para que cargue scripts actualizados).

### Fase 1 — CRUD básico (6 requests)
1. `01-List` → anotar count actual
2. `02-Create` → crea nuevo + guarda `lastCustomerId`
3. `03-GetById` → verificar el customer recién creado
4. `04-Update` (PUT) → cambiar nombre/email
5. `03-GetById` → confirmar update
6. `06-Delete` → eliminar (o `12-ToggleStatus` para marcar inactive)
7. `01-List` → verificar desapareció

### Fase 2 — Consultas (3 requests)
8. `08-Stats` → totales por estado/tipo/categoría
9. `09-Cities` → array de ciudades
10. `10-FindByDocument` → buscar por RUC/DNI (usar uno creado en fase 1)

### Fase 3 — Operaciones masivas (3 requests)
11. `02-Create` 2-3 veces más (tener varios customers para probar bulk)
12. `11-BulkDelete` → eliminar varios por array de ids
13. `13-ExportCsv` → descargar CSV
14. `14-Import` → importar lista

### Fase 4 — Status operations (2 requests)
15. `05-ChangeStatus` → setear explicitamente a "inactive"
16. `12-ToggleStatus` → alternar (active ↔ inactive)

---

## Qué reportar de cada paso

Para cada request que falle:
- **Status code** (200/201/400/404/500)
- **Response body** (especialmente error.message)
- **Payload enviado** (si es POST/PUT)

Para cada request que pase:
- ✅ (status code)
- Notas si algo raro (campos null que esperabas populados)

---

## Observaciones ya conocidas (no son bugs nuestros)

1. **`type` siempre vuelve `""`** — bug del backend, reportado en `09_CUSTOMERS_GAPS.md`
2. **`address` es string plano, no array** — diseño del backend, frontend se adapta
3. **`createdBy/updatedBy` son `"admin"`** — el backend rastrea el user, ok
