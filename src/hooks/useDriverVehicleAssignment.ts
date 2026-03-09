"use client";

import * as React from "react";
import { Driver } from "@/types/models/driver";
import { Vehicle } from "@/types/models/vehicle";
import { 
  assignmentService, 
  Assignment, 
  AssignmentRequest,
  AssignmentValidationResult,
  AssignmentStats,
  AssignmentHistory,
} from "@/services/master/assignment.service";


export interface UseAssignmentOptions {
  autoLoad?: boolean;
  drivers?: Driver[];
  vehicles?: Vehicle[];
}

export interface UseAssignmentReturn {
  assignments: Assignment[];
  isLoading: boolean;
  error: string | null;
  stats: AssignmentStats | null;

  loadAssignments: () => Promise<void>;
  createAssignment: (request: AssignmentRequest) => Promise<Assignment>;
  unassign: (assignmentId: string, reason?: string) => Promise<void>;
  transferVehicle: (vehicleId: string, newDriverId: string, reason?: string) => Promise<Assignment>;

  validateAssignment: (driverId: string, vehicleId: string) => Promise<AssignmentValidationResult | null>;
  lastValidation: AssignmentValidationResult | null;
  isValidating: boolean;

  // Consultas
  getDriverAssignment: (driverId: string) => Promise<Assignment | null>;
  getVehicleAssignment: (vehicleId: string) => Promise<Assignment | null>;
  getCompatibleDrivers: (vehicleId: string) => Promise<{ driver: Driver; isCompatible: boolean; isEligible: boolean }[]>;
  getCompatibleVehicles: (driverId: string) => Promise<{ vehicle: Vehicle; isCompatible: boolean; isEligible: boolean }[]>;

  // Historial
  history: AssignmentHistory[];
  loadHistory: (filters?: { driverId?: string; vehicleId?: string }) => Promise<void>;

  refreshStats: () => Promise<void>;
  clearError: () => void;
}


export function useDriverVehicleAssignment(
  options: UseAssignmentOptions = {}
): UseAssignmentReturn {
  const { autoLoad = true, drivers = [], vehicles = [] } = options;

  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [history, setHistory] = React.useState<AssignmentHistory[]>([]);
  const [stats, setStats] = React.useState<AssignmentStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isValidating, setIsValidating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastValidation, setLastValidation] = React.useState<AssignmentValidationResult | null>(null);

  // Referencias para datos actuales
  const driversRef = React.useRef<Driver[]>(drivers);
  const vehiclesRef = React.useRef<Vehicle[]>(vehicles);

  // Actualizar referencias cuando cambian los datos
  React.useEffect(() => {
    driversRef.current = drivers;
  }, [drivers]);

  React.useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  /**
   * Obtiene un conductor por ID
   */
  const getDriverById = React.useCallback((id: string): Driver | null => {
    return driversRef.current.find(d => d.id === id) || null;
  }, []);

  /**
   * Obtiene un vehículo por ID
   */
  const getVehicleById = React.useCallback((id: string): Vehicle | null => {
    return vehiclesRef.current.find(v => v.id === id) || null;
  }, []);

  /**
   * Carga las asignaciones
   */
  const loadAssignments = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await assignmentService.getAssignments({ status: "active" });
      setAssignments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar asignaciones");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Valida una asignación
   */
  const validateAssignment = React.useCallback(async (
    driverId: string,
    vehicleId: string
  ): Promise<AssignmentValidationResult | null> => {
    const driver = getDriverById(driverId);
    const vehicle = getVehicleById(vehicleId);

    if (!driver || !vehicle) {
      setError("Conductor o vehículo no encontrado");
      return null;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await assignmentService.validateAssignment(driver, vehicle);
      setLastValidation(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al validar asignación");
      return null;
    } finally {
      setIsValidating(false);
    }
  }, [getDriverById, getVehicleById]);

  /**
   * Crea una asignación
   */
  const createAssignment = React.useCallback(async (
    request: AssignmentRequest
  ): Promise<Assignment> => {
    const driver = getDriverById(request.driverId);
    const vehicle = getVehicleById(request.vehicleId);

    if (!driver || !vehicle) {
      throw new Error("Conductor o vehículo no encontrado");
    }

    setIsLoading(true);
    setError(null);

    try {
      const assignment = await assignmentService.createAssignment(request, driver, vehicle);
      await loadAssignments();
      await refreshStats();
      return assignment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear asignación";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getDriverById, getVehicleById, loadAssignments]);

  /**
   * Desasigna un conductor de un vehículo
   */
  const unassign = React.useCallback(async (
    assignmentId: string,
    reason?: string
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await assignmentService.unassign(assignmentId, reason);
      await loadAssignments();
      await refreshStats();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al desasignar";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [loadAssignments]);

  /**
   * Transfiere un vehículo a otro conductor
   */
  const transferVehicle = React.useCallback(async (
    vehicleId: string,
    newDriverId: string,
    reason?: string
  ): Promise<Assignment> => {
    const driver = getDriverById(newDriverId);
    const vehicle = getVehicleById(vehicleId);

    if (!driver || !vehicle) {
      throw new Error("Conductor o vehículo no encontrado");
    }

    setIsLoading(true);
    setError(null);

    try {
      const assignment = await assignmentService.transferVehicle(
        vehicleId,
        newDriverId,
        driver,
        vehicle,
        reason
      );
      await loadAssignments();
      await refreshStats();
      return assignment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al transferir vehículo";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getDriverById, getVehicleById, loadAssignments]);

  /**
   * Obtiene la asignación de un conductor
   */
  const getDriverAssignment = React.useCallback(async (
    driverId: string
  ): Promise<Assignment | null> => {
    try {
      return await assignmentService.getDriverAssignment(driverId);
    } catch (err) {
      console.error("Error al obtener asignación del conductor:", err);
      return null;
    }
  }, []);

  /**
   * Obtiene la asignación de un vehículo
   */
  const getVehicleAssignment = React.useCallback(async (
    vehicleId: string
  ): Promise<Assignment | null> => {
    try {
      return await assignmentService.getVehicleAssignment(vehicleId);
    } catch (err) {
      console.error("Error al obtener asignación del vehículo:", err);
      return null;
    }
  }, []);

  /**
   * Obtiene conductores compatibles para un vehículo
   */
  const getCompatibleDrivers = React.useCallback(async (
    vehicleId: string
  ): Promise<{ driver: Driver; isCompatible: boolean; isEligible: boolean }[]> => {
    const vehicle = getVehicleById(vehicleId);
    if (!vehicle) return [];

    try {
      const result = await assignmentService.getCompatibleDrivers(vehicle, driversRef.current);
      return result.map(r => ({
        driver: r.driver,
        isCompatible: r.compatibility.isCompatible,
        isEligible: r.eligibility.isEligible,
      }));
    } catch (err) {
      console.error("Error al obtener conductores compatibles:", err);
      return [];
    }
  }, [getVehicleById]);

  /**
   * Obtiene vehículos compatibles para un conductor
   */
  const getCompatibleVehicles = React.useCallback(async (
    driverId: string
  ): Promise<{ vehicle: Vehicle; isCompatible: boolean; isEligible: boolean }[]> => {
    const driver = getDriverById(driverId);
    if (!driver) return [];

    try {
      const result = await assignmentService.getCompatibleVehicles(driver, vehiclesRef.current);
      return result.map(r => ({
        vehicle: r.vehicle,
        isCompatible: r.compatibility.isCompatible,
        isEligible: r.eligibility.isEligible,
      }));
    } catch (err) {
      console.error("Error al obtener vehículos compatibles:", err);
      return [];
    }
  }, [getDriverById]);

  /**
   * Carga el historial de asignaciones
   */
  const loadHistory = React.useCallback(async (filters?: {
    driverId?: string;
    vehicleId?: string;
  }) => {
    try {
      const data = await assignmentService.getHistory(filters);
      setHistory(data);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    }
  }, []);

  /**
   * Actualiza las estadísticas
   */
  const refreshStats = React.useCallback(async () => {
    try {
      const data = await assignmentService.getStats(driversRef.current, vehiclesRef.current);
      setStats(data);
    } catch (err) {
      console.error("Error al obtener estadísticas:", err);
    }
  }, []);

  /**
   * Limpia el error
   */
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  // Auto-load
  React.useEffect(() => {
    if (autoLoad) {
      loadAssignments();
      refreshStats();
    }
  }, [autoLoad, loadAssignments, refreshStats]);

  return {
    assignments,
    isLoading,
    error,
    stats,
    loadAssignments,
    createAssignment,
    unassign,
    transferVehicle,
    validateAssignment,
    lastValidation,
    isValidating,
    getDriverAssignment,
    getVehicleAssignment,
    getCompatibleDrivers,
    getCompatibleVehicles,
    history,
    loadHistory,
    refreshStats,
    clearError,
  };
}

export default useDriverVehicleAssignment;
