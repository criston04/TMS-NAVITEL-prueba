import { useState, useEffect, useCallback, useMemo } from "react";
import { maintenanceService } from "@/services/master/maintenance.service";
import type {
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceType,
  MaintenanceStatus,
} from "@/types/models/vehicle";


/**
 * Alerta de mantenimiento
 */
export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  type: "upcoming" | "due" | "overdue" | "critical";
  maintenanceType: MaintenanceType | string;
  description: string;
  dueDate?: string;
  dueKilometers?: number;
  currentKilometers?: number;
  daysRemaining?: number;
  kmRemaining?: number;
  priority: "low" | "medium" | "high" | "critical";
  scheduleId?: string;
}

/**
 * Estadísticas de mantenimiento del vehículo
 */
export interface VehicleMaintenanceStats {
  
  totalMaintenances: number;
  /** Completados */
  completed: number;
  /** En progreso */
  inProgress: number;
  /** Programados */
  scheduled: number;
  /** Vencidos */
  overdue: number;
  /** Costo total */
  totalCost: number;
  /** Costo promedio */
  avgCost: number;
  /** Total horas de inactividad */
  totalDowntimeHours: number;
  /** Último mantenimiento */
  lastMaintenanceDate: string | null;
  /** Próximo mantenimiento programado */
  nextScheduledDate: string | null;
}

/**
 * Filtros para el historial
 */
export interface MaintenanceHistoryFilters {
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  startDate?: string;
  endDate?: string;
}

/**
 * Estado del hook
 */
interface UseVehicleMaintenanceState {
  records: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  stats: VehicleMaintenanceStats;
  alerts: MaintenanceAlert[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Resultado del hook
 */
interface UseVehicleMaintenanceReturn extends UseVehicleMaintenanceState {
  /** Recargar datos */
  refresh: () => Promise<void>;
  /** Aplicar filtros */
  applyFilters: (filters: MaintenanceHistoryFilters) => void;
  
  filters: MaintenanceHistoryFilters;
  /** Crear mantenimiento */
  createMaintenance: (data: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">) => Promise<MaintenanceRecord>;
  /** Iniciar mantenimiento */
  startMaintenance: (id: string) => Promise<MaintenanceRecord>;
  /** Completar mantenimiento */
  completeMaintenance: (id: string, data: CompletionData) => Promise<MaintenanceRecord>;
  /** Cancelar mantenimiento */
  cancelMaintenance: (id: string, reason: string) => Promise<MaintenanceRecord>;
  /** Mantenimientos activos (en progreso) */
  activeMaintenances: MaintenanceRecord[];
  /** Mantenimientos pendientes */
  pendingMaintenances: MaintenanceRecord[];
  /** Tiene mantenimiento en progreso */
  hasActiveMaintenance: boolean;
  /** Tiene alertas críticas */
  hasCriticalAlerts: boolean;
  /** Próximo mantenimiento */
  nextMaintenance: MaintenanceSchedule | null;
  /** Vehículo disponible para operación */
  isVehicleAvailable: boolean;
}

/**
 * Datos para completar mantenimiento
 */
interface CompletionData {
  completionDate: string;
  totalActualCost: number;
  invoiceNumber?: string;
  invoiceFileUrl?: string;
  notes?: string;
  nextMaintenanceDate?: string;
  nextMaintenanceOdometer?: number;
}

const defaultStats: VehicleMaintenanceStats = {
  totalMaintenances: 0,
  completed: 0,
  inProgress: 0,
  scheduled: 0,
  overdue: 0,
  totalCost: 0,
  avgCost: 0,
  totalDowntimeHours: 0,
  lastMaintenanceDate: null,
  nextScheduledDate: null,
};


/**
 * Hook para gestionar el mantenimiento de un vehículo
 * 
 * @param vehicleId - ID del vehículo
 * @param currentOdometer - Odómetro actual del vehículo (para calcular alertas)
 * @returns Estado y funciones para gestionar mantenimiento
 * 
 */
export function useVehicleMaintenance(
  vehicleId: string | undefined,
  currentOdometer?: number
): UseVehicleMaintenanceReturn {
  const [state, setState] = useState<UseVehicleMaintenanceState>({
    records: [],
    schedules: [],
    stats: defaultStats,
    alerts: [],
    isLoading: false,
    error: null,
  });

  const [filters, setFilters] = useState<MaintenanceHistoryFilters>({});

  /**
   * Calcula alertas basadas en programaciones
   */
  const calculateAlerts = useCallback((
    schedules: MaintenanceSchedule[],
    records: MaintenanceRecord[],
    odometer?: number
  ): MaintenanceAlert[] => {
    const alerts: MaintenanceAlert[] = [];
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    // Alertas de programaciones
    for (const schedule of schedules) {
      if (!schedule.isActive) continue;

      let alertType: MaintenanceAlert["type"] | null = null;
      let priority: MaintenanceAlert["priority"] = "low";
      let daysRemaining: number | undefined;
      let kmRemaining: number | undefined;

      // Alerta por fecha
      if (schedule.nextMaintenanceDate) {
        const dueDate = new Date(schedule.nextMaintenanceDate);
        daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < -7) {
          alertType = "critical";
          priority = "critical";
        } else if (daysRemaining < 0) {
          alertType = "overdue";
          priority = "high";
        } else if (daysRemaining === 0) {
          alertType = "due";
          priority = "high";
        } else if (daysRemaining <= 7) {
          alertType = "upcoming";
          priority = "medium";
        }
      }

      // Alerta por kilometraje
      if (odometer && schedule.nextMaintenanceOdometer) {
        kmRemaining = schedule.nextMaintenanceOdometer - odometer;

        if (kmRemaining < -500) {
          alertType = "critical";
          priority = "critical";
        } else if (kmRemaining < 0) {
          if (alertType !== "critical") {
            alertType = "overdue";
            priority = priority === "critical" ? "critical" : "high";
          }
        } else if (kmRemaining <= 500) {
          if (!alertType || alertType === "upcoming") {
            alertType = "due";
            priority = priority === "critical" ? "critical" : "high";
          }
        } else if (kmRemaining <= 1000 && !alertType) {
          alertType = "upcoming";
          priority = "medium";
        }
      }

      if (alertType) {
        alerts.push({
          id: `alert-${schedule.id}`,
          vehicleId: schedule.vehicleId || "",
          type: alertType,
          maintenanceType: schedule.type || "preventive",
          description: schedule.description || schedule.name || "Mantenimiento programado",
          dueDate: schedule.nextMaintenanceDate,
          dueKilometers: schedule.nextMaintenanceOdometer,
          currentKilometers: odometer,
          daysRemaining,
          kmRemaining,
          priority,
          scheduleId: schedule.id,
        });
      }
    }

    // Alertas de mantenimientos vencidos
    const overdueRecords = records.filter(r => r.status === "overdue");
    for (const record of overdueRecords) {
      alerts.push({
        id: `alert-record-${record.id}`,
        vehicleId: record.vehicleId || "",
        type: "overdue",
        maintenanceType: record.type,
        description: record.description || "Mantenimiento vencido",
        dueDate: record.scheduledDate,
        priority: "high",
      });
    }

    // Ordenar por prioridad
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return alerts;
  }, []);

  /**
   * Calcula estadísticas
   */
  const calculateStats = useCallback((records: MaintenanceRecord[]): VehicleMaintenanceStats => {
    const completed = records.filter(r => r.status === "completed");
    const inProgress = records.filter(r => r.status === "in_progress").length;
    const scheduled = records.filter(r => r.status === "scheduled").length;
    const overdue = records.filter(r => r.status === "overdue").length;

    const totalCost = completed.reduce((sum, r) => sum + (r.totalActualCost || 0), 0);
    const totalDowntimeHours = records.reduce((sum, r) => sum + (r.downtimeHours || 0), 0);

    const lastCompleted = completed
      .filter(r => r.completionDate)
      .sort((a, b) => new Date(b.completionDate!).getTime() - new Date(a.completionDate!).getTime())[0];

    const nextScheduled = records
      .filter(r => r.status === "scheduled" && r.scheduledDate)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

    return {
      totalMaintenances: records.length,
      completed: completed.length,
      inProgress,
      scheduled,
      overdue,
      totalCost,
      avgCost: completed.length > 0 ? Math.round((totalCost / completed.length) * 100) / 100 : 0,
      totalDowntimeHours,
      lastMaintenanceDate: lastCompleted?.completionDate || null,
      nextScheduledDate: nextScheduled?.scheduledDate || null,
    };
  }, []);

  /**
   * Carga los datos de mantenimiento
   */
  const loadMaintenanceData = useCallback(async () => {
    if (!vehicleId) {
      setState(prev => ({
        ...prev,
        records: [],
        schedules: [],
        stats: defaultStats,
        alerts: [],
        isLoading: false,
        error: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Cargar registros y programaciones en paralelo
      const [records, schedules] = await Promise.all([
        maintenanceService.getMaintenanceByVehicle(vehicleId),
        maintenanceService.getSchedulesByVehicle(vehicleId),
      ]);

      // Aplicar filtros a los registros
      let filteredRecords = records;
      if (filters.type) {
        filteredRecords = filteredRecords.filter(r => r.type === filters.type);
      }
      if (filters.status) {
        filteredRecords = filteredRecords.filter(r => r.status === filters.status);
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        filteredRecords = filteredRecords.filter(r => {
          const date = r.scheduledDate || r.createdAt;
          return date && new Date(date) >= start;
        });
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        filteredRecords = filteredRecords.filter(r => {
          const date = r.scheduledDate || r.createdAt;
          return date && new Date(date) <= end;
        });
      }

      // Calcular estadísticas y alertas
      const stats = calculateStats(records);
      const alerts = calculateAlerts(schedules, records, currentOdometer);

      setState({
        records: filteredRecords,
        schedules,
        stats,
        alerts,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar mantenimientos";
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error("[useVehicleMaintenance] Error:", err);
    }
  }, [vehicleId, filters, currentOdometer, calculateStats, calculateAlerts]);

  // Cargar datos al montar o cuando cambien las dependencias
  useEffect(() => {
    loadMaintenanceData();
  }, [loadMaintenanceData]);

  /**
   * Aplica filtros
   */
  const applyFilters = useCallback((newFilters: MaintenanceHistoryFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  /**
   * Recarga los datos
   */
  const refresh = useCallback(async () => {
    await loadMaintenanceData();
  }, [loadMaintenanceData]);

  /**
   * Crea un nuevo mantenimiento
   */
  const createMaintenance = useCallback(async (
    data: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<MaintenanceRecord> => {
    const result = await maintenanceService.createMaintenance(data);
    await loadMaintenanceData();
    return result;
  }, [loadMaintenanceData]);

  /**
   * Inicia un mantenimiento
   */
  const startMaintenance = useCallback(async (id: string): Promise<MaintenanceRecord> => {
    const result = await maintenanceService.updateMaintenance(id, {
      status: "in_progress",
      startDate: new Date().toISOString(),
    });
    await loadMaintenanceData();
    return result;
  }, [loadMaintenanceData]);

  /**
   * Completa un mantenimiento
   */
  const completeMaintenance = useCallback(async (
    id: string,
    data: CompletionData
  ): Promise<MaintenanceRecord> => {
    const result = await maintenanceService.completeMaintenance(id, data);
    await loadMaintenanceData();
    return result;
  }, [loadMaintenanceData]);

  /**
   * Cancela un mantenimiento
   */
  const cancelMaintenance = useCallback(async (
    id: string,
    reason: string
  ): Promise<MaintenanceRecord> => {
    const result = await maintenanceService.cancelMaintenance(id, reason);
    await loadMaintenanceData();
    return result;
  }, [loadMaintenanceData]);

  const activeMaintenances = useMemo(() => {
    return state.records.filter(r => r.status === "in_progress");
  }, [state.records]);

  const pendingMaintenances = useMemo(() => {
    return state.records.filter(r => r.status === "scheduled");
  }, [state.records]);

  // Tiene mantenimiento activo
  const hasActiveMaintenance = useMemo(() => {
    return activeMaintenances.length > 0;
  }, [activeMaintenances]);

  // Tiene alertas críticas
  const hasCriticalAlerts = useMemo(() => {
    return state.alerts.some(a => a.priority === "critical" || a.priority === "high");
  }, [state.alerts]);

  // Próximo mantenimiento
  const nextMaintenance = useMemo(() => {
    if (state.schedules.length === 0) return null;
    
    const activeSchedules = state.schedules.filter(s => s.isActive && s.nextMaintenanceDate);
    if (activeSchedules.length === 0) return null;

    return activeSchedules.sort((a, b) => 
      new Date(a.nextMaintenanceDate!).getTime() - new Date(b.nextMaintenanceDate!).getTime()
    )[0];
  }, [state.schedules]);

  // Vehículo disponible (no tiene mantenimiento en progreso)
  const isVehicleAvailable = useMemo(() => {
    return !hasActiveMaintenance;
  }, [hasActiveMaintenance]);

  return {
    records: state.records,
    schedules: state.schedules,
    stats: state.stats,
    alerts: state.alerts,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    applyFilters,
    filters,
    createMaintenance,
    startMaintenance,
    completeMaintenance,
    cancelMaintenance,
    activeMaintenances,
    pendingMaintenances,
    hasActiveMaintenance,
    hasCriticalAlerts,
    nextMaintenance,
    isVehicleAvailable,
  };
}

export default useVehicleMaintenance;
