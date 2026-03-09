# 📋 TODO LIST - MÓDULO DE MONITOREO TMS-NAVITEL

> **Fecha de Creación:** 31 de enero de 2026  
> **Última Actualización:** 2 de febrero de 2026  
> **Módulo:** Monitoreo (Retransmisión, Torre de Control, Multiventana, Rastreo Histórico)  
> **Prioridad:** Alta  
> **Estado:** ✅ **IMPLEMENTACIÓN COMPLETA** (Frontend con mocks)

---

## 🔍 ANÁLISIS DE FUNCIONALIDAD DETALLADO (Revisión 02/Feb/2026)

### ✅ Módulos Verificados y Funcionando

#### 1. **RETRANSMISIÓN** - Estado: ✅ FUNCIONAL
| Componente | Estado | Notas |
|------------|--------|-------|
| `useRetransmission` hook | ✅ | Auto-refresh 15s, filtros, actualización comentarios |
| `RetransmissionService` | ✅ | getAll, getStats, updateComment, getGpsCompanies |
| `RetransmissionContainer` | ✅ | Integra stats, filtros, tabla, modal comentarios |
| `RetransmissionTable` | ✅ | Sorting funcional, badges de estado |
| `CommentModal` | ✅ | CRUD de comentarios funcional |
| Mocks | ✅ | 50+ registros generados dinámicamente |

#### 2. **TORRE DE CONTROL** - Estado: ✅ FUNCIONAL
| Componente | Estado | Notas |
|------------|--------|-------|
| `useVehicleTracking` hook | ✅ | WebSocket mock, actualización en tiempo real simulada |
| `TrackingService` | ✅ | getActiveVehicles, getOrderByVehicle, filtros |
| `ControlTowerContainer` | ✅ | Sidebar con tabs, mapa, info de vehículo |
| `ControlTowerMap` | ✅ | Leaflet dinámico, marcadores SVG personalizados |
| `VehicleMarker` | ✅ | Icono de camión con indicador de estado |
| `VehicleInfoCard` | ✅ | Muestra orden activa, hitos, estado conexión |
| `MilestoneList` | ✅ | Timeline vertical de hitos |
| Simulación movimiento | ✅ | Vehículos se mueven en rutas predefinidas de Lima |

#### 3. **MULTIVENTANA** - Estado: ✅ FUNCIONAL
| Componente | Estado | Notas |
|------------|--------|-------|
| `useMultiWindow` hook | ✅ | Persistencia localStorage, máx 20 paneles |
| `MultiWindowContainer` | ✅ | Selector de vehículos, controles de layout |
| `MultiWindowGrid` | ✅ | CSS Grid responsive (2x2, 3x3, 4x4, 5x4) |
| `VehiclePanel` | ✅ | Mini mapa + info de cada vehículo |
| `VehicleSelectorModal` | ✅ | Selección múltiple con búsqueda |
| `VehicleMiniMap` | ✅ | Leaflet pequeño con marcador centrado |

#### 4. **RASTREO HISTÓRICO** - Estado: ✅ FUNCIONAL
| Componente | Estado | Notas |
|------------|--------|-------|
| `useHistoricalRoute` hook | ✅ | Carga ruta, validación, caché |
| `useRoutePlayback` hook | ✅ | Play/pause/stop, velocidades 1x-32x, seek |
| `HistoricalService` | ✅ | getRoute, exportRoute (CSV/JSON/GPX), validación |
| `HistoricalContainer` | ✅ | Sidebar + mapa + controles playback |
| `HistoricalMap` | ✅ | Polyline de ruta, marcador animado actual |
| `PlaybackControls` | ✅ | Slider, velocidades, step forward/backward |
| `ExportButton` | ✅ | Descarga en 3 formatos |
| `SearchForm` | ✅ | Selector vehículo + DateTimePicker |
| Mocks | ✅ | Rutas con 60-150 puntos, paradas simuladas |

---

### ⚠️ Puntos de Atención Identificados

#### 1. WebSocket en Modo Mock
```typescript
// src/services/monitoring/websocket.service.ts línea ~55
private useMock = true; // ⚠️ Cambiar a false para producción
```
**Impacto:** Torre de Control y Multiventana usan simulación local de movimiento en vez de WebSocket real.
**Acción requerida:** Implementar backend WebSocket y cambiar `useMock = false`.

#### 2. Simulación de Movimiento en Hook
```typescript
// src/hooks/monitoring/use-vehicle-tracking.ts líneas ~290-340
// SIMULACIÓN DE MOVIMIENTO EN TIEMPO REAL (para desarrollo)
useEffect(() => {
  const simulationInterval = setInterval(() => { ... }, 2000);
  ...
});
```
**Impacto:** Los vehículos se mueven cada 2 segundos con deltas aleatorios.
**Nota:** Funciona correctamente para desarrollo/demo.

#### 3. Rutas Predefinidas en Lima
Los mocks usan coordenadas reales de Lima:
- Vía Expresa (Norte-Sur)
- Javier Prado (Este-Oeste)
- Panamericana Sur
- Av. Arequipa
- Costa Verde

**Esto es correcto** para el proyecto TMS-NAVITEL orientado a Perú.

---

### 📊 Métricas de Código del Módulo

| Métrica | Valor |
|---------|-------|
| **Archivos totales** | 70+ |
| **Hooks** | 6 hooks completos |
| **Servicios** | 4 servicios con singleton |
| **Componentes** | 40+ componentes |
| **Tipos/Interfaces** | 30+ tipos en monitoring.ts |
| **Líneas de código** | ~5,000+ LOC |
| **Cobertura tests** | 0% (pendiente) |

---

## 📈 RESUMEN DE PROGRESO

| Fase | Descripción | Estado | Progreso |
|------|-------------|--------|----------|
| **FASE 0** | Preparación | ✅ Completada | 100% |
| **FASE 1** | Tipos y Modelos | ✅ Completada | 100% |
| **FASE 2** | Datos Mock | ✅ Completada | 100% |
| **FASE 3** | Servicios | ✅ Completada | 100% |
| **FASE 4** | Hooks | ✅ Completada | 100% |
| **FASE 5** | Componentes Comunes | ✅ Completada | 100% |
| **FASE 6** | Módulo Retransmisión | ✅ Completada | 100% |
| **FASE 7** | Módulo Torre de Control | ✅ Completada | 100% |
| **FASE 8** | Módulo Multiventana | ✅ Completada | 100% |
| **FASE 9** | Módulo Rastreo Histórico | ✅ Completada | 100% |
| **FASE 10** | Testing | ⏳ Pendiente | 0% |
| **FASE 11** | Optimización | ⏳ Pendiente | 20% |

**Total Implementación Frontend:** ~95%  
**Pendiente:** Tests unitarios, optimizaciones finales, backend WebSocket real

---

## 📊 ANÁLISIS DE CONEXIONES

### Módulos Existentes que se Conectan:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          MÓDULO DE MONITOREO                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                 │
│   │ RETRANSMISIÓN│      │TORRE CONTROL│      │MULTIVENTANA │                 │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                 │
│          │                    │                    │                         │
│          ▼                    ▼                    ▼                         │
│   ┌────────────────────────────────────────────────────────┐                │
│   │              RASTREO HISTÓRICO                          │                │
│   └────────────────────────────────────────────────────────┘                │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │    VEHÍCULOS  │  │    ÓRDENES    │  │   GEOCERCAS   │
        │  (Master)     │  │  (Orders)     │  │   (Master)    │
        │               │  │               │  │               │
        │ - Placa       │  │ - Milestones  │  │ - Puntos      │
        │ - GPS Device  │  │ - Workflow    │  │ - Alertas     │
        │ - Location    │  │ - Status      │  │ - Categorías  │
        │ - Driver      │  │ - Customer    │  │               │
        └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
                │                  │                  │
                ▼                  ▼                  ▼
        ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
        │  CONDUCTORES  │  │    CLIENTES   │  │   WORKFLOWS   │
        │  (Master)     │  │   (Master)    │  │   (Master)    │
        └───────────────┘  └───────────────┘  └───────────────┘
                │                  │                  │
                └──────────────────┼──────────────────┘
                                   │
                           ┌───────▼───────┐
                           │  EMPRESAS GPS │
                           │  (Nuevo)      │
                           └───────────────┘
```
e
### Dependencias de Datos:

| Entidad | Módulo Fuente | Uso en Monitoreo |
|---------|---------------|------------------|
| `Vehicle` | `master/vehicles` | Placa, GPS Device, Location |
| `Order` | `orders` | Órdenes activas, milestones, workflow |
| `Geofence` | `master/geofences` | Puntos de control, hitos |
| `Driver` | `master/drivers` | Info del conductor |
| `Customer` | `master/customers` | Cliente de la orden |
| `Workflow` | `master/workflows` | Progreso de hitos |
| `GpsOperator` | `orders/mock` | Empresas GPS (retransmisión) |

---

## 🎯 FASE 0: PREPARACIÓN (Día 1) ✅ COMPLETADA

### 0.1 Actualizar Configuración de Navegación
- [x] **[P0-01]** Agregar grupo "MONITOREO" en `config/navigation.ts` ✅
  - Archivo: `src/config/navigation.ts`
  - Items:
    - ✅ Torre de Control → `/monitoring/control-tower`
    - ✅ Retransmisión → `/monitoring/retransmission`
    - ✅ Multiventana → `/monitoring/multi-window`
    - ✅ Rastreo Histórico → `/monitoring/historical`

### 0.2 Crear Estructura Base de Carpetas
- [x] **[P0-02]** Crear estructura en `src/app/(dashboard)/monitoring/` ✅
  ```
  monitoring/
  ├── layout.tsx ✅
  ├── page.tsx (redirect a control-tower) ✅
  ├── loading.tsx ✅
  ├── control-tower/
  │   ├── page.tsx ✅
  │   └── loading.tsx ✅
  ├── retransmission/
  │   ├── page.tsx ✅
  │   └── loading.tsx ✅
  ├── multi-window/
  │   ├── page.tsx ✅
  │   └── loading.tsx ✅
  └── historical/
      ├── page.tsx ✅
      └── loading.tsx ✅
  ```

- [x] **[P0-03]** Crear estructura en `src/components/monitoring/` ✅
  ```
  monitoring/
  ├── index.ts (barrel exports) ✅
  ├── common/ ✅
  ├── retransmission/ ✅
  ├── control-tower/ ✅
  ├── multi-window/ ✅
  └── historical/ ✅
  ```

- [x] **[P0-04]** Crear estructura en `src/services/monitoring/` ✅
- [x] **[P0-05]** Crear estructura en `src/hooks/monitoring/` ✅
- [x] **[P0-06]** Crear estructura en `src/mocks/monitoring/` ✅

---

## 📝 FASE 1: TIPOS Y MODELOS (Día 2) ✅ COMPLETADA

### 1.1 Crear Tipos Base
- [x] **[P1-01]** Crear `src/types/monitoring.ts` con: ✅
  - [x] `MovementStatus` = 'moving' | 'stopped' ✅
  - [x] `RetransmissionStatus` = 'online' | 'temporary_loss' | 'disconnected' ✅
  - [x] `OrderActivityStatus` = 'active' | 'inactive' ✅
  - [x] `MilestoneTrackingStatus` = 'completed' | 'in_progress' | 'pending' ✅
  - [x] `PlaybackSpeed` = 1 | 2 | 4 | 8 | 16 | 32 ✅

### 1.2 Interfaces de Retransmisión
- [x] **[P1-02]** Crear interfaces en `types/monitoring.ts`: ✅
  - [x] `RetransmissionRecord` ✅
  - [x] `RetransmissionFilters` ✅
  - [x] `RetransmissionStats` ✅
  - [x] `GpsCompany` (nueva entidad - empresas GPS) ✅

### 1.3 Interfaces de Torre de Control
- [x] **[P1-03]** Crear interfaces: ✅
  - [x] `VehiclePosition` (lat, lng, speed, heading, timestamp) ✅
  - [x] `TrackedVehicle` (extiende Vehicle con position en tiempo real) ✅
  - [x] `TrackedOrder` (orden con milestones de tracking) ✅
  - [x] `TrackedMilestone` (hito con estado de tracking) ✅
  - [x] `ControlTowerFilters` ✅

### 1.4 Interfaces de Multiventana
- [x] **[P1-04]** Crear interfaces: ✅
  - [x] `VehiclePanel` ✅
  - [x] `MultiWindowGridConfig` ✅
  - [x] `PanelPosition` ({ row, col }) ✅

### 1.5 Interfaces de Rastreo Histórico
- [x] **[P1-05]** Crear interfaces: ✅
  - [x] `HistoricalRoutePoint` ✅
  - [x] `HistoricalRoute` ✅
  - [x] `HistoricalRouteStats` ✅
  - [x] `HistoricalRouteParams` ✅
  - [x] `RoutePlaybackState` ✅

### 1.6 Interfaces de WebSocket
- [x] **[P1-06]** Crear interfaces: ✅
  - [x] `PositionUpdateMessage` ✅
  - [x] `ConnectionStatusMessage` ✅
  - [x] `WebSocketMessage` (union type) ✅
  - [x] `WebSocketConfig` ✅

### 1.7 Exportar Tipos
- [x] **[P1-07]** Actualizar `src/types/index.ts` con exports de monitoring ✅

---

## 🗄️ FASE 2: DATOS MOCK (Días 3-4) ✅ COMPLETADA

### 2.1 Mock de Empresas GPS
- [x] **[P2-01]** Crear `src/mocks/monitoring/gps-companies.mock.ts` ✅
  - ✅ Empresas: GPSTRACK, HUNTER, SECURITRAC, etc.
  - ✅ Campos: id, name, code, contactEmail, isActive

### 2.2 Mock de Retransmisión
- [x] **[P2-02]** Crear `src/mocks/monitoring/retransmission.mock.ts` ✅
  - ✅ Generar 50+ registros aleatorios
  - ✅ Conectar con vehículos existentes (`vehiclesMock`)
  - ✅ Conectar con empresas GPS
  - ✅ Estados variados (online, temporary_loss, disconnected)
  - ✅ Comentarios de ejemplo

### 2.3 Mock de Posiciones en Tiempo Real
- [x] **[P2-03]** Crear `src/mocks/monitoring/vehicle-positions.mock.ts` ✅
  - ✅ Generar posiciones para vehículos existentes
  - ✅ Función para simular movimiento aleatorio
  - ✅ Conectar con órdenes activas

### 2.4 Mock de Rutas Históricas
- [x] **[P2-04]** Crear `src/mocks/monitoring/historical-routes.mock.ts` ✅
  - ✅ Rutas de ejemplo con 100+ puntos
  - ✅ Diferentes patrones (ruta directa, con paradas, desviaciones)
  - ✅ Estadísticas pre-calculadas

### 2.5 Barrel Export de Mocks
- [x] **[P2-05]** Crear `src/mocks/monitoring/index.ts` ✅

---

## ⚙️ FASE 3: SERVICIOS (Días 5-7) ✅ COMPLETADA

### 3.1 Servicio WebSocket
- [x] **[P3-01]** Crear `src/services/monitoring/websocket.service.ts` ✅
  - [x] Clase `MonitoringWebSocketService` ✅
  - [x] Método `connect()` con URL configurable ✅
  - [x] Método `disconnect()` ✅
  - [x] Método `onMessage(handler)` → returns unsubscribe ✅
  - [x] Método `onConnect(handler)` → returns unsubscribe ✅
  - [x] Método `onDisconnect(handler)` → returns unsubscribe ✅
  - [x] Método `subscribeToVehicles(vehicleIds[])` ✅
  - [x] Método `unsubscribeFromVehicles(vehicleIds[])` ✅
  - [x] Reconexión automática con backoff exponencial ✅
  - [x] Max reconnect attempts configurable ✅
  - [x] Export singleton `monitoringWebSocketService` ✅
  - ⚠️ **NOTA:** Actualmente usa modo mock (`useMock = true`). Requiere backend WebSocket real para producción.

### 3.2 Servicio de Retransmisión
- [x] **[P3-02]** Crear `src/services/monitoring/retransmission.service.ts` ✅
  - [x] Clase `RetransmissionService` ✅
  - [x] Método `getAll(filters?)` → RetransmissionRecord[] ✅
  - [x] Método `updateComment(recordId, comment)` ✅
  - [x] Método `getStats()` → RetransmissionStats ✅
  - [x] Método `getGpsCompanies()` → GpsCompany[] ✅
  - [x] Export singleton `retransmissionService` ✅

### 3.3 Servicio de Tracking en Tiempo Real
- [x] **[P3-03]** Crear `src/services/monitoring/tracking.service.ts` ✅
  - [x] Clase `TrackingService` ✅
  - [x] Método `getActiveVehicles()` → TrackedVehicle[] ✅
  - [x] Método `getVehiclePosition(vehicleId)` → VehiclePosition ✅
  - [x] Método `getOrderByVehicle(vehicleId)` → TrackedOrder | null ✅
  - [x] Método `getMilestoneStatus(orderId)` → TrackedMilestone[] ✅
  - [x] Conexión con `unifiedWorkflowService` para progreso ✅
  - [x] Export singleton `trackingService` ✅

### 3.4 Servicio de Rastreo Histórico
- [x] **[P3-04]** Crear `src/services/monitoring/historical.service.ts` ✅
  - [x] Clase `HistoricalTrackingService` ✅
  - [x] Método `getRoute(params)` → HistoricalRoute ✅
  - [x] Método `exportRoute(params, format)` → Blob ✅
  - [x] Método `getAvailableVehicles()` → Vehicle[] (con histórico) ✅
  - [x] Método `getAvailableDateRange(vehicleId)` → { min, max } ✅
  - [x] Export singleton `historicalTrackingService` ✅

### 3.5 Barrel Export de Servicios
- [x] **[P3-05]** Crear `src/services/monitoring/index.ts` ✅
- [x] **[P3-06]** Actualizar `src/services/index.ts` con exports de monitoring ✅

---

## 🪝 FASE 4: HOOKS PERSONALIZADOS (Días 8-9) ✅ COMPLETADA

### 4.1 Hook de Retransmisión
- [x] **[P4-01]** Crear `src/hooks/monitoring/use-retransmission.ts` ✅
  - [x] `useRetransmission(options)` con:
    - State: records, isLoading, error, filters, stats ✅
    - Actions: setFilters, updateComment, refresh ✅
    - Options: autoRefresh (default: true), refreshIntervalMs (default: 10000) ✅
  - [x] Auto-polling cada 10-15 segundos ✅
  - [x] Memoización de filtros aplicados ✅

### 4.2 Hook de Tracking en Tiempo Real
- [x] **[P4-02]** Crear `src/hooks/monitoring/use-vehicle-tracking.ts` ✅
  - [x] `useVehicleTracking(options)` con:
    - State: vehicles (Map), isConnected, error ✅
    - Actions: subscribeToVehicle, unsubscribeFromVehicle, centerOnVehicle ✅
    - Options: vehicleIds[], autoConnect (default: true) ✅
  - [x] Integración con WebSocket ✅
  - [x] Actualización de posiciones en tiempo real ✅

### 4.3 Hook de Orden Rastreada
- [x] **[P4-03]** Crear `src/hooks/monitoring/use-tracked-order.ts` ✅
  - [x] `useTrackedOrder(vehicleId)` con:
    - State: order, milestones, currentMilestone, progress ✅
    - Actions: refresh ✅
  - [x] Conectar con `unifiedWorkflowService.getOrderWorkflowProgress` ✅

### 4.4 Hook de Multiventana
- [x] **[P4-04]** Crear `src/hooks/monitoring/use-multi-window.ts` ✅
  - [x] `useMultiWindow(options)` con:
    - State: panels[], gridConfig ✅
    - Actions: addPanel, removePanel, reorderPanels ✅
    - Options: maxPanels (default: 20) ✅
  - [x] Persistencia en localStorage ✅
  - [x] Auto-ajuste de grid según cantidad ✅

### 4.5 Hook de Ruta Histórica
- [x] **[P4-05]** Crear `src/hooks/monitoring/use-historical-route.ts` ✅
  - [x] `useHistoricalRoute(params)` con:
    - State: route, stats, isLoading, error ✅
    - Actions: loadRoute, exportRoute ✅
  - [x] Caché de rutas ya consultadas ✅

### 4.6 Hook de Reproducción de Ruta
- [x] **[P4-06]** Crear `src/hooks/monitoring/use-route-playback.ts` ✅
  - [x] `useRoutePlayback(options)` con:
    - State: playbackState (isPlaying, isPaused, currentIndex, speed, progress) ✅
    - Actions: play, pause, stop, setSpeed, seekTo, seekToProgress ✅
    - Options: points[], onPointChange callback ✅
  - [x] Velocidades: 1x, 2x, 4x, 8x, 16x, 32x ✅

### 4.7 Barrel Export de Hooks
- [x] **[P4-07]** Crear `src/hooks/monitoring/index.ts` ✅
- [x] **[P4-08]** Actualizar `src/hooks/index.ts` con exports de monitoring ✅

---

## 🧩 FASE 5: COMPONENTES COMUNES (Día 10) ✅ COMPLETADA

### 5.1 Badge de Estado de Conexión
- [x] **[P5-01]** Crear `src/components/monitoring/common/connection-status-badge.tsx` ✅
  - Props: status (RetransmissionStatus) ✅
  - Colores: online (verde), temporary_loss (ámbar), disconnected (rojo) ✅
  - Animación pulse para "online" ✅

### 5.2 Badge de Estado de Movimiento
- [x] **[P5-02]** Crear `src/components/monitoring/common/movement-status-badge.tsx` ✅
  - Props: status (MovementStatus) ✅
  - Colores: moving (azul), stopped (gris) ✅

### 5.3 Formateador de Duración
- [x] **[P5-03]** Crear `src/components/monitoring/common/duration-display.tsx` ✅
  - Props: seconds (number) ✅
  - Formato: HH:MM:SS ✅

### 5.4 Selector de Vehículo
- [x] **[P5-04]** Crear `src/components/monitoring/common/vehicle-selector.tsx` ✅
  - Props: onSelect, selectedId, multiple? ✅
  - Búsqueda por placa ✅
  - Lista con filtros ✅

### 5.5 Selector de Fecha/Hora
- [x] **[P5-05]** Crear `src/components/monitoring/common/date-time-picker.tsx` ✅
  - Props: value, onChange, minDate?, maxDate? ✅
  - Selector de fecha + hora ✅

### 5.6 Skeletons Específicos
- [x] **[P5-06]** Crear skeletons en `src/components/monitoring/common/`: ✅
  - [x] `retransmission-skeleton.tsx` ✅
  - [x] `map-skeleton.tsx` ✅
  - [x] `stats-panel-skeleton.tsx` ✅
  - [x] `playback-controls-skeleton.tsx` ✅

---

## 📊 FASE 6: MÓDULO RETRANSMISIÓN (Días 11-12) ✅ COMPLETADA

### 6.1 Filtros de Retransmisión
- [x] **[P6-01]** Crear `src/components/monitoring/retransmission/retransmission-filters.tsx` ✅
  - [x] Input búsqueda de vehículo ✅
  - [x] Select de empresa ✅
  - [x] Select de estado de movimiento ✅
  - [x] Select de estado de retransmisión ✅
  - [x] Select de empresa GPS ✅
  - [x] DatePicker rango de última conexión ✅
  - [x] Checkbox: con/sin comentarios ✅
  - [x] Botón limpiar filtros ✅
  - [x] Contador de filtros activos ✅

### 6.2 Fila de Tabla
- [x] **[P6-02]** Crear `src/components/monitoring/retransmission/retransmission-row.tsx` ✅
  - Props: record, onCommentClick ✅
  - Células con badges de estado ✅
  - Icono de comentario (lleno si tiene) ✅
  - Hover effect ✅

### 6.3 Tabla Principal
- [x] **[P6-03]** Crear `src/components/monitoring/retransmission/retransmission-table.tsx` ✅
  - [x] Columnas: Vehículo, Empresa, Empresa GPS, Última conexión, Movimiento, Estado, Duración, Comentarios ✅
  - [x] Sorting por todas las columnas ✅
  - [x] Click en fila → abre modal de comentario ✅
  - [ ] Virtualización si hay muchos registros ⚠️ Pendiente optimización

### 6.4 Modal de Comentarios
- [x] **[P6-04]** Crear `src/components/monitoring/retransmission/comment-modal.tsx` ✅
  - Props: isOpen, onClose, onSave, initialComment?, vehiclePlate ✅
  - Textarea con límite de caracteres ✅
  - Botones: Cancelar, Guardar ✅

### 6.5 Panel de Estadísticas
- [x] **[P6-05]** Crear `src/components/monitoring/retransmission/retransmission-stats.tsx` ✅
  - Cards con: Total, En línea, Pérdida temporal, Sin conexión ✅
  - Porcentajes y tendencias ✅

### 6.6 Contenedor Principal
- [x] **[P6-06]** Crear `src/components/monitoring/retransmission/retransmission-container.tsx` ✅
  - Integra: Stats, Filters, Table ✅
  - Usa `useRetransmission` hook ✅
  - Indicador de última actualización ✅
  - Botón de refresh manual ✅

### 6.7 Página de Retransmisión
- [x] **[P6-07]** Implementar `src/app/(dashboard)/monitoring/retransmission/page.tsx` ✅
  - Dynamic import del container ✅
  - Loading state con skeleton ✅

---

## 🗼 FASE 7: MÓDULO TORRE DE CONTROL (Días 13-14) ✅ COMPLETADA

### 7.1 Marcador de Vehículo
- [x] **[P7-01]** Crear `src/components/monitoring/control-tower/vehicle-marker.tsx` ✅
  - Props: vehicle, isSelected, onClick ✅
  - Icono diferenciado por estado ✅
  - Animación de pulso si está en movimiento ✅
  - Rotación según heading ✅

### 7.2 Tarjeta de Info de Vehículo
- [x] **[P7-02]** Crear `src/components/monitoring/control-tower/vehicle-info-card.tsx` ✅
  - Props: vehicle, onClose ✅
  - Muestra: Placa, Conductor, Estado ✅
  - Info de orden asociada ✅
  - Lista de hitos con estados ✅
  - Botón para centrar en mapa ✅

### 7.3 Lista de Hitos
- [x] **[P7-03]** Crear `src/components/monitoring/control-tower/milestone-list.tsx` ✅
  - Props: milestones, currentIndex ✅
  - Timeline vertical con estados ✅
  - Indicador de hito actual ✅

### 7.4 Panel de Filtros
- [x] **[P7-04]** Crear `src/components/monitoring/control-tower/control-tower-filters.tsx` ✅
  - [x] Input búsqueda de unidad ✅
  - [x] Select de transportista ✅
  - [x] Input número de orden ✅
  - [x] Select de cliente ✅
  - [x] Toggle: Órdenes activas/inactivas ✅

### 7.5 Overlay de Ruta
- [x] **[P7-05]** Crear `src/components/monitoring/control-tower/route-overlay.tsx` ✅
  - Props: route, color ✅
  - Polyline de ruta planificada ✅
  - Toggle mostrar/ocultar ✅

### 7.6 Mapa de Torre de Control
- [x] **[P7-06]** Crear `src/components/monitoring/control-tower/control-tower-map.tsx` ✅
  - [x] Integración con Leaflet (dynamic import) ✅
  - [x] Clusterización de marcadores (`react-leaflet-cluster`) ✅
  - [x] Actualización en tiempo real de posiciones ✅
  - [x] Click en marcador → mostrar tarjeta info ✅
  - [x] Centrar en vehículo seleccionado ✅
  - [x] Toggle de rutas planificadas ✅

### 7.7 Contenedor Principal
- [x] **[P7-07]** Crear `src/components/monitoring/control-tower/control-tower-container.tsx` ✅
  - Layout: Sidebar filtros + Mapa ✅
  - Usa `useVehicleTracking` hook ✅
  - Indicador de conexión WebSocket ✅
  - Panel de info colapsable ✅
  - **EXTRA:** VehicleListSidebar implementado ✅

### 7.8 Página de Torre de Control
- [x] **[P7-08]** Implementar `src/app/(dashboard)/monitoring/control-tower/page.tsx` ✅
  - Dynamic import con ssr: false ✅
  - Loading con skeleton de mapa ✅

---

## 📱 FASE 8: MÓDULO MULTIVENTANA (Día 15) ✅ COMPLETADA

### 8.1 Mini Mapa de Vehículo
- [x] **[P8-01]** Crear `src/components/monitoring/multi-window/vehicle-mini-map.tsx` ✅
  - Props: position, vehicleId ✅
  - Mapa pequeño (200x150 aprox) ✅
  - Marcador centrado ✅

### 8.2 Panel de Vehículo
- [x] **[P8-02]** Crear `src/components/monitoring/multi-window/vehicle-panel.tsx` ✅
  - Props: vehicle, onRemove ✅
  - Header con placa y botón eliminar ✅
  - Mini mapa ✅
  - Info: última posición, estado, última transmisión ✅
  - Auto-refresh individual ✅

### 8.3 Modal Selector de Vehículos
- [x] **[P8-03]** Crear `src/components/monitoring/multi-window/vehicle-selector-modal.tsx` ✅
  - Props: isOpen, onClose, onSelect, excludeIds ✅
  - Búsqueda por placa ✅
  - Lista con checkbox (selección múltiple) ✅
  - Límite de 20 unidades ✅

### 8.4 Controles de Grid
- [x] **[P8-04]** Crear `src/components/monitoring/multi-window/grid-controls.tsx` ✅
  - Botón "Agregar unidad" ✅
  - Contador de unidades seleccionadas ✅
  - Selector de layout (2x2, 3x3, 4x4, auto) ✅

### 8.5 Grid de Multiventana
- [x] **[P8-05]** Crear `src/components/monitoring/multi-window/multi-window-grid.tsx` ✅
  - Props: panels, onRemovePanel ✅
  - Grid responsive (CSS Grid) ✅
  - Auto-ajuste de columnas según cantidad ✅
  - Layouts: 1-4 (2x2), 5-9 (3x3), 10-16 (4x4), 17-20 (5x4) ✅

### 8.6 Contenedor Principal
- [x] **[P8-06]** Crear `src/components/monitoring/multi-window/multi-window-container.tsx` ✅
  - Usa `useMultiWindow` hook ✅
  - Persistencia de selección en localStorage ✅
  - Integración con `useVehicleTracking` ✅

### 8.7 Página de Multiventana
- [x] **[P8-07]** Implementar `src/app/(dashboard)/monitoring/multi-window/page.tsx` ✅

---

## 📜 FASE 9: MÓDULO RASTREO HISTÓRICO (Días 16-17) ✅ COMPLETADA

### 9.1 Formulario de Búsqueda
- [x] **[P9-01]** Crear `src/components/monitoring/historical/search-form.tsx` ✅
  - [x] Selector de vehículo ✅
  - [x] DateTimePicker para fecha/hora inicio ✅
  - [x] DateTimePicker para fecha/hora fin ✅
  - [x] Botón buscar ✅
  - [x] Validación de rango máximo (ej: 7 días) ✅

### 9.2 Panel de Estadísticas
- [x] **[P9-02]** Crear `src/components/monitoring/historical/route-stats-panel.tsx` ✅
  - Props: stats (HistoricalRouteStats) ✅
  - Cards con:
    - Distancia total (km) ✅
    - Velocidad máxima (km/h) ✅
    - Velocidad promedio (km/h) ✅
    - Tiempo en movimiento (HH:MM) ✅
    - Tiempo detenido (HH:MM) ✅
    - Total de puntos ✅

### 9.3 Controles de Reproducción
- [x] **[P9-03]** Crear `src/components/monitoring/historical/playback-controls.tsx` ✅
  - [x] Botón Play/Pause ✅
  - [x] Botón Stop ✅
  - [x] Botón Reset ✅
  - [x] Slider de progreso (seekable) ✅
  - [x] Selector de velocidad (1x a 32x) ✅
  - [x] Display de punto actual / total ✅
  - [x] Display de tiempo actual ✅

### 9.4 Tooltip de Punto
- [x] **[P9-04]** Crear `src/components/monitoring/historical/route-point-tooltip.tsx` ✅
  - Props: point (HistoricalRoutePoint) ✅
  - Muestra: Hora, Velocidad, Dirección ✅
  - Posicionado cerca del punto en el mapa ✅

### 9.5 Mapa de Ruta Histórica
- [x] **[P9-05]** Crear `src/components/monitoring/historical/historical-map.tsx` ✅
  - [x] Polyline de ruta completa ✅
  - [x] Marcador de punto actual (animado) ✅
  - [x] Marcadores de inicio/fin ✅
  - [x] Click en punto → mostrar tooltip ✅
  - [x] Colores de velocidad en segmentos (opcional) ✅
  - [x] Auto-center en punto actual durante playback ✅

### 9.6 Botón de Exportar
- [x] **[P9-06]** Crear `src/components/monitoring/historical/export-button.tsx` ✅
  - Props: route, onExport ✅
  - Dropdown con formatos: CSV, JSON, GPX ✅

### 9.7 Contenedor Principal
- [x] **[P9-07]** Crear `src/components/monitoring/historical/historical-container.tsx` ✅
  - Layout: Sidebar (form + stats + controls) + Mapa ✅
  - Usa `useHistoricalRoute` y `useRoutePlayback` ✅

### 9.8 Página de Rastreo Histórico
- [x] **[P9-08]** Implementar `src/app/(dashboard)/monitoring/historical/page.tsx` ✅

---

## 🧪 FASE 10: TESTING (Días 18-19) ⏳ PENDIENTE

### 10.1 Tests Unitarios de Hooks
- [ ] **[P10-01]** Test `use-retransmission.test.ts`
- [ ] **[P10-02]** Test `use-vehicle-tracking.test.ts`
- [ ] **[P10-03]** Test `use-route-playback.test.ts`
- [ ] **[P10-04]** Test `use-multi-window.test.ts`

### 10.2 Tests de Componentes
- [ ] **[P10-05]** Test `retransmission-table.test.tsx`
- [ ] **[P10-06]** Test `playback-controls.test.tsx`
- [ ] **[P10-07]** Test `connection-status-badge.test.tsx`

### 10.3 Tests de Integración
- [ ] **[P10-08]** Test integración Torre de Control con WebSocket (mock)
- [ ] **[P10-09]** Test integración Retransmisión con filtros

---

## 🔧 FASE 11: OPTIMIZACIÓN Y PULIDO (Día 20) ⏳ PARCIAL

### 11.1 Performance
- [ ] **[P11-01]** Implementar virtualización en tabla de retransmisión (`@tanstack/react-virtual`)
- [x] **[P11-02]** Optimizar re-renders con `React.memo` en marcadores de mapa ✅ (parcialmente)
- [x] **[P11-03]** Implementar clusterización eficiente en Torre de Control ✅
- [x] **[P11-04]** Lazy loading de componentes de mapa ✅
- [ ] **[P11-05]** Debounce en filtros de búsqueda

### 11.2 UX/UI
- [ ] **[P11-06]** Agregar transiciones suaves en cambios de estado
- [ ] **[P11-07]** Implementar toast notifications para errores/éxitos
- [x] **[P11-08]** Agregar tooltips en iconos y acciones ✅ (parcialmente)
- [ ] **[P11-09]** Responsive design para tablets

### 11.3 Accesibilidad
- [ ] **[P11-10]** Agregar aria-labels en controles
- [ ] **[P11-11]** Navegación por teclado en tablas
- [ ] **[P11-12]** Contraste de colores para estados

### 11.4 Documentación
- [ ] **[P11-13]** Documentar tipos con JSDoc
- [ ] **[P11-14]** Agregar ejemplos de uso en hooks
- [ ] **[P11-15]** README del módulo de monitoreo

---

## 📋 RESUMEN DE ARCHIVOS CREADOS ✅

### Tipos (1 archivo) ✅
```
src/types/monitoring.ts ✅
```

### Mocks (5 archivos) ✅
```
src/mocks/monitoring/
├── index.ts ✅
├── gps-companies.mock.ts ✅
├── retransmission.mock.ts ✅
├── vehicle-positions.mock.ts ✅
└── historical-routes.mock.ts ✅
```

### Servicios (5 archivos) ✅
```
src/services/monitoring/
├── index.ts ✅
├── websocket.service.ts ✅ (modo mock activo)
├── retransmission.service.ts ✅
├── tracking.service.ts ✅
└── historical.service.ts ✅
```

### Hooks (7 archivos) ✅
```
src/hooks/monitoring/
├── index.ts ✅
├── use-retransmission.ts ✅
├── use-vehicle-tracking.ts ✅
├── use-tracked-order.ts ✅
├── use-multi-window.ts ✅
├── use-historical-route.ts ✅
└── use-route-playback.ts ✅
```

### Componentes (40+ archivos) ✅
```
src/components/monitoring/
├── index.ts ✅
├── common/
│   ├── index.ts ✅
│   ├── connection-status-badge.tsx ✅
│   ├── movement-status-badge.tsx ✅
│   ├── duration-display.tsx ✅
│   ├── vehicle-selector.tsx ✅
│   ├── date-time-picker.tsx ✅
│   └── skeletons/
│       ├── retransmission-skeleton.tsx ✅
│       ├── map-skeleton.tsx ✅
│       ├── stats-panel-skeleton.tsx ✅
│       └── playback-controls-skeleton.tsx ✅
├── retransmission/
│   ├── index.ts ✅
│   ├── retransmission-filters.tsx ✅
│   ├── retransmission-row.tsx ✅
│   ├── retransmission-table.tsx ✅
│   ├── comment-modal.tsx ✅
│   ├── retransmission-stats.tsx ✅
│   └── retransmission-container.tsx ✅
├── control-tower/
│   ├── index.ts ✅
│   ├── vehicle-marker.tsx ✅
│   ├── vehicle-info-card.tsx ✅
│   ├── vehicle-list-sidebar.tsx ✅ (EXTRA)
│   ├── milestone-list.tsx ✅
│   ├── control-tower-filters.tsx ✅
│   ├── route-overlay.tsx ✅
│   ├── control-tower-map.tsx ✅
│   └── control-tower-container.tsx ✅
├── multi-window/
│   ├── index.ts ✅
│   ├── vehicle-mini-map.tsx ✅
│   ├── vehicle-panel.tsx ✅
│   ├── vehicle-selector-modal.tsx ✅
│   ├── grid-controls.tsx ✅
│   ├── multi-window-grid.tsx ✅
│   └── multi-window-container.tsx ✅
└── historical/
    ├── index.ts ✅
    ├── search-form.tsx ✅
    ├── route-stats-panel.tsx ✅
    ├── playback-controls.tsx ✅
    ├── route-point-tooltip.tsx ✅
    ├── historical-map.tsx ✅
    ├── export-button.tsx ✅
    └── historical-container.tsx ✅
```

### Páginas (11 archivos) ✅
```
src/app/(dashboard)/monitoring/
├── layout.tsx ✅
├── page.tsx ✅ (redirect a control-tower)
├── loading.tsx ✅
├── control-tower/
│   ├── page.tsx ✅
│   └── loading.tsx ✅
├── retransmission/
│   ├── page.tsx ✅
│   └── loading.tsx ✅
├── multi-window/
│   ├── page.tsx ✅
│   └── loading.tsx ✅
└── historical/
    ├── page.tsx ✅
    └── loading.tsx ✅
```

---

## 📅 CRONOGRAMA - ESTADO ACTUAL

| Fase | Días | Descripción | Estado |
|------|------|-------------|--------|
| 0 | 1 | Preparación y estructura | ✅ Completado |
| 1 | 1 | Tipos y modelos | ✅ Completado |
| 2 | 2 | Datos mock | ✅ Completado |
| 3 | 3 | Servicios | ✅ Completado |
| 4 | 2 | Hooks | ✅ Completado |
| 5 | 1 | Componentes comunes | ✅ Completado |
| 6 | 2 | Módulo Retransmisión | ✅ Completado |
| 7 | 2 | Módulo Torre de Control | ✅ Completado |
| 8 | 1 | Módulo Multiventana | ✅ Completado |
| 9 | 2 | Módulo Rastreo Histórico | ✅ Completado |
| 10 | 2 | Testing | ⏳ Pendiente |
| 11 | 1 | Optimización | ⏳ Parcial (~20%) |
| **Total** | **20** | | **~90% completado** |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Funcionales
- [x] La tabla de retransmisión se actualiza cada 10-15 segundos ✅
- [x] Los comentarios se guardan correctamente ✅
- [x] El mapa muestra posiciones en tiempo real vía WebSocket ✅ (modo mock)
- [x] La multiventana soporta hasta 20 unidades simultáneas ✅
- [x] El reproductor de ruta funciona con todas las velocidades ✅
- [x] Los filtros funcionan correctamente en todos los módulos ✅

### Técnicos
- [x] 0 errores de TypeScript ✅
- [ ] 0 errores de ESLint ⚠️ (verificar)
- [x] Sin `any` en el código ✅ (verificado en módulo monitoreo)
- [x] Todos los componentes usan Tailwind CSS ✅
- [x] Leaflet cargado con dynamic import (SSR: false) ✅
- [ ] Tests con >80% cobertura en hooks ⏳

### Performance
- [ ] Time to First Byte < 200ms ⏳
- [ ] First Contentful Paint < 1s ⏳
- [x] No memory leaks en WebSocket ✅ (modo mock verificado)
- [ ] Smooth scrolling en tabla con 100+ registros ⏳ (falta virtualización)

---

## 🚀 PRÓXIMOS PASOS

### Para Producción (Pendiente)
1. **Backend WebSocket Real** - Cambiar `useMock = false` en `websocket.service.ts`
2. **Tests Unitarios** - Implementar FASE 10 completa
3. **Virtualización** - Agregar `@tanstack/react-virtual` en tablas grandes
4. **Debounce** - Agregar en filtros de búsqueda
5. **Performance Audit** - Medir Core Web Vitals

### Comandos Útiles
```bash
# Verificar que no hay errores antes de empezar
npm run type-check
npm run lint

# Iniciar desarrollo
npm run dev
```

---

**Última actualización:** 2 de febrero de 2026  
**Estado:** ✅ Frontend completo con mocks | ⏳ Tests y optimización pendientes

**Nota:** El módulo de monitoreo está **funcionalmente completo** para desarrollo. 
Para producción se requiere: backend WebSocket real, tests unitarios y optimizaciones de performance.
