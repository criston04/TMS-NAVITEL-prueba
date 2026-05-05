# MÓDULO ORDERS — Documento Backend

**Versión:** 3.0
**Fecha:** 2026-05-02
**Frontend:** TMS-NAVITEL Next.js 16
**Backend objetivo:** `https://api-service.gruponavitel.com`
**Resumen ejecutivo:** 5 de 15 endpoints que el frontend necesita funcionan (33.3%). El resto está bloqueado por un problema de configuración de NGINX (proxy reverso), no del backend de aplicación.

---

## INDICE

1. Resumen ejecutivo del estado del módulo
2. Bug crítico: configuración de NGINX (explicación técnica detallada)
3. Lista de endpoints que el frontend USA (15 endpoints, con cross-check)
4. Detalle de cada endpoint: request real, response esperada, reglas de negocio
5. Otros bugs detectados
6. Checklist de acciones para el backend
7. Apéndice: cómo reproducir cada test

---

## 1. RESUMEN EJECUTIVO

El módulo Orders del frontend está completo y funcional desde su lado. El frontend implementa el flujo de creación, listado, edición, cambio de estado, asignación de recursos, cancelación, cierre y eliminación de órdenes de transporte.

Sin embargo, en producción solo 5 de los 15 endpoints que el frontend necesita responden correctamente. Los otros 10 devuelven 404. La causa raíz NO es código del backend de aplicación: es configuración del proxy reverso (NGINX) que rechaza esas rutas antes de pasarlas al backend.

### Endpoints que funcionan (5)

| Método | Endpoint | Estado |
|---|---|:---:|
| POST | `/api/v1/orders` | OK |
| GET | `/api/v1/orders` | OK |
| GET | `/api/v1/orders/export` | OK |
| POST | `/api/v1/orders/bulk-send` | OK |
| GET | `/api/v1/operations/orders/status-counts` | OK |

### Endpoints bloqueados por NGINX (10)

| Método | Endpoint | Status real |
|---|---|:---:|
| GET | `/api/v1/orders/:id` | 404 NGINX |
| PATCH | `/api/v1/orders/:id` | 404 NGINX |
| DELETE | `/api/v1/orders/:id` | 404 NGINX |
| PATCH | `/api/v1/orders/:id/status` | 404 NGINX |
| PATCH | `/api/v1/orders/:id/assign` | 404 NGINX |
| POST | `/api/v1/orders/:id/cancel` | 404 NGINX |
| POST | `/api/v1/orders/:id/close` | 404 NGINX |
| POST | `/api/v1/orders/:id/items` | 404 NGINX |
| GET | `/api/v1/orders/:id/workflow-progress` | 404 NGINX |
| PATCH | `/api/v1/orders/:id/milestones/:milestoneId` | 404 NGINX |

### Endpoint con error de aplicación (1)

| Método | Endpoint | Status real |
|---|---|:---:|
| GET | `/api/v1/orders/stats` | 500 Internal Server Error |

### Impacto en el usuario final

Sin estos endpoints arreglados, el usuario NO puede:
- Ver el detalle de una orden creada
- Editar una orden
- Cambiar el estado de una orden (draft, pending, assigned, in_transit, etc.)
- Asignar conductor o vehículo
- Cancelar, cerrar o eliminar órdenes
- Ver el progreso de un workflow

El frontend implementa workarounds parciales (por ejemplo, traer 200 órdenes y filtrar client-side por id para mostrar el detalle), pero son ineficientes y no resuelven todos los casos.

---

## 2. BUG CRITICO: CONFIGURACION DE NGINX

### Descripcion del problema en lenguaje simple

Cuando el usuario en el frontend abre el detalle de una orden (por ejemplo, click en "Ver detalle" o "Editar"), el frontend hace una peticion HTTP del tipo `GET /api/v1/orders/abc-123-def-456` (donde `abc-123-def-456` es el UUID real de la orden).

El backend NO devuelve el detalle. En cambio, devuelve un error `404 Not Found` con el cuerpo literal `"Not Found"` en texto plano (exactamente 9 bytes).

Esto es importante porque la orden SI existe en la base de datos (se puede confirmar con `GET /api/v1/orders` que la lista incluye esa orden con ese UUID). El problema es que NO se puede acceder a ella individualmente.

Este mismo problema ocurre con todos los endpoints que reciben un UUID como path parameter:
- `PATCH /orders/:id` (editar)
- `DELETE /orders/:id` (eliminar)
- `PATCH /orders/:id/status` (cambiar estado)
- `PATCH /orders/:id/assign` (asignar conductor o vehiculo)
- `POST /orders/:id/cancel` (cancelar)
- `POST /orders/:id/close` (cerrar)
- Y otros 6 mas

### Diagnostico: NO es problema del frontend

Inicialmente podria parecer un bug del backend de aplicacion (Express/Fastify) o un problema de como el frontend construye las URLs. Realizamos dos rondas de tests para descartar todas las hipotesis posibles:

**Ronda 1**: 12 variantes basicas (UUID valido, UUID invalido, mayusculas, trailing slash, otros metodos HTTP). Todas devolvieron el mismo 404.

**Ronda 2**: 30+ variantes adicionales para descartar problemas del lado frontend:
- Variantes de path (singular, plural, con/sin namespace, con/sin version)
- Headers extra (X-Tenant-ID, Accept, User-Agent, Origin, Referer)
- Query params (include, expand, tenant_id, fields)
- Mismo patron probado en 7 modulos distintos (customers, drivers, vehicles, operators, products, work-orders, invoices)
- Comparacion contra rutas que SI funcionan (sin path param o con path param NO-UUID)

El resultado de las dos rondas es concluyente: el problema esta en la configuracion de NGINX (proxy reverso) o en algun middleware del backend que rechaza las peticiones ANTES de que lleguen al controller. El backend de aplicacion nunca recibe la peticion.

### Evidencia tecnica

Se ejecuto una bateria de tests (`otros/testing/bug-investigation-orders-id.mjs`) comparando rutas que funcionan vs rutas que fallan. Los resultados son concluyentes:

#### Ruta que SI funciona: `GET /api/v1/orders` (lista)

```
Status:        200 OK
Latency:       412ms
Headers:
  server:        nginx/1.28.0
  content-type:  application/json; charset=utf-8
  content-length: 29633
Body (JSON):
  {"data":[{"id":"ccd88b0c-...","tenant_id":"00000000-...","order_number":"ORD-..."},...]}
```

Caracteristicas:
- Content-Type es `application/json`
- Body es JSON estructurado generado por el backend de aplicacion
- Content-Length variable segun los datos

#### Ruta que NO funciona: `GET /api/v1/orders/:id` (UUID real recien creado)

```
Status:        404 Not Found
Latency:       203ms
Headers:
  server:        nginx/1.28.0
  content-type:  text/plain; charset=utf-8
  content-length: 9
Body (texto plano, exactamente 9 bytes):
  Not Found
```

Caracteristicas:
- Content-Type es `text/plain`, NO JSON
- Body es exactamente 9 bytes: la cadena literal "Not Found"
- Esto es la respuesta DEFAULT de NGINX cuando no encuentra una ruta en su configuracion

#### Comparacion contra mas variantes

Para descartar otras hipotesis, se probaron 12 variantes:

| Test | URL | Status | Body | Conclusion |
|---|---|:---:|---|---|
| A | `GET /orders?pageSize=5` | 200 | JSON 29KB | Backend OK, ruta funciona |
| B | `GET /orders/{uuid-real}` | 404 | "Not Found" 9b | NGINX rechaza |
| C | `GET /orders/00000000-0000-0000-0000-000000000000` | 404 | "Not Found" 9b | NGINX rechaza (no es validacion UUID) |
| D | `GET /orders/not-a-uuid` | 404 | "Not Found" 9b | NGINX rechaza (cualquier string falla igual) |
| E | `GET /operations/orders/by-number/ORD-X` | 200 | JSON | Backend OK, otra ruta funciona |
| F | `GET /operations/orders/status-counts` | 200 | JSON | Backend OK |
| G | `GET /orders/{uuid}/` (trailing slash) | 404 | "Not Found" 9b | NGINX rechaza |
| H | `GET /master/customers/{uuid}` | 404 | "Not Found" 9b | El bug afecta a OTROS modulos |
| I | `HEAD /orders/{uuid}` | 404 | (vacio) | NGINX rechaza |
| J | `OPTIONS /orders/{uuid}` | 404 | "Not Found" 9b | NGINX rechaza |
| K | `PATCH /orders/{uuid}` | 404 | "Not Found" 9b | NGINX rechaza |
| L | `GET /orders/{UUID-MAYUSCULAS}` | 404 | "Not Found" 9b | Caso del UUID irrelevante |

### Interpretacion paso a paso

**Paso 1 — Las rutas que el backend de aplicacion responde correctamente devuelven JSON con content-type application/json.**
Por ejemplo, `GET /api/v1/orders` (lista) y `GET /api/v1/operations/orders/status-counts`. Estas rutas pasan el proxy NGINX y llegan al backend de aplicacion (Express/Fastify), que procesa la peticion y devuelve un response JSON estructurado.

**Paso 2 — Las rutas que NGINX rechaza devuelven exactamente "Not Found" en text/plain de 9 bytes.**
Esa cadena exacta de 9 bytes es la pagina de error 404 default de NGINX cuando una URL NO esta cubierta por ninguna `location` block en su configuracion. Si pruebas pegar en el navegador `https://api-service.gruponavitel.com/cualquier-url-completamente-inexistente`, recibiras exactamente la misma respuesta de 9 bytes.

**Paso 3 — El backend de aplicacion nunca recibe la peticion.**
Si la peticion llegara al backend y este no encontrara el recurso, devolveria un JSON estructurado tipo:
```json
{"code": 404, "message": "Order not found"}
```
Esa es la convencion del backend documentada en la spec, y es lo que devuelven OTROS endpoints cuando algo realmente no existe (por ejemplo, `GET /api/v1/auth/login` sin Authorization devuelve `{"message":"Authentication Error"}` en JSON, no "Not Found" plain text).

**Paso 4 — El bug NO es especifico de Orders, afecta a TODOS los modulos.**
El segundo test confirmo que el mismo patron 404 ocurre en:
- `/api/v1/master/customers/:id`
- `/api/v1/master/drivers/:id`
- `/api/v1/master/vehicles/:id`
- `/api/v1/master/operators/:id`
- `/api/v1/master/products/:id`
- `/api/v1/maintenance/work-orders/:id`
- `/api/v1/finance/invoices/:id`

Todos estos endpoints estan documentados en la tabla maestra y deberian funcionar. Pero todos devuelven el mismo "Not Found" 9 bytes. Esto descarta cualquier posibilidad de que sea un bug aislado del modulo Orders.

### Evidencia exhaustiva: 30+ variantes probadas para descartar referenciamiento erroneo del frontend

Para verificar que el frontend NO esta usando URLs equivocadas, se ejecuto el script `otros/testing/bug-deep-investigation.mjs` que prueba 30+ variantes diferentes contra el mismo endpoint problematico.

#### Variantes de PATH probadas (11 variantes, todas dan 404)

```
404   /api/v1/orders/{uuid}                           ← URL canonica del frontend
404   /api/v1/orders/{uuid}/                          ← con trailing slash
404   /api/v1//orders/{uuid}                          ← con doble slash
404   /api/v1/order/{uuid}                            ← singular en vez de plural
404   /api/v1/Orders/{uuid}                           ← capitalizado
404   /api/v1/operations/orders/{uuid}                ← con namespace operations
404   /api/v1/operations/orders/{uuid}/detail         ← con sufijo detail
404   /api/v2/orders/{uuid}                           ← v2 en vez de v1
404   /api/orders/{uuid}                              ← sin v1
404   /orders/{uuid}                                  ← root sin /api
404   /v1/orders/{uuid}                               ← sin /api
```

Conclusion: ninguna variante funciona. Si fuera referenciamiento mal del frontend, alguna habria respondido bien. Esto descarta que el problema sea como el frontend construye las URLs.

#### Variantes de HEADERS probadas (6 variantes)

```
401   Sin Authorization                              ← responde JSON estructurado del backend
404   Con X-Tenant-ID: 00000000-...                  ← Not Found 9 bytes
404   Con Accept: application/json explicito          ← Not Found 9 bytes
404   Con User-Agent del navegador                    ← Not Found 9 bytes
404   Con Origin: http://localhost:3000               ← Not Found 9 bytes
404   Con Referer: http://localhost:3000/orders       ← Not Found 9 bytes
```

Observacion importante: cuando NO se envia Authorization, la respuesta es `401 {"message":"Authentication Error"}` en JSON estructurado del backend. Esto demuestra que el backend SI esta vivo y responde al endpoint. El problema es que cuando se envia Authorization correcto, la peticion se redirige a la ruta `:id` y NGINX la rechaza con 404.

Conclusion: ningun header extra cambia el comportamiento. No es problema de headers.

#### Variantes de QUERY PARAMS probadas (5 variantes)

```
404   ?include=items,tracking
404   ?expand=all
404   ?tenant_id=00000000-...
404   ?tenantId=00000000-...
404   ?fields=*
```

Conclusion: ningun query param cambia el comportamiento. No es problema de query params.

#### Mismo patron probado en 7 modulos distintos (todos 404)

```
404   /api/v1/master/customers/{uuid}
404   /api/v1/master/drivers/{uuid}
404   /api/v1/master/vehicles/{uuid}
404   /api/v1/master/operators/{uuid}
404   /api/v1/master/products/{uuid}
404   /api/v1/maintenance/work-orders/{uuid}
404   /api/v1/finance/invoices/{uuid}
```

Conclusion: el bug afecta a TODOS los modulos del backend que tienen endpoints con UUID en path param. Esto confirma que el problema esta en el proxy/routing global, no en codigo especifico de algun modulo.

#### Rutas que SI funcionan (grupo de control)

```
200   /api/v1/orders                                  ← sin path param
200   /api/v1/operations/orders/by-number/ORD-2026-X  ← path param es STRING (no UUID)
200   /api/v1/operations/orders/status-counts         ← sin path param
200   /api/v1/master/customers/by-document/123456     ← path param es NUMERO (no UUID)
```

Conclusion: las rutas que NO tienen UUID en path param funcionan perfectamente. Devuelven JSON estructurado del backend.

### Resumen del patron identificado

```
URL con UUID en path param          → 404 "Not Found" plain text de NGINX
URL con string/numero en path param → 200 JSON estructurado del backend
URL sin path param                  → 200 JSON estructurado del backend
```

El backend RECHAZA cualquier UUID en path param, sin importar:
- El modulo (orders, customers, drivers, vehicles, operators, products, work-orders, invoices)
- El metodo HTTP (GET, PATCH, DELETE, POST, OPTIONS, HEAD)
- Los headers extra
- Los query params
- El caso del UUID (mayusculas o minusculas)
- Si el UUID existe o no
- La validez del formato UUID

### Por que esto descarta que sea problema del frontend

Si el frontend estuviera usando URLs equivocadas:
- Alguna variante de path en el test habria funcionado (probamos 11)
- Solo afectaria al modulo Orders, no a 7 modulos diferentes
- El backend probablemente devolveria un mensaje de error diferente segun la URL incorrecta

Como las 30+ variantes diferentes dan EXACTAMENTE el mismo error con EXACTAMENTE el mismo body (9 bytes "Not Found"), la unica explicacion logica es que el problema esta en una capa anterior al backend de aplicacion (NGINX, ingress, o middleware de routing del backend que se ejecuta antes del controller).

### Causa raiz probable: tres escenarios posibles

La evidencia recopilada permite identificar tres escenarios posibles. Cualquiera explica el patron observado, y la solucion es similar en los tres casos.

#### Escenario A (mas probable): NGINX con location blocks incompletos

El proxy reverso NGINX tiene `location` blocks que cubren rutas estaticas como `/api/v1/orders` (literal, sin parametros) pero no cubren las rutas dinamicas con path parameters como `/api/v1/orders/:id`.

Una configuracion tipica que causaria este problema seria:

```nginx
# Configuracion que SI funciona (ruta estatica exacta)
location = /api/v1/orders {
    proxy_pass http://backend-app:3000;
}

# SIN esta linea adicional, /orders/:id devuelve 404 default de NGINX
location ~ ^/api/v1/orders/[a-f0-9-]+$ {
    proxy_pass http://backend-app:3000;
}
```

El operador `=` en `location =` significa "match exacto". NGINX solo enrutaria peticiones cuya URL es EXACTAMENTE `/api/v1/orders`, sin nada despues. Cualquier URL con algo despues (como `/api/v1/orders/abc-123`) NO matchea y NGINX devuelve su 404 default.

#### Escenario B: NGINX con regex que excluye UUIDs

El NGINX podria tener un regex que solo acepta path parameters numericos o alfanumericos cortos, pero no UUIDs:

```nginx
# Esto matchearia /orders/12345 pero NO /orders/abc-123-def-456
location ~ ^/api/v1/orders/\d+$ {
    proxy_pass http://backend-app:3000;
}
```

Esto explicaria por que `/operations/orders/by-number/ORD-2026-X` SI funciona (ORD-2026-X no es un UUID) pero `/orders/abc-uuid` no.

#### Escenario C: Ingress de Kubernetes con paths especificos

Si el backend esta detras de un Ingress de Kubernetes (en lugar de NGINX directo), el problema podria estar en el `ingress.yaml`:

```yaml
# Esto solo enruta /api/v1/orders exacto, NO /orders/:id
- path: /api/v1/orders
  pathType: Exact   # ← problema: deberia ser Prefix
  backend:
    service:
      name: backend-app
      port:
        number: 3000
```

Con `pathType: Exact`, solo la URL literal funciona. Con `pathType: Prefix`, todas las URLs que empiezan con ese path se enrutan correctamente.

### Por que se descartan otras causas

| Hipotesis | Por que se descarta |
|---|---|
| Bug en el codigo del controller del backend | Si fuera bug del controller, devolveria un JSON estructurado de error, no "Not Found" plain text. Y solo afectaria a un modulo, no a los 7 que probamos. |
| Validacion UUID rechazando | Probamos con UUIDs validos, invalidos, formatos arbitrarios. Todos dan el mismo 404 identico. Si fuera validacion, los formatos invalidos darian un mensaje diferente. |
| Problema de autenticacion | Probamos con y sin Authorization. Sin auth da `401 JSON estructurado` (response del backend). Con auth da `404 plain text` (response de NGINX). Esto demuestra que el backend SI esta vivo y responde a otras URLs del mismo path base. |
| Problema de tenant / RLS | Probamos con header `X-Tenant-ID` explicito y sin el. Mismo resultado. Ademas, las rutas SIN UUID que SI funcionan ya respetan el tenant correctamente. |
| Frontend usa URLs equivocadas | Probamos 11 variantes de path (singular, plural, con/sin namespace, v2, sin v1, sin api). Ninguna funciona. La URL del frontend coincide con la documentada en la tabla maestra del backend. |
| Bug del modulo Orders especifico | Probamos en 7 modulos distintos (customers, drivers, vehicles, operators, products, work-orders, invoices). Todos tienen el mismo 404. Es un problema global. |

### Verificacion sugerida para devops/backend

#### Paso 1 — Confirmar que el problema esta antes del backend

Revisar los logs del backend de aplicacion (no los logs de NGINX) cuando el frontend hace una peticion `GET /api/v1/orders/:id`:

- Si en los logs de la aplicacion NO aparece la peticion, el problema es NGINX o el ingress (CONFIRMA nuestro diagnostico).
- Si en los logs SI aparece pero responde 404, el problema seria del codigo de la aplicacion (REFUTARIA el diagnostico y habria que investigar el codigo del controller).

Para hacer esta confirmacion, ejecutar desde una terminal:

```bash
# 1. Login para obtener token
TOKEN=$(curl -s -X POST https://api-service.gruponavitel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1432!"}' | jq -r '.data.accessToken')

# 2. Crear una orden para tener un UUID real
CUSTOMER_ID=$(curl -s "https://api-service.gruponavitel.com/api/v1/master/customers?pageSize=1" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.items[0].id')

ORDER_ID=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"type\":\"delivery\",\"priority\":\"high\",\"customer_id\":\"$CUSTOMER_ID\"}" \
  | jq -r '.data.id')

echo "Orden creada: $ORDER_ID"

# 3. Mientras se monitorean los logs del backend, hacer GET por ID
curl -v "https://api-service.gruponavitel.com/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Despues, mirar los logs del backend de aplicacion. Si en los logs NO aparece la peticion del paso 3, el diagnostico esta confirmado.

#### Paso 2 — Identificar la configuracion responsable

Si esta en NGINX directo:
- Revisar el archivo de configuracion (probablemente `/etc/nginx/conf.d/default.conf` o `/etc/nginx/sites-enabled/api.conf`)
- Buscar las `location` blocks para `/api/v1/`
- Confirmar si las rutas con path parameters estan cubiertas

Si esta en Kubernetes:
- Revisar el `Ingress` que enruta al backend (`kubectl get ingress -A`)
- Revisar el manifest YAML buscando las rules de path
- Confirmar si los `pathType` son `Prefix` o `Exact`

#### Paso 3 — Aplicar el fix

Si es NGINX, la configuracion sugerida es usar un wildcard que cubra TODAS las rutas del backend de una sola vez (mas simple y mantenible que listar ruta por ruta):

```nginx
location /api/v1/ {
    proxy_pass http://backend-app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

El operador sin `=` ni `~` significa "match por prefijo". NGINX enrutara cualquier URL que empiece con `/api/v1/`, incluyendo todas las rutas dinamicas con `:id` o cualquier otro parametro.

Si es Kubernetes Ingress, cambiar `pathType: Exact` por `pathType: Prefix` en las rules pertinentes:

```yaml
- path: /api/v1
  pathType: Prefix     # ← cambiar de Exact a Prefix
  backend:
    service:
      name: backend-app
      port:
        number: 3000
```

Despues:
- NGINX: `nginx -s reload`
- Kubernetes: `kubectl apply -f ingress.yaml`

#### Paso 4 — Verificar que el fix funciono

Volver a ejecutar el comando del Paso 1 (parte 3):

```bash
curl -v "https://api-service.gruponavitel.com/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
```

Resultado esperado: `200 OK` con JSON estructurado que contiene los datos de la orden.

Si despues del fix el resultado es `404` con un JSON estructurado del backend (no plain text), entonces hay un segundo bug, esta vez en el controller del backend (que requiere ajustes en el codigo, no en la configuracion).

### Recursos adicionales

Los scripts de testing utilizados estan en:
- `otros/testing/bug-investigation-orders-id.mjs` — primer test (12 variantes)
- `otros/testing/bug-deep-investigation.mjs` — segundo test (30+ variantes para descartar problemas del frontend)

Ambos pueden ejecutarse con `node <ruta-al-script>` desde la raiz del proyecto. Los outputs sirven como evidencia de los hallazgos descritos en esta seccion.

---

## 3. LISTA DE ENDPOINTS QUE EL FRONTEND USA

Esta es la lista exacta de endpoints que el frontend del modulo Orders consume. Esta cross-checkeada contra tres fuentes oficiales:

- **Tabla maestra**: la tabla de endpoints proporcionada por el equipo backend
- **Rev2**: documentacion `endpointsv3-rev2.md` con fecha 2026-04-25
- **Rev3**: documentacion `endpointsv3-rev3.md` con fecha 2026-04-27
- **Produccion**: estado real del endpoint en `https://api-service.gruponavitel.com`

### Tabla resumen de los 15 endpoints que el frontend usa

| # | Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Estado |
|---|---|---|:---:|:---:|:---:|:---:|---|
| 1 | POST | `/api/v1/orders` | SI | SI | SI | 201 | OK |
| 2 | GET | `/api/v1/orders` | SI | SI | SI | 200 | OK |
| 3 | GET | `/api/v1/orders/export` | SI | SI | SI | 200 | OK |
| 4 | POST | `/api/v1/orders/bulk-send` | SI | SI | SI | 200 | OK |
| 5 | GET | `/api/v1/operations/orders/status-counts` | NO | SI | SI | 200 | OK (no listado en tabla maestra pero funciona) |
| 6 | GET | `/api/v1/orders/:id` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 7 | PATCH | `/api/v1/orders/:id` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 8 | DELETE | `/api/v1/orders/:id` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 9 | PATCH | `/api/v1/orders/:id/status` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 10 | PATCH | `/api/v1/orders/:id/assign` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 11 | POST | `/api/v1/orders/:id/cancel` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 12 | POST | `/api/v1/orders/:id/close` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 13 | POST | `/api/v1/orders/:id/items` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 14 | GET | `/api/v1/orders/:id/workflow-progress` | SI | SI | SI | 404 | BLOQUEADO por NGINX |
| 15 | PATCH | `/api/v1/orders/:id/milestones/:milestoneId` | SI | SI | SI | 404 | BLOQUEADO por NGINX |

### Endpoints en Rev2/Rev3 pero no en tabla maestra

Estos endpoints aparecen en las versiones 2 y 3 de la documentacion pero no en la tabla maestra oficial. El frontend NO los usa directamente, pero si existen y funcionan en produccion deberian agregarse a la tabla maestra.

| Metodo | Endpoint | Tabla maestra | Rev2 | Rev3 | Produccion | Notas |
|---|---|:---:|:---:|:---:|:---:|---|
| GET | `/api/v1/operations/orders/by-number/:orderNumber` | NO | SI | SI | 200 | Funciona, frontend usa `/orders?search=` en su lugar |
| GET | `/api/v1/operations/orders/by-driver/:driverId` | NO | SI | SI | 404 | Frontend usa `/orders?driverId=` |
| GET | `/api/v1/operations/orders/by-vehicle/:vehicleId` | NO | SI | SI | 404 | Frontend usa `/orders?vehicleId=` |
| PATCH | `/api/v1/operations/orders/:id/start-trip` | NO | SI | SI | 404 | Frontend usa `/orders/:id/status` con status `in_transit` |
| POST | `/api/v1/operations/orders/:id/send-external` | NO | SI | SI | NP | Frontend usa `/orders/bulk-send` con array de 1 ID |
| POST | `/api/v1/orders/bulk-send-external` | NO | SI | SI | NP | Frontend usa `/orders/bulk-send` |

NP = No Probado.

### Endpoints documentados que el frontend no usa todavia

| Metodo | Endpoint | Razon |
|---|---|---|
| GET | `/api/v1/orders/:id/tracking` | Requiere GPS conectado |
| POST | `/api/v1/orders/:id/transit-update` | Requiere GPS conectado |
| POST | `/api/v1/orders/:id/deliver` | Requiere POD (proof of delivery) digital |
| GET | `/api/v1/orders/stats` | No expuesto en UI todavia (ademas devuelve 500) |
| POST | `/api/v1/orders/import` | Documentado como STUB 501. Frontend hace import client-side |

---

## 4. DETALLE DE CADA ENDPOINT

Por cada endpoint se documenta:
- **Llamado por**: que componente, hook y service del frontend lo usa
- **Cuando se llama**: que accion del usuario lo dispara
- **Request body real**: el JSON literal que el frontend envia
- **Response esperada**: el shape que el frontend procesa
- **Post-processing**: que hace el frontend con la respuesta
- **Reglas de negocio**: lo que el backend debe validar/aplicar

---

### 4.1. POST /api/v1/orders — Crear orden

**Estado:** Funciona OK (status 201)

**Llamado por:**
- Componente: `OrderFormWizard` en `src/components/orders/order-form-wizard.tsx` linea 701-778
- Hook: `useOrders().createOrder()` en `src/hooks/useOrders.ts` linea 215
- Service: `OrderService.createOrder(data)` en `src/services/orders/OrderService.ts` linea 223

**Cuando se llama:** El usuario completa los 4 pasos del wizard de creacion (datos cliente y carga, workflow y ruta, asignacion opcional, confirmacion) y hace click en "Crear orden" en la pagina `/orders/new`.

**El wizard permite crear ordenes en draft (modo permisivo).** No es necesario llenar todos los campos. Se puede crear una orden minima con solo: cliente, prioridad, descripcion de carga y peso. El resto se puede completar despues editando la orden o desde el modulo de programacion.

**Campos REQUIRED en el wizard (validacion frontend para crear draft):**
- `customer_id` (cliente seleccionado)
- `priority` (default: "normal")
- `serviceType` (default: "distribucion") — se mapea a `type: "delivery"` antes de enviar
- `cargo.description` (3 a 500 caracteres)
- `cargo.weightKg` (mayor que cero, max 100,000)

**Campos REQUIRED para PROGRAMAR/ASIGNAR la orden (validacion strict):**
Si el usuario intenta avanzar la orden a estado `pending`/`assigned` mas adelante, deberan estar:
- `milestones` con minimo 2 items (origen y destino)
- `scheduled_pickup_at` y `scheduled_delivery_at`

Mientras estos faltan, la orden queda en draft. El wizard muestra un banner ambar al usuario informando que la orden NO podra programarse hasta completarlos.

---

#### Request body MAXIMO posible (todos los campos rellenados)

Generado por `mapOrderToBackend()` (`src/lib/transformers/order.transformer.ts`). El frontend solo incluye los campos que el usuario rellena; los demas se omiten.

```json
{
  "type": "delivery",
  "priority": "high",
  "customer_id": "uuid-del-customer",
  "customer_name": "Cliente ACME SA",
  "driver_id": "uuid-del-driver",
  "driver_name": "Juan Perez",
  "vehicle_id": "uuid-del-vehicle",
  "vehicle_plate": "ABC-123",
  "origin_address": "Av. Industrial 123, Lima",
  "origin_lat": -12.046,
  "origin_lng": -77.042,
  "origin_geofence_id": "uuid-geofence-origin",
  "destination_address": "Jr. Comercio 456",
  "destination_lat": -12.054,
  "destination_lng": -77.123,
  "destination_geofence_id": "uuid-geofence-dest",
  "scheduled_pickup_at": "2026-05-04T08:00:00.000Z",
  "scheduled_delivery_at": "2026-05-04T14:00:00.000Z",
  "estimated_distance_km": 25.5,
  "total_weight": 1500,
  "total_volume": 5.2,
  "total_packages": 10,
  "reference": "REF-2026-001",
  "notes": "Entrega urgente al cliente",
  "internal_notes": "Cliente VIP\n[Carga] Descripcion: Pallets refrigerados | Tipo: refrigerated | Valor declarado: 25000 USD | Manejo: Mantener entre 2-8 grados",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Item 1",
      "quantity": 5,
      "unit": "bag",
      "weight": 100,
      "volume": 0.1,
      "notes": "Producto principal"
    }
  ]
}
```

#### Request body MINIMO (orden draft con datos basicos)

Cuando el usuario solo llena lo minimo (cliente + carga + asignacion basica), el frontend envia algo asi:

```json
{
  "type": "delivery",
  "priority": "normal",
  "customer_id": "88453c77-a8a9-49a7-bc75-cb8121328de1",
  "customer_name": "Bruno Corp",
  "driver_id": "e6c29ab2-4395-45dc-b7a2-22183e33c1d2",
  "driver_name": "Jose Rolando Camarena",
  "vehicle_id": "175bf905-0679-46bf-aadf-ec2175ae2810",
  "vehicle_plate": "ABC-1296",
  "total_weight": 1500,
  "total_volume": 1600,
  "total_packages": 1862,
  "internal_notes": "[Carga] Descripcion: residuos medicos | Tipo: hazardous | Valor declarado: 8000 USD",
  "notes": "bien"
}
```

**Importante:** los campos `customer_name`, `vehicle_plate`, `driver_name` son DENORMALIZACIONES que el frontend resuelve antes de enviar consultando los maestros locales. El backend debe persistirlos sin validar contra los IDs (puede haber casos donde el frontend tenga datos cacheados mas frescos que el backend).

---

#### Notas importantes sobre campos especificos

**`internal_notes`:**
- El backend SI lo persiste (confirmado por tests reales) aunque Rev3 no lo lista explicitamente.
- El frontend usa este campo para preservar metadata de carga que el backend no soporta como columnas dedicadas: `cargo.description`, `cargo.type`, `cargo.declaredValue`, `cargo.handlingInstructions`, `cargo.temperatureRange`.
- Formato: prefijo `[Carga]` seguido de pares `Clave: valor` separados por ` | `. Si el usuario tambien rellena el campo `internalNotes` propio, se concatena con salto de linea.
- Ejemplo: `"Cliente VIP\n[Carga] Descripcion: ... | Tipo: hazardous | Valor declarado: 8000 USD"`

**`type`:**
- El frontend tiene un enum interno con 9 valores (`distribucion`, `importacion`, `exportacion`, `transporte_minero`, `transporte_residuos`, `interprovincial`, `mudanza`, `courier`, `otro`).
- El backend solo acepta `"delivery"` (cualquier otro valor lo persiste como `""` vacio).
- El transformer `mapServiceTypeToBackend()` mapea TODOS los valores del frontend a `"delivery"` provisionalmente.

**Denormalizaciones (`customer_name`, `vehicle_plate`, `driver_name`):**
- El frontend las hidrata antes de enviar buscando en sus listados locales de masters.
- El backend NO debe hacer JOIN para resolverlos: simplemente persiste los strings tal como llegan.
- Si el frontend NO los envia (por ejemplo, cliente nuevo no cacheado), el backend debe aceptar `null` sin problemas.

**Campos que el frontend NO envia (filtrados intencionalmente por el transformer):**
- `service_type` (solo se envia `type`)
- `carrier_id`, `gps_operator_id` (no soportados por backend; se preservan como warning en UI)
- `cargo{}` como sub-objeto rico (backend usa los planos `total_weight`, `total_volume`, `total_packages`; la metadata extra va en `internal_notes`)
- `milestones[]` como array rico (backend usa `origin_*`, `destination_*` planos extraidos del primer y ultimo milestone)
- `tags[]` (el backend descarta este campo; se preserva como warning en UI)
- `external_reference` (backend solo soporta `reference`)
- `scheduled_start_date`, `scheduled_end_date` (backend solo usa `scheduled_pickup_at`, `scheduled_delivery_at`)

---

#### Response esperada (status 201)

```json
{
  "data": {
    "id": "b8b682b3-0322-4f4e-9d4b-a1060d3d4fff",
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "order_number": "ORD-2026-64024",
    "type": "delivery",
    "status": "draft",
    "priority": "urgent",
    "customer_id": "88453c77-a8a9-49a7-bc75-cb8121328de1",
    "customer_name": "Bruno Corp",
    "driver_id": "e6c29ab2-4395-45dc-b7a2-22183e33c1d2",
    "driver_name": "Jose Rolando Camarena",
    "vehicle_id": "175bf905-0679-46bf-aadf-ec2175ae2810",
    "vehicle_plate": "ABC-1296",
    "total_weight": 1500,
    "total_volume": 1600,
    "total_packages": 1862,
    "notes": "bien",
    "internal_notes": "[Carga] Descripcion: residuos medicos | Tipo: hazardous | Valor declarado: 8000 USD",
    "reference": null,
    "created_by": "admin",
    "created_at": "2026-05-03T00:44:55.000Z",
    "updated_at": "2026-05-03T00:44:55.000Z",
    "sync_status": "not_sent",
    "items": [],

    "...resto de campos opcionales en null si no se enviaron..."
  }
}
```

#### Post-processing del frontend

1. `mapOrderFromBackend()` convierte snake_case a camelCase para el modelo `Order` interno (en `src/lib/transformers/order.transformer.ts`)
2. El wizard cierra y muestra dialogo "Orden creada exitosamente"
3. El usuario es redirigido a `/orders/:id` con el ID devuelto (este endpoint actualmente da 404 por bug NGINX, ver seccion 2)
4. El hook `useOrders` ejecuta `refresh()` para recargar la lista
5. El frontend publica evento `order:created` en el `tmsEventBus` para que otros modulos (Scheduling, Monitoring) se actualicen

---

#### Reglas de negocio que el backend debe aplicar

1. `tenant_id` se infiere del JWT, el frontend NO lo envia
2. `order_number` se autogenera con formato `ORD-YYYY-NNNNN` cuando no se envia
3. `status` siempre arranca en `"draft"` aunque el frontend envie otro
4. `created_by` se infiere del JWT (usuario autenticado)
5. `created_at` y `updated_at` los pone el backend
6. Si `vehicle_id` se envia: SUGERIDO validar que el vehiculo existe, status active, capacidad mayor o igual a `total_weight`. Actualmente el backend NO valida (acepta UUIDs invalidos y los pone como null).
7. Si `driver_id` se envia: SUGERIDO validar que el conductor existe, licencia vigente, examenes medicos OK. Actualmente el backend NO valida.
8. Si `customer_id` se envia: SUGERIDO validar que sea UUID valido y exista en el tenant. Actualmente acepta strings cualquiera y los convierte a null silenciosamente.
9. Validar `scheduled_pickup_at` menor que `scheduled_delivery_at` cuando ambos esten presentes.
10. `items[]` se persiste correctamente (confirmado por test).
11. `internal_notes` se persiste correctamente (confirmado por test, aunque Rev3 no lo lista en el body de POST).
12. `customer_name`, `vehicle_plate`, `driver_name`: persistir el string que llega tal cual, no intentar resolverlo via JOIN.

---

### 4.2. GET /api/v1/orders — Listar ordenes

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Pagina: `/orders/page.tsx` (la pagina principal de listado)
- Hook: `useOrders()` en `src/hooks/useOrders.ts` lineas 94-342
- Service: `OrderService.getOrders(filters)` en `OrderService.ts` lineas 32-67

**Cuando se llama:** El usuario abre la pagina `/orders`, cambia los filtros, cambia de pagina o hace `refresh()` manual.

**Query params que el frontend envia:**

```
?page=1
&pageSize=20
&search=ORD-2026
&status=pending
&customerId=uuid
&vehicleId=uuid
&driverId=uuid
&priority=high
&type=delivery
&startDate=2026-04-01
&endDate=2026-04-30
&sortBy=created_at
&sortOrder=desc
```

Todos opcionales excepto en algunos casos especificos.

**Response esperada (status 200):**

```json
{
  "items": [
    {
      "id": "uuid",
      "order_number": "ORD-2026-00045",
      "status": "in_transit",
      "type": "delivery",
      "priority": "high",
      "customer_id": "uuid",
      "customer_name": "Transportes SAC",
      "driver_id": "uuid",
      "driver_name": "Juan Perez",
      "vehicle_id": "uuid",
      "vehicle_plate": "ABC-123",
      "origin_address": "Av. Industrial 123, Lima",
      "destination_address": "Jr. Comercio 456",
      "scheduled_pickup_at": "...",
      "scheduled_delivery_at": "...",
      "total_weight": 1200,
      "total_volume": 4.5,
      "total_packages": 8,
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "meta": {
    "total": 450,
    "page": 1,
    "pageSize": 20,
    "totalPages": 23
  }
}
```

**Post-processing del frontend:**
1. Cada item del array `items` pasa por `mapOrderFromBackend()` para convertir a `Order` camelCase
2. Si el backend NO incluye `statusCounts`, el frontend lo calcula client-side desde la pagina actual (aproximacion, no es el total real)
3. El resultado se carga en el hook `useOrders` y se renderiza en `OrderList` o `OrderTable`

**Reglas de negocio:**
1. Filtrar siempre por `tenant_id` del JWT
2. Excluir registros con `deleted_at IS NOT NULL` por defecto
3. Busqueda case-insensitive en `order_number`, `reference`, `notes`
4. Default `sortBy=created_at`, `sortOrder=desc`
5. Default `pageSize=20`, maximo 200
6. Mejora sugerida: incluir `statusCounts` en el response para evitar el calculo client-side aproximado

---

### 4.3. GET /api/v1/orders/export — Exportar a CSV

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Boton "Exportar" en la pagina `/orders`
- Hook: `useOrderExport()`

**Cuando se llama:** El usuario hace click en "Exportar" para descargar el listado actual filtrado.

**Request:** GET sin body. Mismos query params de filtros que `/orders`.

**Response esperada:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="orders-YYYYMMDD.csv"
```

**Post-processing del frontend:** El navegador descarga el archivo automaticamente.

**Reglas de negocio:**
1. Respetar los mismos filtros que el listado
2. Exportar TODAS las paginas, no solo la actual
3. Headers del CSV en el mismo orden que las columnas de la tabla en el frontend

---

### 4.4. POST /api/v1/orders/bulk-send — Envio masivo a GPS

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Componente: `OrderBulkActions` (boton "Enviar a GPS" en la pagina de lista)
- Service: `OrderService.bulkSendToExternal()` en `OrderService.ts` linea 428
- Tambien usado por `OrderService.sendToExternal(id)` en linea 419 (pasa array con un solo ID)

**Cuando se llama:** El usuario selecciona ordenes con los checkboxes y hace click en "Enviar a GPS".

**Request body:**

```json
{
  "orderIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

**Response esperada:**

```json
{
  "message": "3/3 orders sent to GPS platform",
  "results": [
    { "orderId": "uuid-1", "success": true },
    { "orderId": "uuid-2", "success": true },
    { "orderId": "uuid-3", "success": false, "error": "GPS timeout" }
  ]
}
```

**Reglas de negocio:**
1. Validar que cada `orderId` exista y este en estado valido (assigned o mas avanzado)
2. Marcar `sync_status = "pending"` antes de enviar a GPS
3. Si GPS responde OK, marcar `sync_status = "sent"` y guardar `external_order_id`
4. Si GPS falla, marcar `sync_status = "error"` y guardar `sync_error_message`
5. Devolver resultado por orden (success/error) sin abortar el batch entero

---

### 4.5. GET /api/v1/operations/orders/status-counts — Contadores por estado

**Estado:** Funciona OK (status 200)

**Llamado por:**
- Cards KPI en la pagina `/orders` (parte superior)
- Service: `OrderService.getStatusCounts()` en `OrderService.ts` linea 130-132

**Cuando se llama:** Al cargar la pagina de ordenes, para mostrar las cards con el contador de cada estado.

**Request:** GET sin body ni query params.

**Response esperada:**

```json
{
  "data": {
    "draft": 12,
    "pending": 45,
    "assigned": 30,
    "in_transit": 18,
    "at_milestone": 5,
    "delayed": 3,
    "completed": 320,
    "closed": 280,
    "cancelled": 17
  }
}
```

**Nota importante:** Este endpoint NO esta listado en la tabla maestra del backend, pero esta documentado en Rev2 y Rev3 y funciona correctamente en produccion. Pregunta abierta: es endpoint oficial soportado o es legacy que se mantiene por compatibilidad?

**Reglas de negocio:**
1. Contar todas las ordenes del tenant (no solo pagina actual)
2. Agrupar por status
3. Excluir registros con `deleted_at IS NOT NULL`

---

### 4.6. GET /api/v1/orders/:id — Detalle de orden

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Pagina: `/orders/[id]/page.tsx`
- Hook: `useOrder(id)` en `src/hooks/useOrders.ts` linea 380
- Service: `OrderService.getOrderById(id)` en `OrderService.ts` linea 81

**Cuando se llama:** El usuario abre la pagina de detalle de una orden especifica desde el listado.

**Request:** GET sin body. El `:id` es el UUID v4 de la orden.

**Response esperada (cuando se arregle):**

```json
{
  "data": {
    "id": "uuid",
    "order_number": "ORD-2026-00045",
    "status": "in_transit",
    "type": "delivery",
    "priority": "high",
    "customer_id": "uuid",
    "customer_name": "...",
    "driver_id": "uuid",
    "vehicle_id": "uuid",
    "origin_address": "...",
    "destination_address": "...",
    "scheduled_pickup_at": "...",
    "scheduled_delivery_at": "...",
    "actual_pickup_at": null,
    "actual_delivery_at": null,
    "total_weight": 1200,
    "items": [
      { "id": "uuid", "product_id": "...", "product_name": "...", "quantity": 5 }
    ],
    "tracking": [
      { "id": "uuid", "status": "in_transit", "lat": -12.046, "lng": -77.042, "created_at": "..." }
    ]
  }
}
```

**Workaround actual del frontend:** Si recibe 404, hace `GET /orders?pageSize=200` y filtra client-side por id. Funciona pero es ineficiente (descarga 200 ordenes para mostrar 1).

**Reglas de negocio:**
1. Filtrar por `tenant_id` del JWT
2. Excluir `deleted_at IS NOT NULL`
3. Incluir relaciones: `items[]` y `tracking[]`
4. Devolver `404 Not Found` con JSON estructurado solo si la orden NO existe

---

### 4.7. PATCH /api/v1/orders/:id — Actualizar orden

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Pagina: `/orders/[id]/edit/page.tsx`
- Hook: `useOrder().update(data)` en `src/hooks/useOrders.ts`
- Service: `OrderService.updateOrder(id, data)` en `OrderService.ts` linea 244

**Cuando se llama:** El usuario edita una orden existente desde el wizard en modo edicion.

**Request body (campos opcionales, COALESCE update):**

```json
{
  "type": "delivery",
  "priority": "urgent",
  "customer_id": "uuid",
  "vehicle_id": "uuid",
  "driver_id": "uuid",
  "origin_address": "Nueva direccion",
  "origin_lat": -12.046,
  "origin_lng": -77.042,
  "destination_address": "Nueva destino",
  "destination_lat": -12.054,
  "destination_lng": -77.123,
  "scheduled_pickup_at": "2026-04-28T08:00:00.000Z",
  "scheduled_delivery_at": "2026-04-28T14:00:00.000Z",
  "total_weight": 1500,
  "total_volume": 5.2,
  "total_packages": 10,
  "notes": "Actualizado",
  "internal_notes": "Cambio solicitado por cliente"
}
```

Solo se envian los campos que cambian. NO es un PUT completo.

**Response esperada:**

```json
{ "data": { "...orden actualizada completa..." } }
```

**Workaround actual del frontend:** Lanza un Error con `backendBug: true` y mensaje claro al usuario:
"La edicion de ordenes no esta disponible: el backend devuelve 404 en rutas con :id (bug reportado)".

**Reglas de negocio (cuando se arregle):**
1. Solo permitir update si `status IN ('draft', 'pending')`
2. Si status es `assigned` o mas avanzado, devolver `409 Conflict`
3. Validar que nuevo `vehicle_id`/`driver_id` este disponible en la fecha
4. Update con COALESCE (solo cambia los campos enviados)
5. Actualizar `updated_at`

---

### 4.8. DELETE /api/v1/orders/:id — Eliminar orden (soft-delete)

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Boton "Eliminar" en la pagina de detalle de orden
- Service: `OrderService.deleteOrder(id)` en `OrderService.ts` linea 272

**Cuando se llama:** El usuario confirma la eliminacion de una orden en estado `draft`.

**Request:** DELETE sin body.

**Response esperada:**

```json
{ "message": "Order deleted" }
```

**Post-processing del frontend:**
1. Cierra el modal de confirmacion
2. Navega de vuelta a `/orders`
3. El hook ejecuta `refresh()` para recargar la lista

**Reglas de negocio:**
1. Solo permitir eliminar si `status === 'draft'`
2. Soft-delete: marcar `deleted_at = NOW()` (no eliminar fisicamente)
3. Devolver `409 Conflict` si la orden no esta en draft
4. Devolver `404 Not Found` con JSON estructurado solo si la orden NO existe

---

### 4.9. PATCH /api/v1/orders/:id/status — Cambiar estado

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Botones de transicion en la pagina de detalle ("Confirmar", "Asignar", "Iniciar viaje", etc.)
- Hook: `useOrder().changeStatus(newStatus)` y `useOrder().startTrip()`
- Service: `OrderService.changeStatus(id, status)` y `OrderService.startTrip(id)`

**Cuando se llama:** El usuario hace click en un boton de transicion de estado en la pagina de detalle.

**Request body:**

```json
{
  "status": "in_transit",
  "reason": "Salida del almacen",
  "lat": -12.046,
  "lng": -77.042
}
```

**Transiciones validas que el frontend permite:**

| Desde | Hacia |
|---|---|
| draft | pending, cancelled |
| pending | assigned, cancelled |
| assigned | in_transit, cancelled |
| in_transit | at_milestone, delayed, completed, cancelled |
| at_milestone | in_transit, delayed, completed, cancelled |
| delayed | in_transit, at_milestone, completed, cancelled |
| completed | closed |

**Response esperada:**

```json
{
  "data": {
    "id": "uuid",
    "oldStatus": "pending",
    "newStatus": "in_transit"
  }
}
```

**Reglas de negocio:**
1. Validar que la transicion sea valida segun la matriz arriba
2. Si la transicion es invalida, devolver `400 Bad Request` con `{validTransitions: [...]}`
3. Persistir `lat`/`lng` como tracking entry si se proveen
4. Persistir `reason` en historial de status

---

### 4.10. PATCH /api/v1/orders/:id/assign — Asignar conductor y vehiculo

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Service: `OrderService.assignVehicleAndDriver(id, vehicleId, driverId)` en `OrderService.ts` linea 290
- Wizard paso 3 (asignacion opcional) o boton "Asignar" en detalle

**Request body:**

```json
{
  "vehicle_id": "uuid",
  "driver_id": "uuid"
}
```

**Response esperada:**

```json
{
  "data": {
    "id": "uuid",
    "vehicle_id": "uuid",
    "driver_id": "uuid",
    "assigned": true
  }
}
```

**Reglas de negocio:**
1. Validar disponibilidad del vehiculo en el rango de fechas
2. Validar disponibilidad del conductor (no asignado a otra orden conflictiva)
3. Validar capacidad del vehiculo mayor o igual a `total_weight` y `total_volume`
4. Si la orden esta en `pending`, transicionar automaticamente a `assigned`
5. Devolver `409 Conflict` si hay conflictos

---

### 4.11. POST /api/v1/orders/:id/cancel — Cancelar orden

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:** Boton "Cancelar" en la pagina de detalle.

**Request body:**

```json
{ "reason": "Cliente cancelo pedido" }
```

**Response esperada:**

```json
{
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancel_reason": "Cliente cancelo pedido",
    "cancelled_at": "...",
    "cancelled_by": "user-uuid"
  }
}
```

**Reglas de negocio:**
1. Solo permitir si status NO es `closed` ni `cancelled`
2. Liberar recursos (vehiculo, conductor) asignados
3. Persistir `cancel_reason`, `cancelled_at`, `cancelled_by`

---

### 4.12. POST /api/v1/orders/:id/close — Cerrar orden (administrativo)

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Boton "Cerrar" en detalle (solo si esta en `completed`)
- Hook: `useOrder().close(closureData)`
- Service: `OrderService.closeOrder(id, closureData)` en `OrderService.ts` linea 362

**Request body:**

```json
{
  "notes": "Cierre administrativo - documentacion completa",
  "closedBy": "user-uuid"
}
```

**Response esperada:**

```json
{
  "data": {
    "id": "uuid",
    "status": "closed",
    "closed_at": "..."
  }
}
```

**Post-processing del frontend:**
1. Antes de llamar al endpoint, valida con `canCloseOrder()` (chequea status y milestones)
2. Tras exito, publica evento `order:closed` en `tmsEventBus` para sincronizar otros modulos

**Reglas de negocio:**
1. Solo permitir si `status === 'completed'`
2. Validar que todos los milestones esten `completed` o `skipped`
3. Detener feed de GPS asociado
4. Marcar `closed_at` y `closed_by`

---

### 4.13. POST /api/v1/orders/:id/items — Agregar items

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:** No expuesto aun en UI, pero el backend lo acepta segun Rev3.

**Request body:**

```json
{
  "items": [
    {
      "product_id": "uuid",
      "product_name": "Item",
      "quantity": 5,
      "unit": "bag",
      "weight": 250,
      "volume": 0.25,
      "notes": null
    }
  ]
}
```

**Response esperada:**

```json
{
  "data": {
    "orderId": "uuid",
    "addedItems": [{ "id": "uuid", "productName": "..." }],
    "totalWeight": 1450,
    "totalVolume": 4.75,
    "totalPackages": 13
  }
}
```

**Reglas de negocio:**
1. Solo permitir si `status IN ('draft', 'pending', 'assigned')`
2. Recalcular `total_weight`, `total_volume`, `total_packages` automaticamente

---

### 4.14. GET /api/v1/orders/:id/workflow-progress — Progreso de workflow

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Hook: `useWorkflowProgress(id)` en la pagina de detalle
- Para mostrar progreso de hitos (milestones) al usuario

**Response esperada:**

```json
{
  "data": {
    "orderId": "uuid",
    "orderStatus": "in_transit",
    "workflowId": "uuid",
    "completionPercentage": 40,
    "completedMilestones": 2,
    "totalMilestones": 5,
    "milestones": [
      {
        "id": "uuid",
        "name": "Recojo en almacen",
        "type": "pickup",
        "sequence": 1,
        "status": "completed",
        "estimatedArrival": "...",
        "actualArrival": "...",
        "actualDeparture": "...",
        "dwellTimeMin": 15,
        "delayMinutes": 15,
        "isManual": false
      }
    ]
  }
}
```

---

### 4.15. PATCH /api/v1/orders/:id/milestones/:milestoneId — Actualizar hito manual

**Estado:** BLOQUEADO por NGINX (404)

**Llamado por:**
- Service: `OrderService.updateMilestone()`, `enterMilestone()`, `exitMilestone()` en `OrderService.ts` linea 386-413
- Componente: `MilestoneManualEntryModal` para entrada manual sin GPS

**Request body:**

```json
{
  "entryType": "arrival",
  "reason": "Llegue al punto",
  "observation": "Porton cerrado",
  "evidence": "https://storage.../img.jpg"
}
```

`entryType`: `arrival` o `departure`

**Response esperada:**

```json
{
  "data": {
    "milestoneId": "uuid",
    "entryType": "arrival",
    "newStatus": "in_progress",
    "completionPercentage": 60,
    "isManual": true
  }
}
```

**Reglas de negocio:**
1. Auto-completar la orden si es el ultimo milestone tipo `destination` con `entryType=arrival`
2. Calcular `dwell_time_minutes` cuando llega `departure` despues de un `arrival`
3. Marcar `is_manual: true` si la entrada es manual (no GPS)

---

## 5. OTROS BUGS DETECTADOS

### 5.1. GET /api/v1/orders/stats devuelve 500

**Sintoma:** El endpoint devuelve `500 Internal Server Error` sin response body util.

**Reproduccion:**

```bash
curl -s -w "\nStatus: %{http_code}\n" \
  https://api-service.gruponavitel.com/api/v1/orders/stats \
  -H "Authorization: Bearer {token}"
```

**Probable causa:** Error en query SQL o agregacion (division por cero, JOIN sobre tabla vacia, conversion de tipos).

**Response esperada (segun Rev3):**

```json
{
  "data": {
    "total": 450,
    "draft": 12,
    "pending": 45,
    "assigned": 30,
    "inTransit": 18,
    "atMilestone": 5,
    "delayed": 3,
    "completed": 320,
    "closed": 280,
    "cancelled": 17
  }
}
```

A diferencia del bug NGINX, este SI llega al backend de aplicacion (porque devuelve 500, no 404). Hay que revisar los logs del backend para ver el stack trace.

---

### 5.2. Enum `type` rechaza valores documentados

**Sintoma:** El frontend envia valores como `"distribucion"`, `"importacion"`, `"exportacion"` en el campo `type`. El backend acepta el POST con 201 Created pero en la respuesta el campo `type` sale vacio (`""`). Solo el valor `"delivery"` se persiste correctamente.

**Reproduccion:**

```bash
# Test 1: enviar type="distribucion"
curl -X POST https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"distribucion","priority":"normal","customer_id":"<id>"}' \
  | jq '.data.type'
# Resultado: ""  (vacio)

# Test 2: enviar type="delivery"
curl -X POST https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"type":"delivery","priority":"normal","customer_id":"<id>"}' \
  | jq '.data.type'
# Resultado: "delivery"
```

**Pregunta para el equipo backend:**
- Cual es la lista oficial de valores validos para el campo `type`?
- Solo `"delivery"` esta implementado actualmente?
- Tienen planeado soportar los enums del frontend (distribucion, importacion, exportacion, transporte_minero, transporte_residuos, interprovincial, mudanza, courier, otro)?

**Workaround actual del frontend:** Mapear todos los valores de `serviceType` del frontend al valor `"delivery"` en el transformer (`mapServiceTypeToBackend()` en `src/lib/transformers/order.transformer.ts`).

---

### 5.3. Campos del payload se descartan silenciosamente

El frontend (antes de los fixes recientes) enviaba estos campos que el backend ignora silenciosamente:

| Campo enviado | Estado en response | Causa probable |
|---|---|---|
| `carrier_id` | descartado | Backend no soporta carrier en orders |
| `external_reference` | descartado | Backend solo soporta `reference` |
| `service_type` | descartado | Backend solo usa `type` |
| `cargo{}` (sub-objeto) | descartado | Backend usa `total_weight`, `total_volume`, `total_packages` planos |
| `milestones[]` (array rico) | descartado | Backend usa `origin_*`, `destination_*` planos |
| `tags[]` | descartado | Backend no implementa tags |
| `gps_operator_id` | descartado | Backend no soporta gps_operator |
| `scheduled_start_date` | descartado | Backend solo usa `scheduled_pickup_at` |
| `scheduled_end_date` | descartado | Backend solo usa `scheduled_delivery_at` |

**Estado actual:** El frontend ya filtro estos campos del payload en `mapOrderToBackend()`. Si el backend nunca va a soportarlos, esto esta resuelto. Si el backend planea soportarlos, deberia documentarlo o devolver warnings.

**Sugerencia para backend:** En vez de ignorar silenciosamente, responder con un header `X-Ignored-Fields: carrier_id,tags,...` o rechazar con `400 Bad Request` con detalle de campos no soportados.

---

## 6. CHECKLIST DE ACCIONES PARA EL BACKEND

### Critico (bloquean el modulo Orders)

- [ ] Revisar configuracion de NGINX y agregar las location blocks faltantes para `/api/v1/orders/*` con path parameters dinamicos. Ver seccion 2.
- [ ] Revisar `GET /api/v1/orders/stats` que devuelve 500. Ver logs del backend para identificar la causa.
- [ ] Confirmar la lista oficial de valores validos para el enum `type` en orders.

### Alto (mejoras importantes)

- [ ] Implementar `POST /orders/:id/cancel` (una vez NGINX permita la ruta)
- [ ] Implementar `POST /orders/:id/items` (una vez NGINX permita la ruta)
- [ ] Soportar parametros de filtro avanzados en `GET /orders` (driverId, vehicleId, dateRange, sortBy, sortOrder)
- [ ] Agregar `statusCounts` al response de `GET /orders` (actualmente el frontend lo calcula client-side)

### Medio (nice to have)

- [ ] Aclarar si los endpoints `/operations/orders/*` son oficiales. Si si, agregar a tabla maestra. Si no, marcar como deprecated.
- [ ] Soportar `carrier_id` (transportista) en orders. Actualmente se descarta.
- [ ] Soportar `external_reference` separado de `reference` para PO/Booking del cliente.
- [ ] Soportar `tags[]` en orders. Actualmente el array se descarta.
- [ ] Persistir el sub-objeto `cargo{}` para detalles ricos de carga (description, type, declared_value, temperature_range, handling_instructions).
- [ ] Persistir el array `milestones[]` para hitos intermedios (no solo origen/destino).

### Documentacion

- [ ] Confirmar lista exacta de valores validos por enum:
  - `type` (actualmente solo "delivery" funciona)
  - `priority` (frontend usa low, normal, high, urgent)
  - `status` (frontend usa 9 estados, confirmar transiciones)
- [ ] Documentar si las acciones de status (start-trip, deliver, cancel, close) emiten eventos webhook
- [ ] Documentar el formato exacto del response de `GET /orders/:id` cuando incluye items y tracking

---

## 7. APENDICE: COMO REPRODUCIR LOS TESTS

### Credenciales de test

```
URL:      https://api-service.gruponavitel.com
Username: admin
Password: Admin1432!
```

### Test del bug NGINX (los 12 variantes)

El script completo esta en `otros/testing/bug-investigation-orders-id.mjs`. Para ejecutarlo:

```bash
cd "TMS-NAVITEL-prueba"
node otros/testing/bug-investigation-orders-id.mjs
```

Genera un reporte literal de 12 tests con request, status, headers y body de cada uno.

### Test E2E completo del modulo Orders

El script `otros/testing/test-orders-full.mjs` prueba TODOS los endpoints del modulo y reporta el porcentaje funcional:

```bash
node otros/testing/test-orders-full.mjs
```

### Test minimo para verificar el bug NGINX

Comando bash basico para reproducir el bug en menos de 1 minuto:

```bash
# 1. Login
TOKEN=$(curl -s -X POST https://api-service.gruponavitel.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin1432!"}' \
  | jq -r '.data.accessToken')

# 2. Crear orden de test (necesita customer_id real)
CUSTOMER_ID=$(curl -s "https://api-service.gruponavitel.com/api/v1/master/customers?pageSize=1" \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.items[0].id')

ORDER_ID=$(curl -s -X POST https://api-service.gruponavitel.com/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"delivery\",\"priority\":\"high\",\"customer_id\":\"$CUSTOMER_ID\"}" \
  | jq -r '.data.id')

echo "Orden creada con id: $ORDER_ID"

# 3. Verificar que aparece en lista (debe funcionar)
curl -s "https://api-service.gruponavitel.com/api/v1/orders" \
  -H "Authorization: Bearer $TOKEN" \
  | jq ".items[] | select(.id == \"$ORDER_ID\") | {id, order_number, status}"

# 4. Intentar GET por ID (debe fallar con 404 NGINX)
curl -s -w "\nStatus: %{http_code}\nContent-Type: %{content_type}\n" \
  "https://api-service.gruponavitel.com/api/v1/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN"
# Resultado esperado:
# Body: "Not Found"
# Status: 404
# Content-Type: text/plain; charset=utf-8
```

Si el body es exactamente `"Not Found"` en text/plain, confirma que es el bug de NGINX descrito en la seccion 2.

### Test para verificar que el bug afecta otros modulos

```bash
# GET por ID en customers (mismo bug)
curl -s -w "\nStatus: %{http_code}\nContent-Type: %{content_type}\n" \
  "https://api-service.gruponavitel.com/api/v1/master/customers/$CUSTOMER_ID" \
  -H "Authorization: Bearer $TOKEN"
# Resultado esperado: 404 con "Not Found" plain text
```

---

## 8. CAMBIOS RECIENTES EN EL FRONTEND (2026-05-03)

Esta seccion documenta los ajustes que el equipo de frontend aplico recientemente al modulo Orders. Es importante que el equipo backend los conozca para entender por que el payload llega con cierta forma y para anticipar comportamientos.

### Fix A — Hidratacion de denormalizaciones

**Problema:** Antes el frontend enviaba `customer_id`, `vehicle_id`, `driver_id` pero NO los nombres asociados. El backend devolvia `customer_name: null`, `vehicle_plate: null`, `driver_name: null` aunque los IDs fueran validos.

**Solucion:** El wizard ahora busca en sus listados locales el customer, vehicle y driver seleccionados, y pasa los nombres como denormalizaciones al transformer. El transformer los incluye en el POST como `customer_name`, `vehicle_plate`, `driver_name`.

**Archivos:** `src/components/orders/order-form-wizard.tsx` linea 723+, `src/lib/transformers/order.transformer.ts`

**Lo que el backend recibe ahora:**
```json
{
  "customer_id": "uuid",
  "customer_name": "Cliente ACME SA",
  "vehicle_id": "uuid",
  "vehicle_plate": "ABC-123",
  "driver_id": "uuid",
  "driver_name": "Juan Perez"
}
```

### Fix B — Preservacion de metadata de carga

**Problema:** Antes el frontend mandaba `cargo.description` como parte de `notes` SOLO si `notes` estaba vacio. Si el usuario escribia tanto en "Descripcion de carga" como en "Notas", la descripcion se perdia.

**Solucion:** La metadata extra de carga (`description`, `type`, `declaredValue`, `handlingInstructions`, `temperatureRange`) ahora se concatena en `internal_notes` con prefijo `[Carga]`. Si el usuario tambien rellena `internalNotes`, ambos se combinan con salto de linea.

**Archivos:** `src/lib/transformers/order.transformer.ts` linea 616+

**Lo que el backend recibe ahora:**
```
notes:          "comentario del usuario para el cliente"
internal_notes: "Cliente VIP\n[Carga] Descripcion: Pallets refrigerados | Tipo: refrigerated | Valor declarado: 25000 USD | Manejo: Mantener entre 2-8 grados"
```

### Fix C — Validacion zod split en draft / strict

**Problema:** El zod schema requeria `milestones` (min 2) y `scheduled_*` como obligatorios, pero el wizard permitia crear ordenes draft sin esos campos. Inconsistencia entre validacion y comportamiento real.

**Solucion:** Se separaron en dos schemas:
- `createOrderSchema`: para crear DRAFT, todos los campos de routing/scheduling son opcionales
- `orderReadyForSchedulingSchema`: STRICT, valida lo necesario para que la orden pueda salir de draft y programarse

**Archivos:** `src/lib/validators/order-validators.ts`

**Implicacion para backend:** El backend debe aceptar POST sin `scheduled_*` y sin origen/destino. La validacion strict ocurre en el frontend cuando el usuario quiere transicionar el estado a `pending`/`assigned`. Cuando se reciba `PATCH /orders/:id/status` con un nuevo status no-draft, el backend debe enforcer estas validaciones del lado servidor tambien.

### Fix D — Fechas de orden independientes de los hitos

**Problema:** Las fechas de la orden (`scheduled_pickup_at`, `scheduled_delivery_at`) solo se podian definir creando hitos primero. Si el usuario queria una orden simple sin hitos intermedios, no podia ponerle fechas.

**Solucion:** Se agrego una seccion "Programacion" en el paso 1 del wizard con dos campos: fecha+hora de recojo y fecha+hora de entrega. Tienen prioridad sobre las fechas derivadas de hitos.

**Archivos:** `src/components/orders/order-form-wizard.tsx` linea 1076+

**Implicacion para backend:** Ninguna. Los campos `scheduled_pickup_at` y `scheduled_delivery_at` siguen siendo los mismos.

### Fix E — Banners informativos en el wizard

**Problema:** El usuario rellenaba campos como "Transportista", "Etiquetas", "Valor declarado" sin saber que el backend no los persistiria.

**Solucion:** En el paso 4 (Confirmacion) ahora aparecen dos banners:
- **Banner ambar**: si faltan datos requeridos para programar la orden
- **Banner azul**: lista los campos rellenados que NO se persisten en backend (carrier, tags, declaredValue) y explica que se preservan en `internal_notes` o son solo metadata local

**Archivos:** `src/components/orders/order-form-wizard.tsx` linea 1270+

---

## 9. NUEVOS BUGS DETECTADOS POR ESTAS PRUEBAS

### Bug nuevo #1 (MEDIO): Backend acepta UUIDs invalidos en customer_id, driver_id, vehicle_id

**Evidencia:** Cuando el frontend envia `customer_id: "string-no-uuid"` o `customer_id: "{{lastCustomerId}}"` (placeholder no resuelto), el backend acepta el POST con 201 OK y persiste el campo como `null` sin error.

**Comportamiento esperado:** Devolver `400 Bad Request` con mensaje claro: `{"code": 400, "message": "customer_id must be a valid UUID"}`.

**Riesgo:** Se generan ordenes huerfanas sin relacion a customer real. Las busquedas/filtros por `customer_id` no las encontrarian.

### Bug nuevo #2 (BAJO): Backend NO resuelve customer_name desde customer_id

**Evidencia:** Si el frontend envia solo `customer_id` SIN `customer_name`, el backend persiste `customer_name: null` aunque el customer exista. No hace JOIN automatico.

**Comportamiento sugerido:** Si llega `customer_id` valido pero no `customer_name`, hacer un JOIN al maestro de customers y resolver el nombre antes de persistir. O documentar claramente que el frontend siempre debe enviar la denormalizacion.

**Estado actual:** El frontend ahora envia siempre la denormalizacion (Fix A), asi que el bug NO bloquea funcionalidad. Pero seria mas robusto que el backend tambien lo resolviera.

### Bug nuevo #3 (BAJO): No hay validacion de limites en cargo

**Evidencia:** El frontend envio `total_volume: 1600` (excede el limite de 1000 m3 del schema zod). El backend lo acepto y persistio sin validacion.

**Comportamiento sugerido:** El backend deberia validar limites razonables (ej. `total_volume <= 1000`, `total_weight <= 100000`) y rechazar con `400 Bad Request` si los supera.

---

## CONTACTO

Reportado por: Equipo Frontend TMS-NAVITEL.
Cualquier duda sobre este documento o sobre el codigo del frontend, consultar al equipo de frontend.

Fin del documento.

