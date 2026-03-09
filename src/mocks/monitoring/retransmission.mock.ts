import type { 
  RetransmissionRecord, 
  RetransmissionStats,
  MovementStatus,
  RetransmissionStatus 
} from "@/types/monitoring";
import { vehiclesMock } from "@/mocks/master/vehicles.mock";
import { getRandomGpsCompany } from "./gps-companies.mock";

/**
 * Empresas/operadores logísticos de ejemplo
 */
const operatorNames = [
  "Transportes Lima SAC",
  "Cargo Express Peru",
  "Logística del Norte",
  "TransAndina SRL",
  "Distribuciones Rápidas",
  "Flota Nacional SAC",
  "Envíos del Sur EIRL",
  "Multicargas Peru",
];

/**
 * Direcciones de ejemplo para retransmisión
 */
const sampleAddresses = [
  "Av. Javier Prado 1234, San Isidro, Lima",
  "Av. Arequipa 567, Miraflores, Lima",
  "Calle Los Pinos 890, Surco, Lima",
  "Av. La Marina 345, San Miguel, Lima",
  "Jr. De la Unión 678, Cercado de Lima",
  "Av. Brasil 1012, Jesús María, Lima",
  "Av. Benavides 2345, Surco, Lima",
  "Av. Primavera 789, San Borja, Lima",
  "Av. Angamos 456, Surquillo, Lima",
  "Av. Universitaria 1100, San Martín de Porres, Lima",
];

/**
 * Comentarios de ejemplo para retransmisión
 */
const sampleComments = [
  "Vehículo en zona sin cobertura GPS",
  "Conductor reportó falla en dispositivo GPS",
  "Se solicitó reinicio remoto del equipo",
  "Verificar con empresa GPS",
  "Mantenimiento programado del equipo",
  "Antena GPS dañada - pendiente reparación",
  "Batería del GPS baja",
  "En espera de respuesta del proveedor",
  "",
  "",
  "",
  "", // Muchos sin comentarios
];

/**
 * Genera un estado de retransmisión aleatorio con probabilidades realistas
 */
function generateRandomStatus(): RetransmissionStatus {
  const random = Math.random();
  if (random < 0.70) return "online";        // 70% en línea
  if (random < 0.90) return "temporary_loss"; // 20% pérdida temporal
  return "disconnected";                      // 10% desconectado
}

/**
 * Genera un estado de movimiento aleatorio
 */
function generateMovementStatus(): MovementStatus {
  return Math.random() < 0.6 ? "moving" : "stopped";
}

/**
 * Genera duración sin conexión basada en el estado
 */
function generateDisconnectedDuration(status: RetransmissionStatus): number {
  switch (status) {
    case "online":
      return 0;
    case "temporary_loss":
      // 5 a 30 minutos en segundos
      return Math.floor(Math.random() * 25 * 60) + 5 * 60;
    case "disconnected":
      // 1 a 24 horas en segundos
      return Math.floor(Math.random() * 23 * 60 * 60) + 60 * 60;
  }
}

/**
 * Genera una fecha de última conexión
 */
function generateLastConnection(status: RetransmissionStatus): string {
  const now = new Date();
  let offsetMs = 0;

  switch (status) {
    case "online":
      // Hace 0-5 minutos
      offsetMs = Math.floor(Math.random() * 5 * 60 * 1000);
      break;
    case "temporary_loss":
      // Hace 5-30 minutos
      offsetMs = Math.floor(Math.random() * 25 * 60 * 1000) + 5 * 60 * 1000;
      break;
    case "disconnected":
      // Hace 1-24 horas
      offsetMs = Math.floor(Math.random() * 23 * 60 * 60 * 1000) + 60 * 60 * 1000;
      break;
  }

  return new Date(now.getTime() - offsetMs).toISOString();
}

/**
 * Genera registros de retransmisión mock
 */
function generateRetransmissionMock(): RetransmissionRecord[] {
  const records: RetransmissionRecord[] = [];

  vehiclesMock.forEach((vehicle, index) => {
    const gpsCompany = getRandomGpsCompany();
    const retransmissionStatus = generateRandomStatus();
    const movementStatus = retransmissionStatus === "disconnected" 
      ? "stopped" 
      : generateMovementStatus();
    const disconnectedDuration = generateDisconnectedDuration(retransmissionStatus);
    const lastConnection = generateLastConnection(retransmissionStatus);
    
    // Algunos vehículos tienen comentarios, especialmente los desconectados
    let comments: string | undefined;
    if (retransmissionStatus === "disconnected" || retransmissionStatus === "temporary_loss") {
      comments = sampleComments[Math.floor(Math.random() * sampleComments.length)] || undefined;
    }

    records.push({
      id: `rtx-${String(index + 1).padStart(3, "0")}`,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      companyName: operatorNames[index % operatorNames.length],
      gpsCompanyId: gpsCompany.id,
      gpsCompanyName: gpsCompany.name,
      lastConnection,
      movementStatus,
      retransmissionStatus,
      disconnectedDuration,
      comments,
      lastLocation: vehicle.lastLocation 
        ? { lat: vehicle.lastLocation.lat, lng: vehicle.lastLocation.lng }
        : undefined,
      lastAddress: sampleAddresses[index % sampleAddresses.length],
      speed: movementStatus === "moving" ? Math.floor(Math.random() * 80) + 20 : 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: lastConnection,
    });
  });

  // Agregar algunos registros adicionales para tener más datos
  for (let i = 0; i < 40; i++) {
    const gpsCompany = getRandomGpsCompany();
    const retransmissionStatus = generateRandomStatus();
    const movementStatus = retransmissionStatus === "disconnected" 
      ? "stopped" 
      : generateMovementStatus();
    const disconnectedDuration = generateDisconnectedDuration(retransmissionStatus);
    const lastConnection = generateLastConnection(retransmissionStatus);

    // Generar placa aleatoria
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomPlate = `${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}${letters[Math.floor(Math.random() * 26)]}-${Math.floor(Math.random() * 900) + 100}`;

    records.push({
      id: `rtx-${String(vehiclesMock.length + i + 1).padStart(3, "0")}`,
      vehicleId: `veh-ext-${String(i + 1).padStart(3, "0")}`,
      vehiclePlate: randomPlate,
      companyName: operatorNames[Math.floor(Math.random() * operatorNames.length)],
      gpsCompanyId: gpsCompany.id,
      gpsCompanyName: gpsCompany.name,
      lastConnection,
      movementStatus,
      retransmissionStatus,
      disconnectedDuration,
      comments: retransmissionStatus !== "online" 
        ? sampleComments[Math.floor(Math.random() * sampleComments.length)] || undefined
        : undefined,
      lastLocation: {
        lat: -12.0464 + (Math.random() - 0.5) * 0.2,
        lng: -77.0428 + (Math.random() - 0.5) * 0.2,
      },
      lastAddress: sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)],
      speed: movementStatus === "moving" ? Math.floor(Math.random() * 80) + 20 : 0,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: lastConnection,
    });
  }

  return records;
}

/**
 * Datos mock de retransmisión
 */
export const retransmissionMock: RetransmissionRecord[] = generateRetransmissionMock();

/**
 * Genera estadísticas de retransmisión
 */
export function generateRetransmissionStats(records: RetransmissionRecord[] = retransmissionMock): RetransmissionStats {
  const total = records.length;
  const online = records.filter(r => r.retransmissionStatus === "online").length;
  const temporaryLoss = records.filter(r => r.retransmissionStatus === "temporary_loss").length;
  const disconnected = records.filter(r => r.retransmissionStatus === "disconnected").length;

  return {
    total,
    online,
    temporaryLoss,
    disconnected,
    onlinePercentage: total > 0 ? Math.round((online / total) * 100) : 0,
    temporaryLossPercentage: total > 0 ? Math.round((temporaryLoss / total) * 100) : 0,
    disconnectedPercentage: total > 0 ? Math.round((disconnected / total) * 100) : 0,
  };
}

/**
 * Filtra registros de retransmisión según criterios
 */
export function filterRetransmissionRecords(
  records: RetransmissionRecord[],
  filters: {
    vehicleSearch?: string;
    companyId?: string;
    movementStatus?: MovementStatus | "all";
    retransmissionStatus?: RetransmissionStatus | "all";
    gpsCompanyId?: string;
    hasComments?: boolean;
  }
): RetransmissionRecord[] {
  return records.filter(record => {
    // Filtro por búsqueda de vehículo
    if (filters.vehicleSearch) {
      const search = filters.vehicleSearch.toLowerCase();
      if (!record.vehiclePlate.toLowerCase().includes(search)) {
        return false;
      }
    }

    // Filtro por empresa
    if (filters.companyId && record.companyName !== filters.companyId) {
      return false;
    }

    // Filtro por estado de movimiento
    if (filters.movementStatus && filters.movementStatus !== "all") {
      if (record.movementStatus !== filters.movementStatus) {
        return false;
      }
    }

    // Filtro por estado de retransmisión
    if (filters.retransmissionStatus && filters.retransmissionStatus !== "all") {
      if (record.retransmissionStatus !== filters.retransmissionStatus) {
        return false;
      }
    }

    // Filtro por empresa GPS
    if (filters.gpsCompanyId && record.gpsCompanyId !== filters.gpsCompanyId) {
      return false;
    }

    // Filtro por comentarios
    if (filters.hasComments !== undefined) {
      const hasComment = !!record.comments && record.comments.trim().length > 0;
      if (filters.hasComments !== hasComment) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Actualiza el comentario de un registro
 */
export function updateRetransmissionComment(
  recordId: string, 
  comment: string
): RetransmissionRecord | undefined {
  const record = retransmissionMock.find(r => r.id === recordId);
  if (record) {
    record.comments = comment;
    record.updatedAt = new Date().toISOString();
  }
  return record;
}
