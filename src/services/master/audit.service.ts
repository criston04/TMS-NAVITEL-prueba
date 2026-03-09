import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";


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


const mockAuditEntries: AuditEntry[] = [
  {
    id: "audit-001",
    timestamp: "2025-06-20T14:30:00Z",
    entityType: "driver",
    entityId: "drv-001",
    entityName: "Carlos Pérez García",
    action: "update",
    description: "Actualización de datos del conductor",
    changes: [
      { field: "phone", fieldLabel: "Teléfono", oldValue: "987654320", newValue: "987654321" },
      { field: "address", fieldLabel: "Dirección", oldValue: "Av. Arequipa 1230", newValue: "Av. Arequipa 1234" },
    ],
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    ipAddress: "192.168.1.100",
  },
  {
    id: "audit-002",
    timestamp: "2025-06-20T10:15:00Z",
    entityType: "assignment",
    entityId: "asgn-001",
    entityName: "Carlos Pérez García → ABC-123",
    action: "assign",
    description: "Asignación de vehículo ABC-123 al conductor Carlos Pérez García",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    metadata: {
      driverId: "drv-001",
      vehicleId: "v001",
      assignmentType: "permanent",
    },
  },
  {
    id: "audit-003",
    timestamp: "2025-06-19T16:45:00Z",
    entityType: "vehicle",
    entityId: "v001",
    entityName: "ABC-123 (Volvo FH16)",
    action: "maintenance_completed",
    description: "Mantenimiento preventivo 80,000 km completado",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    metadata: {
      maintenanceId: "maint-001",
      cost: 3500,
      workshop: "Taller Autorizado Volvo Lima",
    },
  },
  {
    id: "audit-004",
    timestamp: "2025-06-18T09:00:00Z",
    entityType: "document",
    entityId: "doc-soat-001",
    entityName: "SOAT - ABC-123",
    action: "renew_document",
    description: "Renovación de SOAT para vehículo ABC-123",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    changes: [
      { field: "endDate", fieldLabel: "Fecha Vencimiento", oldValue: "2025-01-01", newValue: "2026-01-01" },
      { field: "policyNumber", fieldLabel: "Número Póliza", oldValue: "SOAT-2024-001234", newValue: "SOAT-2025-001234" },
    ],
  },
  {
    id: "audit-005",
    timestamp: "2025-06-17T11:30:00Z",
    entityType: "driver",
    entityId: "drv-002",
    entityName: "Juan López Mendoza",
    action: "exam_passed",
    description: "Examen médico aprobado",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    metadata: {
      examType: "medical",
      clinic: "Clínica San Pablo",
      expiryDate: "2026-06-17",
    },
  },
  {
    id: "audit-006",
    timestamp: "2025-06-15T08:00:00Z",
    entityType: "driver",
    entityId: "drv-003",
    entityName: "Pedro Ramírez Torres",
    action: "suspend",
    description: "Conductor suspendido por infracciones múltiples",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
    changes: [
      { field: "status", fieldLabel: "Estado", oldValue: "active", newValue: "suspended" },
    ],
    metadata: {
      reason: "Acumulación de 3 infracciones de tránsito en el último mes",
    },
  },
  {
    id: "audit-007",
    timestamp: "2025-06-14T14:20:00Z",
    entityType: "vehicle",
    entityId: "v002",
    entityName: "DEF-456 (Scania R450)",
    action: "create",
    description: "Nuevo vehículo registrado en el sistema",
    userId: "admin-001",
    userName: "Admin Sistema",
    userRole: "admin",
  },
  {
    id: "audit-008",
    timestamp: "2025-06-13T10:00:00Z",
    entityType: "driver",
    entityId: "drv-001",
    entityName: "Carlos Pérez García",
    action: "upload_document",
    description: "Carga de nuevo documento: Licencia de Conducir",
    userId: "drv-001",
    userName: "Carlos Pérez García",
    userRole: "driver",
    metadata: {
      documentType: "license",
      fileName: "licencia_conducir.pdf",
    },
  },
];


class AuditService {
  private readonly useMocks: boolean;
  private entries: AuditEntry[] = [...mockAuditEntries];

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red
   */
  private async simulateDelay(ms: number = 200): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Genera ID único
   */
  private generateId(): string {
    return `audit-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra una nueva entrada de auditoría
   */
  async log(entry: Omit<AuditEntry, "id" | "timestamp">): Promise<AuditEntry> {
    if (!this.useMocks) {
      return apiClient.post<AuditEntry>(API_ENDPOINTS.master.audit, entry);
    }

    const newEntry: AuditEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.entries.unshift(newEntry);
    
    // En producción, aquí se enviaría a un servicio de logging
    console.log("[AUDIT]", newEntry.action, newEntry.entityType, newEntry.entityId, newEntry.description);
    
    return newEntry;
  }

  /**
   * Obtiene entradas de auditoría con filtros
   */
  async getEntries(filters?: AuditFilters): Promise<AuditEntry[]> {
    if (!this.useMocks) {
      return apiClient.get<AuditEntry[]>(API_ENDPOINTS.master.audit, { params: filters as unknown as Record<string, string> });
    }

    await this.simulateDelay(200);

    let result = [...this.entries];

    if (filters?.entityType) {
      result = result.filter(e => e.entityType === filters.entityType);
    }

    if (filters?.entityId) {
      result = result.filter(e => e.entityId === filters.entityId);
    }

    if (filters?.action) {
      result = result.filter(e => e.action === filters.action);
    }

    if (filters?.userId) {
      result = result.filter(e => e.userId === filters.userId);
    }

    if (filters?.startDate) {
      result = result.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter(e => e.timestamp <= filters.endDate!);
    }

    // Ordenar por timestamp descendente
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return result;
  }

  /**
   * Obtiene el historial de una entidad específica
   */
  async getEntityHistory(entityType: AuditEntityType, entityId: string): Promise<AuditEntry[]> {
    if (!this.useMocks) {
      return apiClient.get<AuditEntry[]>(`${API_ENDPOINTS.master.audit}/entity/${entityType}/${entityId}`);
    }

    return this.getEntries({ entityType, entityId });
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getStats(): Promise<AuditStats> {
    if (!this.useMocks) {
      return apiClient.get<AuditStats>(`${API_ENDPOINTS.master.audit}/stats`);
    }

    await this.simulateDelay(100);

    const entriesByAction: Record<string, number> = {};
    const entriesByEntityType: Record<string, number> = {};

    this.entries.forEach(entry => {
      entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
      entriesByEntityType[entry.entityType] = (entriesByEntityType[entry.entityType] || 0) + 1;
    });

    return {
      totalEntries: this.entries.length,
      entriesByAction: entriesByAction as Record<AuditAction, number>,
      entriesByEntityType: entriesByEntityType as Record<AuditEntityType, number>,
      recentActivity: this.entries.slice(0, 10),
    };
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
