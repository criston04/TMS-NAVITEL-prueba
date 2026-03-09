import type { 
  HistoricalRoute, 
  HistoricalRoutePoint, 
  HistoricalRouteStats,
  HistoricalRouteEvent
} from "@/types/monitoring";
import { vehiclesMock } from "@/mocks/master/vehicles.mock";

/**
 * Genera puntos de ruta simulados
 */
function generateRoutePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  startTime: Date,
  durationMinutes: number,
  numPoints: number = 100
): HistoricalRoutePoint[] {
  const points: HistoricalRoutePoint[] = [];
  const timeStepMs = (durationMinutes * 60 * 1000) / numPoints;
  
  let currentLat = startLat;
  let currentLng = startLng;
  let currentTime = new Date(startTime);
  let totalDistance = 0;
  
  // Calcular dirección general
  const latDiff = endLat - startLat;
  const lngDiff = endLng - startLng;
  
  for (let i = 0; i < numPoints; i++) {
    const progress = i / numPoints;
    
    // Añadir algo de variación al camino
    const variation = Math.sin(progress * Math.PI * 4) * 0.002;
    
    // Posición base con progreso lineal más variación
    const targetLat = startLat + (latDiff * progress) + variation;
    const targetLng = startLng + (lngDiff * progress) + variation * 0.8;
    
    // Calcular distancia desde punto anterior
    if (i > 0) {
      const dLat = targetLat - currentLat;
      const dLng = targetLng - currentLng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111; // Aproximación en km
      totalDistance += distance;
    }
    
    currentLat = targetLat;
    currentLng = targetLng;
    
    // Determinar si es una parada
    const isStop = i > 0 && (
      (i === Math.floor(numPoints * 0.3)) || // Primera parada al 30%
      (i === Math.floor(numPoints * 0.6)) || // Segunda parada al 60%
      Math.random() < 0.02 // 2% de probabilidad de parada aleatoria
    );
    
    // Calcular velocidad
    let speed = 0;
    let stopDuration: number | undefined;
    let event: HistoricalRouteEvent | undefined;
    
    if (isStop) {
      speed = 0;
      stopDuration = Math.floor(Math.random() * 600) + 120; // 2-12 minutos
      event = {
        type: "stop_start",
        description: `Parada en punto ${i}`,
        data: { duration: stopDuration }
      };
    } else {
      // Velocidad variable: más lenta en curvas, más rápida en rectas
      const baseSpeed = 45;
      const variationFactor = Math.abs(Math.sin(progress * Math.PI * 8));
      speed = Math.floor(baseSpeed + variationFactor * 35);
    }
    
    // Calcular heading
    let heading = 0;
    if (i > 0) {
      const prevPoint = points[i - 1];
      heading = Math.atan2(
        currentLng - prevPoint.lng,
        currentLat - prevPoint.lat
      ) * (180 / Math.PI);
      heading = (heading + 360) % 360;
    }
    
    points.push({
      index: i,
      lat: currentLat,
      lng: currentLng,
      speed,
      heading: Math.round(heading),
      timestamp: currentTime.toISOString(),
      altitude: 100 + Math.floor(Math.random() * 50),
      isStopped: isStop,
      stopDuration,
      distanceFromStart: Math.round(totalDistance * 100) / 100,
      event,
    });
    
    currentTime = new Date(currentTime.getTime() + timeStepMs);
    
    // Si hubo parada, agregar tiempo extra
    if (stopDuration) {
      currentTime = new Date(currentTime.getTime() + stopDuration * 1000);
    }
  }
  
  return points;
}

/**
 * Genera estadísticas a partir de los puntos de ruta
 */
export function generateHistoricalRouteStats(points: HistoricalRoutePoint[]): HistoricalRouteStats {
  if (points.length === 0) {
    return {
      totalDistanceKm: 0,
      maxSpeedKmh: 0,
      avgSpeedKmh: 0,
      movingTimeSeconds: 0,
      stoppedTimeSeconds: 0,
      totalTimeSeconds: 0,
      totalPoints: 0,
      totalStops: 0,
      startPoint: { lat: 0, lng: 0 },
      endPoint: { lat: 0, lng: 0 },
    };
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  
  // Calcular estadísticas
  const speeds = points.filter(p => !p.isStopped).map(p => p.speed);
  const maxSpeed = Math.max(...speeds, 0);
  const avgSpeed = speeds.length > 0 
    ? speeds.reduce((a, b) => a + b, 0) / speeds.length 
    : 0;
  
  const totalDistance = endPoint.distanceFromStart;
  
  // Calcular tiempos
  const startTime = new Date(startPoint.timestamp).getTime();
  const endTime = new Date(endPoint.timestamp).getTime();
  const totalTimeSeconds = (endTime - startTime) / 1000;
  
  const stops = points.filter(p => p.isStopped);
  const stoppedTimeSeconds = stops.reduce((acc, p) => acc + (p.stopDuration || 0), 0);
  const movingTimeSeconds = totalTimeSeconds - stoppedTimeSeconds;
  
  return {
    totalDistanceKm: Math.round(totalDistance * 100) / 100,
    maxSpeedKmh: Math.round(maxSpeed),
    avgSpeedKmh: Math.round(avgSpeed),
    movingTimeSeconds: Math.round(movingTimeSeconds),
    stoppedTimeSeconds: Math.round(stoppedTimeSeconds),
    totalTimeSeconds: Math.round(totalTimeSeconds),
    totalPoints: points.length,
    totalStops: stops.length,
    startPoint: { lat: startPoint.lat, lng: startPoint.lng },
    endPoint: { lat: endPoint.lat, lng: endPoint.lng },
  };
}

/**
 * Genera rutas históricas de ejemplo
 */
function generateHistoricalRoutes(): HistoricalRoute[] {
  const routes: HistoricalRoute[] = [];
  
  const routeConfigs = [
    {
      // Lima Centro a Callao
      startLat: -12.0464,
      startLng: -77.0428,
      endLat: -12.0565,
      endLng: -77.1180,
      duration: 90, // minutos
      numPoints: 150,
    },
    {
      // Miraflores a La Molina
      startLat: -12.1219,
      startLng: -77.0299,
      endLat: -12.0867,
      endLng: -76.9303,
      duration: 60,
      numPoints: 100,
    },
    {
      // San Isidro a Chorrillos
      startLat: -12.0971,
      startLng: -77.0360,
      endLat: -12.1790,
      endLng: -77.0150,
      duration: 45,
      numPoints: 80,
    },
    {
      // Surco a San Borja
      startLat: -12.1380,
      startLng: -76.9910,
      endLat: -12.1041,
      endLng: -77.0056,
      duration: 30,
      numPoints: 60,
    },
    {
      // Ate a Centro de Lima
      startLat: -12.0252,
      startLng: -76.9088,
      endLat: -12.0464,
      endLng: -77.0428,
      duration: 75,
      numPoints: 120,
    },
  ];
  
  // Generar rutas para algunos vehículos
  vehiclesMock.slice(0, 5).forEach((vehicle, index) => {
    const config = routeConfigs[index % routeConfigs.length];
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - Math.floor(Math.random() * 48)); // Últimas 48 horas
    
    const points = generateRoutePoints(
      config.startLat,
      config.startLng,
      config.endLat,
      config.endLng,
      startDate,
      config.duration,
      config.numPoints
    );
    
    const stats = generateHistoricalRouteStats(points);
    const endDate = new Date(points[points.length - 1].timestamp);
    
    routes.push({
      id: `route-${String(index + 1).padStart(3, "0")}`,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      points,
      stats,
      generatedAt: new Date().toISOString(),
    });
  });
  
  return routes;
}

/**
 * Datos mock de rutas históricas
 */
export const historicalRoutesMock: HistoricalRoute[] = generateHistoricalRoutes();

/**
 * Obtiene una ruta por ID de vehículo
 */
export function getRouteByVehicleId(vehicleId: string): HistoricalRoute | undefined {
  return historicalRoutesMock.find(r => r.vehicleId === vehicleId);
}

/**
 * Genera una nueva ruta histórica bajo demanda
 */
export function generateRouteForVehicle(
  vehicleId: string,
  vehiclePlate: string,
  startDateTime: string,
  endDateTime: string
): HistoricalRoute {
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
  
  // Limitar duración a máximo 24 horas
  const cappedDuration = Math.min(durationMinutes, 24 * 60);
  const numPoints = Math.min(Math.floor(cappedDuration / 0.5), 500); // 1 punto cada 30 seg, máx 500
  
  // Generar ruta aleatoria en Lima
  const baseLat = -12.0464;
  const baseLng = -77.0428;
  const endLat = baseLat + (Math.random() - 0.5) * 0.2;
  const endLng = baseLng + (Math.random() - 0.5) * 0.2;
  
  const points = generateRoutePoints(
    baseLat,
    baseLng,
    endLat,
    endLng,
    startDate,
    cappedDuration,
    numPoints
  );
  
  const stats = generateHistoricalRouteStats(points);
  
  return {
    id: `route-gen-${Date.now()}`,
    vehicleId,
    vehiclePlate,
    startDate: startDateTime,
    endDate: endDateTime,
    points,
    stats,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Exporta una ruta a formato CSV
 */
export function exportRouteToCSV(route: HistoricalRoute): string {
  const headers = [
    "Index",
    "Timestamp",
    "Latitude",
    "Longitude",
    "Speed (km/h)",
    "Heading",
    "Altitude",
    "Is Stopped",
    "Distance from Start (km)"
  ].join(",");
  
  const rows = route.points.map(point => [
    point.index,
    point.timestamp,
    point.lat.toFixed(6),
    point.lng.toFixed(6),
    point.speed,
    point.heading,
    point.altitude || "",
    point.isStopped,
    point.distanceFromStart.toFixed(2),
  ].join(","));
  
  return [headers, ...rows].join("\n");
}

/**
 * Exporta una ruta a formato GPX
 */
export function exportRouteToGPX(route: HistoricalRoute): string {
  const trkpts = route.points.map(point => 
    `    <trkpt lat="${point.lat}" lon="${point.lng}">
      <ele>${point.altitude || 0}</ele>
      <time>${point.timestamp}</time>
      <speed>${point.speed}</speed>
    </trkpt>`
  ).join("\n");
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TMS-NAVITEL">
  <metadata>
    <name>Ruta ${route.vehiclePlate}</name>
    <time>${route.generatedAt}</time>
  </metadata>
  <trk>
    <name>${route.vehiclePlate} - ${route.startDate}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}
