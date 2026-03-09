/**
 * @fileoverview Servicio de Mantenimiento de Flota
 * Gestión integral de mantenimiento vehicular
 */

import type {
  Vehicle,
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
import { tmsEventBus } from '@/services/integration/event-bus.service';

class MaintenanceService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  // ==================== VEHÍCULOS ====================

  async getVehicles(filters?: {
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Vehicle[]> {
    // TODO: Reemplazar con llamada real al backend
    const { mockVehicles } = await import('@/mocks/maintenance/vehicles');
    let vehicles = [...mockVehicles];

    if (filters?.status) {
      vehicles = vehicles.filter(v => v.status === filters.status);
    }
    if (filters?.type) {
      vehicles = vehicles.filter(v => v.type === filters.type);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      vehicles = vehicles.filter(v =>
        v.plate.toLowerCase().includes(search) ||
        v.brand.toLowerCase().includes(search) ||
        v.model.toLowerCase().includes(search)
      );
    }

    return vehicles;
  }

  async getVehicleById(id: string): Promise<Vehicle | null> {
    const { mockVehicles } = await import('@/mocks/maintenance/vehicles');
    return mockVehicles.find(v => v.id === id) || null;
  }

  async createVehicle(data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vehicle> {
    // TODO: Implementar llamada al backend
    const newVehicle: Vehicle = {
      ...data,
      id: `vehicle-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newVehicle;
  }

  async updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
    // TODO: Implementar llamada al backend
    const vehicle = await this.getVehicleById(id);
    if (!vehicle) throw new Error('Vehicle not found');
    
    return {
      ...vehicle,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteVehicle(id: string): Promise<void> {
    // TODO: Implementar llamada al backend
    console.log('Deleting vehicle:', id);
  }

  async updateVehicleMileage(id: string, mileage: number): Promise<Vehicle> {
    return this.updateVehicle(id, {
      currentMileage: mileage,
      lastMileageUpdate: new Date().toISOString(),
    });
  }

  // ==================== MANTENIMIENTO PREVENTIVO ====================

  async getMaintenanceSchedules(vehicleId?: string): Promise<MaintenanceSchedule[]> {
    const { mockMaintenanceSchedules } = await import('@/mocks/maintenance/schedules');
    if (vehicleId) {
      return mockMaintenanceSchedules.filter(s => s.vehicleId === vehicleId);
    }
    return mockMaintenanceSchedules;
  }

  async createMaintenanceSchedule(
    data: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MaintenanceSchedule> {
    const newSchedule: MaintenanceSchedule = {
      ...data,
      id: `schedule-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newSchedule;
  }

  async updateMaintenanceSchedule(
    id: string,
    data: Partial<MaintenanceSchedule>
  ): Promise<MaintenanceSchedule> {
    const { mockMaintenanceSchedules } = await import('@/mocks/maintenance/schedules');
    const schedule = mockMaintenanceSchedules.find(s => s.id === id);
    if (!schedule) throw new Error('Schedule not found');
    
    return {
      ...schedule,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  }

  async deleteMaintenanceSchedule(id: string): Promise<void> {
    console.log('Deleting schedule:', id);
  }

  // ==================== MANTENIMIENTO CORRECTIVO ====================

  async getBreakdowns(filters?: {
    vehicleId?: string;
    status?: string;
    severity?: string;
  }): Promise<Breakdown[]> {
    const { mockBreakdowns } = await import('@/mocks/maintenance/breakdowns');
    let breakdowns = [...mockBreakdowns];

    if (filters?.vehicleId) {
      breakdowns = breakdowns.filter(b => b.vehicleId === filters.vehicleId);
    }
    if (filters?.status) {
      breakdowns = breakdowns.filter(b => b.status === filters.status);
    }
    if (filters?.severity) {
      breakdowns = breakdowns.filter(b => b.severity === filters.severity);
    }

    return breakdowns;
  }

  async createBreakdown(
    data: Omit<Breakdown, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Breakdown> {
    const newBreakdown: Breakdown = {
      ...data,
      id: `breakdown-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newBreakdown;
  }

  async updateBreakdown(id: string, data: Partial<Breakdown>): Promise<Breakdown> {
    const { mockBreakdowns } = await import('@/mocks/maintenance/breakdowns');
    const breakdown = mockBreakdowns.find(b => b.id === id);
    if (!breakdown) throw new Error('Breakdown not found');
    
    return {
      ...breakdown,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  }

  // ==================== ÓRDENES DE TRABAJO ====================

  async getWorkOrders(filters?: {
    vehicleId?: string;
    status?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<WorkOrder[]> {
    const { mockWorkOrders } = await import('@/mocks/maintenance/work-orders');
    let workOrders = [...mockWorkOrders];

    if (filters?.vehicleId) {
      workOrders = workOrders.filter(w => w.vehicleId === filters.vehicleId);
    }
    if (filters?.status) {
      workOrders = workOrders.filter(w => w.status === filters.status);
    }
    if (filters?.type) {
      workOrders = workOrders.filter(w => w.type === filters.type);
    }

    return workOrders;
  }

  async getWorkOrderById(id: string): Promise<WorkOrder | null> {
    const { mockWorkOrders } = await import('@/mocks/maintenance/work-orders');
    return mockWorkOrders.find(w => w.id === id) || null;
  }

  async createWorkOrder(
    data: Omit<WorkOrder, 'id' | 'orderNumber' | 'createdDate' | 'updatedAt'>
  ): Promise<WorkOrder> {
    const orderNumber = `OT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const newWorkOrder: WorkOrder = {
      ...data,
      id: `work-order-${Date.now()}`,
      orderNumber,
      createdDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Publicar evento: vehículo entra en mantenimiento
    tmsEventBus.publish('maintenance:started', {
      maintenanceId: newWorkOrder.id,
      vehicleId: data.vehicleId,
      vehiclePlate: '',
      maintenanceType: data.type || 'corrective',
      status: 'in_progress',
      estimatedCompletion: data.scheduledDate,
    }, 'maintenance-service');

    return newWorkOrder;
  }

  async updateWorkOrder(id: string, data: Partial<WorkOrder>): Promise<WorkOrder> {
    const { mockWorkOrders } = await import('@/mocks/maintenance/work-orders');
    const workOrder = mockWorkOrders.find(w => w.id === id);
    if (!workOrder) throw new Error('Work order not found');
    
    return {
      ...workOrder,
      ...data,
      updatedAt: new Date().toISOString(),
    };
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
    const { mockWorkshops } = await import('@/mocks/maintenance/workshops');
    if (isActive !== undefined) {
      return mockWorkshops.filter(w => w.isActive === isActive);
    }
    return mockWorkshops;
  }

  async createWorkshop(
    data: Omit<Workshop, 'id' | 'createdAt' | 'updatedAt' | 'totalWorkOrders' | 'totalCost'>
  ): Promise<Workshop> {
    const newWorkshop: Workshop = {
      ...data,
      id: `workshop-${Date.now()}`,
      totalWorkOrders: 0,
      totalCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newWorkshop;
  }

  async updateWorkshop(id: string, data: Partial<Workshop>): Promise<Workshop> {
    const { mockWorkshops } = await import('@/mocks/maintenance/workshops');
    const workshop = mockWorkshops.find(w => w.id === id);
    if (!workshop) throw new Error('Workshop not found');
    
    return {
      ...workshop,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  }

  // ==================== REPUESTOS ====================

  async getParts(filters?: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  }): Promise<Part[]> {
    const { mockParts } = await import('@/mocks/maintenance/parts');
    let parts = [...mockParts];

    if (filters?.category) {
      parts = parts.filter(p => p.category === filters.category);
    }
    if (filters?.lowStock) {
      parts = parts.filter(p => p.currentStock <= p.minStock);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      parts = parts.filter(p =>
        p.name.toLowerCase().includes(search) ||
        p.partNumber.toLowerCase().includes(search)
      );
    }

    return parts;
  }

  async createPart(
    data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Part> {
    const newPart: Part = {
      ...data,
      id: `part-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newPart;
  }

  async updatePart(id: string, data: Partial<Part>): Promise<Part> {
    const { mockParts } = await import('@/mocks/maintenance/parts');
    const part = mockParts.find(p => p.id === id);
    if (!part) throw new Error('Part not found');
    
    return {
      ...part,
      ...data,
      updatedAt: new Date().toISOString(),
    };
  }

  async getPartTransactions(partId?: string): Promise<PartTransaction[]> {
    const { mockPartTransactions } = await import('@/mocks/maintenance/parts');
    if (partId) {
      return mockPartTransactions.filter(t => t.partId === partId);
    }
    return mockPartTransactions;
  }

  // ==================== INSPECCIONES ====================

  async getInspections(filters?: {
    vehicleId?: string;
    type?: string;
    status?: string;
  }): Promise<Inspection[]> {
    const { mockInspections } = await import('@/mocks/maintenance/inspections');
    let inspections = [...mockInspections];

    if (filters?.vehicleId) {
      inspections = inspections.filter(i => i.vehicleId === filters.vehicleId);
    }
    if (filters?.type) {
      inspections = inspections.filter(i => i.type === filters.type);
    }
    if (filters?.status) {
      inspections = inspections.filter(i => i.status === filters.status);
    }

    return inspections;
  }

  async createInspection(
    data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Inspection> {
    const newInspection: Inspection = {
      ...data,
      id: `inspection-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newInspection;
  }

  async getInspectionChecklists(type?: string): Promise<InspectionChecklist[]> {
    const { mockInspectionChecklists } = await import('@/mocks/maintenance/inspections');
    if (type) {
      return mockInspectionChecklists.filter(c => c.type === type);
    }
    return mockInspectionChecklists;
  }

  // ==================== ALERTAS ====================

  async getAlerts(filters?: {
    type?: string;
    severity?: string;
    unreadOnly?: boolean;
  }): Promise<Alert[]> {
    const { mockAlerts } = await import('@/mocks/maintenance/alerts');
    let alerts = [...mockAlerts];

    if (filters?.type) {
      alerts = alerts.filter(a => a.type === filters.type);
    }
    if (filters?.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters?.unreadOnly) {
      alerts = alerts.filter(a => !a.isRead);
    }

    return alerts;
  }

  async markAlertAsRead(id: string): Promise<void> {
    console.log('Marking alert as read:', id);
  }

  async dismissAlert(id: string): Promise<void> {
    console.log('Dismissing alert:', id);
  }

  // ==================== MÉTRICAS Y REPORTES ====================

  async getMaintenanceMetrics(
    vehicleId?: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<MaintenanceMetrics> {
    const { mockMaintenanceMetrics } = await import('@/mocks/maintenance/metrics');
    // TODO: Filtrar por vehículo y período
    return mockMaintenanceMetrics;
  }

  async getVehicleHistory(vehicleId: string): Promise<VehicleMaintenanceHistory> {
    const { mockVehicleHistory } = await import('@/mocks/maintenance/metrics');
    return mockVehicleHistory;
  }

  // ==================== CONFIGURACIÓN ====================

  async getSettings(): Promise<MaintenanceSettings> {
    const { mockMaintenanceSettings } = await import('@/mocks/maintenance/settings');
    return mockMaintenanceSettings;
  }

  async updateSettings(data: Partial<MaintenanceSettings>): Promise<MaintenanceSettings> {
    const settings = await this.getSettings();
    return {
      ...settings,
      ...data,
    };
  }
}

export const maintenanceService = new MaintenanceService();
