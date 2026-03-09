"use client";

import * as React from "react";
import { Driver, DriverStatus } from "@/types/models/driver";
import { driversMock } from "@/mocks/master/drivers.mock";


export interface DriverFilters {
  search?: string;
  status?: DriverStatus | "all";
  licenseType?: string;
  hasValidDocuments?: boolean;
  assignedVehicle?: boolean;
  sortBy?: "name" | "status" | "hireDate" | "licenseExpiry";
  sortOrder?: "asc" | "desc";
}

export interface DriversState {
  drivers: Driver[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface UseDriversOptions {
  initialFilters?: DriverFilters;
  pageSize?: number;
  autoFetch?: boolean;
}

export interface UseDriversReturn extends DriversState {
  fetchDrivers: (filters?: DriverFilters) => Promise<void>;
  getDriverById: (id: string) => Promise<Driver | null>;
  createDriver: (data: Partial<Driver>) => Promise<Driver>;
  updateDriver: (id: string, data: Partial<Driver>) => Promise<Driver>;
  deleteDriver: (id: string) => Promise<void>;
  bulkDeleteDrivers: (ids: string[]) => Promise<void>;
  
  // PaginaciÃ³n
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  filters: DriverFilters;
  setFilters: (filters: DriverFilters) => void;
  clearFilters: () => void;
  
  // SelecciÃ³n
  selectedDrivers: string[];
  selectDriver: (id: string) => void;
  deselectDriver: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
  
  refetch: () => Promise<void>;
  getDriversByStatus: (status: DriverStatus) => Driver[];
  getExpiringLicenses: (days: number) => Driver[];
  searchDrivers: (query: string) => Driver[];
}


// Datos mock importados desde el archivo centralizado
const mockDrivers = driversMock;


export function useDrivers(options: UseDriversOptions = {}): UseDriversReturn {
  const {
    initialFilters = {},
    pageSize: initialPageSize = 10,
    autoFetch = true,
  } = options;

  const [state, setState] = React.useState<DriversState>({
    drivers: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    pageSize: initialPageSize,
    totalPages: 1,
  });

  const [filters, setFiltersState] = React.useState<DriverFilters>(initialFilters);

  // SelecciÃ³n
  const [selectedDrivers, setSelectedDrivers] = React.useState<string[]>([]);

  // CachÃ© de datos
  const driversCache = React.useRef<Driver[]>(mockDrivers);

  /**
   * Simula delay de red
   */
  const simulateDelay = (ms: number = 300) => 
    new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Aplica filtros a la lista de conductores
   */
  const applyFilters = React.useCallback((drivers: Driver[], filters: DriverFilters): Driver[] => {
    let result = [...drivers];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(search) ||
        d.email.toLowerCase().includes(search) ||
        d.documentNumber?.toLowerCase().includes(search) ||
        d.licenseNumber?.toLowerCase().includes(search) ||
        d.phone.includes(search)
      );
    }

    // Filtro por estado
    if (filters.status && filters.status !== "all") {
      result = result.filter(d => d.status === filters.status);
    }

    // Filtro por tipo de licencia
    if (filters.licenseType) {
      result = result.filter(d => 
        d.license?.category === filters.licenseType || 
        d.licenseType === filters.licenseType
      );
    }

    // Filtro por vehÃ­culo asignado
    if (filters.assignedVehicle !== undefined) {
      result = result.filter(d => 
        filters.assignedVehicle 
          ? !!d.assignedVehicleId 
          : !d.assignedVehicleId
      );
    }

    // Ordenamiento
    if (filters.sortBy) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (filters.sortBy) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "status":
            comparison = a.status.localeCompare(b.status);
            break;
          case "hireDate":
            comparison = new Date(a.hireDate || 0).getTime() - new Date(b.hireDate || 0).getTime();
            break;
          case "licenseExpiry":
            const aExpiry = a.license?.expiryDate || a.licenseExpiry || "";
            const bExpiry = b.license?.expiryDate || b.licenseExpiry || "";
            comparison = new Date(aExpiry).getTime() - new Date(bExpiry).getTime();
            break;
        }

        return filters.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, []);

  /**
   * Obtiene lista de conductores con filtros y paginaciÃ³n
   * Usa setState funcional para garantizar acceso al estado mÃ¡s reciente
   */
  const fetchDrivers = React.useCallback(async (newFilters?: DriverFilters) => {
    setState(prev => {
      // Iniciamos la carga
      return { ...prev, isLoading: true, error: null };
    });

    try {
      await simulateDelay(300);

      // Usamos setState funcional para acceder al estado actual
      setState(prev => {
        const currentFilters = newFilters || filters;
        const filteredDrivers = applyFilters(driversCache.current, currentFilters);
        
        // PaginaciÃ³n con valores del estado actual
        const totalCount = filteredDrivers.length;
        const totalPages = Math.ceil(totalCount / prev.pageSize) || 1;
        
        // Ajustar pÃ¡gina si es necesario
        const validPage = Math.min(prev.currentPage, totalPages) || 1;
        const startIndex = (validPage - 1) * prev.pageSize;
        const paginatedDrivers = filteredDrivers.slice(startIndex, startIndex + prev.pageSize);

        return {
          ...prev,
          drivers: paginatedDrivers,
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
        error: error instanceof Error ? error.message : "Error al cargar conductores",
      }));
    }
  }, [filters, applyFilters]);

  /**
   * Obtiene un conductor por ID
   */
  const getDriverById = React.useCallback(async (id: string): Promise<Driver | null> => {
    await simulateDelay(200);
    return driversCache.current.find(d => d.id === id) || null;
  }, []);

  /**
   * Crea un nuevo conductor
   */
  const createDriver = React.useCallback(async (data: Partial<Driver>): Promise<Driver> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(500);

      const newDriver: Driver = {
        id: `drv-${Date.now().toString(36)}`,
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        status: data.status || "active",
        licenseNumber: data.licenseNumber || "",
        licenseType: data.licenseType || "",
        licenseExpiry: data.licenseExpiry || "",
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Driver;

      driversCache.current = [newDriver, ...driversCache.current];
      
      await fetchDrivers();
      
      return newDriver;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al crear conductor",
      }));
      throw error;
    }
  }, [fetchDrivers]);

  /**
   * Actualiza un conductor
   */
  const updateDriver = React.useCallback(async (id: string, data: Partial<Driver>): Promise<Driver> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(400);

      const index = driversCache.current.findIndex(d => d.id === id);
      if (index === -1) {
        throw new Error(`Conductor con ID ${id} no encontrado`);
      }

      const updatedDriver: Driver = {
        ...driversCache.current[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      driversCache.current[index] = updatedDriver;
      
      await fetchDrivers();
      
      return updatedDriver;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al actualizar conductor",
      }));
      throw error;
    }
  }, [fetchDrivers]);

  /**
   * Elimina un conductor
   */
  const deleteDriver = React.useCallback(async (id: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(300);

      driversCache.current = driversCache.current.filter(d => d.id !== id);
      setSelectedDrivers(prev => prev.filter(dId => dId !== id));
      
      await fetchDrivers();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al eliminar conductor",
      }));
      throw error;
    }
  }, [fetchDrivers]);

  /**
   * Elimina mÃºltiples conductores
   */
  const bulkDeleteDrivers = React.useCallback(async (ids: string[]): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      await simulateDelay(500);

      driversCache.current = driversCache.current.filter(d => !ids.includes(d.id));
      setSelectedDrivers([]);
      
      await fetchDrivers();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Error al eliminar conductores",
      }));
      throw error;
    }
  }, [fetchDrivers]);

  // PaginaciÃ³n
  const goToPage = React.useCallback((page: number) => {
    setState(prev => ({ ...prev, currentPage: Math.max(1, Math.min(page, prev.totalPages)) }));
  }, []);

  const setPageSize = React.useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  const setFilters = React.useCallback((newFilters: DriverFilters) => {
    setFiltersState(newFilters);
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFiltersState({});
    setState(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  // SelecciÃ³n
  const selectDriver = React.useCallback((id: string) => {
    setSelectedDrivers(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const deselectDriver = React.useCallback((id: string) => {
    setSelectedDrivers(prev => prev.filter(dId => dId !== id));
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedDrivers(state.drivers.map(d => d.id));
  }, [state.drivers]);

  const deselectAll = React.useCallback(() => {
    setSelectedDrivers([]);
  }, []);

  const isSelected = React.useCallback((id: string) => {
    return selectedDrivers.includes(id);
  }, [selectedDrivers]);

  const refetch = React.useCallback(async () => {
    await fetchDrivers();
  }, [fetchDrivers]);

  const getDriversByStatus = React.useCallback((status: DriverStatus): Driver[] => {
    return driversCache.current.filter(d => d.status === status);
  }, []);

  const getExpiringLicenses = React.useCallback((days: number): Driver[] => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return driversCache.current.filter(d => {
      const expiryDate = d.license?.expiryDate || d.licenseExpiry;
      if (!expiryDate) return false;
      const expiry = new Date(expiryDate);
      return expiry > today && expiry <= futureDate;
    });
  }, []);

  const searchDrivers = React.useCallback((query: string): Driver[] => {
    const search = query.toLowerCase();
    return driversCache.current.filter(d =>
      d.name.toLowerCase().includes(search) ||
      d.email.toLowerCase().includes(search) ||
      d.documentNumber?.toLowerCase().includes(search)
    );
  }, []);

  // Auto-fetch al montar
  React.useEffect(() => {
    if (autoFetch) {
      fetchDrivers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Solo en mount, no incluir fetchDrivers para evitar re-ejecuciÃ³n

  // Refetch cuando cambian filtros, pÃ¡gina o pageSize
  React.useEffect(() => {
    fetchDrivers();
  }, [filters, state.currentPage, state.pageSize, fetchDrivers]);

  return {
    ...state,
    fetchDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    deleteDriver,
    bulkDeleteDrivers,
    goToPage,
    setPageSize,
    filters,
    setFilters,
    clearFilters,
    selectedDrivers,
    selectDriver,
    deselectDriver,
    selectAll,
    deselectAll,
    isSelected,
    refetch,
    getDriversByStatus,
    getExpiringLicenses,
    searchDrivers,
  };
}

export default useDrivers;
