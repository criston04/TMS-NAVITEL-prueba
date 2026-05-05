# Otros — Material no-código del proyecto

Esta carpeta agrupa documentación, artefactos de pruebas y configuraciones que
**no son código fuente** de la aplicación. Se separaron aquí para mantener la
raíz del repo limpia.

## Estructura

```
otros/
├── docs/            → Documentación y diseño
├── analisis/        → Análisis de endpoints backend ↔ frontend
├── testing/         → Pruebas Bruno + smoke tests
└── github-config/   → Configuración de GitHub Copilot (agents, instructions)
```

---

## `docs/`

**Reportes de pruebas contra backend real (2026-04-21):**
- `RESULTADOS_PRUEBAS_BACKEND.md` — Resultados de pruebas por módulo.
- `RESULTADOS_PRUEBAS_MODULOS.md` — Detalles por módulo (Customer, Driver, Vehicle, etc.).
- `TESTING_CHECKLIST.md` — Checklist de pruebas pendientes.

**Documentación de integración backend:**
- `documentos a enviar pendientes/` — Documentos formales para enviar al equipo backend (incluye `10_BUGS_CONSOLIDADOS.md` con los 9 bugs detectados).
- `documentacion entregada al backend/` — Documentación ya enviada al backend en sesiones anteriores.
- `documentacion/` — Documentación general del sistema.

**HTMLs de diseño antiguos:**
- `ORDERS_*.html` — Diseños de referencia del módulo Órdenes (legacy).

---

## `analisis/`

Archivos generados por scripts de análisis forense entre endpoints backend y llamadas frontend:

- `endpoints_navitel_tms.xlsx` — Excel oficial del backend con los 200+ endpoints.
- `be_endpoints.txt` / `be_norm.tsv` — Endpoints backend normalizados.
- `fe_calls.txt` / `fe_parsed.tsv` — Llamadas que hace el frontend.
- `cr_matches.tsv` / `cr_method.tsv` / `cr_fe404.tsv` / `cr_be_unused.tsv` — Cross-referencia de coincidencias, mismatches de método y endpoints no usados.

---

## `testing/`

**Bruno (colección de pruebas API):**
- `bruno/` — Colección completa de requests Bruno contra el backend real. Incluye 01-Auth, 02-Geofences, 03-Master-Customers... hasta 08-Orders.

**Smoke tests automatizados:**
- `smoke-test.mjs` / `smoke-test-with-token.mjs` — Scripts Node para probar todos los endpoints de forma batch.
- `smoke-test-report-*.json` — Reportes de ejecuciones pasadas.

---

## `github-config/`

Configuración específica de GitHub Copilot (no necesaria para el runtime):
- `agents/` — Agentes personalizados.
- `instructions/` — Instrucciones por tema.
- `copilot-instructions.md` — Guía global de copilot.

---

## ¿Puedo eliminar esta carpeta?

**Sí**, sin afectar el funcionamiento de la app. Pero es útil conservar:
- `docs/documentos a enviar pendientes/` — tiene bugs pendientes del backend.
- `testing/bruno/` — colección de pruebas reutilizable.
- `analisis/endpoints_navitel_tms.xlsx` — referencia oficial del backend.
