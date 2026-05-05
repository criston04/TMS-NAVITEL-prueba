# MODULO AUTH — Documento para el Equipo Backend

**Version:** 1.0
**Fecha:** 2026-05-03
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Estado:** 4 de 6 endpoints/casos funcionan (66.7%). 1 endpoint inexistente (`/auth/me`) y 1 bug de manejo de errores (500 en lugar de 400/422).

---

## INDICE

1. Resumen ejecutivo
2. Bugs detectados
3. Lista de endpoints
4. Detalle por endpoint
5. Cambios en el frontend
6. Checklist para el backend
7. Apendice

---

## 1. RESUMEN EJECUTIVO

### Que hace el modulo Auth

Autenticacion y manejo de sesion del sistema:
- Login con username y password (devuelve accessToken + refreshToken)
- Logout (invalida tokens)
- Refresh (renueva accessToken usando refreshToken)
- Me (obtiene info del usuario actual desde el token)

### Estado actual

| Metrica | Valor |
|---|---|
| Casos probados | 6 |
| Funcionando OK | 4 (66.7%) |
| Endpoints faltantes | 1 (`/auth/me`) |
| Bugs de manejo de errores | 1 (500 en lugar de 400) |

### Endpoints OPERATIVOS (3 de 4)

| Metodo | Endpoint | Estado |
|---|---|---|
| POST | `/auth/login` | OK |
| POST | `/auth/refresh` | OK |
| POST | `/auth/logout` | OK |

Adicional: el rechazo de credenciales invalidas devuelve 401 correctamente. Bien hecho.

### Endpoints con problemas (2)

| Endpoint | Status | Causa |
|---|---|---|
| GET `/auth/me` | 404 | NO IMPLEMENTADO |
| POST `/auth/login` sin body | 500 | Bug — deberia ser 400 con mensaje de validacion |

---

## 2. BUGS DETECTADOS

### 2.1. `/auth/me` no existe (404)

**Caso de uso:** El frontend, al cargar la app despues de un refresh de pagina, llama `GET /auth/me` para obtener los datos del usuario actual (nombre, email, rol, tenantId, permisos) sin tener que volver a hacer login. El JWT se decodea client-side para obtener el id, pero `/auth/me` deberia devolver el objeto User completo con relaciones.

**Workaround actual del frontend:** decodea el JWT con `jwt-decode` y rellena lo basico (id, username, role). Los datos completos (nombre, foto, permisos) no estan disponibles hasta que el usuario navegue a `/settings`.

**Sugerencia:** implementar `GET /auth/me` que devuelva:

```json
{
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@gruponavitel.com",
    "firstName": "Admin",
    "lastName": "Sistema",
    "role": "admin",
    "tenantId": "uuid",
    "permissions": ["users:read", "vehicles:write", ...],
    "avatar": "https://..."
  }
}
```

### 2.2. POST /auth/login sin body devuelve 500 (deberia ser 400)

**Caso de uso:** Cuando el cliente envia un POST a `/auth/login` con body vacio (`{}`), el backend devuelve `500 Internal Server Error` en lugar de `400 Bad Request` con mensaje claro.

**Por que es problema:**
- 500 significa error del servidor (responsabilidad del backend).
- 400 significa error del cliente (envio mal el payload).
- Confunde al frontend en el manejo de errores. El frontend espera 400/422 para errores de validacion y muestra mensaje claro al usuario; con 500 muestra "Error interno, contacte al administrador".

**Sugerencia:** validar el body con un schema (Zod, Joi, class-validator) antes de procesarlo. Si falta `username` o `password`, devolver:

```json
{
  "code": 400,
  "message": "Validation error",
  "errors": [
    {"field": "username", "message": "username is required"},
    {"field": "password", "message": "password is required"}
  ]
}
```

### 2.3. (No es bug) Credenciales invalidas devuelven 401 correctamente

Cuando se envia `username` o `password` incorrectos, devuelve 401. Bien.

---

## 3. LISTA DE ENDPOINTS

| # | Metodo | Endpoint | Estado |
|---|---|---|:---:|
| 1 | POST | `/auth/login` (credenciales OK) | OK 200 |
| 2 | POST | `/auth/login` (credenciales invalidas) | 401 (correcto) |
| 3 | POST | `/auth/login` (sin body) | 500 BUG (espera 400) |
| 4 | GET | `/auth/me` | 404 NO IMPLEMENTADO |
| 5 | POST | `/auth/refresh` | OK 200 |
| 6 | POST | `/auth/logout` | OK 200 |

**Funcional: 4/6 = 66.7%**

---

## 4. DETALLE POR ENDPOINT

### 4.1. POST /auth/login (OK)

**Request body:**

```json
{"username": "admin", "password": "Admin1432!"}
```

**Response (200):**

```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "uuid",
      "username": "admin",
      "tenantId": "uuid"
    }
  }
}
```

**Reglas:**
- Validar shape del body (BUG actual: devuelve 500 si vacio).
- Si credenciales invalidas: 401 con mensaje generico ("Invalid credentials") — NO especificar si fallo username o password (seguridad).
- Si usuario bloqueado: 403 con mensaje claro.
- Auditar intento de login (exitoso o fallido) en `auth_audit_log`.

### 4.2. POST /auth/refresh (OK)

**Body:** `{refreshToken: "..."}` (o leer de cookie httpOnly).

**Response:** mismo shape que /login pero con tokens nuevos.

**Reglas:**
- Si refreshToken expirado o invalido: 401.
- Rotar refreshToken: invalidar el anterior, devolver uno nuevo.

### 4.3. POST /auth/logout (OK)

Invalida los tokens del usuario actual.

**Reglas:**
- Anadir el accessToken a una blacklist (Redis con TTL = expiry del token).
- Eliminar el refreshToken de la base de datos.
- Devolver 200 OK o 204 No Content.

### 4.4. GET /auth/me (NO IMPLEMENTADO)

Detallado en seccion 2.1.

---

## 5. CAMBIOS EN EL FRONTEND

### 5.1. Decodifica JWT client-side como workaround

Como `/auth/me` no existe, el frontend decodea el JWT con `jwt-decode` y rellena lo basico. Cuando el backend implemente el endpoint, se actualizara el flujo para llamarlo.

### 5.2. Auto-refresh de token

El frontend tiene un mecanismo de auto-refresh que detecta cuando el accessToken esta proximo a expirar y llama `/auth/refresh` automaticamente.

### 5.3. Manejo de 500 en /login

El frontend captura el 500 en login y muestra un mensaje generico ("Error en el servidor, intente nuevamente"). Cuando el backend arregle el bug y devuelva 400 con mensaje claro, el frontend mostrara el mensaje correcto.

---

## 6. CHECKLIST PARA EL BACKEND

### Critico

- [ ] **Implementar `GET /auth/me`** con el shape sugerido en seccion 2.1.
- [ ] **Validar body de `POST /auth/login`** (devolver 400, no 500, si falta username o password).

### Alta prioridad

- [ ] Implementar rotacion de refreshToken en `/refresh`.
- [ ] Implementar blacklist de accessTokens en `/logout` (Redis).
- [ ] Anadir audit log de intentos de login (exitosos y fallidos).

### Media

- [ ] Anadir endpoint `POST /auth/forgot-password` y `/auth/reset-password`.
- [ ] Anadir 2FA opcional (TOTP).
- [ ] Anadir rate limiting al login (3 intentos por minuto por IP).

### Documentacion

- [ ] Documentar shape de tokens (que claims llevan: id, username, tenantId, role, exp, iat).
- [ ] Documentar tiempo de expiracion (accessToken 1h, refreshToken 7d).
- [ ] Postman/Bruno collection.

---

## 7. APENDICE

```bash
node otros/testing/test-auth-full.mjs
```

Salida esperada:

```
✅ 200 POST /auth/login
✅ 401 POST /auth/login (cred. invalidas)        espera 401
❌ 404 GET /auth/me                               NO IMPLEMENTADO
✅ 200 POST /auth/refresh
✅ 200 POST /auth/logout
❌ 500 POST /auth/login (sin body)                espera 400/422

PORCENTAJE FUNCIONAL: 66.7%  (4/6)
```

---

**Fin del documento.** AUTH-BACKEND-HANDOFF v1.0
