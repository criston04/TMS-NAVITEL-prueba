# REPORTE: Documentación QUICK_REFERENCE vs Frontend real

Generado: 2026-05-03T16:06:50.499Z

Este reporte compara los endpoints documentados en los .docx (QUICK_REFERENCE) con los endpoints que realmente llama el código del frontend.


---

## BITACORA

### Endpoints documentados en QUICK_REFERENCE.docx (13)

- `GET /api/bitacora`
- `GET /api/bitacora/:id`
- `GET /api/bitacora/export`
- `GET /api/bitacora/stats`
- `GET /api/bitacora/summary/geofences`
- `GET /api/bitacora/summary/vehicles`
- `POST /api/bitacora`
- `POST /api/bitacora/:id/create-order`
- `PUT /api/bitacora/:id/assign-order`
- `PUT /api/bitacora/:id/complete`
- `PUT /api/bitacora/:id/dismiss`
- `PUT /api/bitacora/:id/notes`
- `PUT /api/bitacora/:id/review`

---

## DASHBOARD

### Endpoints documentados en QUICK_REFERENCE.docx (4)

- `GET /api/dashboard/shipments`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/vehicles/on-route`
- `GET /api/dashboard/vehicles/overview`

---

## FINANCE

### Endpoints documentados en QUICK_REFERENCE.docx (21)

- `GET /aging`
- `GET /cash-flow`
- `GET /costs`
- `GET /costs/by-order/:orderId`
- `GET /costs/by-vehicle/:vehicleId`
- `GET /customers/:id/summary`
- `GET /invoices`
- `GET /invoices/:id`
- `GET /payments`
- `GET /payments?invoiceId=:id`
- `GET /profitability`
- `GET /rates`
- `GET /rates/:id`
- `GET /rates/calculate`
- `GET /stats`
- `PATCH /invoices/:id/status`
- `POST /costs`
- `POST /costs/:id/approve`
- `POST /invoices`
- `POST /invoices/:id/send`
- `POST /payments`

---

## MAINTENANCE

### Endpoints documentados en QUICK_REFERENCE.docx (35)

- `DELETE /schedules/:id`
- `DELETE /vehicles/:id`
- `GET /alerts`
- `GET /breakdowns`
- `GET /inspections`
- `GET /inspections/:id/checklists`
- `GET /metrics`
- `GET /parts`
- `GET /parts/:id/transactions`
- `GET /schedules`
- `GET /settings`
- `GET /vehicles`
- `GET /vehicles/:id`
- `GET /vehicles/:id/history`
- `GET /work-orders`
- `GET /work-orders/:id`
- `GET /workshops`
- `PATCH /alerts/:id/dismiss`
- `PATCH /alerts/:id/read`
- `PATCH /vehicles/:id/mileage`
- `PATCH /work-orders/:id/complete`
- `POST /breakdowns`
- `POST /inspections`
- `POST /parts`
- `POST /schedules`
- `POST /vehicles`
- `POST /work-orders`
- `POST /workshops`
- `PUT /breakdowns/:id`
- `PUT /parts/:id`
- `PUT /schedules/:id`
- `PUT /settings`
- `PUT /vehicles/:id`
- `PUT /work-orders/:id`
- `PUT /workshops/:id`

---

## MASTER

### Endpoints documentados en QUICK_REFERENCE.docx (56)

- `DELETE /customers/:id`
- `DELETE /drivers/:id`
- `DELETE /geofences/:id`
- `DELETE /operators/:id`
- `DELETE /products/:id`
- `DELETE /vehicles/:id`
- `GET /customers`
- `GET /customers/:id`
- `GET /customers/cities`
- `GET /customers/export/csv`
- `GET /customers/find-by-document`
- `GET /customers/stats`
- `GET /drivers`
- `GET /drivers/:id`
- `GET /drivers/expiring-licenses`
- `GET /drivers/stats`
- `GET /geofences`
- `GET /geofences/containing-point`
- `GET /geofences/export/kml`
- `GET /geofences/stats`
- `GET /operators`
- `GET /operators/:id`
- `GET /operators/stats`
- `GET /products`
- `GET /products/:id`
- `GET /products/stats`
- `GET /vehicles`
- `GET /vehicles/:id`
- `GET /vehicles/expiring-documents`
- `GET /vehicles/needing-maintenance`
- `GET /vehicles/stats`
- `PATCH /geofences/batch-category`
- `PATCH /geofences/batch-color`
- `PATCH /products/:id/status`
- `POST /customers`
- `POST /customers/:id/toggle-status`
- `POST /customers/bulk-delete`
- `POST /customers/import`
- `POST /drivers`
- `POST /drivers/bulk-delete`
- `POST /geofences`
- `POST /geofences/:id/duplicate`
- `POST /geofences/bulk-delete`
- `POST /geofences/import/kml`
- `POST /geofences/toggle-status-batch`
- `POST /operators`
- `POST /products`
- `POST /products/:id/duplicate`
- `POST /vehicles`
- `POST /vehicles/bulk-delete`
- `PUT /customers/:id`
- `PUT /drivers/:id`
- `PUT /geofences/:id`
- `PUT /operators/:id`
- `PUT /products/:id`
- `PUT /vehicles/:id`

---

## MONITORING

### Endpoints documentados en QUICK_REFERENCE.docx (32)

- `DELETE /alert-rules/:id`
- `GET /alert-rules`
- `GET /alerts`
- `GET /geofence-events`
- `GET /geofence-events/:id`
- `GET /geofence-events/active`
- `GET /geofence-events/check/:vehicleId/:geofenceId`
- `GET /geofence-events/dwell-summary`
- `GET /geofence-events/stats`
- `GET /historical`
- `GET /historical/export`
- `GET /historical/vehicles`
- `GET /historical/vehicles/:vehicleId/date-range`
- `GET /retransmission`
- `GET /retransmission/:id`
- `GET /retransmission/companies`
- `GET /retransmission/gps-companies`
- `GET /retransmission/stats`
- `GET /tracking`
- `GET /tracking/:vehicleId`
- `GET /tracking/:vehicleId/order`
- `GET /tracking/:vehicleId/position`
- `GET /tracking/carriers`
- `PATCH /alert-rules/:id`
- `PATCH /alerts/:id/acknowledge`
- `PATCH /alerts/:id/resolve`
- `PATCH /geofence-events/:id`
- `PATCH /retransmission/:id/comment`
- `PATCH /retransmission/bulk-comments`
- `POST /alert-rules`
- `POST /geofence-events`
- `POST /geofence-events/record-exit`

---

## ORDERS

### Endpoints documentados en QUICK_REFERENCE.docx (12)

- `DELETE /:id`
- `GET /`
- `GET /:id`
- `GET /:id/workflow-progress`
- `GET /export`
- `PATCH /:id`
- `PATCH /:id/milestones/:milestoneId`
- `PATCH /:id/status`
- `POST /`
- `POST /:id/close`
- `POST /bulk-send`
- `POST /import`

---

## PLATFORM

### Endpoints documentados en QUICK_REFERENCE.docx (23)

- `DELETE /tenants/:id`
- `DELETE /tenants/:tenantId/fleet-groups/:groupId`
- `GET /activity`
- `GET /dashboard`
- `GET /tenants`
- `GET /tenants/:id`
- `GET /tenants/:tenantId/fleet-groups`
- `GET /tenants/:tenantId/modules`
- `GET /tenants/:tenantId/modules/:moduleCode/enabled`
- `GET /transfers`
- `POST /tenants`
- `POST /tenants/:id/reactivate`
- `POST /tenants/:id/suspend`
- `POST /tenants/:tenantId/fleet-groups`
- `POST /transfers`
- `POST /transfers/:id/approve`
- `POST /transfers/:id/execute`
- `POST /transfers/:id/reject`
- `POST /users/force-password-reset`
- `POST /users/master`
- `PUT /tenants/:id`
- `PUT /tenants/:tenantId/fleet-groups/:groupId`
- `PUT /tenants/:tenantId/modules`

---

## REPORTS

### Endpoints documentados en QUICK_REFERENCE.docx (23)

- `DELETE /api/reports/definitions/:id`
- `DELETE /api/reports/schedules/:id`
- `GET /api/reports/data/financial`
- `GET /api/reports/data/operational`
- `GET /api/reports/definitions`
- `GET /api/reports/definitions/:id`
- `GET /api/reports/definitions/categories`
- `GET /api/reports/generated`
- `GET /api/reports/generated/:id`
- `GET /api/reports/generated/:id/download`
- `GET /api/reports/generated/:id/status`
- `GET /api/reports/schedules`
- `GET /api/reports/schedules/:id`
- `GET /api/reports/templates`
- `GET /api/reports/templates/:id`
- `GET /api/reports/usage-stats`
- `PATCH /api/reports/schedules/:id/toggle`
- `POST /api/reports/definitions`
- `POST /api/reports/generate`
- `POST /api/reports/schedules`
- `POST /api/reports/schedules/:id/run`
- `PUT /api/reports/definitions/:id`
- `PUT /api/reports/schedules/:id`

---

## ROUTE_PLANNER

### Endpoints documentados en QUICK_REFERENCE.docx (22)

- `DELETE /routes/:id`
- `GET /depots`
- `GET /drivers?status=available`
- `GET /route-templates`
- `GET /routes`
- `GET /routes/:id`
- `GET /routes/:id/calculate`
- `GET /routing/geocode`
- `GET /vehicles?status=available`
- `GET /whatif-scenarios`
- `PATCH /routes/:id/assign`
- `PATCH /routes/:id/confirm`
- `PATCH /routes/:id/dispatch`
- `PATCH /routes/:id/reset`
- `PATCH /routes/:id/revoke`
- `PATCH /routes/:id/stops/reorder`
- `POST /route-templates`
- `POST /routes/confirm-all`
- `POST /routes/manual`
- `POST /routing/calculate`
- `POST /routing/optimize`
- `POST /whatif-scenarios`

---

## SCHEDULING

### Endpoints documentados en QUICK_REFERENCE.docx (22)

- `DELETE /block-day/:id`
- `GET /audit-logs`
- `GET /blocked-days`
- `GET /calendar`
- `GET /conflicts`
- `GET /export`
- `GET /gantt`
- `GET /kpis`
- `GET /notifications`
- `GET /orders`
- `GET /suggestions/:orderId`
- `GET /timeline`
- `POST /assign`
- `POST /auto-schedule`
- `POST /block-day`
- `POST /bulk-assign`
- `POST /detect-conflicts`
- `POST /reassign`
- `POST /reschedule`
- `POST /resolve-conflict`
- `POST /unschedule`
- `POST /validate-hos`

---

## SETTINGS

### Endpoints documentados en QUICK_REFERENCE.docx (22)

- `DELETE /api/settings/roles/:id`
- `GET /api/settings`
- `GET /api/settings/:category`
- `GET /api/settings/audit`
- `GET /api/settings/audit/export`
- `GET /api/settings/export`
- `GET /api/settings/integrations`
- `GET /api/settings/integrations/:id`
- `GET /api/settings/integrations/health`
- `GET /api/settings/overview`
- `GET /api/settings/roles`
- `GET /api/settings/roles/:id`
- `PATCH /api/settings/integrations/:id/toggle`
- `POST /api/settings/:category/reset`
- `POST /api/settings/import`
- `POST /api/settings/integrations`
- `POST /api/settings/integrations/:id/sync`
- `POST /api/settings/integrations/:id/test`
- `POST /api/settings/roles`
- `PUT /api/settings`
- `PUT /api/settings/integrations/:id`
- `PUT /api/settings/roles/:id`

---

## WORKFLOWS

### Endpoints documentados en QUICK_REFERENCE.docx (18)

- `DELETE /api/workflows/:id`
- `GET /api/orders/:orderId/workflow-progress`
- `GET /api/workflows`
- `GET /api/workflows/:id`
- `GET /api/workflows/:id/schedule-duration`
- `GET /api/workflows/:id/validate-geofences`
- `GET /api/workflows/active`
- `GET /api/workflows/available-customers`
- `GET /api/workflows/available-geofences`
- `GET /api/workflows/default`
- `GET /api/workflows/geofences-by-category/:category`
- `GET /api/workflows/suggest`
- `PATCH /api/workflows/:id/status`
- `POST /api/workflows`
- `POST /api/workflows/:id/apply`
- `POST /api/workflows/:id/duplicate`
- `POST /api/workflows/:id/validate-for-schedule`
- `PUT /api/workflows/:id`

---

## Frontend — endpoints que usa apiClient (deduplicados)

Total: 0 paths únicos

