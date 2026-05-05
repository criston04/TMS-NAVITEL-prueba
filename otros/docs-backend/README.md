# Documentacion para el Equipo Backend — TMS-NAVITEL

> Generado a partir del analisis del frontend.
> El frontend esta del lado de TMS-NAVITEL Next.js. El backend objetivo es `https://api-service.gruponavitel.com`.

---

## Documento principal por modulo

Cada modulo tiene UN solo documento consolidado para entregar al backend:

```
otros/docs-backend/
  README.md                              ← este archivo (indice)
  01-orders/
    ORDERS-BACKEND-HANDOFF.md            ← UNICO documento para entregar al backend
  02-customers/
    CUSTOMERS-BACKEND-HANDOFF.md         ← (pendiente)
  03-drivers/
    DRIVERS-BACKEND-HANDOFF.md           ← (pendiente)
  ...
```

Convencion de nombres: `<MODULO>-BACKEND-HANDOFF.md` para que se identifique
facilmente cuando se descargue o se pase por separado al equipo backend.

El archivo `BACKEND-HANDOFF.md` de cada modulo contiene:

1. Resumen ejecutivo del estado del modulo (% funcional, bugs)
2. Explicacion tecnica detallada de cada bug encontrado
3. Lista de endpoints que el frontend usa con cross-check (Tabla maestra vs Rev2 vs Rev3 vs produccion)
4. Detalle de cada endpoint: request real, response esperada, reglas de negocio
5. Otros bugs detectados
6. Checklist de acciones para el backend
7. Apendice con instrucciones para reproducir tests

---

## Estado por modulo

| # | Modulo | % funcional | Documento entregable | Estado |
|---|---|:---:|---|---|
| 01 | Orders | 33.3% (5/15) | `01-orders/ORDERS-BACKEND-HANDOFF.md` | Listo para revision |
| 02 | Customers | 55.6% (10/18) | `02-customers/CUSTOMERS-BACKEND-HANDOFF.md` | Listo para revision |
| 03 | Drivers | 43.8% (7/16) | `03-drivers/DRIVERS-BACKEND-HANDOFF.md` | Listo para revision |
| 04 | Vehicles | 42.9% (6/14) | `04-vehicles/VEHICLES-BACKEND-HANDOFF.md` | Listo para revision |
| 05 | Operators | 70.0% (7/10) | `05-operators/OPERATORS-BACKEND-HANDOFF.md` | Listo para revision |
| 06 | Geofences | 50.0% (3/6) | `06-geofences/GEOFENCES-BACKEND-HANDOFF.md` | Listo para revision |
| 07 | Workflows | 38.5% (5/13) | `07-workflows/WORKFLOWS-BACKEND-HANDOFF.md` | Listo para revision |
| 08 | Scheduling | 33.3% (5/15) | `08-scheduling/SCHEDULING-BACKEND-HANDOFF.md` | Listo para revision |
| 09 | Products | 37.5% (3/8) | `09-products/PRODUCTS-BACKEND-HANDOFF.md` | Listo para revision |
| 10 | Bitacora | 50.0% (7/14) | `10-bitacora/BITACORA-BACKEND-HANDOFF.md` | Listo para revision |
| 11 | Maintenance | 80.0% (8/10) | `11-maintenance/MAINTENANCE-BACKEND-HANDOFF.md` | Listo para revision |
| 12 | Monitoring | 37.5% (3/8) | `12-monitoring/MONITORING-BACKEND-HANDOFF.md` | Listo para revision |
| 13 | Finance | 72.7% (8/11) | `13-finance/FINANCE-BACKEND-HANDOFF.md` | Listo para revision |
| 14 | Reports | 50.0% (5/10) | `14-reports/REPORTS-BACKEND-HANDOFF.md` | Listo para revision |
| 15 | Settings | 100.0% (7/7) | `15-settings/SETTINGS-BACKEND-HANDOFF.md` | Listo para revision |
| 16 | Auth | 66.7% (4/6) | `16-auth/AUTH-BACKEND-HANDOFF.md` | Listo para revision |

---

## Hallazgo critico transversal: bug de configuracion de NGINX

Durante el analisis del modulo Orders se descubrio que el `404 Not Found` que devuelve el backend en endpoints con `:id` (como `GET /orders/abc-123`) NO viene del backend de aplicacion sino del proxy reverso NGINX.

Evidencia:
- El body literal es `"Not Found"` en text/plain de exactamente 9 bytes
- Esa es la respuesta DEFAULT de NGINX cuando la URL no esta en su configuracion
- Las rutas que SI funcionan devuelven JSON con content-type application/json
- El bug afecta tambien a `/master/customers/:id`, lo que indica que es un problema global de proxy, no del modulo Orders

Detalle completo en `01-orders/BACKEND-HANDOFF.md` seccion 2.

Esto significa que cuando se cubran todos los modulos del frontend, posiblemente la mayoria de los 404 reportados se resolveran con un solo cambio en la configuracion de NGINX.

---

## Resumen global de cobertura

| Metrica | Valor |
|---|---|
| Total modulos analizados | 16 |
| Documentos entregables generados | 16 (todos) |
| Total endpoints probados (suma) | ~180 |
| Endpoints OK | ~85 |
| Endpoints bloqueados por bug NGINX `:id` | ~60 |
| Endpoints con bugs reales (500, missing) | ~10 |
| Endpoints con 400 por validacion (datos sinteticos en E2E) | ~25 |

### Hallazgos principales

1. **Bug NGINX `:id` global** (afecta 7+ modulos): solo necesita un cambio en config NGINX (location prefix `/api/v1/`) para desbloquear ~60 endpoints. Detallado en cada documento de modulo.

2. **Path inconsistente Workflows**: tabla maestra y Rev3 indicaban `/api/v1/workflows`, pero el path real es `/api/v1/master/workflows`. Frontend corregido.

3. **Bugs reales detectados**:
   - `GET /finance/cash-flow` y otros 500s en Scheduling
   - `POST /auth/login` sin body devuelve 500 (deberia 400)
   - `GET /auth/me` no implementado
   - `GET /monitoring/tracking/realtime` no implementado
   - `POST /monitoring/retransmission/request` no implementado
   - Sub-objetos `specs/capacity/insurance/registration/documents` no se persisten en Vehicles
   - Sub-objetos `contacts/checklist/documents` no se persisten en Operators
   - Sub-objetos `license/emergency_contact/documents` parcialmente persistidos en Drivers

4. **Modulo champion**: Settings (100% funcional en lecturas).

### Cambios aplicados al frontend

- Helper `withIdBugDetection()` en services de Drivers, Vehicles, Operators, Products, Customers (anteriormente). Lanza Error explicativo en lugar de 404 crudo.
- Path corregido en api.config.ts: `workflows: "/master/workflows"`.
- Mantenido fallback `computeStatsFromList()` en services con `/stats` (defensive programming).

---

Ultima actualizacion: 2026-05-03
Version: 3.0 (todos los 14 modulos restantes completados — Drivers, Vehicles, Operators, Geofences, Workflows, Scheduling, Products, Bitacora, Maintenance, Monitoring, Finance, Reports, Settings, Auth)
