# Endpoints documentados en QUICK_REFERENCE (otros docs)

Generado: 2026-05-03T16:07:18.094Z


## BITACORA — 13 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/api/bitacora` | Listar registros con filtros |
| E-02 | GET | `/api/bitacora/:id` | Obtener detalle de un evento |
| E-03 | POST | `/api/bitacora` | Crear registro de evento |
| E-04 | PUT | `/api/bitacora/:id/review` | Marcar evento como revisado |
| E-05 | PUT | `/api/bitacora/:id/dismiss` | Descartar evento |
| E-06 | PUT | `/api/bitacora/:id/notes` | Agregar/actualizar notas |
| E-07 | PUT | `/api/bitacora/:id/assign-order` | Vincular evento a orden existente |
| E-08 | POST | `/api/bitacora/:id/create-order` | Crear orden desde evento |
| E-09 | PUT | `/api/bitacora/:id/complete` | Completar evento (cierre temporal) |
| E-10 | GET | `/api/bitacora/stats` | Obtener estadisticas generales |
| E-11 | GET | `/api/bitacora/summary/vehicles` | Resumen agrupado por vehiculo |
| E-12 | GET | `/api/bitacora/summary/geofences` | Resumen agrupado por geocerca |
| E-13 | GET | `/api/bitacora/export` | Exportar registros |

## DASHBOARD — 4 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/api/dashboard/stats` | Obtener 12 KPIs + trends + sparklines |
| E-02 | GET | `/api/dashboard/vehicles/overview` | Distribucion de flota por estado |
| E-03 | GET | `/api/dashboard/shipments` | Historico de envios por mes |
| E-04 | GET | `/api/dashboard/vehicles/on-route` | Vehiculos actualmente en ruta |

## FINANCE — 21 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/invoices` | Listar facturas con filtros y paginacion |
| E-02 | GET | `/invoices/:id` | Obtener factura por ID |
| E-03 | POST | `/invoices` | Crear nueva factura |
| E-04 | PATCH | `/invoices/:id/status` | Actualizar estado de factura |
| E-05 | POST | `/invoices/:id/send` | Enviar factura al cliente |
| E-06 | GET | `/payments` | Listar pagos con filtros |
| E-07 | POST | `/payments` | Registrar pago |
| E-08 | GET | `/payments?invoiceId=:id` | Pagos de una factura |
| E-09 | GET | `/costs` | Listar costos con filtros |
| E-10 | POST | `/costs` | Registrar costo |
| E-11 | POST | `/costs/:id/approve` | Aprobar costo |
| E-12 | GET | `/costs/by-order/:orderId` | Costos de una orden |
| E-13 | GET | `/costs/by-vehicle/:vehicleId` | Costos de un vehiculo |
| E-14 | GET | `/rates` | Listar tarifas |
| E-15 | GET | `/rates/:id` | Obtener tarifa por ID |
| E-16 | GET | `/rates/calculate` | Calcular tarifa para ruta |
| E-17 | GET | `/stats` | Estadisticas financieras |
| E-18 | GET | `/customers/:id/summary` | Resumen financiero de cliente |
| E-19 | GET | `/aging` | Cuentas por cobrar aging |
| E-20 | GET | `/profitability` | Analisis de rentabilidad |
| E-21 | GET | `/cash-flow` | Flujo de caja |

## MAINTENANCE — 35 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/vehicles` | Listar vehiculos de la flota |
| E-02 | GET | `/vehicles/:id` | Obtener detalle de vehiculo |
| E-03 | POST | `/vehicles` | Registrar nuevo vehiculo |
| E-04 | PUT | `/vehicles/:id` | Actualizar vehiculo |
| E-05 | DELETE | `/vehicles/:id` | Eliminar vehiculo |
| E-06 | PATCH | `/vehicles/:id/mileage` | Actualizar kilometraje |
| E-07 | GET | `/schedules` | Listar programaciones |
| E-08 | POST | `/schedules` | Crear programacion preventiva |
| E-09 | PUT | `/schedules/:id` | Actualizar programacion |
| E-10 | DELETE | `/schedules/:id` | Eliminar programacion |
| E-11 | GET | `/breakdowns` | Listar averias |
| E-12 | POST | `/breakdowns` | Reportar averia |
| E-13 | PUT | `/breakdowns/:id` | Actualizar averia (diagnosticar, reparar, resolver) |
| E-14 | GET | `/work-orders` | Listar ordenes de trabajo |
| E-15 | GET | `/work-orders/:id` | Obtener detalle de orden |
| E-16 | POST | `/work-orders` | Crear orden de trabajo |
| E-17 | PUT | `/work-orders/:id` | Actualizar orden de trabajo |
| E-18 | PATCH | `/work-orders/:id/complete` | Completar orden de trabajo |
| E-19 | GET | `/workshops` | Listar talleres |
| E-20 | POST | `/workshops` | Crear taller |
| E-21 | PUT | `/workshops/:id` | Actualizar taller |
| E-22 | GET | `/parts` | Listar repuestos |
| E-23 | POST | `/parts` | Registrar repuesto |
| E-24 | PUT | `/parts/:id` | Actualizar repuesto |
| E-25 | GET | `/parts/:id/transactions` | Listar transacciones de repuesto |
| E-26 | GET | `/inspections` | Listar inspecciones |
| E-27 | POST | `/inspections` | Crear inspeccion |
| E-28 | GET | `/inspections/:id/checklists` | Obtener checklist de inspeccion |
| E-29 | GET | `/alerts` | Listar alertas |
| E-30 | PATCH | `/alerts/:id/read` | Marcar alerta como leida |
| E-31 | PATCH | `/alerts/:id/dismiss` | Descartar alerta |
| E-32 | GET | `/metrics` | Obtener metricas de mantenimiento |
| E-33 | GET | `/vehicles/:id/history` | Obtener historial de vehiculo |
| E-34 | GET | `/settings` | Obtener configuracion del modulo |
| E-35 | PUT | `/settings` | Actualizar configuracion |

## MASTER — 56 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/customers` | Listar clientes paginados con filtros |
| E-02 | GET | `/customers/:id` | Obtener cliente por ID |
| E-03 | POST | `/customers` | Crear cliente |
| E-04 | PUT | `/customers/:id` | Actualizar cliente |
| E-05 | DELETE | `/customers/:id` | Eliminar cliente (soft delete) |
| E-06 | POST | `/customers/bulk-delete` | Eliminar clientes masivo |
| E-07 | POST | `/customers/:id/toggle-status` | Cambiar estado activo/inactivo |
| E-08 | GET | `/customers/stats` | Obtener estadisticas de clientes |
| E-09 | GET | `/customers/find-by-document` | Buscar cliente por documento |
| E-10 | POST | `/customers/import` | Importar clientes desde CSV |
| E-11 | GET | `/customers/export/csv` | Exportar clientes a CSV |
| E-12 | GET | `/customers/cities` | Ciudades disponibles para filtro |
| E-13 | GET | `/drivers` | Listar conductores paginados |
| E-14 | GET | `/drivers/:id` | Obtener conductor por ID |
| E-15 | POST | `/drivers` | Crear conductor |
| E-16 | PUT | `/drivers/:id` | Actualizar conductor |
| E-17 | DELETE | `/drivers/:id` | Eliminar conductor (soft delete) |
| E-18 | POST | `/drivers/bulk-delete` | Eliminar conductores masivo |
| E-19 | GET | `/drivers/stats` | Obtener estadisticas de conductores |
| E-20 | GET | `/drivers/expiring-licenses` | Licencias proximas a vencer |
| E-21 | GET | `/vehicles` | Listar vehiculos paginados |
| E-22 | GET | `/vehicles/:id` | Obtener vehiculo por ID |
| E-23 | POST | `/vehicles` | Crear vehiculo |
| E-24 | PUT | `/vehicles/:id` | Actualizar vehiculo |
| E-25 | DELETE | `/vehicles/:id` | Eliminar vehiculo (soft delete) |
| E-26 | POST | `/vehicles/bulk-delete` | Eliminar vehiculos masivo |
| E-27 | GET | `/vehicles/stats` | Obtener estadisticas de vehiculos |
| E-28 | GET | `/vehicles/expiring-documents` | Documentos vehiculares por vencer |
| E-29 | GET | `/vehicles/needing-maintenance` | Vehiculos con mantenimiento pendiente |
| E-30 | GET | `/operators` | Listar operadores |
| E-31 | GET | `/operators/:id` | Obtener operador por ID |
| E-32 | POST | `/operators` | Crear operador |
| E-33 | PUT | `/operators/:id` | Actualizar operador |
| E-34 | DELETE | `/operators/:id` | Eliminar operador (soft delete) |
| E-35 | GET | `/operators/stats` | Obtener estadisticas |
| E-36 | GET | `/products` | Listar productos |
| E-37 | GET | `/products/:id` | Obtener producto por ID |
| E-38 | POST | `/products` | Crear producto |
| E-39 | PUT | `/products/:id` | Actualizar producto |
| E-40 | DELETE | `/products/:id` | Eliminar producto (soft delete) |
| E-41 | POST | `/products/:id/duplicate` | Duplicar producto |
| E-42 | PATCH | `/products/:id/status` | Cambiar estado |
| E-43 | GET | `/products/stats` | Obtener estadisticas |
| E-44 | GET | `/geofences` | Listar geocercas con filtros |
| E-45 | POST | `/geofences` | Crear geocerca |
| E-46 | PUT | `/geofences/:id` | Actualizar geocerca |
| E-47 | DELETE | `/geofences/:id` | Eliminar geocerca (soft delete) |
| E-48 | POST | `/geofences/bulk-delete` | Eliminar geocercas masivo |
| E-49 | POST | `/geofences/:id/duplicate` | Duplicar geocerca |
| E-50 | PATCH | `/geofences/batch-color` | Actualizar color masivo |
| E-51 | PATCH | `/geofences/batch-category` | Actualizar categoria masivo |
| E-52 | POST | `/geofences/toggle-status-batch` | Cambiar estado masivo |
| E-53 | GET | `/geofences/export/kml` | Exportar a KML |
| E-54 | POST | `/geofences/import/kml` | Importar desde KML |
| E-55 | GET | `/geofences/stats` | Obtener estadisticas |
| E-56 | GET | `/geofences/containing-point` | Geocercas que contienen un punto |

## MONITORING — 32 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/tracking` | Listar vehiculos rastreados con filtros |
| E-02 | GET | `/tracking/:vehicleId` | Obtener vehiculo rastreado individual |
| E-03 | GET | `/tracking/:vehicleId/position` | Obtener solo posicion actual |
| E-04 | GET | `/tracking/:vehicleId/order` | Obtener orden activa del vehiculo |
| E-05 | GET | `/tracking/carriers` | Listar operadores/transportistas unicos |
| E-06 | GET | `/alerts` | Listar alertas con filtros y paginacion |
| E-07 | PATCH | `/alerts/:id/acknowledge` | Reconocer alerta |
| E-08 | PATCH | `/alerts/:id/resolve` | Resolver alerta |
| E-09 | GET | `/alert-rules` | Listar reglas de alerta del tenant |
| E-10 | POST | `/alert-rules` | Crear nueva regla |
| E-11 | PATCH | `/alert-rules/:id` | Actualizar regla (parcial, incluye enable/disable) |
| E-12 | DELETE | `/alert-rules/:id` | Eliminar regla |
| E-13 | GET | `/historical` | Consultar ruta historica |
| E-14 | GET | `/historical/export` | Exportar ruta historica |
| E-15 | GET | `/historical/vehicles` | Listar vehiculos con datos historicos disponibles |
| E-16 | GET | `/historical/vehicles/:vehicleId/date-range` | Rango de fechas disponible para vehiculo |
| E-17 | GET | `/retransmission` | Listar registros de retransmision con filtros |
| E-18 | GET | `/retransmission/:id` | Obtener registro individual |
| E-19 | GET | `/retransmission/stats` | Obtener estadisticas de retransmision |
| E-20 | PATCH | `/retransmission/:id/comment` | Actualizar comentario |
| E-21 | PATCH | `/retransmission/bulk-comments` | Actualizar comentarios masivo |
| E-22 | GET | `/retransmission/gps-companies` | Listar proveedores GPS |
| E-23 | GET | `/retransmission/companies` | Listar operadores unicos |
| E-24 | GET | `/geofence-events` | Listar eventos con filtros y paginacion |
| E-25 | GET | `/geofence-events/:id` | Obtener evento individual |
| E-26 | POST | `/geofence-events` | Registrar evento de geocerca |
| E-27 | PATCH | `/geofence-events/:id` | Actualizar evento (completar, cancelar) |
| E-28 | POST | `/geofence-events/record-exit` | Registrar salida de vehiculo |
| E-29 | GET | `/geofence-events/dwell-summary` | Resumen de permanencia por geocerca/vehiculo |
| E-30 | GET | `/geofence-events/stats` | Estadisticas de eventos de geocerca |
| E-31 | GET | `/geofence-events/active` | Eventos activos (vehiculos actualmente en geocercas) |
| E-32 | GET | `/geofence-events/check/:vehicleId/:geofenceId` | Verificar si vehiculo esta en geocerca |

## ORDERS — 12 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/` | Listar ordenes con paginacion y filtros |
| E-02 | GET | `/:id` | Obtener detalle completo |
| E-03 | POST | `/` | Crear nueva orden |
| E-04 | PATCH | `/:id` | Actualizar orden existente (parcial) |
| E-05 | DELETE | `/:id` | Eliminar orden (solo draft) |
| E-06 | PATCH | `/:id/status` | Transicionar estado |
| E-07 | POST | `/:id/close` | Cerrar orden |
| E-08 | POST | `/import` | Importacion masiva Excel/CSV |
| E-09 | GET | `/export` | Exportar a Excel |
| E-10 | POST | `/bulk-send` | Envio masivo a GPS |
| E-11 | GET | `/:id/workflow-progress` | Progreso del workflow |
| E-12 | PATCH | `/:id/milestones/:milestoneId` | Registro manual de hito |

## PLATFORM — 23 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/tenants` | Listar tenants paginados con filtros |
| E-02 | GET | `/tenants/:id` | Obtener tenant por ID |
| E-03 | POST | `/tenants` | Crear tenant |
| E-04 | PUT | `/tenants/:id` | Actualizar tenant |
| E-05 | POST | `/tenants/:id/suspend` | Suspender tenant |
| E-06 | POST | `/tenants/:id/reactivate` | Reactivar tenant |
| E-07 | DELETE | `/tenants/:id` | Cancelar/eliminar tenant |
| E-08 | GET | `/tenants/:tenantId/modules` | Obtener modulos de un tenant |
| E-09 | PUT | `/tenants/:tenantId/modules` | Activar/desactivar modulos |
| E-10 | GET | `/tenants/:tenantId/modules/:moduleCode/enabled` | Verificar si modulo esta habilitado |
| E-11 | POST | `/users/master` | Crear usuario maestro |
| E-12 | POST | `/users/force-password-reset` | Forzar reset de contrasena |
| E-13 | GET | `/transfers` | Listar transferencias paginadas |
| E-14 | POST | `/transfers` | Crear solicitud de transferencia |
| E-15 | POST | `/transfers/:id/approve` | Aprobar transferencia |
| E-16 | POST | `/transfers/:id/execute` | Ejecutar transferencia |
| E-17 | POST | `/transfers/:id/reject` | Rechazar transferencia |
| E-18 | GET | `/dashboard` | Obtener dashboard de plataforma |
| E-19 | GET | `/activity` | Listar log de actividad paginado |
| E-20 | GET | `/tenants/:tenantId/fleet-groups` | Listar grupos de flota de un tenant |
| E-21 | POST | `/tenants/:tenantId/fleet-groups` | Crear grupo de flota |
| E-22 | PUT | `/tenants/:tenantId/fleet-groups/:groupId` | Actualizar grupo |
| E-23 | DELETE | `/tenants/:tenantId/fleet-groups/:groupId` | Eliminar grupo |

## REPORTS — 23 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/api/reports/definitions` | Listar definiciones |
| E-02 | GET | `/api/reports/definitions/:id` | Obtener definicion por ID |
| E-03 | POST | `/api/reports/definitions` | Crear definicion |
| E-04 | PUT | `/api/reports/definitions/:id` | Actualizar definicion |
| E-05 | DELETE | `/api/reports/definitions/:id` | Eliminar definicion |
| E-06 | GET | `/api/reports/definitions/categories` | Listar categorias |
| E-07 | GET | `/api/reports/templates` | Listar plantillas |
| E-08 | GET | `/api/reports/templates/:id` | Obtener plantilla por ID |
| E-09 | POST | `/api/reports/generate` | Generar reporte |
| E-10 | GET | `/api/reports/generated` | Listar reportes generados |
| E-11 | GET | `/api/reports/generated/:id` | Obtener reporte por ID |
| E-12 | GET | `/api/reports/generated/:id/status` | Consultar estado |
| E-13 | GET | `/api/reports/generated/:id/download` | Descargar reporte |
| E-14 | GET | `/api/reports/schedules` | Listar programaciones |
| E-15 | GET | `/api/reports/schedules/:id` | Obtener programacion |
| E-16 | POST | `/api/reports/schedules` | Crear programacion |
| E-17 | PUT | `/api/reports/schedules/:id` | Actualizar programacion |
| E-18 | PATCH | `/api/reports/schedules/:id/toggle` | Activar/desactivar |
| E-19 | DELETE | `/api/reports/schedules/:id` | Eliminar programacion |
| E-20 | POST | `/api/reports/schedules/:id/run` | Ejecutar ahora |
| E-21 | GET | `/api/reports/data/operational` | Datos operacionales |
| E-22 | GET | `/api/reports/data/financial` | Datos financieros |
| E-23 | GET | `/api/reports/usage-stats` | Estadisticas de uso |

## ROUTE_PLANNER — 22 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | POST | `/routing/optimize` | Generar rutas optimizadas multi-ruta |
| E-02 | POST | `/routing/calculate` | Calcular ruta punto a punto (OSRM) |
| E-03 | GET | `/routing/geocode` | Geocodificacion de direccion |
| E-04 | GET | `/routes` | Listar rutas con paginacion y filtros |
| E-05 | GET | `/routes/:id` | Obtener detalle de una ruta |
| E-06 | POST | `/routes/manual` | Crear ruta manual |
| E-07 | PATCH | `/routes/:id/assign` | Asignar vehiculo/conductor |
| E-08 | PATCH | `/routes/:id/stops/reorder` | Reordenar paradas |
| E-09 | PATCH | `/routes/:id/confirm` | Confirmar ruta individual |
| E-10 | POST | `/routes/confirm-all` | Confirmar todas las rutas |
| E-11 | PATCH | `/routes/:id/dispatch` | Despachar ruta |
| E-12 | PATCH | `/routes/:id/reset` | Resetear ruta a draft |
| E-13 | PATCH | `/routes/:id/revoke` | Revocar confirmacion |
| E-14 | DELETE | `/routes/:id` | Eliminar ruta (solo draft/generated) |
| E-15 | GET | `/routes/:id/calculate` | Recalcular metricas y polyline |
| E-16 | GET | `/depots` | Listar depositos del tenant |
| E-17 | GET | `/vehicles?status=available` | Listar vehiculos disponibles |
| E-18 | GET | `/drivers?status=available` | Listar conductores disponibles |
| E-19 | GET | `/route-templates` | Listar plantillas de ruta |
| E-20 | POST | `/route-templates` | Crear plantilla |
| E-21 | POST | `/whatif-scenarios` | Crear escenario what-if |
| E-22 | GET | `/whatif-scenarios` | Listar escenarios |

## SCHEDULING — 22 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/orders` | Listar ordenes programables con filtros |
| E-02 | POST | `/assign` | Programar orden (asignar recursos) |
| E-03 | POST | `/unschedule` | Desprogramar orden |
| E-04 | POST | `/reassign` | Reasignar recursos a orden programada |
| E-05 | POST | `/bulk-assign` | Asignacion masiva |
| E-06 | GET | `/calendar` | Vista de calendario mensual |
| E-07 | GET | `/timeline` | Vista linea de tiempo por dia |
| E-08 | GET | `/conflicts` | Listar conflictos activos |
| E-09 | POST | `/resolve-conflict` | Resolver conflicto |
| E-10 | GET | `/suggestions/:orderId` | Obtener sugerencias de recursos |
| E-11 | POST | `/validate-hos` | Validar horas de servicio |
| E-12 | GET | `/kpis` | KPIs de programacion |
| E-13 | POST | `/block-day` | Bloquear dia |
| E-14 | DELETE | `/block-day/:id` | Desbloquear dia |
| E-15 | GET | `/blocked-days` | Listar dias bloqueados |
| E-16 | POST | `/auto-schedule` | Auto-programacion |
| E-17 | GET | `/gantt` | Vista Gantt multi-dia |
| E-18 | GET | `/audit-logs` | Historial de auditoria |
| E-19 | GET | `/export` | Exportar programacion a CSV/XLSX |
| E-20 | POST | `/detect-conflicts` | Detectar conflictos (pre-validacion) |
| E-21 | POST | `/reschedule` | Reprogramar orden a otra fecha/hora |
| E-22 | GET | `/notifications` | Listar notificaciones del modulo |

## SETTINGS — 22 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/api/settings` | Obtener toda la configuracion |
| E-02 | GET | `/api/settings/:category` | Obtener configuracion por categoria |
| E-03 | PUT | `/api/settings` | Actualizar configuracion |
| E-04 | POST | `/api/settings/:category/reset` | Restablecer a valores por defecto |
| E-05 | GET | `/api/settings/export` | Exportar toda la configuracion |
| E-06 | POST | `/api/settings/import` | Importar configuracion |
| E-07 | GET | `/api/settings/overview` | Resumen de configuracion |
| E-08 | GET | `/api/settings/roles` | Listar roles |
| E-09 | GET | `/api/settings/roles/:id` | Obtener rol por ID |
| E-10 | POST | `/api/settings/roles` | Crear rol |
| E-11 | PUT | `/api/settings/roles/:id` | Actualizar rol |
| E-12 | DELETE | `/api/settings/roles/:id` | Eliminar rol |
| E-13 | GET | `/api/settings/integrations` | Listar integraciones |
| E-14 | GET | `/api/settings/integrations/:id` | Obtener integracion |
| E-15 | POST | `/api/settings/integrations` | Crear integracion |
| E-16 | PUT | `/api/settings/integrations/:id` | Actualizar integracion |
| E-17 | PATCH | `/api/settings/integrations/:id/toggle` | Activar/desactivar |
| E-18 | POST | `/api/settings/integrations/:id/test` | Probar conexion |
| E-19 | POST | `/api/settings/integrations/:id/sync` | Sincronizar |
| E-20 | GET | `/api/settings/integrations/health` | Salud de integraciones |
| E-21 | GET | `/api/settings/audit` | Consultar auditoria |
| E-22 | GET | `/api/settings/audit/export` | Exportar auditoria |

## WORKFLOWS — 18 endpoints

| # | Método | Path | Descripción |
|---|---|---|---|
| E-01 | GET | `/api/workflows` | Listar workflows |
| E-02 | GET | `/api/workflows/:id` | Obtener workflow por ID |
| E-03 | GET | `/api/workflows/default` | Obtener workflow por defecto |
| E-04 | GET | `/api/workflows/active` | Listar workflows activos |
| E-05 | POST | `/api/workflows` | Crear workflow |
| E-06 | PUT | `/api/workflows/:id` | Actualizar workflow |
| E-07 | DELETE | `/api/workflows/:id` | Eliminar workflow |
| E-08 | PATCH | `/api/workflows/:id/status` | Cambiar estado |
| E-09 | POST | `/api/workflows/:id/duplicate` | Duplicar workflow |
| E-10 | POST | `/api/workflows/:id/apply` | Aplicar a orden |
| E-11 | GET | `/api/orders/:orderId/workflow-progress` | Progreso de orden |
| E-12 | GET | `/api/workflows/suggest` | Sugerir workflow |
| E-13 | GET | `/api/workflows/:id/schedule-duration` | Calcular duracion |
| E-14 | POST | `/api/workflows/:id/validate-for-schedule` | Validar para programacion |
| E-15 | GET | `/api/workflows/:id/validate-geofences` | Validar geocercas |
| E-16 | GET | `/api/workflows/available-geofences` | Geocercas disponibles |
| E-17 | GET | `/api/workflows/geofences-by-category/:category` | Geocercas por categoria |
| E-18 | GET | `/api/workflows/available-customers` | Clientes disponibles |


---

## Totales

- 13 docs analizados
- 303 endpoints documentados (cross-doc)
