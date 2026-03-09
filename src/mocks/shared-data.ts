import type { OrderPriority, OrderStatus, MilestoneStatus, CargoType } from '@/types/order';
import type { VehicleType, VehicleOperationalStatus } from '@/types/models/vehicle';

export interface SharedCustomer {
  id: string;
  code: string;
  name: string;
  tradeName?: string;
  email: string;
  phone: string;
  ruc: string;
}

export const SHARED_CUSTOMERS: SharedCustomer[] = [
  {
    id: 'cust-001',
    code: 'ALC',
    name: 'Alicorp S.A.A.',
    tradeName: 'Alicorp',
    email: 'logistica@alicorp.com.pe',
    phone: '+51 1 315 0800',
    ruc: '20100047218',
  },
  {
    id: 'cust-002',
    code: 'GLO',
    name: 'Gloria S.A.',
    tradeName: 'Gloria',
    email: 'distribucion@gloria.com.pe',
    phone: '+51 1 470 7170',
    ruc: '20100055237',
  },
  {
    id: 'cust-003',
    code: 'SDM',
    name: 'Sodimac Perú S.A.',
    tradeName: 'Sodimac',
    email: 'transporte@sodimac.com.pe',
    phone: '+51 1 611 4000',
    ruc: '20508565934',
  },
  {
    id: 'cust-004',
    code: 'MLB',
    name: 'Minera Las Bambas S.A.',
    tradeName: 'Las Bambas',
    email: 'logistica@lasbambas.com.pe',
    phone: '+51 1 416 2900',
    ruc: '20551971021',
  },
  {
    id: 'cust-005',
    code: 'SPC',
    name: 'Southern Peru Copper Corporation',
    tradeName: 'Southern Perú',
    email: 'logistics@southernperu.com.pe',
    phone: '+51 54 380 300',
    ruc: '20100147514',
  },
  {
    id: 'cust-006',
    code: 'BKS',
    name: 'Unión de Cervecerías Peruanas Backus',
    tradeName: 'Backus',
    email: 'distribucion@backus.com.pe',
    phone: '+51 1 311 3000',
    ruc: '20100113610',
  },
  {
    id: 'cust-007',
    code: 'CPM',
    name: 'Cementos Pacasmayo S.A.A.',
    tradeName: 'Cementos Pacasmayo',
    email: 'logistica@cementospacasmayo.com.pe',
    phone: '+51 44 486 840',
    ruc: '20419387658',
  },
  {
    id: 'cust-008',
    code: 'PPE',
    name: 'Petróleos del Perú - Petroperú S.A.',
    tradeName: 'Petroperú',
    email: 'transporte@petroperu.com.pe',
    phone: '+51 1 614 5000',
    ruc: '20100128218',
  },
];

export interface SharedVehicle {
  id: string;
  code: string;
  plate: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  capacityKg: number;
  capacityM3: number;
  operationalStatus: VehicleOperationalStatus;
  gpsDeviceId?: string;
}

export const SHARED_VEHICLES: SharedVehicle[] = [
  {
    id: 'veh-001',
    code: 'VEH-001',
    plate: 'ABC-123',
    type: 'tractocamion',
    brand: 'Volvo',
    model: 'FH 540',
    year: 2022,
    capacityKg: 30000,
    capacityM3: 80,
    operationalStatus: 'available',
    gpsDeviceId: 'GPS-001',
  },
  {
    id: 'veh-002',
    code: 'VEH-002',
    plate: 'XYZ-789',
    type: 'camion',
    brand: 'Mercedes-Benz',
    model: 'Actros 2645',
    year: 2021,
    capacityKg: 15000,
    capacityM3: 45,
    operationalStatus: 'on-route',
    gpsDeviceId: 'GPS-002',
  },
  {
    id: 'veh-003',
    code: 'VEH-003',
    plate: 'DEF-456',
    type: 'tractocamion',
    brand: 'Scania',
    model: 'R450',
    year: 2023,
    capacityKg: 28000,
    capacityM3: 75,
    operationalStatus: 'available',
    gpsDeviceId: 'GPS-003',
  },
  {
    id: 'veh-004',
    code: 'VEH-004',
    plate: 'GHI-321',
    type: 'camion',
    brand: 'Kenworth',
    model: 'T680',
    year: 2020,
    capacityKg: 25000,
    capacityM3: 60,
    operationalStatus: 'maintenance',
    gpsDeviceId: 'GPS-004',
  },
  {
    id: 'veh-005',
    code: 'VEH-005',
    plate: 'JKL-654',
    type: 'furgoneta',
    brand: 'Freightliner',
    model: 'M2 106',
    year: 2022,
    capacityKg: 8000,
    capacityM3: 35,
    operationalStatus: 'available',
    gpsDeviceId: 'GPS-005',
  },
];

export interface SharedDriver {
  id: string;
  code: string;
  fullName: string;
  shortName: string;
  dni: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  availability: 'available' | 'on-route' | 'off-duty' | 'vacation';
  hoursThisWeek: number;
}

export const SHARED_DRIVERS: SharedDriver[] = [
  {
    id: 'drv-001',
    code: 'COND-001',
    fullName: 'Juan Carlos Pérez López',
    shortName: 'J. Pérez',
    dni: '45678912',
    phone: '+51 999 111 222',
    email: 'jperez@navitel.com',
    licenseNumber: 'Q45678912',
    licenseCategory: 'A-IIIb',
    licenseExpiry: '2026-06-15',
    availability: 'available',
    hoursThisWeek: 32,
  },
  {
    id: 'drv-002',
    code: 'COND-002',
    fullName: 'Pedro Ramírez García',
    shortName: 'P. Ramírez',
    dni: '78912345',
    phone: '+51 998 222 333',
    email: 'pramirez@navitel.com',
    licenseNumber: 'Q78912345',
    licenseCategory: 'A-IIIc',
    licenseExpiry: '2025-03-22',
    availability: 'on-route',
    hoursThisWeek: 45,
  },
  {
    id: 'drv-003',
    code: 'COND-003',
    fullName: 'Carlos Alberto Mendoza Ríos',
    shortName: 'C. Mendoza',
    dni: '12345678',
    phone: '+51 987 654 321',
    email: 'cmendoza@navitel.com',
    licenseNumber: 'Q12345678',
    licenseCategory: 'A-IIIc',
    licenseExpiry: '2027-03-10',
    availability: 'available',
    hoursThisWeek: 28,
  },
  {
    id: 'drv-004',
    code: 'COND-004',
    fullName: 'Roberto González Díaz',
    shortName: 'R. González',
    dni: '87654321',
    phone: '+51 996 555 666',
    email: 'rgonzalez@navitel.com',
    licenseNumber: 'Q87654321',
    licenseCategory: 'A-IIIb',
    licenseExpiry: '2026-06-25',
    availability: 'available',
    hoursThisWeek: 20,
  },
  {
    id: 'drv-005',
    code: 'COND-005',
    fullName: 'Miguel Ángel Sánchez Torres',
    shortName: 'M. Sánchez',
    dni: '23456789',
    phone: '+51 995 777 888',
    email: 'msanchez@navitel.com',
    licenseNumber: 'Q23456789',
    licenseCategory: 'A-IIIc',
    licenseExpiry: '2025-11-30',
    availability: 'off-duty',
    hoursThisWeek: 48,
  },
];

// TRANSPORTISTAS / CARRIERS

export interface SharedCarrier {
  id: string;
  code: string;
  name: string;
  ruc: string;
  phone: string;
  email: string;
}

export const SHARED_CARRIERS: SharedCarrier[] = [
  { id: 'car-001', code: 'CDS', name: 'Transportes Cruz del Sur S.A.C.', ruc: '20100038146', phone: '+51 1 311 5050', email: 'carga@cruzdelsur.com.pe' },
  { id: 'car-002', code: 'RNS', name: 'Ransa Comercial S.A.', ruc: '20100039207', phone: '+51 1 315 0400', email: 'operaciones@ransa.com.pe' },
  { id: 'car-003', code: 'TLS', name: 'Transportes Línea S.A.', ruc: '20132373958', phone: '+51 44 262 001', email: 'cargas@transporteslinea.com.pe' },
  { id: 'car-004', code: 'NPT', name: 'Neptunia S.A.', ruc: '20100027021', phone: '+51 1 614 8800', email: 'logistica@neptunia.com.pe' },
  { id: 'car-005', code: 'SLG', name: 'San Lorenzo Logística S.A.C.', ruc: '20517372877', phone: '+51 1 652 0200', email: 'operaciones@sanlorenzologistica.com.pe' },
];

// OPERADORES GPS

export interface SharedGPSOperator {
  id: string;
  name: string;
  platform: string;
}

export const SHARED_GPS_OPERATORS: SharedGPSOperator[] = [
  { id: 'gps-op-001', name: 'Wialon Pro', platform: 'Wialon' },
  { id: 'gps-op-002', name: 'Navitel Fleet Manager', platform: 'Navitel' },
  { id: 'gps-op-003', name: 'Geotab Connect', platform: 'Geotab' },
  { id: 'gps-op-004', name: 'GPS Tracker Plus', platform: 'GPSTracker' },
];

// UBICACIONES / GEOFENCES

export interface SharedLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  type: 'almacen' | 'puerto' | 'planta' | 'centro_distribucion' | 'terminal' | 'cliente';
}

export const SHARED_LOCATIONS: SharedLocation[] = [
  { id: 'loc-001', name: 'Puerto del Callao', address: 'Terminal Portuario del Callao', city: 'Callao', region: 'Callao', lat: -12.0464, lng: -77.1350, type: 'puerto' },
  { id: 'loc-002', name: 'Almacén Central Lima', address: 'Av. Argentina 4793', city: 'Lima', region: 'Lima', lat: -12.0550, lng: -77.0928, type: 'almacen' },
  { id: 'loc-003', name: 'Centro Distribución Arequipa', address: 'Parque Industrial Río Seco', city: 'Arequipa', region: 'Arequipa', lat: -16.4090, lng: -71.5375, type: 'centro_distribucion' },
  { id: 'loc-004', name: 'Terminal Matarani', address: 'Puerto Matarani, Islay', city: 'Islay', region: 'Arequipa', lat: -17.0000, lng: -72.1000, type: 'puerto' },
  { id: 'loc-005', name: 'Planta Procesadora Cusco', address: 'Zona Industrial Wanchaq', city: 'Cusco', region: 'Cusco', lat: -13.5320, lng: -71.9675, type: 'planta' },
  { id: 'loc-006', name: 'Depósito Trujillo', address: 'Panamericana Norte Km 562', city: 'Trujillo', region: 'La Libertad', lat: -8.1116, lng: -79.0288, type: 'almacen' },
  { id: 'loc-007', name: 'Almacén Piura', address: 'Zona Industrial Sullana', city: 'Piura', region: 'Piura', lat: -5.1945, lng: -80.6328, type: 'almacen' },
  { id: 'loc-008', name: 'Centro Logístico Chiclayo', address: 'Carretera Lambayeque Km 8', city: 'Chiclayo', region: 'Lambayeque', lat: -6.7714, lng: -79.8409, type: 'centro_distribucion' },
  { id: 'loc-009', name: 'Terminal Ilo', address: 'Puerto de Ilo, Moquegua', city: 'Ilo', region: 'Moquegua', lat: -17.6394, lng: -71.3375, type: 'puerto' },
  { id: 'loc-010', name: 'Planta Huancayo', address: 'Zona Industrial El Tambo', city: 'Huancayo', region: 'Junín', lat: -12.0651, lng: -75.2049, type: 'planta' },
];

export interface SharedCargoType {
  type: CargoType;
  name: string;
  description: string;
}

export const SHARED_CARGO_TYPES: SharedCargoType[] = [
  { type: 'general', name: 'Carga General', description: 'Mercancía general sin requerimientos especiales' },
  { type: 'refrigerated', name: 'Refrigerado', description: 'Productos que requieren temperatura controlada' },
  { type: 'hazardous', name: 'Materiales Peligrosos', description: 'Sustancias que requieren manejo especial (MATPEL)' },
  { type: 'bulk', name: 'Granel', description: 'Materiales sueltos transportados sin empaque' },
  { type: 'liquid', name: 'Líquidos', description: 'Sustancias líquidas en tanques o contenedores' },
  { type: 'oversized', name: 'Sobredimensionado', description: 'Carga que excede dimensiones estándar' },
  { type: 'fragile', name: 'Frágil', description: 'Mercancía que requiere manejo delicado' },
];

export interface SharedOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  carrierId?: string;
  carrierName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  status: OrderStatus;
  priority: OrderPriority;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  cargoDescription: string;
  cargoType: CargoType;
  weightKg: number;
  scheduledStartDate: string;
  scheduledEndDate: string;
  createdAt: string;
  /** Referencia del documento (booking, guía, BL, factura, etc.) */
  reference?: string;
  /** Referencia externa (del sistema del cliente) */
  externalReference?: string;
}

// Generar fecha base (hoy)
const today = new Date();
const formatDate = (date: Date): string => date.toISOString();
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const SHARED_ORDERS: SharedOrder[] = [
  {
    id: 'ord-00001',
    orderNumber: 'ORD-2026-00001',
    customerId: 'cust-001',
    customerName: 'Alicorp S.A.A.',
    carrierId: 'car-002',
    carrierName: 'Ransa Comercial S.A.',
    vehicleId: 'veh-001',
    vehiclePlate: 'ABC-123',
    driverId: 'drv-001',
    driverName: 'Juan Carlos Pérez López',
    status: 'in_transit',
    priority: 'high',
    originId: 'loc-001',
    originName: 'Puerto del Callao',
    destinationId: 'loc-002',
    destinationName: 'Almacén Central Lima',
    cargoDescription: 'Insumos industriales para producción',
    cargoType: 'general',
    weightKg: 18000,
    scheduledStartDate: formatDate(today),
    scheduledEndDate: formatDate(addDays(today, 1)),
    createdAt: formatDate(addDays(today, -3)),
    reference: 'BK-2026-0451',
    externalReference: 'ALC-PO-78901',
  },
  {
    id: 'ord-00002',
    orderNumber: 'ORD-2026-00002',
    customerId: 'cust-002',
    customerName: 'Gloria S.A.',
    vehicleId: 'veh-001', // ← same vehicle as ord-00001 → pre-existing conflict
    vehiclePlate: 'ABC-123',
    driverId: 'drv-003',
    driverName: 'Carlos Alberto Mendoza Ríos',
    status: 'pending',
    priority: 'normal',
    originId: 'loc-002',
    originName: 'Almacén Central Lima',
    destinationId: 'loc-003',
    destinationName: 'Centro Distribución Arequipa',
    cargoDescription: 'Productos lácteos refrigerados',
    cargoType: 'refrigerated',
    weightKg: 12000,
    scheduledStartDate: formatDate(today), // ← same day as ord-00001 → overlap
    scheduledEndDate: formatDate(addDays(today, 2)),
    createdAt: formatDate(addDays(today, -1)),
    reference: 'GU-2026-1023',
    externalReference: 'GLO-SHIP-4421',
  },
  {
    id: 'ord-00003',
    orderNumber: 'ORD-2026-00003',
    customerId: 'cust-004',
    customerName: 'Minera Las Bambas S.A.',
    carrierId: 'car-001',
    carrierName: 'Transportes Cruz del Sur S.A.C.',
    status: 'pending',
    priority: 'urgent',
    originId: 'loc-004',
    originName: 'Terminal Matarani',
    destinationId: 'loc-005',
    destinationName: 'Planta Procesadora Cusco',
    cargoDescription: 'Maquinaria pesada para minería',
    cargoType: 'oversized',
    weightKg: 25000,
    scheduledStartDate: formatDate(addDays(today, 2)),
    scheduledEndDate: formatDate(addDays(today, 4)),
    createdAt: formatDate(today),
    reference: 'BL-2026-0087',
    externalReference: 'MLB-IMP-2026-003',
  },
  {
    id: 'ord-00004',
    orderNumber: 'ORD-2026-00004',
    customerId: 'cust-006',
    customerName: 'Unión de Cervecerías Peruanas Backus',
    vehicleId: 'veh-002',
    vehiclePlate: 'XYZ-789',
    driverId: 'drv-002',
    driverName: 'Pedro Ramírez García',
    status: 'in_transit',
    priority: 'normal',
    originId: 'loc-002',
    originName: 'Almacén Central Lima',
    destinationId: 'loc-006',
    destinationName: 'Depósito Trujillo',
    cargoDescription: 'Bebidas en contenedores',
    cargoType: 'general',
    weightKg: 14000,
    scheduledStartDate: formatDate(addDays(today, -1)),
    scheduledEndDate: formatDate(today),
    createdAt: formatDate(addDays(today, -5)),
    reference: 'FAC-2026-3301',
    externalReference: 'BKS-DIS-7789',
  },
  {
    id: 'ord-00005',
    orderNumber: 'ORD-2026-00005',
    customerId: 'cust-008',
    customerName: 'Petróleos del Perú - Petroperú S.A.',
    carrierId: 'car-004',
    carrierName: 'Neptunia S.A.',
    status: 'pending',
    priority: 'high',
    originId: 'loc-009',
    originName: 'Terminal Ilo',
    destinationId: 'loc-010',
    destinationName: 'Planta Huancayo',
    cargoDescription: 'Combustible industrial',
    cargoType: 'hazardous',
    weightKg: 20000,
    scheduledStartDate: formatDate(addDays(today, 3)),
    scheduledEndDate: formatDate(addDays(today, 5)),
    createdAt: formatDate(today),
    reference: 'GU-2026-0556',
    externalReference: 'PPE-HAZ-1102',
  },
  {
    id: 'ord-00006',
    orderNumber: 'ORD-2026-00006',
    customerId: 'cust-003',
    customerName: 'Sodimac Perú S.A.',
    vehicleId: 'veh-005',
    vehiclePlate: 'JKL-654',
    driverId: 'drv-004',
    driverName: 'Roberto González Díaz',
    status: 'completed',
    priority: 'low',
    originId: 'loc-002',
    originName: 'Almacén Central Lima',
    destinationId: 'loc-007',
    destinationName: 'Almacén Piura',
    cargoDescription: 'Materiales de construcción',
    cargoType: 'general',
    weightKg: 7500,
    scheduledStartDate: formatDate(addDays(today, -4)),
    scheduledEndDate: formatDate(addDays(today, -2)),
    createdAt: formatDate(addDays(today, -7)),
    reference: 'FAC-2026-2890',
    externalReference: 'SDM-WH-5503',
  },
  {
    id: 'ord-00007',
    orderNumber: 'ORD-2026-00007',
    customerId: 'cust-007',
    customerName: 'Cementos Pacasmayo S.A.A.',
    status: 'pending',
    priority: 'normal',
    originId: 'loc-006',
    originName: 'Depósito Trujillo',
    destinationId: 'loc-008',
    destinationName: 'Centro Logístico Chiclayo',
    cargoDescription: 'Cemento en sacos',
    cargoType: 'bulk',
    weightKg: 22000,
    scheduledStartDate: formatDate(addDays(today, 1)),
    scheduledEndDate: formatDate(addDays(today, 2)),
    createdAt: formatDate(addDays(today, -2)),
    reference: 'BK-2026-0712',
  },
  {
    id: 'ord-00008',
    orderNumber: 'ORD-2026-00008',
    customerId: 'cust-005',
    customerName: 'Southern Peru Copper Corporation',
    carrierId: 'car-003',
    carrierName: 'Transportes Línea S.A.',
    status: 'assigned',
    priority: 'urgent',
    originId: 'loc-001',
    originName: 'Puerto del Callao',
    destinationId: 'loc-004',
    destinationName: 'Terminal Matarani',
    cargoDescription: 'Repuestos industriales',
    cargoType: 'fragile',
    weightKg: 5000,
    scheduledStartDate: formatDate(addDays(today, 1)),
    scheduledEndDate: formatDate(addDays(today, 3)),
    createdAt: formatDate(today),
    reference: 'BL-2026-0155',
    externalReference: 'SPC-IM-6612',
  },
];

export function findCustomerById(id: string): SharedCustomer | undefined {
  return SHARED_CUSTOMERS.find(c => c.id === id);
}

export function findVehicleById(id: string): SharedVehicle | undefined {
  return SHARED_VEHICLES.find(v => v.id === id);
}

export function findDriverById(id: string): SharedDriver | undefined {
  return SHARED_DRIVERS.find(d => d.id === id);
}

export function findCarrierById(id: string): SharedCarrier | undefined {
  return SHARED_CARRIERS.find(c => c.id === id);
}

export function findLocationById(id: string): SharedLocation | undefined {
  return SHARED_LOCATIONS.find(l => l.id === id);
}

export function findOrderById(id: string): SharedOrder | undefined {
  return SHARED_ORDERS.find(o => o.id === id);
}

export function findOrderByNumber(orderNumber: string): SharedOrder | undefined {
  return SHARED_ORDERS.find(o => o.orderNumber === orderNumber);
}

export function getOrderStats() {
  const orders = SHARED_ORDERS;
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    assigned: orders.filter(o => o.status === 'assigned').length,
    inTransit: orders.filter(o => o.status === 'in_transit').length,
    completed: orders.filter(o => o.status === 'completed').length,
    urgent: orders.filter(o => o.priority === 'urgent').length,
    high: orders.filter(o => o.priority === 'high').length,
  };
}

export function getFleetStats() {
  const vehicles = SHARED_VEHICLES;
  const drivers = SHARED_DRIVERS;
  return {
    totalVehicles: vehicles.length,
    availableVehicles: vehicles.filter(v => v.operationalStatus === 'available').length,
    onRouteVehicles: vehicles.filter(v => v.operationalStatus === 'on-route').length,
    maintenanceVehicles: vehicles.filter(v => v.operationalStatus === 'maintenance').length,
    totalDrivers: drivers.length,
    availableDrivers: drivers.filter(d => d.availability === 'available').length,
    onRouteDrivers: drivers.filter(d => d.availability === 'on-route').length,
  };
}
