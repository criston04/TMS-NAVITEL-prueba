/**
 * @fileoverview Routing Service - Servicio de cálculo de rutas usando OSRM
 * Incluye: Rutas punto-a-punto, Trip API para TSP, Distancias reales,
 * Fallback inteligente, Rate-limiting, Cache de rutas
 * @module services/routing
 */

/* ============================================
   TIPOS
   ============================================ */

export interface RouteSegment {
  coordinates: [number, number][];
  distance: number; // en metros
  duration: number; // en segundos
}

export interface RoutingResult {
  polyline: [number, number][];
  totalDistance: number; // en km
  totalDuration: number; // en minutos
  segments: RouteSegment[];
}

export interface TripResult extends RoutingResult {
  waypointOrder: number[];
}

export interface DistanceMatrixEntry {
  from: number;
  to: number;
  distance: number; // km
  duration: number; // minutos
}

/* ============================================
   SERVICIO DE ROUTING
   ============================================ */

class RoutingService {
  private readonly OSRM_BASE = 'https://router.project-osrm.org';
  private readonly ROUTE_URL = `${this.OSRM_BASE}/route/v1/driving`;
  private readonly TRIP_URL = `${this.OSRM_BASE}/trip/v1/driving`;
  private readonly TABLE_URL = `${this.OSRM_BASE}/table/v1/driving`;

  // Cache para evitar peticiones repetidas
  private routeCache = new Map<string, RoutingResult>();
  private readonly CACHE_MAX_SIZE = 100;

  // Rate-limiting: máx 1 petición cada 1.1s para OSRM público
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1100; // ms

  /**
   * Espera si es necesario para respetar rate-limit de OSRM público
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.MIN_REQUEST_INTERVAL) {
      await new Promise((resolve) => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Genera clave de cache a partir de coordenadas
   */
  private cacheKey(coordinates: [number, number][]): string {
    return coordinates.map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`).join('|');
  }

  /**
   * Calcula una ruta entre múltiples puntos usando OSRM Route API
   * @param coordinates Array de coordenadas [lat, lng]
   * @returns Resultado de la ruta con polyline siguiendo calles reales
   */
  async calculateRoute(
    coordinates: [number, number][]
  ): Promise<RoutingResult> {
    try {
      if (coordinates.length < 2) {
        throw new Error('Se requieren al menos 2 puntos para calcular una ruta');
      }

      // Comprobar cache
      const key = this.cacheKey(coordinates);
      const cached = this.routeCache.get(key);
      if (cached) return cached;

      await this.waitForRateLimit();

      // Convertir coordenadas a formato OSRM (lng,lat)
      const coords = coordinates
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(';');

      const url = `${this.ROUTE_URL}/${coords}?overview=full&geometries=geojson&steps=true`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Error en OSRM Route:', response.statusText);
        return this.fallbackStraightLine(coordinates);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        console.warn('OSRM no devolvió rutas, usando fallback');
        return this.fallbackStraightLine(coordinates);
      }

      const route = data.routes[0];
      
      // Extraer las coordenadas del polyline (OSRM devuelve [lng, lat])
      const polyline: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      const totalDistance = Math.round((route.distance / 1000) * 10) / 10;
      const totalDuration = Math.round(route.duration / 60);

      // Procesar segmentos por leg
      const segments: RouteSegment[] = route.legs.map((leg: any) => ({
        coordinates: leg.steps
          .flatMap((step: any) => step.geometry.coordinates)
          .map(([lng, lat]: [number, number]) => [lat, lng]),
        distance: leg.distance,
        duration: leg.duration,
      }));

      const result: RoutingResult = { polyline, totalDistance, totalDuration, segments };

      // Guardar en cache
      if (this.routeCache.size >= this.CACHE_MAX_SIZE) {
        const firstKey = this.routeCache.keys().next().value;
        if (firstKey) this.routeCache.delete(firstKey);
      }
      this.routeCache.set(key, result);

      return result;
    } catch (error) {
      console.error('Error calculando ruta:', error);
      return this.fallbackStraightLine(coordinates);
    }
  }

  /**
   * Usa OSRM Trip API para encontrar la secuencia óptima de paradas (TSP)
   * No round-trip, primer punto fijo como origen.
   * @param coordinates Array de coordenadas [lat, lng]
   * @returns Resultado con polyline real + waypointOrder (índices reordenados)
   */
  async calculateOptimizedTrip(
    coordinates: [number, number][]
  ): Promise<TripResult> {
    try {
      if (coordinates.length < 2) {
        throw new Error('Se requieren al menos 2 puntos');
      }

      // Con 2 puntos no hay nada que optimizar
      if (coordinates.length === 2) {
        const routing = await this.calculateRoute(coordinates);
        return { ...routing, waypointOrder: [0, 1] };
      }

      await this.waitForRateLimit();

      const coords = coordinates
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(';');

      // source=first: primer punto es origen fijo
      // roundtrip=false: no volver al inicio
      // geometries=geojson: polyline real
      const url = `${this.TRIP_URL}/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('Error en OSRM Trip:', response.statusText);
        return this.fallbackTrip(coordinates);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
        console.warn('OSRM Trip no devolvió resultado, usando fallback');
        return this.fallbackTrip(coordinates);
      }

      const trip = data.trips[0];

      const polyline: [number, number][] = trip.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      const totalDistance = Math.round((trip.distance / 1000) * 10) / 10;
      const totalDuration = Math.round(trip.duration / 60);

      const segments: RouteSegment[] = trip.legs.map((leg: any) => ({
        coordinates: leg.steps
          .flatMap((step: any) => step.geometry.coordinates)
          .map(([lng, lat]: [number, number]) => [lat, lng]),
        distance: leg.distance,
        duration: leg.duration,
      }));

      // OSRM Trip API devuelve waypoints con `waypoint_index`
      const waypointOrder: number[] = data.waypoints.map(
        (wp: any) => wp.waypoint_index
      );

      return { polyline, totalDistance, totalDuration, segments, waypointOrder };
    } catch (error) {
      console.error('Error en Trip optimizado:', error);
      return this.fallbackTrip(coordinates);
    }
  }

  /**
   * Calcula ruta entre puntos respetando un orden fijo (ej: pickup antes de delivery)
   * Usa Route API (no Trip) para obtener polyline real sin cambiar el orden
   */
  async calculateConstrainedRoute(
    coordinates: [number, number][]
  ): Promise<RoutingResult> {
    return this.calculateRoute(coordinates);
  }

  /**
   * Obtiene la distancia/duración entre pares de puntos usando OSRM Table API
   * Útil para construir matrices de distancia para VRP
   */
  async getDistanceMatrix(
    coordinates: [number, number][]
  ): Promise<{ distances: number[][]; durations: number[][] }> {
    try {
      if (coordinates.length < 2) {
        throw new Error('Se requieren al menos 2 puntos');
      }

      await this.waitForRateLimit();

      const coords = coordinates
        .map(([lat, lng]) => `${lng},${lat}`)
        .join(';');

      const url = `${this.TABLE_URL}/${coords}?annotations=distance,duration`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('Error en OSRM Table:', response.statusText);
        return this.fallbackDistanceMatrix(coordinates);
      }

      const data = await response.json();

      if (data.code !== 'Ok') {
        return this.fallbackDistanceMatrix(coordinates);
      }

      // distances en metros → km, durations en segundos → minutos
      const distances: number[][] = data.distances.map((row: number[]) =>
        row.map((d: number) => Math.round((d / 1000) * 10) / 10)
      );
      const durations: number[][] = data.durations.map((row: number[]) =>
        row.map((d: number) => Math.round(d / 60))
      );

      return { distances, durations };
    } catch (error) {
      console.error('Error en matriz de distancias:', error);
      return this.fallbackDistanceMatrix(coordinates);
    }
  }

  /**
   * Fallback: Genera una ruta con líneas rectas interpoladas cuando OSRM falla
   */
  fallbackStraightLine(
    coordinates: [number, number][]
  ): RoutingResult {
    const polyline: [number, number][] = [];
    let totalDistance = 0;

    for (let i = 0; i < coordinates.length - 1; i++) {
      const start = coordinates[i];
      const end = coordinates[i + 1];

      const steps = 20;
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const lat = start[0] + (end[0] - start[0]) * t;
        const lng = start[1] + (end[1] - start[1]) * t;
        polyline.push([lat, lng]);
      }

      totalDistance += this.calculateDistance(start, end);
    }

    const totalDuration = Math.round((totalDistance / 40) * 60);

    return {
      polyline,
      totalDistance: Math.round(totalDistance * 10) / 10,
      totalDuration,
      segments: [],
    };
  }

  /**
   * Fallback para Trip API — usa NN-TSP propio + línea recta
   */
  private fallbackTrip(coordinates: [number, number][]): TripResult {
    // Nearest-Neighbor TSP simple
    const visited = new Set<number>();
    const order: number[] = [0];
    visited.add(0);

    while (order.length < coordinates.length) {
      const last = coordinates[order[order.length - 1]];
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < coordinates.length; i++) {
        if (visited.has(i)) continue;
        const d = this.calculateDistance(last, coordinates[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        order.push(bestIdx);
        visited.add(bestIdx);
      }
    }

    const reordered = order.map((i) => coordinates[i]);
    const routing = this.fallbackStraightLine(reordered);
    return { ...routing, waypointOrder: order };
  }

  /**
   * Fallback para matriz de distancias — Haversine
   */
  private fallbackDistanceMatrix(
    coordinates: [number, number][]
  ): { distances: number[][]; durations: number[][] } {
    const n = coordinates.length;
    const distances: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const durations: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = this.calculateDistance(coordinates[i], coordinates[j]);
        distances[i][j] = Math.round(d * 10) / 10;
        durations[i][j] = Math.round((d / 40) * 60); // 40 km/h
      }
    }

    return { distances, durations };
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   * @public Para permitir su uso desde otros módulos
   */
  calculateDistance(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const R = 6371; // Radio de la Tierra en km
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

  /**
   * @deprecated Usar calculateOptimizedTrip() o calculateConstrainedRoute()
   * Mantenido por compatibilidad
   */
  async calculateOptimizedRoute(
    coordinates: [number, number][],
    _startIndex: number = 0
  ): Promise<RoutingResult & { waypointOrder: number[] }> {
    return this.calculateOptimizedTrip(coordinates);
  }

  /**
   * Limpia la cache de rutas
   */
  clearCache(): void {
    this.routeCache.clear();
  }
}

// Exportar instancia única
export const routingService = new RoutingService();
