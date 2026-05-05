/* ============================================
   ROUTE PLANNER UTILS
   Helpers de cálculo (distancia, duración, costo, optimización) +
   constante ROUTE_COLORS para visualización.

   Extraído de `lib/mock-data/route-planner.ts` el 2026-05-02 — se quitaron los
   arrays mock de orders/vehicles/drivers que ya no se usan.
   ============================================ */

import type { TransportOrder, RouteStop, Route, RouteConfiguration, RouteAlert, OptimizationParams } from "@/types/route-planner";

/* ============================================
   HELPER: Generate Route Polyline (fallback sin OSRM)
   Línea recta interpolada — solo se usa cuando OSRM falla
   ============================================ */
export function generateRoutePolyline(stops: { coordinates: [number, number] }[]): [number, number][] {
  const polyline: [number, number][] = [];
  
  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i].coordinates;
    const end = stops[i + 1].coordinates;
    
    // Interpolación lineal sin ruido aleatorio (determinista)
    const steps = 20;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      polyline.push([lat, lng]);
    }
  }
  
  return polyline;
}

/* ============================================
   HELPER: Calculate Distance (Haversine)
   Delegado a routingService para evitar duplicación
   ============================================ */
export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371;
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ============================================
   HELPER: Calculate Total Route Distance
   ============================================ */
export function calculateTotalDistance(stops: { coordinates: [number, number] }[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += calculateDistance(stops[i].coordinates, stops[i + 1].coordinates);
  }
  return Math.round(total * 10) / 10;
}

/* ============================================
   HELPER: Estimate Route Duration
   Respeta prioridad (speed/cost/balanced) y tráfico
   ============================================ */
export function estimateDuration(
  distanceKm: number,
  stopCount: number,
  options?: {
    priority?: 'speed' | 'cost' | 'balanced';
    considerTraffic?: boolean;
    stopDuration?: number; // minutos por parada (override)
  }
): number {
  // Velocidad base según prioridad
  let avgSpeed: number;
  switch (options?.priority) {
    case 'speed':
      avgSpeed = 55; // km/h — autopista/ruta rápida
      break;
    case 'cost':
      avgSpeed = 35; // km/h — rutas económicas, evitar peajes
      break;
    default:
      avgSpeed = 40; // km/h — balanceado
  }

  const stopTime = options?.stopDuration ?? 20; // minutos por parada
  const travelTime = (distanceKm / avgSpeed) * 60;
  const totalStopTime = stopCount * stopTime;
  let totalMinutes = travelTime + totalStopTime;

  // Factor de tráfico: +25% en horario pico simulado
  if (options?.considerTraffic) {
    totalMinutes *= 1.25;
  }

  return Math.round(totalMinutes);
}

/* ============================================
   HELPER: Estimate Route Cost
   Respeta prioridad para peajes
   ============================================ */
export function estimateCost(
  distanceKm: number,
  fuelConsumption: number,
  hasTolls: boolean,
  priority?: 'speed' | 'cost' | 'balanced'
): { total: number; fuel: number; tolls: number } {
  const fuelPrice = 4.5; // USD por galón

  // Consumo ajustado por prioridad
  let adjustedConsumption = fuelConsumption;
  if (priority === 'speed') adjustedConsumption *= 0.85; // menos km/L a mayor velocidad
  if (priority === 'cost') adjustedConsumption *= 1.1; // más km/L a menor velocidad

  const fuelCost = (distanceKm / adjustedConsumption) * fuelPrice;

  // Peajes: speed usa más autopistas, cost evita peajes
  let tollsCost = 0;
  if (hasTolls) {
    if (priority === 'speed') tollsCost = distanceKm * 0.12;
    else if (priority === 'cost') tollsCost = 0; // evita peajes aunque hasTolls=true
    else tollsCost = distanceKm * 0.08;
  }
  
  return {
    fuel: Math.round(fuelCost * 100) / 100,
    tolls: Math.round(tollsCost * 100) / 100,
    total: Math.round((fuelCost + tollsCost) * 100) / 100,
  };
}

/* ============================================
   HELPER: Calculate Estimated Arrival Times
   Calcula ETA para cada parada basado en distancia
   secuencial + duración en cada parada
   ============================================ */
export function calculateEstimatedArrivals(
  stops: RouteStop[],
  startTime: string, // "08:00"
  options?: {
    priority?: 'speed' | 'cost' | 'balanced';
    considerTraffic?: boolean;
  }
): RouteStop[] {
  if (stops.length === 0) return stops;

  const [startHour, startMin] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMin;

  let avgSpeed: number;
  switch (options?.priority) {
    case 'speed': avgSpeed = 55; break;
    case 'cost': avgSpeed = 35; break;
    default: avgSpeed = 40;
  }

  const trafficMultiplier = options?.considerTraffic ? 1.25 : 1.0;

  return stops.map((stop, index) => {
    if (index > 0) {
      const prevStop = stops[index - 1];
      const dist = calculateDistance(prevStop.coordinates, stop.coordinates);
      const travelMinutes = ((dist / avgSpeed) * 60) * trafficMultiplier;
      currentMinutes += travelMinutes;
    }

    const arrivalHour = Math.floor(currentMinutes / 60) % 24;
    const arrivalMin = Math.round(currentMinutes % 60);
    const estimatedArrival = `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`;

    // Añadir duración de la parada para la siguiente
    currentMinutes += stop.duration;

    return {
      ...stop,
      estimatedArrival,
    };
  });
}

/* ============================================
   HELPER: Cluster Orders by Proximity (k-means++)
   Usa centroide de PICKUP + DELIVERY para agrupar,
   no solo delivery. Inicialización k-means++.
   ============================================ */
export function clusterOrdersByProximity(
  orders: TransportOrder[],
  k: number
): TransportOrder[][] {
  if (orders.length === 0) return [];
  if (k >= orders.length) return orders.map((o) => [o]);

  /**
   * Centroide de la orden = promedio de pickup + delivery
   * Esto asegura que órdenes con pickup/delivery cercanos
   * se agrupen juntas.
   */
  const orderCentroid = (order: TransportOrder): [number, number] => [
    (order.pickup.coordinates[0] + order.delivery.coordinates[0]) / 2,
    (order.pickup.coordinates[1] + order.delivery.coordinates[1]) / 2,
  ];

  // K-means++ initialization: mejor selección de centroides iniciales
  const centroids: [number, number][] = [];
  // Primer centroide: aleatorio (pero determinista con primer orden)
  centroids.push(orderCentroid(orders[0]));

  for (let c = 1; c < k; c++) {
    // Para cada orden, calcular distancia mínima a centroides existentes
    const distances = orders.map((order) => {
      const oc = orderCentroid(order);
      return Math.min(...centroids.map((cent) => calculateDistance(oc, cent)));
    });
    // Seleccionar orden con mayor distancia mínima (spread máximo)
    let maxDist = -1;
    let bestIdx = 0;
    for (let i = 0; i < distances.length; i++) {
      if (distances[i] > maxDist) {
        maxDist = distances[i];
        bestIdx = i;
      }
    }
    centroids.push(orderCentroid(orders[bestIdx]));
  }

  let clusters: TransportOrder[][] = Array.from({ length: k }, () => []);
  const maxIterations = 30;

  for (let iter = 0; iter < maxIterations; iter++) {
    const newClusters: TransportOrder[][] = Array.from({ length: k }, () => []);

    // Asignar cada orden al centroide más cercano
    for (const order of orders) {
      const oc = orderCentroid(order);
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = calculateDistance(oc, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      newClusters[bestCluster].push(order);
    }

    // Recalcular centroides usando centroides de órdenes
    const newCentroids: [number, number][] = newClusters.map((cluster, i) => {
      if (cluster.length === 0) return centroids[i];
      const centroides = cluster.map(orderCentroid);
      const avgLat = centroides.reduce((s, c) => s + c[0], 0) / cluster.length;
      const avgLng = centroides.reduce((s, c) => s + c[1], 0) / cluster.length;
      return [avgLat, avgLng] as [number, number];
    });

    // Verificar convergencia
    let converged = true;
    for (let c = 0; c < k; c++) {
      if (calculateDistance(centroids[c], newCentroids[c]) > 0.01) {
        converged = false;
        break;
      }
    }

    centroids.splice(0, centroids.length, ...newCentroids);
    clusters = newClusters;
    if (converged) break;
  }

  return clusters.filter((c) => c.length > 0);
}

/* ============================================
   HELPER: Nearest-Neighbor TSP con restricción
   pickup-antes-de-delivery (Precedence-Constrained NN)
   
   Para cada orden, el pickup DEBE estar antes que
   el delivery en la secuencia final.
   ============================================ */
export function optimizeStopOrder(stops: RouteStop[]): RouteStop[] {
  if (stops.length <= 2) return stops.map((s, i) => ({ ...s, sequence: i + 1 }));

  // Separar pickups y deliveries, crear mapa de dependencia
  const pickupByOrder = new Map<string, RouteStop>();
  const deliveryByOrder = new Map<string, RouteStop>();

  for (const stop of stops) {
    if (stop.type === 'pickup') pickupByOrder.set(stop.orderId, stop);
    else deliveryByOrder.set(stop.orderId, stop);
  }

  // Conjunto de órdenes cuyo pickup ya fue visitado
  const pickedUp = new Set<string>();
  const visited = new Set<string>(); // stop IDs
  const ordered: RouteStop[] = [];

  // Elegir el primer pickup más cercano al centro geográfico
  const allCoords = stops.map((s) => s.coordinates);
  const centerLat = allCoords.reduce((s, c) => s + c[0], 0) / allCoords.length;
  const centerLng = allCoords.reduce((s, c) => s + c[1], 0) / allCoords.length;
  const center: [number, number] = [centerLat, centerLng];

  // Primera parada: pickup más cercano al centro
  let firstStop: RouteStop | null = null;
  let firstDist = Infinity;
  for (const stop of stops) {
    if (stop.type === 'pickup') {
      const d = calculateDistance(center, stop.coordinates);
      if (d < firstDist) {
        firstDist = d;
        firstStop = stop;
      }
    }
  }

  if (!firstStop) {
    // Solo deliveries (caso raro), ordenar por distancia
    return stops.map((s, i) => ({ ...s, sequence: i + 1 }));
  }

  ordered.push(firstStop);
  visited.add(firstStop.id);
  pickedUp.add(firstStop.orderId);

  // NN con restricción de precedencia
  while (ordered.length < stops.length) {
    const last = ordered[ordered.length - 1];
    let bestStop: RouteStop | null = null;
    let bestDist = Infinity;

    for (const stop of stops) {
      if (visited.has(stop.id)) continue;

      // Restricción: solo permitir delivery si su pickup ya fue visitado
      if (stop.type === 'delivery' && !pickedUp.has(stop.orderId)) {
        continue;
      }

      const d = calculateDistance(last.coordinates, stop.coordinates);
      if (d < bestDist) {
        bestDist = d;
        bestStop = stop;
      }
    }

    if (!bestStop) {
      // Todos los deliveries bloqueados, forzar un pickup pendiente
      for (const stop of stops) {
        if (!visited.has(stop.id) && stop.type === 'pickup') {
          bestStop = stop;
          break;
        }
      }
      // Si aún no hay, tomar cualquier no visitado
      if (!bestStop) {
        for (const stop of stops) {
          if (!visited.has(stop.id)) {
            bestStop = stop;
            break;
          }
        }
      }
    }

    if (!bestStop) break;

    ordered.push(bestStop);
    visited.add(bestStop.id);
    if (bestStop.type === 'pickup') {
      pickedUp.add(bestStop.orderId);
    }
  }

  // 2-opt improvement respetando restricción de precedencia
  const improved = twoOptImprove(ordered);

  return improved.map((s, i) => ({ ...s, sequence: i + 1 }));
}

/**
 * 2-opt improvement: intenta intercambiar segmentos para acortar distancia total.
 * Solo acepta swaps que mantengan la restricción pickup-before-delivery.
 */
function twoOptImprove(stops: RouteStop[]): RouteStop[] {
  if (stops.length < 4) return stops;

  let route = [...stops];
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 2; i++) {
      for (let j = i + 2; j < route.length; j++) {
        // Open-path 2-opt: no circular wrap; skip if j is the last stop (no j+1 neighbor)
        if (j + 1 >= route.length) continue;

        const d1 = calculateDistance(route[i].coordinates, route[i + 1].coordinates) +
                   calculateDistance(route[j].coordinates, route[j + 1].coordinates);
        const d2 = calculateDistance(route[i].coordinates, route[j].coordinates) +
                   calculateDistance(route[i + 1].coordinates, route[j + 1].coordinates);

        if (d2 < d1 - 0.01) {
          // Reversar segmento i+1..j
          const newRoute = [
            ...route.slice(0, i + 1),
            ...route.slice(i + 1, j + 1).reverse(),
            ...route.slice(j + 1),
          ];

          // Verificar que la restricción de precedencia se mantiene
          if (isValidPrecedence(newRoute)) {
            route = newRoute;
            improved = true;
          }
        }
      }
    }
  }

  return route;
}

/**
 * Verifica que para toda orden, el pickup aparece antes que el delivery
 */
function isValidPrecedence(stops: RouteStop[]): boolean {
  const pickedUp = new Set<string>();
  for (const stop of stops) {
    if (stop.type === 'pickup') {
      pickedUp.add(stop.orderId);
    } else if (stop.type === 'delivery') {
      if (!pickedUp.has(stop.orderId)) return false;
    }
  }
  return true;
}

/* ============================================
   ROUTE COLORS
   ============================================ */
export const ROUTE_COLORS = [
  "#3DBAFF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#14B8A6", "#6366F1",
];

/* ============================================
   MAIN: Generate Multiple Optimized Routes
   
   Flujo: Clustering → Stops → NN-TSP con precedencia
         → ETA → Métricas → Alertas
   
   ASYNC: Usa routingService para polylines reales
   (OSRM Route API) con fallback si falla
   ============================================ */
export async function generateMultipleOptimizedRoutes(
  orders: TransportOrder[],
  params: OptimizationParams,
  config: RouteConfiguration
): Promise<Route[]> {
  const k = Math.min(params.truckCount, orders.length);
  const clusters = clusterOrdersByProximity(orders, k);

  // Importar routingService dinámicamente para evitar circular deps
  const { routingService } = await import('@/services/routing.service');

  const routes = await Promise.all(
    clusters.map(async (clusterOrders, index) => {
      // ---- Crear stops desde órdenes del cluster ----
      const stops: RouteStop[] = [];
      let seq = 1;

      // Aplicar maxStops si está definido
      let ordersToProcess = clusterOrders;
      if (config.maxStops && config.maxStops > 0) {
        // maxStops es total de paradas (P+D = 2 por orden)
        const maxOrders = Math.floor(config.maxStops / 2);
        ordersToProcess = clusterOrders.slice(0, Math.max(1, maxOrders));
      }

      ordersToProcess.forEach((order) => {
        stops.push({
          id: `stop-${order.id}-pickup`,
          orderId: order.id,
          sequence: seq++,
          type: "pickup",
          address: order.pickup.address,
          city: order.pickup.city,
          coordinates: order.pickup.coordinates,
          timeWindow: order.pickup.timeWindow || {
            start: params.timeWindowStart,
            end: params.timeWindowEnd,
          },
          duration: params.stopDuration,
          status: "pending",
        });
        stops.push({
          id: `stop-${order.id}-delivery`,
          orderId: order.id,
          sequence: seq++,
          type: "delivery",
          address: order.delivery.address,
          city: order.delivery.city,
          coordinates: order.delivery.coordinates,
          timeWindow: order.delivery.timeWindow || {
            start: params.timeWindowStart,
            end: params.timeWindowEnd,
          },
          duration: params.stopDuration,
          status: "pending",
        });
      });

      // ---- Optimizar orden de paradas (NN-TSP con precedencia) ----
      const optimizedStops = optimizeStopOrder(stops);

      // ---- Calcular ETAs ----
      const stopsWithETA = calculateEstimatedArrivals(optimizedStops, params.timeWindowStart, {
        priority: config.priority,
        considerTraffic: config.considerTraffic,
      });

      // ---- Obtener polyline real de OSRM ----
      let polyline: [number, number][];
      let realDistance: number | null = null;
      let realDuration: number | null = null;

      try {
        const coords = stopsWithETA.map((s) => s.coordinates);
        const routeResult = await routingService.calculateRoute(coords);
        polyline = routeResult.polyline;
        realDistance = routeResult.totalDistance;
        realDuration = routeResult.totalDuration;
      } catch {
        // Fallback a polyline interpolado
        polyline = generateRoutePolyline(stopsWithETA);
      }

      // ---- Calcular métricas ----
      // Usar distancia real de OSRM si está disponible, sino Haversine
      const totalDistance = realDistance ?? calculateTotalDistance(stopsWithETA);
      // Siempre usar estimateDuration para que prioridad y tráfico afecten
      // (realDuration de OSRM/fallback no incluye prioridad ni tráfico)
      const estimatedDurationValue = estimateDuration(totalDistance, stopsWithETA.length, {
        priority: config.priority,
        considerTraffic: config.considerTraffic,
        stopDuration: params.stopDuration,
      });
      const defaultFuelConsumption = 10;
      const costs = estimateCost(totalDistance, defaultFuelConsumption, !config.avoidTolls, config.priority);
      const totalWeight = ordersToProcess.reduce((s, o) => s + o.cargo.weight, 0);
      const totalVolume = ordersToProcess.reduce((s, o) => s + o.cargo.volume, 0);

      // ---- Generar alertas inteligentes ----
      const alerts: RouteAlert[] = [];
      const windowMinutes =
        (parseInt(params.timeWindowEnd.split(":")[0]) - parseInt(params.timeWindowStart.split(":")[0])) * 60;

      if (estimatedDurationValue > windowMinutes) {
        alerts.push({
          id: `alert-time-${index}`,
          type: "warning",
          severity: "high",
          message: `Ruta ${index + 1} excede la ventana horaria (${Math.floor(estimatedDurationValue / 60)}h ${estimatedDurationValue % 60}m vs ${Math.floor(windowMinutes / 60)}h disponibles).`,
          code: "DELAY_RISK",
        });
      }

      // Alerta de conflicto de ventana de tiempo
      for (const stop of stopsWithETA) {
        if (stop.estimatedArrival && stop.timeWindow) {
          const [arrH, arrM] = stop.estimatedArrival.split(':').map(Number);
          const [endH, endM] = stop.timeWindow.end.split(':').map(Number);
          if (arrH * 60 + arrM > endH * 60 + endM) {
            alerts.push({
              id: `alert-tw-${stop.id}`,
              type: "warning",
              severity: "medium",
              message: `Parada "${stop.address}" llegaría a las ${stop.estimatedArrival} (ventana cierra ${stop.timeWindow.end}).`,
              code: "TIME_WINDOW_CONFLICT",
            });
          }
        }
      }

      if (config.considerTraffic) {
        alerts.push({
          id: `alert-traffic-${index}`,
          type: "info",
          severity: "low",
          message: `Ruta ${index + 1}: duración incluye +25% por tráfico estimado.`,
          code: "TRAFFIC_WARNING",
        });
      }

      return {
        id: `route-opt-${Date.now()}-${index}`,
        name: `Ruta ${index + 1}`,
        status: "generated" as const,
        stops: stopsWithETA,
        metrics: {
          totalDistance,
          estimatedDuration: estimatedDurationValue,
          estimatedCost: costs.total,
          fuelCost: costs.fuel,
          tollsCost: costs.tolls,
          totalWeight,
          totalVolume,
        },
        configuration: config,
        polyline,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        alerts: alerts.length > 0 ? alerts : undefined,
        color: ROUTE_COLORS[index % ROUTE_COLORS.length],
      };
    })
  );

  return routes;
}
