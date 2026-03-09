import { useState, useEffect, useCallback, useMemo } from "react";
import { geofenceEventsService } from "@/services/monitoring/geofence-events.service";
import type {
  GeofenceEvent,
  GeofenceEventFilters,
  GeofenceEventStats,
  GeofenceDwellSummary,
  CreateGeofenceEventDTO,
} from "@/types/geofence-events";


interface UseGeofenceEventsReturn {
  
  events: GeofenceEvent[];
  /** Estadísticas de eventos */
  stats: GeofenceEventStats | null;
  /** Resúmenes de permanencia */
  dwellSummaries: GeofenceDwellSummary[];
  /** Eventos activos (vehículos dentro de geocercas) */
  activeEvents: GeofenceEvent[];
  
  loading: boolean;
  /** Estado de carga de estadísticas */
  statsLoading: boolean;
  /** Error si existe */
  error: string | null;
  
  total: number;
  
  page: number;
  /** Tamaño de página */
  pageSize: number;
  
  filters: GeofenceEventFilters;

  /** Carga eventos con filtros */
  fetchEvents: (filters?: GeofenceEventFilters, page?: number) => Promise<void>;
  /** Carga estadísticas */
  fetchStats: (filters?: GeofenceEventFilters) => Promise<void>;
  /** Carga resúmenes de permanencia */
  fetchDwellSummaries: (filters?: { 
    geofenceId?: string; 
    vehicleId?: string; 
    startDate?: string; 
    endDate?: string;
  }) => Promise<void>;
  /** Carga eventos activos */
  fetchActiveEvents: () => Promise<void>;
  /** Registra entrada a geocerca */
  recordEntry: (data: CreateGeofenceEventDTO) => Promise<GeofenceEvent | null>;
  /** Registra salida de geocerca */
  recordExit: (
    vehicleId: string,
    geofenceId: string,
    coordinates: { lat: number; lng: number },
    speed?: number
  ) => Promise<GeofenceEvent | null>;
  /** Verifica si vehículo está en geocerca */
  checkVehicleInGeofence: (
    vehicleId: string,
    geofenceId: string
  ) => Promise<{ isInside: boolean; event: GeofenceEvent | null }>;
  /** Actualiza filtros */
  setFilters: (filters: GeofenceEventFilters) => void;
  /** Cambia página */
  setPage: (page: number) => void;
  /** Cambia tamaño de página */
  setPageSize: (size: number) => void;
  /** Recarga datos */
  refresh: () => Promise<void>;
}

interface UseGeofenceEventsOptions {
  /** Filtros iniciales */
  initialFilters?: GeofenceEventFilters;
  /** Tamaño de página inicial */
  initialPageSize?: number;
  /** Auto-cargar al montar */
  autoFetch?: boolean;
  /** Suscribirse a eventos en tiempo real */
  realTime?: boolean;
  /** Intervalo de refresco automático (ms) */
  refreshInterval?: number;
}


/**
 * Hook para gestión de eventos de geocerca
 * @param options Opciones de configuración
 * @returns Estado y acciones para gestión de eventos
 * 
 */
export function useGeofenceEvents(
  options: UseGeofenceEventsOptions = {}
): UseGeofenceEventsReturn {
  const {
    initialFilters = {},
    initialPageSize = 50,
    autoFetch = true,
    realTime = false,
    refreshInterval,
  } = options;

  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [stats, setStats] = useState<GeofenceEventStats | null>(null);
  const [dwellSummaries, setDwellSummaries] = useState<GeofenceDwellSummary[]>([]);
  const [activeEvents, setActiveEvents] = useState<GeofenceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<GeofenceEventFilters>(initialFilters);

  const fetchEvents = useCallback(
    async (newFilters?: GeofenceEventFilters, newPage?: number) => {
      setLoading(true);
      setError(null);

      try {
        const appliedFilters = newFilters || filters;
        const appliedPage = newPage || page;

        const result = await geofenceEventsService.getEvents(
          appliedFilters,
          appliedPage,
          pageSize
        );

        setEvents(result.data);
        setTotal(result.total);
        
        if (newFilters) setFilters(newFilters);
        if (newPage) setPage(newPage);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar eventos";
        setError(message);
        console.error("[useGeofenceEvents] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, page, pageSize]
  );

  const fetchStats = useCallback(
    async (statsFilters?: GeofenceEventFilters) => {
      setStatsLoading(true);

      try {
        const result = await geofenceEventsService.getStats(
          statsFilters || filters
        );
        setStats(result);
      } catch (err) {
        console.error("[useGeofenceEvents] Error al cargar estadísticas:", err);
      } finally {
        setStatsLoading(false);
      }
    },
    [filters]
  );

  const fetchDwellSummaries = useCallback(
    async (dwellFilters?: { 
      geofenceId?: string; 
      vehicleId?: string; 
      startDate?: string; 
      endDate?: string;
    }) => {
      try {
        const result = await geofenceEventsService.getDwellSummary(dwellFilters);
        setDwellSummaries(result);
      } catch (err) {
        console.error("[useGeofenceEvents] Error al cargar resúmenes:", err);
      }
    },
    []
  );

  const fetchActiveEvents = useCallback(async () => {
    try {
      const result = await geofenceEventsService.getActiveEvents();
      setActiveEvents(result);
    } catch (err) {
      console.error("[useGeofenceEvents] Error al cargar eventos activos:", err);
    }
  }, []);

  const recordEntry = useCallback(
    async (data: CreateGeofenceEventDTO): Promise<GeofenceEvent | null> => {
      try {
        const event = await geofenceEventsService.createEvent({
          ...data,
          eventType: "entry",
        });
        
        // Actualizar lista local
        setEvents(prev => [event, ...prev]);
        setActiveEvents(prev => [event, ...prev]);
        setTotal(prev => prev + 1);
        
        return event;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al registrar entrada";
        setError(message);
        console.error("[useGeofenceEvents] Error:", err);
        return null;
      }
    },
    []
  );

  const recordExit = useCallback(
    async (
      vehicleId: string,
      geofenceId: string,
      coordinates: { lat: number; lng: number },
      speed?: number
    ): Promise<GeofenceEvent | null> => {
      try {
        const event = await geofenceEventsService.recordExit(
          vehicleId,
          geofenceId,
          coordinates,
          speed
        );
        
        // Actualizar listas locales
        setEvents(prev => [event, ...prev]);
        setActiveEvents(prev => 
          prev.filter(e => !(e.vehicleId === vehicleId && e.geofenceId === geofenceId))
        );
        setTotal(prev => prev + 1);
        
        return event;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al registrar salida";
        setError(message);
        console.error("[useGeofenceEvents] Error:", err);
        return null;
      }
    },
    []
  );

  const checkVehicleInGeofence = useCallback(
    async (vehicleId: string, geofenceId: string) => {
      return geofenceEventsService.isVehicleInGeofence(vehicleId, geofenceId);
    },
    []
  );

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchEvents(),
      fetchStats(),
      fetchActiveEvents(),
    ]);
  }, [fetchEvents, fetchStats, fetchActiveEvents]);

  // Cargar datos al montar
  useEffect(() => {
    if (autoFetch) {
      fetchEvents();
      fetchStats();
      fetchActiveEvents();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suscripción en tiempo real
  useEffect(() => {
    if (!realTime) return;

    const unsubscribe = geofenceEventsService.subscribe((event) => {
      // Agregar nuevo evento a la lista
      setEvents(prev => [event, ...prev.slice(0, pageSize - 1)]);
      setTotal(prev => prev + 1);

      // Actualizar eventos activos
      if (event.eventType === "entry" && event.status === "active") {
        setActiveEvents(prev => [event, ...prev]);
      } else if (event.eventType === "exit") {
        setActiveEvents(prev => 
          prev.filter(e => 
            !(e.vehicleId === event.vehicleId && e.geofenceId === event.geofenceId)
          )
        );
      }
    });

    return () => {
      unsubscribe();
    };
  }, [realTime, pageSize]);

  // Refresco automático
  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(() => {
      fetchEvents();
      fetchActiveEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchEvents, fetchActiveEvents]);

  const computedStats = useMemo(() => {
    if (stats) return stats;
    
    const entries = events.filter(e => e.eventType === "entry");
    const exits = events.filter(e => e.eventType === "exit");
    
    return {
      totalEvents: events.length,
      entries: entries.length,
      exits: exits.length,
      activeEvents: activeEvents.length,
      avgDwellMinutes: 0,
      expectedEvents: events.filter(e => e.wasExpected).length,
      onTimeArrivals: events.filter(e => e.arrivedOnTime).length,
      onTimeRate: 100,
      byGeofence: [],
      byVehicle: [],
    } as GeofenceEventStats;
  }, [stats, events, activeEvents]);

  return {
    events,
    stats: computedStats,
    dwellSummaries,
    activeEvents,
    loading,
    statsLoading,
    error,
    total,
    page,
    pageSize,
    filters,

    fetchEvents,
    fetchStats,
    fetchDwellSummaries,
    fetchActiveEvents,
    recordEntry,
    recordExit,
    checkVehicleInGeofence,
    setFilters,
    setPage,
    setPageSize,
    refresh,
  };
}


/**
 * Hook para eventos de una geocerca específica
 */
export function useGeofenceEventsForGeofence(geofenceId: string) {
  return useGeofenceEvents({
    initialFilters: { geofenceId },
    autoFetch: !!geofenceId,
    realTime: true,
  });
}

/**
 * Hook para eventos de un vehículo específico
 */
export function useGeofenceEventsForVehicle(vehicleId: string) {
  return useGeofenceEvents({
    initialFilters: { vehicleId },
    autoFetch: !!vehicleId,
    realTime: true,
  });
}

/**
 * Hook para eventos activos en tiempo real
 */
export function useActiveGeofenceEvents(refreshMs: number = 30000) {
  const hook = useGeofenceEvents({
    autoFetch: true,
    realTime: true,
    refreshInterval: refreshMs,
  });

  return {
    activeEvents: hook.activeEvents,
    loading: hook.loading,
    refresh: hook.fetchActiveEvents,
  };
}

/**
 * Hook para análisis de permanencia
 */
export function useDwellAnalysis(filters?: {
  geofenceId?: string;
  vehicleId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const [summaries, setSummaries] = useState<GeofenceDwellSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await geofenceEventsService.getDwellSummary(filters);
      setSummaries(result);
    } catch (err) {
      console.error("[useDwellAnalysis] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const totalVisits = useMemo(
    () => summaries.reduce((sum, s) => sum + s.visitCount, 0),
    [summaries]
  );

  const totalDwellTime = useMemo(
    () => summaries.reduce((sum, s) => sum + s.totalDwellMinutes, 0),
    [summaries]
  );

  const avgDwellTime = useMemo(
    () => summaries.length > 0
      ? Math.round(totalDwellTime / summaries.length)
      : 0,
    [summaries, totalDwellTime]
  );

  return {
    summaries,
    loading,
    refresh: fetch,
    totalVisits,
    totalDwellTime,
    avgDwellTime,
  };
}

export default useGeofenceEvents;
