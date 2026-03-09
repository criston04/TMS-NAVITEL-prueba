# 📋 TODO LIST - MEJORAS FORMULARIO DE CREACIÓN DE ORDEN

> **Fecha de Creación:** 2 de Febrero 2026  
> **Módulo:** Órdenes - Formulario de Creación  
> **Prioridad:** Alta  
> **Estimación Total:** 5-7 días de desarrollo

---

## 📊 ANÁLISIS DE BRECHAS

### Estado Actual vs Requerido (Casos de Uso UC-O-01)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ANÁLISIS: FORMULARIO CREAR ORDEN                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  REQUERIDO (UC-O-01)              │ ESTADO ACTUAL        │ ACCIÓN               │
│  ─────────────────────────────────┼──────────────────────┼───────────────────── │
│                                                                                  │
│  PASO 1: DATOS BÁSICOS            │                      │                      │
│  ├─ Cliente (requerido)           │ ✅ Implementado      │ -                    │
│  ├─ Número de orden (auto/manual) │ ✅ Implementado      │ -                    │
│  ├─ Tipo de carga                 │ ✅ Implementado      │ -                    │
│  ├─ Descripción de carga          │ ✅ Implementado      │ -                    │
│  ├─ Peso total                    │ ✅ Implementado      │ -                    │
│  └─ Prioridad                     │ ✅ Implementado      │ -                    │
│                                                                                  │
│  PASO 2: WORKFLOW Y RUTA          │                      │                      │
│  ├─ Sugerir workflow por cliente  │ ✅ Implementado      │ -                    │
│  ├─ Cambiar workflow manualmente  │ ✅ Implementado      │ -                    │
│  ├─ Ver pasos del workflow        │ ✅ Implementado      │ -                    │
│  ├─ Generar milestones auto       │ ✅ Implementado      │ -                    │
│  ├─ Agregar/quitar waypoints      │ ✅ Implementado      │ -                    │
│  └─ Vista previa mapa             │ ✅ Implementado      │ -                    │
│                                                                                  │
│  PASO 3: ASIGNACIÓN               │                      │                      │
│  ├─ Seleccionar vehículo          │ ✅ Implementado      │ -                    │
│  ├─ Seleccionar conductor         │ ✅ Implementado      │ -                    │
│  ├─ Seleccionar transportista     │ ✅ Implementado      │ -                    │
│  ├─ Fecha de recolección          │ ✅ Implementado      │ -                    │
│  ├─ Fecha estimada de entrega     │ ✅ Implementado      │ -                    │
│  └─ Validar conflictos            │ ✅ Implementado      │ -                    │
│                                                                                  │
│  PASO 4: CONFIRMACIÓN             │                      │                      │
│  ├─ Resumen de la orden           │ ✅ Implementado      │ -                    │
│  └─ Botón crear                   │ ✅ Implementado      │ -                    │
│                                                                                  │
│  EXTRAS IDENTIFICADOS             │                      │                      │
│  ├─ Operador GPS                  │ ✅ Implementado      │ -                    │
│  ├─ Documentos adjuntos           │ ❌ No existe         │ Agregar              │
│  ├─ Info contacto cliente         │ ✅ Implementado      │ -                    │
│  └─ Wizard por pasos              │ ✅ Implementado      │ -                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 FASE 1: MEJORAS CRÍTICAS (Día 1-2) ✅ COMPLETADA

### 1.1 Selector de Workflow con Vista Previa
- [x] **[F1-01]** Crear componente `WorkflowSelector` ✅
  - Archivo: `src/components/orders/workflow-selector.tsx`
  - Funcionalidad:
    - [x] Dropdown para seleccionar workflow
    - [x] Badge "Sugerido" si es auto-asignado
    - [x] Botón "Cambiar" para selección manual
    - [x] Lista de workflows activos filtrados por cliente

- [x] **[F1-02]** Crear componente `WorkflowStepsPreview` ✅
  - Archivo: `src/components/orders/workflow-steps-preview.tsx`
  - Funcionalidad:
    - [x] Timeline vertical con pasos del workflow
    - [x] Mostrar geocerca de cada paso
    - [x] Mostrar tiempo estimado por paso
    - [x] Indicador de duración total

- [x] **[F1-03]** Integrar con `moduleConnectorService`
  - Usar `autoAssignWorkflow()` existente
  - Obtener `generatedMilestones` del resultado
  - Permitir override manual

### 1.2 Generación Automática de Milestones
- [x] **[F1-04]** Modificar lógica de milestones en `order-form.tsx`
  - Al seleccionar workflow → generar milestones automáticamente
  - Usar `moduleConnectorService.generateMilestonesFromWorkflow()`
  - Mantener opción de editar/agregar waypoints extra

- [x] **[F1-05]** Crear componente `MilestoneEditor` ✅
  - Archivo: `src/components/orders/milestone-editor.tsx`
  - Funcionalidad:
    - [x] Lista de milestones generados (bloqueados)
    - [x] Opción de agregar waypoints extra
    - [x] Reordenar con flechas arriba/abajo
    - [x] Eliminar solo waypoints (no origen/destino)

### 1.3 Campo de Transportista/Carrier
- [x] **[F1-06]** Agregar selector de Transportista ✅
  - Archivo: `src/components/orders/carrier-selector.tsx`
  - En sección "Asignación"
  - Conectar con mock de carriers
  - Opcional (puede ser flota propia o tercerizada)

---

## 🎯 FASE 2: MEJORAS IMPORTANTES (Día 3-4) ✅ COMPLETADA

### 2.1 Vista Previa de Ruta en Mapa
- [x] **[F2-01]** Crear componente `RoutePreviewMap` ✅
  - Archivo: `src/components/orders/route-preview-map.tsx`
  - Funcionalidad:
    - [x] Mapa Leaflet mini (400x300px)
    - [x] Marcadores para cada milestone
    - [x] Líneas conectando puntos
    - [x] Auto-zoom para mostrar toda la ruta
    - [x] Colores diferentes: origen (verde), waypoints (azul), destino (rojo)

- [x] **[F2-02]** Integrar mapa con milestones
  - Actualizar mapa cuando cambian milestones
  - Click en marcador → highlight en lista
  - Lazy load con dynamic import

### 2.2 Validación de Conflictos de Recursos
- [x] **[F2-03]** Crear hook `useResourceConflicts` ✅
  - Archivo: `src/hooks/orders/use-resource-conflicts.ts`
  - Funcionalidad:
    - [x] Verificar disponibilidad de vehículo en fechas
    - [x] Verificar disponibilidad de conductor
    - [x] Retornar lista de conflictos

- [x] **[F2-04]** Crear componente `ConflictWarning` ✅
  - Archivo: `src/components/orders/conflict-warning.tsx`
  - Mostrar alertas si hay conflictos
  - Opciones: "Forzar asignación" o "Cambiar recurso"

### 2.3 Número de Orden Auto/Manual
- [x] **[F2-05]** Agregar campo número de orden ✅
  - Archivo: `src/components/orders/order-number-field.tsx`
  - Toggle: "Generar automáticamente" / "Ingresar manual"
  - Formato: ORD-YYYY-XXXXX
  - Validar unicidad

---

## 🎯 FASE 3: MEJORAS DE UX (Día 5-6) ✅ COMPLETADA

### 3.1 Wizard por Pasos
- [x] **[F3-01]** Crear componente `OrderFormWizard`
  - Archivo: `src/components/orders/order-form-wizard.tsx`
  - Pasos:
    1. Datos Básicos (Cliente, Carga, Prioridad)
    2. Workflow y Ruta (Workflow, Milestones, Mapa)
    3. Asignación (Vehículo, Conductor, Fechas)
    4. Confirmación (Resumen)

- [x] **[F3-02]** Crear componente `WizardNavigation`
  - Indicador de pasos (stepper)
  - Botones Anterior/Siguiente
  - Validación por paso antes de avanzar

- [x] **[F3-03]** Crear componente `OrderSummary`
  - Archivo: `src/components/orders/order-summary.tsx`
  - Resumen completo antes de crear
  - Secciones colapsables
  - Botón "Editar" para volver a cada sección

### 3.2 Información de Contacto del Cliente
- [x] **[F3-04]** Mostrar info de contacto al seleccionar cliente
  - Card con datos del cliente
  - Contacto principal (nombre, email, teléfono)
  - Dirección principal

- [x] **[F3-05]** Agregar campo "Contacto específico para esta orden"
  - Nombre de contacto
  - Teléfono
  - Email
  - Notas de contacto

### 3.3 Operador GPS
- [x] **[F3-06]** Agregar selector de Operador GPS
  - Conectar con mock de GPS operators
  - Auto-seleccionar si viene con vehículo
  - Permite override manual

---

## 🎯 FASE 4: FUNCIONALIDADES ADICIONALES (Día 7+)

### 4.1 Documentos Adjuntos
- [ ] **[F4-01]** Crear componente `DocumentUploader`
  - Archivo: `src/components/orders/document-uploader.tsx`
  - Funcionalidad:
    - [ ] Drag & drop de archivos
    - [ ] Lista de tipos: Factura, Guía, Remisión, Otro
    - [ ] Preview de archivos
    - [ ] Límite de tamaño (10MB)

### 4.2 Estimaciones de Tiempo
- [ ] **[F4-02]** Calcular ETA entre milestones
  - Usar distancia entre geocercas
  - Velocidad promedio configurable
  - Mostrar ETA estimado en cada milestone

### 4.3 Templates de Órdenes
- [ ] **[F4-03]** Crear sistema de templates
  - Guardar configuración frecuente como template
  - Cargar template al crear orden
  - Templates por cliente

---

## 📁 ESTRUCTURA DE ARCHIVOS A CREAR

```
src/components/orders/
├── index.ts (actualizar exports)
├── order-form.tsx (modificar - wizard)
├── order-form-wizard.tsx (nuevo)
├── wizard-navigation.tsx (nuevo)
├── workflow-selector.tsx (nuevo)
├── workflow-steps-preview.tsx (nuevo)
├── milestone-editor.tsx (nuevo)
├── route-preview-map.tsx (nuevo)
├── conflict-warning.tsx (nuevo)
├── order-summary.tsx (nuevo)
├── customer-contact-card.tsx (nuevo)
└── document-uploader.tsx (nuevo)

src/hooks/orders/
├── index.ts (nuevo)
├── use-resource-conflicts.ts (nuevo)
└── use-order-form.ts (nuevo - extraer lógica)
```

---

## 🔗 CONEXIONES CON MÓDULOS EXISTENTES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    INTEGRACIONES REQUERIDAS                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  SERVICIO                          │ MÉTODO                  │ USO              │
│  ──────────────────────────────────┼─────────────────────────┼───────────────── │
│                                                                                  │
│  moduleConnectorService            │ autoAssignWorkflow()    │ Sugerir workflow │
│  moduleConnectorService            │ generateMilestones()    │ Crear milestones │
│  moduleConnectorService            │ validateScheduling()    │ Validar fechas   │
│                                                                                  │
│  unifiedWorkflowService            │ getAll()                │ Lista workflows  │
│  unifiedWorkflowService            │ getById()               │ Detalle workflow │
│  unifiedWorkflowService            │ getActive()             │ Solo activos     │
│                                                                                  │
│  customersMock                     │ -                       │ Lista clientes   │
│  geofencesMock                     │ -                       │ Lista geocercas  │
│  vehiclesMock                      │ -                       │ Lista vehículos  │
│  driversMock                       │ -                       │ Lista conductores│
│  carriersMock (crear)              │ -                       │ Transportistas   │
│  gpsOperatorsMock                  │ -                       │ Operadores GPS   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📅 CRONOGRAMA DE IMPLEMENTACIÓN

| Fase | Días | Descripción | Prioridad |
|------|------|-------------|-----------|
| 1 | 1-2 | Workflow selector + Milestones auto | 🔴 Alta |
| 2 | 3-4 | Mapa preview + Validación conflictos | 🟡 Media |
| 3 | 5-6 | Wizard + UX improvements | 🟡 Media |
| 4 | 7+ | Documentos + Extras | 🟢 Baja |
| **Total** | **7+** | | |

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Funcionales
- [ ] Al seleccionar cliente, sistema sugiere workflow apropiado
- [ ] Usuario puede cambiar workflow manualmente
- [ ] Al seleccionar workflow, se generan milestones automáticamente
- [ ] Mapa muestra preview de la ruta con todos los milestones
- [ ] Sistema detecta conflictos de vehículo/conductor en fechas
- [ ] Wizard guía al usuario por 4 pasos claros
- [ ] Resumen muestra toda la información antes de crear

### Técnicos
- [ ] 0 errores de TypeScript
- [ ] 0 errores de ESLint
- [ ] Componentes usan Tailwind CSS
- [ ] Mapa cargado con dynamic import (SSR: false)
- [ ] Formulario valida antes de cada paso

### UX
- [ ] Feedback visual claro en cada acción
- [ ] Loading states en operaciones async
- [ ] Mensajes de error descriptivos
- [ ] Responsive en tablet y desktop

---

## 🚀 COMANDO PARA INICIAR

```bash
# Verificar estado actual
npm run type-check
npm run lint

# Iniciar desarrollo
npm run dev
```

---

**Nota:** Este TODO sigue la estructura del caso de uso UC-O-01 del documento USE-CASES-CLIENT.md

