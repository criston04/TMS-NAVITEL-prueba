/**
 * @fileoverview Servicio de Mantenimiento de Flota
 *
 * Conecta contra `/api/v1/maintenance/*` del backend Rev3.
 *
 * Patrón defensivo:
 *  - GETs: si el endpoint devuelve 404 (no implementado todavía en backend),
 *    retornamos lista vacía / null. La UI muestra empty state en vez de crash.
 *  - Mutations (POST/PATCH/DELETE): propagan el error al caller. Si el endpoint
 *    no existe, el caller mostrará un toast con el mensaje del backend.
 */

import { apiClient } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api.config';
import { tmsEventBus } from '@/services/integration/event-bus.service';
import { snakeToCamel } from '@/lib/case-converter';
import type {
  MaintenanceVehicle,
  MaintenanceSchedule,
  Breakdown,
  WorkOrder,
  Workshop,
  Part,
  PartTransaction,
  Inspection,
  InspectionChecklist,
  Alert,
  MaintenanceMetrics,
  VehicleMaintenanceHistory,
  MaintenanceSettings,
} from '@/types/maintenance';

const ENDPOINTS = API_ENDPOINTS.maintenance;

/**
 * Helper: llama apiClient.get y devuelve fallback (típicamente []) si el
 * endpoint responde 404. Otros errores se propagan.
 */
async function getOrEmpty<T>(url: string, fallback: T, params?: Record<string, unknown>): Promise<T> {
  try {
    const res = await apiClient.get<unknown>(url, { params: params as Record<string, string> | undefined });
    // 2026-05-03 (UI bug fix): el backend de maintenance devuelve campos en
    // snake_case (`vehicle_id`, `created_at`, `work_order_id`, etc.). Aplicamos
    // snakeToCamel para que el frontend reciba camelCase como espera.
    // Aceptar shapes { items, data, meta } o array directo
    if (Array.isArray(res)) return snakeToCamel<T>(res);
    if (res && typeof res === 'object') {
      const obj = res as Record<string, unknown>;
      if (Array.isArray(obj.items)) return snakeToCamel<T>(obj.items);
      if (Array.isArray(obj.data)) return snakeToCamel<T>(obj.data);
      // Si fallback es array y no hay items/data, devolver fallback
      if (Array.isArray(fallback)) return fallback;
      // Si es objeto puro, devolverlo con conversion snake→camel
      return snakeToCamel<T>(res);
    }
    return fallback;
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return fallback;
    throw err;
  }
}

class MaintenanceService {
  // ==================== VEHÍCULOS ====================

  async getVehicles(filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<MaintenanceVehicle[]> {
    return getOrEmpty<MaintenanceVehicle[]>(ENDPOINTS.vehicles, [], filters as Record<string, unknown>);
  }

  async getVehicleById(id: string): Promise<MaintenanceVehicle | null> {
    return apiClient.getOptional<MaintenanceVehicle>(`${ENDPOINTS.vehicles}/${id}`);
  }

  async createVehicle(data: Omit<MaintenanceVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceVehicle> {
    return apiClient.post<MaintenanceVehicle>(ENDPOINTS.vehicles, data);
  }

  async updateVehicle(id: string, data: Partial<MaintenanceVehicle>): Promise<MaintenanceVehicle> {
    // 2026-05-03: cambiado PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<MaintenanceVehicle>(`${ENDPOINTS.vehicles}/${id}`, data);
  }

  async deleteVehicle(id: string): Promise<void> {
    await apiClient.delete(`${ENDPOINTS.vehicles}/${id}`);
  }

  async updateVehicleMileage(id: string, mileage: number): Promise<MaintenanceVehicle> {
    return this.updateVehicle(id, {
      currentMileage: mileage,
      lastMileageUpdate: new Date().toISOString(),
    });
  }

  // ==================== MANTENIMIENTO PREVENTIVO ====================

  async getMaintenanceSchedules(vehicleId?: string): Promise<MaintenanceSchedule[]> {
    return getOrEmpty<MaintenanceSchedule[]>(
      ENDPOINTS.schedules,
      [],
      vehicleId ? { vehicleId } : undefined
    );
  }

  async createMaintenanceSchedule(
    data: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenanceSchedule> {
    return apiClient.post<MaintenanceSchedule>(ENDPOINTS.schedules, data);
  }

  async updateMaintenanceSchedule(
    id: string,
    data: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<MaintenanceSchedule>(`${ENDPOINTS.schedules}/${id}`, data);
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    await apiClient.delete(`${ENDPOINTS.schedules}/${id}`);
  }

  // ==================== MANTENIMIENTO CORRECTIVO ====================

  async getBreakdowns(filters?: {
    vehicleId?: string;
    status?: string;
    severity?: string;
  }): Promise<Breakdown[]> {
    return getOrEmpty<Breakdown[]>(ENDPOINTS.breakdowns, [], filters as Record<string, unknown>);
  }

  async createBreakdown(
    data: Omit<Breakdown, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Breakdown> {
    return apiClient.post<Breakdown>(ENDPOINTS.breakdowns, data);
  }

  async updateBreakdown(id: string, data: Partial<Breakdown>): Promise<Breakdown> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<Breakdown>(`${ENDPOINTS.breakdowns}/${id}`, data);
  }

  // ==================== ÓRDENES DE TRABAJO ====================

  async getWorkOrders(filters?: {
    vehicleId?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<WorkOrder[]> {
    return getOrEmpty<WorkOrder[]>(ENDPOINTS.workOrders, [], filters as Record<string, unknown>);
  }

  async getWorkOrderById(id: string): Promise<WorkOrder | null> {
    return apiClient.getOptional<WorkOrder>(`${ENDPOINTS.workOrders}/${id}`);
  }

  async createWorkOrder(
    data: Omit<WorkOrder, 'id' | 'orderNumber' | 'createdDate' | 'updatedAt'>
  ): Promise<WorkOrder> {
    return apiClient.post<WorkOrder>(ENDPOINTS.workOrders, data);
  }

  async updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<WorkOrder>(`${ENDPOINTS.workOrders}/${id}`, data);
  }

  async completeWorkOrder(
    id: string,
    data: {
      workDone: string;
      actualCost: number;
      actualLaborHours: number;
      partsUsed: WorkOrder['partsUsed'];
      recommendations?: string;
    }
  ): Promise<WorkOrder> {
    const completed = await this.updateWorkOrder(id, {
      ...data,
      status: 'completed',
      completedDate: new Date().toISOString(),
    });

    // Publicar evento: vehículo sale de mantenimiento
    tmsEventBus.publish('maintenance:completed', {
      maintenanceId: id,
      vehicleId: completed.vehicleId,
      vehiclePlate: '',
      maintenanceType: completed.type || 'corrective',
      status: 'completed',
    }, 'maintenance-service');

    return completed;
  }

  // ==================== TALLERES ====================

  async getWorkshops(isActive?: boolean): Promise<Workshop[]> {
    return getOrEmpty<Workshop[]>(
      ENDPOINTS.workshops,
      [],
      typeof isActive === 'boolean' ? { isActive: String(isActive) } : undefined
    );
  }

  async createWorkshop(
    data: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'totalWorkOrders' | 'totalCost'>
  ): Promise<Workshop> {
    return apiClient.post<Workshop>(ENDPOINTS.workshops, data);
  }

  async updateWorkshop(id: string, data: Partial<Workshop>): Promise<Workshop> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<Workshop>(`${ENDPOINTS.workshops}/${id}`, data);
  }

  // ==================== REPUESTOS ====================

  async getParts(filters?: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  }): Promise<Part[]> {
    return getOrEmpty<Part[]>(ENDPOINTS.parts, [], filters as Record<string, unknown>);
  }

  async createPart(data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>): Promise<Part> {
    return apiClient.post<Part>(ENDPOINTS.parts, data);
  }

  async updatePart(id: string, data: Partial<Part>): Promise<Part> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    return apiClient.put<Part>(`${ENDPOINTS.parts}/${id}`, data);
  }

  /**
   * Lista transacciones de un repuesto.
   *
   * 2026-05-03: corregido. Excel oficial: GET /maintenance/parts/:id/transactions
   * (requiere :id). Antes el frontend usaba /maintenance/parts/transactions con
   * partId como query param, lo cual NO está en el Excel.
   *
   * Si no se provee partId, devolvemos [] sin llamar al backend (el endpoint
   * exige :id).
   */
  async getPartTransactions(partId?: string): Promise<PartTransaction[]> {
    if (!partId) {
      console.warn(
        "[maintenanceService.getPartTransactions] partId requerido " +
        "según Excel oficial. Devolviendo [] sin llamar al backend."
      );
      return [];
    }
    return getOrEmpty<PartTransaction[]>(
      `${ENDPOINTS.parts}/${partId}/transactions`,
      []
    );
  }

  // ==================== INSPECCIONES ====================

  async getInspections(filters?: {
    vehicleId?: string;
    type?: string;
    status?: string;
  }): Promise<Inspection[]> {
    return getOrEmpty<Inspection[]>(ENDPOINTS.inspections, [], filters as Record<string, unknown>);
  }

  async createInspection(
    data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Inspection> {
    return apiClient.post<Inspection>(ENDPOINTS.inspections, data);
  }

  /**
   * Lista checklists de una inspección.
   *
   * 2026-05-03: corregido. Excel oficial: GET /maintenance/inspections/:id/checklists
   * (requiere :id). Antes el frontend pegaba a /maintenance/inspections/checklists
   * con type como query, lo cual no está en el Excel.
   *
   * Cambio de signatura: ahora recibe inspectionId en lugar de type.
   * Si no se provee, devolvemos [] sin llamar al backend.
   */
  async getInspectionChecklists(inspectionId?: string): Promise<InspectionChecklist[]> {
    if (!inspectionId) {
      console.warn(
        "[maintenanceService.getInspectionChecklists] inspectionId requerido " +
        "según Excel oficial. Devolviendo [] sin llamar al backend."
      );
      return [];
    }
    return getOrEmpty<InspectionChecklist[]>(
      `${ENDPOINTS.inspections}/${inspectionId}/checklists`,
      []
    );
  }

  // ==================== ALERTAS ====================

  async getAlerts(filters?: {
    type?: string;
    severity?: string;
    unreadOnly?: boolean;
  }): Promise<Alert[]> {
    return getOrEmpty<Alert[]>(ENDPOINTS.alerts, [], filters as Record<string, unknown>);
  }

  async markAlertAsRead(id: string): Promise<void> {
    await apiClient.patch<void>(`${ENDPOINTS.alerts}/${id}/read`, {});
  }

  async dismissAlert(id: string): Promise<void> {
    await apiClient.patch<void>(`${ENDPOINTS.alerts}/${id}/dismiss`, {});
  }

  // ==================== MÉTRICAS Y REPORTES ====================

  async getMaintenanceMetrics(
    vehicleId?: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<MaintenanceMetrics> {
    const fallback = {
      totalVehicles: 0,
      vehiclesInMaintenance: 0,
      vehiclesOperational: 0,
      scheduledMaintenances: 0,
      overdueMaintenances: 0,
      upcomingMaintenances: 0,
      activeBreakdowns: 0,
      pendingWorkOrders: 0,
      inProgressWorkOrders: 0,
      completedWorkOrders: 0,
      totalMaintenanceCost: 0,
      averageRepairTime: 0,
      averageDowntime: 0,
      preventiveCompliance: 0,
      topFailures: [],
    } as unknown as MaintenanceMetrics;

    const params = {
      ...(vehicleId ? { vehicleId } : {}),
      ...(periodStart ? { periodStart } : {}),
      ...(periodEnd ? { periodEnd } : {}),
    };

    return getOrEmpty<MaintenanceMetrics>(ENDPOINTS.metrics, fallback, params);
  }

  async getVehicleHistory(vehicleId: string): Promise<VehicleMaintenanceHistory> {
    const fallback = {
      vehicleId,
      totalMaintenances: 0,
      totalCost: 0,
      averageCost: 0,
      lastMaintenanceDate: null,
      workOrders: [],
      breakdowns: [],
      inspections: [],
    } as unknown as VehicleMaintenanceHistory;

    return getOrEmpty<VehicleMaintenanceHistory>(
      `${ENDPOINTS.vehicles}/${vehicleId}/history`,
      fallback
    );
  }

  // ==================== CONFIGURACIÓN ====================

  async getSettings(): Promise<MaintenanceSettings> {
    const fallback = {
      alertDaysBefore: 7,
      alertKmBefore: 1000,
      autoCreateWorkOrder: false,
      notifyEmail: '',
      enableNotifications: true,
    } as unknown as MaintenanceSettings;

    return getOrEmpty<MaintenanceSettings>(ENDPOINTS.settings, fallback);
  }

  async updateSettings(data: Partial<MaintenanceSettings>): Promise<MaintenanceSettings> {
    // 2026-05-03: PATCH → PUT por alineación con Excel oficial.
    // Excel: PUT /api/v1/maintenance/settings (Upsert).
    return apiClient.put<MaintenanceSettings>(ENDPOINTS.settings, data);
  }
}

export const maintenanceService = new MaintenanceService();
export default maintenanceService;
