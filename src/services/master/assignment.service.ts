import { Driver } from "@/types/models/driver";
import { Vehicle, VehicleType } from "@/types/models/vehicle";
import { 
  LICENSE_VEHICLE_COMPATIBILITY 
} from "@/lib/validators/driver-validators";
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";


export interface Assignment {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  assignmentType: "permanent" | "temporary" | "backup";
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "cancelled";
  reason?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentRequest {
  driverId: string;
  vehicleId: string;
  assignmentType: "permanent" | "temporary" | "backup";
  startDate: string;
  endDate?: string;
  reason?: string;
  overrideValidation?: boolean;
}

export interface AssignmentValidationResult {
  isValid: boolean;
  canAssign: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  driverEligibility: DriverEligibilityResult;
  vehicleEligibility: VehicleEligibilityResult;
  compatibility: CompatibilityResult;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: "warning";
}

export interface DriverEligibilityResult {
  isEligible: boolean;
  licenseValid: boolean;
  medicalExamValid: boolean;
  psychExamValid: boolean;
  statusValid: boolean;
  documentsExpiringSoon: string[];
  restrictions: string[];
}

export interface VehicleEligibilityResult {
  isEligible: boolean;
  statusValid: boolean;
  soatValid: boolean;
  inspectionValid: boolean;
  operatingCertificateValid: boolean;
  gpsValid: boolean;
  documentsExpiringSoon: string[];
  issues: string[];
}

export interface CompatibilityResult {
  isCompatible: boolean;
  driverLicenseCategory: string;
  vehicleType: VehicleType;
  allowedVehicleTypes: VehicleType[];
  reason?: string;
}

export interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  permanentAssignments: number;
  temporaryAssignments: number;
  driversWithVehicle: number;
  driversWithoutVehicle: number;
  vehiclesAssigned: number;
  vehiclesAvailable: number;
}

export interface AssignmentHistory {
  id: string;
  action: "assigned" | "unassigned" | "transferred" | "updated";
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehiclePlate: string;
  previousDriverId?: string;
  previousDriverName?: string;
  reason?: string;
  performedBy: string;
  performedAt: string;
}


const mockAssignments: Assignment[] = [
  {
    id: "asgn-001",
    driverId: "drv-001",
    driverName: "Carlos Pérez García",
    vehicleId: "v001",
    vehiclePlate: "ABC-123",
    assignmentType: "permanent",
    startDate: "2024-01-15",
    status: "active",
    reason: "Asignación principal para rutas nacionales",
    createdBy: "admin",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "asgn-002",
    driverId: "drv-002",
    driverName: "Juan López Mendoza",
    vehicleId: "v002",
    vehiclePlate: "DEF-456",
    assignmentType: "permanent",
    startDate: "2024-03-01",
    status: "active",
    createdBy: "admin",
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-01T10:00:00Z",
  },
];

const mockHistory: AssignmentHistory[] = [
  {
    id: "hist-001",
    action: "assigned",
    driverId: "drv-001",
    driverName: "Carlos Pérez García",
    vehicleId: "v001",
    vehiclePlate: "ABC-123",
    reason: "Asignación inicial",
    performedBy: "admin",
    performedAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "hist-002",
    action: "assigned",
    driverId: "drv-002",
    driverName: "Juan López Mendoza",
    vehicleId: "v002",
    vehiclePlate: "DEF-456",
    performedBy: "admin",
    performedAt: "2024-03-01T10:00:00Z",
  },
];


class AssignmentService {
  private readonly useMocks: boolean;
  private assignments: Assignment[] = [...mockAssignments];
  private history: AssignmentHistory[] = [...mockHistory];

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
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valida la elegibilidad de un conductor para asignación
   */
  private validateDriverForAssignment(driver: Driver): DriverEligibilityResult {
    const result: DriverEligibilityResult = {
      isEligible: true,
      licenseValid: true,
      medicalExamValid: true,
      psychExamValid: true,
      statusValid: true,
      documentsExpiringSoon: [],
      restrictions: [],
    };

    // Validar estado del conductor
    if (driver.status !== "active") {
      result.statusValid = false;
      result.isEligible = false;
    }

    // Validar licencia
    const licenseExpiry = driver.license?.expiryDate || driver.licenseExpiry;
    if (licenseExpiry) {
      const daysUntilExpiry = Math.ceil(
        (new Date(licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.licenseValid = false;
        result.isEligible = false;
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Licencia vence en ${daysUntilExpiry} días`);
      }
    }

    // Validar examen médico
    const medicalExam = driver.medicalExamHistory?.[0];
    if (medicalExam?.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(medicalExam.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.medicalExamValid = false;
        result.isEligible = false;
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Examen médico vence en ${daysUntilExpiry} días`);
      }

      // Agregar restricciones médicas (convertir MedicalRestriction a descripción string)
      if (medicalExam.restrictions?.length) {
        const restrictionDescriptions = medicalExam.restrictions.map(r => 
          typeof r === 'string' ? r : (r as { description?: string }).description || String(r)
        );
        result.restrictions.push(...restrictionDescriptions);
      }
    }

    // Validar examen psicológico
    const psychExam = driver.psychologicalExamHistory?.[0];
    if (psychExam?.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(psychExam.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.psychExamValid = false;
        result.isEligible = false;
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Examen psicológico vence en ${daysUntilExpiry} días`);
      }
    }

    // Agregar restricciones de licencia
    if (driver.license?.restrictions) {
      const restrictions = driver.license.restrictions;
      const licenseRestrictions: string[] = [];
      
      if (restrictions.requiresGlasses) licenseRestrictions.push("Uso obligatorio de lentes");
      if (restrictions.requiresHearingAid) licenseRestrictions.push("Uso obligatorio de audífono");
      if (restrictions.automaticOnly) licenseRestrictions.push("Solo vehículos automáticos");
      if (restrictions.otherRestrictions?.length) {
        licenseRestrictions.push(...restrictions.otherRestrictions);
      }
      
      if (licenseRestrictions.length > 0) {
        result.restrictions.push(...licenseRestrictions);
      }
    }

    return result;
  }

  /**
   * Valida la elegibilidad de un vehículo para asignación
   */
  private validateVehicleForAssignment(vehicle: Vehicle): VehicleEligibilityResult {
    const result: VehicleEligibilityResult = {
      isEligible: true,
      statusValid: true,
      soatValid: true,
      inspectionValid: true,
      operatingCertificateValid: true,
      gpsValid: true,
      documentsExpiringSoon: [],
      issues: [],
    };

    // Validar estado del vehículo
    if (vehicle.status !== "active") {
      result.statusValid = false;
      result.isEligible = false;
      result.issues.push(`Vehículo en estado: ${vehicle.status}`);
    }

    if (vehicle.operationalStatus !== "operational") {
      result.statusValid = false;
      result.isEligible = false;
      result.issues.push(`Estado operacional: ${vehicle.operationalStatus}`);
    }

    // Validar SOAT
    const soat = vehicle.insurancePolicies?.find(p => p.type === "soat");
    if (soat?.endDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(soat.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.soatValid = false;
        result.isEligible = false;
        result.issues.push("SOAT vencido");
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`SOAT vence en ${daysUntilExpiry} días`);
      }
    } else {
      result.soatValid = false;
      result.isEligible = false;
      result.issues.push("Sin SOAT registrado");
    }

    // Validar Revisión Técnica
    if (vehicle.currentInspection?.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.currentInspection.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.inspectionValid = false;
        result.isEligible = false;
        result.issues.push("Revisión técnica vencida");
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Revisión técnica vence en ${daysUntilExpiry} días`);
      }
    }

    // Validar Certificado de Operación
    if (vehicle.operatingCertificate?.expiryDate) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.operatingCertificate.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.operatingCertificateValid = false;
        result.isEligible = false;
        result.issues.push("Certificado de operación vencido");
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Certificado de operación vence en ${daysUntilExpiry} días`);
      }
    }

    // Validar GPS
    if (vehicle.gpsDevice?.certificationExpiry) {
      const daysUntilExpiry = Math.ceil(
        (new Date(vehicle.gpsDevice.certificationExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilExpiry < 0) {
        result.gpsValid = false;
        result.issues.push("Certificación GPS MTC vencida");
      } else if (daysUntilExpiry <= 30) {
        result.documentsExpiringSoon.push(`Certificación GPS vence en ${daysUntilExpiry} días`);
      }
    }

    return result;
  }

  /**
   * Valida compatibilidad licencia-vehículo
   */
  private validateCompatibility(driver: Driver, vehicle: Vehicle): CompatibilityResult {
    const licenseCategory = driver.license?.category || driver.licenseType || "";
    
    // Obtener tipos de vehículo permitidos para la categoría
    const allowedTypes = LICENSE_VEHICLE_COMPATIBILITY[licenseCategory as keyof typeof LICENSE_VEHICLE_COMPATIBILITY] || [];

    const isCompatible = allowedTypes.includes(vehicle.type);

    return {
      isCompatible,
      driverLicenseCategory: licenseCategory,
      vehicleType: vehicle.type,
      allowedVehicleTypes: allowedTypes,
      reason: isCompatible 
        ? undefined 
        : `La categoría ${licenseCategory} no permite conducir vehículos tipo ${vehicle.type}`,
    };
  }

  /**
   * Valida una asignación completa
   */
  async validateAssignment(
    driver: Driver,
    vehicle: Vehicle
  ): Promise<AssignmentValidationResult> {
    if (this.useMocks) {
    await this.simulateDelay(200);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validar conductor
    const driverEligibility = this.validateDriverForAssignment(driver);
    if (!driverEligibility.isEligible) {
      if (!driverEligibility.statusValid) {
        errors.push({
          code: "DRIVER_STATUS_INVALID",
          field: "driver.status",
          message: `El conductor está en estado "${driver.status}" y no puede ser asignado`,
          severity: "error",
        });
      }
      if (!driverEligibility.licenseValid) {
        errors.push({
          code: "DRIVER_LICENSE_EXPIRED",
          field: "driver.license",
          message: "La licencia de conducir está vencida",
          severity: "error",
        });
      }
      if (!driverEligibility.medicalExamValid) {
        errors.push({
          code: "DRIVER_MEDICAL_EXPIRED",
          field: "driver.medicalExam",
          message: "El examen médico está vencido",
          severity: "error",
        });
      }
      if (!driverEligibility.psychExamValid) {
        errors.push({
          code: "DRIVER_PSYCH_EXPIRED",
          field: "driver.psychologicalExam",
          message: "El examen psicológico está vencido",
          severity: "error",
        });
      }
    }

    // Advertencias de documentos por vencer
    driverEligibility.documentsExpiringSoon.forEach(doc => {
      warnings.push({
        code: "DRIVER_DOC_EXPIRING",
        field: "driver.documents",
        message: doc,
        severity: "warning",
      });
    });

    // Validar vehículo
    const vehicleEligibility = this.validateVehicleForAssignment(vehicle);
    if (!vehicleEligibility.isEligible) {
      vehicleEligibility.issues.forEach(issue => {
        errors.push({
          code: "VEHICLE_ISSUE",
          field: "vehicle",
          message: issue,
          severity: "error",
        });
      });
    }

    // Advertencias de documentos de vehículo por vencer
    vehicleEligibility.documentsExpiringSoon.forEach(doc => {
      warnings.push({
        code: "VEHICLE_DOC_EXPIRING",
        field: "vehicle.documents",
        message: doc,
        severity: "warning",
      });
    });

    // Validar compatibilidad
    const compatibility = this.validateCompatibility(driver, vehicle);
    if (!compatibility.isCompatible) {
      errors.push({
        code: "LICENSE_VEHICLE_INCOMPATIBLE",
        field: "compatibility",
        message: compatibility.reason || "Licencia incompatible con el tipo de vehículo",
        severity: "error",
      });
    }

    // Verificar si el conductor ya tiene vehículo asignado
    if (driver.assignedVehicleId && driver.assignedVehicleId !== vehicle.id) {
      warnings.push({
        code: "DRIVER_ALREADY_ASSIGNED",
        field: "driver.assignedVehicle",
        message: `El conductor ya tiene asignado el vehículo ${driver.assignedVehiclePlate}`,
        severity: "warning",
      });
    }

    // Verificar si el vehículo ya tiene conductor asignado
    if (vehicle.currentDriverId && vehicle.currentDriverId !== driver.id) {
      warnings.push({
        code: "VEHICLE_ALREADY_ASSIGNED",
        field: "vehicle.currentDriver",
        message: `El vehículo ya está asignado a ${vehicle.currentDriverName}`,
        severity: "warning",
      });
    }

    const isValid = errors.length === 0;
    const canAssign = isValid || (errors.length === 0 && warnings.length > 0);

    return {
      isValid,
      canAssign,
      errors,
      warnings,
      driverEligibility,
      vehicleEligibility,
      compatibility,
    };
    }
    return apiClient.post<AssignmentValidationResult>(`${API_ENDPOINTS.master.assignments}/validate`, { driverId: driver.id, vehicleId: vehicle.id });
  }

  /**
   * Obtiene todas las asignaciones
   */
  async getAssignments(filters?: { status?: string; type?: string }): Promise<Assignment[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);

      let result = [...this.assignments];

      if (filters?.status) {
        result = result.filter(a => a.status === filters.status);
      }

      if (filters?.type) {
        result = result.filter(a => a.assignmentType === filters.type);
      }

      return result;
    }
    return apiClient.get<Assignment[]>(API_ENDPOINTS.master.assignments, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene una asignación por ID
   */
  async getAssignmentById(id: string): Promise<Assignment | null> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      return this.assignments.find(a => a.id === id) || null;
    }
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/${id}`);
  }

  /**
   * Obtiene la asignación activa de un conductor
   */
  async getDriverAssignment(driverId: string): Promise<Assignment | null> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      return this.assignments.find(a => 
        a.driverId === driverId && a.status === "active"
      ) || null;
    }
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/by-driver/${driverId}`);
  }

  /**
   * Obtiene la asignación activa de un vehículo
   */
  async getVehicleAssignment(vehicleId: string): Promise<Assignment | null> {
    if (this.useMocks) {
      await this.simulateDelay(100);
      return this.assignments.find(a => 
        a.vehicleId === vehicleId && a.status === "active"
      ) || null;
    }
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/by-vehicle/${vehicleId}`);
  }

  /**
   * Crea una nueva asignación
   */
  async createAssignment(
    request: AssignmentRequest,
    driver: Driver,
    vehicle: Vehicle
  ): Promise<Assignment> {
    if (this.useMocks) {
    await this.simulateDelay(300);

    // Validar asignación
    const validation = await this.validateAssignment(driver, vehicle);
    
    if (!validation.canAssign && !request.overrideValidation) {
      throw new Error(
        `No se puede crear la asignación: ${validation.errors.map(e => e.message).join(", ")}`
      );
    }

    // Desactivar asignaciones previas del conductor
    this.assignments = this.assignments.map(a => 
      a.driverId === request.driverId && a.status === "active"
        ? { ...a, status: "completed" as const, endDate: new Date().toISOString() }
        : a
    );

    // Desactivar asignaciones previas del vehículo
    this.assignments = this.assignments.map(a => 
      a.vehicleId === request.vehicleId && a.status === "active"
        ? { ...a, status: "completed" as const, endDate: new Date().toISOString() }
        : a
    );

    // Crear nueva asignación
    const newAssignment: Assignment = {
      id: this.generateId("asgn"),
      driverId: request.driverId,
      driverName: driver.name,
      vehicleId: request.vehicleId,
      vehiclePlate: vehicle.plate,
      assignmentType: request.assignmentType,
      startDate: request.startDate,
      endDate: request.endDate,
      status: "active",
      reason: request.reason,
      createdBy: "current-user", // TODO: obtener usuario actual
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.assignments.push(newAssignment);

    // Agregar al historial
    this.history.push({
      id: this.generateId("hist"),
      action: "assigned",
      driverId: driver.id,
      driverName: driver.name,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      reason: request.reason,
      performedBy: "current-user",
      performedAt: new Date().toISOString(),
    });

    return newAssignment;
    }
    return apiClient.post<Assignment>(API_ENDPOINTS.master.assignments, request);
  }

  /**
   * Desasigna un conductor de un vehículo
   */
  async unassign(assignmentId: string, reason?: string): Promise<void> {
    if (this.useMocks) {
      await this.simulateDelay(200);

      const assignment = this.assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        throw new Error(`Asignación ${assignmentId} no encontrada`);
      }

      // Actualizar asignación
      this.assignments = this.assignments.map(a => 
        a.id === assignmentId
          ? { ...a, status: "completed" as const, endDate: new Date().toISOString() }
          : a
      );

      // Agregar al historial
      this.history.push({
        id: this.generateId("hist"),
        action: "unassigned",
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        vehicleId: assignment.vehicleId,
        vehiclePlate: assignment.vehiclePlate,
        reason,
        performedBy: "current-user",
        performedAt: new Date().toISOString(),
      });
      return;
    }
    return apiClient.delete<void>(`${API_ENDPOINTS.master.assignments}/${assignmentId}`, { params: reason ? { reason } : undefined });
  }

  /**
   * Transfiere un vehículo de un conductor a otro
   */
  async transferVehicle(
    vehicleId: string,
    newDriverId: string,
    newDriver: Driver,
    vehicle: Vehicle,
    reason?: string
  ): Promise<Assignment> {
    if (this.useMocks) {
    await this.simulateDelay(400);

    // Validar nueva asignación
    const validation = await this.validateAssignment(newDriver, vehicle);
    
    if (!validation.canAssign) {
      throw new Error(
        `No se puede transferir: ${validation.errors.map(e => e.message).join(", ")}`
      );
    }

    // Obtener asignación actual
    const currentAssignment = await this.getVehicleAssignment(vehicleId);
    
    // Completar asignación actual si existe
    if (currentAssignment) {
      this.assignments = this.assignments.map(a => 
        a.id === currentAssignment.id
          ? { ...a, status: "completed" as const, endDate: new Date().toISOString() }
          : a
      );
    }

    // Crear nueva asignación
    const newAssignment: Assignment = {
      id: this.generateId("asgn"),
      driverId: newDriverId,
      driverName: newDriver.name,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      assignmentType: "permanent",
      startDate: new Date().toISOString().split("T")[0],
      status: "active",
      reason: reason || "Transferencia de vehículo",
      createdBy: "current-user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.assignments.push(newAssignment);

    // Agregar al historial
    this.history.push({
      id: this.generateId("hist"),
      action: "transferred",
      driverId: newDriver.id,
      driverName: newDriver.name,
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      previousDriverId: currentAssignment?.driverId,
      previousDriverName: currentAssignment?.driverName,
      reason,
      performedBy: "current-user",
      performedAt: new Date().toISOString(),
    });

    return newAssignment;
    }
    return apiClient.post<Assignment>(`${API_ENDPOINTS.master.assignments}/transfer`, { vehicleId, newDriverId, reason });
  }

  /**
   * Obtiene estadísticas de asignaciones
   */
  async getStats(
    allDrivers: Driver[],
    allVehicles: Vehicle[]
  ): Promise<AssignmentStats> {
    if (this.useMocks) {
      await this.simulateDelay(100);

      const activeAssignments = this.assignments.filter(a => a.status === "active");
      
      return {
        totalAssignments: this.assignments.length,
        activeAssignments: activeAssignments.length,
        permanentAssignments: activeAssignments.filter(a => a.assignmentType === "permanent").length,
        temporaryAssignments: activeAssignments.filter(a => a.assignmentType === "temporary").length,
        driversWithVehicle: allDrivers.filter(d => d.assignedVehicleId).length,
        driversWithoutVehicle: allDrivers.filter(d => !d.assignedVehicleId && d.status === "active").length,
        vehiclesAssigned: allVehicles.filter(v => v.currentDriverId).length,
        vehiclesAvailable: allVehicles.filter(v => 
          !v.currentDriverId && 
          v.status === "active" && 
          v.operationalStatus === "operational"
        ).length,
      };
    }
    return apiClient.get<AssignmentStats>(`${API_ENDPOINTS.master.assignments}/stats`);
  }

  /**
   * Obtiene el historial de asignaciones
   */
  async getHistory(filters?: {
    driverId?: string;
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AssignmentHistory[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);

      let result = [...this.history];

      if (filters?.driverId) {
        result = result.filter(h => h.driverId === filters.driverId);
      }

      if (filters?.vehicleId) {
        result = result.filter(h => h.vehicleId === filters.vehicleId);
      }

      if (filters?.startDate) {
        result = result.filter(h => h.performedAt >= filters.startDate!);
      }

      if (filters?.endDate) {
        result = result.filter(h => h.performedAt <= filters.endDate!);
      }

      // Ordenar por fecha descendente
      result.sort((a, b) => 
        new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
      );

      return result;
    }
    return apiClient.get<AssignmentHistory[]>(`${API_ENDPOINTS.master.assignments}/history`, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene conductores compatibles para un vehículo
   */
  async getCompatibleDrivers(
    vehicle: Vehicle,
    allDrivers: Driver[]
  ): Promise<{ driver: Driver; compatibility: CompatibilityResult; eligibility: DriverEligibilityResult }[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);

      return allDrivers
        .filter(driver => driver.status === "active")
        .map(driver => ({
          driver,
          compatibility: this.validateCompatibility(driver, vehicle),
          eligibility: this.validateDriverForAssignment(driver),
        }))
        .filter(result => result.compatibility.isCompatible && result.eligibility.isEligible);
    }
    return apiClient.get<{ driver: Driver; compatibility: CompatibilityResult; eligibility: DriverEligibilityResult }[]>(`${API_ENDPOINTS.master.assignments}/compatible-drivers/${vehicle.id}`);
  }

  /**
   * Obtiene vehículos compatibles para un conductor
   */
  async getCompatibleVehicles(
    driver: Driver,
    allVehicles: Vehicle[]
  ): Promise<{ vehicle: Vehicle; compatibility: CompatibilityResult; eligibility: VehicleEligibilityResult }[]> {
    if (this.useMocks) {
      await this.simulateDelay(200);

      return allVehicles
        .filter(vehicle => vehicle.status === "active" && vehicle.operationalStatus === "operational")
        .map(vehicle => ({
          vehicle,
          compatibility: this.validateCompatibility(driver, vehicle),
          eligibility: this.validateVehicleForAssignment(vehicle),
        }))
        .filter(result => result.compatibility.isCompatible && result.eligibility.isEligible);
    }
    return apiClient.get<{ vehicle: Vehicle; compatibility: CompatibilityResult; eligibility: VehicleEligibilityResult }[]>(`${API_ENDPOINTS.master.assignments}/compatible-vehicles/${driver.id}`);
  }
}

// Singleton
export const assignmentService = new AssignmentService();

export default assignmentService;
