import { Driver } from "@/types/models/driver";
import { Vehicle, VehicleType } from "@/types/models/vehicle";
import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import { masterEvents } from "@/services/integration/master-events";

/**
 * ⚠️ MÓDULO COMPLETO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * Ningún endpoint de `/master/assignments/*` está documentado en el Excel
 * oficial NI implementado en producción (la mayoría devuelven 404; el POST raíz
 * devuelve 500 con shape desconocido).
 *
 * Sin embargo, ESTE MÓDULO ES NECESARIO para el frontend: la UI usa
 * `useDriverVehicleAssignment` para mostrar y gestionar las asignaciones
 * driver↔vehicle (página de drivers detail, vehicles detail, orders detail).
 *
 * El backend debe implementar todo este módulo. Mientras tanto:
 *  - Los métodos siguen llamando a los paths esperados (`/master/assignments`).
 *  - Los hooks consumidores deben manejar el error 404 mostrando estado
 *    "funcionalidad pendiente" (usar `isBackendNotImplemented` del helper).
 *  - La UI NO debe crashear al recibir 404.
 *
 * Cuando el backend implemente, este service debería funcionar sin cambios
 * (los paths ya están alineados a lo que esperamos).
 *
 * Ver `otros/docs-backend/...-assignments-...` para detalle del contrato.
 */


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


class AssignmentService {
  constructor() {}

  /**
   * Valida una asignación completa
   */
  async validateAssignment(
    driver: Driver,
    vehicle: Vehicle
  ): Promise<AssignmentValidationResult> {
    return apiClient.post<AssignmentValidationResult>(`${API_ENDPOINTS.master.assignments}/validate`, { driverId: driver.id, vehicleId: vehicle.id });
  }

  /**
   * Obtiene todas las asignaciones
   */
  async getAssignments(filters?: { status?: string; type?: string }): Promise<Assignment[]> {
    return apiClient.get<Assignment[]>(API_ENDPOINTS.master.assignments, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene una asignación por ID
   */
  async getAssignmentById(id: string): Promise<Assignment | null> {
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/${id}`);
  }

  /**
   * Obtiene la asignación activa de un conductor
   */
  async getDriverAssignment(driverId: string): Promise<Assignment | null> {
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/by-driver/${driverId}`);
  }

  /**
   * Obtiene la asignación activa de un vehículo
   */
  async getVehicleAssignment(vehicleId: string): Promise<Assignment | null> {
    return apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/by-vehicle/${vehicleId}`);
  }

  /**
   * Crea una nueva asignación.
   * 2026-05-05: emite evento al bus para que ordenes activas con ese
   * driver/vehicle se enteren del cambio.
   */
  async createAssignment(
    request: AssignmentRequest,
    driver: Driver,
    vehicle: Vehicle
  ): Promise<Assignment> {
    const assignment = await apiClient.post<Assignment>(API_ENDPOINTS.master.assignments, request);

    masterEvents.driverAssigned({
      assignmentId: assignment.id,
      driverId: driver.id,
      driverName: [driver.firstName, driver.lastName].filter(Boolean).join(" ").trim(),
      vehicleId: vehicle.id,
      vehiclePlate: vehicle.plate,
      startDate: request.startDate ?? new Date().toISOString(),
      endDate: request.endDate,
    });

    return assignment;
  }

  /**
   * Desasigna un conductor de un vehículo.
   * 2026-05-05: emite evento al bus tras un unassign exitoso.
   */
  async unassign(assignmentId: string, reason?: string): Promise<void> {
    // Capturar info de la asignacion antes de borrarla para emitir el evento
    let driverId: string | undefined;
    let vehicleId: string | undefined;
    try {
      const before = await apiClient.get<Assignment | null>(`${API_ENDPOINTS.master.assignments}/${assignmentId}`);
      driverId = before?.driverId;
      vehicleId = before?.vehicleId;
    } catch {
      // si el read falla seguimos con el delete; el evento queda sin ids
    }

    await apiClient.delete<void>(`${API_ENDPOINTS.master.assignments}/${assignmentId}`, { params: reason ? { reason } : undefined });

    if (driverId && vehicleId) {
      masterEvents.driverUnassigned({ assignmentId, driverId, vehicleId });
    }
  }

  /**
   * Transfiere un vehículo de un conductor a otro
   */
  async transferVehicle(
    vehicleId: string,
    newDriverId: string,
    _newDriver: Driver,
    _vehicle: Vehicle,
    reason?: string
  ): Promise<Assignment> {
    void _newDriver;
    void _vehicle;
    return apiClient.post<Assignment>(`${API_ENDPOINTS.master.assignments}/transfer`, { vehicleId, newDriverId, reason });
  }

  /**
   * Obtiene estadísticas de asignaciones
   */
  async getStats(
    _allDrivers: Driver[],
    _allVehicles: Vehicle[]
  ): Promise<AssignmentStats> {
    void _allDrivers;
    void _allVehicles;
    // BUG #1 backend: /stats devuelve 404 porque el router resuelve /:id antes.
    // Adicionalmente /master/assignments puede no estar implementado todavía.
    try {
      return await apiClient.get<AssignmentStats>(`${API_ENDPOINTS.master.assignments}/stats`);
    } catch (err) {
      if ((err as { status?: number })?.status === 404) {
        console.warn("[assignmentService.getStats] backend 404. Retornando stats vacios.");
        return {
          totalAssignments: 0,
          activeAssignments: 0,
          permanentAssignments: 0,
          temporaryAssignments: 0,
          driversWithVehicle: 0,
          driversWithoutVehicle: 0,
          vehiclesAssigned: 0,
          vehiclesAvailable: 0,
        };
      }
      throw err;
    }
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
    return apiClient.get<AssignmentHistory[]>(`${API_ENDPOINTS.master.assignments}/history`, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene conductores compatibles para un vehículo
   */
  async getCompatibleDrivers(
    vehicle: Vehicle,
    _allDrivers: Driver[]
  ): Promise<{ driver: Driver; compatibility: CompatibilityResult; eligibility: DriverEligibilityResult }[]> {
    void _allDrivers;
    return apiClient.get<{ driver: Driver; compatibility: CompatibilityResult; eligibility: DriverEligibilityResult }[]>(`${API_ENDPOINTS.master.assignments}/compatible-drivers/${vehicle.id}`);
  }

  /**
   * Obtiene vehículos compatibles para un conductor
   */
  async getCompatibleVehicles(
    driver: Driver,
    _allVehicles: Vehicle[]
  ): Promise<{ vehicle: Vehicle; compatibility: CompatibilityResult; eligibility: VehicleEligibilityResult }[]> {
    void _allVehicles;
    return apiClient.get<{ vehicle: Vehicle; compatibility: CompatibilityResult; eligibility: VehicleEligibilityResult }[]>(`${API_ENDPOINTS.master.assignments}/compatible-vehicles/${driver.id}`);
  }
}

// Singleton
export const assignmentService = new AssignmentService();

export default assignmentService;
