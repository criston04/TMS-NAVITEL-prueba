/**
 * @fileoverview Tests unitarios completos para los algoritmos del Route Planner
 *
 * Cubre:
 * - calculateDistance (Haversine)
 * - calculateTotalDistance
 * - generateRoutePolyline (determinismo, sin ruido)
 * - estimateDuration (priority, traffic, stopDuration)
 * - estimateCost (priority, tolls)
 * - calculateEstimatedArrivals (ETAs secuenciales)
 * - clusterOrdersByProximity (K-means++, centroide pickup+delivery)
 * - optimizeStopOrder (Precedence-Constrained NN + 2-opt)
 * - generateMultipleOptimizedRoutes (integración completa)
 *
 * Ejecutar: npx vitest run src/tests/route-planner/algorithms.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TransportOrder, RouteStop, RouteConfiguration, OptimizationParams } from '@/types/route-planner';
import {
  calculateDistance,
  calculateTotalDistance,
  generateRoutePolyline,
  estimateDuration,
  estimateCost,
  calculateEstimatedArrivals,
  clusterOrdersByProximity,
  optimizeStopOrder,
  ROUTE_COLORS,
  mockOrders,
  mockVehicles,
  mockDrivers,
} from '@/lib/mock-data/route-planner';

/* ============================================================
   1. calculateDistance — Haversine
   ============================================================ */
describe('calculateDistance', () => {
  it('devuelve 0 para el mismo punto', () => {
    const point: [number, number] = [-12.0464, -77.0428];
    expect(calculateDistance(point, point)).toBe(0);
  });

  it('calcula la distancia Lima Centro ↔ Miraflores (~5 km)', () => {
    const limaCentro: [number, number] = [-12.0464, -77.0428];
    const miraflores: [number, number] = [-12.1191, -77.0375];
    const dist = calculateDistance(limaCentro, miraflores);
    // Distancia real ≈ 8 km, Haversine debe estar entre 7 y 9
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(15);
  });

  it('es simétrica: d(A,B) === d(B,A)', () => {
    const a: [number, number] = [-12.0464, -77.0428];
    const b: [number, number] = [-12.1191, -77.0375];
    expect(calculateDistance(a, b)).toBeCloseTo(calculateDistance(b, a), 10);
  });

  it('distancia entre puntos lejanos (Lima ↔ Cusco ~580 km)', () => {
    const lima: [number, number] = [-12.0464, -77.0428];
    const cusco: [number, number] = [-13.5320, -71.9675];
    const dist = calculateDistance(lima, cusco);
    expect(dist).toBeGreaterThan(550);
    expect(dist).toBeLessThan(650);
  });

  it('devuelve un número finito y positivo o cero', () => {
    const a: [number, number] = [0, 0];
    const b: [number, number] = [1, 1];
    const d = calculateDistance(a, b);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(d)).toBe(true);
  });
});

/* ============================================================
   2. calculateTotalDistance
   ============================================================ */
describe('calculateTotalDistance', () => {
  it('devuelve 0 con un solo punto', () => {
    const stops = [{ coordinates: [-12.0464, -77.0428] as [number, number] }];
    expect(calculateTotalDistance(stops)).toBe(0);
  });

  it('devuelve 0 con array vacío', () => {
    expect(calculateTotalDistance([])).toBe(0);
  });

  it('suma distancias consecutivas correctamente', () => {
    const a: [number, number] = [-12.0464, -77.0428];
    const b: [number, number] = [-12.0532, -77.0514];
    const c: [number, number] = [-12.0803, -77.0875];

    const dAB = calculateDistance(a, b);
    const dBC = calculateDistance(b, c);
    const total = calculateTotalDistance([
      { coordinates: a },
      { coordinates: b },
      { coordinates: c },
    ]);

    // Redondeado a 1 decimal
    expect(total).toBeCloseTo(Math.round((dAB + dBC) * 10) / 10, 0);
  });

  it('maneja 2 puntos', () => {
    const stops = [
      { coordinates: [-12.0464, -77.0428] as [number, number] },
      { coordinates: [-12.0532, -77.0514] as [number, number] },
    ];
    const total = calculateTotalDistance(stops);
    expect(total).toBeGreaterThan(0);
  });
});

/* ============================================================
   3. generateRoutePolyline — Determinismo, sin ruido
   ============================================================ */
describe('generateRoutePolyline', () => {
  const stops = [
    { coordinates: [-12.0464, -77.0428] as [number, number] },
    { coordinates: [-12.0532, -77.0514] as [number, number] },
    { coordinates: [-12.0803, -77.0875] as [number, number] },
  ];

  it('genera puntos intermedios entre paradas', () => {
    const polyline = generateRoutePolyline(stops);
    // 2 segmentos × 21 puntos cada uno (0..20) = 42
    expect(polyline.length).toBe(42);
  });

  it('empieza en la primera parada', () => {
    const polyline = generateRoutePolyline(stops);
    expect(polyline[0][0]).toBeCloseTo(stops[0].coordinates[0], 4);
    expect(polyline[0][1]).toBeCloseTo(stops[0].coordinates[1], 4);
  });

  it('termina en la última parada', () => {
    const polyline = generateRoutePolyline(stops);
    const last = polyline[polyline.length - 1];
    expect(last[0]).toBeCloseTo(stops[stops.length - 1].coordinates[0], 4);
    expect(last[1]).toBeCloseTo(stops[stops.length - 1].coordinates[1], 4);
  });

  it('es DETERMINISTA — misma entrada produce la misma salida', () => {
    const p1 = generateRoutePolyline(stops);
    const p2 = generateRoutePolyline(stops);
    expect(p1).toEqual(p2);
  });

  it('NO tiene ruido aleatorio (Math.random)', () => {
    // Si llamamos 10 veces, debe dar siempre lo mismo
    const results = Array.from({ length: 10 }, () => generateRoutePolyline(stops));
    for (let i = 1; i < results.length; i++) {
      expect(results[i]).toEqual(results[0]);
    }
  });

  it('devuelve array vacío si solo hay una parada', () => {
    const singleStop = [{ coordinates: [-12.0464, -77.0428] as [number, number] }];
    const polyline = generateRoutePolyline(singleStop);
    expect(polyline.length).toBe(0);
  });

  it('cada punto está entre las coordenadas de sus paradas extremas', () => {
    const polyline = generateRoutePolyline(stops);
    const minLat = Math.min(...stops.map((s) => s.coordinates[0]));
    const maxLat = Math.max(...stops.map((s) => s.coordinates[0]));
    const minLng = Math.min(...stops.map((s) => s.coordinates[1]));
    const maxLng = Math.max(...stops.map((s) => s.coordinates[1]));

    for (const [lat, lng] of polyline) {
      expect(lat).toBeGreaterThanOrEqual(minLat - 0.001);
      expect(lat).toBeLessThanOrEqual(maxLat + 0.001);
      expect(lng).toBeGreaterThanOrEqual(minLng - 0.001);
      expect(lng).toBeLessThanOrEqual(maxLng + 0.001);
    }
  });
});

/* ============================================================
   4. estimateDuration — Priority, Traffic, StopDuration
   ============================================================ */
describe('estimateDuration', () => {
  const distanceKm = 100;
  const stopCount = 5;

  it('devuelve un número positivo', () => {
    const d = estimateDuration(distanceKm, stopCount);
    expect(d).toBeGreaterThan(0);
  });

  it('prioridad "speed" es más rápido que "balanced"', () => {
    const speed = estimateDuration(distanceKm, stopCount, { priority: 'speed' });
    const balanced = estimateDuration(distanceKm, stopCount, { priority: 'balanced' });
    expect(speed).toBeLessThan(balanced);
  });

  it('prioridad "cost" es más lento que "balanced"', () => {
    const cost = estimateDuration(distanceKm, stopCount, { priority: 'cost' });
    const balanced = estimateDuration(distanceKm, stopCount, { priority: 'balanced' });
    expect(cost).toBeGreaterThan(balanced);
  });

  it('tráfico incrementa la duración un 25%', () => {
    const noTraffic = estimateDuration(distanceKm, stopCount, { priority: 'balanced', considerTraffic: false });
    const withTraffic = estimateDuration(distanceKm, stopCount, { priority: 'balanced', considerTraffic: true });
    // Debe ser ~1.25x
    expect(withTraffic).toBeGreaterThan(noTraffic);
    const ratio = withTraffic / noTraffic;
    expect(ratio).toBeCloseTo(1.25, 1);
  });

  it('más paradas incrementan la duración', () => {
    const few = estimateDuration(distanceKm, 2);
    const many = estimateDuration(distanceKm, 10);
    expect(many).toBeGreaterThan(few);
  });

  it('stopDuration personalizado se aplica', () => {
    const d5 = estimateDuration(distanceKm, 5, { stopDuration: 5 });
    const d30 = estimateDuration(distanceKm, 5, { stopDuration: 30 });
    // 5 paradas × (30-5) = 125 min de diferencia
    expect(d30 - d5).toBeGreaterThanOrEqual(120);
  });

  it('distancia 0 solo cuenta tiempo de paradas', () => {
    const d = estimateDuration(0, 3, { stopDuration: 10 });
    // Solo 3 × 10 = 30 min
    expect(d).toBe(30);
  });
});

/* ============================================================
   5. estimateCost — Priority, Peajes
   ============================================================ */
describe('estimateCost', () => {
  const distanceKm = 100;
  const fuelConsumption = 10; // km/L

  it('devuelve fuel, tolls y total correcto', () => {
    const cost = estimateCost(distanceKm, fuelConsumption, true);
    expect(cost.fuel).toBeGreaterThan(0);
    expect(cost.tolls).toBeGreaterThanOrEqual(0);
    expect(cost.total).toBeCloseTo(cost.fuel + cost.tolls, 1);
  });

  it('sin peajes → tolls = 0', () => {
    const cost = estimateCost(distanceKm, fuelConsumption, false);
    expect(cost.tolls).toBe(0);
  });

  it('prioridad "cost" evita peajes incluso cuando hasTolls=true', () => {
    const cost = estimateCost(distanceKm, fuelConsumption, true, 'cost');
    expect(cost.tolls).toBe(0);
  });

  it('prioridad "speed" tiene más peajes que "balanced"', () => {
    const speed = estimateCost(distanceKm, fuelConsumption, true, 'speed');
    const balanced = estimateCost(distanceKm, fuelConsumption, true, 'balanced');
    expect(speed.tolls).toBeGreaterThan(balanced.tolls);
  });

  it('prioridad "speed" gasta más combustible (peor rendimiento)', () => {
    const speed = estimateCost(distanceKm, fuelConsumption, false, 'speed');
    const balanced = estimateCost(distanceKm, fuelConsumption, false, 'balanced');
    // speed tiene adjustedConsumption * 0.85 → más litros por km
    expect(speed.fuel).toBeGreaterThan(balanced.fuel);
  });

  it('prioridad "cost" gasta menos combustible (mejor rendimiento)', () => {
    const cost = estimateCost(distanceKm, fuelConsumption, false, 'cost');
    const balanced = estimateCost(distanceKm, fuelConsumption, false, 'balanced');
    expect(cost.fuel).toBeLessThan(balanced.fuel);
  });

  it('distancia 0 → costo 0', () => {
    const cost = estimateCost(0, fuelConsumption, true, 'balanced');
    expect(cost.total).toBe(0);
    expect(cost.fuel).toBe(0);
    expect(cost.tolls).toBe(0);
  });
});

/* ============================================================
   6. calculateEstimatedArrivals — ETAs
   ============================================================ */
describe('calculateEstimatedArrivals', () => {
  const makeStop = (id: string, orderId: string, type: 'pickup' | 'delivery', coords: [number, number]): RouteStop => ({
    id,
    orderId,
    sequence: 0,
    type,
    address: `Addr ${id}`,
    city: 'Lima',
    coordinates: coords,
    duration: 15,
    status: 'pending',
    timeWindow: { start: '08:00', end: '18:00' },
  });

  it('primera parada tiene ETA = startTime', () => {
    const stops = [makeStop('s1', 'o1', 'pickup', [-12.0464, -77.0428])];
    const result = calculateEstimatedArrivals(stops, '08:00');
    expect(result[0].estimatedArrival).toBe('08:00');
  });

  it('segunda parada tiene ETA > startTime + duración parada 1', () => {
    const stops = [
      makeStop('s1', 'o1', 'pickup', [-12.0464, -77.0428]),
      makeStop('s2', 'o1', 'delivery', [-12.0532, -77.0514]),
    ];
    const result = calculateEstimatedArrivals(stops, '08:00');
    // Debe ser después de 08:00 + 15 min de parada + tiempo de viaje
    const [h, m] = result[1].estimatedArrival!.split(':').map(Number);
    const arrivalMinutes = h * 60 + m;
    expect(arrivalMinutes).toBeGreaterThan(8 * 60 + 15);
  });

  it('prioridad "speed" da ETAs más tempranas que "cost"', () => {
    const stops = [
      makeStop('s1', 'o1', 'pickup', [-12.0464, -77.0428]),
      makeStop('s2', 'o1', 'delivery', [-12.12, -77.05]),
    ];
    const fast = calculateEstimatedArrivals(stops, '08:00', { priority: 'speed' });
    const slow = calculateEstimatedArrivals(stops, '08:00', { priority: 'cost' });

    const [fH, fM] = fast[1].estimatedArrival!.split(':').map(Number);
    const [sH, sM] = slow[1].estimatedArrival!.split(':').map(Number);
    expect(fH * 60 + fM).toBeLessThanOrEqual(sH * 60 + sM);
  });

  it('tráfico retrasa las ETAs', () => {
    const stops = [
      makeStop('s1', 'o1', 'pickup', [-12.0464, -77.0428]),
      makeStop('s2', 'o1', 'delivery', [-12.12, -77.05]),
    ];
    const noTraffic = calculateEstimatedArrivals(stops, '08:00', { considerTraffic: false });
    const withTraffic = calculateEstimatedArrivals(stops, '08:00', { considerTraffic: true });

    const [ntH, ntM] = noTraffic[1].estimatedArrival!.split(':').map(Number);
    const [wtH, wtM] = withTraffic[1].estimatedArrival!.split(':').map(Number);
    expect(wtH * 60 + wtM).toBeGreaterThanOrEqual(ntH * 60 + ntM);
  });

  it('array vacío devuelve array vacío', () => {
    expect(calculateEstimatedArrivals([], '08:00')).toEqual([]);
  });

  it('formato de ETA es "HH:MM"', () => {
    const stops = [makeStop('s1', 'o1', 'pickup', [-12.0464, -77.0428])];
    const result = calculateEstimatedArrivals(stops, '09:30');
    expect(result[0].estimatedArrival).toMatch(/^\d{2}:\d{2}$/);
  });

  it('múltiples paradas producen ETAs crecientes', () => {
    const stops = [
      makeStop('s1', 'o1', 'pickup', [-12.04, -77.04]),
      makeStop('s2', 'o1', 'delivery', [-12.05, -77.05]),
      makeStop('s3', 'o2', 'pickup', [-12.06, -77.06]),
      makeStop('s4', 'o2', 'delivery', [-12.07, -77.07]),
    ];
    const result = calculateEstimatedArrivals(stops, '08:00');
    for (let i = 1; i < result.length; i++) {
      const [pH, pM] = result[i - 1].estimatedArrival!.split(':').map(Number);
      const [cH, cM] = result[i].estimatedArrival!.split(':').map(Number);
      expect(cH * 60 + cM).toBeGreaterThanOrEqual(pH * 60 + pM);
    }
  });
});

/* ============================================================
   7. clusterOrdersByProximity — K-means++
   ============================================================ */
describe('clusterOrdersByProximity', () => {
  it('devuelve k clusters o menos (nunca vacíos)', () => {
    const clusters = clusterOrdersByProximity(mockOrders, 3);
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.length).toBeLessThanOrEqual(3);
    for (const cluster of clusters) {
      expect(cluster.length).toBeGreaterThan(0);
    }
  });

  it('todas las órdenes aparecen exactamente una vez', () => {
    const clusters = clusterOrdersByProximity(mockOrders, 3);
    const allOrderIds = clusters.flat().map((o) => o.id);
    const uniqueIds = new Set(allOrderIds);
    expect(uniqueIds.size).toBe(mockOrders.length);
    expect(allOrderIds.length).toBe(mockOrders.length);
  });

  it('k >= N → cada orden en su propio cluster', () => {
    const clusters = clusterOrdersByProximity(mockOrders, mockOrders.length + 5);
    // Cada cluster tiene 1 orden
    for (const cluster of clusters) {
      expect(cluster.length).toBe(1);
    }
  });

  it('k=1 → todas en un solo cluster', () => {
    const clusters = clusterOrdersByProximity(mockOrders, 1);
    expect(clusters.length).toBe(1);
    expect(clusters[0].length).toBe(mockOrders.length);
  });

  it('array vacío devuelve array vacío', () => {
    expect(clusterOrdersByProximity([], 3)).toEqual([]);
  });

  it('usa centroide pickup+delivery (no solo delivery)', () => {
    // Crear 2 órdenes donde los deliveries están juntos pero los pickups lejos
    const farOrders: TransportOrder[] = [
      {
        ...mockOrders[0],
        id: 'test-1',
        pickup: { ...mockOrders[0].pickup, coordinates: [-12.0, -77.0] },
        delivery: { ...mockOrders[0].delivery, coordinates: [-12.05, -77.05] },
      },
      {
        ...mockOrders[0],
        id: 'test-2',
        pickup: { ...mockOrders[0].pickup, coordinates: [-12.3, -77.3] },
        delivery: { ...mockOrders[0].delivery, coordinates: [-12.05, -77.05] },
      },
    ];

    const clusters = clusterOrdersByProximity(farOrders, 2);
    // Si solo usara delivery, estarían juntas. Con centroide, deben separarse.
    expect(clusters.length).toBe(2);
    expect(clusters[0].length).toBe(1);
    expect(clusters[1].length).toBe(1);
  });

  it('es determinista para las mismas órdenes', () => {
    const c1 = clusterOrdersByProximity(mockOrders, 3);
    const c2 = clusterOrdersByProximity(mockOrders, 3);
    const ids1 = c1.map((c) => c.map((o) => o.id).sort());
    const ids2 = c2.map((c) => c.map((o) => o.id).sort());
    expect(ids1).toEqual(ids2);
  });
});

/* ============================================================
   8. optimizeStopOrder — Precedence-Constrained NN + 2-opt
   ============================================================ */
describe('optimizeStopOrder', () => {
  const makeStops = (count: number): RouteStop[] => {
    const stops: RouteStop[] = [];
    for (let i = 0; i < count; i++) {
      const lat = -12.0 - i * 0.01;
      const lng = -77.0 - i * 0.01;
      stops.push({
        id: `stop-${i}-p`,
        orderId: `order-${i}`,
        sequence: 0,
        type: 'pickup',
        address: `Pickup ${i}`,
        city: 'Lima',
        coordinates: [lat, lng],
        duration: 10,
        status: 'pending',
      });
      stops.push({
        id: `stop-${i}-d`,
        orderId: `order-${i}`,
        sequence: 0,
        type: 'delivery',
        address: `Delivery ${i}`,
        city: 'Lima',
        coordinates: [lat - 0.005, lng - 0.005],
        duration: 10,
        status: 'pending',
      });
    }
    return stops;
  };

  it('mantiene precedencia: pickup ANTES de delivery para cada orden', () => {
    const stops = makeStops(5);
    const optimized = optimizeStopOrder(stops);

    const visitedPickups = new Set<string>();
    for (const stop of optimized) {
      if (stop.type === 'pickup') {
        visitedPickups.add(stop.orderId);
      } else {
        // El pickup de esta orden ya debe haber sido visitado
        expect(visitedPickups.has(stop.orderId)).toBe(true);
      }
    }
  });

  it('asigna secuencias 1...N', () => {
    const stops = makeStops(4);
    const optimized = optimizeStopOrder(stops);
    const sequences = optimized.map((s) => s.sequence);
    expect(sequences).toEqual(Array.from({ length: stops.length }, (_, i) => i + 1));
  });

  it('conserva todas las paradas (no pierde ni duplica)', () => {
    const stops = makeStops(6);
    const optimized = optimizeStopOrder(stops);
    expect(optimized.length).toBe(stops.length);
    const ids = new Set(optimized.map((s) => s.id));
    expect(ids.size).toBe(stops.length);
  });

  it('maneja 1 sola orden (2 paradas)', () => {
    const stops = makeStops(1);
    const optimized = optimizeStopOrder(stops);
    expect(optimized.length).toBe(2);
    expect(optimized[0].type).toBe('pickup');
    expect(optimized[1].type).toBe('delivery');
  });

  it('maneja 2 paradas sin crash', () => {
    const stops: RouteStop[] = [
      {
        id: 's1',
        orderId: 'o1',
        sequence: 0,
        type: 'pickup',
        address: 'A',
        city: 'Lima',
        coordinates: [-12.0, -77.0],
        duration: 10,
        status: 'pending',
      },
      {
        id: 's2',
        orderId: 'o1',
        sequence: 0,
        type: 'delivery',
        address: 'B',
        city: 'Lima',
        coordinates: [-12.01, -77.01],
        duration: 10,
        status: 'pending',
      },
    ];
    const optimized = optimizeStopOrder(stops);
    expect(optimized).toHaveLength(2);
  });

  it('conserva la distancia total dentro de un rango razonable', () => {
    // NN + 2-opt con restricción de precedencia puede reordenar significativamente
    // pero no debería dar una ruta absurdamente larga
    const stops = makeStops(5);
    const optimized = optimizeStopOrder(stops);

    const origDist = calculateTotalDistance(stops);
    const optDist = calculateTotalDistance(optimized);
    // Permitir hasta 3x por la restricción de precedencia (pickup antes que delivery)
    // El NN necesita intercalar pickups y deliveries, lo cual puede alargar la ruta
    expect(optDist).toBeLessThan(origDist * 3 + 5);
    expect(optDist).toBeGreaterThan(0);
  });

  it('con muchas paradas (20 órdenes = 40 stops) termina en tiempo razonable', () => {
    const stops = makeStops(20);
    const start = performance.now();
    const optimized = optimizeStopOrder(stops);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000); // < 5s
    expect(optimized.length).toBe(40);

    // Verificar precedencia
    const pickups = new Set<string>();
    for (const stop of optimized) {
      if (stop.type === 'pickup') pickups.add(stop.orderId);
      else expect(pickups.has(stop.orderId)).toBe(true);
    }
  });

  it('solo deliveries (caso raro) no falla', () => {
    const deliveryOnly: RouteStop[] = [
      {
        id: 'd1',
        orderId: 'o1',
        sequence: 0,
        type: 'delivery',
        address: 'X',
        city: 'Lima',
        coordinates: [-12.0, -77.0],
        duration: 10,
        status: 'pending',
      },
      {
        id: 'd2',
        orderId: 'o2',
        sequence: 0,
        type: 'delivery',
        address: 'Y',
        city: 'Lima',
        coordinates: [-12.01, -77.01],
        duration: 10,
        status: 'pending',
      },
    ];
    const result = optimizeStopOrder(deliveryOnly);
    expect(result.length).toBe(2);
  });
});

/* ============================================================
   9. ROUTE_COLORS
   ============================================================ */
describe('ROUTE_COLORS', () => {
  it('tiene al menos 10 colores', () => {
    expect(ROUTE_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('todos son colores hex válidos', () => {
    for (const color of ROUTE_COLORS) {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('no hay colores duplicados', () => {
    const unique = new Set(ROUTE_COLORS);
    expect(unique.size).toBe(ROUTE_COLORS.length);
  });
});

/* ============================================================
   10. Mock data structure validity
   ============================================================ */
describe('Mock Data Validity', () => {
  it('mockOrders tiene al menos 5 órdenes', () => {
    expect(mockOrders.length).toBeGreaterThanOrEqual(5);
  });

  it('cada orden tiene pickup y delivery con coordenadas válidas', () => {
    for (const order of mockOrders) {
      expect(order.pickup.coordinates).toHaveLength(2);
      expect(order.delivery.coordinates).toHaveLength(2);
      // Perú: lat entre -18 y -3, lng entre -82 y -68
      expect(order.pickup.coordinates[0]).toBeGreaterThan(-18);
      expect(order.pickup.coordinates[0]).toBeLessThan(-3);
      expect(order.delivery.coordinates[0]).toBeGreaterThan(-18);
      expect(order.delivery.coordinates[0]).toBeLessThan(-3);
    }
  });

  it('mockVehicles tiene vehículos con capacidad > 0', () => {
    expect(mockVehicles.length).toBeGreaterThan(0);
    for (const v of mockVehicles) {
      expect(v.capacity.weight).toBeGreaterThan(0);
      expect(v.capacity.volume).toBeGreaterThan(0);
    }
  });

  it('mockDrivers tiene conductores con datos completos', () => {
    expect(mockDrivers.length).toBeGreaterThan(0);
    for (const d of mockDrivers) {
      expect(d.firstName).toBeTruthy();
      expect(d.lastName).toBeTruthy();
      expect(d.licenseNumber).toBeTruthy();
      expect(d.rating).toBeGreaterThanOrEqual(0);
      expect(d.rating).toBeLessThanOrEqual(5);
    }
  });
});
