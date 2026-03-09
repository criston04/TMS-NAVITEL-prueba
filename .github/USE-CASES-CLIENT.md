# 👤 CASOS DE USO DEL CLIENTE - TMS NAVITEL

> **Version:** 1.0.0  
> **Ultima Actualizacion:** 1 de Febrero 2026  
> **Perspectiva:** Usuario Cliente/Operador del Sistema

---

## 📋 INDICE

1. [Roles del Sistema](#roles)
2. [Casos de Uso por Modulo](#casos-uso)
3. [Flujos de Usuario Completos](#flujos)
4. [Escenarios de Prueba](#escenarios)
5. [Matriz de Funcionalidades](#matriz)

---

## 👥 ROLES DEL SISTEMA {#roles}

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ROLES Y PERMISOS                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐                                                           │
│  │ ADMINISTRADOR    │  Acceso total a todos los modulos                         │
│  │ (Admin)          │  - Configuracion del sistema                              │
│  │                  │  - Gestion de usuarios                                    │
│  │                  │  - Todos los datos maestros                               │
│  └──────────────────┘                                                           │
│                                                                                  │
│  ┌──────────────────┐                                                           │
│  │ OPERADOR         │  Operaciones diarias                                      │
│  │ (Operator)       │  - Crear/editar ordenes                                   │
│  │                  │  - Monitoreo en tiempo real                               │
│  │                  │  - Programacion de rutas                                  │
│  └──────────────────┘                                                           │
│                                                                                  │
│  ┌──────────────────┐                                                           │
│  │ SUPERVISOR       │  Supervision y reportes                                   │
│  │ (Supervisor)     │  - Visualizar dashboard                                   │
│  │                  │  - Monitoreo sin edicion                                  │
│  │                  │  - Acceso a historicos                                    │
│  └──────────────────┘                                                           │
│                                                                                  │
│  ┌──────────────────┐                                                           │
│  │ CLIENTE          │  Acceso limitado                                          │
│  │ (Client)         │  - Ver sus ordenes                                        │
│  │                  │  - Rastrear envios                                        │
│  │                  │  - Consultar historico                                    │
│  └──────────────────┘                                                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 CASOS DE USO POR MODULO {#casos-uso}

### 1. MODULO MAESTRO - CLIENTES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UC-MC: GESTION DE CLIENTES                               │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MC-01: Crear nuevo cliente
─────────────────────────────
Actor: Administrador, Operador
Precondicion: Usuario autenticado
Flujo Principal:
  1. Usuario navega a Maestro > Clientes
  2. Click en "Nuevo Cliente"
  3. Completa formulario:
     - Nombre comercial (requerido)
     - Razon social
     - RFC/NIT
     - Contacto principal
     - Email (requerido)
     - Telefono
     - Direccion
  4. Click en "Guardar"
  5. Sistema valida datos
  6. Sistema crea el cliente
  7. Sistema muestra confirmacion
Postcondicion: Cliente disponible para asignar a ordenes
Conexiones:
  → Ordenes: Cliente puede ser asignado a nuevas ordenes
  → Workflows: Cliente aparece en filtros de workflows aplicables

UC-MC-02: Editar cliente existente
──────────────────────────────────
Actor: Administrador, Operador
Flujo: Similar a creacion pero con datos precargados
Validaciones:
  - No se puede eliminar cliente con ordenes activas
  - Cambio de estado afecta ordenes futuras

UC-MC-03: Buscar y filtrar clientes
───────────────────────────────────
Actor: Todos los roles
Criterios de busqueda:
  - Por nombre
  - Por codigo
  - Por RFC
  - Por estado (activo/inactivo)
```

### 2. MODULO MAESTRO - VEHICULOS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UC-MV: GESTION DE VEHICULOS                              │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MV-01: Registrar nuevo vehiculo
──────────────────────────────────
Actor: Administrador
Precondicion: Operador logistico existente (opcional)
Flujo Principal:
  1. Usuario navega a Maestro > Vehiculos
  2. Click en "Nuevo Vehiculo"
  3. Completa formulario:
     - Placa (requerida, unica)
     - Tipo de vehiculo (Camion, Trailer, etc.)
     - Marca/Modelo
     - Ano
     - Capacidad de carga (kg)
     - Volumen (m3)
     - ID dispositivo GPS (requerido para monitoreo)
     - Operador logistico (opcional)
  4. Asigna conductor (opcional)
  5. Click en "Guardar"
Postcondicion: Vehiculo listo para asignar a ordenes
Conexiones:
  → Monitoreo: Vehiculo aparece en retransmision y tracking
  → Ordenes: Vehiculo disponible para asignacion
  → Conductores: Relacion 1:1 con conductor

UC-MV-02: Asignar conductor a vehiculo
──────────────────────────────────────
Actor: Administrador, Operador
Flujo:
  1. Seleccionar vehiculo
  2. Click en "Asignar Conductor"
  3. Seleccionar de lista de conductores disponibles
  4. Confirmar asignacion
Validaciones:
  - Conductor no debe estar asignado a otro vehiculo
  - Licencia del conductor vigente

UC-MV-03: Ver estado GPS del vehiculo
────────────────────────────────────
Actor: Todos los roles
Muestra:
  - Estado de conexion (online/offline)
  - Ultima posicion conocida
  - Tiempo sin transmitir
  - Link a monitoreo en tiempo real
```

### 3. MODULO MAESTRO - CONDUCTORES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        UC-MD: GESTION DE CONDUCTORES                             │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MD-01: Registrar nuevo conductor
───────────────────────────────────
Actor: Administrador
Flujo Principal:
  1. Usuario navega a Maestro > Conductores
  2. Click en "Nuevo Conductor"
  3. Completa datos personales:
     - Nombre completo (requerido)
     - Numero de documento
     - Fecha de nacimiento
     - Telefono (requerido)
     - Email
     - Direccion
  4. Completa datos de licencia:
     - Tipo de licencia
     - Numero de licencia
     - Fecha de vencimiento
  5. Guarda conductor
Postcondicion: Conductor disponible para asignar a vehiculos
Conexiones:
  → Vehiculos: Puede ser asignado a un vehiculo
  → Ordenes: Aparece en las ordenes del vehiculo asignado

UC-MD-02: Verificar licencia vigente
────────────────────────────────────
Actor: Sistema (automatico), Administrador
Flujo:
  1. Sistema verifica diariamente licencias
  2. Si licencia vence en 30 dias: Alerta amarilla
  3. Si licencia vencida: Alerta roja, bloquea asignacion
```

### 4. MODULO MAESTRO - GEOCERCAS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UC-MG: GESTION DE GEOCERCAS                              │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MG-01: Crear geocerca (poligono)
───────────────────────────────────
Actor: Administrador, Operador
Precondicion: Mapa cargado
Flujo Principal:
  1. Usuario navega a Maestro > Geocercas
  2. Click en "Nueva Geocerca"
  3. Selecciona tipo: Poligono
  4. En el mapa, dibuja poligono:
     - Click para agregar vertices
     - Doble click para cerrar
  5. Completa datos:
     - Nombre (requerido)
     - Codigo (auto-generado o manual)
     - Categoria (Almacen, Cliente, Puerto, etc.)
     - Color (para visualizacion)
     - Descripcion
  6. Configura alertas:
     - Alerta de entrada
     - Alerta de salida
     - Alerta de tiempo excedido
  7. Guarda geocerca
Postcondicion: Geocerca disponible para workflows y monitoreo
Conexiones:
  → Workflows: Geocerca puede ser paso de un workflow
  → Ordenes: Geocerca puede ser milestone de una orden
  → Monitoreo: Detecta entrada/salida de vehiculos

UC-MG-02: Crear geocerca (circulo)
──────────────────────────────────
Actor: Administrador, Operador
Flujo: Similar pero con radio en metros

UC-MG-03: Editar geocerca existente
───────────────────────────────────
Actor: Administrador, Operador
Validaciones:
  - Si geocerca esta en uso por ordenes activas: Advertencia
  - Permite editar vertices/radio
  - Permite cambiar alertas

UC-MG-04: Ver vehiculos en geocerca
───────────────────────────────────
Actor: Todos los roles
Muestra:
  - Lista de vehiculos actualmente dentro
  - Historial de entradas/salidas recientes
  - Link al monitoreo
```

### 5. MODULO MAESTRO - WORKFLOWS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UC-MW: GESTION DE WORKFLOWS                              │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MW-01: Crear workflow
────────────────────────
Actor: Administrador
Precondicion: Existen geocercas creadas
Flujo Principal:
  1. Usuario navega a Maestro > Workflows
  2. Click en "Nuevo Workflow"
  3. Completa datos basicos:
     - Nombre (requerido)
     - Codigo (unico)
     - Descripcion
     - Es workflow por defecto (checkbox)
  4. Define pasos secuenciales:
     Para cada paso:
       a. Nombre del paso
       b. Selecciona geocerca asociada
       c. Tipo de accion (entrada, salida, manual)
       d. Tiempo estimado (minutos)
       e. Notificaciones configuradas
  5. Configura reglas de escalamiento:
     - Tiempo maximo por paso
     - Acciones si se excede
  6. Asigna clientes aplicables (opcional)
  7. Guarda workflow
Postcondicion: Workflow disponible para ordenes
Conexiones:
  → Ordenes: Workflow se aplica a ordenes nuevas
  → Geocercas: Cada paso referencia una geocerca
  → Clientes: Workflows pueden filtrarse por cliente

UC-MW-02: Duplicar workflow
───────────────────────────
Actor: Administrador
Flujo:
  1. Seleccionar workflow existente
  2. Click en "Duplicar"
  3. Sistema crea copia con nombre "Copia de X"
  4. Usuario edita la copia
Uso: Crear variantes de workflows existentes

UC-MW-03: Activar/Desactivar workflow
─────────────────────────────────────
Actor: Administrador
Estados: Activo, Inactivo, Borrador
Validaciones:
  - No se puede desactivar si hay ordenes activas usandolo
```

### 6. MODULO ORDENES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UC-O: GESTION DE ORDENES                               │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-O-01: Crear nueva orden
──────────────────────────
Actor: Operador
Precondicion: 
  - Cliente existente
  - Workflow existente
  - Vehiculo disponible (opcional)
Flujo Principal:
  1. Usuario navega a Ordenes > Nueva
  2. PASO 1 - Datos basicos:
     - Selecciona cliente (requerido)
     - Numero de orden (auto o manual)
     - Tipo de carga
     - Descripcion de carga
     - Peso total
     - Prioridad (normal, alta, urgente)
  3. PASO 2 - Workflow y ruta:
     - Sistema sugiere workflow basado en cliente
     - Usuario acepta o cambia workflow
     - Sistema genera milestones desde pasos del workflow
     - Usuario puede agregar/quitar waypoints
  4. PASO 3 - Asignacion:
     - Selecciona vehiculo (opcional)
     - Selecciona conductor (o viene con vehiculo)
     - Fechas programadas:
       * Fecha de recoleccion
       * Fecha estimada de entrega
  5. PASO 4 - Confirmacion:
     - Revisa resumen de la orden
     - Click en "Crear Orden"
  6. Sistema valida disponibilidad
  7. Sistema crea orden en estado "pending" o "assigned"
Postcondicion: Orden lista para seguimiento
Conexiones:
  → Workflows: Orden usa pasos del workflow
  → Geocercas: Milestones apuntan a geocercas
  → Vehiculos: Orden asignada a vehiculo
  → Monitoreo: Orden aparece en torre de control
  → Programacion: Orden aparece en calendario

UC-O-02: Ver detalle de orden
─────────────────────────────
Actor: Todos los roles
Muestra:
  - Datos generales (cliente, carga, fechas)
  - Timeline de milestones con estados
  - Mapa con ruta y posicion actual del vehiculo
  - Historial de eventos
  - Documentos adjuntos

UC-O-03: Actualizar estado de orden manualmente
───────────────────────────────────────────────
Actor: Operador
Flujo:
  1. Abrir detalle de orden
  2. Click en "Cambiar Estado"
  3. Seleccionar nuevo estado
  4. Agregar nota/comentario
  5. Confirmar cambio
Estados posibles: draft → pending → assigned → in_transit → completed/cancelled

UC-O-04: Cerrar orden
─────────────────────
Actor: Operador
Precondicion: Orden en estado completado o cancelado
Flujo:
  1. Abrir orden completada
  2. Click en "Cerrar Orden"
  3. Completa datos de cierre:
     - Observaciones finales
     - Documentos (POD, fotos)
     - Incidencias reportadas
  4. Sistema calcula metricas finales
  5. Orden pasa a estado "closed"
```

### 7. MODULO PROGRAMACION

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        UC-P: PROGRAMACION DE ORDENES                             │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-P-01: Ver calendario de ordenes
──────────────────────────────────
Actor: Operador, Supervisor
Vistas disponibles:
  - Por dia
  - Por semana
  - Por mes
Muestra:
  - Ordenes programadas por fecha
  - Codigo de colores por estado
  - Conflictos de recursos

UC-P-02: Reprogramar orden (drag & drop)
────────────────────────────────────────
Actor: Operador
Flujo:
  1. En vista de calendario
  2. Arrastra orden a nueva fecha/hora
  3. Sistema valida disponibilidad
  4. Si hay conflicto: Muestra advertencia
  5. Confirmar cambio
  6. Sistema actualiza fechas de la orden

UC-P-03: Detectar conflictos de recursos
────────────────────────────────────────
Actor: Sistema (automatico)
Conflictos detectados:
  - Vehiculo asignado a multiples ordenes simultaneas
  - Conductor no disponible
  - Superposicion de horarios
Acciones:
  - Alerta visual en calendario
  - Sugerencias de resolucion
```

### 8. MODULO MONITOREO - TORRE DE CONTROL

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      UC-MT: TORRE DE CONTROL (TIEMPO REAL)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MT-01: Visualizar flota en mapa
──────────────────────────────────
Actor: Operador, Supervisor
Flujo:
  1. Usuario accede a Monitoreo > Torre de Control
  2. Sistema carga mapa con todas las unidades
  3. Marcadores muestran:
     - Posicion actual
     - Direccion de movimiento
     - Estado (en movimiento/detenido)
     - Color segun estado de orden
  4. Click en marcador muestra tarjeta con:
     - Placa y conductor
     - Orden actual
     - Progreso de milestones
     - Ultima actualizacion
Actualizacion: Cada 5-10 segundos via WebSocket

UC-MT-02: Filtrar vehiculos
───────────────────────────
Actor: Operador, Supervisor
Filtros:
  - Por transportista/operador
  - Por numero de orden
  - Por cliente
  - Por estado (activos/inactivos)
  - Por estado de orden

UC-MT-03: Centrar en vehiculo especifico
────────────────────────────────────────
Actor: Operador, Supervisor
Flujo:
  1. Buscar vehiculo por placa
  2. Click en resultado
  3. Mapa centra y hace zoom al vehiculo
  4. Muestra ruta planificada si hay orden activa

UC-MT-04: Ver progreso de orden en tiempo real
──────────────────────────────────────────────
Actor: Operador, Supervisor
Muestra:
  - Timeline de milestones
  - Milestone actual resaltado
  - ETA al siguiente milestone
  - Alertas si hay retrasos
```

### 9. MODULO MONITOREO - RETRANSMISION

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     UC-MR: RETRANSMISION (ESTADO GPS)                            │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MR-01: Ver estado de conexion GPS de flota
─────────────────────────────────────────────
Actor: Operador, Supervisor
Muestra tabla con:
  - Vehiculo (placa)
  - Operador/Empresa
  - Empresa GPS
  - Ultima conexion
  - Estado movimiento (En movimiento/Detenido)
  - Estado conexion (En linea/Perdida temporal/Desconectado)
  - Tiempo sin transmitir
  - Comentarios
Actualizacion: Cada 10-15 segundos automatico

UC-MR-02: Filtrar por estado
────────────────────────────
Actor: Operador
Filtros:
  - Por empresa GPS
  - Por estado de conexion
  - Por estado de movimiento
  - Por tiempo desconectado
  - Solo con comentarios

UC-MR-03: Agregar comentario a registro
───────────────────────────────────────
Actor: Operador
Flujo:
  1. Click en fila de vehiculo
  2. Abre modal de comentarios
  3. Escribe comentario (ej: "Se contacto al GPS, reiniciando")
  4. Guarda
  5. Comentario visible para todos los operadores
```

### 10. MODULO MONITOREO - MULTIVENTANA

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    UC-MM: MULTIVENTANA (HASTA 20 UNIDADES)                       │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MM-01: Agregar vehiculos a monitoreo
───────────────────────────────────────
Actor: Operador
Flujo:
  1. Click en "Agregar Unidad"
  2. Buscar por placa
  3. Seleccionar vehiculo(s) - maximo 20
  4. Cada vehiculo aparece en panel individual
Panel muestra:
  - Mini mapa con posicion
  - Placa y conductor
  - Estado de conexion
  - Ultima actualizacion

UC-MM-02: Remover vehiculo del monitoreo
────────────────────────────────────────
Actor: Operador
Flujo: Click en X del panel

UC-MM-03: Persistencia de seleccion
───────────────────────────────────
Sistema: Guarda seleccion en localStorage
Al recargar: Mismos vehiculos aparecen
```

### 11. MODULO MONITOREO - RASTREO HISTORICO

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      UC-MH: RASTREO HISTORICO (PLAYBACK)                         │
└─────────────────────────────────────────────────────────────────────────────────┘

UC-MH-01: Consultar ruta historica
──────────────────────────────────
Actor: Operador, Supervisor
Flujo:
  1. Navegar a Monitoreo > Rastreo Historico
  2. Seleccionar vehiculo
  3. Seleccionar rango de fechas (max 7 dias)
  4. Click en "Buscar"
  5. Sistema carga ruta en el mapa
  6. Muestra estadisticas:
     - Distancia total (km)
     - Velocidad maxima
     - Velocidad promedio
     - Tiempo en movimiento
     - Tiempo detenido
     - Total de puntos

UC-MH-02: Reproducir ruta
─────────────────────────
Actor: Operador, Supervisor
Controles:
  - Play/Pause
  - Stop (reinicia)
  - Velocidad: 1x, 2x, 4x, 8x, 16x, 32x
  - Slider para navegar a cualquier punto
  - Mostrar hora actual en la reproduccion
Visualizacion:
  - Marcador animado recorre la ruta
  - Tooltip con velocidad en cada punto

UC-MH-03: Exportar ruta
───────────────────────
Actor: Operador, Supervisor
Formatos:
  - CSV (puntos con coordenadas)
  - JSON
  - GPX (compatible con GPS)
```

---

## 🔄 FLUJOS DE USUARIO COMPLETOS {#flujos}

### Flujo 1: Ciclo Completo de una Orden

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              FLUJO COMPLETO: VIDA DE UNA ORDEN DE TRANSPORTE                     │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: PREPARACION (Datos Maestros)
────────────────────────────────────
[Admin] Crea cliente "Empresa ABC"
            ↓
[Admin] Crea geocercas:
        - "Bodega Central" (origen)
        - "Sucursal Norte" (destino)
            ↓
[Admin] Crea workflow "Entrega Local":
        - Paso 1: Carga en Bodega Central (30 min)
        - Paso 2: Transito (estimado)
        - Paso 3: Descarga en Sucursal Norte (45 min)
            ↓
[Admin] Registra vehiculo "ABC-123" con GPS
[Admin] Asigna conductor "Juan Perez"

FASE 2: CREACION DE ORDEN
─────────────────────────
[Operador] Crea nueva orden:
           - Cliente: Empresa ABC
           - Workflow: Entrega Local (auto-sugerido)
           - Vehiculo: ABC-123
           - Fecha recoleccion: 02/Feb 8:00 AM
           - Fecha entrega estimada: 02/Feb 2:00 PM
                ↓
[Sistema] Genera milestones desde workflow:
          1. Llegada Bodega Central
          2. Salida Bodega Central
          3. Llegada Sucursal Norte
          4. Salida Sucursal Norte
                ↓
[Sistema] Orden creada en estado "assigned"
[Sistema] Orden aparece en calendario

FASE 3: MONITOREO EN TIEMPO REAL
────────────────────────────────
[Conductor] Inicia viaje, vehiculo sale de base
                ↓
[Sistema] Detecta movimiento via GPS
[Sistema] Torre de Control muestra vehiculo en mapa
                ↓
[Sistema] Vehiculo entra a geocerca "Bodega Central"
[Sistema] Milestone 1 completado automaticamente
[Sistema] Envia notificacion al operador
                ↓
[Operador] Ve progreso en Torre de Control
[Operador] Confirma carga manual si es necesario
                ↓
[Sistema] Vehiculo sale de "Bodega Central"
[Sistema] Milestone 2 completado
[Sistema] Calcula ETA a destino
                ↓
[Durante transito]
[Operador] Monitorea posicion en tiempo real
[Sistema] Actualiza ETA segun velocidad real
                ↓
[Sistema] Vehiculo entra a "Sucursal Norte"
[Sistema] Milestone 3 completado
[Sistema] Notifica llegada al cliente
                ↓
[Conductor] Realiza descarga
[Sistema] Vehiculo sale de "Sucursal Norte"
[Sistema] Milestone 4 completado
[Sistema] Orden pasa a estado "completed"

FASE 4: CIERRE
──────────────
[Operador] Revisa orden completada
[Operador] Agrega documentos (POD, fotos)
[Operador] Cierra orden
[Sistema] Calcula metricas finales:
          - Tiempo total: 5h 30min
          - Distancia: 45 km
          - Retrasos: Ninguno
[Sistema] Orden en estado "closed"

FASE 5: ANALISIS POSTERIOR
──────────────────────────
[Supervisor] Consulta rastreo historico
[Supervisor] Reproduce ruta del vehiculo
[Supervisor] Exporta datos para reporte
```

### Flujo 2: Gestion de Problemas GPS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  FLUJO: DETECCION Y MANEJO DE PERDIDA GPS                        │
└─────────────────────────────────────────────────────────────────────────────────┘

[Sistema] Vehiculo "XYZ-789" deja de transmitir
               ↓
[Sistema] Espera 2 minutos (umbral de tolerancia)
               ↓
[Sistema] Marca como "Perdida temporal" (amarillo)
[Sistema] Actualiza tabla de retransmision
               ↓
[Operador] Ve alerta en tabla de retransmision
[Operador] Filtra por "Perdida temporal"
               ↓
[Operador] Intenta contactar al conductor
           Opcion A: Conductor responde
                     - Confirma problema de senal
                     - Operador agrega comentario
                     - Espera reconexion
           Opcion B: Sin respuesta
                     - Operador escala a supervisor
                     - Contacta empresa GPS
               ↓
[Sistema] Si pasan 15 minutos sin transmision
[Sistema] Marca como "Desconectado" (rojo)
[Sistema] Alerta critica
               ↓
[Operador] Notifica al cliente si hay orden activa
[Operador] Documenta incidencia
               ↓
[Sistema] Vehiculo reconecta
[Sistema] Actualiza estado a "En linea"
[Sistema] Muestra ultima ruta conocida
               ↓
[Operador] Verifica posicion actual
[Operador] Actualiza comentarios
[Operador] Cierra incidencia
```

### Flujo 3: Configuracion de Nuevo Workflow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    FLUJO: CREAR WORKFLOW PERSONALIZADO                           │
└─────────────────────────────────────────────────────────────────────────────────┘

[Admin] Identifica necesidad: Nuevo cliente con ruta especifica
               ↓
PASO 1: Crear geocercas necesarias
────────────────────────────────
[Admin] Crea geocerca "Planta Cliente XYZ" (origen)
[Admin] Crea geocerca "Centro Distribucion" (waypoint)
[Admin] Crea geocerca "Punto Entrega Final" (destino)
               ↓
PASO 2: Crear workflow
────────────────────
[Admin] Nuevo workflow "Ruta Cliente XYZ"
[Admin] Agrega pasos:
        1. Carga en Planta (geocerca: Planta Cliente XYZ)
           - Tiempo estimado: 45 min
           - Accion: Entrada + Salida
        2. Cross-docking (geocerca: Centro Distribucion)
           - Tiempo estimado: 30 min
           - Accion: Entrada + Salida
        3. Entrega final (geocerca: Punto Entrega Final)
           - Tiempo estimado: 60 min
           - Accion: Entrada + Salida
               ↓
PASO 3: Configurar notificaciones
─────────────────────────────────
[Admin] Para cada paso:
        - Notificar llegada al cliente
        - Notificar retraso si > 15 min del estimado
               ↓
PASO 4: Asignar a cliente
─────────────────────────
[Admin] Selecciona "Cliente XYZ" como aplicable
[Admin] Workflow sugerido automaticamente al crear orden
               ↓
PASO 5: Prueba
──────────────
[Admin] Crea orden de prueba
[Admin] Verifica milestones generados
[Admin] Activa workflow
```

---

## 🧪 ESCENARIOS DE PRUEBA {#escenarios}

### Escenarios Funcionales

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ESCENARIOS DE PRUEBA FUNCIONAL                              │
└─────────────────────────────────────────────────────────────────────────────────┘

TEST-001: Crear orden completa
─────────────────────────────
Precondiciones:
  - Cliente "Test Cliente" existe
  - Workflow "Workflow Test" existe con 3 pasos
  - Vehiculo "TEST-001" disponible
Pasos:
  1. Crear nueva orden para "Test Cliente"
  2. Verificar workflow sugerido automaticamente
  3. Asignar vehiculo "TEST-001"
  4. Guardar orden
Resultado esperado:
  - Orden creada con 3 milestones
  - Orden aparece en calendario
  - Vehiculo marcado como "asignado"

TEST-002: Deteccion de entrada a geocerca
─────────────────────────────────────────
Precondiciones:
  - Orden activa con milestone pendiente
  - Vehiculo transmitiendo GPS
Pasos:
  1. Simular movimiento del vehiculo hacia geocerca
  2. Vehiculo entra al area de la geocerca
Resultado esperado:
  - Milestone actualizado a "arrived"
  - Notificacion enviada
  - Timeline actualizado en detalle de orden

TEST-003: Perdida de conexion GPS
─────────────────────────────────
Precondiciones:
  - Vehiculo en estado "online"
Pasos:
  1. Detener transmision GPS del vehiculo
  2. Esperar 2 minutos
  3. Verificar tabla de retransmision
  4. Esperar 15 minutos mas
Resultado esperado:
  - A los 2 min: Estado "temporary_loss"
  - A los 17 min: Estado "disconnected"
  - Contador de tiempo incrementando

TEST-004: Reproductor de ruta historica
───────────────────────────────────────
Precondiciones:
  - Vehiculo con historico de rutas guardado
Pasos:
  1. Seleccionar vehiculo
  2. Seleccionar rango de 24 horas
  3. Buscar ruta
  4. Reproducir a velocidad 8x
  5. Pausar en punto especifico
  6. Exportar a CSV
Resultado esperado:
  - Ruta cargada con puntos
  - Reproduccion fluida
  - Exportacion exitosa con todos los campos

TEST-005: Conflicto de recursos en programacion
───────────────────────────────────────────────
Precondiciones:
  - Orden A asignada a vehiculo "ABC-123" el 5/Feb 9:00-14:00
Pasos:
  1. Crear Orden B para vehiculo "ABC-123" el 5/Feb 10:00-16:00
Resultado esperado:
  - Sistema detecta conflicto
  - Muestra advertencia con detalle
  - Permite forzar o reprogramar
```

---

## 📊 MATRIZ DE FUNCIONALIDADES {#matriz}

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE FUNCIONALIDADES POR ROL                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Funcionalidad                    │ Admin │ Operador │ Supervisor │ Cliente    │
│  ─────────────────────────────────┼───────┼──────────┼────────────┼─────────── │
│  MAESTRO                          │       │          │            │            │
│  Crear/Editar Clientes            │  ✅   │    ✅    │     ❌     │     ❌    │
│  Crear/Editar Vehiculos           │  ✅   │    ❌    │     ❌     │     ❌    │
│  Crear/Editar Conductores         │  ✅   │    ❌    │     ❌     │     ❌    │
│  Crear/Editar Geocercas           │  ✅   │    ✅    │     ❌     │     ❌    │
│  Crear/Editar Workflows           │  ✅   │    ❌    │     ❌     │     ❌    │
│  Ver datos maestros               │  ✅   │    ✅    │     ✅     │     ❌    │
│  ─────────────────────────────────┼───────┼──────────┼────────────┼─────────── │
│  ORDENES                          │       │          │            │            │
│  Crear ordenes                    │  ✅   │    ✅    │     ❌     │     ❌    │
│  Editar ordenes                   │  ✅   │    ✅    │     ❌     │     ❌    │
│  Cancelar ordenes                 │  ✅   │    ✅    │     ❌     │     ❌    │
│  Ver todas las ordenes            │  ✅   │    ✅    │     ✅     │     ❌    │
│  Ver ordenes propias              │  ✅   │    ✅    │     ✅     │     ✅    │
│  Cerrar ordenes                   │  ✅   │    ✅    │     ❌     │     ❌    │
│  ─────────────────────────────────┼───────┼──────────┼────────────┼─────────── │
│  PROGRAMACION                     │       │          │            │            │
│  Ver calendario                   │  ✅   │    ✅    │     ✅     │     ❌    │
│  Reprogramar ordenes              │  ✅   │    ✅    │     ❌     │     ❌    │
│  Resolver conflictos              │  ✅   │    ✅    │     ❌     │     ❌    │
│  ─────────────────────────────────┼───────┼──────────┼────────────┼─────────── │
│  MONITOREO                        │       │          │            │            │
│  Torre de Control                 │  ✅   │    ✅    │     ✅     │     ❌    │
│  Retransmision (ver)              │  ✅   │    ✅    │     ✅     │     ❌    │
│  Retransmision (comentar)         │  ✅   │    ✅    │     ❌     │     ❌    │
│  Multiventana                     │  ✅   │    ✅    │     ✅     │     ❌    │
│  Rastreo Historico                │  ✅   │    ✅    │     ✅     │     ❌    │
│  Exportar rutas                   │  ✅   │    ✅    │     ✅     │     ❌    │
│  ─────────────────────────────────┼───────┼──────────┼────────────┼─────────── │
│  DASHBOARD                        │       │          │            │            │
│  Ver KPIs globales                │  ✅   │    ✅    │     ✅     │     ❌    │
│  Ver estadisticas                 │  ✅   │    ✅    │     ✅     │     ❌    │
│  Rastrear orden especifica        │  ✅   │    ✅    │     ✅     │     ✅    │
│                                   │       │          │            │            │
└─────────────────────────────────────────────────────────────────────────────────┘

Leyenda: ✅ Permitido | ❌ No permitido
```

---

## 📎 ANEXOS

### A1. Estados de una Orden

```
draft ─────► pending ─────► assigned ─────► in_transit ─────► completed ─────► closed
  │             │               │               │                  │
  │             │               │               │                  │
  └─────────────┴───────────────┴───────────────┴──────────────────┘
                                    │
                                    ▼
                               cancelled
```

### A2. Estados de un Milestone

```
pending ─────► approaching ─────► arrived ─────► in_progress ─────► completed
    │                                                                    │
    └────────────────────────────► skipped ◄─────────────────────────────┘
                                      │
                                      ▼
                                  delayed (flag, no estado final)
```

### A3. Estados de Retransmision

```
online ─────► temporary_loss ─────► disconnected
   ▲                │                     │
   │                │                     │
   └────────────────┴─────────────────────┘
         (reconexion automatica)
```

---

**Documento generado automaticamente - TMS-NAVITEL v1.0.0**
