"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { TrackedOrder, TrackedMilestone } from "@/types/monitoring";
import { trackingService } from "@/services/monitoring";

/**
 * Estado retornado por el hook
 */
export interface UseTrackedOrderState {
  /** Orden rastreada */
  order: TrackedOrder | null;
  
  milestones: TrackedMilestone[];
  /** Hito actual */
  currentMilestone: TrackedMilestone | null;
  /** Progreso de la orden (0-100) */
  progress: number;
  /** Cantidad de hitos completados */
  completedCount: number;
  
  totalCount: number;
  
  isLoading: boolean;
  /** Error si ocurrió alguno */
  error: Error | null;
}

/**
 * Acciones retornadas por el hook
 */
export interface UseTrackedOrderActions {
  /** Refresca los datos de la orden */
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener la orden rastreada de un vehículo
 * 
 * @param vehicleId - ID del vehículo
 * @returns Estado y acciones de la orden rastreada
 * 
 */
export function useTrackedOrder(
  vehicleId: string | null | undefined
): UseTrackedOrderState & UseTrackedOrderActions {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Carga la orden del vehículo
   */
  const loadOrder = useCallback(async () => {
    if (!vehicleId) {
      setOrder(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const orderData = await trackingService.getOrderByVehicle(vehicleId);
      setOrder(orderData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Error loading order"));
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  /**
   * Refresca los datos de la orden
   */
  const refresh = useCallback(async () => {
    await loadOrder();
  }, [loadOrder]);

  // Cargar orden cuando cambia el vehículo
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Derivar datos de la orden
  const milestones = useMemo(() => order?.milestones ?? [], [order]);
  
  const currentMilestone = useMemo(() => {
    if (!order) return null;
    return milestones.find(m => m.trackingStatus === "in_progress") || null;
  }, [order, milestones]);

  const completedCount = useMemo(() => {
    return milestones.filter(m => m.trackingStatus === "completed").length;
  }, [milestones]);

  const totalCount = milestones.length;

  const progress = useMemo(() => {
    if (order) return order.progress;
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  }, [order, completedCount, totalCount]);

  return useMemo(() => ({
    order,
    milestones,
    currentMilestone,
    progress,
    completedCount,
    totalCount,
    isLoading,
    error,
    refresh,
  }), [
    order,
    milestones,
    currentMilestone,
    progress,
    completedCount,
    totalCount,
    isLoading,
    error,
    refresh,
  ]);
}
