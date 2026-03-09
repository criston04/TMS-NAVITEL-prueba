import { BulkService } from "@/services/base.service";
import { API_ENDPOINTS } from "@/config/api.config";
import { Vehicle, VehicleStats } from "@/types/models";
import { ValidationChecklist } from "@/types/common";
import { vehiclesMock } from "@/mocks/master";

/**
 * Servicio para gestión de Vehículos
 */
class VehiclesService extends BulkService<Vehicle> {
  constructor() {
    super(API_ENDPOINTS.master.vehicles, vehiclesMock);
  }

  /**
   * Obtiene estadísticas de vehículos
   */
  async getStats(): Promise<VehicleStats> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      
      const enabled = this.mockData.filter((v) => v.isEnabled).length;
      const blocked = this.mockData.filter((v) => !v.isEnabled).length;
      const available = this.mockData.filter((v) => v.operationalStatus === "available").length;
      const onRoute = this.mockData.filter((v) => v.operationalStatus === "on-route").length;
      const inMaintenance = this.mockData.filter((v) => v.operationalStatus === "maintenance").length;
      
      // Documentos por vencer en 30 días
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringSoon = this.mockData.filter((v) =>
        v.documents?.some((doc) => {
          if (!doc.expirationDate) return false;
          const expiry = new Date(doc.expirationDate);
          return expiry <= thirtyDaysFromNow && expiry > new Date();
        })
      ).length;

      const expired = this.mockData.filter((v) =>
        v.documents?.some((doc) => {
          if (!doc.expirationDate) return false;
          return new Date(doc.expirationDate) < new Date();
        })
      ).length;

      const inRepair = this.mockData.filter((v) => v.operationalStatus === "repair").length;
      const inactive = this.mockData.filter((v) => v.operationalStatus === "inactive").length;
      const withOpenIncidents = 0; // TODO: implementar cuando exista sistema de incidentes

      return {
        total: this.mockData.length,
        enabled,
        blocked,
        expiringSoon,
        expired,
        available,
        onRoute,
        inMaintenance,
        inRepair,
        inactive,
        withOpenIncidents,
      };
    }

    return this.request<VehicleStats>("GET", `${this.endpoint}/stats`);
  }

  /**
   * Obtiene el checklist de un vehículo
   */
  async getChecklist(vehicleId: string): Promise<ValidationChecklist> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      const vehicle = this.mockData.find((v) => v.id === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
      }
      return vehicle.checklist;
    }

    return this.request<ValidationChecklist>("GET", `${this.endpoint}/${vehicleId}/checklist`);
  }

  /**
   * Habilita un vehículo
   */
  async enable(vehicleId: string): Promise<Vehicle> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const vehicle = this.mockData.find((v) => v.id === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
      }
      if (!vehicle.checklist.isComplete) {
        throw new Error("No se puede habilitar: documentación incompleta");
      }
      vehicle.isEnabled = true;
      vehicle.status = "active";
      return vehicle;
    }

    return this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/enable`);
  }

  /**
   * Bloquea un vehículo
   */
  async block(vehicleId: string, reason: string): Promise<Vehicle> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const vehicle = this.mockData.find((v) => v.id === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
      }
      vehicle.isEnabled = false;
      vehicle.status = "blocked";
      vehicle.notes = reason;
      return vehicle;
    }

    return this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/block`, { reason });
  }

  /**
   * Busca por placa
   */
  async findByPlate(plate: string): Promise<Vehicle | null> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.find((v) => v.plate.toLowerCase() === plate.toLowerCase()) || null;
    }

    return this.request<Vehicle | null>("GET", `${this.endpoint}/by-plate/${plate}`);
  }

  /**
   * Asigna conductor a vehículo
   */
  async assignDriver(vehicleId: string, driverId: string): Promise<Vehicle> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const vehicle = this.mockData.find((v) => v.id === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
      }
      vehicle.currentDriverId = driverId;
      return vehicle;
    }

    return this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/assign-driver`, { driverId });
  }

  /**
   * Desasigna conductor de un vehículo
   */
  async unassignDriver(vehicleId: string, _driverId: string): Promise<Vehicle> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const vehicle = this.mockData.find((v) => v.id === vehicleId);
      if (!vehicle) {
        throw new Error(`Vehículo con ID ${vehicleId} no encontrado`);
      }
      vehicle.currentDriverId = undefined;
      return vehicle;
    }

    return this.request<Vehicle>("POST", `${this.endpoint}/${vehicleId}/unassign-driver`);
  }

  /**
   * Request helper
   */
  private async request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
    const { apiClient } = await import("@/lib/api");
    
    switch (method) {
      case "GET":
        return apiClient.get<T>(endpoint);
      case "POST":
        return apiClient.post<T>(endpoint, data);
      default:
        return apiClient.get<T>(endpoint);
    }
  }
}

/** Instancia singleton del servicio */
export const vehiclesService = new VehiclesService();
