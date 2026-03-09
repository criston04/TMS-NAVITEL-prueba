'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  IncidentCatalogItem,
  IncidentRecord,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatistics,
} from '@/types/incident';
import { incidentService } from '@/services/orders';

/**
 * Filtros para catálogo de incidencias
 */
interface IncidentCatalogFilters {
  /** Filtrar por categoría */
  category?: IncidentCategory;
  /** Filtrar por severidad */
  severity?: IncidentSeverity;
  /** Buscar por texto */
  search?: string;
  /** Solo activos */
  activeOnly?: boolean;
}

/**
 * Resultado del hook useIncidentCatalog
 */
interface UseIncidentCatalogResult {
  /** Items del catálogo */
  items: IncidentCatalogItem[];
  /** Items filtrados */
  filteredItems: IncidentCatalogItem[];
  
  filters: IncidentCatalogFilters;
  /** Actualiza filtros */
  setFilters: (filters: IncidentCatalogFilters) => void;
  /** Categorías disponibles */
  categories: IncidentCategory[];
  /** Severidades disponibles */
  severities: IncidentSeverity[];
  
  isLoading: boolean;
  
  error: string | null;
  /** Recarga el catálogo */
  refresh: () => Promise<void>;
  /** Obtiene item por ID */
  getItemById: (id: string) => IncidentCatalogItem | undefined;
}

/**
 * Datos para crear incidencia
 */
interface CreateIncidentData {
  type: 'catalog' | 'free_text';
  catalogItemId?: string;
  customName?: string;
  description: string;
  category?: IncidentCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  occurredAt: string;
  actionTaken: string;
  milestoneId?: string;
}

/**
 * Datos para resolver incidencia
 */
interface ResolveIncidentData {
  description: string;
  status: 'resolved' | 'unresolved';
}

/**
 * Resultado del hook useOrderIncidents
 */
interface UseOrderIncidentsResult {
  /** Incidencias de la orden */
  incidents: IncidentRecord[];
  
  totalIncidents: number;
  /** Incidencias pendientes */
  pendingIncidents: IncidentRecord[];
  /** Incidencias resueltas */
  resolvedIncidents: IncidentRecord[];
  /** Estadísticas */
  statistics: IncidentStatistics | null;
  
  isLoading: boolean;
  
  error: string | null;
  /** Crea una incidencia */
  createIncident: (data: CreateIncidentData) => Promise<IncidentRecord | null>;
  /** Resuelve una incidencia */
  resolveIncident: (
    incidentId: string,
    resolution: ResolveIncidentData
  ) => Promise<IncidentRecord | null>;
  /** Recarga las incidencias */
  refresh: () => Promise<void>;
}

/**
 * Hook para acceder al catálogo de incidencias predefinidas
 * @param initialFilters - Filtros iniciales
 * @returns Catálogo y métodos para filtrar
 */
export function useIncidentCatalog(
  initialFilters: IncidentCatalogFilters = {}
): UseIncidentCatalogResult {
  const [items, setItems] = useState<IncidentCatalogItem[]>([]);
  const [filters, setFilters] = useState<IncidentCatalogFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch del catálogo
   */
  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await incidentService.getCatalogItems();
      setItems(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Items filtrados
   */
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filtro por categoría
      if (filters.category && item.category !== filters.category) {
        return false;
      }

      // Filtro por severidad
      if (filters.severity && item.defaultSeverity !== filters.severity) {
        return false;
      }

      // Filtro por búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(searchLower);
        const matchesDescription = item.description.toLowerCase().includes(searchLower);
        const matchesCode = item.code.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription && !matchesCode) {
          return false;
        }
      }

      // Filtro por activos
      if (filters.activeOnly && item.status !== 'active') {
        return false;
      }

      return true;
    });
  }, [items, filters]);

  /**
   * Categorías disponibles
   */
  const categories = useMemo((): IncidentCategory[] => {
    return ['vehicle', 'cargo', 'route', 'driver', 'security', 'weather', 'documentation', 'other'];
  }, []);

  /**
   * Severidades disponibles
   */
  const severities = useMemo((): IncidentSeverity[] => {
    return ['low', 'medium', 'high', 'critical'];
  }, []);

  /**
   * Obtiene item por ID
   */
  const getItemById = useCallback((id: string): IncidentCatalogItem | undefined => {
    return items.find(item => item.id === id);
  }, [items]);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await fetchCatalog();
  }, [fetchCatalog]);

  // Fetch inicial
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    items,
    filteredItems,
    filters,
    setFilters,
    categories,
    severities,
    isLoading,
    error,
    refresh,
    getItemById,
  };
}

/**
 * Hook para gestionar incidencias de una orden específica
 * @param orderId - ID de la orden
 * @returns Incidencias y métodos para gestionarlas
 */
export function useOrderIncidents(orderId: string | null): UseOrderIncidentsResult {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [statistics, setStatistics] = useState<IncidentStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch de incidencias
   */
  const fetchIncidents = useCallback(async () => {
    if (!orderId) {
      setIncidents([]);
      setStatistics(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [incidentsData, statsData] = await Promise.all([
        incidentService.getOrderIncidents(orderId),
        incidentService.getStatistics({ from: '', to: '' }),
      ]);
      setIncidents(incidentsData);
      setStatistics(statsData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  /**
   * Total de incidencias
   */
  const totalIncidents = useMemo(() => {
    return incidents.length;
  }, [incidents]);

  /**
   * Incidencias pendientes
   */
  const pendingIncidents = useMemo(() => {
    return incidents.filter(i => i.resolutionStatus === 'pending' || i.resolutionStatus === 'in_progress');
  }, [incidents]);

  /**
   * Incidencias resueltas
   */
  const resolvedIncidents = useMemo(() => {
    return incidents.filter(i => i.resolutionStatus === 'resolved');
  }, [incidents]);

  /**
   * Crea incidencia
   */
  const createIncident = useCallback(async (
    data: {
      type: 'catalog' | 'free_text';
      catalogItemId?: string;
      customName?: string;
      description: string;
      category?: IncidentCategory;
      severity: 'low' | 'medium' | 'high' | 'critical';
      occurredAt: string;
      actionTaken: string;
      milestoneId?: string;
    }
  ): Promise<IncidentRecord | null> => {
    if (!orderId) return null;

    try {
      const incident = await incidentService.createIncidentRecord(orderId, data);
      await fetchIncidents(); // Recarga la lista
      return incident;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [orderId, fetchIncidents]);

  /**
   * Resuelve incidencia
   */
  const resolveIncident = useCallback(async (
    incidentId: string,
    resolution: {
      description: string;
      status: 'resolved' | 'unresolved';
    }
  ): Promise<IncidentRecord | null> => {
    if (!orderId) return null;
    
    try {
      const incident = await incidentService.resolveIncident(
        orderId,
        incidentId,
        resolution
      );
      await fetchIncidents(); // Recarga la lista
      return incident;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [orderId, fetchIncidents]);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await fetchIncidents();
  }, [fetchIncidents]);

  // Fetch inicial
  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return {
    incidents,
    totalIncidents,
    pendingIncidents,
    resolvedIncidents,
    statistics,
    isLoading,
    error,
    createIncident,
    resolveIncident,
    refresh,
  };
}

/**
 * Estado del formulario de incidencia
 */
interface IncidentFormState {
  /** ID del item del catálogo (null para texto libre) */
  catalogItemId: string | null;
  /** Descripción */
  description: string;
  /** Severidad manual */
  severity: IncidentSeverity;
  /** Evidencia */
  evidence: IncidentRecord['evidence'];
  /** Es texto libre */
  isFreeText: boolean;
}

/**
 * Resultado del hook useIncidentForm
 */
interface UseIncidentFormResult {
  
  formState: IncidentFormState;
  /** Actualiza un campo */
  updateField: <K extends keyof IncidentFormState>(key: K, value: IncidentFormState[K]) => void;
  /** Selecciona item del catálogo */
  selectCatalogItem: (item: IncidentCatalogItem | null) => void;
  /** Cambia a modo texto libre */
  switchToFreeText: () => void;
  /** Agrega evidencia */
  addEvidence: (evidence: IncidentRecord['evidence'][0]) => void;
  /** Elimina evidencia */
  removeEvidence: (index: number) => void;
  /** Resetea el formulario */
  reset: () => void;
  /** Valida el formulario */
  validate: () => { isValid: boolean; errors: string[] };
  /** Item del catálogo seleccionado */
  selectedCatalogItem: IncidentCatalogItem | null;
}

/**
 * Hook para gestionar el formulario de nueva incidencia
 * @param catalogItems - Items del catálogo para referencia
 * @returns Estado y métodos del formulario
 */
export function useIncidentForm(
  catalogItems: IncidentCatalogItem[] = []
): UseIncidentFormResult {
  const initialState: IncidentFormState = {
    catalogItemId: null,
    description: '',
    severity: 'medium',
    evidence: [],
    isFreeText: false,
  };

  const [formState, setFormState] = useState<IncidentFormState>(initialState);

  /**
   * Item seleccionado
   */
  const selectedCatalogItem = useMemo(() => {
    if (!formState.catalogItemId) return null;
    return catalogItems.find(item => item.id === formState.catalogItemId) || null;
  }, [formState.catalogItemId, catalogItems]);

  /**
   * Actualiza campo
   */
  const updateField = useCallback(<K extends keyof IncidentFormState>(
    key: K,
    value: IncidentFormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Selecciona item del catálogo
   */
  const selectCatalogItem = useCallback((item: IncidentCatalogItem | null) => {
    if (item) {
      setFormState(prev => ({
        ...prev,
        catalogItemId: item.id,
        severity: item.defaultSeverity,
        isFreeText: false,
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        catalogItemId: null,
        isFreeText: true,
      }));
    }
  }, []);

  /**
   * Cambia a texto libre
   */
  const switchToFreeText = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      catalogItemId: null,
      isFreeText: true,
    }));
  }, []);

  /**
   * Agrega evidencia
   */
  const addEvidence = useCallback((evidence: IncidentRecord['evidence'][0]) => {
    setFormState(prev => ({
      ...prev,
      evidence: [...prev.evidence, evidence],
    }));
  }, []);

  /**
   * Elimina evidencia
   */
  const removeEvidence = useCallback((index: number) => {
    setFormState(prev => ({
      ...prev,
      evidence: prev.evidence.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Resetea
   */
  const reset = useCallback(() => {
    setFormState({
      catalogItemId: null,
      description: '',
      severity: 'medium',
      evidence: [],
      isFreeText: false,
    });
  }, []);

  /**
   * Valida
   */
  const validate = useCallback((): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formState.isFreeText && !formState.catalogItemId) {
      errors.push('Seleccione un tipo de incidencia del catálogo o use texto libre');
    }

    if (!formState.description.trim()) {
      errors.push('La descripción es obligatoria');
    }

    if (formState.description.length < 10) {
      errors.push('La descripción debe tener al menos 10 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [formState]);

  return {
    formState,
    updateField,
    selectCatalogItem,
    switchToFreeText,
    addEvidence,
    removeEvidence,
    reset,
    validate,
    selectedCatalogItem,
  };
}
