"use client";

import * as React from "react";
import { 
  Vehicle, 
  VehicleType,
  VehicleOperationalStatus 
} from "@/types/models/vehicle";
import { EntityStatus } from "@/types/common";
import { vehiclesMock } from "@/mocks/master/vehicles.mock";


export interface VehicleFilters {
  search?: string;
  status?: EntityStatus | "all";
  operationalStatus?: VehicleOperationalStatus | "all";
  type?: VehicleType | "all";
  hasDriver?: boolean;
  hasValidDocuments?: boolean;
  needsMaintenance?: boolean;
  sortBy?: "plate" | "status" | "type" | "brand" | "lastMaintenance";
  sortOrder?: "asc" | "desc";
}

export interface VehiclesState {
  vehicles: Vehicle[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface UseVehiclesOptions {
  initialFilters?: VehicleFilters;
  pageSize?: number;
  autoFetch?: boolean;
}

export interface UseVehiclesReturn extends VehiclesState {
  fetchVehicles: (filters?: VehicleFilters) => Promise<void>;
  getVehicleById: (id: string) => Promise<Vehicle | null>;
  createVehicle: (data: Partial<Vehicle>) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<Vehicle>) => Promise<Vehicle>;
  deleteVehicle: (id: string) => Promise<void>;
  bulkDeleteVehicles: (ids: string[]) => Promise<void>;
  
  // PaginaciÃ³n
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  filters: VehicleFilters;
  setFilters: (filters: VehicleFilters) => void;
  clearFilters: () => void;
  
  // SelecciÃ³n
  selectedVehicles: string[];
  selectVehicle: (id: string) => void;
  deselectVehicle: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  
  refetch: () => Promise<void>;
  getVehiclesByStatus: (status: EntityStatus) => Vehicle[];
  getVehiclesByType: (type: VehicleType) => Vehicle[];
  getAvailableVehicles: () => Vehicle[];
  getExpiringDocuments: (days: number) => Vehicle[];
  getVehiclesNeedingMaintenance: () => Vehicle[];
  searchVehicles: (query: string) => Vehicle[];
}


// Datos mock importados desde el archivo centralizado
const mockVehicles = vehiclesMock;


export function useVehicles(options: UseVehiclesOptions = {}): UseVehiclesReturn {
  const {
    initialFilters = {},
    pageSize: initialPageSize = 10,
    autoFetch = true,
  } = options;

  const [state, setState] = React.useState<VehiclesState>({
    vehicles: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: initialPageSize,
    totalPages: 1,
  });

  const [filters, setFiltersState] = React.useState<VehicleFilters>(initialFilters);

  // SelecciÃ³n
  const [selectedVehicles, setSelectedVehicles] = React.useState<string[]>([]);

  // CachÃ© de datos
  const vehiclesCache = React.useRef<Vehicle[]>(mockVehicles);

  /**
   * Simula delay de red
   */
  const simulateDelay = (ms: number = 300) => 
    new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Aplica filtros a la lista de vehÃ­culos
   */
  const applyFilters = React.useCallback((vehicles: Vehicle[], filters: VehicleFilters): Vehicle[] => {
    let result = [...vehicles];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(v => 
        v.plate.toLowerCase().includes(search) ||
        v.specs?.brand?.toLowerCase().includes(search) ||
        v.specs?.model?.toLowerCase().includes(search) ||
        v.currentDriverName?.toLowerCase().includes(search) ||
        v.specs?.chassisNumber?.toLowerCase().includes(search)
      );
    }

    // Filtro por estado
    if (filters.status && filters.status !== "all") {
      result = result.filter(v => v.status === filters.status);
    }

    // Filtro por estado operacional
    if (filters.operationalStatus && filters.operationalStatus !== "all") {
      result = result.filter(v => v.operationalStatus === filters.operationalStatus);
    }

    // Filtro por tipo
    if (filters.type && filters.type !== "all") {
      result = result.filter(v => v.type === filters.type);
    }

    // Filtro por conductor asignado
    if (filters.hasDriver !== undefined) {
      result = result.filter(v => 
        filters.hasDriver ? !!v.currentDriverId : !v.currentDriverId
      );
    }

    // Filtro por mantenimiento pendiente
    if (filters.needsMaintenance) {
      result = result.filter(v => 
        v.maintenanceSchedules?.some(s => {
          // Verificar si tiene prÃ³xima fecha o kilometraje de mantenimiento
          const hasPendingDate = s.nextDueDate && new Date(s.nextDueDate) <= new Date();
          const hasPendingMileage = s.nextDueMileage && v.currentMileage >= s.nextDueMileage;
          return hasPendingDate || hasPendingMileage;
        }) || v.operationalStatus === "maintenance"
      );
    }

    // Ordenamiento
    if (filters.sortBy) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case "plate":
            comparison = a.plate.localeCompare(b.plate);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "type":
            comparison = a.type.localeCompare(b.type);
            break;
          case "brand":
            comparison = (a.specs?.brand || "").localeCompare(b.specs?.brand || "");
            break;
          case "lastMaintenance":
            const aDate = a.maintenanceHistory?.[0]?.date || "";
            const bDate = b.maintenanceHistory?.[0]?.date || "";
            comparison = new Date(bDate).getTime() - new Date(aDate).getTime();
            break;
        }

        return filters.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, []);

  /**
   * Obtiene lista de vehÃ­culos con filtros y paginaciÃ³n
   * Usa setState funcional para garantizar acceso al estado mÃ¡s reciente
   */
  const fetchVehicles = React.useCallback(async (newFilters?: VehicleFilters) => {
    setState(prev => {
      // Iniciamos la carga
      return { ...prev, isLoading: true, error: null };
    });

    try {
      await simulateDelay(300);

      // Usamos setState funcional para acceder al estado actual
      setState(prev => {
        const currentFilters = newFilters || filters;
        const filteredVehicles = applyFilters(vehiclesCache.current, currentFilters);
        
        // PaginaciÃ³n con valores del estado actual
        const totalCount = filteredVehicles.length;
        const totalPages = Math.ceil(totalCount / prev.pageSize) || 1;
        
        // Ajustar pÃ¡gina si es necesario
        const validPage = Math.min(prev.currentPage, totalPages) || 1;
        const startIndex = (validPage - 1) * prev.pageSize;
        const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + prev.pageSize);

        return {
          ...prev,
          vehicles: paginatedVehicles,
          totalCount,
          totalPages,
          currentPage: validPage,
          isLoading: false,
        };
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al cargar vehÃ­culos",
      }));
    }
  }, [filters, applyFilters]);

  /**
   * Obtiene un vehÃ­culo por ID
   */
  const getVehicleById = React.useCallback(async (id: string): Promise<Vehicle | null> => {
    await simulateDelay(200);
    return vehiclesCache.current.find(v => v.id === id) || null;
  }, []);

  /**
   * Crea un nuevo vehÃ­culo
   */
  const createVehicle = React.useCallback(async (data: Partial<Vehicle>): Promise<Vehicle> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(500);

      // Crear nuevo vehÃ­culo con estructura adaptada
      const newVehicle = {
        id: `v${Date.now().toString(36)}`,
        plate: data.plate || "",
        type: data.type || "camion",
        bodyType: data.bodyType || "furgon",
        status: data.status || "active",
        operationalStatus: data.operationalStatus || "available",
        currentMileage: 0,
        maintenanceHistory: [],
        maintenanceSchedules: [],
        fuelHistory: [],
        incidents: [],
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Vehicle;

      vehiclesCache.current = [newVehicle, ...vehiclesCache.current];
      
      await fetchVehicles();
      
      return newVehicle;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al crear vehÃ­culo",
      }));
      throw error;
    }
  }, [fetchVehicles]);

  /**
   * Actualiza un vehÃ­culo
   */
  const updateVehicle = React.useCallback(async (id: string, data: Partial<Vehicle>): Promise<Vehicle> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(400);

      const index = vehiclesCache.current.findIndex(v => v.id === id);
      if (index === -1) {
        throw new Error(`VehÃ­culo con ID ${id} no encontrado`);
      }

      const updatedVehicle: Vehicle = {
        ...vehiclesCache.current[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      vehiclesCache.current[index] = updatedVehicle;
      
      await fetchVehicles();
      
      return updatedVehicle;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al actualizar vehÃ­culo",
      }));
      throw error;
    }
  }, [fetchVehicles]);

  /**
   * Elimina un vehÃ­culo
   */
  const deleteVehicle = React.useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(300);

      vehiclesCache.current = vehiclesCache.current.filter(v => v.id !== id);
      setSelectedVehicles(prev => prev.filter(vId => vId !== id));
      
      await fetchVehicles();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al eliminar vehÃ­culo",
      }));
      throw error;
    }
  }, [fetchVehicles]);

  /**
   * Elimina mÃºltiples vehÃ­culos
   */
  const bulkDeleteVehicles = React.useCallback(async (ids: string[]): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(500);

      vehiclesCache.current = vehiclesCache.current.filter(v => !ids.includes(v.id));
      setSelectedVehicles([]);
      
      await fetchVehicles();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al eliminar vehÃ­culos",
      }));
      throw error;
    }
  }, [fetchVehicles]);

  // PaginaciÃ³n
  const goToPage = React.useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: Math.max(1, Math.min(page, prev.totalPages)) }));
  }, []);

  const setPageSize = React.useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  const setFilters = React.useCallback((newFilters: VehicleFilters) => {
    setFiltersState(newFilters);
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFiltersState({});
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // SelecciÃ³n
  const selectVehicle = React.useCallback((id: string) => {
    setSelectedVehicles(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const deselectVehicle = React.useCallback((id: string) => {
    setSelectedVehicles(prev => prev.filter(vId => vId !== id));
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedVehicles(state.vehicles.map(v => v.id));
  }, [state.vehicles]);

  const deselectAll = React.useCallback(() => {
    setSelectedVehicles([]);
  }, []);

  const isSelected = React.useCallback((id: string) => {
    return selectedVehicles.includes(id);
  }, [selectedVehicles]);

  const refetch = React.useCallback(async () => {
    await fetchVehicles();
  }, [fetchVehicles]);

  const getVehiclesByStatus = React.useCallback((status: EntityStatus): Vehicle[] => {
    return vehiclesCache.current.filter(v => v.status === status);
  }, []);

  const getVehiclesByType = React.useCallback((type: VehicleType): Vehicle[] => {
    return vehiclesCache.current.filter(v => v.type === type);
  }, []);

  const getAvailableVehicles = React.useCallback((): Vehicle[] => {
    return vehiclesCache.current.filter(v => 
      v.status === "active" && 
      v.operationalStatus === "operational" &&
      !v.currentDriverId
    );
  }, []);

  const getExpiringDocuments = React.useCallback((days: number): Vehicle[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return vehiclesCache.current.filter(v => {
      // Check SOAT
      const soat = v.insurancePolicies?.find(p => p.type === "soat");
      if (soat) {
        const expiryDate = new Date(soat.endDate);
        if (expiryDate > today && expiryDate <= futureDate) return true;
      }

      // Check RevisiÃ³n TÃ©cnica
      if (v.currentInspection?.expiryDate) {
        const expiryDate = new Date(v.currentInspection.expiryDate);
        if (expiryDate > today && expiryDate <= futureDate) return true;
      }

      // Check Certificado de OperaciÃ³n
      if (v.operatingCertificate?.expiryDate) {
        const expiryDate = new Date(v.operatingCertificate.expiryDate);
        if (expiryDate > today && expiryDate <= futureDate) return true;
      }

      return false;
    });
  }, []);

  const getVehiclesNeedingMaintenance = React.useCallback((): Vehicle[] => {
    return vehiclesCache.current.filter(v => {
      // Check scheduled maintenance by date
      if (v.maintenanceSchedules?.some(s => 
        s.nextDueDate && new Date(s.nextDueDate) <= new Date()
      )) {
        return true;
      }

      // Check mileage-based maintenance
      if (v.maintenanceSchedules?.some(s =>
        s.nextDueMileage && v.currentMileage >= s.nextDueMileage
      )) {
        return true;
      }

      return false;
    });
  }, []);

  const searchVehicles = React.useCallback((query: string): Vehicle[] => {
    const search = query.toLowerCase();
    return vehiclesCache.current.filter(v =>
      v.plate.toLowerCase().includes(search) ||
      v.specs?.brand?.toLowerCase().includes(search) ||
      v.specs?.model?.toLowerCase().includes(search)
    );
  }, []);

  // Auto-fetch al montar
  React.useEffect(() => {
    if (autoFetch) {
      fetchVehicles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Solo en mount, no incluir fetchVehicles para evitar re-ejecuciÃ³n

  // Refetch cuando cambian filtros, pÃ¡gina o pageSize
  React.useEffect(() => {
    fetchVehicles();
  }, [filters, state.currentPage, state.pageSize, fetchVehicles]);

  return {
    ...state,
    fetchVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    bulkDeleteVehicles,
    goToPage,
    setPageSize,
    filters,
    setFilters,
    clearFilters,
    selectedVehicles,
    selectVehicle,
    deselectVehicle,
    selectAll,
    deselectAll,
    isSelected,
    refetch,
    getVehiclesByStatus,
    getVehiclesByType,
    getAvailableVehicles,
    getExpiringDocuments,
    getVehiclesNeedingMaintenance,
    searchVehicles,
  };
}

export default useVehicles;
