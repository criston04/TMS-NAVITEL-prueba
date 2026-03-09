import {
  MaintenanceRecord,
  MaintenanceSchedule,
  MaintenanceType,
  MaintenanceStatus,
} from "@/types/models/vehicle";

import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { tmsEventBus } from "@/services/integration/event-bus.service";


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


const maintenanceRecordsMock: MaintenanceRecord[] = [
  {
    id: "maint-001",
    vehicleId: "v001",
    type: "preventive",
    status: "completed",
    scheduledDate: "2025-06-01",
    startDate: "2025-06-01",
    completionDate: "2025-06-01",
    workshopName: "Taller Central Navitel",
    workshopAddress: "Av. Colonial 1234, Lima",
    technicianName: "José Pérez",
    odometerAtService: 45000,
    workItems: [
      { id: "wi-001", description: "Cambio de aceite de motor", category: "fluids", estimatedCost: 350, actualCost: 350, status: "completed" },
      { id: "wi-002", description: "Cambio de filtro de aceite", category: "filters", estimatedCost: 80, actualCost: 80, status: "completed" },
      { id: "wi-003", description: "Cambio de filtro de aire", category: "filters", estimatedCost: 120, actualCost: 120, status: "completed" },
    ],
    totalEstimatedCost: 550,
    totalActualCost: 550,
    invoiceNumber: "F001-12345",
    invoiceFileUrl: "/documents/maintenance/inv-001.pdf",
    notes: "Mantenimiento preventivo de 45,000 km completado sin novedades",
    nextMaintenanceDate: "2025-09-01",
    nextMaintenanceOdometer: 50000,
    createdAt: "2025-06-01T08:00:00Z",
    updatedAt: "2025-06-01T14:00:00Z",
  },
  {
    id: "maint-002",
    vehicleId: "v002",
    type: "corrective",
    status: "in_progress",
    scheduledDate: "2025-07-10",
    startDate: "2025-07-10",
    workshopName: "AutoService Premium",
    workshopAddress: "Av. Arequipa 567, Lima",
    technicianName: "Carlos Mendoza",
    odometerAtService: 78500,
    workItems: [
      { id: "wi-004", description: "Reparación de fuga de aceite", category: "engine", estimatedCost: 1200, status: "in_progress" },
      { id: "wi-005", description: "Cambio de empaque de tapa de válvulas", category: "engine", estimatedCost: 800, status: "pending" },
    ],
    totalEstimatedCost: 2000,
    notes: "Vehículo presentó fuga de aceite en motor",
    createdAt: "2025-07-10T09:00:00Z",
    updatedAt: "2025-07-10T12:00:00Z",
  },
];

const maintenanceSchedulesMock: MaintenanceSchedule[] = [
  {
    id: "sched-001",
    vehicleId: "v001",
    type: "oil_change",
    description: "Cambio de aceite cada 5,000 km o 3 meses",
    intervalKm: 5000,
    intervalDays: 90,
    lastMaintenanceDate: "2025-06-01",
    lastMaintenanceOdometer: 45000,
    nextMaintenanceDate: "2025-09-01",
    nextMaintenanceOdometer: 50000,
    isActive: true,
    estimatedCost: 450,
    workItems: ["Cambio de aceite", "Cambio de filtro de aceite"],
  },
  {
    id: "sched-002",
    vehicleId: "v001",
    type: "full_service",
    description: "Servicio completo cada 20,000 km",
    intervalKm: 20000,
    lastMaintenanceDate: "2025-03-01",
    lastMaintenanceOdometer: 40000,
    nextMaintenanceDate: "2025-11-01",
    nextMaintenanceOdometer: 60000,
    isActive: true,
    estimatedCost: 2500,
    workItems: ["Revisión completa de motor", "Cambio de filtros", "Revisión de frenos", "Revisión de suspensión"],
  },
  {
    id: "sched-003",
    vehicleId: "v002",
    type: "tire_rotation",
    description: "Rotación de neumáticos cada 10,000 km",
    intervalKm: 10000,
    lastMaintenanceDate: "2025-05-15",
    lastMaintenanceOdometer: 75000,
    nextMaintenanceDate: "2025-08-15",
    nextMaintenanceOdometer: 85000,
    isActive: true,
    estimatedCost: 150,
    workItems: ["Rotación de neumáticos", "Revisión de presión"],
  },
];


class MaintenanceService {
  private readonly useMocks: boolean;
  private maintenanceRecords = [...maintenanceRecordsMock];
  private maintenanceSchedules = [...maintenanceSchedulesMock];

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red
   */
  private async simulateDelay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera ID único
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}`;
  }

  /* --- REGISTROS DE MANTENIMIENTO --- */

  /**
   * Obtiene todos los mantenimientos de un vehículo
   */
  async getMaintenanceByVehicle(vehicleId: string): Promise<MaintenanceRecord[]> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceRecord[]>(`${API_ENDPOINTS.master.maintenance}/by-vehicle/${vehicleId}`);
    }

    await this.simulateDelay();
    return this.maintenanceRecords.filter(m => m.vehicleId === vehicleId);
  }

  /**
   * Obtiene todos los mantenimientos con filtros
   */
  async getAllMaintenances(filters?: MaintenanceFilters): Promise<MaintenanceRecord[]> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceRecord[]>(API_ENDPOINTS.master.maintenance, { params: filters as unknown as Record<string, string> });
    }

    await this.simulateDelay();
    
    let results = [...this.maintenanceRecords];

    if (filters) {
      if (filters.vehicleId) {
        results = results.filter(m => m.vehicleId === filters.vehicleId);
      }
      if (filters.type) {
        results = results.filter(m => m.type === filters.type);
      }
      if (filters.status) {
        results = results.filter(m => m.status === filters.status);
      }
      if (filters.dateFrom) {
        results = results.filter(m => m.scheduledDate && m.scheduledDate >= filters.dateFrom!);
      }
      if (filters.dateTo) {
        results = results.filter(m => m.scheduledDate && m.scheduledDate <= filters.dateTo!);
      }
    }

    return results;
  }

  /**
   * Obtiene un mantenimiento por ID
   */
  async getMaintenanceById(id: string): Promise<MaintenanceRecord | null> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}`);
    }

    await this.simulateDelay();
    return this.maintenanceRecords.find(m => m.id === id) || null;
  }

  /**
   * Crea un nuevo registro de mantenimiento
   */
  async createMaintenance(
    data: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<MaintenanceRecord> {
    if (!this.useMocks) {
      return apiClient.post<MaintenanceRecord>(API_ENDPOINTS.master.maintenance, data);
    }

    await this.simulateDelay(500);
    
    const newMaintenance: MaintenanceRecord = {
      ...data,
      id: this.generateId("maint"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.maintenanceRecords.push(newMaintenance);

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
    if (!this.useMocks) {
      return apiClient.put<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}`, data);
    }

    await this.simulateDelay(400);
    
    const index = this.maintenanceRecords.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Mantenimiento con ID ${id} no encontrado`);
    }

    this.maintenanceRecords[index] = {
      ...this.maintenanceRecords[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return this.maintenanceRecords[index];
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
    if (!this.useMocks) {
      return apiClient.post<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}/complete`, completionData);
    }

    await this.simulateDelay(500);
    
    const index = this.maintenanceRecords.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Mantenimiento con ID ${id} no encontrado`);
    }

    // Marcar todos los work items como completados
    const currentWorkItems = this.maintenanceRecords[index].workItems ?? [];
    const updatedWorkItems = currentWorkItems.map(item => ({
      ...item,
      status: "completed" as const,
      actualCost: item.actualCost || item.estimatedCost,
    }));

    this.maintenanceRecords[index] = {
      ...this.maintenanceRecords[index],
      status: "completed",
      completionDate: completionData.completionDate,
      totalActualCost: completionData.totalActualCost,
      invoiceNumber: completionData.invoiceNumber,
      invoiceFileUrl: completionData.invoiceFileUrl,
      notes: completionData.notes || this.maintenanceRecords[index].notes,
      nextMaintenanceDate: completionData.nextMaintenanceDate,
      nextMaintenanceOdometer: completionData.nextMaintenanceOdometer,
      workItems: updatedWorkItems,
      updatedAt: new Date().toISOString(),
    };

    // Publicar evento de mantenimiento completado
    tmsEventBus.publish('maintenance:completed', {
      maintenanceId: id,
      vehicleId: this.maintenanceRecords[index].vehicleId || '',
      vehiclePlate: '',
      maintenanceType: this.maintenanceRecords[index].type,
    }, 'master-maintenance-service');

    return this.maintenanceRecords[index];
  }

  /**
   * Cancela un mantenimiento
   */
  async cancelMaintenance(id: string, reason: string): Promise<MaintenanceRecord> {
    if (!this.useMocks) {
      return apiClient.post<MaintenanceRecord>(`${API_ENDPOINTS.master.maintenance}/${id}/cancel`, { reason });
    }

    await this.simulateDelay(400);
    
    const index = this.maintenanceRecords.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Mantenimiento con ID ${id} no encontrado`);
    }

    this.maintenanceRecords[index] = {
      ...this.maintenanceRecords[index],
      status: "cancelled",
      notes: `${this.maintenanceRecords[index].notes || ""}\n[CANCELADO]: ${reason}`,
      updatedAt: new Date().toISOString(),
    };

    return this.maintenanceRecords[index];
  }

  /**
   * Elimina un mantenimiento
   */
  async deleteMaintenance(id: string): Promise<void> {
    if (!this.useMocks) {
      await apiClient.delete(`${API_ENDPOINTS.master.maintenance}/${id}`);
      return;
    }

    await this.simulateDelay(300);
    
    const index = this.maintenanceRecords.findIndex(m => m.id === id);
    if (index === -1) {
      throw new Error(`Mantenimiento con ID ${id} no encontrado`);
    }

    this.maintenanceRecords.splice(index, 1);
  }

  /* --- PROGRAMACIÓN DE MANTENIMIENTOS --- */

  /**
   * Obtiene programaciones de mantenimiento de un vehículo
   */
  async getSchedulesByVehicle(vehicleId: string): Promise<MaintenanceSchedule[]> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/schedules/by-vehicle/${vehicleId}`);
    }

    await this.simulateDelay();
    return this.maintenanceSchedules.filter(s => s.vehicleId === vehicleId);
  }

  /**
   * Crea una programación de mantenimiento
   */
  async createSchedule(
    data: Omit<MaintenanceSchedule, "id">
  ): Promise<MaintenanceSchedule> {
    if (!this.useMocks) {
      return apiClient.post<MaintenanceSchedule>(`${API_ENDPOINTS.master.maintenance}/schedules`, data);
    }

    await this.simulateDelay(500);
    
    const newSchedule: MaintenanceSchedule = {
      ...data,
      id: this.generateId("sched"),
    };

    this.maintenanceSchedules.push(newSchedule);
    return newSchedule;
  }

  /**
   * Actualiza una programación
   */
  async updateSchedule(
    id: string,
    data: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    if (!this.useMocks) {
      return apiClient.put<MaintenanceSchedule>(`${API_ENDPOINTS.master.maintenance}/schedules/${id}`, data);
    }

    await this.simulateDelay(400);
    
    const index = this.maintenanceSchedules.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Programación con ID ${id} no encontrada`);
    }

    this.maintenanceSchedules[index] = { ...this.maintenanceSchedules[index], ...data };
    return this.maintenanceSchedules[index];
  }

  /**
   * Elimina una programación
   */
  async deleteSchedule(id: string): Promise<void> {
    if (!this.useMocks) {
      await apiClient.delete(`${API_ENDPOINTS.master.maintenance}/schedules/${id}`);
      return;
    }

    await this.simulateDelay(300);
    
    const index = this.maintenanceSchedules.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Programación con ID ${id} no encontrada`);
    }

    this.maintenanceSchedules.splice(index, 1);
  }

  /* --- ESTADÍSTICAS Y REPORTES --- */

  /**
   * Obtiene estadísticas de mantenimiento
   */
  async getMaintenanceStats(): Promise<MaintenanceStats> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceStats>(`${API_ENDPOINTS.master.maintenance}/stats`);
    }

    await this.simulateDelay();
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    const completedThisMonth = this.maintenanceRecords.filter(
      m => m.status === "completed" && 
           m.completionDate && 
           new Date(m.completionDate) >= firstDayOfMonth
    );

    const allCompletedThisYear = this.maintenanceRecords.filter(
      m => m.status === "completed" && 
           m.completionDate && 
           new Date(m.completionDate) >= firstDayOfYear
    );

    const pendingMaintenances = this.maintenanceRecords.filter(
      m => m.status === "scheduled" || m.status === "in_progress"
    );

    const overdueSchedules = this.maintenanceSchedules.filter(s => {
      if (!s.nextMaintenanceDate) return false;
      return new Date(s.nextMaintenanceDate) < today && s.isActive;
    });

    const vehiclesInMaintenance = new Set(
      this.maintenanceRecords
        .filter(m => m.status === "in_progress")
        .map(m => m.vehicleId)
    ).size;

    const totalCostThisMonth = completedThisMonth.reduce(
      (sum, m) => sum + (m.totalActualCost || 0), 
      0
    );

    const totalCostThisYear = allCompletedThisYear.reduce(
      (sum, m) => sum + (m.totalActualCost || 0), 
      0
    );

    const allCompleted = this.maintenanceRecords.filter(m => m.status === "completed");
    const averageMaintenanceCost = allCompleted.length > 0
      ? allCompleted.reduce((sum, m) => sum + (m.totalActualCost || 0), 0) / allCompleted.length
      : 0;

    return {
      totalMaintenances: this.maintenanceRecords.length,
      completedThisMonth: completedThisMonth.length,
      pendingMaintenances: pendingMaintenances.length,
      overdueMaintenances: overdueSchedules.length,
      totalCostThisMonth,
      totalCostThisYear,
      averageMaintenanceCost: Math.round(averageMaintenanceCost),
      vehiclesInMaintenance,
    };
  }

  /**
   * Obtiene mantenimientos próximos
   */
  async getUpcomingMaintenances(daysAhead: number = 30): Promise<MaintenanceSchedule[]> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/upcoming`, { params: daysAhead ? { daysAhead } : undefined });
    }

    await this.simulateDelay();
    
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.maintenanceSchedules.filter(s => {
      if (!s.nextMaintenanceDate || !s.isActive) return false;
      const nextDate = new Date(s.nextMaintenanceDate);
      return nextDate >= today && nextDate <= futureDate;
    });
  }

  /**
   * Obtiene mantenimientos vencidos
   */
  async getOverdueMaintenances(): Promise<MaintenanceSchedule[]> {
    if (!this.useMocks) {
      return apiClient.get<MaintenanceSchedule[]>(`${API_ENDPOINTS.master.maintenance}/overdue`);
    }

    await this.simulateDelay();
    
    const today = new Date();

    return this.maintenanceSchedules.filter(s => {
      if (!s.nextMaintenanceDate || !s.isActive) return false;
      return new Date(s.nextMaintenanceDate) < today;
    });
  }

  /**
   * Calcula costos por vehículo
   */
  async getCostsByVehicle(vehicleId: string, year?: number): Promise<{
    total: number;
    byMonth: { month: string; cost: number }[];
    byType: { type: MaintenanceType; cost: number }[];
  }> {
    if (!this.useMocks) {
      return apiClient.get<{ total: number; byMonth: { month: string; cost: number }[]; byType: { type: MaintenanceType; cost: number }[] }>(`${API_ENDPOINTS.master.maintenance}/costs/by-vehicle/${vehicleId}`, { params: year ? { year } : undefined });
    }

    await this.simulateDelay();
    
    const targetYear = year || new Date().getFullYear();
    const vehicleMaintenances = this.maintenanceRecords.filter(
      m => m.vehicleId === vehicleId && 
           m.status === "completed" &&
           m.completionDate &&
           new Date(m.completionDate).getFullYear() === targetYear
    );

    const total = vehicleMaintenances.reduce(
      (sum, m) => sum + (m.totalActualCost || 0), 
      0
    );

    // Costos por mes
    const byMonth: { month: string; cost: number }[] = [];
    for (let month = 0; month < 12; month++) {
      const monthMaintenances = vehicleMaintenances.filter(m => {
        const date = new Date(m.completionDate!);
        return date.getMonth() === month;
      });
      const cost = monthMaintenances.reduce(
        (sum, m) => sum + (m.totalActualCost || 0), 
        0
      );
      byMonth.push({
        month: new Date(targetYear, month).toLocaleString("es-PE", { month: "short" }),
        cost,
      });
    }

    // Costos por tipo
    const byType = (["preventive", "corrective", "predictive", "emergency"] as MaintenanceType[]).map(type => ({
      type,
      cost: vehicleMaintenances
        .filter(m => m.type === type)
        .reduce((sum, m) => sum + (m.totalActualCost || 0), 0),
    }));

    return { total, byMonth, byType };
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
