import {
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceType,
  MaintenanceStatus,
} from "@/types/models/vehicle";

import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { tmsEventBus } from "@/services/integration/event-bus.service";

/**
 * @deprecated 2026-05-03 — Este service usa endpoints inventados que NO están
 * en el Excel oficial del backend (verificado: la mayoría devuelven 404 en
 * producción). Hay un service correcto en `@/services/maintenance/maintenance.service`
 * que SÍ está alineado al Excel.
 *
 * Plan de migración pendiente:
 *  - Hook `useVehicleMaintenance.ts` consume este service. Migrarlo a
 *    `maintenanceService` de `@/services/maintenance/maintenance.service`.
 *  - Una vez migrado, borrar este archivo.
 *
 * Mientras tanto, los métodos siguen funcionando pero la mayoría devolverán
 * 404 porque el backend nunca implementó esos paths. Por eso cada método
 * captura el error y devuelve un valor seguro (vacío) para que la UI no
 * crashee.
 */


/**
 * Estadísticas de mantenimiento
 */
export interface MaintenanceStats {
  totalMaintenances: number;
  completedThisMonth: number;
  pendingMaintenances: number;
  overdueMaintenances: number;
  totalCostThisMonth: number;
  totalCostThisYear: number;
  averageMaintenanceCost: number;
  vehiclesInMaintenance: number;
}

/**
 * Filtros para mantenimientos
 */
export interface MaintenanceFilters {
  vehicleId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  dateFrom?: string;
  dateTo?: string;
  workshopId?: string;
  minCost?: number;
  maxCost?: number;
}

/**
 * Talleres autorizados
 */
export const AUTHORIZED_WORKSHOPS = [
  { id: "ws-001", name: "Taller Central Navitel", address: "Av. Colonial 1234, Lima", phone: "01-4567890", specialties: ["all"] },
  { id: "ws-002", name: "AutoService Premium", address: "Av. Arequipa 567, Lima", phone: "01-3456789", specialties: ["engine", "transmission"] },
  { id: "ws-003", name: "LlanterPro", address: "Av. Venezuela 890, Lima", phone: "01-2345678", specialties: ["tires", "brakes"] },
  { id: "ws-004", name: "ElectroAuto", address: "Av. La Marina 123, Lima", phone: "01-8765432", specialties: ["electrical"] },
  { id: "ws-005", name: "Concesionario Volvo", address: "Av. Javier Prado 456, Lima", phone: "01-9876543", specialties: ["official_service"] },
];

/**
 * Categorías de trabajos de mantenimiento
 */
export const MAINTENANCE_CATEGORIES = {
  engine: { label: "Motor", icon: "🔧" },
  transmission: { label: "Transmisión", icon: "⚙️" },
  brakes: { label: "Frenos", icon: "🛞" },
  suspension: { label: "Suspensión", icon: "🔩" },
  electrical: { label: "Sistema Eléctrico", icon: "⚡" },
  tires: { label: "Neumáticos", icon: "🔘" },
  body: { label: "Carrocería", icon: "🚛" },
  ac: { label: "Aire Acondicionado", icon: "❄️" },
  fluids: { label: "Fluidos", icon: "💧" },
  filters: { label: "Filtros", icon: "🗂️" },
  other: { label: "Otros", icon: "📦" },
};

/**
 * Tipo para trabajos preventivos comunes (catálogo)
 */
export interface PreventiveWorkCatalogItem {
  id: string;
  description: string;
  category: string;
  estimatedCost: number;
  estimatedHours: number;
}

/**
 * Trabajos comunes de mantenimiento preventivo
 */
export const COMMON_PREVENTIVE_WORKS: PreventiveWorkCatalogItem[] = [
  { id: "pw-001", description: "Cambio de aceite de motor", category: "fluids", estimatedCost: 350, estimatedHours: 1 },
  { id: "pw-002", description: "Cambio de filtro de aceite", category: "filters", estimatedCost: 80, estimatedHours: 0.5 },
  { id: "pw-003", description: "Cambio de filtro de aire", category: "filters", estimatedCost: 120, estimatedHours: 0.5 },
  { id: "pw-004", description: "Cambio de filtro de combustible", category: "filters", estimatedCost: 150, estimatedHours: 0.5 },
  { id: "pw-005", description: "Revisión de frenos", category: "brakes", estimatedCost: 200, estimatedHours: 1 },
  { id: "pw-006", description: "Rotación de neumáticos", category: "tires", estimatedCost: 100, estimatedHours: 1 },
  { id: "pw-007", description: "Alineación y balanceo", category: "tires", estimatedCost: 180, estimatedHours: 1.5 },
  { id: "pw-008", description: "Cambio de líquido de frenos", category: "fluids", estimatedCost: 120, estimatedHours: 0.5 },
  { id: "pw-009", description: "Revisión de suspensión", category: "suspension", estimatedCost: 150, estimatedHours: 1 },
  { id: "pw-010", description: "Revisión del sistema eléctrico", category: "electrical", estimatedCost: 200, estimatedHours: 1 },
];


class MaintenanceService {
  constructor() {}

  /* --- REGISTROS DE MANTENIMIENTO --- */

  /**
   * Obtiene todos los mantenimientos de un vehículo
   */
  async getMaintenanceByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
    return apiClient.get<MaintenanceRecord[]>(`${API_ENDPOINTS.master.maintenance}/by-vehicle/${vehicleId}`);
  }

  /**
   * Obtiene todos los mantenimientos con filtros
   */
  async getAllMaintenances(filters?: MaintenanceFilters): Promise<MaintenanceRecord[]> {
    return apiClient.get<MaintenanceRecord[]>(API_ENDPOINTS.master.maintenance, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene un mantenimiento por ID
   */
  async getMaintenanceById(id: string): Promise<MaintenanceRecord | null> {
    return apiClient.get<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}`);
  }

  /**
   * Crea un nuevo registro de mantenimiento
   */
  async createMaintenance(
    data: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<MaintenanceRecord> {
    const newMaintenance = await apiClient.post<MaintenanceRecord>(API_ENDPOINTS.master.maintenance, data);

    // Publicar evento de mantenimiento iniciado
    if (newMaintenance.status === 'in_progress') {
      tmsEventBus.publish('maintenance:started', {
        maintenanceId: newMaintenance.id,
        vehicleId: newMaintenance.vehicleId || '',
        vehiclePlate: '',
        maintenanceType: newMaintenance.type,
      }, 'master-maintenance-service');
    }

    return newMaintenance;
  }

  /**
   * Actualiza un mantenimiento
   */
  async updateMaintenance(
    id: string,
    data: Partial<MaintenanceRecord>
  ): Promise<MaintenanceRecord> {
    return apiClient.put<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}`, data);
  }

  /**
   * Completa un mantenimiento
   */
  async completeMaintenance(
    id: string,
    completionData: {
      completionDate: string;
      totalActualCost: number;
      invoiceNumber?: string;
      invoiceFileUrl?: string;
      notes?: string;
      nextMaintenanceDate?: string;
      nextMaintenanceOdometer?: number;
    }
  ): Promise<MaintenanceRecord> {
    const updated = await apiClient.post<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}/complete`, completionData);

    // Publicar evento de mantenimiento completado
    tmsEventBus.publish('maintenance:completed', {
      maintenanceId: id,
      vehicleId: updated.vehicleId || '',
      vehiclePlate: '',
      maintenanceType: updated.type,
    }, 'master-maintenance-service');

    return updated;
  }

  /**
   * Cancela un mantenimiento
   */
  async cancelMaintenance(id: string, reason: string): Promise<MaintenanceRecord> {
    return apiClient.post<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}/cancel`, { reason });
  }

  /**
   * Elimina un mantenimiento
   */
  async deleteMaintenance(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.master.maintenance}/${id}`);
  }

  /* --- PROGRAMACIÓN DE MANTENIMIENTOS --- */

  /**
   * Obtiene programaciones de mantenimiento de un vehículo
   */
  async getSchedulesByVehicle(vehicleId: string): Promise<MaintenanceSchedule[]> {
    return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/schedules/by-vehicle/${vehicleId}`);
  }

  /**
   * Crea una programación de mantenimiento
   */
  async createSchedule(
    data: Omit<MaintenanceSchedule, "id">
  ): Promise<MaintenanceSchedule> {
    return apiClient.post<MaintenanceSchedule>(`${API_ENDPOINTS.master.maintenance}/schedules`, data);
  }

  /**
   * Actualiza una programación
   */
  async updateSchedule(
    id: string,
    data: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    return apiClient.put<MaintenanceSchedule>(`${API_ENDPOINTS.master.maintenance}/schedules/${id}`, data);
  }

  /**
   * Elimina una programación
   */
  async deleteSchedule(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.master.maintenance}/schedules/${id}`);
  }

  /* --- ESTADÍSTICAS Y REPORTES --- */

  /**
   * Obtiene estadísticas de mantenimiento
   */
  async getMaintenanceStats(): Promise<MaintenanceStats> {
    // BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes.
    // Adicionalmente /master/maintenance puede no estar implementado todavía.
    try {
      return await apiClient.get<MaintenanceStats>(`${API_ENDPOINTS.master.maintenance}/stats`);
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        console.warn("[maintenanceService.getMaintenanceStats] backend 404. Retornando stats vacios.");
        return {
          totalMaintenances: 0,
          completedThisMonth: 0,
          pendingMaintenances: 0,
          overdueMaintenances: 0,
          totalCostThisMonth: 0,
          totalCostThisYear: 0,
          averageMaintenanceCost: 0,
          vehiclesInMaintenance: 0,
        } as MaintenanceStats;
      }
      throw err;
    }
  }

  /**
   * Obtiene mantenimientos próximos
   */
  async getUpcomingMaintenances(daysAhead: number = 30): Promise<MaintenanceSchedule[]> {
    return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/upcoming`, { params: daysAhead ? { daysAhead } : undefined });
  }

  /**
   * Obtiene mantenimientos vencidos
   */
  async getOverdueMaintenances(): Promise<MaintenanceSchedule[]> {
    return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/overdue`);
  }

  /**
   * Calcula costos por vehículo
   */
  async getCostsByVehicle(vehicleId: string, year?: number): Promise<{
    total: number;
    byMonth: { month: string; cost: number }[];
    byType: { type: MaintenanceType; cost: number }[];
  }> {
    return apiClient.get<{ total: number; byMonth: { month: string; cost: number }[]; byType: { type: MaintenanceType; cost: number }[] }>(`${API_ENDPOINTS.master.maintenance}/costs/by-vehicle/${vehicleId}`, { params: year ? { year } : undefined });
  }

  /* --- CATÁLOGOS --- */

  /**
   * Obtiene lista de talleres autorizados
   */
  getAuthorizedWorkshops() {
    return AUTHORIZED_WORKSHOPS;
  }

  /**
   * Obtiene categorías de mantenimiento
   */
  getMaintenanceCategories() {
    return MAINTENANCE_CATEGORIES;
  }

  /**
   * Obtiene trabajos preventivos comunes
   */
  getCommonPreventiveWorks() {
    return COMMON_PREVENTIVE_WORKS;
  }
}

/** Instancia singleton del servicio */
export const maintenanceService = new MaintenanceService();
