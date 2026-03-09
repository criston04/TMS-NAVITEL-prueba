"use client";

import { useState, useCallback, useMemo } from "react";
import type { 
  HistoricalRoute, 
  HistoricalRouteStats, 
  HistoricalRouteParams,
  RouteExportFormat,
  RouteExportOptions
} from "@/types/monitoring";
import { historicalTrackingService } from "@/services/monitoring";

/**
 * Estado retornado por el hook
 */
export interface UseHistoricalRouteState {
  /** Ruta histórica cargada */
  route: HistoricalRoute | null;
  /** Estadísticas de la ruta */
  stats: HistoricalRouteStats | null;
  
  isLoading: boolean;
  /** Estado de exportación */
  isExporting: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
  /** Errores de validación */
  validationErrors: string[];
  /** Parámetros de la última consulta */
  lastParams: HistoricalRouteParams | null;
}

/**
 * Acciones retornadas por el hook
 */
export interface UseHistoricalRouteActions {
  /** Carga una ruta histórica */
  loadRoute: (params: HistoricalRouteParams) => Promise<void>;
  /** Exporta la ruta actual */
  exportRoute: (format: RouteExportFormat, options?: Partial<RouteExportOptions>) => Promise<void>;
  /** Obtiene vehículos disponibles para consulta */
  getAvailableVehicles: () => Promise<Array<{ id: string; plate: string }>>;
  /** Valida parámetros de consulta */
  validateParams: (params: HistoricalRouteParams) => { valid: boolean; errors: string[] };
  /** Limpia la ruta actual */
  clearRoute: () => void;
  /** Limpia errores */
  clearErrors: () => void;
}

/**
 * Hook para consulta de rutas históricas
 * 
 */
export function useHistoricalRoute(): UseHistoricalRouteState & UseHistoricalRouteActions {
  const [route, setRoute] = useState<HistoricalRoute | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lastParams, setLastParams] = useState<HistoricalRouteParams | null>(null);

  /**
   * Valida parámetros de consulta
   */
  const validateParams = useCallback((params: HistoricalRouteParams) => {
    return historicalTrackingService.validateRouteParams(params);
  }, []);

  /**
   * Carga una ruta histórica
   */
  const loadRoute = useCallback(async (params: HistoricalRouteParams) => {
    // Validar parámetros
    const validation = validateParams(params);
    if (!validation.valid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);
    setError(null);
    setIsLoading(true);

    try {
      const routeData = await historicalTrackingService.getRoute(params);
      setRoute(routeData);
      setLastParams(params);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error loading route"));
      setRoute(null);
    } finally {
      setIsLoading(false);
    }
  }, [validateParams]);

  /**
   * Exporta la ruta actual
   */
  const exportRoute = useCallback(async (
    format: RouteExportFormat, 
    options: Partial<RouteExportOptions> = {}
  ) => {
    if (!route) {
      setError(new Error("No route to export"));
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const exportOptions: RouteExportOptions = {
        format,
        includeStats: options.includeStats ?? true,
        includeEvents: options.includeEvents ?? true,
        filename: options.filename,
      };

      const blob = await historicalTrackingService.exportRoute(route, exportOptions);
      
      // Generar nombre de archivo
      const extension = format === "gpx" ? "gpx" : format;
      const filename = exportOptions.filename || 
        `ruta_${route.vehiclePlate}_${route.startDate.split("T")[0]}.${extension}`;
      
      // Descargar archivo
      historicalTrackingService.downloadExportedRoute(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error exporting route"));
    } finally {
      setIsExporting(false);
    }
  }, [route]);

  /**
   * Obtiene vehículos disponibles para consulta histórica
   */
  const getAvailableVehicles = useCallback(async () => {
    const data = await historicalTrackingService.getAvailableVehicles();
    return data.map((v: { id: string; plate: string }) => ({ id: v.id, plate: v.plate }));
  }, []);

  /**
   * Limpia la ruta actual
   */
  const clearRoute = useCallback(() => {
    setRoute(null);
    setLastParams(null);
    setError(null);
    setValidationErrors([]);
  }, []);

  /**
   * Limpia errores
   */
  const clearErrors = useCallback(() => {
    setError(null);
    setValidationErrors([]);
  }, []);

  // Derivar estadísticas
  const stats = useMemo(() => route?.stats ?? null, [route]);

  return useMemo(() => ({
    route,
    stats,
    isLoading,
    isExporting,
    error,
    validationErrors,
    lastParams,
    loadRoute,
    exportRoute,
    getAvailableVehicles,
    validateParams,
    clearRoute,
    clearErrors,
  }), [
    route,
    stats,
    isLoading,
    isExporting,
    error,
    validationErrors,
    lastParams,
    loadRoute,
    exportRoute,
    getAvailableVehicles,
    validateParams,
    clearRoute,
    clearErrors,
  ]);
}
