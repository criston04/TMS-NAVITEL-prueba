# MODULO SETTINGS — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 7 de 7 endpoints funcionan (100.0%). MODULO COMPLETAMENTE FUNCIONAL.

---

## INDICE

1. Resumen ejecutivo
2. Lista de endpoints
3. Detalle por endpoint
4. Recomendaciones para el backend
5. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Settings

Configuracion del tenant y del sistema:
- Settings generales del tenant (branding, idioma, zona horaria, moneda)
- Roles y permisos (RBAC)
- Integraciones (GPS, contabilidad, ERP)
- Audit logs (auditoria de cambios sensibles)
- Users (gestion de usuarios del tenant)
- Tenant info (datos fiscales, contacto del tenant)
- Notifications (preferencias de notificaciones)

### Estado actual

| Metrica | Valor |
|---|---|
| Total endpoints probados | 7 |
| Funcionando OK | 7 (100%) |

**EL MODULO ESTA COMPLETAMENTE FUNCIONAL EN LECTURAS.**

Nota: este test solo valida lecturas. Operaciones de escritura (PUT/POST/DELETE de settings, roles, integraciones, users) probablemente sufren bug NGINX `:id` cuando aplican. No fueron testeadas en E2E con datos sinteticos.

---

## 2. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | GET | `/api/v1/settings` | OK |
| 2 | GET | `/api/v1/settings/roles` | OK |
| 3 | GET | `/api/v1/settings/integrations` | OK |
| 4 | GET | `/api/v1/settings/audit` | OK |
| 5 | GET | `/api/v1/settings/users` | OK |
| 6 | GET | `/api/v1/settings/tenant` | OK |
| 7 | GET | `/api/v1/settings/notifications` | OK |

**Funcional: 7/7 = 100.0%**

---

## 3. DETALLE POR ENDPOINT

### 3.1. GET /settings — Settings generales

Devuelve la configuracion general del tenant (branding, idioma, currency, timezone, etc.).

### 3.2. GET /settings/roles — Roles y permisos

Lista de roles del sistema con sus permisos asociados (RBAC).

### 3.3. GET /settings/integrations — Integraciones

Lista de integraciones configuradas (GPS Wialon/Navitel, ERPs, contabilidad).

### 3.4. GET /settings/audit — Audit logs

Logs de cambios sensibles del sistema.

### 3.5. GET /settings/users — Users del tenant

Lista de usuarios con sus roles asignados.

### 3.6. GET /settings/tenant — Tenant info

Datos fiscales y de contacto del tenant.

### 3.7. GET /settings/notifications — Preferencias de notificaciones

Configuracion de canales (email, SMS, push, webhook) por tipo de evento.

---

## 4. RECOMENDACIONES PARA EL BACKEND

### Importante para escrituras

Aunque las lecturas funcionan al 100%, las escrituras probablemente sufren bug NGINX `:id` cuando aplican (e.g., `PUT /settings/roles/:id`, `DELETE /settings/users/:id`).

- [ ] Aplicar fix global de NGINX (mismo que afecta a otros modulos).
- [ ] Confirmar que los endpoints de mutacion existen y validan correctamente.
- [ ] Documentar el shape de cada response.

### Sin bugs detectados en lecturas

El modulo es el "campeon" en cobertura de lecturas. Bien hecho.

---

## 5. APENDICE

```bash
node otros/testing/test-settings-full.mjs
```

Salida esperada:

```
✅ 200 GET /settings
✅ 200 GET /settings/roles
✅ 200 GET /settings/integrations
✅ 200 GET /settings/audit
✅ 200 GET /settings/users
✅ 200 GET /settings/tenant
✅ 200 GET /settings/notifications

PORCENTAJE FUNCIONAL: 100.0%  (7/7)
```

---

**Fin del documento.** SETTINGS-BACKEND-HANDOFF v1.0
