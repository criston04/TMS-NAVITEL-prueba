/**
 * @fileoverview Tests de integración para generateMultipleOptimizedRoutes
 *
 * Verifica el flujo completo:
 * Clustering → Stops → NN-TSP → ETAs → OSRM polylines → Métricas → Alertas
 *
 * Usa fetch mock para evitar dependencia de OSRM público.
 *
 * Ejecutar: npx vitest run src/tests/route-planner/generate-routes.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateMultipleOptimizedRoutes,
  mockOrders,
  ROUTE_COLORS,
} from '@/lib/mock-data/route-planner';
import type { RouteConfiguration, OptimizationParams } from '@/types/route-planner';

/* ============================================================
   Helpers
   ============================================================ */
const defaultConfig: RouteConfiguration = {
  avoidTolls: false,
  priority: 'balanced',
  considerTraffic: false,
  maxStops: undefined,
  timeBuffer: 5,
};

const defaultParams: OptimizationParams = {
  timeWindowStart: '08:00',
  timeWindowEnd: '18:00',
  truckCount: 3,
  stopDuration: 15,
};

/**
 * Mock global fetch para que siempre devuelva fallback en OSRM
 * (evita hits reales al servidor público en tests)
 */
function mockFetchToFail() {
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Test: OSRM no disponible'));
}

/* ============================================================
   Tests
   ============================================================ */
describe('generateMultipleOptimizedRoutes', () => {
  beforeEach(() => {
    mockFetchToFail();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera el número correcto de rutas según truckCount', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      { ...defaultParams, truckCount: 3 },
      defaultConfig
    );
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.length).toBeLessThanOrEqual(3);
  });

  it('cada ruta tiene stops con precedencia pickup→delivery', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      const visitedPickups = new Set<string>();
      for (const stop of route.stops) {
        if (stop.type === 'pickup') {
          visitedPickups.add(stop.orderId);
        } else {
          expect(visitedPickups.has(stop.orderId)).toBe(true);
        }
      }
    }
  });

  it('cada ruta tiene métricas válidas', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      expect(route.metrics.totalDistance).toBeGreaterThan(0);
      expect(route.metrics.estimatedDuration).toBeGreaterThan(0);
      expect(route.metrics.estimatedCost).toBeGreaterThanOrEqual(0);
      expect(route.metrics.totalWeight).toBeGreaterThan(0);
      expect(route.metrics.totalVolume).toBeGreaterThan(0);
    }
  });

  it('cada ruta tiene polyline con puntos', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      expect(route.polyline).toBeDefined();
      expect(route.polyline!.length).toBeGreaterThan(0);
    }
  });

  it('cada ruta tiene un color asignado', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      expect(route.color).toBeDefined();
      expect(route.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('stops tienen estimatedArrival en formato HH:MM', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      for (const stop of route.stops) {
        expect(stop.estimatedArrival).toBeDefined();
        expect(stop.estimatedArrival).toMatch(/^\d{2}:\d{2}$/);
      }
    }
  });

  it('ETAs son crecientes dentro de cada ruta', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      for (let i = 1; i < route.stops.length; i++) {
        const [pH, pM] = route.stops[i - 1].estimatedArrival!.split(':').map(Number);
        const [cH, cM] = route.stops[i].estimatedArrival!.split(':').map(Number);
        expect(cH * 60 + cM).toBeGreaterThanOrEqual(pH * 60 + pM);
      }
    }
  });

  it('todas las órdenes están cubiertas (sin perder ninguna)', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    const allOrderIds = new Set<string>();
    for (const route of routes) {
      for (const stop of route.stops) {
        allOrderIds.add(stop.orderId);
      }
    }

    // Cada orden de mockOrders debe estar en alguna ruta
    for (const order of mockOrders) {
      expect(allOrderIds.has(order.id)).toBe(true);
    }
  });

  /* ----------------------------------------------------------
     PRIORITY AFFECTS METRICS
     ---------------------------------------------------------- */
  it('prioridad "speed" da menor duración que "cost"', async () => {
    const speedRoutes = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 4),
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, priority: 'speed' }
    );
    const costRoutes = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 4),
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, priority: 'cost' }
    );

    const speedDuration = speedRoutes[0].metrics.estimatedDuration;
    const costDuration = costRoutes[0].metrics.estimatedDuration;
    expect(speedDuration).toBeLessThan(costDuration);
  });

  /* ----------------------------------------------------------
     TRAFFIC AFFECTS METRICS
     ---------------------------------------------------------- */
  it('tráfico incrementa duración', async () => {
    const noTraffic = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 4),
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, considerTraffic: false }
    );
    const withTraffic = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 4),
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, considerTraffic: true }
    );

    expect(withTraffic[0].metrics.estimatedDuration)
      .toBeGreaterThan(noTraffic[0].metrics.estimatedDuration);
  });

  /* ----------------------------------------------------------
     TRAFFIC GENERATES ALERT
     ---------------------------------------------------------- */
  it('tráfico genera alerta informativa', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 4),
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, considerTraffic: true }
    );

    const trafficAlerts = routes[0].alerts?.filter(
      (a) => a.code === 'TRAFFIC_WARNING'
    );
    expect(trafficAlerts?.length).toBeGreaterThan(0);
  });

  /* ----------------------------------------------------------
     MAX STOPS LIMITS ORDERS
     ---------------------------------------------------------- */
  it('maxStops limita el número de paradas por ruta', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      { ...defaultParams, truckCount: 1 },
      { ...defaultConfig, maxStops: 4 } // 4 paradas = 2 órdenes
    );

    const route = routes[0];
    // Con maxStops=4, debería procesar máx 2 órdenes = 4 stops
    expect(route.stops.length).toBeLessThanOrEqual(4);
  });

  /* ----------------------------------------------------------
     ROUTE STATUS AND METADATA
     ---------------------------------------------------------- */
  it('rutas generadas tienen status "generated"', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      expect(route.status).toBe('generated');
    }
  });

  it('rutas tienen timestamps válidos', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      expect(route.createdAt).toBeDefined();
      expect(route.updatedAt).toBeDefined();
      // Debe ser un ISO string parseable
      expect(() => new Date(route.createdAt)).not.toThrow();
    }
  });

  it('rutas tienen sus sequences correctas (1..N)', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders,
      defaultParams,
      defaultConfig
    );

    for (const route of routes) {
      const seqs = route.stops.map((s) => s.sequence);
      const expected = Array.from({ length: route.stops.length }, (_, i) => i + 1);
      expect(seqs).toEqual(expected);
    }
  });

  /* ----------------------------------------------------------
     SINGLE ORDER
     ---------------------------------------------------------- */
  it('funciona con una sola orden', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      [mockOrders[0]],
      { ...defaultParams, truckCount: 1 },
      defaultConfig
    );

    expect(routes.length).toBe(1);
    expect(routes[0].stops.length).toBe(2); // pickup + delivery
    expect(routes[0].stops[0].type).toBe('pickup');
    expect(routes[0].stops[1].type).toBe('delivery');
  });

  /* ----------------------------------------------------------
     TRUCK COUNT > ORDERS
     ---------------------------------------------------------- */
  it('truckCount > órdenes no genera rutas vacías', async () => {
    const routes = await generateMultipleOptimizedRoutes(
      mockOrders.slice(0, 2),
      { ...defaultParams, truckCount: 10 },
      defaultConfig
    );

    // No debe haber rutas con 0 stops
    for (const route of routes) {
      expect(route.stops.length).toBeGreaterThan(0);
    }
    // Máximo 2 rutas para 2 órdenes
    expect(routes.length).toBeLessThanOrEqual(2);
  });
});
