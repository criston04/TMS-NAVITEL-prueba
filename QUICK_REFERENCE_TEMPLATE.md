# ============================================================================
# PLANTILLA QUICK REFERENCE — TMS NAVITEL
# ============================================================================
#
# USO: Este archivo es la guia de formato para generar documentacion
#      QUICK_REFERENCE de cualquier modulo del TMS Navitel.
#
# INSTRUCCIONES:
#   1. Analizar el codigo fuente del modulo (types, hooks, services, components)
#   2. Copiar esta plantilla y reemplazar todos los {{PLACEHOLDER}}
#   3. Eliminar las lineas que empiezan con "# >" (son instrucciones)
#   4. Auditar contra los 16 puntos de verificacion (seccion final)
#
# CONVENCIONES OBLIGATORIAS:
#   - NO emojis decorativos (solo simbolos de leyenda: check, gear, x)
#   - Roles: SOLO Owner, Usuario Maestro, Subusuario (3 de Edson)
#   - Multi-tenant: TODOS los queries filtran por tenant_id del JWT
#   - Idioma: Espanol sin acentos en los textos tecnicos
#   - Formato de tablas: Markdown estandar
#
# ============================================================================

# Referencia Rapida — Modulo de {{MODULE_NAME}}
## TMS Navitel · Cheat Sheet para Desarrollo

> **Fecha:** {{MONTH}} {{YEAR}}
> **Proposito:** Consulta rapida para desarrolladores. {{MODULE_PURPOSE_1_LINE}}

---

## Indice

| # | Seccion |
|---|---------|
| 1 | [Contexto del Modulo](#1-contexto-del-modulo) |
| 2 | [Entidades del Dominio](#2-entidades-del-dominio) |
| 3 | [Modelo de Base de Datos — PostgreSQL](#3-modelo-de-base-de-datos--postgresql) |
| 4 | [Maquina de Estados — {{STATE_MACHINE_1_NAME}}](#4-maquina-de-estados--{{STATE_MACHINE_1_ANCHOR}}) |
| 5 | [Maquina de Estados — {{STATE_MACHINE_2_NAME}}](#5-maquina-de-estados--{{STATE_MACHINE_2_ANCHOR}}) |
| 6 | [Maquina de Estados — {{STATE_MACHINE_3_NAME}}](#6-maquina-de-estados--{{STATE_MACHINE_3_ANCHOR}}) |
| 7 | [Tabla de Referencia Operativa de Transiciones](#7-tabla-de-referencia-operativa-de-transiciones) |
| 8 | [Casos de Uso — Referencia Backend](#8-casos-de-uso--referencia-backend) |
| 9 | [Endpoints API REST](#9-endpoints-api-rest) |
| 10 | [Eventos de Dominio](#10-eventos-de-dominio) |
| 11 | [Reglas de Negocio Clave](#11-reglas-de-negocio-clave) |
| 12 | [Catalogo de Errores HTTP](#12-catalogo-de-errores-http) |
| 13 | [Permisos RBAC](#13-permisos-rbac) |
| 14 | [Diagrama de Componentes](#14-diagrama-de-componentes) |
| 15 | [Diagrama de Despliegue](#15-diagrama-de-despliegue) |

# > NOTA: Si el modulo tiene menos de 3 maquinas de estado, renombrar
# > la seccion 5 o 6 a algo relevante o fusionar con la seccion 4.
# > Ejemplo: "4. Maquina de Estados — MainStatus"
# >          "5. Maquina de Estados — SubStatus"
# >          "6. (Reservada — usar para sub-estados o feature flags)"

---

# 1. Contexto del Modulo

# > DIAGRAMA: Mermaid graph TB mostrando:
# >   - El modulo central en un subgraph "TMS Navitel"
# >   - Modulos que PROVEEN datos a este (flechas entrantes)
# >   - Modulos que CONSUMEN datos de este (flechas salientes)
# >   - Sistemas externos relevantes

```mermaid
graph TB
    subgraph "TMS Navitel"
        MOD["MODULO {{MODULE_NAME_UPPER}}<br/>({{MODULE_SUBTITLE}})"]
    end

    {{INCOMING_MODULES}}
    {{OUTGOING_MODULES}}
    {{EXTERNAL_SYSTEMS}}

    {{ARROWS}}
```

**Responsabilidades:** {{RESPONSIBILITIES_TEXT}}

---

# 2. Entidades del Dominio

# > DIAGRAMA: Mermaid erDiagram con las relaciones entre entidades
# > TABLA: Listar todas las entidades con: Entidad, Tipo, Campos clave, Descripcion
# > TABLA ADICIONAL: "Campos clave de [EntidadRaiz] (resumen)" con: Campo, Tipo, Obligatorio, Descripcion rapida

```mermaid
erDiagram
    {{ER_RELATIONSHIPS}}
```

| Entidad | Tipo | Campos clave | Descripcion |
|---|---|---|---|
| {{ENTITY_ROWS}} |

### Campos clave de {{ROOT_ENTITY}} (resumen)

| Campo | Tipo | Obligatorio | Descripcion rapida |
|---|---|---|---|
| {{ROOT_ENTITY_FIELDS}} |

---

# 3. Modelo de Base de Datos — PostgreSQL

> Esquema relacional para PostgreSQL + PostGIS. Todas las tablas usan `UUID` como PK y timestamps UTC. Filtro `tenant_id` obligatorio en todas las consultas (multi-tenant).

# > DIAGRAMA: Mermaid erDiagram con TODAS las tablas del modulo y sus columnas
# > TABLAS: Para cada tabla, documentar TODAS las columnas con:
# >   Columna | Tipo PostgreSQL | Nullable | Default | Constraint | Descripcion
# > NOTAS: Agregar notas relevantes (ej: particionamiento, campos condicionales, etc.)
# > INDICES: Tabla de indices recomendados
# > FK EXTERNAS: Diagrama con relaciones a tablas de otros modulos

### Diagrama Entidad-Relacion

```mermaid
erDiagram
    {{DB_ER_DIAGRAM}}
```

### Tablas, Columnas y Tipos de Dato

# > REPETIR ESTE BLOQUE POR CADA TABLA:

#### Tabla: `{{TABLE_NAME}}` ({{TABLE_DESCRIPTION}})

> {{TABLE_NOTES}}

| Columna | Tipo PostgreSQL | Nullable | Default | Constraint | Descripcion |
|---|---|---|---|---|---|
| {{TABLE_COLUMNS}} |

### Indices Recomendados

| Tabla | Indice | Columnas | Tipo | Justificacion |
|---|---|---|---|---|
| {{INDEX_ROWS}} |

### Relaciones con Tablas de Otros Modulos (FK externas)

```mermaid
erDiagram
    {{EXTERNAL_FK_DIAGRAM}}
```

---

# 4. Maquina de Estados — {{STATE_MACHINE_1_NAME}}

**{{SM1_STATE_COUNT}} estados{{SM1_TERMINAL_INFO}}**

```mermaid
stateDiagram-v2
    {{SM1_DIAGRAM}}
```

### Tabla de estados

| # | Estado | Etiqueta | Color | Terminal | Transiciones de salida |
|---|---|---|---|---|---|
| {{SM1_STATES_TABLE}} |

---

# 5. Maquina de Estados — {{STATE_MACHINE_2_NAME}}

**{{SM2_STATE_COUNT}} estados{{SM2_TERMINAL_INFO}}**

```mermaid
stateDiagram-v2
    {{SM2_DIAGRAM}}
```

### Tabla de estados

| # | Estado | Etiqueta | Color | Terminal | Transiciones de salida |
|---|---|---|---|---|---|
| {{SM2_STATES_TABLE}} |

---

# 6. Maquina de Estados — {{STATE_MACHINE_3_NAME}}

**{{SM3_STATE_COUNT}} estados{{SM3_TERMINAL_INFO}}**

```mermaid
stateDiagram-v2
    {{SM3_DIAGRAM}}
```

### Tabla de estados

| # | Estado | Etiqueta | Color | Terminal | Transiciones de salida |
|---|---|---|---|---|---|
| {{SM3_STATES_TABLE}} |

---

# 7. Tabla de Referencia Operativa de Transiciones

> Tabla unificada que cruza: estado origen/destino, endpoint/trigger, payload, validaciones, actor, evento emitido e idempotencia.

# > FORMATO DE TABLA (adaptable segun tipo de transicion):
# > Para transiciones con endpoint HTTP:
# >   | # | From | To | Endpoint | Payload | Validaciones | Actor | Evento | Idempotente |
# > Para transiciones automaticas (sistema):
# >   | # | From | To | Trigger | Validaciones | Actor | Evento | Idempotente |
# >
# > ACTORES VALIDOS: Owner / Usuario Maestro / Subusuario (permiso:xxx) / Sistema / Sistema GPS
# > NUMERAR: T-01, T-02, T-03, etc.
# > RESTRICCIONES: Agregar notas "Restriccion T-XX" despues de la tabla para transiciones admin-only

### Transiciones de {{STATE_MACHINE_1_NAME}}

| # | From | To | {{TRIGGER_OR_ENDPOINT}} | Validaciones | Actor | Evento | Idempotente |
|---|---|---|---|---|---|---|---|
| {{TRANSITIONS_SM1}} |

### Transiciones de {{STATE_MACHINE_2_NAME}}

| # | From | To | {{TRIGGER_OR_ENDPOINT}} | Validaciones | Actor | Evento | Idempotente |
|---|---|---|---|---|---|---|---|
| {{TRANSITIONS_SM2}} |

### Transiciones de {{STATE_MACHINE_3_NAME}}

| # | From | To | {{TRIGGER_OR_ENDPOINT}} | Validaciones | Actor | Evento | Idempotente |
|---|---|---|---|---|---|---|---|
| {{TRANSITIONS_SM3}} |

# > RESTRICCIONES ADMINISTRATIVAS (agregar si aplica):
# > > **Restriccion T-XX:** [Descripcion]. Solo **Owner** o **Usuario Maestro**. Subusuario NO tiene acceso.

---

# 8. Casos de Uso — Referencia Backend

> **{{CU_COUNT}} Casos de Uso** con precondiciones, flujo principal, excepciones y postcondiciones.

### Matriz Actor x Caso de Uso

# > ESTA SECCION ES CRITICA PARA RBAC. FORMATO FIJO:
# > Linea 1 (modelo): > **Modelo de 3 roles (definicion Edson):** Owner (Super Admin TMS), Usuario Maestro (Admin de cuenta cliente), Subusuario (Operador con permisos configurables).
# > Linea 2 (leyenda): > **Leyenda:** check = Permitido | gear = Permitido si el Usuario Maestro le asigno el permiso | x = Denegado
# > Tabla: columnas = Caso de Uso | Owner | Usuario Maestro | Subusuario | [Sistema si aplica]
# > Para Subusuario: usar "gear `permiso:xxx`" o "x" (nunca check sin permiso)

> **Modelo de 3 roles (definicion Edson):** Owner (Super Admin TMS), Usuario Maestro (Admin de cuenta cliente), Subusuario (Operador con permisos configurables).
> **Leyenda:** ✅ = Permitido | ⚙️ = Permitido si el Usuario Maestro le asigno el permiso | ❌ = Denegado

| Caso de Uso | Owner | Usuario Maestro | Subusuario | {{SISTEMA_COL_IF_NEEDED}} |
|---|:---:|:---:|:---:|:---:|
| {{CU_MATRIX_ROWS}} |

# > RESTRICCIONES: Agregar notas despues de la matriz:
# > > **Restriccion CU-XX:** [Que restriccion y por que]. Solo Owner y Usuario Maestro.
# > > **Nota:** Los permisos del Subusuario son configurables por el Usuario Maestro. Un Subusuario sin el permiso correspondiente recibira HTTP `403 FORBIDDEN`.

---

# > REPETIR ESTE BLOQUE POR CADA CASO DE USO:
# > Estructura obligatoria de cada CU:

## CU-{{NN}}: {{CU_TITLE}}

| Atributo | Valor |
|---|---|
| **Endpoint** | `{{HTTP_METHOD}} /api/v1/{{MODULE_PATH}}/{{ENDPOINT}}` |
| **Actor Principal** | {{ACTOR_PRINCIPAL}} |
| **Trigger** | {{TRIGGER_DESCRIPTION}} |
| **Frecuencia** | {{FREQUENCY}} |

# > ACTOR PRINCIPAL: usar SOLO estos formatos:
# >   - Owner / Usuario Maestro / Subusuario (permiso `modulo:accion`)
# >   - Owner / Usuario Maestro. Subusuario: DENEGADO
# >   - Sistema (interno/GPS/automatico)

**Precondiciones (backend DEBE validar)**

| # | Precondicion | Si no se cumple |
|---|---|---|
| PRE-01 | Token JWT valido y no expirado | HTTP `401 UNAUTHORIZED` |
| PRE-02 | Usuario tiene permiso `{{PERMISSION}}` | HTTP `403 FORBIDDEN` |
| {{ADDITIONAL_PRECONDITIONS}} |

# > PRE-01 y PRE-02 son SIEMPRE los mismos (auth + permiso). Solo cambia el nombre del permiso.

**Secuencia Backend (flujo principal)**

| Paso | Accion del backend | Detalle |
|---|---|---|
| {{SEQUENCE_STEPS}} |

**Postcondiciones (backend DEBE garantizar)**

| # | Postcondicion | Verificacion |
|---|---|---|
| {{POSTCONDITIONS}} |

**Excepciones**

| HTTP | Codigo | Cuando | Respuesta |
|---|---|---|---|
| {{EXCEPTIONS}} |

# > DIAGRAMA: Mermaid graph TD con flujo del CU (decision tree)
# > OPCIONAL: sequenceDiagram para CUs complejos multi-actor

```mermaid
graph TD
    {{CU_FLOW_DIAGRAM}}
```

---

# > AL FINAL DE TODOS LOS CUs: Diagrama general de interaccion

### Diagrama general de interaccion CU

```mermaid
sequenceDiagram
    {{GENERAL_SEQUENCE_DIAGRAM}}
```

---

# 9. Endpoints API REST

**Base path:** `/api/v1/{{MODULE_PATH}}`

# > AGRUPAR endpoints por sub-modulo o entidad
# > COLUMNAS OBLIGATORIAS: #, Metodo, Endpoint, Descripcion, Permiso, Request/Query, Response
# > NUMERAR: E-01, E-02, etc.

### {{ENDPOINT_GROUP_NAME}}

| # | Metodo | Endpoint | Descripcion | Permiso | Request/Query | Response |
|---|---|---|---|---|---|---|
| {{ENDPOINT_ROWS}} |

---

# 10. Eventos de Dominio

### Catalogo

| Evento | Payload | Se emite cuando | Modulos suscriptores |
|---|---|---|---|
| {{EVENT_ROWS}} |

### Diagrama de propagacion

```mermaid
graph LR
    {{EVENT_PROPAGATION_DIAGRAM}}
```

---

# 11. Reglas de Negocio Clave

| # | Regla | Descripcion |
|---|---|---|
| R-01 | Aislamiento multi-tenant | Todas las consultas filtran por `tenant_id` del JWT. Un usuario NUNCA puede ver datos de otro tenant |
| {{BUSINESS_RULES}} |

# > R-01 (multi-tenant) es SIEMPRE la primera regla en todos los modulos.
# > Numerar secuencialmente: R-01, R-02, R-03, etc.

---

# 12. Catalogo de Errores HTTP

| HTTP | Codigo interno | Cuando ocurre | Resolucion |
|---|---|---|---|
| 400 | VALIDATION_ERROR | Campos invalidos segun schema Zod | Leer details: mapa {campo: mensaje} |
| 401 | UNAUTHORIZED | Token JWT ausente o expirado | Redirigir a /login |
| 403 | FORBIDDEN | Sin permisos para la operacion | Verificar rol del usuario y permisos (ver seccion 13) |
| {{MODULE_SPECIFIC_ERRORS}} |
| 500 | INTERNAL_ERROR | Error inesperado del servidor | Reintentar; si persiste, contactar soporte |

# > Los primeros 3 errores (400, 401, 403) y el ultimo (500) son SIEMPRE iguales.
# > Solo agregar los errores ESPECIFICOS del modulo entre ellos (404, 409, 422, etc.)

---

# 13. Permisos RBAC

# > ESTA SECCION TIENE FORMATO FIJO. Solo cambian los permisos especificos del modulo.

**3 niveles jerarquicos (definicion de Edson). Arquitectura Multi-tenant con RBAC granular por modulo y por accion.**

```
Owner (Proveedor TMS)
   +-- Cuenta Cliente (Tenant)
           +-- Usuario Maestro
                   +-- Subusuarios
```

> **Modelo de 3 roles (definicion Edson):** Owner (Super Admin TMS), Usuario Maestro (Admin de cuenta cliente), Subusuario (Operador con permisos configurables).
> **Leyenda:** ✅ = Permitido | ⚙️ = Permitido si el Usuario Maestro le asigno el permiso | ❌ = Denegado

| Permiso | Owner | Usuario Maestro | Subusuario |
|---|:---:|:---:|:---:|
| {{PERMISSION_ROWS}} |

# > REGLAS PARA LA TABLA DE PERMISOS:
# > - Owner: SIEMPRE check (acceso total)
# > - Usuario Maestro: SIEMPRE check (acceso total dentro de su empresa)
# > - Subusuario: gear (configurable) o x (denegado)
# >   - Acciones de CONFIG/ADMIN -> x (crear reglas, eliminar datos, configurar sistema)
# >   - Acciones OPERATIVAS -> gear `permiso:accion` (ver, crear, editar datos operativos)
# > - Formato permiso: `modulo:accion` (ej: orders:view, monitoring:alerts_manage)

> **Owner:** Rol maximo del sistema (proveedor TMS). Acceso total sin restricciones a todas las cuentas. Puede crear/suspender/eliminar cuentas de clientes, activar/desactivar modulos, crear Usuarios Maestros, resetear credenciales.
> **Usuario Maestro:** Administrador principal de una cuenta cliente. Control total SOLO dentro de su empresa. Crea subusuarios, asigna roles y permisos internos por modulo, asigna unidades, restringe visibilidad por grupo/flota/geocerca. NO puede crear cuentas, activar modulos no contratados, ni ver otras cuentas.
> **Subusuario:** Operador con permisos limitados definidos por el Usuario Maestro. NO puede crear usuarios, modificar estructura de permisos, activar/desactivar modulos, ni cambiar configuracion de la cuenta.
> **Multi-tenant:** Todos los queries filtran por `tenant_id` del JWT. Un Subusuario solo ve datos del tenant al que pertenece.
{{MODULE_SPECIFIC_RBAC_NOTES}}

### Restricciones del Subusuario

- {{DENIED_PERMISSION_1}}: {{WHY_DENIED_1}}
- {{DENIED_PERMISSION_2}}: {{WHY_DENIED_2}}
- El Subusuario **NO puede**: crear usuarios, modificar estructura de permisos, activar/desactivar modulos, cambiar configuracion de la cuenta, acceder a datos de otros tenants.
- El Subusuario **SI puede** (si tiene el permiso asignado): {{ALLOWED_ACTIONS_LIST}}

---

# 14. Diagrama de Componentes

# > Diagrama Mermaid graph TB con subgraphs por capa:
# >   - Capa Presentacion (Pages)
# >   - Capa Logica (Hooks)
# >   - Capa Servicios (Services)
# >   - Infraestructura (EventBus, Cache, etc.)

```mermaid
graph TB
    subgraph "Modulo de {{MODULE_NAME}}"
        subgraph "Capa Presentacion - Next.js"
            {{PRESENTATION_NODES}}
        end

        subgraph "Capa Logica - React Hooks"
            {{HOOKS_NODES}}
        end

        subgraph "Capa Servicios"
            {{SERVICES_NODES}}
        end

        subgraph "Infraestructura"
            {{INFRA_NODES}}
        end
    end

    {{COMPONENT_ARROWS}}
```

---

# 15. Diagrama de Despliegue

# > Este diagrama es MAYORMENTE IGUAL para todos los modulos.
# > Solo cambiar los nodos de Servicios Externos si el modulo
# > se conecta a APIs especificas.

```mermaid
graph TB
    subgraph "Nodo: Cloud Server - Vercel"
        FE["Next.js Frontend<br/>App Router + SSR<br/>React 19"]
    end

    subgraph "Nodo: API Backend"
        API["REST API<br/>Node.js"]
        WS["WebSocket Server<br/>Eventos tiempo real"]
    end

    subgraph "Nodo: Base de Datos"
        DB["PostgreSQL<br/>+ PostGIS"]
    end

    subgraph "Nodo: Message Broker"
        EVT["tmsEventBus<br/>Redis Pub/Sub"]
    end

    subgraph "Nodo: Servicios Externos"
        {{EXTERNAL_SERVICE_NODES}}
    end

    subgraph "Nodo: Almacenamiento"
        S3["S3 / GCS<br/>Archivos, fotos, adjuntos"]
    end

    FE -->|HTTPS REST| API
    FE -->|WSS| WS
    API -->|SQL| DB
    API -->|publish| EVT
    API -->|presigned URLs| S3
    EVT -->|notify| WS
    WS -->|subscribe| EVT
    {{EXTERNAL_ARROWS}}
```

---

> **Nota:** Este documento es una referencia operativa para desarrollo frontend y backend. Incluye los {{CU_COUNT}} Casos de Uso con precondiciones, secuencia, postcondiciones y excepciones. Para detalles de implementacion frontend, consultar el codigo fuente del modulo.

---

# ============================================================================
# CHECKLIST DE AUDITORIA — 16 PUNTOS
# ============================================================================
#
# Ejecutar despues de completar cada QUICK_REFERENCE:
#
# --- ROLES DE EDSON (8 puntos) ---
# [ ] 1. Solo 3 roles: Owner, Usuario Maestro, Subusuario (sin RFC antiguos)
# [ ] 2. Descripciones de roles coinciden con definiciones de Edson
# [ ] 3. Leyenda CU Matrix: check=Permitido | gear=Configurable | x=Denegado
# [ ] 4. Actor Principal de cada CU usa SOLO 3 roles + Sistema
# [ ] 5. Columna Actor de transiciones usa SOLO 3 roles + Sistema
# [ ] 6. Tabla RBAC usa SOLO columnas Owner, Usuario Maestro, Subusuario
# [ ] 7. No existe tabla "Roles del RFC" ni "mapeo extendido"
# [ ] 8. Restricciones del Subusuario documentadas (puede/no puede)
#
# --- FORMATO (6 puntos) ---
# [ ] 9.  15 secciones presentes con numeracion correcta
# [ ] 10. Links del indice coinciden con headers reales
# [ ] 11. Diagramas Mermaid: contexto, ER, estados, CU flows, eventos, componentes, despliegue
# [ ] 12. Cada CU tiene: Atributo, Precondiciones, Secuencia, Postcondiciones (min 4 tablas)
# [ ] 13. Endpoints: columnas #, Metodo, Endpoint, Descripcion, Permiso, Request/Query, Response
# [ ] 14. RBAC: jerarquia + tabla permisos + notas restriccion
#
# --- CONTENIDO (2 puntos) ---
# [ ] 15. Cero emojis decorativos (solo simbolos de leyenda)
# [ ] 16. Nota multi-tenant presente ("queries filtran por tenant_id del JWT")
#
# RESULTADO ESPERADO: 16/16 PASS
# ============================================================================
