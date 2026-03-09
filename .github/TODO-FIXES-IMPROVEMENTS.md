# 🔧 TODO - ERRORES Y MEJORAS IDENTIFICADAS

> **Version:** 1.0.0  
> **Fecha:** 1 de Febrero 2026  
> **Estado:** En Progreso

---

## 📋 INDICE

1. [Errores Criticos](#errores-criticos)
2. [Errores de Compilacion](#errores-compilacion)
3. [Warnings del Build](#warnings)
4. [Problemas de UX/UI](#problemas-ux)
5. [Mejoras de Performance](#mejoras-performance)
6. [Deuda Tecnica](#deuda-tecnica)
7. [Integraciones Pendientes](#integraciones)
8. [Checklist de Verificacion](#checklist)

---

## 🔴 ERRORES CRITICOS {#errores-criticos}

### ~~EC-001: Recharts - Dimensiones de Graficos Invalidas~~ ✅ COMPLETADO
**Severidad:** Media  
**Modulo:** Dashboard  
**Archivo:** `src/components/dashboard/stat-card.tsx`  
**Estado:** ✅ Corregido el 01/Feb/2026

**Solucion aplicada:**
- [x] Agregar `minWidth` y `minHeight` al ResponsiveContainer
- [x] Desactivar animacion durante SSR (`isAnimationActive={false}`)
- [x] Corregir IDs de gradientes para evitar colisiones

---

### EC-002: WebSocket No Implementado en Backend
**Severidad:** Alta  
**Modulo:** Monitoreo  
**Archivos:** 
- `src/services/monitoring/websocket.service.ts`
- `src/hooks/monitoring/use-vehicle-tracking.ts`

**Descripcion:** El servicio de WebSocket esta preparado pero usa datos mock. No hay conexion real a un backend de GPS.

**Impacto:**
- Torre de Control no actualiza posiciones en tiempo real
- Multiventana solo muestra datos estaticos

**Solucion:**
- [ ] Crear endpoint WebSocket en backend
- [ ] Configurar URL de WebSocket via variable de entorno
- [ ] Implementar fallback polling si WebSocket falla

---

### EC-005: Páginas de FINANZAS No Existen
**Severidad:** Alta  
**Modulo:** Finanzas  
**Estado:** ❌ NO IMPLEMENTADO

**Descripcion:** Los links del navbar apuntan a páginas que no existen, resultando en error 404.

**Rutas afectadas:**
- `/invoices` - Facturas
- `/pricing` - Tarifario

**Impacto:**
- Usuario ve error 404 al hacer clic en estos enlaces
- Funcionalidad de facturación no disponible

**Archivos faltantes:**
- [ ] `src/app/(dashboard)/invoices/page.tsx`
- [ ] `src/app/(dashboard)/invoices/loading.tsx`
- [ ] `src/app/(dashboard)/pricing/page.tsx`
- [ ] `src/app/(dashboard)/pricing/loading.tsx`
- [ ] `src/services/invoices/` (directorio)
- [ ] `src/services/pricing/` (directorio)
- [ ] `src/components/invoices/` (directorio)
- [ ] `src/components/pricing/` (directorio)

**Solución temporal:** Remover del navbar hasta implementar
**Solución definitiva:** Implementar módulos completos

---

### EC-006: Páginas de Operadores y Productos Sin Conexión al Servicio
**Severidad:** Media  
**Modulo:** Maestro  
**Estado:** ⚠️ PARCIALMENTE IMPLEMENTADO

**Descripcion:** Las páginas existen pero muestran datos estáticos (0) en vez de cargar del servicio.

**Archivos afectados:**
- `src/app/(dashboard)/master/operators/page.tsx`
- `src/app/(dashboard)/master/products/page.tsx`

**Servicios disponibles (no conectados):**
- `src/services/master/operators.service.ts` ✅
- `src/services/master/products.service.ts` ✅

**Tareas:**
- [ ] Conectar página de Operadores con `operatorsService`
- [ ] Conectar página de Productos con `productsService`
- [ ] Implementar hook `useOperators` o usar `useService`
- [ ] Implementar hook `useProducts` o usar `useService`

---

### ~~EC-003: Servicio de Operadores No Implementado~~ ✅ COMPLETADO
**Severidad:** Media  
**Modulo:** Maestro  
**Estado:** ✅ Implementado el 01/Feb/2026

**Archivos creados:**
- `src/mocks/master/operators.mock.ts` - 5 operadores de ejemplo
- `src/services/master/operators.service.ts` - CRUD completo con DTOs, filtros y paginación
- `src/types/models/operator.ts` - Tipos completos (OperatorContact, OperatorDocument, etc.)
- `src/services/master/index.ts` - Barrel export incluido

**Tareas completadas:**
- [x] Crear `src/services/master/operators.service.ts`
- [x] Crear `src/mocks/master/operators.mock.ts`
- [x] Implementar CRUD completo
- [x] Exportar en barrel `src/services/master/index.ts`
- [x] Definir tipos en `src/types/models/operator.ts`

---

### ~~EC-004: Servicio de Productos No Implementado~~ ✅ COMPLETADO
**Severidad:** Media  
**Modulo:** Maestro  
**Estado:** ✅ Implementado el 01/Feb/2026

**Archivos creados:**
- `src/mocks/master/products.mock.ts` - 10+ productos de ejemplo (categorías: general, refrigerado, congelado, peligroso, frágil)
- `src/services/master/products.service.ts` - CRUD completo con DTOs, filtros y paginación
- `src/types/models/product.ts` - Tipos completos (TransportConditions, ProductDimensions, etc.)
- `src/services/master/index.ts` - Barrel export incluido

**Tareas completadas:**
- [x] Crear `src/services/master/products.service.ts`
- [x] Crear `src/mocks/master/products.mock.ts`
- [x] Implementar CRUD completo
- [x] Exportar en barrel `src/services/master/index.ts`
- [x] Definir tipos en `src/types/models/product.ts`

---

## ⚠️ ERRORES DE COMPILACION {#errores-compilacion}

> **Estado Actual:** ✅ Build exitoso sin errores de TypeScript

El proyecto compila correctamente. Verificado con:
```bash
npm run build
# ✓ Finished TypeScript in 15.6s
```

---

## 🟡 WARNINGS DEL BUILD {#warnings}

### ~~W-001: Recharts Dimension Warning~~ ✅ MITIGADO
**Estado:** Warnings reducidos tras aplicar minWidth/minHeight
**Causa:** Algunos graficos aun muestran warning durante build estatico (no afecta runtime)

---

### ~~W-002: Hook de Ordenes sin export en index~~ ✅ COMPLETADO
**Archivo:** `src/hooks/index.ts`
**Estado:** ✅ Corregido el 01/Feb/2026

**Descripcion:** El hook `useOrders` no esta exportado en el barrel export.

**Tareas completadas:**
- [x] Agregar `export * from "./useOrders";` en `src/hooks/index.ts`
- [x] Agregar `export * from "./useOrderImportExport";` en `src/hooks/index.ts`

---

### ~~W-003: Servicios de Orders sin barrel export~~ ✅ COMPLETADO
**Archivo:** `src/services/orders/index.ts`
**Estado:** ✅ Corregido el 01/Feb/2026

**Tareas completadas:**
- [x] Verificar `src/services/orders/index.ts` (ya existia)
- [x] Exportar desde `src/services/index.ts`
- [x] Agregar exports de integration services

---

## 🎨 PROBLEMAS DE UX/UI {#problemas-ux}

### UX-001: Loading States Inconsistentes
**Modulos:** Varios  
**Descripcion:** Diferentes estilos de loading entre modulos.

**Archivos afectados:**
- Dashboard: Sin skeleton
- Ordenes: Usa skeleton
- Monitoreo: Usa spinner

**Solucion:**
- [ ] Estandarizar skeletons para todas las tablas
- [ ] Usar mismo componente de loading en todos los modulos
- [ ] Documentar patron de loading en guia de estilos

---

### UX-002: Formularios Sin Validacion Visual
**Modulos:** Maestro  
**Descripcion:** Algunos formularios no muestran errores de validacion de forma clara.

**Tareas:**
- [ ] Agregar mensajes de error debajo de cada campo
- [ ] Resaltar campos con error en rojo
- [ ] Agregar iconos de validacion (check/x)

---

### UX-003: Tablas Sin Paginacion Server-Side
**Modulos:** Clientes, Vehiculos, Conductores  
**Descripcion:** Las tablas cargan todos los datos y paginan en cliente.

**Impacto:** Performance degradada con muchos registros.

**Tareas:**
- [ ] Implementar paginacion server-side en servicios
- [ ] Agregar parametros `page` y `pageSize` a endpoints
- [ ] Actualizar hooks para manejar paginacion

---

### UX-004: Mapas Sin Estado de Carga
**Modulos:** Geocercas, Torre de Control, Historico  
**Descripcion:** El mapa aparece vacio brevemente antes de cargar tiles.

**Tareas:**
- [ ] Agregar skeleton/placeholder mientras carga el mapa
- [ ] Mostrar indicador de carga de tiles

---

### UX-005: Responsive Design Incompleto
**Areas afectadas:**
- Sidebar: No colapsa en mobile
- Tablas: No se adaptan bien a pantallas pequeñas
- Formularios: Inputs muy anchos en desktop

**Tareas:**
- [ ] Implementar sidebar colapsable en mobile
- [ ] Usar tablas scrolleables horizontalmente en mobile
- [ ] Limitar ancho maximo de formularios

---

## ⚡ MEJORAS DE PERFORMANCE {#mejoras-performance}

### P-001: Virtualización de Listas Largas
**Modulos:** Retransmision, Ordenes  
**Descripcion:** Tablas con muchos registros renderizan todos los elementos.

**Solucion:**
- [ ] Implementar `@tanstack/react-virtual` en tablas grandes
- [ ] Threshold: Virtualizar si > 50 registros

---

### P-002: Memoizacion de Componentes
**Modulos:** Torre de Control, Multiventana  
**Descripcion:** Marcadores de mapa se re-renderizan innecesariamente.

**Tareas:**
- [ ] Envolver `VehicleMarker` con `React.memo`
- [ ] Memoizar handlers con `useCallback`
- [ ] Memoizar datos derivados con `useMemo`

---

### P-003: Lazy Loading de Rutas
**Descripcion:** Todas las paginas cargan componentes pesados.

**Tareas:**
- [ ] Usar `dynamic()` para componentes de mapa
- [ ] Implementar code splitting por ruta
- [ ] Precargar rutas frecuentes

---

### P-004: Debounce en Filtros de Busqueda
**Modulos:** Todos con filtros  
**Descripcion:** Busquedas se ejecutan en cada keystroke.

**Tareas:**
- [ ] Agregar debounce de 300ms en inputs de busqueda
- [ ] Usar `useDeferredValue` para actualizaciones no urgentes

---

### P-005: Caché de Datos
**Modulos:** Monitoreo Historico  
**Descripcion:** Consultas de rutas historicas se repiten innecesariamente.

**Tareas:**
- [ ] Implementar cache con tiempo de vida (TTL)
- [ ] Considerar React Query o SWR para manejo de cache

---

## 📦 DEUDA TECNICA {#deuda-tecnica}

### DT-001: Tests Ausentes
**Cobertura actual:** ~0%  
**Critico:** Hooks de monitoreo

**Archivos prioritarios para testing:**
- [ ] `src/hooks/monitoring/use-retransmission.ts`
- [ ] `src/hooks/monitoring/use-vehicle-tracking.ts`
- [ ] `src/hooks/monitoring/use-route-playback.ts`
- [ ] `src/services/workflow.service.ts`
- [ ] `src/services/integration/module-connector.service.ts`

---

### DT-002: JSDoc Incompleto
**Descripcion:** Algunos archivos no tienen documentacion JSDoc.

**Tareas:**
- [ ] Agregar JSDoc a todos los tipos exportados
- [ ] Documentar parametros y retornos de funciones publicas
- [ ] Agregar ejemplos de uso

---

### DT-003: Tipos `any` Implícitos
**Descripcion:** Algunos lugares usan `any` o tienen inferencia incorrecta.

**Buscar y corregir:**
```bash
# Buscar any explicitos
grep -r ": any" src/
```

---

### DT-004: Consistencia de Imports
**Descripcion:** Mezcla de imports relativos y alias.

**Tareas:**
- [ ] Usar siempre alias `@/` para imports
- [ ] Configurar ESLint para forzar consistencia

---

### DT-005: Manejo de Errores Inconsistente
**Descripcion:** Algunos servicios no manejan errores correctamente.

**Tareas:**
- [ ] Crear clase de error personalizada `TmsError`
- [ ] Implementar error boundaries en componentes criticos
- [ ] Mostrar toast de error consistente

---

## 🔌 INTEGRACIONES PENDIENTES {#integraciones}

### INT-001: Conexion a API Real
**Estado:** Mock only  
**Servicios afectados:** Todos

**Tareas:**
- [ ] Definir contrato de API (OpenAPI/Swagger)
- [ ] Implementar cliente HTTP (axios/fetch)
- [ ] Configurar URLs por ambiente (dev/staging/prod)

---

### INT-002: Autenticacion y Autorizacion
**Estado:** No implementado  
**Impacto:** Acceso sin restricciones

**Tareas:**
- [ ] Implementar login con JWT
- [ ] Crear middleware de autenticacion
- [ ] Implementar roles y permisos
- [ ] Proteger rutas segun rol

---

### INT-003: WebSocket de GPS
**Estado:** Mock con datos estaticos

**Tareas:**
- [ ] Definir protocolo WebSocket
- [ ] Implementar handlers de mensajes
- [ ] Manejar reconexion automatica
- [ ] Buffering de mensajes offline

---

### INT-004: Exportacion de Reportes
**Estado:** Parcial (solo historico)

**Tareas:**
- [ ] Exportar ordenes a Excel
- [ ] Exportar reportes de flota
- [ ] Generar PDFs de ordenes cerradas

---

### INT-005: Notificaciones Push
**Estado:** No implementado

**Tareas:**
- [ ] Configurar service worker
- [ ] Implementar push notifications
- [ ] Crear centro de notificaciones

---

## ✅ CHECKLIST DE VERIFICACION {#checklist}

### Pre-Produccion

#### Build y Compilacion
- [x] Build exitoso sin errores
- [x] TypeScript sin errores
- [ ] ESLint sin warnings criticos
- [ ] Tests pasando (>80% cobertura)

#### Funcionalidad Core
- [x] CRUD Clientes funcional
- [x] CRUD Vehiculos funcional
- [x] CRUD Conductores funcional
- [x] CRUD Geocercas funcional
- [x] CRUD Workflows funcional
- [x] CRUD Operadores funcional *(añadido 02/Feb/2026)*
- [x] CRUD Productos funcional *(añadido 02/Feb/2026)*
- [x] Crear ordenes funcional
- [x] Ver ordenes funcional
- [ ] Cerrar ordenes probado
- [ ] Torre de Control tiempo real *(requiere backend WebSocket)*
- [ ] Retransmision actualiza cada 10s *(mock activo)*
- [ ] Multiventana hasta 20 unidades
- [ ] Historico con playback

#### Performance
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] CLS < 0.1
- [ ] No memory leaks en 30 min

#### Seguridad
- [ ] Autenticacion implementada
- [ ] Rutas protegidas
- [ ] HTTPS configurado
- [ ] Variables sensibles en env

#### UX
- [ ] Mobile responsive
- [ ] Accesibilidad basica (aria-labels)
- [ ] Estados de carga en todas las paginas
- [ ] Mensajes de error claros

---

## 📅 PRIORIDADES DE CORRECCION

### ~~Sprint 1 (Urgente)~~ ✅ COMPLETADO
1. ~~EC-001: Recharts dimensions~~ ✅
2. ~~W-002: Export de useOrders~~ ✅
3. ~~W-003: Barrel exports de services/orders~~ ✅
4. UX-001: Loading states (pendiente)

### ~~Sprint 2 (Alto)~~ ✅ COMPLETADO
1. ~~EC-003: Servicio de Operadores~~ ✅
2. ~~EC-004: Servicio de Productos~~ ✅
3. P-001: Virtualizacion (pendiente)
4. P-004: Debounce filtros (pendiente)

### Sprint 3 (Medio) - ACTUAL
1. DT-001: Tests
2. UX-002: Validacion visual
3. UX-003: Paginacion server-side
4. P-002: Memoizacion

### Sprint 4 (Bajo/Mejoras)
1. DT-002: JSDoc
2. UX-004: Loading de mapas
3. UX-005: Responsive completo
4. P-003: Lazy loading

---

## 📝 NOTAS ADICIONALES

### ~~Archivos a Revisar Manualmente~~ ✅ VERIFICADOS
```
src/components/dashboard/stat-card.tsx    # ✅ Fix Recharts aplicado (minWidth, minHeight, isAnimationActive)
src/services/master/index.ts              # ✅ operators/products exportados
src/services/orders/index.ts              # ✅ Exports completos
src/hooks/index.ts                        # ✅ useOrders y useOrderImportExport exportados
```

### Comandos Utiles para Debug
```bash
# Verificar tipos
npm run type-check

# Ejecutar lint
npm run lint

# Build completo
npm run build

# Buscar TODOs en codigo
grep -r "TODO" src/
```

---

**Ultima actualizacion:** 2 de Febrero 2026
**Responsable:** Equipo TMS-NAVITEL
