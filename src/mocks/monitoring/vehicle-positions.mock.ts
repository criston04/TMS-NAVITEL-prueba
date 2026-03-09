import type { 
  VehiclePosition, 
  TrackedVehicle, 
  MovementStatus,
  RetransmissionStatus 
} from "@/types/monitoring";
import { vehiclesMock } from "@/mocks/master/vehicles.mock";

/**
 * Nombres de conductores de ejemplo
 */
const driverNames = [
  "Carlos Mendoza",
  "Juan Pérez",
  "Luis García",
  "Roberto Sánchez",
  "Miguel Torres",
  "Fernando López",
  "Ricardo Díaz",
  "Eduardo Vargas",
  "Alberto Ruiz",
  "José Ramírez",
];

/**
 * Teléfonos de conductores de ejemplo
 */
const driverPhones = [
  "+51 999 111 222",
  "+51 999 222 333",
  "+51 999 333 444",
  "+51 999 444 555",
  "+51 999 555 666",
  "+51 999 666 777",
  "+51 999 777 888",
  "+51 999 888 999",
  "+51 999 999 000",
  "+51 999 000 111",
];

/**
 * Tipos de mantenimiento
 */
const maintenanceTypes = [
  "Cambio de aceite",
  "Revisión general",
  "Cambio de frenos",
  "Inspección de neumáticos",
  "Servicio completo",
];

/**
 * Empresas/operadores de ejemplo
 */
const companyNames = [
  "Transportes Lima SAC",
  "Cargo Express Peru",
  "Logística del Norte",
  "TransAndina SRL",
  "Distribuciones Rápidas",
];

/**
 * Tipos de servicio de ejemplo
 */
const serviceTypes = [
  "Carga Completa",
  "Carga Parcial",
  "Express",
  "Refrigerado",
  "Paquetería",
];

/**
 * Genera una referencia de booking
 */
function generateReference(index: number): string {
  const prefixes = ["BK", "GU", "VJ", "REF"];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix}-2024-${String(index + 1).padStart(6, "0")}`;
}

/**
 * Rutas predefinidas en Lima para simulación realista
 * Cada ruta es un array de puntos [lat, lng]
 */
export const predefinedRoutes: [number, number][][] = [
  // Via Expresa (Norte a Sur)
  [
    [-12.0560, -77.0370],
    [-12.0620, -77.0350],
    [-12.0700, -77.0330],
    [-12.0800, -77.0300],
    [-12.0950, -77.0250],
    [-12.1100, -77.0200],
    [-12.1300, -77.0150], // Barranco
  ],
  // Javier Prado (Oeste a Este)
  [
    [-12.0900, -77.0700], // Magdalena
    [-12.0920, -77.0500],
    [-12.0930, -77.0300],
    [-12.0900, -77.0100], // San Borja
    [-12.0850, -76.9900],
    [-12.0800, -76.9700], // Jockey Plaza
    [-12.0750, -76.9500], // La Molina
  ],
  // Panamericana Sur (Sur a Norte)
  [
    [-12.1500, -76.9800], // Surco
    [-12.1300, -76.9850],
    [-12.1100, -76.9900],
    [-12.0900, -76.9950],
    [-12.0700, -77.0000], // Evitamiento
  ],
  // Av. Arequipa (Centro a Miraflores)
  [
    [-12.0650, -77.0370],
    [-12.0800, -77.0350],
    [-12.0950, -77.0330],
    [-12.1100, -77.0310],
    [-12.1200, -77.0300],
  ],
  // Circuito de Playas (Costa Verde)
  [
    [-12.0900, -77.0700], // San Miguel
    [-12.1000, -77.0600],
    [-12.1100, -77.0500],
    [-12.1200, -77.0400], // Miraflores
    [-12.1300, -77.0300], // Barranco
    [-12.1500, -77.0250], // Chorrillos
  ]
];

/**
 * Asigna una ruta a cada vehículo para mantener consistencia
 */
const vehicleRouteMap = new Map<string, { 
  routeIndex: number, 
  pointIndex: number, 
  progress: number,
  direction: 1 | -1 
}>();

/**
 * Inicializa la posición de un vehículo en una ruta o punto válido
 */
function initializeVehiclePosition(vehicleId: string): VehiclePosition {
  const routeIndex = Math.floor(Math.random() * predefinedRoutes.length);
  const route = predefinedRoutes[routeIndex];
  // Posición inicial aleatoria en la ruta
  const pointIndex = Math.floor(Math.random() * (route.length - 1));
  const progress = Math.random(); 

  // Guardamos estado para simulación
  vehicleRouteMap.set(vehicleId, {
    routeIndex,
    pointIndex,
    progress,
    direction: Math.random() > 0.5 ? 1 : -1
  });

  const p1 = route[pointIndex];
  const p2 = route[pointIndex + 1];

  const lat = p1[0] + (p2[0] - p1[0]) * progress;
  const lng = p1[1] + (p2[1] - p1[1]) * progress;

  // Calcular heading
  const dy = p2[0] - p1[0];
  const dx = Math.cos(Math.PI/180 * p1[0]) * (p2[1] - p1[1]);
  let heading = Math.atan2(dx, dy) * 180 / Math.PI;
  if (heading < 0) heading += 360;

  return {
    lat,
    lng,
    speed: Math.floor(Math.random() * 40) + 20,
    heading,
    timestamp: new Date().toISOString(),
    accuracy: 5,
    altitude: 100,
  };
}

/**
 * Genera el estado de movimiento basado en la velocidad
 */
function getMovementStatus(speed: number): MovementStatus {
  return speed > 5 ? "moving" : "stopped";
}

/**
 * Genera el estado de conexión.
 * La mayoría de vehículos deben estar online para que la simulación funcione.
 */
function getConnectionStatus(index: number): RetransmissionStatus {
  // Solo el ultimo vehículo está desconectado para demo
  if (index === 2) return "disconnected";
  return "online";
}

/**
 * Genera vehículos con tracking
 */
function generateVehiclePositions(): TrackedVehicle[] {
  const trackedVehicles: TrackedVehicle[] = [];

  vehiclesMock.forEach((vehicle, index) => {
    // Usar tracking simulado en rutas en vez de aleatorio
    const position = initializeVehiclePosition(vehicle.id);

    const connectionStatus = getConnectionStatus(index);
    // Vehículos online siempre arrancan en movimiento para que la simulación sea visible
    const movementStatus: MovementStatus = connectionStatus === "disconnected" 
      ? "stopped" 
      : "moving";

    const hasOrder = index < 5;
    trackedVehicles.push({
      id: vehicle.id,
      plate: vehicle.plate,
      economicNumber: vehicle.code,
      type: vehicle.type,
      position,
      movementStatus,
      connectionStatus,
      driverId: `drv-${String(index + 1).padStart(3, "0")}`,
      driverName: driverNames[index % driverNames.length],
      driverPhone: driverPhones[index % driverPhones.length],
      activeOrderId: hasOrder ? `ord-${String(index + 1).padStart(5, "0")}` : undefined,
      activeOrderNumber: hasOrder ? `ORD-2024-${String(index + 1).padStart(5, "0")}` : undefined,
      reference: hasOrder ? generateReference(index) : undefined,
      serviceType: hasOrder ? serviceTypes[index % serviceTypes.length] : undefined,
      companyName: companyNames[index % companyNames.length],
      stoppedSince: movementStatus === "stopped" ? new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString() : undefined,
      lastUpdate: new Date().toISOString(),
      speed: position.speed,
      kmToMaintenance: index % 4 === 0 ? Math.floor(Math.random() * 500) : index % 3 === 0 ? Math.floor(Math.random() * 3000) + 500 : undefined,
      daysToMaintenance: index % 5 === 0 ? Math.floor(Math.random() * 10) : undefined,
      maintenanceType: (index % 4 === 0 || index % 5 === 0) ? maintenanceTypes[index % maintenanceTypes.length] : undefined,
    });
  });

  return trackedVehicles;
}

/**
 * Datos mock de posiciones de vehículos
 */
export const vehiclePositionsMock: TrackedVehicle[] = generateVehiclePositions();

/**
 * Simula el movimiento de un vehículo siguiendo su ruta asignada
 * @param vehicle - Vehículo a mover
 * @returns Nueva posición del vehículo
 */
export function simulateVehicleMovement(vehicle: TrackedVehicle): TrackedVehicle {
  if (vehicle.connectionStatus === "disconnected") {
    return vehicle;
  }

  let newSpeed = vehicle.position.speed;
  let newLat = vehicle.position.lat;
  let newLng = vehicle.position.lng;
  let newHeading = vehicle.position.heading;

  // Recuperar estado de ruta
  let routeState = vehicleRouteMap.get(vehicle.id);

  // Si no tiene ruta (nuevo o reinicio), asignar una
  if (!routeState) {
    initializeVehiclePosition(vehicle.id); 
    routeState = vehicleRouteMap.get(vehicle.id)!;
  }

  // El vehículo siempre se mueve a lo largo de su ruta
  // Variación de velocidad realista (30-70 km/h)
  newSpeed = Math.floor(Math.random() * 40) + 30;

  const route = predefinedRoutes[routeState.routeIndex];
  let { pointIndex, progress, direction } = routeState;

  // Factor de avance: recorrer un segmento en ~15 ticks (~45 seg)
  // para que el movimiento sea claramente visible en el mapa
  const step = 0.06 + Math.random() * 0.03; // 0.06 a 0.09 por tick

  progress += step * direction;

  // Manejar fin de segmento
  if (progress > 1) {
    if (pointIndex < route.length - 2) {
      pointIndex++;
      progress = progress - 1; // Carry over
    } else {
      direction = -1;
      progress = 1;
    }
  } else if (progress < 0) {
    if (pointIndex > 0) {
      pointIndex--;
      progress = 1 + progress; // Carry over
    } else {
      direction = 1;
      progress = 0;
    }
  }

  // Calcular nueva posición interpolada en el segmento actual
  const safePointIndex = Math.min(pointIndex, route.length - 2);
  const p1 = route[safePointIndex];
  const p2 = route[safePointIndex + 1];
  const safeProgress = Math.max(0, Math.min(1, progress));

  newLat = p1[0] + (p2[0] - p1[0]) * safeProgress;
  newLng = p1[1] + (p2[1] - p1[1]) * safeProgress;

  // Calcular heading (dirección visual del camión)
  const dy = (p2[0] - p1[0]) * direction;
  const dx = Math.cos(Math.PI/180 * p1[0]) * (p2[1] - p1[1]) * direction;
  let heading = Math.atan2(dx, dy) * 180 / Math.PI;
  if (heading < 0) heading += 360;
  newHeading = heading;

  // Actualizar estado de ruta
  vehicleRouteMap.set(vehicle.id, { routeIndex: routeState.routeIndex, pointIndex: safePointIndex, progress: safeProgress, direction });

  // Mantener conexión estable (no desconectar aleatoriamente)
  const newConnectionStatus: RetransmissionStatus = vehicle.connectionStatus;

  return {
    ...vehicle,
    position: {
      ...vehicle.position,
      lat: newLat,
      lng: newLng,
      speed: Math.round(newSpeed),
      heading: Math.round(newHeading),
      timestamp: new Date().toISOString(),
    },
    movementStatus: "moving" as MovementStatus,
    connectionStatus: newConnectionStatus,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Obtiene un vehículo por ID
 */
export function getTrackedVehicleById(vehicleId: string): TrackedVehicle | undefined {
  return vehiclePositionsMock.find(v => v.id === vehicleId);
}

/**
 * Obtiene vehículos con órdenes activas
 */
export function getVehiclesWithActiveOrders(): TrackedVehicle[] {
  return vehiclePositionsMock.filter(v => v.activeOrderId !== undefined);
}

/**
 * Filtra vehículos por estado de conexión
 */
export function filterVehiclesByConnection(status: RetransmissionStatus): TrackedVehicle[] {
  return vehiclePositionsMock.filter(v => v.connectionStatus === status);
}

/**
 * Actualiza la posición de un vehículo en el mock
 */
export function updateVehiclePosition(
  vehicleId: string, 
  position: Partial<VehiclePosition>
): TrackedVehicle | undefined {
  const index = vehiclePositionsMock.findIndex(v => v.id === vehicleId);
  if (index === -1) return undefined;

  vehiclePositionsMock[index] = {
    ...vehiclePositionsMock[index],
    position: {
      ...vehiclePositionsMock[index].position,
      ...position,
      timestamp: new Date().toISOString(),
    },
    movementStatus: getMovementStatus(position.speed ?? vehiclePositionsMock[index].position.speed),
    lastUpdate: new Date().toISOString(),
  };

  return vehiclePositionsMock[index];
}

/**
 * Obtiene la ruta asignada a un vehículo
 */
export function getVehicleRoute(vehicleId: string): [number, number][] | undefined {
  const routeState = vehicleRouteMap.get(vehicleId);
  if (!routeState) return undefined;
  return predefinedRoutes[routeState.routeIndex];
}

/**
 * Obtiene todas las rutas de vehículos con órdenes activas
 */
export function getAllActiveRoutes(): Map<string, [number, number][]> {
  const routes = new Map<string, [number, number][]>();
  
  vehiclePositionsMock.forEach(vehicle => {
    if (vehicle.activeOrderId) {
      const route = getVehicleRoute(vehicle.id);
      if (route) {
        routes.set(vehicle.id, route);
      }
    }
  });
  
  return routes;
}
