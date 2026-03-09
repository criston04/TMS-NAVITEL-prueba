"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { 
  TrackedVehicle, 
  ControlTowerFilters,
  WebSocketMessage,
  PositionUpdateMessage
} from "@/types/monitoring";
import { trackingService, monitoringWebSocketService } from "@/services/monitoring";

/**
 * Opciones del hook de tracking
 */
export interface UseVehicleTrackingOptions {
  /** IDs de vehículos a rastrear */
  vehicleIds?: string[];
  /** Conectar automáticamente al WebSocket */
  autoConnect?: boolean;
  /** Filtros iniciales */
  initialFilters?: ControlTowerFilters;
  /** Callback cuando se actualiza una posición */
  onPositionUpdate?: (vehicleId: string, position: TrackedVehicle) => void;
}

/**
 * Estado retornado por el hook
 */
export interface UseVehicleTrackingState {
  /** Mapa de vehículos rastreados (vehicleId -> TrackedVehicle) */
  vehicles: Map<string, TrackedVehicle>;
  /** Lista de vehículos como array */
  vehiclesList: TrackedVehicle[];
  /** Estado de conexión WebSocket */
  isConnected: boolean;
  /** Estado de carga inicial */
  isLoading: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
  /** Vehículo seleccionado */
  selectedVehicle: TrackedVehicle | null;
  
  filters: ControlTowerFilters;
}

/**
 * Acciones retornadas por el hook
 */
export interface UseVehicleTrackingActions {
  /** Suscribirse a un vehículo */
  subscribeToVehicle: (vehicleId: string) => void;
  /** Desuscribirse de un vehículo */
  unsubscribeFromVehicle: (vehicleId: string) => void;
  /** Suscribirse a múltiples vehículos */
  subscribeToVehicles: (vehicleIds: string[]) => void;
  /** Desuscribirse de todos los vehículos */
  unsubscribeAll: () => void;
  /** Seleccionar un vehículo */
  selectVehicle: (vehicleId: string | null) => void;
  /** Centrar en un vehículo (retorna coordenadas) */
  centerOnVehicle: (vehicleId: string) => { lat: number; lng: number } | null;
  /** Actualizar filtros */
  setFilters: (filters: ControlTowerFilters) => void;
  /** Refrescar lista de vehículos */
  refresh: () => Promise<void>;
  /** Obtener lista de transportistas */
  getCarriers: () => Promise<string[]>;
  /** Conectar al WebSocket */
  connect: () => void;
  /** Desconectar del WebSocket */
  disconnect: () => void;
}

/**
 * Hook para tracking de vehículos en tiempo real
 * 
 */
export function useVehicleTracking(
  options: UseVehicleTrackingOptions = {}
): UseVehicleTrackingState & UseVehicleTrackingActions {
  const {
    vehicleIds = [],
    autoConnect = true,
    initialFilters = {},
    onPositionUpdate,
  } = options;

  const [vehicles, setVehicles] = useState<Map<string, TrackedVehicle>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ControlTowerFilters>(initialFilters);

  // Refs para handlers de WebSocket
  const onPositionUpdateRef = useRef(onPositionUpdate);
  onPositionUpdateRef.current = onPositionUpdate;

  /**
   * Carga inicial de vehículos
   */
  const loadVehicles = useCallback(async (currentFilters: ControlTowerFilters) => {
    try {
      setIsLoading(true);
      setError(null);

      const vehiclesList = await trackingService.getActiveVehicles(currentFilters);
      
      const vehiclesMap = new Map<string, TrackedVehicle>();
      vehiclesList.forEach(v => vehiclesMap.set(v.id, v));
      
      setVehicles(vehiclesMap);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error loading vehicles"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Maneja mensaje de WebSocket
   */
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === "position_update") {
      const positionMessage = message as PositionUpdateMessage;
      
      setVehicles(prev => {
        const vehicle = prev.get(positionMessage.vehicleId);
        if (!vehicle) return prev;

        const updatedVehicle: TrackedVehicle = {
          ...vehicle,
          position: positionMessage.position,
          movementStatus: positionMessage.movementStatus,
          connectionStatus: positionMessage.connectionStatus,
          speed: positionMessage.position.speed,
          lastUpdate: positionMessage.timestamp,
        };

        const newMap = new Map(prev);
        newMap.set(positionMessage.vehicleId, updatedVehicle);

        // Callback de actualización
        if (onPositionUpdateRef.current) {
          onPositionUpdateRef.current(positionMessage.vehicleId, updatedVehicle);
        }

        return newMap;
      });
    }
  }, []);

  /**
   * Conecta al WebSocket
   */
  const connect = useCallback(() => {
    monitoringWebSocketService.connect();
  }, []);

  /**
   * Desconecta del WebSocket
   */
  const disconnect = useCallback(() => {
    monitoringWebSocketService.disconnect();
  }, []);

  /**
   * Suscribe a un vehículo
   */
  const subscribeToVehicle = useCallback((vehicleId: string) => {
    monitoringWebSocketService.subscribeToVehicles([vehicleId]);
  }, []);

  /**
   * Desuscribe de un vehículo
   */
  const unsubscribeFromVehicle = useCallback((vehicleId: string) => {
    monitoringWebSocketService.unsubscribeFromVehicles([vehicleId]);
  }, []);

  /**
   * Suscribe a múltiples vehículos
   */
  const subscribeToVehicles = useCallback((ids: string[]) => {
    monitoringWebSocketService.subscribeToVehicles(ids);
  }, []);

  /**
   * Desuscribe de todos los vehículos
   */
  const unsubscribeAll = useCallback(() => {
    const subscribedIds = monitoringWebSocketService.getSubscribedVehicleIds();
    if (subscribedIds.length > 0) {
      monitoringWebSocketService.unsubscribeFromVehicles(subscribedIds);
    }
  }, []);

  /**
   * Selecciona un vehículo
   */
  const selectVehicle = useCallback((vehicleId: string | null) => {
    setSelectedVehicleId(vehicleId);
  }, []);

  /**
   * Centra en un vehículo
   */
  const centerOnVehicle = useCallback((vehicleId: string): { lat: number; lng: number } | null => {
    const vehicle = vehicles.get(vehicleId);
    if (!vehicle) return null;
    return { lat: vehicle.position.lat, lng: vehicle.position.lng };
  }, [vehicles]);

  /**
   * Actualiza filtros
   */
  const setFilters = useCallback((newFilters: ControlTowerFilters) => {
    setFiltersState(newFilters);
  }, []);

  /**
   * Refresca la lista de vehículos
   */
  const refresh = useCallback(async () => {
    await loadVehicles(filters);
  }, [loadVehicles, filters]);

  useEffect(() => {
    const unsubscribeMessage = monitoringWebSocketService.onMessage(handleWebSocketMessage);
    
    const unsubscribeConnect = monitoringWebSocketService.onConnect(() => {
      setIsConnected(true);
      // Suscribirse a todos los vehículos cargados
      const ids = Array.from(vehicles.keys());
      if (ids.length > 0) {
        monitoringWebSocketService.subscribeToVehicles(ids);
      }
    });
    
    const unsubscribeDisconnect = monitoringWebSocketService.onDisconnect(() => {
      setIsConnected(false);
    });

    return () => {
      unsubscribeMessage();
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [handleWebSocketMessage, vehicles]);

  // Conectar automáticamente
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect]);

  // Cargar vehículos cuando cambian los filtros
  useEffect(() => {
    loadVehicles(filters);
  }, [filters, loadVehicles]);

  // Suscribirse a vehículos iniciales
  useEffect(() => {
    if (vehicleIds.length > 0 && isConnected) {
      subscribeToVehicles(vehicleIds);
    }
  }, [vehicleIds, isConnected, subscribeToVehicles]);

  // Auto-suscribir a todos los vehículos cargados cuando hay conexión
  useEffect(() => {
    if (!isConnected || vehicles.size === 0) return;
    
    const allIds = Array.from(vehicles.keys());
    const subscribedIds = new Set(monitoringWebSocketService.getSubscribedVehicleIds());
    
    // Solo suscribir los que no están suscritos
    const newIds = allIds.filter(id => !subscribedIds.has(id));
    if (newIds.length > 0) {
      console.log("[Tracking] Auto-subscribing to", newIds.length, "vehicles");
      monitoringWebSocketService.subscribeToVehicles(newIds);
    }
  }, [isConnected, vehicles]);

  // Nota: La simulación de movimiento se realiza exclusivamente en el WebSocket mock
  // (monitoringWebSocketService) para evitar conflictos de actualización duplicada.
  // Ver: services/monitoring/websocket.service.ts → startMockSimulation()

  // Derivar datos
  const vehiclesList = useMemo(() => Array.from(vehicles.values()), [vehicles]);

  /** Obtiene la lista de transportistas desde el servicio */
  const getCarriers = useCallback(async (): Promise<string[]> => {
    return trackingService.getCarriers();
  }, []);
  
  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.get(selectedVehicleId) || null;
  }, [selectedVehicleId, vehicles]);

  return useMemo(() => ({
    vehicles,
    vehiclesList,
    isConnected,
    isLoading,
    error,
    selectedVehicle,
    filters,
    subscribeToVehicle,
    unsubscribeFromVehicle,
    subscribeToVehicles,
    unsubscribeAll,
    selectVehicle,
    centerOnVehicle,
    setFilters,
    refresh,
    getCarriers,
    connect,
    disconnect,
  }), [
    vehicles,
    vehiclesList,
    isConnected,
    isLoading,
    error,
    selectedVehicle,
    filters,
    subscribeToVehicle,
    unsubscribeFromVehicle,
    subscribeToVehicles,
    unsubscribeAll,
    selectVehicle,
    centerOnVehicle,
    setFilters,
    refresh,
    getCarriers,
    connect,
    disconnect,
  ]);
}
