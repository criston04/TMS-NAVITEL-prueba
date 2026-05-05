"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { 
  RetransmissionRecord, 
  RetransmissionStats, 
  RetransmissionFilters,
  GpsCompany 
} from "@/types/monitoring";
import { retransmissionService } from "@/services/monitoring";

/**
 * Opciones del hook de retransmisión
 */
export interface UseRetransmissionOptions {
  /** Habilitar auto-refresh */
  autoRefresh?: boolean;
  /** Intervalo de refresh en milisegundos (default: 10000) */
  refreshIntervalMs?: number;
  /** Filtros iniciales */
  initialFilters?: RetransmissionFilters;
}

/**
 * Estado retornado por el hook
 */
export interface UseRetransmissionState {
  /** Lista de registros de retransmisión */
  records: RetransmissionRecord[];
  /** Estadísticas calculadas */
  stats: RetransmissionStats;
  /** Lista de empresas GPS */
  gpsCompanies: GpsCompany[];
  /** Lista de operadores/transportistas */
  companies: string[];

  /** true SOLO durante la primera carga (para mostrar skeleton inicial) */
  isLoading: boolean;
  /** true durante refresh en segundo plano (para girar el icono sin parpadear la UI) */
  isRefreshing: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
  
  filters: RetransmissionFilters;
  /** Última actualización */
  lastUpdated: Date | null;
}

/**
 * Acciones retornadas por el hook
 */
export interface UseRetransmissionActions {
  /** Establece los filtros */
  setFilters: (filters: RetransmissionFilters) => void;
  /** Actualiza un filtro específico */
  updateFilter: <K extends keyof RetransmissionFilters>(
    key: K, 
    value: RetransmissionFilters[K]
  ) => void;
  /** Limpia todos los filtros */
  clearFilters: () => void;
  /** Actualiza comentario de un registro */
  updateComment: (recordId: string, comment: string) => Promise<void>;
  /** Refresca los datos manualmente */
  refresh: () => Promise<void>;
  /** Pausa el auto-refresh */
  pauseAutoRefresh: () => void;
  /** Reanuda el auto-refresh */
  resumeAutoRefresh: () => void;
}

/**
 * Hook para gestión de retransmisión GPS
 * 
 */
export function useRetransmission(
  options: UseRetransmissionOptions = {}
): UseRetransmissionState & UseRetransmissionActions {
  const {
    // 30 segundos es un balance razonable: data razonablemente fresca sin
    // golpear al backend cada 10s. Ademas pausamos cuando la tab no esta
    // visible para no gastar requests cuando nadie mira la pantalla.
    autoRefresh = true,
    refreshIntervalMs = 30000,
    initialFilters = {},
  } = options;

  const [records, setRecords] = useState<RetransmissionRecord[]>([]);
  const [stats, setStats] = useState<RetransmissionStats>({
    total: 0,
    online: 0,
    temporaryLoss: 0,
    disconnected: 0,
    onlinePercentage: 0,
    temporaryLossPercentage: 0,
    disconnectedPercentage: 0,
  });
  const [gpsCompanies, setGpsCompanies] = useState<GpsCompany[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFiltersState] = useState<RetransmissionFilters>(initialFilters);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs para auto-refresh
  const autoRefreshEnabled = useRef(autoRefresh);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Marca si ya cargamos alguna vez. Evita que cada tick de auto-refresh haga
  // parpadear la UI (stats skeleton + tabla skeleton). Solo la PRIMERA carga
  // muestra skeleton; las siguientes son silenciosas.
  const hasLoadedOnceRef = useRef(false);

  /**
   * Carga los datos de retransmisión.
   * - Primera vez: setIsLoading(true) -> muestra skeleton inicial
   * - Siguientes: setIsRefreshing(true) -> solo gira el icono del boton
   */
  const loadData = useCallback(async (currentFilters: RetransmissionFilters) => {
    try {
      if (hasLoadedOnceRef.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const [recordsData, statsData] = await Promise.all([
        retransmissionService.getAll(currentFilters),
        retransmissionService.getStats(currentFilters),
      ]);

      setRecords(recordsData);
      setStats(statsData);
      setLastUpdated(new Date());
      hasLoadedOnceRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error loading retransmission data"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Carga datos iniciales (empresas GPS, operadores)
   */
  const loadInitialData = useCallback(async () => {
    try {
      const [gpsCompaniesData, companiesData] = await Promise.all([
        retransmissionService.getActiveGpsCompanies(),
        retransmissionService.getCompanies(),
      ]);
      setGpsCompanies(gpsCompaniesData);
      setCompanies(companiesData);
    } catch (err) {
      console.error("Error loading initial data:", err);
    }
  }, []);

  /**
   * Establece todos los filtros
   */
  const setFilters = useCallback((newFilters: RetransmissionFilters) => {
    setFiltersState(newFilters);
  }, []);

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = useCallback(<K extends keyof RetransmissionFilters>(
    key: K,
    value: RetransmissionFilters[K]
  ) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Limpia todos los filtros
   */
  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  /**
   * Actualiza el comentario de un registro
   */
  const updateComment = useCallback(async (recordId: string, comment: string) => {
    try {
      const updatedRecord = await retransmissionService.updateComment(recordId, comment);
      
      // Actualizar el registro en el estado local
      setRecords(prev => prev.map(r => 
        r.id === recordId ? updatedRecord : r
      ));
    } catch (err) {
      throw err instanceof Error ? err : new Error("Error updating comment");
    }
  }, []);

  /**
   * Refresca los datos manualmente
   */
  const refresh = useCallback(async () => {
    await loadData(filters);
  }, [loadData, filters]);

  /**
   * Pausa el auto-refresh
   */
  const pauseAutoRefresh = useCallback(() => {
    autoRefreshEnabled.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Reanuda el auto-refresh
   */
  const resumeAutoRefresh = useCallback(() => {
    autoRefreshEnabled.current = true;
    // El efecto se encargará de reiniciar el intervalo
  }, []);

  // Cargar datos iniciales al montar
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    loadData(filters);
  }, [filters, loadData]);

  // Auto-refresh con pausa cuando la tab no está visible.
  // Esto evita gastar requests y pintar en un navegador que el usuario no está
  // mirando (best practice UX + mejora el consumo del backend).
  useEffect(() => {
    if (!autoRefresh || !autoRefreshEnabled.current) return;
    if (typeof document === "undefined") return;

    const tick = () => {
      // Saltamos el refresh si la tab esta oculta o si esta pausado manualmente
      if (document.visibilityState !== "visible") return;
      if (!autoRefreshEnabled.current) return;
      loadData(filters);
    };

    intervalRef.current = setInterval(tick, refreshIntervalMs);

    // Cuando la tab vuelve a ser visible, refrescar una vez (data fresca al volver)
    const onVisibility = () => {
      if (document.visibilityState === "visible" && autoRefreshEnabled.current) {
        loadData(filters);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autoRefresh, refreshIntervalMs, filters, loadData]);

  // Memoizar el retorno para evitar re-renders innecesarios
  return useMemo(() => ({
    records,
    stats,
    gpsCompanies,
    companies,
    isLoading,
    isRefreshing,
    error,
    filters,
    lastUpdated,
    setFilters,
    updateFilter,
    clearFilters,
    updateComment,
    refresh,
    pauseAutoRefresh,
    resumeAutoRefresh,
  }), [
    records,
    stats,
    gpsCompanies,
    companies,
    isLoading,
    isRefreshing,
    error,
    filters,
    lastUpdated,
    setFilters,
    updateFilter,
    clearFilters,
    updateComment,
    refresh,
    pauseAutoRefresh,
    resumeAutoRefresh,
  ]);
}
