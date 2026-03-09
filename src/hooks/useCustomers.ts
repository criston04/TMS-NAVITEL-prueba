"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { 
  Customer, 
  CustomerStats, 
  CustomerFilters,
  CreateCustomerDTO,
  UpdateCustomerDTO
} from "@/types/models";
import { customersService } from "@/services/master";
import { useToast } from "@/components/ui/toast";

/**
 * Estado del hook
 */
interface UseCustomersState {
  customers: Customer[];
  stats: CustomerStats | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  error: Error | null;
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  filters: CustomerFilters;
  selectedIds: Set<string>;
  cities: string[];
}

/**
 * Opciones del hook
 */
interface UseCustomersOptions {
  initialPageSize?: number;
  autoLoad?: boolean;
}

/**
 * Retorno del hook
 */
interface UseCustomersReturn extends UseCustomersState {
  loadCustomers: () => Promise<void>;
  loadStats: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Paginación
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  setFilters: (filters: CustomerFilters) => void;
  updateFilter: <K extends keyof CustomerFilters>(key: K, value: CustomerFilters[K]) => void;
  clearFilters: () => void;
  
  createCustomer: (data: CreateCustomerDTO) => Promise<Customer | null>;
  updateCustomer: (id: string, data: UpdateCustomerDTO) => Promise<Customer | null>;
  deleteCustomer: (id: string) => Promise<boolean>;
  bulkDeleteCustomers: (ids: string[]) => Promise<{ success: number; failed: number }>;
  toggleCustomerStatus: (id: string) => Promise<Customer | null>;
  
  // Selección
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCustomers: Customer[];
  
  // Export/Import
  exportToCSV: () => Promise<void>;
  importCustomers: (customers: CreateCustomerDTO[]) => Promise<{
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  }>;
  
  findByDocument: (documentNumber: string) => Promise<Customer | null>;
}

const DEFAULT_FILTERS: CustomerFilters = {
  search: "",
  status: "all",
  type: "all",
  category: "all",
  sortBy: "name",
  sortOrder: "asc",
};

/**
 * Hook para gestión de clientes
 */
export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const { initialPageSize = 10, autoLoad = true } = options;
  const { success, error: showError } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFiltersState] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<string[]>([]);

  /**
   * Carga la lista de clientes
   */
  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await customersService.getFiltered(filters, page, pageSize);
      setCustomers(response.items);
      setTotalPages(response.pagination.totalPages);
      setTotalItems(response.pagination.totalItems);
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error cargando clientes");
      setError(e);
      console.error("[useCustomers] Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize]);

  /**
   * Carga estadísticas
   */
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);

    try {
      const statsData = await customersService.getStats();
      setStats(statsData);
    } catch (err) {
      console.error("[useCustomers] Error cargando stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  /**
   * Carga ciudades para filtro
   */
  const loadCities = useCallback(async () => {
    try {
      const citiesData = await customersService.getCities();
      setCities(citiesData);
    } catch (err) {
      console.error("[useCustomers] Error cargando ciudades:", err);
    }
  }, []);

  /**
   * Refresca todos los datos
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadCustomers(), loadStats()]);
  }, [loadCustomers, loadStats]);

  /**
   * Actualiza filtros
   */
  const setFilters = useCallback((newFilters: CustomerFilters) => {
    setFiltersState(newFilters);
    setPage(1); // Reset página al cambiar filtros
  }, []);

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = useCallback(<K extends keyof CustomerFilters>(
    key: K, 
    value: CustomerFilters[K]
  ) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  /**
   * Limpia filtros
   */
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
  }, []);

  /**
   * Crea un cliente
   */
  const createCustomer = useCallback(async (data: CreateCustomerDTO): Promise<Customer | null> => {
    try {
      const newCustomer = await customersService.createCustomer(data);
      success("Cliente creado", `${newCustomer.name} ha sido registrado correctamente`);
      await refresh();
      return newCustomer;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error creando cliente");
      showError("Error", e.message);
      return null;
    }
  }, [refresh, success, showError]);

  /**
   * Actualiza un cliente
   */
  const updateCustomer = useCallback(async (
    id: string, 
    data: UpdateCustomerDTO
  ): Promise<Customer | null> => {
    try {
      const updated = await customersService.updateCustomer(id, data);
      success("Cliente actualizado", `${updated.name} ha sido actualizado correctamente`);
      await refresh();
      return updated;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error actualizando cliente");
      showError("Error", e.message);
      return null;
    }
  }, [refresh, success, showError]);

  /**
   * Elimina un cliente
   */
  const deleteCustomer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const customer = customers.find(c => c.id === id);
      await customersService.deleteCustomer(id);
      success("Cliente eliminado", `${customer?.name || "El cliente"} ha sido eliminado`);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await refresh();
      return true;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error eliminando cliente");
      showError("Error", e.message);
      return false;
    }
  }, [customers, refresh, success, showError]);

  /**
   * Elimina múltiples clientes
   */
  const bulkDeleteCustomers = useCallback(async (ids: string[]): Promise<{
    success: number;
    failed: number;
  }> => {
    try {
      const result = await customersService.bulkDeleteCustomers(ids);
      
      // Limpiar selección de los eliminados exitosamente
      setSelectedIds(prev => {
        const next = new Set(prev);
        result.success.forEach(id => next.delete(id));
        return next;
      });

      if (result.success.length > 0 && result.failed.length === 0) {
        success(
          "Clientes eliminados", 
          `Se eliminaron ${result.success.length} cliente(s) correctamente`
        );
      } else if (result.success.length > 0 && result.failed.length > 0) {
        success(
          "Eliminación parcial", 
          `Se eliminaron ${result.success.length} cliente(s). ${result.failed.length} no se pudieron eliminar.`
        );
      } else {
        showError("Error", "No se pudo eliminar ningún cliente");
      }

      await refresh();
      return { 
        success: result.success.length, 
        failed: result.failed.length 
      };
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error en eliminación masiva");
      showError("Error", e.message);
      return { success: 0, failed: ids.length };
    }
  }, [refresh, success, showError]);

  /**
   * Cambia estado de un cliente
   */
  const toggleCustomerStatus = useCallback(async (id: string): Promise<Customer | null> => {
    try {
      const updated = await customersService.toggleStatus(id);
      const statusText = updated.status === "active" ? "activado" : "desactivado";
      success("Estado cambiado", `${updated.name} ha sido ${statusText}`);
      await refresh();
      return updated;
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error cambiando estado");
      showError("Error", e.message);
      return null;
    }
  }, [refresh, success, showError]);

  /**
   * Toggle selección de un cliente
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Selecciona todos los clientes visibles
   */
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(customers.map(c => c.id)));
  }, [customers]);

  /**
   * Limpia selección
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /**
   * Verifica si un cliente está seleccionado
   */
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  /**
   * Clientes seleccionados
   */
  const selectedCustomers = useMemo(() => {
    return customers.filter(c => selectedIds.has(c.id));
  }, [customers, selectedIds]);

  /**
   * Exporta a CSV
   */
  const exportToCSV = useCallback(async () => {
    try {
      const blob = await customersService.exportToCSV(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      success("Exportación completada", "El archivo CSV se ha descargado");
    } catch {
      showError("Error", "No se pudo exportar los clientes");
    }
  }, [filters, success, showError]);

  /**
   * Importa clientes desde CSV/Excel
   */
  const importCustomers = useCallback(async (customers: CreateCustomerDTO[]): Promise<{
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  }> => {
    try {
      const result = await customersService.importCustomers(customers);
      
      if (result.success.length > 0 && result.failed.length === 0) {
        success(
          "Importación exitosa",
          `Se importaron ${result.success.length} cliente(s) correctamente`
        );
      } else if (result.success.length > 0) {
        success(
          "Importación parcial",
          `${result.success.length} exitosos, ${result.failed.length} fallidos`
        );
      } else if (result.failed.length > 0) {
        showError("Error", "No se pudo importar ningún cliente");
      }

      await refresh();
      return {
        success: result.success.length,
        failed: result.failed.length,
        errors: result.failed,
      };
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Error en importación");
      showError("Error", e.message);
      return { success: 0, failed: customers.length, errors: [] };
    }
  }, [refresh, success, showError]);

  /**
   * Busca cliente por documento
   */
  const findByDocument = useCallback(async (documentNumber: string): Promise<Customer | null> => {
    try {
      return await customersService.findByDocument(documentNumber);
    } catch {
      return null;
    }
  }, []);

  // Cargar datos inicial
  useEffect(() => {
    if (autoLoad) {
      loadCustomers();
      loadStats();
      loadCities();
    }
  }, [autoLoad, loadCustomers, loadStats, loadCities]);

  // Recargar cuando cambian filtros o página
  useEffect(() => {
    if (autoLoad) {
      loadCustomers();
    }
  }, [filters, page, pageSize, autoLoad, loadCustomers]);

  return {
    customers,
    stats,
    isLoading,
    isLoadingStats,
    error,
    page,
    pageSize,
    totalPages,
    totalItems,
    filters,
    selectedIds,
    cities,
    
    loadCustomers,
    loadStats,
    refresh,
    setPage,
    setPageSize,
    setFilters,
    updateFilter,
    clearFilters,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    bulkDeleteCustomers,
    toggleCustomerStatus,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCustomers,
    exportToCSV,
    importCustomers,
    findByDocument,
  };
}
