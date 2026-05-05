# Reporte: Documentacion vieja (QUICK_REFERENCE.docx) vs realidad

**Fecha:** 2026-05-03
**Fuentes comparadas:**
- **QUICK_REFERENCE**: 13 archivos `.docx` recibidos del otro dev del backend (en `otros/documentacion mandada por otro dev/DOCUMENTACION TMS/`)
- **Excel oficial**: tabla compartida por el usuario en chat (lista de endpoints autorizados por el equipo backend)
- **Frontend real**: lo que el codigo del frontend (`src/services/`) realmente llama
- **Produccion**: lo que probamos con tests E2E en `https://api-service.gruponavitel.com`

---

## RESUMEN EJECUTIVO

### Pregunta del usuario

> "Quiero que revises esta carpeta hay documentacion antigua y nose si esa documentacion esta bien y es fiel a nuestro codigo a lo que mandamos recibimos y hacemos en el frontend"

### Respuesta corta

**La documentacion `.docx` NO es fiel al codigo del frontend ni al Excel oficial ni a la realidad de produccion.** Es una version intermedia, **incompleta** en varios modulos y **tiene paths inconsistentes**. Hay **3 fuentes que no concuerdan entre si**, y el frontend asume cosas que ninguna de las 3 documenta.

### Hallazgos clave

1. **303 endpoints en QUICK_REFERENCE.docx vs ~250 en Excel oficial** — no son el mismo numero ni se solapan totalmente.
2. **Paths inconsistentes entre los .docx**: algunos usan `/api/v1/...`, otros `/api/...` (sin v1), otros solo `/customers/...` (sin prefijo). El base path real de produccion es `/api/v1/`.
3. **Drivers en QUICK_REFERENCE: 8 endpoints. En Excel: 9 endpoints. Frontend usa: 16 endpoints.** El frontend inventa 7 endpoints que no estan en NINGUNA documentacion.
4. **Faltan endpoints clave** en QUICK_REFERENCE que SI estan en el Excel oficial. Ejemplo: `PATCH /master/drivers/:id/status` (Excel SI lo lista, QUICK_REFERENCE NO lo menciona).
5. **DTOs detallados**: la QUICK_REFERENCE tiene casos de uso muy detallados (CU-XX), schema de DB, eventos de dominio, RBAC. El Excel solo tiene una lista plana de endpoints. **El detalle de campos de la QUICK_REFERENCE SI sirve aunque la lista de endpoints este incompleta.**

### Recomendacion general

| Fuente | Util para... | NO usar para... |
|---|---|---|
| QUICK_REFERENCE.docx | Schema de campos, casos de uso, reglas de negocio, eventos, RBAC | Lista definitiva de endpoints (incompleta) |
| Excel oficial | Lista canonica de endpoints implementados/planificados | Detalle de DTOs/reglas (es solo path + descripcion) |
| Frontend codigo | Conocer que **necesita** el frontend (puede estar pidiendo cosas que el backend nunca planeo) | Verdad oficial (asume cosas no planificadas) |
| Tests E2E | **Verdad operativa**: que funciona realmente HOY | Predecir que funcionara cuando backend complete |

**La unica fuente "verdadera" hoy es lo que devuelve la API en produccion** (los tests E2E).

---

## DISCREPANCIAS POR MODULO

### MASTER — DRIVERS

| Endpoint | QUICK_REFERENCE | Excel oficial | Frontend usa | Produccion |
|---|:---:|:---:|:---:|:---:|
| GET `/master/drivers` | ✅ E-13 | ✅ | ✅ | ✅ 200 |
| GET `/master/drivers/:id` | ✅ E-14 | ✅ | ✅ | ❌ 404 |
| POST `/master/drivers` | ✅ E-15 | ✅ | ✅ | ✅ 201 |
| PUT `/master/drivers/:id` | ✅ E-16 | ✅ | ✅ | ❌ 404 |
| DELETE `/master/drivers/:id` | ✅ E-17 | ✅ | ✅ | ❌ 404 |
| POST `/master/drivers/bulk-delete` | ✅ E-18 | ✅ | ✅ | ✅ 200 |
| GET `/master/drivers/stats` | ✅ E-19 | ✅ | ✅ | ✅ 200 |
| GET `/master/drivers/expiring-licenses` | ✅ E-20 | ✅ | ✅ | ✅ 200 |
| **PATCH `/master/drivers/:id/status`** | **❌ NO** | **✅ SI** | ✅ (despues de v2) | ❌ 404 |
| GET `/master/drivers/by-document/:doc` | ❌ | ❌ | ✅ | ✅ 200 |
| POST `/master/drivers/:id/enable` | ❌ | ❌ | inventado | ❌ 404 |
| POST `/master/drivers/:id/block` | ❌ | ❌ | inventado | ❌ 404 |
| GET `/master/drivers/:id/checklist` | ❌ | ❌ | inventado | ❌ 404 |
| POST `/master/drivers/:id/assign-vehicle` | ❌ | ❌ | inventado | ❌ 404 |
| POST `/master/drivers/:id/unassign-vehicle` | ❌ | ❌ | inventado | ❌ 404 |

**Discrepancias clave:**
- QUICK_REFERENCE.docx **omite PATCH /:id/status** (pero el Excel SI lo incluye). Esto significa que la documentacion vieja esta desactualizada.
- QUICK_REFERENCE **no menciona /by-document/:doc** que SI existe en produccion.
- 5 endpoints que el frontend usaba estaban inventados (corregidos en v2 segun el HANDOFF que reescribimos).

**Veredicto Drivers:** la QUICK_REFERENCE.docx esta **desactualizada e incompleta**. El Excel oficial es mas completo pero tampoco refleja toda la realidad.

---

### MASTER — CUSTOMERS

QUICK_REFERENCE lista **12 endpoints** (E-01 a E-12). El Excel oficial lista los mismos 12 + algunos adicionales:

| Endpoint | QUICK_REFERENCE | Excel | Frontend | Produccion |
|---|:---:|:---:|:---:|:---:|
| GET `/customers` | ✅ E-01 | ✅ | ✅ | ✅ |
| GET `/customers/:id` | ✅ E-02 | ✅ | ✅ | ❌ 404 |
| POST `/customers` | ✅ E-03 | ✅ | ✅ | ✅ |
| PUT `/customers/:id` | ✅ E-04 | ✅ | ✅ | ❌ 404 |
| DELETE `/customers/:id` | ✅ E-05 | ✅ | ✅ | ❌ 404 |
| POST `/customers/bulk-delete` | ✅ E-06 | ✅ | ✅ | ✅ |
| POST `/customers/:id/toggle-status` | ✅ E-07 | ✅ | ✅ | ❌ 404 |
| GET `/customers/stats` | ✅ E-08 | ✅ | ✅ | ✅ |
| GET `/customers/find-by-document` | ✅ E-09 | ✅ | ✅ | ✅ |
| POST `/customers/import` | ✅ E-10 | ✅ | ✅ | ✅ |
| GET `/customers/export/csv` | ✅ E-11 | ✅ | ✅ | ✅ |
| GET `/customers/cities` | ✅ E-12 | ✅ | ✅ | ✅ |
| **PATCH `/customers/:id/status`** | ❌ | ✅ | ✅ | ❌ 404 |

**Veredicto Customers:** la QUICK_REFERENCE.docx **coincide con el Excel** salvo que **omite `PATCH /:id/status`** (mismo patron que Drivers — el Excel agrego este endpoint despues).

---

### MASTER — VEHICLES

QUICK_REFERENCE lista **9 endpoints** (E-21 a E-29). El frontend usa al menos 14.

| Endpoint | QUICK_REFERENCE | Excel | Frontend | Produccion |
|---|:---:|:---:|:---:|:---:|
| GET `/vehicles` | ✅ E-21 | ✅ | ✅ | ✅ |
| GET `/vehicles/:id` | ✅ E-22 | ✅ | ✅ | ❌ |
| POST `/vehicles` | ✅ E-23 | ✅ | ✅ | ✅ |
| PUT `/vehicles/:id` | ✅ E-24 | ✅ | ✅ | ❌ |
| DELETE `/vehicles/:id` | ✅ E-25 | ✅ | ✅ | ❌ |
| POST `/vehicles/bulk-delete` | ✅ E-26 | ✅ | ✅ | ✅ |
| GET `/vehicles/stats` | ✅ E-27 | ✅ | ✅ | ✅ |
| **GET `/vehicles/expiring-documents`** | ✅ E-28 | ✅ | ❌ no usa | ? (no probado) |
| **GET `/vehicles/needing-maintenance`** | ✅ E-29 | ✅ | ❌ no usa | ? (no probado) |
| **PATCH `/vehicles/:id/status`** | ❌ | ✅ | ❌ | ❌ |
| **POST `/vehicles/:id/breakdowns`** | ❌ | ✅ | ❌ | ? |
| GET `/vehicles/by-plate/:plate` | ❌ | ❌ | ✅ | ✅ |
| **POST `/vehicles/:id/enable`** | ❌ | ❌ | inventado | ❌ |
| **POST `/vehicles/:id/block`** | ❌ | ❌ | inventado | ❌ |
| **POST `/vehicles/:id/assign-driver`** | ❌ | ❌ | inventado | ❌ |
| **POST `/vehicles/:id/unassign-driver`** | ❌ | ❌ | inventado | ❌ |
| **GET `/vehicles/:id/checklist`** | ❌ | ❌ | inventado | ❌ |

**Discrepancias clave:**
- QUICK_REFERENCE menciona `/vehicles/expiring-documents` y `/vehicles/needing-maintenance` que el frontend NO usa actualmente.
- El Excel agrego `PATCH /:id/status` y `POST /:id/breakdowns` que la QUICK_REFERENCE no incluye.
- El frontend invento 5 endpoints (mismo patron que Drivers).

**Veredicto Vehicles:** patron similar a Drivers — QUICK_REFERENCE incompleta, Excel mas completo, frontend con muchas asunciones propias.

---

### MASTER — OPERATORS

QUICK_REFERENCE lista **6 endpoints** (E-30 a E-35). Coinciden con Excel.

**Veredicto Operators:** Documentacion coincide bastante bien. El frontend agrega `getByCode` y `getByRuc` (paths no-UUID que SI funcionan en produccion pero no estan documentados).

---

### MASTER — PRODUCTS

QUICK_REFERENCE lista **8 endpoints** (E-36 a E-43). Coinciden con Excel.

**Veredicto Products:** Documentacion coincide bien. **Es el unico modulo del MASTER donde QUICK_REFERENCE incluye `PATCH /:id/status`** (E-42). Esto sugiere que cuando se redacto la QUICK_REFERENCE el patron de `:id/status` solo se aplico a Products; despues se extendio a otros modulos en el Excel pero la QUICK_REFERENCE no se actualizo.

---

### MASTER — GEOFENCES

QUICK_REFERENCE lista **13 endpoints** (E-44 a E-56) bajo `/api/v1/master/geofences`. **PERO** en produccion el path real es `/api/v1/geofences` (sin /master). Esto es una discrepancia importante: la QUICK_REFERENCE menciona el path equivocado.

| Endpoint | Path en QUICK_REFERENCE | Path real |
|---|---|---|
| Listar | `/api/v1/master/geofences` | `/api/v1/geofences` |
| Detalle | `/api/v1/master/geofences/:id` | `/api/v1/geofences/:id` |
| Crear | `/api/v1/master/geofences` | `/api/v1/geofences` |

Endpoints en QUICK_REFERENCE que el frontend NO usa: `bulk-delete`, `:id/duplicate`, `batch-color`, `batch-category`, `toggle-status-batch`, `containing-point`, `import/kml`. La mayoria son funcionalidades planificadas pero no usadas todavia.

**Veredicto Geofences:** la QUICK_REFERENCE tiene **path equivocado** y **lista mucho mas de lo que se usa**. El Excel usa `/geofences` (root), pero el codigo descubrio que es `/api/v1/geofences`.

---

### ORDERS

QUICK_REFERENCE lista **12 endpoints** (E-01 a E-12). Excel oficial lista **22 endpoints** (mas detallado: workflow-progress, milestones, transit-update, deliver, cancel, close, items, etc.). El Excel es **mas completo** que la QUICK_REFERENCE para Orders.

**Discrepancias:**
- QUICK_REFERENCE no menciona: `/transit-update`, `/deliver`, `/cancel`, `/items`, `/tracking`, `/assign`, `/bulk-send`, `/workflow-progress`, `/milestones/:milestoneId`.
- QUICK_REFERENCE usa paths inconsistentes (a veces `/`, a veces `/import`, a veces `/:id/...`).

**Veredicto Orders:** QUICK_REFERENCE muy desactualizada. El Excel es mas confiable.

---

### MONITORING

QUICK_REFERENCE lista **32 endpoints** (E-01 a E-32). Excel lista **33 endpoints**. Cubren basicamente lo mismo. **Hallazgo clave:** la QUICK_REFERENCE describe endpoints como `/tracking`, `/historical`, etc. pero el path real en el Excel es `/api/v1/monitoring/tracking`, etc. La QUICK_REFERENCE asume el prefix relativo `/api/v1/monitoring/`.

Endpoints OK en produccion (de los que probamos): GET /tracking, GET /retransmission, GET /geofence-events.
Endpoints que dan 404 o 500: /tracking/realtime (no existe), /historical (requiere params), /retransmission/request (no existe segun nuestro test).

**Veredicto Monitoring:** documentacion completa pero el backend NO ha implementado todo lo documentado. Algunas rutas que QUICK_REFERENCE lista no existen.

---

### MAINTENANCE

QUICK_REFERENCE lista **35 endpoints** muy detallados (E-01 a E-35). Coinciden con Excel.

Los E2E tests probaron 10 endpoints (los listados principales: vehicles, schedules, work-orders, inspections, parts, workshops, breakdowns, alerts) y 8/10 funcionan en produccion. Los 2 que dan 404 son los `:id` (work-orders/:id y schedules/:id).

**Veredicto Maintenance:** **el modulo mas alineado.** La QUICK_REFERENCE coincide bastante bien con la realidad. Solo los `:id` faltan implementar.

---

### FINANCE

QUICK_REFERENCE lista **21 endpoints** (E-01 a E-21). Coinciden con Excel.

**Hallazgo:** la QUICK_REFERENCE usa el path `/customers/:id/summary` (E-18) pero **el Excel usa `/clientes/:id/summary` (con "clientes" en espanol)**. El path real en produccion es **`/api/v1/finance/clientes/:id/summary`**.

**Veredicto Finance:** documentacion casi completa. Discrepancia de idioma en `/clientes` vs `/customers`. El Excel y produccion usan espanol; la QUICK_REFERENCE usa ingles.

---

### REPORTS

QUICK_REFERENCE lista **23 endpoints**. Coincide con Excel. La QUICK_REFERENCE usa paths con prefijo `/api/reports/` (sin v1) que es inconsistente. El Excel y produccion usan `/api/v1/reports/`.

**Veredicto Reports:** coincide en logica pero **paths sin /v1 en QUICK_REFERENCE.** Hay que sumar /api/v1/ mentalmente para cada endpoint.

---

### SCHEDULING

QUICK_REFERENCE lista **22 endpoints** (E-01 a E-22). Coinciden con Excel.

**Hallazgo:** los endpoints de QUICK_REFERENCE **NO tienen prefix** (ej: `/orders` en lugar de `/api/v1/operations/scheduling/orders`). El Excel y produccion usan el prefix completo. Hay que sumar `/api/v1/operations/scheduling/` a cada endpoint.

**Veredicto Scheduling:** coincide bien pero los paths estan en formato relativo. Algunos endpoints dan 500 (kpis, auto-schedule) — bug del backend.

---

### SETTINGS

QUICK_REFERENCE lista **22 endpoints**. El Excel lista 23 (incluye uno extra). Coinciden en general.

**Veredicto Settings:** documentacion bien alineada. El modulo funciona al 100% en produccion (segun nuestros tests).

---

### WORKFLOWS

QUICK_REFERENCE lista **18 endpoints** bajo `/api/workflows/...`. El path real es **`/api/v1/master/workflows`** (no `/api/v1/workflows` como decia la QUICK_REFERENCE y como el frontend asumia originalmente).

**Hallazgo critico:** este modulo lo investigamos a fondo y descubrimos que el path real era `/api/v1/master/workflows` (con /master) en lugar de `/api/v1/workflows`. La QUICK_REFERENCE da el path INCORRECTO.

**Veredicto Workflows:** **path equivocado en la QUICK_REFERENCE.** Hay que cambiar `/api/workflows` por `/api/v1/master/workflows`. El frontend ya esta corregido para esto.

---

### BITACORA

QUICK_REFERENCE lista **13 endpoints** (E-01 a E-13). Coinciden con Excel.

**Hallazgo:** paths sin `/v1`. Real: `/api/v1/bitacora/...`.

**Veredicto Bitacora:** documentacion alineada. Solo los `:id` no funcionan en produccion (mismo patron).

---

### DASHBOARD

QUICK_REFERENCE lista **4 endpoints** simples. Excel los lista igual.

**Veredicto Dashboard:** alineados.

---

### PLATFORM, ROUTE_PLANNER

PLATFORM (23 endpoints) y ROUTE_PLANNER (22 endpoints) — el frontend NO los usa actualmente (no tenemos tests E2E). Documentacion completa en QUICK_REFERENCE.

---

## DISCREPANCIAS TRANSVERSALES (que afectan a todos los modulos)

### 1. Paths inconsistentes entre los .docx

Los `.docx` no usan un patron uniforme:

| Modulo | Path en QUICK_REFERENCE | Path real produccion |
|---|---|---|
| MASTER | `/api/v1/master/...` (incluye prefix) | `/api/v1/master/...` ✓ |
| BITACORA | `/api/bitacora/...` (sin v1) | `/api/v1/bitacora/...` |
| DASHBOARD | `/api/dashboard/...` | `/api/v1/dashboard/...` |
| FINANCE | `/invoices` (relativo) | `/api/v1/finance/invoices` |
| MAINTENANCE | `/vehicles` (relativo) | `/api/v1/maintenance/vehicles` |
| ORDERS | `/` (raiz relativa) | `/api/v1/orders` |
| REPORTS | `/api/reports/...` (sin v1) | `/api/v1/reports/...` |
| SCHEDULING | `/orders` (relativo) | `/api/v1/operations/scheduling/orders` |
| SETTINGS | `/api/settings/...` (sin v1) | `/api/v1/settings/...` |
| WORKFLOWS | `/api/workflows/...` (sin v1, sin /master) | `/api/v1/master/workflows/...` |
| GEOFENCES | `/api/v1/master/geofences` | `/api/v1/geofences` (sin /master) |

**Conclusion:** la QUICK_REFERENCE es **inconsistente en como expresa los paths**. Algunos incluyen el prefix completo, otros no. Para Geofences y Workflows el path es directamente equivocado.

### 2. Schema de DTOs SI es util (lo unico realmente confiable)

Aunque las listas de endpoints no son confiables, las **secciones 2 (Entidades del Dominio) y 3 (Modelo de Base de Datos)** de la QUICK_REFERENCE.docx tienen schemas detallados que SI son valiosos para el frontend. Por ejemplo, el schema de Driver lista todos los sub-objetos: license, emergency_contact, medical_exams, training_certifications, etc.

### 3. Casos de uso con reglas de negocio detalladas

La seccion 8 (Casos de Uso) de cada QUICK_REFERENCE describe el flujo paso a paso, precondiciones, postcondiciones, codigos de error. **Esto SI es util** y va mas alla de lo que el Excel proporciona.

### 4. La QUICK_REFERENCE es "mas vieja" que el Excel

Evidencia:
- QUICK_REFERENCE no incluye `PATCH /:id/status` para Drivers/Vehicles/Customers (el Excel SI)
- QUICK_REFERENCE no incluye varios endpoints de Orders que el Excel SI
- QUICK_REFERENCE da el path equivocado para Workflows y Geofences

Probablemente la QUICK_REFERENCE se redacto en una iteracion temprana del backend y NO se mantuvo al dia con los cambios.

---

## RECOMENDACIONES

### Para usar las QUICK_REFERENCE.docx

**SI usar para:**
- Schema de campos de cada entidad (seccion 2 y 3 de cada doc)
- Casos de uso detallados con reglas de negocio (seccion 8)
- Eventos de dominio publicados (seccion 10)
- Permisos RBAC (seccion 13)
- Diagramas de contexto (seccion 1.2)

**NO usar para:**
- Lista definitiva de endpoints (esta incompleta)
- Path exactos (varios modulos tienen path equivocado)
- Saber que esta implementado en produccion (es una vision idealizada del plan)

### Para confirmar que API esta disponible HOY

Usar **siempre** los tests E2E (`otros/testing/test-*-full.mjs`) que prueban contra produccion real.

### Para entender el backend "ideal" planificado

Combinar:
1. Excel oficial (lista canonica de endpoints)
2. QUICK_REFERENCE.docx (schema de DTOs + casos de uso + reglas de negocio)
3. Frontend codigo (lo que se necesita realmente)

### Mejor cross-check para cada modulo

Para cada modulo del frontend:
1. Listar lo que el frontend USA (codigo)
2. Comparar con Excel oficial → identificar inventos del frontend
3. Comparar con QUICK_REFERENCE → identificar mejoras del Excel
4. Probar en E2E → identificar gaps de implementacion vs documentacion

---

## CONCLUSION

**La carpeta de documentacion vieja NO es fiel a la realidad ni al codigo del frontend.** Tiene 3 problemas principales:

1. **Esta desactualizada**: omite endpoints que el Excel oficial SI incluye (PATCH /:id/status en multiples modulos).
2. **Tiene paths equivocados o relativos**: varios modulos no respetan el prefix `/api/v1/` y otros tienen el path completamente cambiado (Geofences, Workflows).
3. **No refleja lo que el frontend asume**: el frontend invento ~30 endpoints en total que NO estan en ninguna documentacion (enable, block, checklist, assign-vehicle/driver, etc. en multiples modulos).

**PERO** la QUICK_REFERENCE tiene secciones que el Excel oficial NO tiene y que SI son valiosas:
- Schemas detallados de DTOs y sub-entidades
- Casos de uso paso a paso con reglas de negocio
- Eventos de dominio
- RBAC

**La mejor estrategia es:** usar el Excel oficial para la lista de endpoints, la QUICK_REFERENCE para schemas y reglas de negocio, los tests E2E para saber que funciona HOY, y el HANDOFF que estamos generando para documentar discrepancias y solicitudes al backend.

---

**Fin del reporte.**
