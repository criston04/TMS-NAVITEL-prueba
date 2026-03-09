import { BulkService } from "@/services/base.service";
import { API_ENDPOINTS } from "@/config/api.config";
import { Driver, DriverStats } from "@/types/models";
import { ValidationChecklist } from "@/types/common";
import { driversMock } from "@/mocks/master";

/**
 * Servicio para gestión de Conductores
 */
class DriversService extends BulkService<Driver> {
  constructor() {
    super(API_ENDPOINTS.master.drivers, driversMock);
  }

  /**
   * Obtiene estadísticas de conductores
   */
  async getStats(): Promise<DriverStats> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      
      const enabled = this.mockData.filter((d) => d.isEnabled).length;
      const blocked = this.mockData.filter((d) => !d.isEnabled).length;
      const available = this.mockData.filter((d) => d.availability === "available").length;
      const onRoute = this.mockData.filter((d) => d.availability === "on-route").length;
      
      // Documentos por vencer en 30 días
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringSoon = this.mockData.filter((d) =>
        d.documents.some((doc) => {
          if (!doc.expirationDate) return false;
          const expiry = new Date(doc.expirationDate);
          return expiry <= thirtyDaysFromNow && expiry > new Date();
        })
      ).length;

      return {
        total: this.mockData.length,
        enabled,
        blocked,
        expiringSoon,
        expired: 0,
        available,
        onRoute,
        resting: 0,
        onVacation: 0,
        withOpenIncidents: 0,
      };
    }

    return this.request<DriverStats>("GET", `${this.endpoint}/stats`);
  }

  /**
   * Obtiene el checklist de un conductor
   */
  async getChecklist(driverId: string): Promise<ValidationChecklist> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      const driver = this.mockData.find((d) => d.id === driverId);
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      return driver.checklist;
    }

    return this.request<ValidationChecklist>("GET", `${this.endpoint}/${driverId}/checklist`);
  }

  /**
   * Habilita un conductor (si tiene documentación completa)
   */
  async enable(driverId: string): Promise<Driver> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const driver = this.mockData.find((d) => d.id === driverId);
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      if (!driver.checklist.isComplete) {
        throw new Error("No se puede habilitar: documentación incompleta");
      }
      driver.isEnabled = true;
      driver.status = "active";
      return driver;
    }

    return this.request<Driver>("POST", `${this.endpoint}/${driverId}/enable`);
  }

  /**
   * Bloquea un conductor
   */
  async block(driverId: string, reason: string): Promise<Driver> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const driver = this.mockData.find((d) => d.id === driverId);
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      driver.isEnabled = false;
      driver.status = "suspended";
      driver.notes = reason;
      return driver;
    }

    return this.request<Driver>("POST", `${this.endpoint}/${driverId}/block`, { reason });
  }

  /**
   * Busca por número de documento
   */
  async findByDocument(documentNumber: string): Promise<Driver | null> {
    if (this.useMocks) {
      await this.simulateDelay(300);
      return this.mockData.find((d) => d.documentNumber === documentNumber) || null;
    }

    return this.request<Driver | null>("GET", `${this.endpoint}/by-document/${documentNumber}`);
  }

  /**
   * Asigna un vehículo a un conductor
   */
  async assignVehicle(driverId: string, vehicleId: string): Promise<Driver> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const driver = this.mockData.find((d) => d.id === driverId);
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      // Asignar en mock (usamos any para evitar problemas de tipos)
      (driver as unknown as { assignedVehicleId: string }).assignedVehicleId = vehicleId;
      return driver;
    }

    return this.request<Driver>("POST", `${this.endpoint}/${driverId}/assign-vehicle`, { vehicleId });
  }

  /**
   * Desasigna un vehículo de un conductor
   */
  async unassignVehicle(driverId: string, _vehicleId: string): Promise<Driver> {
    if (this.useMocks) {
      await this.simulateDelay(400);
      const driver = this.mockData.find((d) => d.id === driverId);
      if (!driver) {
        throw new Error(`Conductor con ID ${driverId} no encontrado`);
      }
      // Desasignar en mock
      (driver as unknown as { assignedVehicleId: string | null }).assignedVehicleId = null;
      return driver;
    }

    return this.request<Driver>("POST", `${this.endpoint}/${driverId}/unassign-vehicle`);
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
export const driversService = new DriversService();
