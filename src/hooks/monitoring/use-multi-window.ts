"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { VehiclePanel, MultiWindowGridConfig, PanelPosition } from "@/types/monitoring";

/**
 * Clave de localStorage para persistencia
 */
const STORAGE_KEY = "tms-navitel-multi-window-panels";

/**
 * Opciones del hook de multiventana
 */
export interface UseMultiWindowOptions {
  /** Máximo de paneles permitidos (default: 20) */
  maxPanels?: number;
  /** Persistir selección en localStorage */
  persist?: boolean;
}

/**
 * Estado retornado por el hook
 */
export interface UseMultiWindowState {
  /** Lista de paneles activos */
  panels: VehiclePanel[];
  /** Configuración del grid */
  gridConfig: MultiWindowGridConfig;
  /** Cantidad de paneles activos */
  panelCount: number;
  /** Si se alcanzó el límite de paneles */
  isAtLimit: boolean;
}

/**
 * Acciones retornadas por el hook
 */
export interface UseMultiWindowActions {
  /** Agrega un panel */
  addPanel: (vehicleId: string, vehiclePlate: string) => boolean;
  /** Agrega múltiples paneles */
  addPanels: (vehicles: Array<{ vehicleId: string; vehiclePlate: string }>) => number;
  /** Remueve un panel */
  removePanel: (panelId: string) => void;
  /** Remueve un panel por vehicleId */
  removePanelByVehicle: (vehicleId: string) => void;
  /** Reordena los paneles */
  reorderPanels: (startIndex: number, endIndex: number) => void;
  /** Limpia todos los paneles */
  clearAllPanels: () => void;
  /** Verifica si un vehículo ya tiene panel */
  hasPanel: (vehicleId: string) => boolean;
  /** Cambia el layout del grid */
  setLayout: (layout: MultiWindowGridConfig["layout"]) => void;
}

/**
 * Calcula la configuración del grid según la cantidad de paneles
 */
function calculateGridConfig(panelCount: number, maxPanels: number): MultiWindowGridConfig {
  let columns: number;
  let rows: number;
  let layout: MultiWindowGridConfig["layout"];

  if (panelCount <= 4) {
    columns = 2;
    rows = 2;
    layout = "2x2";
  } else if (panelCount <= 9) {
    columns = 3;
    rows = 3;
    layout = "3x3";
  } else if (panelCount <= 16) {
    columns = 4;
    rows = 4;
    layout = "4x4";
  } else {
    columns = 5;
    rows = 4;
    layout = "5x4";
  }

  return { columns, rows, layout, maxPanels };
}

/**
 * Calcula la posición de un panel en el grid
 */
function calculatePanelPosition(index: number, columns: number): PanelPosition {
  return {
    row: Math.floor(index / columns),
    col: index % columns,
  };
}

/**
 * Hook para gestión de multiventana
 * 
 */
export function useMultiWindow(
  options: UseMultiWindowOptions = {}
): UseMultiWindowState & UseMultiWindowActions {
  const {
    maxPanels = 20,
    persist = true,
  } = options;

  const [panels, setPanels] = useState<VehiclePanel[]>([]);
  const [manualLayout, setManualLayout] = useState<MultiWindowGridConfig["layout"] | null>(null);

  /**
   * Carga paneles desde localStorage
   */
  useEffect(() => {
    if (!persist) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedPanels = JSON.parse(stored) as VehiclePanel[];
        setPanels(parsedPanels.slice(0, maxPanels));
      }
    } catch (error) {
      console.error("Error loading panels from localStorage:", error);
    }
  }, [persist, maxPanels]);

  /**
   * Guarda paneles en localStorage
   */
  useEffect(() => {
    if (!persist) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(panels));
    } catch (error) {
      console.error("Error saving panels to localStorage:", error);
    }
  }, [panels, persist]);

  /**
   * Calcula configuración del grid
   */
  const gridConfig = useMemo(() => {
    const config = calculateGridConfig(panels.length, maxPanels);
    if (manualLayout) {
      // Usar layout manual si está definido
      const layoutMap: Record<string, { columns: number; rows: number }> = {
        "2x2": { columns: 2, rows: 2 },
        "3x3": { columns: 3, rows: 3 },
        "4x4": { columns: 4, rows: 4 },
        "5x4": { columns: 5, rows: 4 },
        "auto": { columns: config.columns, rows: config.rows },
      };
      const layoutConfig = layoutMap[manualLayout];
      return { ...config, ...layoutConfig, layout: manualLayout };
    }
    return config;
  }, [panels.length, maxPanels, manualLayout]);

  /**
   * Verifica si un vehículo ya tiene panel
   */
  const hasPanel = useCallback((vehicleId: string): boolean => {
    return panels.some(p => p.vehicleId === vehicleId);
  }, [panels]);

  /**
   * Agrega un panel
   */
  const addPanel = useCallback((vehicleId: string, vehiclePlate: string): boolean => {
    if (panels.length >= maxPanels) {
      return false;
    }

    if (hasPanel(vehicleId)) {
      return false;
    }

    const position = calculatePanelPosition(panels.length, gridConfig.columns);
    
    const newPanel: VehiclePanel = {
      id: `panel-${Date.now()}-${vehicleId}`,
      vehicleId,
      vehiclePlate,
      position,
      isActive: true,
      addedAt: new Date().toISOString(),
    };

    setPanels(prev => [...prev, newPanel]);
    return true;
  }, [panels.length, maxPanels, hasPanel, gridConfig.columns]);

  /**
   * Agrega múltiples paneles
   */
  const addPanels = useCallback((
    vehicles: Array<{ vehicleId: string; vehiclePlate: string }>
  ): number => {
    let addedCount = 0;
    
    setPanels(prev => {
      const newPanels = [...prev];
      
      for (const vehicle of vehicles) {
        if (newPanels.length >= maxPanels) break;
        if (newPanels.some(p => p.vehicleId === vehicle.vehicleId)) continue;
        
        const position = calculatePanelPosition(newPanels.length, gridConfig.columns);
        
        newPanels.push({
          id: `panel-${Date.now()}-${vehicle.vehicleId}-${addedCount}`,
          vehicleId: vehicle.vehicleId,
          vehiclePlate: vehicle.vehiclePlate,
          position,
          isActive: true,
          addedAt: new Date().toISOString(),
        });
        
        addedCount++;
      }
      
      return newPanels;
    });
    
    return addedCount;
  }, [maxPanels, gridConfig.columns]);

  /**
   * Remueve un panel
   */
  const removePanel = useCallback((panelId: string) => {
    setPanels(prev => {
      const filtered = prev.filter(p => p.id !== panelId);
      // Recalcular posiciones
      return filtered.map((panel, index) => ({
        ...panel,
        position: calculatePanelPosition(index, gridConfig.columns),
      }));
    });
  }, [gridConfig.columns]);

  /**
   * Remueve un panel por vehicleId
   */
  const removePanelByVehicle = useCallback((vehicleId: string) => {
    setPanels(prev => {
      const filtered = prev.filter(p => p.vehicleId !== vehicleId);
      return filtered.map((panel, index) => ({
        ...panel,
        position: calculatePanelPosition(index, gridConfig.columns),
      }));
    });
  }, [gridConfig.columns]);

  /**
   * Reordena los paneles
   */
  const reorderPanels = useCallback((startIndex: number, endIndex: number) => {
    setPanels(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      
      // Recalcular posiciones
      return result.map((panel, index) => ({
        ...panel,
        position: calculatePanelPosition(index, gridConfig.columns),
      }));
    });
  }, [gridConfig.columns]);

  /**
   * Limpia todos los paneles
   */
  const clearAllPanels = useCallback(() => {
    setPanels([]);
  }, []);

  /**
   * Cambia el layout del grid
   */
  const setLayout = useCallback((layout: MultiWindowGridConfig["layout"]) => {
    setManualLayout(layout === "auto" ? null : layout);
  }, []);

  // Derivar datos
  const panelCount = panels.length;
  const isAtLimit = panelCount >= maxPanels;

  return useMemo(() => ({
    panels,
    gridConfig,
    panelCount,
    isAtLimit,
    addPanel,
    addPanels,
    removePanel,
    removePanelByVehicle,
    reorderPanels,
    clearAllPanels,
    hasPanel,
    setLayout,
  }), [
    panels,
    gridConfig,
    panelCount,
    isAtLimit,
    addPanel,
    addPanels,
    removePanel,
    removePanelByVehicle,
    reorderPanels,
    clearAllPanels,
    hasPanel,
    setLayout,
  ]);
}
