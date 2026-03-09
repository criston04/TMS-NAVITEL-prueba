import type { GpsCompany } from "@/types/monitoring";

/**
 * Lista de empresas GPS mock
 */
export const gpsCompaniesMock: GpsCompany[] = [
  {
    id: "gps-001",
    name: "GPSTRACK",
    code: "GPSTRK",
    contactEmail: "soporte@gpstrack.com",
    contactPhone: "+51 1 234 5678",
    isActive: true,
    createdAt: "2023-01-15T10:00:00Z",
    updatedAt: "2024-06-01T15:30:00Z",
  },
  {
    id: "gps-002",
    name: "HUNTER GPS",
    code: "HUNTER",
    contactEmail: "contacto@huntergps.pe",
    contactPhone: "+51 1 456 7890",
    isActive: true,
    createdAt: "2023-02-20T08:00:00Z",
    updatedAt: "2024-05-15T10:00:00Z",
  },
  {
    id: "gps-003",
    name: "SECURITRAC",
    code: "SECTRC",
    contactEmail: "info@securitrac.com",
    contactPhone: "+51 1 789 0123",
    isActive: true,
    createdAt: "2023-03-10T14:00:00Z",
    updatedAt: "2024-07-20T09:00:00Z",
  },
  {
    id: "gps-004",
    name: "TRAMIGO",
    code: "TRMGO",
    contactEmail: "peru@tramigo.net",
    contactPhone: "+51 1 321 6547",
    isActive: true,
    createdAt: "2023-04-05T11:00:00Z",
    updatedAt: "2024-06-30T16:00:00Z",
  },
  {
    id: "gps-005",
    name: "QUECLINK",
    code: "QLINK",
    contactEmail: "latam@queclink.com",
    contactPhone: "+51 1 654 9870",
    isActive: true,
    createdAt: "2023-05-12T09:00:00Z",
    updatedAt: "2024-08-01T12:00:00Z",
  },
  {
    id: "gps-006",
    name: "TELTONIKA",
    code: "TLTKA",
    contactEmail: "sales@teltonika.pe",
    contactPhone: "+51 1 987 6543",
    isActive: true,
    createdAt: "2023-06-18T13:00:00Z",
    updatedAt: "2024-07-15T14:00:00Z",
  },
  {
    id: "gps-007",
    name: "COBAN GPS",
    code: "COBAN",
    contactEmail: "support@cobangps.com",
    contactPhone: "+51 1 147 2583",
    isActive: true,
    createdAt: "2023-07-22T10:00:00Z",
    updatedAt: "2024-08-10T11:00:00Z",
  },
  {
    id: "gps-008",
    name: "SUNTECH",
    code: "SNTCH",
    contactEmail: "peru@suntechgps.com",
    contactPhone: "+51 1 369 8520",
    isActive: false,
    createdAt: "2023-08-30T08:00:00Z",
    updatedAt: "2024-04-01T09:00:00Z",
  },
];

/**
 * Obtiene una empresa GPS por su ID
 */
export function getGpsCompanyById(id: string): GpsCompany | undefined {
  return gpsCompaniesMock.find(company => company.id === id);
}

/**
 * Obtiene solo empresas GPS activas
 */
export function getActiveGpsCompanies(): GpsCompany[] {
  return gpsCompaniesMock.filter(company => company.isActive);
}

/**
 * Obtiene una empresa GPS aleatoria (activa)
 */
export function getRandomGpsCompany(): GpsCompany {
  const activeCompanies = getActiveGpsCompanies();
  const randomIndex = Math.floor(Math.random() * activeCompanies.length);
  return activeCompanies[randomIndex];
}
