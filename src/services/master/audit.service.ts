import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * ⚠️ MÓDULO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * Los endpoints `/master/audit/*` que este service llama NO están en el Excel
 * oficial. El Excel sí tiene `/api/v1/settings/audit` (módulo Settings) que
 * podría cubrir parte de esta funcionalidad.
 *
 * Posibles caminos a definir con backend:
 *   1. Implementar `/master/audit/*` específico para entidades maestras
 *      (driver, vehicle, assignment, document) — más detallado.
 *   2. Reutilizar `/settings/audit` con filtros por entityType — más simple.
 *
 * Mientras se decide, los métodos de este service devolverán 404 en producción.
 * Los hooks consumidores deben manejarlo con `isBackendNotImplemented`.
 */


export type AuditEntityType = "driver" | "vehicle" | "assignment" | "document";

export type AuditAction = 
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "deactivate"
  | "suspend"
  | "assign"
  | "unassign"
  | "upload_document"
  | "expire_document"
  | "renew_document"
  | "maintenance_scheduled"
  | "maintenance_completed"
  | "exam_passed"
  | "exam_failed";

export interface AuditEntry {
  id: string;
  timestamp: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  action: AuditAction;
  description: string;
  changes?: AuditChange[];
  userId: string;
  userName: string;
  userRole: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditChange {
  field: string;
  fieldLabel: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditStats {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesByEntityType: Record<AuditEntityType, number>;
  recentActivity: AuditEntry[];
}


class AuditService {
  constructor() {}

  /**
   * Registra una nueva entrada de auditoría
   */
  async log(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
    return apiClient.post<AuditEntry>(API_ENDPOINTS.master.audit, entry);
  }

  /**
   * Obtiene entradas de auditoría con filtros
   */
  async getEntries(filters?: AuditFilters): Promise<AuditEntry[]> {
    return apiClient.get<AuditEntry[]>(API_ENDPOINTS.master.audit, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene el historial de una entidad específica
   */
  async getEntityHistory(entityType: AuditEntityType, entityId: string): Promise<AuditEntry[]> {
    return apiClient.get<AuditEntry[]>(`${API_ENDPOINTS.master.audit}/entity/${entityType}/${entityId}`);
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStats(): Promise<AuditStats> {
    // /master/audit NO existe en backend todavia (documentado en api.config.ts).
    // Envolvemos en try/catch para que la UI muestre stats vacios en lugar de crashear.
    try {
      return await apiClient.get<AuditStats>(`${API_ENDPOINTS.master.audit}/stats`);
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        console.warn("[auditService.getStats] backend 404 (modulo no implementado). Retornando stats vacios.");
        return {
          totalEntries: 0,
          entriesByAction: {} as Record<AuditAction, number>,
          entriesByEntityType: {} as Record<AuditEntityType, number>,
          recentActivity: [],
        };
      }
      throw err;
    }
  }

  /**
   * Métodos de conveniencia para logging de acciones comunes
   */

  async logDriverCreated(driverId: string, driverName: string, userId: string, userName: string): Promise<void> {
    await this.log({
      entityType: "driver",
      entityId: driverId,
      entityName: driverName,
      action: "create",
      description: `Nuevo conductor registrado: ${driverName}`,
      userId,
      userName,
      userRole: "admin",
    });
  }

  async logDriverUpdated(
    driverId: string, 
    driverName: string, 
    changes: AuditChange[], 
    userId: string, 
    userName: string
  ): Promise<void> {
    await this.log({
      entityType: "driver",
      entityId: driverId,
      entityName: driverName,
      action: "update",
      description: `Actualización de datos del conductor ${driverName}`,
      changes,
      userId,
      userName,
      userRole: "admin",
    });
  }

  async logDriverStatusChanged(
    driverId: string,
    driverName: string,
    oldStatus: string,
    newStatus: string,
    reason: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const action = newStatus === "active" ? "activate" 
      : newStatus === "suspended" ? "suspend"
      : newStatus === "inactive" ? "deactivate"
      : "update";

    await this.log({
      entityType: "driver",
      entityId: driverId,
      entityName: driverName,
      action,
      description: `Cambio de estado: ${oldStatus} → ${newStatus}. Motivo: ${reason}`,
      changes: [{ field: "status", fieldLabel: "Estado", oldValue: oldStatus, newValue: newStatus }],
      userId,
      userName,
      userRole: "admin",
      metadata: { reason },
    });
  }

  async logVehicleCreated(vehicleId: string, vehicleName: string, userId: string, userName: string): Promise<void> {
    await this.log({
      entityType: "vehicle",
      entityId: vehicleId,
      entityName: vehicleName,
      action: "create",
      description: `Nuevo vehículo registrado: ${vehicleName}`,
      userId,
      userName,
      userRole: "admin",
    });
  }

  async logAssignment(
    driverId: string,
    driverName: string,
    vehicleId: string,
    vehiclePlate: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.log({
      entityType: "assignment",
      entityId: `${driverId}-${vehicleId}`,
      entityName: `${driverName} → ${vehiclePlate}`,
      action: "assign",
      description: `Asignación de vehículo ${vehiclePlate} al conductor ${driverName}`,
      userId,
      userName,
      userRole: "admin",
      metadata: { driverId, vehicleId },
    });
  }

  async logDocumentRenewed(
    documentType: string,
    entityId: string,
    entityName: string,
    oldExpiryDate: string,
    newExpiryDate: string,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.log({
      entityType: "document",
      entityId: `doc-${documentType}-${entityId}`,
      entityName: `${documentType} - ${entityName}`,
      action: "renew_document",
      description: `Renovación de ${documentType} para ${entityName}`,
      changes: [
        { field: "expiryDate", fieldLabel: "Fecha Vencimiento", oldValue: oldExpiryDate, newValue: newExpiryDate }
      ],
      userId,
      userName,
      userRole: "admin",
    });
  }

  async logMaintenanceCompleted(
    vehicleId: string,
    vehicleName: string,
    maintenanceType: string,
    cost: number,
    userId: string,
    userName: string
  ): Promise<void> {
    await this.log({
      entityType: "vehicle",
      entityId: vehicleId,
      entityName: vehicleName,
      action: "maintenance_completed",
      description: `Mantenimiento ${maintenanceType} completado`,
      userId,
      userName,
      userRole: "admin",
      metadata: { maintenanceType, cost },
    });
  }
}

// Singleton
export const auditService = new AuditService();

export default auditService;
