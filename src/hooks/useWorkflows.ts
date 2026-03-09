'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Workflow, WorkflowProgress } from '@/types/workflow';
import type { Order } from '@/types/order';
import { unifiedWorkflowService } from '@/services/workflow.service';

/**
 * Resultado del hook useWorkflows
 */
interface UseWorkflowsResult {
  /** Lista de workflows disponibles */
  workflows: Workflow[];
  /** Workflow activos solamente */
  activeWorkflows: Workflow[];
  /** Workflow por defecto */
  defaultWorkflow: Workflow | null;
  
  isLoading: boolean;
  
  error: string | null;
  /** Obtiene workflows para un cliente específico */
  getWorkflowsForCustomer: (customerId: string) => Promise<Workflow[]>;
  /** Sugiere workflow basado en cliente y tipo de carga */
  suggestWorkflow: (customerId: string, cargoType?: string) => Promise<Workflow | null>;
  /** Recarga los workflows */
  refresh: () => Promise<void>;
}

/**
 * Resultado del hook useWorkflowProgress
 */
interface UseWorkflowProgressResult {
  /** Progreso del workflow */
  progress: WorkflowProgress | null;
  /** Siguiente paso */
  nextStep: Workflow['steps'][0] | null;
  /** Porcentaje completado (0-100) */
  percentComplete: number;
  
  isLoading: boolean;
  
  error: string | null;
  /** Recarga el progreso */
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener la lista de workflows disponibles
 * Usa el servicio unificado que conecta con geocercas, órdenes y programación
 * @param options - Opciones del hook
 * @returns Lista de workflows y métodos
 */
export function useWorkflows(
  options: { autoFetch?: boolean } = {}
): UseWorkflowsResult {
  const { autoFetch = true } = options;

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch de workflows usando servicio unificado
   */
  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await unifiedWorkflowService.getAll();
      setWorkflows(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Workflows activos
   */
  const activeWorkflows = useMemo(() => {
    return workflows.filter(w => w.status === 'active');
  }, [workflows]);

  /**
   * Workflow por defecto
   */
  const defaultWorkflow = useMemo(() => {
    return workflows.find(w => w.isDefault) ?? null;
  }, [workflows]);

  /**
   * Obtiene workflows para un cliente específico
   */
  const getWorkflowsForCustomer = useCallback(async (customerId: string): Promise<Workflow[]> => {
    return unifiedWorkflowService.getWorkflowsForCustomer(customerId);
  }, []);

  /**
   * Sugiere workflow basado en cliente y tipo de carga
   */
  const suggestWorkflow = useCallback(async (
    customerId: string, 
    cargoType?: string
  ): Promise<Workflow | null> => {
    return unifiedWorkflowService.suggestWorkflowForOrder(customerId, cargoType);
  }, []);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await fetchWorkflows();
  }, [fetchWorkflows]);

  // Fetch inicial
  useEffect(() => {
    if (autoFetch) {
      fetchWorkflows();
    }
  }, [autoFetch, fetchWorkflows]);

  return {
    workflows,
    activeWorkflows,
    defaultWorkflow,
    isLoading,
    error,
    getWorkflowsForCustomer,
    suggestWorkflow,
    refresh,
  };
}

/**
 * Hook para obtener y seguir el progreso de un workflow en una orden
 * Usa el servicio unificado para tracking de progreso
 * @param order - Orden para calcular progreso
 * @returns Progreso del workflow
 */
export function useWorkflowProgress(order: Order | null): UseWorkflowProgressResult {
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [nextStep, setNextStep] = useState<Workflow['steps'][0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calcula el progreso usando servicio unificado
   */
  const calculateProgress = useCallback(async () => {
    if (!order?.id) {
      setProgress(null);
      setNextStep(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const orderProgress = await unifiedWorkflowService.getOrderWorkflowProgress(order.id);
      if (orderProgress) {
        setProgress(orderProgress);
        setNextStep(orderProgress.nextStep);
      } else {
        setProgress(null);
        setNextStep(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [order]);

  /**
   * Porcentaje completado
   */
  const percentComplete = useMemo(() => {
    return progress?.progressPercentage ?? 0;
  }, [progress]);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await calculateProgress();
  }, [calculateProgress]);

  // Recalcula cuando cambia la orden
  useEffect(() => {
    calculateProgress();
  }, [calculateProgress]);

  return {
    progress,
    nextStep,
    percentComplete,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Resultado del hook useWorkflowEscalation
 */
interface UseWorkflowEscalationResult {
  /** Reglas de escalación activas */
  activeEscalations: Array<{
    ruleId: string;
    stepId: string;
    message: string;
    triggeredAt: Date;
  }>;
  /** Hay escalaciones pendientes */
  hasEscalations: boolean;
  /** Recarga las escalaciones */
  refresh: () => void;
}

/**
 * Hook para monitorear escalaciones de workflow
 * Usa el servicio unificado para verificar reglas de escalación
 * @param order - Orden a monitorear
 * @returns Estado de escalaciones
 */
export function useWorkflowEscalation(order: Order | null): UseWorkflowEscalationResult {
  const [activeEscalations, setActiveEscalations] = useState<
    UseWorkflowEscalationResult['activeEscalations']
  >([]);
  const isInitializedRef = useRef(false);

  /**
   * Verifica escalaciones usando servicio unificado
   */
  const checkEscalations = useCallback(async () => {
    if (!order?.id || !order?.workflowId) {
      setActiveEscalations([]);
      return;
    }

    try {
      // Obtener progreso que incluye informacion de escalaciones
      const progress = await unifiedWorkflowService.getOrderWorkflowProgress(order.id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const progressAny = progress as any;
      if (progressAny?.currentStep && progressAny.startTime) {
        // Verificar si el paso actual ha excedido su tiempo estimado
        const stepStartTime = new Date(progressAny.startTime);
        const currentStep = progressAny.currentStep;
        const elapsed = (Date.now() - stepStartTime.getTime()) / 1000 / 60; // minutos

        // Si el tiempo estimado ha sido excedido, crear escalacion
        if (currentStep.estimatedDuration && elapsed > currentStep.estimatedDuration) {
          setActiveEscalations([{
            ruleId: `escalation-${currentStep.id}`,
            stepId: currentStep.id,
            message: `Paso "${currentStep.name}" ha excedido el tiempo estimado de ${currentStep.estimatedDuration} minutos`,
            triggeredAt: new Date(),
          }]);
          return;
        }
      }

      setActiveEscalations([]);
    } catch {
      setActiveEscalations([]);
    }
  }, [order]);

  /**
   * Hay escalaciones
   */
  const hasEscalations = useMemo(() => {
    return activeEscalations.length > 0;
  }, [activeEscalations]);

  /**
   * Recarga
   */
  const refresh = useCallback(async () => {
    await checkEscalations();
  }, [checkEscalations]);

  // Verifica al cambiar la orden (solo una vez al inicializar)
  useEffect(() => {
    if (!isInitializedRef.current && order?.workflowId) {
      isInitializedRef.current = true;
      // Defer para evitar cascading renders
      queueMicrotask(() => {
        void checkEscalations();
      });
    }
  }, [order?.workflowId, checkEscalations]);

  return {
    activeEscalations,
    hasEscalations,
    refresh,
  };
}

/**
 * Resultado del hook useWorkflowSelector
 */
interface UseWorkflowSelectorResult {
  /** Workflow seleccionado */
  selectedWorkflow: Workflow | null;
  /** ID del workflow seleccionado */
  selectedWorkflowId: string | null;
  /** Workflows disponibles filtrados */
  availableWorkflows: Workflow[];
  /** Selecciona un workflow */
  selectWorkflow: (workflowId: string) => void;
  /** Limpia la selección */
  clearSelection: () => void;
  
  isLoading: boolean;
}

/**
 * Hook para seleccionar workflow en formulario de orden
 * @param cargoType - Tipo de carga para filtrar workflows
 * @param initialWorkflowId - ID inicial del workflow
 * @returns Estado y métodos para seleccionar workflow
 */
export function useWorkflowSelector(
  cargoType?: string,
  initialWorkflowId?: string
): UseWorkflowSelectorResult {
  const { workflows, activeWorkflows, defaultWorkflow, isLoading } = useWorkflows();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    initialWorkflowId || null
  );
  const [autoSelectedRef, setAutoSelectedRef] = useState(false);

  /**
   * Workflows disponibles filtrados por tipo de carga
   */
  const availableWorkflows = useMemo(() => {
    if (!cargoType) return activeWorkflows;
    return activeWorkflows.filter(
      w => !w.applicableCargoTypes?.length || w.applicableCargoTypes.includes(cargoType)
    );
  }, [activeWorkflows, cargoType]);

  /**
   * Workflow seleccionado
   */
  const selectedWorkflow = useMemo(() => {
    if (!selectedWorkflowId) return null;
    return workflows.find(w => w.id === selectedWorkflowId) || null;
  }, [selectedWorkflowId, workflows]);

  /**
   * Selecciona workflow
   */
  const selectWorkflow = useCallback((workflowId: string) => {
    setSelectedWorkflowId(workflowId);
  }, []);

  /**
   * Limpia selección
   */
  const clearSelection = useCallback(() => {
    setSelectedWorkflowId(null);
  }, []);

  // Auto-selecciona workflow por defecto al montar (solo si no hay selección inicial)
  useEffect(() => {
    // Solo auto-seleccionar una vez cuando se monta el componente
    if (autoSelectedRef || selectedWorkflowId || initialWorkflowId) {
      return;
    }
    
    // Esperar a que los workflows estén cargados
    if (isLoading || workflows.length === 0) {
      return;
    }
    
    // Marcar como auto-seleccionado para no repetir
    setAutoSelectedRef(true);
    
    // Si hay workflows específicos para el tipo de carga, usar el primero
    if (cargoType && availableWorkflows.length > 0) {
      const specificWorkflow = availableWorkflows.find(w => 
        w.applicableCargoTypes?.includes(cargoType)
      );
      if (specificWorkflow) {
        setSelectedWorkflowId(specificWorkflow.id);
        return;
      }
    }
    
    // Si no, usar el workflow por defecto
    if (defaultWorkflow) {
      setSelectedWorkflowId(defaultWorkflow.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, workflows.length]);
  return {
    selectedWorkflow,
    selectedWorkflowId,
    availableWorkflows,
    selectWorkflow,
    clearSelection,
    isLoading,
  };
}