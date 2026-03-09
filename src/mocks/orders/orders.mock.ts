import type {
  Order,
  OrderStatus,
  OrderPriority,
  OrderSyncStatus,
  OrderMilestone,
  MilestoneStatus,
  CargoType,
  OrderStatusHistory,
  ServiceType,
} from '@/types/order';

/**
 * Genera un ID único para elementos mock
 * @param prefix - Prefijo para el ID
 * @returns ID único con formato prefix-timestamp-random
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Genera una fecha aleatoria dentro de un rango
 * @param start - Fecha de inicio
 * @param end - Fecha de fin
 * @returns Fecha ISO string
 */
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
};

/**
 * Selecciona un elemento aleatorio de un array
 * @param arr - Array de elementos
 * @returns Elemento aleatorio
 */
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Lista de clientes mock para órdenes (sincronizado con shared-data.ts)
 */
const mockCustomers = [
  { id: 'cust-001', name: 'Alicorp S.A.A.', code: 'ALC', email: 'logistica@alicorp.com.pe' },
  { id: 'cust-002', name: 'Gloria S.A.', code: 'GLO', email: 'distribucion@gloria.com.pe' },
  { id: 'cust-003', name: 'Sodimac Perú S.A.', code: 'SDM', email: 'transporte@sodimac.com.pe' },
  { id: 'cust-004', name: 'Minera Las Bambas S.A.', code: 'MLB', email: 'logistica@lasbambas.com.pe' },
  { id: 'cust-005', name: 'Southern Peru Copper Corporation', code: 'SPC', email: 'logistics@southernperu.com.pe' },
  { id: 'cust-006', name: 'Unión de Cervecerías Peruanas Backus', code: 'BKS', email: 'distribucion@backus.com.pe' },
  { id: 'cust-007', name: 'Cementos Pacasmayo S.A.A.', code: 'CPM', email: 'logistica@cementospacasmayo.com.pe' },
  { id: 'cust-008', name: 'Petróleos del Perú - Petroperú S.A.', code: 'PPE', email: 'transporte@petroperu.com.pe' },
];

/**
 * Lista de transportistas mock (sincronizado con shared-data.ts)
 */
const mockCarriers = [
  { id: 'car-001', name: 'Transportes Cruz del Sur S.A.C.' },
  { id: 'car-002', name: 'Ransa Comercial S.A.' },
  { id: 'car-003', name: 'Transportes Línea S.A.' },
  { id: 'car-004', name: 'Neptunia S.A.' },
  { id: 'car-005', name: 'San Lorenzo Logística S.A.C.' },
];

/**
 * Lista de operadores GPS mock (sincronizado con shared-data.ts)
 */
const mockGPSOperators = [
  { id: 'gps-op-001', name: 'Wialon Pro' },
  { id: 'gps-op-002', name: 'Navitel Fleet Manager' },
  { id: 'gps-op-003', name: 'Geotab Connect' },
  { id: 'gps-op-004', name: 'GPS Tracker Plus' },
];

/**
 * Lista de vehículos mock para órdenes (sincronizado con shared-data.ts)
 */
const mockVehicles = [
  { id: 'veh-001', plate: 'ABC-123', brand: 'Volvo', model: 'FH 540', type: 'tractocamion' as const },
  { id: 'veh-002', plate: 'XYZ-789', brand: 'Mercedes-Benz', model: 'Actros 2645', type: 'camion' as const },
  { id: 'veh-003', plate: 'DEF-456', brand: 'Scania', model: 'R450', type: 'tractocamion' as const },
  { id: 'veh-004', plate: 'GHI-321', brand: 'Kenworth', model: 'T680', type: 'camion' as const },
  { id: 'veh-005', plate: 'JKL-654', brand: 'Freightliner', model: 'M2 106', type: 'furgoneta' as const },
];

/**
 * Lista de conductores mock (sincronizado con shared-data.ts)
 */
const mockDrivers = [
  { id: 'drv-001', fullName: 'Juan Carlos Pérez López', phone: '+51 999 111 222', licenseNumber: 'Q45678912' },
  { id: 'drv-002', fullName: 'Pedro Ramírez García', phone: '+51 998 222 333', licenseNumber: 'Q78912345' },
  { id: 'drv-003', fullName: 'Carlos Alberto Mendoza Ríos', phone: '+51 987 654 321', licenseNumber: 'Q12345678' },
  { id: 'drv-004', fullName: 'Roberto González Díaz', phone: '+51 996 555 666', licenseNumber: 'Q87654321' },
  { id: 'drv-005', fullName: 'Miguel Ángel Sánchez Torres', phone: '+51 995 777 888', licenseNumber: 'Q23456789' },
];

/**
 * Ubicaciones predefinidas para hitos
 */
const mockLocations = [
  { name: 'Almacén Central Lima', address: 'Av. Argentina 1234, Callao', lat: -12.0464, lng: -77.0428 },
  { name: 'Centro Distribución Arequipa', address: 'Parque Industrial Río Seco', lat: -16.4090, lng: -71.5375 },
  { name: 'Terminal Matarani', address: 'Puerto Matarani, Islay', lat: -17.0000, lng: -72.1000 },
  { name: 'Planta Procesadora Cusco', address: 'Zona Industrial Wanchaq', lat: -13.5320, lng: -71.9675 },
  { name: 'Depósito Trujillo', address: 'Panamericana Norte Km 562', lat: -8.1116, lng: -79.0288 },
  { name: 'Almacén Piura', address: 'Zona Industrial Sullana', lat: -5.1945, lng: -80.6328 },
  { name: 'Centro Logístico Chiclayo', address: 'Carretera Lambayeque Km 8', lat: -6.7714, lng: -79.8409 },
  { name: 'Terminal Ilo', address: 'Puerto de Ilo, Moquegua', lat: -17.6394, lng: -71.3375 },
  { name: 'Planta Huancayo', address: 'Zona Industrial El Tambo', lat: -12.0651, lng: -75.2049 },
  { name: 'Depósito Pucallpa', address: 'Carretera Federico Basadre Km 5', lat: -8.3791, lng: -74.5539 },
];

/**
 * Genera hitos para una orden
 * @param orderId - ID de la orden
 * @param count - Cantidad de hitos (mínimo 2: origen y destino)
 * @param status - Estado de la orden para determinar progreso de hitos
 * @returns Array de hitos
 */
const generateMilestones = (
  orderId: string,
  count: number,
  status: OrderStatus
): OrderMilestone[] => {
  const locations = [...mockLocations].sort(() => Math.random() - 0.5).slice(0, count);
  const baseDate = new Date();
  
  return locations.map((loc, index) => {
    const isFirst = index === 0;
    const isLast = index === locations.length - 1;
    
    // Determinar estado del hito basado en el estado de la orden y posición
    let milestoneStatus: MilestoneStatus = 'pending';
    let actualEntry: string | undefined;
    let actualExit: string | undefined;
    let delayMinutes: number | undefined;
    
    if (status === 'completed' || status === 'closed') {
      milestoneStatus = 'completed';
      actualEntry = randomDate(new Date(baseDate.getTime() - 86400000), baseDate);
      actualExit = randomDate(new Date(actualEntry), baseDate);
      delayMinutes = Math.floor(Math.random() * 60) - 20;
    } else if (status === 'in_transit' || status === 'at_milestone') {
      if (index < Math.floor(count / 2)) {
        milestoneStatus = 'completed';
        actualEntry = randomDate(new Date(baseDate.getTime() - 86400000), baseDate);
        actualExit = randomDate(new Date(actualEntry), baseDate);
      } else if (index === Math.floor(count / 2)) {
        milestoneStatus = status === 'at_milestone' ? 'in_progress' : 'approaching';
        if (milestoneStatus === 'in_progress') {
          actualEntry = new Date().toISOString();
        }
      }
    } else if (status === 'delayed') {
      if (index < Math.floor(count / 2)) {
        milestoneStatus = 'completed';
        actualEntry = randomDate(new Date(baseDate.getTime() - 86400000), baseDate);
        actualExit = randomDate(new Date(actualEntry), baseDate);
        delayMinutes = Math.floor(Math.random() * 120) + 30;
      } else if (index === Math.floor(count / 2)) {
        milestoneStatus = 'delayed';
        delayMinutes = Math.floor(Math.random() * 180) + 60;
      }
    }
    
    const estimatedArrival = new Date(baseDate.getTime() + (index * 8 * 3600000));
    const estimatedDeparture = new Date(estimatedArrival.getTime() + 2 * 3600000);
    
    return {
      id: `${orderId}-ms-${index + 1}`,
      orderId,
      geofenceId: `geo-${loc.name.toLowerCase().replace(/\s/g, '-')}`,
      geofenceName: loc.name,
      type: isFirst ? 'origin' : isLast ? 'destination' : 'waypoint',
      sequence: index + 1,
      address: loc.address,
      coordinates: { lat: loc.lat, lng: loc.lng },
      estimatedArrival: estimatedArrival.toISOString(),
      estimatedDeparture: estimatedDeparture.toISOString(),
      actualEntry,
      actualExit,
      status: milestoneStatus,
      delayMinutes,
      notes: index === 0 ? 'Punto de carga inicial' : isLast ? 'Punto de entrega final' : undefined,
      contact: {
        name: `Contacto ${loc.name}`,
        phone: `+51 9${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        email: `contacto@${loc.name.toLowerCase().replace(/\s/g, '')}.com`,
      },
    };
  });
};

/**
 * Genera historial de estados para una orden
 * @param status - Estado actual de la orden
 * @returns Array de historial de estados
 */
const generateStatusHistory = (status: OrderStatus): OrderStatusHistory[] => {
  const history: OrderStatusHistory[] = [];
  
  // Para draft, no hay historial de transiciones aún
  if (status === 'draft') {
    return [];
  }
  
  // Para cancelled, puede venir desde draft o pending
  if (status === 'cancelled') {
    const cancelledFrom = Math.random() > 0.5 ? ['draft', 'pending'] : ['draft', 'pending', 'assigned'];
    const statuses: OrderStatus[] = [...cancelledFrom, 'cancelled'] as OrderStatus[];
    const users = ['admin@navitel.com', 'operador@navitel.com', 'supervisor@navitel.com'];
    const userNames = ['Administrador Sistema', 'Juan Operador', 'María Supervisora'];
    const baseDate = new Date();
    
    for (let i = 1; i < statuses.length; i++) {
      const userIndex = Math.floor(Math.random() * users.length);
      history.push({
        id: generateId('hist'),
        fromStatus: statuses[i - 1],
        toStatus: statuses[i],
        changedAt: new Date(baseDate.getTime() - (statuses.length - i) * 3600000).toISOString(),
        changedBy: users[userIndex],
        changedByName: userNames[userIndex],
        reason: statuses[i] === 'cancelled' ? 'Orden cancelada por solicitud' : undefined,
      });
    }
    return history;
  }
  
  const statuses: OrderStatus[] = ['draft', 'pending', 'assigned'];
  
  if (['in_transit', 'at_milestone', 'delayed', 'completed', 'closed'].includes(status)) {
    statuses.push('in_transit');
  }
  if (['at_milestone', 'delayed', 'completed', 'closed'].includes(status)) {
    statuses.push('at_milestone');
  }
  if (status === 'delayed') {
    statuses.push('delayed');
  }
  if (['completed', 'closed'].includes(status)) {
    statuses.push('completed');
  }
  if (status === 'closed') {
    statuses.push('closed');
  }
  
  const users = ['admin@navitel.com', 'operador@navitel.com', 'supervisor@navitel.com'];
  const userNames = ['Administrador Sistema', 'Juan Operador', 'María Supervisora'];
  const baseDate = new Date();
  
  for (let i = 1; i < statuses.length; i++) {
    const userIndex = Math.floor(Math.random() * users.length);
    history.push({
      id: generateId('hist'),
      fromStatus: statuses[i - 1],
      toStatus: statuses[i],
      changedAt: new Date(baseDate.getTime() - (statuses.length - i) * 3600000).toISOString(),
      changedBy: users[userIndex],
      changedByName: userNames[userIndex],
      reason: i === statuses.length - 1 ? 'Actualización automática del sistema' : undefined,
    });
  }
  
  return history;
};

/**
 * Calcula el porcentaje de cumplimiento basado en hitos
 * @param milestones - Array de hitos
 * @returns Porcentaje de 0 a 100
 */
const calculateCompletion = (milestones: OrderMilestone[]): number => {
  const completed = milestones.filter(m => m.status === 'completed').length;
  return Math.round((completed / milestones.length) * 100);
};

/**
 * Tipos de carga para mock
 */
const cargoTypes: CargoType[] = ['general', 'refrigerated', 'hazardous', 'fragile', 'oversized', 'liquid', 'bulk'];

/**
 * Prioridades para mock
 */
const priorities: OrderPriority[] = ['low', 'normal', 'high', 'urgent'];

/**
 * Estados para distribución realista
 * Incluye draft y cancelled para cobertura completa
 */
const orderStatuses: OrderStatus[] = [
  'draft', 'draft',
  'pending', 'pending',
  'assigned', 'assigned',
  'in_transit', 'in_transit', 'in_transit',
  'at_milestone',
  'delayed',
  'completed', 'completed',
  'closed',
  'cancelled', 'cancelled',
];

/**
 * Estados de sincronización
 */
const syncStatuses: OrderSyncStatus[] = ['not_sent', 'pending', 'sent', 'sent', 'sent', 'error'];

/**
 * Tipos de servicio para distribución realista
 */
const serviceTypes: ServiceType[] = [
  'distribucion', 'distribucion', 'distribucion',
  'importacion', 'importacion',
  'exportacion',
  'transporte_minero', 'transporte_minero',
  'interprovincial',
  'courier',
  'transporte_residuos',
  'otro',
];

/**
 * Genera una referencia contextual según el tipo de servicio
 */
const generateReference = (serviceType: ServiceType): string | undefined => {
  if (Math.random() > 0.75) return undefined; // 25% sin referencia
  const num = Math.floor(Math.random() * 100000);
  switch (serviceType) {
    case 'importacion':
      return `BL-${num.toString().padStart(6, '0')}`;
    case 'exportacion':
      return `BK-${num.toString().padStart(6, '0')}`;
    case 'distribucion':
      return `GR-${num.toString().padStart(6, '0')}`;
    case 'transporte_minero':
      return `GM-${num.toString().padStart(6, '0')}`;
    case 'courier':
      return `PKG-${num.toString().padStart(8, '0')}`;
    case 'transporte_residuos':
      return `MR-${num.toString().padStart(6, '0')}`;
    case 'interprovincial':
      return `GT-${num.toString().padStart(6, '0')}`;
    default:
      return `REF-${num.toString().padStart(6, '0')}`;
  }
};

/**
 * Genera una orden completa mock
 * @param index - Índice para generar número de orden único
 * @returns Orden completa
 */
const generateOrder = (index: number): Order => {
  const status = randomItem(orderStatuses);
  const customer = randomItem(mockCustomers);
  const carrier = randomItem(mockCarriers);
  const vehicle = randomItem(mockVehicles);
  const driver = randomItem(mockDrivers);
  const gpsOperator = randomItem(mockGPSOperators);
  const milestonesCount = Math.floor(Math.random() * 4) + 2; // 2-5 hitos
  const milestones = generateMilestones(`ord-${String(index).padStart(5, '0')}`, milestonesCount, status);
  const cargoType = randomItem(cargoTypes);
  const serviceType = randomItem(serviceTypes);
  const reference = generateReference(serviceType);
  
  const baseDate = new Date();
  const createdAt = randomDate(new Date(baseDate.getTime() - 30 * 24 * 3600000), baseDate);
  const scheduledStart = new Date(new Date(createdAt).getTime() + 24 * 3600000);
  const scheduledEnd = new Date(scheduledStart.getTime() + (milestonesCount * 8 + 24) * 3600000);
  
  const orderId = `ord-${String(index).padStart(5, '0')}`;
  const syncStatus = randomItem(syncStatuses);
  
  const order: Order = {
    id: orderId,
    orderNumber: `ORD-${new Date().getFullYear()}-${String(index).padStart(5, '0')}`,
    customerId: customer.id,
    customer: customer,
    carrierId: carrier.id,
    carrierName: carrier.name,
    vehicleId: !['draft', 'pending', 'cancelled'].includes(status) ? vehicle.id : undefined,
    vehicle: !['draft', 'pending', 'cancelled'].includes(status) ? vehicle : undefined,
    driverId: !['draft', 'pending', 'cancelled'].includes(status) ? driver.id : undefined,
    driver: !['draft', 'pending', 'cancelled'].includes(status) ? driver : undefined,
    gpsOperatorId: gpsOperator.id,
    gpsOperatorName: gpsOperator.name,
    workflowId: `wf-00${Math.floor(Math.random() * 3) + 1}`,
    workflowName: ['Importación Marítima Standard', 'Exportación Aérea Express', 'Distribución Urbana Lima'][Math.floor(Math.random() * 3)],
    status,
    priority: randomItem(priorities),
    serviceType,
    reference,
    syncStatus,
    syncErrorMessage: syncStatus === 'error' ? 'Error de conexión con sistema externo' : undefined,
    lastSyncAttempt: syncStatus !== 'not_sent' ? new Date().toISOString() : undefined,
    cargo: {
      description: `Carga de ${cargoType} - Lote ${Math.floor(Math.random() * 1000)}`,
      type: cargoType,
      weightKg: Math.floor(Math.random() * 20000) + 1000,
      volumeM3: Math.floor(Math.random() * 50) + 5,
      quantity: Math.floor(Math.random() * 100) + 1,
      declaredValue: Math.floor(Math.random() * 100000) + 5000,
      temperatureControlled: cargoType === 'refrigerated',
      temperatureRange: cargoType === 'refrigerated' ? { min: 2, max: 8, unit: 'celsius' } : undefined,
      handlingInstructions: cargoType === 'fragile' ? 'Manipular con cuidado. No apilar más de 3 niveles.' : undefined,
    },
    milestones,
    completionPercentage: calculateCompletion(milestones),
    createdAt,
    createdBy: 'admin@navitel.com',
    updatedAt: new Date().toISOString(),
    scheduledStartDate: scheduledStart.toISOString(),
    scheduledEndDate: scheduledEnd.toISOString(),
    actualStartDate: ['in_transit', 'at_milestone', 'delayed', 'completed', 'closed'].includes(status)
      ? new Date(scheduledStart.getTime() + Math.random() * 3600000).toISOString()
      : undefined,
    actualEndDate: ['completed', 'closed'].includes(status)
      ? new Date(scheduledEnd.getTime() + (Math.random() - 0.5) * 2 * 3600000).toISOString()
      : undefined,
    cancellationReason: status === 'cancelled' ? randomItem([
      'Solicitud del cliente',
      'Error en datos de la orden',
      'Vehículo no disponible',
      'Cambio de programación',
      'Carga no preparada a tiempo',
    ]) : undefined,
    cancelledAt: status === 'cancelled' ? new Date().toISOString() : undefined,
    cancelledBy: status === 'cancelled' ? 'admin@navitel.com' : undefined,
    closureData: status === 'closed' ? {
      observations: 'Viaje completado sin novedades mayores. Entrega realizada según lo programado.',
      incidents: [],
      deviationReasons: Math.random() > 0.7 ? [{
        id: generateId('dev'),
        type: 'time',
        description: 'Retraso por tráfico en zona urbana',
        impact: { value: 45, unit: 'minutes' },
      }] : [],
      closedBy: 'admin@navitel.com',
      closedByName: 'Administrador Sistema',
      closedAt: new Date().toISOString(),
    } : undefined,
    statusHistory: generateStatusHistory(status),
    externalReference: Math.random() > 0.5 ? `EXT-${Math.floor(Math.random() * 100000)}` : undefined,
    notes: Math.random() > 0.7 ? 'Cliente requiere notificación de llegada con 2 horas de anticipación.' : undefined,
    tags: Math.random() > 0.5 ? [randomItem(['prioritario', 'fragil', 'urgente', 'vip', 'nuevo-cliente'])] : undefined,
  };
  
  return order;
};

/**
 * Base de datos mock de órdenes
 * Genera 50 órdenes con datos realistas
 */
export const mockOrders: Order[] = Array.from({ length: 50 }, (_, i) => generateOrder(i + 1));

/**
 * Obtiene contadores por estado de las órdenes
 * @param orders - Array de órdenes
 * @returns Record con conteo por estado
 */
export const getOrderStatusCounts = (orders: Order[]): Record<OrderStatus, number> => {
  const counts: Record<OrderStatus, number> = {
    draft: 0,
    pending: 0,
    assigned: 0,
    in_transit: 0,
    at_milestone: 0,
    delayed: 0,
    completed: 0,
    closed: 0,
    cancelled: 0,
  };
  
  orders.forEach(order => {
    counts[order.status]++;
  });
  
  return counts;
};

/**
 * Filtra órdenes según criterios
 * @param filters - Criterios de filtrado
 * @returns Órdenes filtradas con paginación
 */
export const filterOrders = (filters: {
  search?: string;
  customerId?: string;
  carrierId?: string;
  gpsOperatorId?: string;
  status?: OrderStatus | OrderStatus[];
  priority?: OrderPriority | OrderPriority[];
  serviceType?: ServiceType;
  dateType?: 'creation' | 'scheduled' | 'execution';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: keyof Order;
  sortOrder?: 'asc' | 'desc';
}, ordersToFilter?: Order[]): { data: Order[]; total: number; statusCounts: Record<OrderStatus, number> } => {
  let filtered = [...(ordersToFilter || mockOrders)];
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(o =>
      o.orderNumber.toLowerCase().includes(searchLower) ||
      o.customer?.name.toLowerCase().includes(searchLower) ||
      o.externalReference?.toLowerCase().includes(searchLower) ||
      o.reference?.toLowerCase().includes(searchLower)
    );
  }
  
  // Filtro por cliente
  if (filters.customerId) {
    filtered = filtered.filter(o => o.customerId === filters.customerId);
  }
  
  // Filtro por transportista
  if (filters.carrierId) {
    filtered = filtered.filter(o => o.carrierId === filters.carrierId);
  }
  
  // Filtro por operador GPS
  if (filters.gpsOperatorId) {
    filtered = filtered.filter(o => o.gpsOperatorId === filters.gpsOperatorId);
  }
  
  // Filtro por estado
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    filtered = filtered.filter(o => statuses.includes(o.status));
  }
  
  // Filtro por prioridad
  if (filters.priority) {
    const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
    filtered = filtered.filter(o => priorities.includes(o.priority));
  }
  
  // Filtro por rango de fechas (con dateType)
  const dateField = filters.dateType === 'creation' 
    ? 'createdAt' 
    : filters.dateType === 'execution' 
      ? 'actualStartDate' 
      : 'scheduledStartDate';
  
  if (filters.dateFrom) {
    filtered = filtered.filter(o => {
      const val = o[dateField as keyof Order] as string | undefined;
      if (!val) return false;
      return new Date(val) >= new Date(filters.dateFrom!);
    });
  }
  if (filters.dateTo) {
    filtered = filtered.filter(o => {
      const val = o[dateField as keyof Order] as string | undefined;
      if (!val) return false;
      return new Date(val) <= new Date(filters.dateTo!);
    });
  }
  
  // Filtro por tipo de servicio
  if (filters.serviceType) {
    filtered = filtered.filter(o => o.serviceType === filters.serviceType);
  }
  
  // Ordenamiento
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      const aVal = a[filters.sortBy!];
      const bVal = b[filters.sortBy!];
      
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
  }
  
  const total = filtered.length;
  const statusCounts = getOrderStatusCounts(filtered);
  
  // Paginación
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);
  
  return { data, total, statusCounts };
};

/**
 * Obtiene una orden por ID
 * @param id - ID de la orden
 * @returns Orden o undefined
 */
export const getOrderById = (id: string): Order | undefined => {
  return mockOrders.find(o => o.id === id);
};

/**
 * Obtiene lista de clientes únicos de las órdenes
 */
export const getOrderCustomers = () => mockCustomers;

/**
 * Obtiene lista de transportistas únicos
 */
export const getOrderCarriers = () => mockCarriers;

/**
 * Obtiene lista de operadores GPS
 */
export const getOrderGPSOperators = () => mockGPSOperators;
