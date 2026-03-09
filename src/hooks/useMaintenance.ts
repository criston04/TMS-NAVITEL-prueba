'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { maintenanceService } from '@/services/maintenance';
import type {
  Vehicle,
  MaintenanceSchedule,
  WorkOrder,
  Workshop,
  Part,
  Inspection,
  Alert,
  MaintenanceMetrics,
} from '@/types/maintenance';

// ============================================================================
// TIPOS
// ============================================================================

interface UseMaintenanceState {
  isLoading: boolean;
  error: string | null;
}

interface UseMaintenanceReturn extends UseMaintenanceState {
  // --- Vehículos ---
  getVehicles: (filters?: { status?: string; type?: string; search?: string }) => Promise<Vehicle[]>;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
  createVehicle: (data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;

  // --- Mantenimiento Preventivo ---
  getMaintenanceSchedules: (vehicleId?: string) => Promise<MaintenanceSchedule[]>;
  createMaintenanceSchedule: (data: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MaintenanceSchedule>;

  // --- Órdenes de Trabajo ---
  getWorkOrders: (filters?: { vehicleId?: string; status?: string; type?: string }) => Promise<WorkOrder[]>;
  createWorkOrder: (data: Omit<WorkOrder, 'id' | 'orderNumber' | 'createdDate' | 'updatedAt'>) => Promise<WorkOrder>;

  // --- Talleres ---
  getWorkshops: (isActive?: boolean) => Promise<Workshop[]>;

  // --- Repuestos ---
  getParts: (filters?: { category?: string; lowStock?: boolean; search?: string }) => Promise<Part[]>;
  createPart: (data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Part>;

  // --- Inspecciones ---
  getInspections: (filters?: { vehicleId?: string; type?: string; status?: string }) => Promise<Inspection[]>;
  createInspection: (data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Inspection>;

  // --- Alertas ---
  getAlerts: (filters?: { type?: string; severity?: string; unreadOnly?: boolean }) => Promise<Alert[]>;
  markAlertAsRead: (id: string) => Promise<void>;

  // --- Métricas ---
  getMaintenanceMetrics: (vehicleId?: string) => Promise<MaintenanceMetrics>;

  /** Limpia el estado de error */
  clearError: () => void;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook de dominio para el módulo de Mantenimiento.
 * Encapsula todas las llamadas a maintenanceService, proporcionando:
 * - Estado de carga y error centralizado
 * - Interfaz tipada para consumo en páginas
 * - Separación page → hook → service
 *
 * Uso: Las 14 páginas de maintenance/ importan este hook
 * en lugar de importar maintenanceService directamente.
 */
export function useMaintenance(): UseMaintenanceReturn {
  const [state, setState] = useState<UseMaintenanceState>({
    isLoading: false,
    error: null,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  /** Wrapper genérico para llamadas al servicio con manejo de error */
  const withErrorHandling = useCallback(
    async <T>(operation: () => Promise<T>, showLoading = false): Promise<T> => {
      if (showLoading && mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }
      try {
        const result = await operation();
        if (showLoading && mountedRef.current) {
          setState(prev => ({ ...prev, isLoading: false }));
        }
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error en operación de mantenimiento';
        if (mountedRef.current) {
          setState({ isLoading: false, error: message });
        }
        throw err;
      }
    },
    []
  );

  // --- Vehículos ---
  const getVehicles = useCallback(
    (filters?: { status?: string; type?: string; search?: string }) =>
      withErrorHandling(() => maintenanceService.getVehicles(filters)),
    [withErrorHandling]
  );

  const getVehicleById = useCallback(
    (id: string) => withErrorHandling(() => maintenanceService.getVehicleById(id)),
    [withErrorHandling]
  );

  const createVehicle = useCallback(
    (data: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) =>
      withErrorHandling(() => maintenanceService.createVehicle(data)),
    [withErrorHandling]
  );

  const updateVehicle = useCallback(
    (id: string, data: Partial<Vehicle>) =>
      withErrorHandling(() => maintenanceService.updateVehicle(id, data)),
    [withErrorHandling]
  );

  const deleteVehicle = useCallback(
    (id: string) => withErrorHandling(() => maintenanceService.deleteVehicle(id)),
    [withErrorHandling]
  );

  // --- Mantenimiento Preventivo ---
  const getMaintenanceSchedules = useCallback(
    (vehicleId?: string) =>
      withErrorHandling(() => maintenanceService.getMaintenanceSchedules(vehicleId)),
    [withErrorHandling]
  );

  const createMaintenanceSchedule = useCallback(
    (data: Omit<MaintenanceSchedule, 'id' | 'createdAt' | 'updatedAt'>) =>
      withErrorHandling(() => maintenanceService.createMaintenanceSchedule(data)),
    [withErrorHandling]
  );

  // --- Órdenes de Trabajo ---
  const getWorkOrders = useCallback(
    (filters?: { vehicleId?: string; status?: string; type?: string }) =>
      withErrorHandling(() => maintenanceService.getWorkOrders(filters)),
    [withErrorHandling]
  );

  const createWorkOrder = useCallback(
    (data: Omit<WorkOrder, 'id' | 'orderNumber' | 'createdDate' | 'updatedAt'>) =>
      withErrorHandling(() => maintenanceService.createWorkOrder(data)),
    [withErrorHandling]
  );

  // --- Talleres ---
  const getWorkshops = useCallback(
    (isActive?: boolean) => withErrorHandling(() => maintenanceService.getWorkshops(isActive)),
    [withErrorHandling]
  );

  // --- Repuestos ---
  const getParts = useCallback(
    (filters?: { category?: string; lowStock?: boolean; search?: string }) =>
      withErrorHandling(() => maintenanceService.getParts(filters)),
    [withErrorHandling]
  );

  const createPart = useCallback(
    (data: Omit<Part, 'id' | 'createdAt' | 'updatedAt'>) =>
      withErrorHandling(() => maintenanceService.createPart(data)),
    [withErrorHandling]
  );

  // --- Inspecciones ---
  const getInspections = useCallback(
    (filters?: { vehicleId?: string; type?: string; status?: string }) =>
      withErrorHandling(() => maintenanceService.getInspections(filters)),
    [withErrorHandling]
  );

  const createInspection = useCallback(
    (data: Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>) =>
      withErrorHandling(() => maintenanceService.createInspection(data)),
    [withErrorHandling]
  );

  // --- Alertas ---
  const getAlerts = useCallback(
    (filters?: { type?: string; severity?: string; unreadOnly?: boolean }) =>
      withErrorHandling(() => maintenanceService.getAlerts(filters)),
    [withErrorHandling]
  );

  const markAlertAsRead = useCallback(
    (id: string) => withErrorHandling(() => maintenanceService.markAlertAsRead(id)),
    [withErrorHandling]
  );

  // --- Métricas ---
  const getMaintenanceMetrics = useCallback(
    (vehicleId?: string) =>
      withErrorHandling(() => maintenanceService.getMaintenanceMetrics(vehicleId)),
    [withErrorHandling]
  );

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getMaintenanceSchedules,
    createMaintenanceSchedule,
    getWorkOrders,
    createWorkOrder,
    getWorkshops,
    getParts,
    createPart,
    getInspections,
    createInspection,
    getAlerts,
    markAlertAsRead,
    getMaintenanceMetrics,
    clearError,
  };
}
