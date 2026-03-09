import type { 
  HistoricalRoute, 
  HistoricalRouteParams,
  HistoricalRouteStats,
  RouteExportOptions
} from "@/types/monitoring";
import type { Vehicle } from "@/types/models/vehicle";
import { 
  historicalRoutesMock, 
  getRouteByVehicleId,
  generateRouteForVehicle,
  generateHistoricalRouteStats,
  exportRouteToCSV,
  exportRouteToGPX
} from "@/mocks/monitoring/historical-routes.mock";
import { vehiclesMock } from "@/mocks/master/vehicles.mock";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Servicio de Rastreo Histórico
 */
export class HistoricalTrackingService {
  private readonly useMocks: boolean;
  private readonly endpoint = "/monitoring/historical";
  
  // Caché de rutas consultadas
  private routeCache: Map<string, HistoricalRoute> = new Map();
  private readonly cacheMaxSize = 10;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red para mocks
   */
  private async simulateDelay(ms: number = 500): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Genera clave de caché única para una consulta
   */
  private getCacheKey(params: HistoricalRouteParams): string {
    return `${params.vehicleId}_${params.startDateTime}_${params.endDateTime}`;
  }

  /**
   * Agrega ruta al caché
   */
  private addToCache(key: string, route: HistoricalRoute): void {
    // Limpiar caché si excede el tamaño máximo
    if (this.routeCache.size >= this.cacheMaxSize) {
      const firstKey = this.routeCache.keys().next().value;
      if (firstKey) {
        this.routeCache.delete(firstKey);
      }
    }
    this.routeCache.set(key, route);
  }

  /**
   * Obtiene una ruta histórica
   */
  async getRoute(params: HistoricalRouteParams): Promise<HistoricalRoute> {
    // Verificar caché primero
    const cacheKey = this.getCacheKey(params);
    const cached = this.routeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.useMocks) {
      await this.simulateDelay(800);
      
      // Buscar ruta existente para el vehículo
      let route = getRouteByVehicleId(params.vehicleId);
      
      // Si no existe, generar una nueva
      if (!route) {
        const vehicle = vehiclesMock.find(v => v.id === params.vehicleId);
        if (!vehicle) {
          throw new Error(`Vehicle not found: ${params.vehicleId}`);
        }
        
        route = generateRouteForVehicle(
          params.vehicleId,
          vehicle.plate,
          params.startDateTime,
          params.endDateTime
        );
      }
      
      // Guardar en caché
      this.addToCache(cacheKey, route);
      
      return route;
    }

    const result = await apiClient.get<HistoricalRoute>(API_ENDPOINTS.monitoring.historical, {
      params: {
        vehicleId: params.vehicleId,
        startDateTime: params.startDateTime,
        endDateTime: params.endDateTime,
      },
    });
    this.addToCache(cacheKey, result);
    return result;
  }

  /**
   * Exporta una ruta a un formato específico
   */
  async exportRoute(route: HistoricalRoute, options: RouteExportOptions): Promise<Blob> {
    await this.simulateDelay(300);
    
    let content: string;
    let mimeType: string;
    
    switch (options.format) {
      case "csv":
        content = exportRouteToCSV(route);
        mimeType = "text/csv;charset=utf-8;";
        break;
        
      case "gpx":
        content = exportRouteToGPX(route);
        mimeType = "application/gpx+xml;charset=utf-8;";
        break;
        
      case "json":
        const exportData = {
          route: {
            id: route.id,
            vehicleId: route.vehicleId,
            vehiclePlate: route.vehiclePlate,
            startDate: route.startDate,
            endDate: route.endDate,
            generatedAt: route.generatedAt,
          },
          stats: options.includeStats !== false ? route.stats : undefined,
          points: route.points.map(p => ({
            lat: p.lat,
            lng: p.lng,
            speed: p.speed,
            heading: p.heading,
            timestamp: p.timestamp,
            isStopped: p.isStopped,
            ...(options.includeEvents && p.event ? { event: p.event } : {}),
          })),
        };
        content = JSON.stringify(exportData, null, 2);
        mimeType = "application/json;charset=utf-8;";
        break;
        
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
    
    return new Blob([content], { type: mimeType });
  }

  /**
   * Obtiene lista de vehículos con histórico disponible
   */
  async getAvailableVehicles(): Promise<Pick<Vehicle, "id" | "plate">[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);
      
      // En mock, todos los vehículos tienen histórico disponible
      return vehiclesMock.map(v => ({
        id: v.id,
        plate: v.plate,
      }));
    }

    return apiClient.get<Pick<Vehicle, "id" | "plate">[]>(`${API_ENDPOINTS.monitoring.historical}/vehicles`);
  }

  /**
   * Obtiene el rango de fechas disponible para un vehículo
   */
  async getAvailableDateRange(_vehicleId: string): Promise<{ min: string; max: string }> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      
      // En mock, disponible desde hace 90 días hasta ahora
      const now = new Date();
      const minDate = new Date(now);
      minDate.setDate(minDate.getDate() - 90);
      
      return {
        min: minDate.toISOString(),
        max: now.toISOString(),
      };
    }

    return apiClient.get<{ min: string; max: string }>(`${API_ENDPOINTS.monitoring.historical}/vehicles/${_vehicleId}/date-range`);
  }

  /**
   * Calcula estadísticas de una ruta
   */
  calculateRouteStats(route: HistoricalRoute): HistoricalRouteStats {
    return generateHistoricalRouteStats(route.points);
  }

  /**
   * Obtiene rutas pre-generadas (para desarrollo/demo)
   */
  async getPreloadedRoutes(): Promise<HistoricalRoute[]> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return [...historicalRoutesMock];
    }

    return apiClient.get<HistoricalRoute[]>(`${API_ENDPOINTS.monitoring.historical}/preloaded`);
  }

  /**
   * Limpia la caché de rutas
   */
  clearCache(): void {
    this.routeCache.clear();
  }

  /**
   * Valida parámetros de consulta de ruta
   */
  validateRouteParams(params: HistoricalRouteParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!params.vehicleId) {
      errors.push("Se requiere un vehículo");
    }
    
    if (!params.startDateTime) {
      errors.push("Se requiere fecha/hora de inicio");
    }
    
    if (!params.endDateTime) {
      errors.push("Se requiere fecha/hora de fin");
    }
    
    if (params.startDateTime && params.endDateTime) {
      const start = new Date(params.startDateTime);
      const end = new Date(params.endDateTime);
      
      if (start >= end) {
        errors.push("La fecha de inicio debe ser anterior a la fecha de fin");
      }
      
      // Máximo 7 días de diferencia
      const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        errors.push("El rango máximo permitido es de 7 días");
      }
      
      // No permitir fechas futuras
      if (end > new Date()) {
        errors.push("No se pueden consultar fechas futuras");
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Descarga un archivo de ruta exportada
   */
  downloadExportedRoute(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Singleton del servicio de rastreo histórico
 */
export const historicalTrackingService = new HistoricalTrackingService();
