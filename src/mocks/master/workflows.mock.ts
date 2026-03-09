import type { Workflow, WorkflowStep, WorkflowStatus } from '@/types/workflow';

/**
 * Tipos de workflow disponibles
 */
export const workflowTypes = [
  { value: 'import', label: 'Importación', icon: 'Download', color: '#3b82f6' },
  { value: 'export', label: 'Exportación', icon: 'Upload', color: '#10b981' },
  { value: 'single_service', label: 'Servicio Único', icon: 'Package', color: '#f59e0b' },
  { value: 'distribution', label: 'Distribución', icon: 'Truck', color: '#8b5cf6' },
  { value: 'recurring', label: 'Servicio Recurrente', icon: 'RefreshCw', color: '#ec4899' },
  { value: 'other', label: 'Otro', icon: 'MoreHorizontal', color: '#6b7280' },
] as const;

export type WorkflowType = typeof workflowTypes[number]['value'];

/**
 * Estados de workflow con estilos
 */
export const workflowStatusConfig: Record<WorkflowStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Activo', color: '#10b981', bgColor: '#d1fae5' },
  inactive: { label: 'Inactivo', color: '#6b7280', bgColor: '#f3f4f6' },
  draft: { label: 'Borrador', color: '#f59e0b', bgColor: '#fef3c7' },
};

/**
 * Hitos/pasos de ejemplo para workflows
 */
export const sampleMilestones: Partial<WorkflowStep>[] = [
  {
    name: 'Origen - Carga',
    description: 'Punto de carga inicial',
    action: 'enter_geofence',
    estimatedDurationMinutes: 60,
    color: '#3b82f6',
    icon: 'Package',
  },
  {
    name: 'Aduana de Salida',
    description: 'Despacho aduanero de salida',
    action: 'manual_check',
    estimatedDurationMinutes: 120,
    color: '#f59e0b',
    icon: 'FileCheck',
  },
  {
    name: 'Punto de Control',
    description: 'Verificación en ruta',
    action: 'enter_geofence',
    estimatedDurationMinutes: 30,
    color: '#8b5cf6',
    icon: 'Shield',
  },
  {
    name: 'Aduana de Entrada',
    description: 'Despacho aduanero de entrada',
    action: 'manual_check',
    estimatedDurationMinutes: 180,
    color: '#f59e0b',
    icon: 'FileCheck',
  },
  {
    name: 'Destino - Descarga',
    description: 'Punto de descarga final',
    action: 'enter_geofence',
    estimatedDurationMinutes: 45,
    color: '#10b981',
    icon: 'MapPin',
  },
];

/**
 * Workflows de ejemplo
 */
export const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'Importación Marítima Standard',
    description: 'Workflow estándar para importaciones marítimas desde el puerto del Callao',
    code: 'IMP-MAR-STD',
    status: 'active',
    version: 1,
    isDefault: true,
    steps: [
      {
        id: 'step-001',
        name: 'Puerto del Callao',
        description: 'Recepción de contenedor en puerto',
        sequence: 1,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-004', // Puerto del Callao (GEO-PUERTO-CALLAO)
          geofenceName: 'Puerto del Callao',
          instructions: 'Confirmar ingreso al terminal portuario',
        },
        estimatedDurationMinutes: 120,
        maxDurationMinutes: 240,
        transitionConditions: [],
        notifications: [],
        color: '#3b82f6',
        icon: 'Anchor',
      },
      {
        id: 'step-002',
        name: 'Despacho Aduanero',
        description: 'Proceso de nacionalización',
        sequence: 2,
        action: 'manual_check',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          instructions: 'Completar trámites aduaneros y obtener levante',
        },
        estimatedDurationMinutes: 180,
        maxDurationMinutes: 480,
        transitionConditions: [],
        notifications: [],
        color: '#f59e0b',
        icon: 'FileCheck',
      },
      {
        id: 'step-003',
        name: 'Almacén Central',
        description: 'Entrega en almacén del cliente',
        sequence: 3,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-001', // Almacén Central Lima (GEO-ALMACEN-LIMA)
          geofenceName: 'Almacén Central Lima',
          instructions: 'Confirmar descarga completa',
        },
        estimatedDurationMinutes: 60,
        maxDurationMinutes: 120,
        transitionConditions: [],
        notifications: [],
        color: '#10b981',
        icon: 'Warehouse',
      },
    ],
    escalationRules: [],
    applicableCargoTypes: ['container', 'general'],
    applicableCustomerIds: [],
    createdAt: '2024-01-15T10:00:00Z',
    createdBy: 'admin',
    updatedAt: '2024-01-20T15:30:00Z',
    updatedBy: 'admin',
  },
  {
    id: 'wf-002',
    name: 'Exportación Aérea Express',
    description: 'Workflow para exportaciones aéreas con tiempo crítico',
    code: 'EXP-AIR-EXP',
    status: 'active',
    version: 2,
    isDefault: false,
    steps: [
      {
        id: 'step-004',
        name: 'Planta de Producción',
        description: 'Recojo de mercancía en origen',
        sequence: 1,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-003', // Planta de Producción Callao (GEO-PLANTA-CALLAO)
          geofenceName: 'Planta de Producción Callao',
          instructions: 'Verificar documentación de exportación',
        },
        estimatedDurationMinutes: 45,
        maxDurationMinutes: 90,
        transitionConditions: [],
        notifications: [],
        color: '#3b82f6',
        icon: 'Factory',
      },
      {
        id: 'step-005',
        name: 'Checkpoint Salida',
        description: 'Control de salida en carretera',
        sequence: 2,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-005', // Checkpoint Panamericana (GEO-CHECKPOINT-PANAMERICANA)
          geofenceName: 'Checkpoint Panamericana Norte',
          instructions: 'Verificación de documentos de transporte',
        },
        estimatedDurationMinutes: 15,
        maxDurationMinutes: 30,
        transitionConditions: [],
        notifications: [],
        color: '#8b5cf6',
        icon: 'Shield',
      },
      {
        id: 'step-006',
        name: 'Aeropuerto Jorge Chávez',
        description: 'Entrega en terminal de carga aérea',
        sequence: 3,
        action: 'manual_check',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          instructions: 'Entrega en almacén de aerolínea - Confirmar recepción',
        },
        estimatedDurationMinutes: 60,
        maxDurationMinutes: 120,
        transitionConditions: [],
        notifications: [],
        color: '#10b981',
        icon: 'Plane',
      },
    ],
    escalationRules: [],
    applicableCargoTypes: ['air_freight', 'express'],
    applicableCustomerIds: [],
    createdAt: '2024-02-10T08:00:00Z',
    createdBy: 'admin',
    updatedAt: '2024-02-15T12:00:00Z',
    updatedBy: 'admin',
  },
  {
    id: 'wf-003',
    name: 'Distribución Urbana Lima',
    description: 'Workflow para distribución de última milla en Lima Metropolitana',
    code: 'DIST-URB-LIM',
    status: 'active',
    version: 1,
    isDefault: false,
    steps: [
      {
        id: 'step-007',
        name: 'Centro de Distribución',
        description: 'Carga de unidades en CD',
        sequence: 1,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-001', // Almacén Central Lima (GEO-ALMACEN-LIMA)
          geofenceName: 'Almacén Central Lima',
          instructions: 'Cargar según manifiesto',
        },
        estimatedDurationMinutes: 30,
        maxDurationMinutes: 60,
        transitionConditions: [],
        notifications: [],
        color: '#3b82f6',
        icon: 'Package',
      },
      {
        id: 'step-008',
        name: 'Zona de Entrega Surco',
        description: 'Entregas sector Surco',
        sequence: 2,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-007', // Zona de Entrega Surco (GEO-DELIVERY-SURCO)
          geofenceName: 'Zona de Entrega Surco',
          instructions: 'Completar entregas del sector',
        },
        estimatedDurationMinutes: 120,
        maxDurationMinutes: 180,
        transitionConditions: [],
        notifications: [],
        color: '#22c55e',
        icon: 'MapPin',
      },
      {
        id: 'step-009',
        name: 'Cliente Premium Miraflores',
        description: 'Entrega prioritaria cliente VIP',
        sequence: 3,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-002', // Cliente Premium Miraflores (GEO-CLIENTE-MIRAFLORES)
          geofenceName: 'Cliente Premium - Miraflores',
          instructions: 'Entrega prioritaria - Confirmar firma',
        },
        estimatedDurationMinutes: 30,
        maxDurationMinutes: 60,
        transitionConditions: [],
        notifications: [],
        color: '#10b981',
        icon: 'Star',
      },
      {
        id: 'step-010',
        name: 'Supermercado San Juan',
        description: 'Entrega cliente regular',
        sequence: 4,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-008', // Supermercado San Juan (GEO-CLIENTE-SANJUAN)
          geofenceName: 'Supermercado San Juan',
          instructions: 'Entrega en recepción de mercancías',
        },
        estimatedDurationMinutes: 45,
        maxDurationMinutes: 90,
        transitionConditions: [],
        notifications: [],
        color: '#0ea5e9',
        icon: 'ShoppingCart',
      },
      {
        id: 'step-011',
        name: 'Retorno a Almacén',
        description: 'Regreso al centro de distribución',
        sequence: 5,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-001', // Almacén Central Lima (GEO-ALMACEN-LIMA)
          geofenceName: 'Almacén Central Lima',
          instructions: 'Liquidar ruta y devolver no entregados',
        },
        estimatedDurationMinutes: 30,
        maxDurationMinutes: 60,
        transitionConditions: [],
        notifications: [],
        color: '#10b981',
        icon: 'CheckCircle',
      },
    ],
    escalationRules: [],
    applicableCargoTypes: ['parcels', 'packages'],
    applicableCustomerIds: [],
    createdAt: '2024-03-01T09:00:00Z',
    createdBy: 'admin',
    updatedAt: '2024-03-05T14:00:00Z',
    updatedBy: 'admin',
  },
  {
    id: 'wf-004',
    name: 'Servicio Recurrente - Minería',
    description: 'Workflow para servicios de transporte recurrente a unidades mineras',
    code: 'REC-MIN-001',
    status: 'draft',
    version: 1,
    isDefault: false,
    steps: [
      {
        id: 'step-010',
        name: 'Almacén Proveedor',
        description: 'Carga de suministros',
        sequence: 1,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-supplier-001',
          geofenceName: 'Almacén de Suministros',
        },
        estimatedDurationMinutes: 60,
        transitionConditions: [],
        notifications: [],
        color: '#3b82f6',
        icon: 'Package',
      },
      {
        id: 'step-011',
        name: 'Unidad Minera',
        description: 'Entrega en campamento minero',
        sequence: 2,
        action: 'enter_geofence',
        isRequired: true,
        canSkip: false,
        actionConfig: {
          geofenceId: 'geo-mine-001',
          geofenceName: 'Unidad Minera Cerro Verde',
        },
        estimatedDurationMinutes: 480,
        transitionConditions: [],
        notifications: [],
        color: '#10b981',
        icon: 'Mountain',
      },
    ],
    escalationRules: [],
    applicableCargoTypes: ['mining_supplies'],
    applicableCustomerIds: ['cust-mining-001'],
    createdAt: '2024-03-10T11:00:00Z',
    createdBy: 'admin',
    updatedAt: '2024-03-10T11:00:00Z',
    updatedBy: 'admin',
  },
];

/**
 * Clientes de ejemplo para asociar workflows
 */
export const mockCustomersForWorkflow = [
  { id: 'cust-001', name: 'Alicorp S.A.A.', code: 'ALICORP' },
  { id: 'cust-002', name: 'Gloria S.A.', code: 'GLORIA' },
  { id: 'cust-003', name: 'Backus y Johnston', code: 'BACKUS' },
  { id: 'cust-004', name: 'Minera Cerro Verde', code: 'CERROVERDE' },
  { id: 'cust-005', name: 'Southern Perú', code: 'SOUTHERN' },
];

/**
 * Geocercas de ejemplo para hitos
 * SINCRONIZADO con src/mocks/master/geofences.mock.ts
 */
export const mockGeofencesForMilestones = [
  { id: 'geo-001', name: 'Almacén Central Lima', type: 'warehouse', color: '#3B82F6' },
  { id: 'geo-002', name: 'Cliente Premium - Miraflores', type: 'customer', color: '#10B981' },
  { id: 'geo-003', name: 'Planta de Producción Callao', type: 'plant', color: '#F59E0B' },
  { id: 'geo-004', name: 'Puerto del Callao', type: 'port', color: '#06B6D4' },
  { id: 'geo-005', name: 'Checkpoint Panamericana Norte', type: 'checkpoint', color: '#8B5CF6' },
  { id: 'geo-006', name: 'Zona Restringida Centro Histórico', type: 'restricted', color: '#EF4444' },
  { id: 'geo-007', name: 'Zona de Entrega Surco', type: 'delivery', color: '#22C55E' },
  { id: 'geo-008', name: 'Supermercado San Juan', type: 'customer', color: '#0EA5E9' },
];
