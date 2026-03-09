import type {
  IncidentCatalogItem,
  IncidentCategory,
  IncidentSeverity,
} from '@/types/incident';

/**
 * Catálogo de incidencias predefinidas - Vehículo
 */
const vehicleIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-veh-001',
    code: 'VEH-001',
    name: 'Falla mecánica',
    description: 'El vehículo presenta una falla mecánica que impide o dificulta la continuación del viaje.',
    category: 'vehicle',
    defaultSeverity: 'high',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'document'],
    minEvidenceCount: 1,
    requiresImmediateAction: true,
    suggestedActions: [
      'Estacionar en lugar seguro',
      'Contactar a servicio técnico',
      'Notificar a base',
      'Evaluar si requiere grúa',
    ],
    descriptionTemplate: 'Falla mecánica: {{descripcionFalla}}. Vehículo detenido en {{ubicacion}}.',
    additionalFields: [
      {
        id: 'af-1',
        label: 'Tipo de falla',
        type: 'select',
        required: true,
        options: [
          { value: 'engine', label: 'Motor' },
          { value: 'transmission', label: 'Transmisión' },
          { value: 'brakes', label: 'Frenos' },
          { value: 'electrical', label: 'Sistema eléctrico' },
          { value: 'suspension', label: 'Suspensión' },
          { value: 'tires', label: 'Neumáticos' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-2',
        label: 'Descripción de la falla',
        type: 'textarea',
        required: true,
        placeholder: 'Describa la falla con detalle',
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'mantenimiento'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 1,
    tags: ['mecánica', 'parada', 'urgente'],
  },
  {
    id: 'inc-veh-002',
    code: 'VEH-002',
    name: 'Pinchazo de llanta',
    description: 'Una o más llantas del vehículo sufrieron daño que requiere cambio o reparación.',
    category: 'vehicle',
    defaultSeverity: 'medium',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo'],
    minEvidenceCount: 2,
    requiresImmediateAction: true,
    suggestedActions: [
      'Estacionar en lugar seguro',
      'Colocar triángulos de seguridad',
      'Cambiar por llanta de repuesto',
      'Si no hay repuesto, solicitar auxilio',
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['operador'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 2,
    tags: ['llanta', 'neumático', 'parada'],
  },
  {
    id: 'inc-veh-003',
    code: 'VEH-003',
    name: 'Accidente de tránsito',
    description: 'El vehículo estuvo involucrado en un accidente de tránsito.',
    category: 'vehicle',
    defaultSeverity: 'critical',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'document', 'video'],
    minEvidenceCount: 3,
    requiresImmediateAction: true,
    suggestedActions: [
      'Verificar estado de conductor',
      'Llamar a emergencias si hay heridos',
      'No mover el vehículo hasta llegada de autoridades',
      'Tomar fotos de todo el escenario',
      'Obtener datos del tercero involucrado',
      'Notificar inmediatamente a la empresa',
    ],
    additionalFields: [
      {
        id: 'af-acc-1',
        label: 'Hay heridos',
        type: 'select',
        required: true,
        options: [
          { value: 'no', label: 'No' },
          { value: 'minor', label: 'Lesiones menores' },
          { value: 'serious', label: 'Lesiones graves' },
        ],
      },
      {
        id: 'af-acc-2',
        label: 'Tercero involucrado',
        type: 'select',
        required: true,
        options: [
          { value: 'no', label: 'No hay tercero' },
          { value: 'vehicle', label: 'Otro vehículo' },
          { value: 'pedestrian', label: 'Peatón' },
          { value: 'property', label: 'Propiedad' },
        ],
      },
      {
        id: 'af-acc-3',
        label: 'Placa del tercero',
        type: 'text',
        required: false,
        placeholder: 'ABC-123',
      },
      {
        id: 'af-acc-4',
        label: 'Número de parte policial',
        type: 'text',
        required: false,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'gerencia', 'legal', 'seguros'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 3,
    tags: ['accidente', 'urgente', 'crítico', 'legal'],
  },
  {
    id: 'inc-veh-004',
    code: 'VEH-004',
    name: 'Falla del sistema de refrigeración',
    description: 'El sistema de refrigeración del vehículo no funciona correctamente.',
    category: 'vehicle',
    defaultSeverity: 'critical',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo'],
    minEvidenceCount: 2,
    requiresImmediateAction: true,
    suggestedActions: [
      'Verificar temperatura de la carga',
      'Intentar reiniciar el sistema',
      'Buscar lugar con refrigeración alternativa',
      'Notificar a cliente sobre posible afectación',
    ],
    additionalFields: [
      {
        id: 'af-ref-1',
        label: 'Temperatura actual (°C)',
        type: 'number',
        required: true,
      },
      {
        id: 'af-ref-2',
        label: 'Temperatura requerida (°C)',
        type: 'number',
        required: true,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'calidad', 'cliente'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 4,
    tags: ['refrigeración', 'temperatura', 'cadena de frío', 'crítico'],
  },
];

/**
 * Catálogo de incidencias predefinidas - Carga
 */
const cargoIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-car-001',
    code: 'CAR-001',
    name: 'Daño a la mercancía',
    description: 'La mercancía transportada sufrió daños durante el viaje.',
    category: 'cargo',
    defaultSeverity: 'high',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'video'],
    minEvidenceCount: 3,
    requiresImmediateAction: false,
    suggestedActions: [
      'Documentar el daño con fotos',
      'Separar mercancía dañada',
      'Notificar al cliente',
      'Elaborar acta de daño',
    ],
    additionalFields: [
      {
        id: 'af-dam-1',
        label: 'Tipo de daño',
        type: 'select',
        required: true,
        options: [
          { value: 'broken', label: 'Roto/Fracturado' },
          { value: 'wet', label: 'Mojado' },
          { value: 'crushed', label: 'Aplastado' },
          { value: 'contaminated', label: 'Contaminado' },
          { value: 'missing', label: 'Faltante' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-dam-2',
        label: 'Cantidad afectada',
        type: 'number',
        required: true,
      },
      {
        id: 'af-dam-3',
        label: 'Valor estimado del daño (USD)',
        type: 'number',
        required: false,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'cliente', 'seguros'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 10,
    tags: ['daño', 'mercancía', 'reclamo'],
  },
  {
    id: 'inc-car-002',
    code: 'CAR-002',
    name: 'Faltante de mercancía',
    description: 'La cantidad de mercancía no coincide con lo documentado.',
    category: 'cargo',
    defaultSeverity: 'high',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'document'],
    minEvidenceCount: 2,
    requiresImmediateAction: true,
    suggestedActions: [
      'Verificar conteo nuevamente',
      'Revisar documentación de carga',
      'Verificar si quedó en origen',
      'Documentar faltante',
    ],
    additionalFields: [
      {
        id: 'af-fal-1',
        label: 'Cantidad documentada',
        type: 'number',
        required: true,
      },
      {
        id: 'af-fal-2',
        label: 'Cantidad real',
        type: 'number',
        required: true,
      },
      {
        id: 'af-fal-3',
        label: 'Descripción del faltante',
        type: 'textarea',
        required: true,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'cliente'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 11,
    tags: ['faltante', 'inventario', 'reclamo'],
  },
  {
    id: 'inc-car-003',
    code: 'CAR-003',
    name: 'Rechazo de mercancía',
    description: 'El cliente rechazó parcial o totalmente la mercancía.',
    category: 'cargo',
    defaultSeverity: 'high',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'document'],
    minEvidenceCount: 2,
    requiresImmediateAction: true,
    suggestedActions: [
      'Documentar motivo del rechazo',
      'Obtener constancia firmada del rechazo',
      'Notificar a origen',
      'Esperar instrucciones para la mercancía',
    ],
    additionalFields: [
      {
        id: 'af-rec-1',
        label: 'Motivo del rechazo',
        type: 'select',
        required: true,
        options: [
          { value: 'quality', label: 'Calidad no aceptable' },
          { value: 'quantity', label: 'Cantidad incorrecta' },
          { value: 'damage', label: 'Mercancía dañada' },
          { value: 'documentation', label: 'Documentación incorrecta' },
          { value: 'late', label: 'Llegada fuera de horario' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-rec-2',
        label: 'Cantidad rechazada',
        type: 'number',
        required: true,
      },
      {
        id: 'af-rec-3',
        label: 'Detalle del rechazo',
        type: 'textarea',
        required: true,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'cliente', 'ventas'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 12,
    tags: ['rechazo', 'cliente', 'devolución'],
  },
];

/**
 * Catálogo de incidencias predefinidas - Ruta
 */
const routeIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-rou-001',
    code: 'ROU-001',
    name: 'Bloqueo de vía',
    description: 'La ruta está bloqueada por protestas, accidentes u otras causas.',
    category: 'route',
    defaultSeverity: 'medium',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo'],
    minEvidenceCount: 1,
    requiresImmediateAction: false,
    suggestedActions: [
      'Buscar ruta alterna',
      'Estimar nuevo tiempo de llegada',
      'Notificar al cliente',
      'Mantenerse informado sobre reapertura',
    ],
    additionalFields: [
      {
        id: 'af-blo-1',
        label: 'Causa del bloqueo',
        type: 'select',
        required: true,
        options: [
          { value: 'protest', label: 'Protesta/Manifestación' },
          { value: 'accident', label: 'Accidente' },
          { value: 'construction', label: 'Obras en vía' },
          { value: 'landslide', label: 'Derrumbe' },
          { value: 'flood', label: 'Inundación' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-blo-2',
        label: 'Tiempo estimado de demora (min)',
        type: 'number',
        required: false,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['operador', 'cliente'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 20,
    tags: ['bloqueo', 'ruta', 'demora'],
  },
  {
    id: 'inc-rou-002',
    code: 'ROU-002',
    name: 'Congestión de tráfico severa',
    description: 'Tráfico excepcionalmente congestionado que causa retraso significativo.',
    category: 'route',
    defaultSeverity: 'low',
    requiresEvidence: false,
    requiresImmediateAction: false,
    suggestedActions: [
      'Recalcular ETA',
      'Evaluar rutas alternas',
      'Informar al cliente si el retraso es mayor a 30 min',
    ],
    additionalFields: [
      {
        id: 'af-tra-1',
        label: 'Tiempo estimado de demora (min)',
        type: 'number',
        required: true,
      },
      {
        id: 'af-tra-2',
        label: 'Ubicación del congestionamiento',
        type: 'text',
        required: true,
      },
    ],
    affectsCompliance: false,
    autoNotifyRoles: [],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 21,
    tags: ['tráfico', 'congestión', 'demora'],
  },
];

/**
 * Catálogo de incidencias predefinidas - Conductor
 */
const driverIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-drv-001',
    code: 'DRV-001',
    name: 'Malestar del conductor',
    description: 'El conductor reporta malestar físico que afecta su capacidad de conducción.',
    category: 'driver',
    defaultSeverity: 'high',
    requiresEvidence: false,
    requiresImmediateAction: true,
    suggestedActions: [
      'Detenerse en lugar seguro',
      'Evaluar gravedad del malestar',
      'Si es grave, buscar atención médica',
      'Coordinar conductor de relevo si es necesario',
    ],
    additionalFields: [
      {
        id: 'af-mal-1',
        label: 'Tipo de malestar',
        type: 'select',
        required: true,
        options: [
          { value: 'fatigue', label: 'Fatiga/Sueño' },
          { value: 'headache', label: 'Dolor de cabeza' },
          { value: 'stomach', label: 'Malestar estomacal' },
          { value: 'dizziness', label: 'Mareos' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-mal-2',
        label: 'Puede continuar',
        type: 'select',
        required: true,
        options: [
          { value: 'yes', label: 'Sí, con descanso breve' },
          { value: 'no', label: 'No, requiere relevo' },
          { value: 'medical', label: 'Requiere atención médica' },
        ],
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'rrhh'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 30,
    tags: ['conductor', 'salud', 'seguridad'],
  },
  {
    id: 'inc-drv-002',
    code: 'DRV-002',
    name: 'Documentación vencida/faltante',
    description: 'Se detecta que la documentación del conductor o vehículo está vencida o faltante.',
    category: 'driver',
    defaultSeverity: 'medium',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['document', 'photo'],
    minEvidenceCount: 1,
    requiresImmediateAction: true,
    suggestedActions: [
      'Verificar qué documento falta o venció',
      'Evaluar si puede continuar legalmente',
      'Gestionar obtención del documento',
      'Documentar para evitar futuras incidencias',
    ],
    additionalFields: [
      {
        id: 'af-doc-1',
        label: 'Documento afectado',
        type: 'select',
        required: true,
        options: [
          { value: 'license', label: 'Licencia de conducir' },
          { value: 'soat', label: 'SOAT' },
          { value: 'vehicle_inspection', label: 'Revisión técnica' },
          { value: 'insurance', label: 'Seguro' },
          { value: 'permit', label: 'Permiso de operación' },
          { value: 'other', label: 'Otro' },
        ],
      },
      {
        id: 'af-doc-2',
        label: 'Fecha de vencimiento',
        type: 'date',
        required: false,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'legal'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 31,
    tags: ['documentación', 'legal', 'conductor'],
  },
];

/**
 * Catálogo de incidencias predefinidas - Seguridad
 */
const securityIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-sec-001',
    code: 'SEC-001',
    name: 'Intento de robo',
    description: 'Se detectó o intentó un robo de la carga o vehículo.',
    category: 'security',
    defaultSeverity: 'critical',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo', 'video', 'document'],
    minEvidenceCount: 1,
    requiresImmediateAction: true,
    suggestedActions: [
      'Alejarse del peligro',
      'No confrontar a delincuentes',
      'Llamar a la policía',
      'Notificar inmediatamente a la empresa',
      'Documentar todo lo posible cuando sea seguro',
    ],
    additionalFields: [
      {
        id: 'af-rob-1',
        label: 'Resultado',
        type: 'select',
        required: true,
        options: [
          { value: 'prevented', label: 'Prevenido/Frustrado' },
          { value: 'partial_loss', label: 'Pérdida parcial' },
          { value: 'total_loss', label: 'Pérdida total' },
        ],
      },
      {
        id: 'af-rob-2',
        label: 'Hubo violencia física',
        type: 'select',
        required: true,
        options: [
          { value: 'no', label: 'No' },
          { value: 'threat', label: 'Solo amenazas' },
          { value: 'physical', label: 'Agresión física' },
        ],
      },
      {
        id: 'af-rob-3',
        label: 'Número de denuncia policial',
        type: 'text',
        required: false,
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'gerencia', 'seguridad', 'legal', 'seguros'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 40,
    tags: ['robo', 'seguridad', 'crítico', 'legal'],
  },
  {
    id: 'inc-sec-002',
    code: 'SEC-002',
    name: 'Sello de seguridad violado',
    description: 'Se detectó que el sello de seguridad del contenedor fue alterado o roto.',
    category: 'security',
    defaultSeverity: 'high',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo'],
    minEvidenceCount: 2,
    requiresImmediateAction: true,
    suggestedActions: [
      'No abrir el contenedor',
      'Documentar estado del sello',
      'Notificar inmediatamente',
      'Esperar instrucciones antes de continuar',
    ],
    additionalFields: [
      {
        id: 'af-sel-1',
        label: 'Número del sello original',
        type: 'text',
        required: true,
      },
      {
        id: 'af-sel-2',
        label: 'Estado del sello',
        type: 'select',
        required: true,
        options: [
          { value: 'broken', label: 'Roto' },
          { value: 'replaced', label: 'Reemplazado por otro' },
          { value: 'missing', label: 'Faltante' },
          { value: 'tampered', label: 'Manipulado' },
        ],
      },
    ],
    affectsCompliance: true,
    autoNotifyRoles: ['supervisor', 'seguridad', 'cliente'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 41,
    tags: ['sello', 'seguridad', 'contenedor'],
  },
];

/**
 * Catálogo de incidencias predefinidas - Clima
 */
const weatherIncidents: IncidentCatalogItem[] = [
  {
    id: 'inc-wea-001',
    code: 'WEA-001',
    name: 'Condiciones climáticas adversas',
    description: 'Condiciones del clima que afectan la seguridad o velocidad del transporte.',
    category: 'weather',
    defaultSeverity: 'low',
    requiresEvidence: true,
    acceptedEvidenceTypes: ['photo'],
    minEvidenceCount: 1,
    requiresImmediateAction: false,
    suggestedActions: [
      'Reducir velocidad',
      'Evaluar si es seguro continuar',
      'Buscar refugio si es necesario',
      'Actualizar ETA',
    ],
    additionalFields: [
      {
        id: 'af-cli-1',
        label: 'Condición climática',
        type: 'select',
        required: true,
        options: [
          { value: 'rain', label: 'Lluvia intensa' },
          { value: 'fog', label: 'Neblina densa' },
          { value: 'snow', label: 'Nevada' },
          { value: 'wind', label: 'Vientos fuertes' },
          { value: 'hail', label: 'Granizo' },
          { value: 'ice', label: 'Hielo en vía' },
        ],
      },
      {
        id: 'af-cli-2',
        label: 'Impacto estimado (min)',
        type: 'number',
        required: true,
      },
    ],
    affectsCompliance: false,
    autoNotifyRoles: ['operador'],
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    sortOrder: 50,
    tags: ['clima', 'demora', 'seguridad'],
  },
];

/**
 * Catálogo completo de incidencias
 */
export const mockIncidentsCatalog: IncidentCatalogItem[] = [
  ...vehicleIncidents,
  ...cargoIncidents,
  ...routeIncidents,
  ...driverIncidents,
  ...securityIncidents,
  ...weatherIncidents,
].sort((a, b) => a.sortOrder - b.sortOrder);

/**
 * Obtiene todos los items del catálogo
 * @returns Array de items del catálogo
 */
export const getAllIncidentCatalogItems = (): IncidentCatalogItem[] => {
  return mockIncidentsCatalog;
};

/**
 * Obtiene items activos del catálogo
 * @returns Items con status 'active'
 */
export const getActiveIncidentCatalogItems = (): IncidentCatalogItem[] => {
  return mockIncidentsCatalog.filter(item => item.status === 'active');
};

/**
 * Obtiene un item del catálogo por ID
 * @param id - ID del item
 * @returns Item o undefined
 */
export const getIncidentCatalogItemById = (id: string): IncidentCatalogItem | undefined => {
  return mockIncidentsCatalog.find(item => item.id === id);
};

/**
 * Obtiene items del catálogo por categoría
 * @param category - Categoría de incidencias
 * @returns Items de la categoría
 */
export const getIncidentCatalogItemsByCategory = (
  category: IncidentCategory
): IncidentCatalogItem[] => {
  return mockIncidentsCatalog.filter(
    item => item.category === category && item.status === 'active'
  );
};

/**
 * Obtiene items del catálogo por severidad
 * @param severity - Severidad de incidencias
 * @returns Items de la severidad
 */
export const getIncidentCatalogItemsBySeverity = (
  severity: IncidentSeverity
): IncidentCatalogItem[] => {
  return mockIncidentsCatalog.filter(
    item => item.defaultSeverity === severity && item.status === 'active'
  );
};

/**
 * Busca items en el catálogo
 * @param query - Texto de búsqueda
 * @returns Items que coinciden
 */
export const searchIncidentCatalog = (query: string): IncidentCatalogItem[] => {
  const lowerQuery = query.toLowerCase();
  return mockIncidentsCatalog.filter(
    item =>
      item.status === 'active' &&
      (item.name.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.code.toLowerCase().includes(lowerQuery) ||
        item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)))
  );
};

/**
 * Obtiene categorías disponibles con conteo
 * @returns Map de categoría a cantidad de items
 */
export const getIncidentCategoriesWithCount = (): Map<IncidentCategory, number> => {
  const counts = new Map<IncidentCategory, number>();
  
  mockIncidentsCatalog
    .filter(item => item.status === 'active')
    .forEach(item => {
      const current = counts.get(item.category) || 0;
      counts.set(item.category, current + 1);
    });
  
  return counts;
};

/**
 * Labels para categorías de incidencias
 */
export const incidentCategoryLabels: Record<IncidentCategory, string> = {
  vehicle: 'Vehículo',
  cargo: 'Carga',
  driver: 'Conductor',
  route: 'Ruta',
  customer: 'Cliente',
  weather: 'Clima',
  security: 'Seguridad',
  documentation: 'Documentación',
  other: 'Otros',
};

/**
 * Labels para severidad de incidencias
 */
export const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

/**
 * Colores para severidad de incidencias
 */
export const incidentSeverityColors: Record<IncidentSeverity, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};
