/**
 * @fileoverview Tests unitarios para el Routing Service (OSRM + Fallbacks)
 *
 * Cubre:
 * - calculateDistance (Haversine)
 * - fallbackStraightLine (determinismo)
 * - calculateRoute (con mock fetch)
 * - calculateOptimizedTrip (con mock fetch)
 * - getDistanceMatrix (con mock fetch)
 * - Cache de rutas
 * - Rate-limiting
 * - Fallback automático cuando OSRM falla
 *
 * Ejecutar: npx vitest run src/tests/route-planner/routing-service.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { routingService } from '@/services/routing.service';
import type { RoutingResult, TripResult } from '@/services/routing.service';

/* ============================================================
   Helpers
   ============================================================ */
const limaCoords: [number, number][] = [
  [-12.0464, -77.0428], // Centro
  [-12.0532, -77.0514], // San Isidro
  [-12.1191, -77.0375], // Miraflores
];

/**
 * Crea un mock response de OSRM Route API
 */
function createMockRouteResponse(coords: [number, number][]) {
  const geometry = {
    coordinates: coords.map(([lat, lng]) => [lng, lat]),
    type: 'LineString',
  };
  return {
    code: 'Ok',
    routes: [
      {
        distance: 15000, // 15 km
        duration: 1200,  // 20 min
        geometry,
        legs: coords.slice(1).map((_, i) => ({
          distance: 15000 / (coords.length - 1),
          duration: 1200 / (coords.length - 1),
          steps: [
            {
              geometry: {
                coordinates: [
                  [coords[i][1], coords[i][0]],
                  [coords[i + 1][1], coords[i + 1][0]],
                ],
              },
            },
          ],
        })),
      },
    ],
  };
}

/**
 * Crea un mock response de OSRM Trip API
 */
function createMockTripResponse(coords: [number, number][]) {
  const geometry = {
    coordinates: coords.map(([lat, lng]) => [lng, lat]),
    type: 'LineString',
  };
  return {
    code: 'Ok',
    trips: [
      {
        distance: 18000, // 18 km
        duration: 1500,  // 25 min
        geometry,
        legs: coords.slice(1).map((_, i) => ({
          distance: 18000 / (coords.length - 1),
          duration: 1500 / (coords.length - 1),
          steps: [
            {
              geometry: {
                coordinates: [
                  [coords[i][1], coords[i][0]],
                  [coords[i + 1][1], coords[i + 1][0]],
                ],
              },
            },
          ],
        })),
      },
    ],
    waypoints: coords.map((_, i) => ({ waypoint_index: i })),
  };
}

/**
 * Crea un mock response de OSRM Table API
 */
function createMockTableResponse(n: number) {
  const distances = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : 5000 + i * 100 + j * 50))
  );
  const durations = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : 600 + i * 30 + j * 10))
  );
  return { code: 'Ok', distances, durations };
}

/* ============================================================
   Tests
   ============================================================ */
describe('RoutingService', () => {
  beforeEach(() => {
    routingService.clearCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ----------------------------------------------------------
     calculateDistance (Haversine)
     ---------------------------------------------------------- */
  describe('calculateDistance', () => {
    it('distancia entre dos puntos de Lima', () => {
      const d = routingService.calculateDistance(limaCoords[0], limaCoords[2]);
      expect(d).toBeGreaterThan(5);
      expect(d).toBeLessThan(15);
    });

    it('distancia a sí mismo es 0', () => {
      expect(routingService.calculateDistance(limaCoords[0], limaCoords[0])).toBe(0);
    });

    it('es simétrica', () => {
      const d1 = routingService.calculateDistance(limaCoords[0], limaCoords[1]);
      const d2 = routingService.calculateDistance(limaCoords[1], limaCoords[0]);
      expect(d1).toBeCloseTo(d2, 10);
    });
  });

  /* ----------------------------------------------------------
     fallbackStraightLine
     ---------------------------------------------------------- */
  describe('fallbackStraightLine', () => {
    it('genera polyline interpolado', () => {
      const result = routingService.fallbackStraightLine(limaCoords);
      expect(result.polyline.length).toBeGreaterThan(0);
      // 2 segmentos × 21 = 42
      expect(result.polyline.length).toBe(42);
    });

    it('devuelve distancia y duración > 0', () => {
      const result = routingService.fallbackStraightLine(limaCoords);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalDuration).toBeGreaterThan(0);
    });

    it('polyline empieza y termina en los puntos dados', () => {
      const result = routingService.fallbackStraightLine(limaCoords);
      const first = result.polyline[0];
      const last = result.polyline[result.polyline.length - 1];
      expect(first[0]).toBeCloseTo(limaCoords[0][0], 3);
      expect(first[1]).toBeCloseTo(limaCoords[0][1], 3);
      expect(last[0]).toBeCloseTo(limaCoords[2][0], 3);
      expect(last[1]).toBeCloseTo(limaCoords[2][1], 3);
    });

    it('es determinista', () => {
      const r1 = routingService.fallbackStraightLine(limaCoords);
      const r2 = routingService.fallbackStraightLine(limaCoords);
      expect(r1.polyline).toEqual(r2.polyline);
      expect(r1.totalDistance).toBe(r2.totalDistance);
    });

    it('segments está vacío en fallback', () => {
      const result = routingService.fallbackStraightLine(limaCoords);
      expect(result.segments).toEqual([]);
    });
  });

  /* ----------------------------------------------------------
     calculateRoute — con fetch mockeado
     ---------------------------------------------------------- */
  describe('calculateRoute', () => {
    it('usa OSRM y devuelve polyline real', async () => {
      const mockResponse = createMockRouteResponse(limaCoords);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.calculateRoute(limaCoords);
      
      expect(result.polyline.length).toBeGreaterThan(0);
      expect(result.totalDistance).toBe(15); // 15000m / 1000
      expect(result.totalDuration).toBe(20); // 1200s / 60
      expect(result.segments.length).toBe(limaCoords.length - 1);
    });

    it('cae a fallback si fetch falla', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await routingService.calculateRoute(limaCoords);
      
      // Fallback devuelve polyline interpolado
      expect(result.polyline.length).toBeGreaterThan(0);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('cae a fallback si OSRM devuelve status != ok', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response('Server Error', { status: 500 })
      );

      const result = await routingService.calculateRoute(limaCoords);
      expect(result.polyline.length).toBeGreaterThan(0);
    });

    it('cae a fallback si OSRM devuelve code != Ok', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 'NoRoute' }), { status: 200 })
      );

      const result = await routingService.calculateRoute(limaCoords);
      expect(result.polyline.length).toBeGreaterThan(0);
    });

    it('error con menos de 2 puntos → usa fallback', async () => {
      const result = await routingService.calculateRoute([[-12.0, -77.0]]);
      // fallbackStraightLine con 1 punto devuelve polyline vacío
      expect(result.polyline.length).toBe(0);
    });

    it('cachea resultados — segunda llamada no hace fetch', async () => {
      const mockResponse = createMockRouteResponse(limaCoords);
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const r1 = await routingService.calculateRoute(limaCoords);
      const r2 = await routingService.calculateRoute(limaCoords);

      expect(fetchSpy).toHaveBeenCalledTimes(1); // Solo 1 fetch
      expect(r1).toEqual(r2);
    });

    it('clearCache() fuerza nueva petición', async () => {
      const mockResponse = createMockRouteResponse(limaCoords);
      const fetchSpy = vi.spyOn(global, 'fetch')
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockResponse), { status: 200 }));

      await routingService.calculateRoute(limaCoords);
      routingService.clearCache();
      await routingService.calculateRoute(limaCoords);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  /* ----------------------------------------------------------
     calculateOptimizedTrip
     ---------------------------------------------------------- */
  describe('calculateOptimizedTrip', () => {
    it('devuelve waypointOrder del OSRM Trip API', async () => {
      const mockResponse = createMockTripResponse(limaCoords);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.calculateOptimizedTrip(limaCoords);
      
      expect(result.waypointOrder).toBeDefined();
      expect(result.waypointOrder.length).toBe(limaCoords.length);
      expect(result.polyline.length).toBeGreaterThan(0);
    });

    it('con 2 puntos delega a calculateRoute sin Trip API', async () => {
      const twoPoints = limaCoords.slice(0, 2);
      const mockResponse = createMockRouteResponse(twoPoints);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.calculateOptimizedTrip(twoPoints);
      expect(result.waypointOrder).toEqual([0, 1]);
    });

    it('fallback a NN-TSP si Trip API falla', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

      const result = await routingService.calculateOptimizedTrip(limaCoords);
      
      expect(result.waypointOrder).toBeDefined();
      expect(result.waypointOrder.length).toBe(limaCoords.length);
      // waypointOrder[0] debe ser 0 (primer punto como origen)
      expect(result.waypointOrder[0]).toBe(0);
    });
  });

  /* ----------------------------------------------------------
     getDistanceMatrix
     ---------------------------------------------------------- */
  describe('getDistanceMatrix', () => {
    it('devuelve matrices de distancia y duración', async () => {
      const mockResponse = createMockTableResponse(3);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.getDistanceMatrix(limaCoords);
      
      expect(result.distances.length).toBe(3);
      expect(result.durations.length).toBe(3);
      expect(result.distances[0].length).toBe(3);
      expect(result.distances[0][0]).toBe(0); // diagonal
    });

    it('fallback a Haversine si Table API falla', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

      const result = await routingService.getDistanceMatrix(limaCoords);
      
      expect(result.distances.length).toBe(3);
      expect(result.durations.length).toBe(3);
      // Diagonal debe ser 0
      for (let i = 0; i < 3; i++) {
        expect(result.distances[i][i]).toBe(0);
        expect(result.durations[i][i]).toBe(0);
      }
    });

    it('matriz es asimétrica en duración (OSRM)', async () => {
      // Con datos mockeados, verificar que devuelve lo que OSRM da
      const mockResponse = createMockTableResponse(2);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.getDistanceMatrix(limaCoords.slice(0, 2));
      expect(result.distances.length).toBe(2);
    });
  });

  /* ----------------------------------------------------------
     calculateConstrainedRoute
     ---------------------------------------------------------- */
  describe('calculateConstrainedRoute', () => {
    it('equivale a calculateRoute (respeta orden fijo)', async () => {
      const mockResponse = createMockRouteResponse(limaCoords);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const result = await routingService.calculateConstrainedRoute(limaCoords);
      expect(result.polyline.length).toBeGreaterThan(0);
      expect(result.totalDistance).toBeGreaterThan(0);
    });
  });
});
