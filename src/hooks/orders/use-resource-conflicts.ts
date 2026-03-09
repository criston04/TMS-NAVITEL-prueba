import { useState, useEffect, useCallback, useMemo } from 'react';
import { mockOrders } from '@/mocks/orders/orders.mock';
import type { Order } from '@/types/order';

/**
 * Tipo de conflicto detectado
 */
export type ConflictType = 'vehicle' | 'driver' | 'overlap';

/**
 * Severidad del conflicto
 */
export type ConflictSeverity = 'warning' | 'error';

/**
 * Conflicto detectado
 */
export interface ResourceConflict {
  /** ID único del conflicto */
  id: string;
  
  type: ConflictType;
  /** Severidad */
  severity: ConflictSeverity;
  /** Mensaje descriptivo */
  message: string;
  /** Detalles adicionales */
  details: {
    /** ID del recurso en conflicto */
    resourceId: string;
    
    resourceName: string;
    /** ID de la orden en conflicto */
    conflictingOrderId?: string;
    /** Número de la orden en conflicto */
    conflictingOrderNumber?: string;
    /** Fecha de inicio del conflicto */
    conflictStartDate?: string;
    /** Fecha de fin del conflicto */
    conflictEndDate?: string;
  };
  /** Sugerencias de resolución */
  suggestions: string[];
}

/**
 * Parámetros para validar conflictos
 */
export interface ConflictCheckParams {
  /** ID del vehículo a asignar */
  vehicleId?: string;
  /** ID del conductor a asignar */
  driverId?: string;
  /** Fecha de inicio programada */
  startDate?: string;
  /** Fecha de fin programada */
  endDate?: string;
  /** ID de la orden actual (para excluir en edición) */
  currentOrderId?: string;
}

/**
 * Resultado del hook
 */
export interface UseResourceConflictsResult {
  /** Lista de conflictos detectados */
  conflicts: ResourceConflict[];
  /** Indica si hay conflictos críticos (errores) */
  hasErrors: boolean;
  /** Indica si hay advertencias */
  hasWarnings: boolean;
  /** Está verificando */
  isChecking: boolean;
  /** Verificar conflictos manualmente */
  checkConflicts: (params: ConflictCheckParams) => Promise<void>;
  /** Limpiar conflictos */
  clearConflicts: () => void;
}

/**
 * Verifica si dos rangos de fechas se superponen
 */
function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Genera un ID único
 */
function generateConflictId(): string {
  return `conflict-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook para detectar conflictos de recursos
 * @param initialParams - Parámetros iniciales para verificar
 * @returns Resultado con conflictos y métodos
 */
export function useResourceConflicts(
  initialParams?: ConflictCheckParams
): UseResourceConflictsResult {
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Verificar conflictos
   */
  const checkConflicts = useCallback(async (params: ConflictCheckParams) => {
    const { vehicleId, driverId, startDate, endDate, currentOrderId } = params;
    
    // Si no hay datos suficientes, no verificar
    if (!startDate || !endDate) {
      setConflicts([]);
      return;
    }

    setIsChecking(true);
    const detectedConflicts: ResourceConflict[] = [];

    try {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));

      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);

      // Obtener órdenes activas (excluyendo la actual si está en edición)
      const activeOrders = mockOrders.filter(
        (order: Order) => 
          order.id !== currentOrderId &&
          ['pending', 'assigned', 'in_transit'].includes(order.status) &&
          order.scheduledStartDate &&
          order.scheduledEndDate
      );

      // Verificar conflictos de vehículo
      if (vehicleId) {
        const vehicleConflicts = activeOrders.filter((order: Order) => {
          if (order.vehicleId !== vehicleId) return false;
          
          const orderStart = new Date(order.scheduledStartDate!);
          const orderEnd = new Date(order.scheduledEndDate!);
          
          return dateRangesOverlap(newStart, newEnd, orderStart, orderEnd);
        });

        vehicleConflicts.forEach((order: Order) => {
          detectedConflicts.push({
            id: generateConflictId(),
            type: 'vehicle',
            severity: 'error',
            message: `El vehículo ya está asignado a otra orden`,
            details: {
              resourceId: vehicleId,
              resourceName: order.vehicle?.plate || 'Vehículo',
              conflictingOrderId: order.id,
              conflictingOrderNumber: order.orderNumber,
              conflictStartDate: order.scheduledStartDate,
              conflictEndDate: order.scheduledEndDate,
            },
            suggestions: [
              'Selecciona otro vehículo disponible',
              'Cambia las fechas programadas',
              `Reprograma la orden ${order.orderNumber}`,
            ],
          });
        });
      }

      // Verificar conflictos de conductor
      if (driverId) {
        const driverConflicts = activeOrders.filter((order: Order) => {
          if (order.driverId !== driverId) return false;

          const orderStart = new Date(order.scheduledStartDate!);
          const orderEnd = new Date(order.scheduledEndDate!);

          return dateRangesOverlap(newStart, newEnd, orderStart, orderEnd);
        });

        driverConflicts.forEach((order: Order) => {
          detectedConflicts.push({
            id: generateConflictId(),
            type: 'driver',
            severity: 'error',
            message: `El conductor ya está asignado a otra orden`,
            details: {
              resourceId: driverId,
              resourceName: order.driver?.fullName || 'Conductor',
              conflictingOrderId: order.id,
              conflictingOrderNumber: order.orderNumber,
              conflictStartDate: order.scheduledStartDate,
              conflictEndDate: order.scheduledEndDate,
            },
            suggestions: [
              'Selecciona otro conductor disponible',
              'Cambia las fechas programadas',
              `Reprograma la orden ${order.orderNumber}`,
            ],
          });
        });
      }

      // Verificar superposición de fechas excesiva (advertencia)
      if (newStart > newEnd) {
        detectedConflicts.push({
          id: generateConflictId(),
          type: 'overlap',
          severity: 'error',
          message: 'La fecha de inicio es posterior a la fecha de fin',
          details: {
            resourceId: 'dates',
            resourceName: 'Fechas programadas',
          },
          suggestions: [
            'Corrige las fechas de inicio y fin',
          ],
        });
      }

      // Verificar si la fecha de inicio es en el pasado (advertencia)
      const now = new Date();
      if (newStart < now) {
        detectedConflicts.push({
          id: generateConflictId(),
          type: 'overlap',
          severity: 'warning',
          message: 'La fecha de inicio es en el pasado',
          details: {
            resourceId: 'dates',
            resourceName: 'Fecha de inicio',
          },
          suggestions: [
            'Actualiza la fecha de inicio a una fecha futura',
            'Continúa si deseas programar retroactivamente',
          ],
        });
      }

      setConflicts(detectedConflicts);
    } catch (error) {
      console.error('Error al verificar conflictos:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  /**
   * Limpiar conflictos
   */
  const clearConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  // Verificar conflictos iniciales
  useEffect(() => {
    if (
      initialParams?.vehicleId ||
      initialParams?.driverId ||
      (initialParams?.startDate && initialParams?.endDate)
    ) {
      checkConflicts(initialParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialParams?.vehicleId,
    initialParams?.driverId,
    initialParams?.startDate,
    initialParams?.endDate,
    initialParams?.currentOrderId,
  ]);

  // Calcular estados derivados
  const hasErrors = useMemo(
    () => conflicts.some(c => c.severity === 'error'),
    [conflicts]
  );

  const hasWarnings = useMemo(
    () => conflicts.some(c => c.severity === 'warning'),
    [conflicts]
  );

  return {
    conflicts,
    hasErrors,
    hasWarnings,
    isChecking,
    checkConflicts,
    clearConflicts,
  };
}

export default useResourceConflicts;
