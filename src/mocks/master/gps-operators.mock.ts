export interface GpsOperator {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  contactPhone: string;
  contactEmail: string;
  techSupportPhone?: string;
  apiEndpoint?: string;
  isActive: boolean;
  coverageCountries: string[];
  features: string[];
  integrationStatus: 'connected' | 'pending' | 'error' | 'not-configured';
  lastSync?: string;
  vehiclesTracked?: number;
  notes?: string;
}

export const gpsOperatorsMock: GpsOperator[] = [
  {
    id: 'gps-001',
    name: 'Geotab México',
    shortName: 'Geotab',
    contactPhone: '+52 55 1234 5678',
    contactEmail: 'soporte@geotab.mx',
    techSupportPhone: '+52 55 1234 5679',
    apiEndpoint: 'https://api.geotab.com/v1',
    isActive: true,
    coverageCountries: ['MX', 'US', 'CA'],
    features: ['Rastreo en tiempo real', 'Geocercas', 'Reportes', 'Alertas', 'Odómetro'],
    integrationStatus: 'connected',
    lastSync: '2025-02-01T10:30:00Z',
    vehiclesTracked: 45,
  },
  {
    id: 'gps-002',
    name: 'Queclink Wireless',
    shortName: 'Queclink',
    contactPhone: '+52 33 9876 5432',
    contactEmail: 'support@queclink.mx',
    isActive: true,
    coverageCountries: ['MX', 'GT', 'HN', 'SV'],
    features: ['Rastreo GPS', 'Sensor de combustible', 'RFID', 'CAN Bus'],
    integrationStatus: 'connected',
    lastSync: '2025-02-01T09:45:00Z',
    vehiclesTracked: 28,
  },
  {
    id: 'gps-003',
    name: 'Calamp México',
    shortName: 'Calamp',
    contactPhone: '+52 81 5555 1234',
    contactEmail: 'mexico@calamp.com',
    techSupportPhone: '+1 800 555 1234',
    apiEndpoint: 'https://api.calamp.com/lmu',
    isActive: true,
    coverageCountries: ['MX', 'US'],
    features: ['LMU Direct', 'OBD-II', 'Diagnóstico vehicular', 'Asset tracking'],
    integrationStatus: 'connected',
    lastSync: '2025-02-01T08:15:00Z',
    vehiclesTracked: 15,
  },
  {
    id: 'gps-004',
    name: 'Teltonika Telematics',
    shortName: 'Teltonika',
    contactPhone: '+52 55 2222 3333',
    contactEmail: 'sales@teltonika.mx',
    isActive: true,
    coverageCountries: ['MX', 'CO', 'PE', 'CL', 'AR'],
    features: ['FMB Series', 'Bluetooth', 'Dual SIM', 'Crash detection'],
    integrationStatus: 'pending',
    vehiclesTracked: 0,
    notes: 'Integración en proceso de configuración',
  },
  {
    id: 'gps-005',
    name: 'Samsara Fleet',
    shortName: 'Samsara',
    contactPhone: '+1 888 123 4567',
    contactEmail: 'support@samsara.com',
    apiEndpoint: 'https://api.samsara.com/v1',
    isActive: true,
    coverageCountries: ['MX', 'US', 'CA'],
    features: ['AI Dash Cams', 'ELD', 'DVIR', 'Route optimization', 'Temperature monitoring'],
    integrationStatus: 'connected',
    lastSync: '2025-02-01T10:00:00Z',
    vehiclesTracked: 32,
  },
  {
    id: 'gps-006',
    name: 'GPS Tracker Pro',
    shortName: 'GPS Pro',
    contactPhone: '+52 55 4444 5555',
    contactEmail: 'soporte@gpstrackerpro.mx',
    isActive: true,
    coverageCountries: ['MX'],
    features: ['Rastreo básico', 'Alertas SMS', 'Historial de rutas'],
    integrationStatus: 'connected',
    lastSync: '2025-02-01T07:30:00Z',
    vehiclesTracked: 12,
  },
  {
    id: 'gps-007',
    name: 'Mobileye Shield+',
    shortName: 'Mobileye',
    contactPhone: '+52 55 6666 7777',
    contactEmail: 'fleet@mobileye.com',
    isActive: false,
    coverageCountries: ['MX', 'US'],
    features: ['ADAS', 'Collision warning', 'Lane departure', 'Driver monitoring'],
    integrationStatus: 'not-configured',
    notes: 'Sistema de seguridad avanzada - pendiente contrato',
  },
  {
    id: 'gps-008',
    name: 'Lytx DriveCam',
    shortName: 'Lytx',
    contactPhone: '+1 800 999 8888',
    contactEmail: 'support@lytx.com',
    isActive: true,
    coverageCountries: ['MX', 'US', 'CA'],
    features: ['Video telematics', 'Risk detection', 'Driver coaching', 'Event recording'],
    integrationStatus: 'error',
    lastSync: '2025-01-28T15:00:00Z',
    vehiclesTracked: 8,
    notes: 'Error de conexión API - ticket #45678 abierto',
  },
];

/**
 * Obtiene operadores GPS activos
 */
export function getActiveGpsOperators(): GpsOperator[] {
  return gpsOperatorsMock.filter(op => op.isActive);
}

/**
 * Obtiene operadores GPS conectados
 */
export function getConnectedGpsOperators(): GpsOperator[] {
  return gpsOperatorsMock.filter(op => op.integrationStatus === 'connected');
}

/**
 * Obtiene un operador GPS por ID
 */
export function getGpsOperatorById(id: string): GpsOperator | undefined {
  return gpsOperatorsMock.find(op => op.id === id);
}

/**
 * Obtiene el total de vehículos rastreados
 */
export function getTotalTrackedVehicles(): number {
  return gpsOperatorsMock.reduce((total, op) => total + (op.vehiclesTracked || 0), 0);
}
