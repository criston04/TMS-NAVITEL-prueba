import { useState, useCallback } from 'react';
import { moduleConnectorService } from '@/services/integration';
import type { 
  WorkflowAssignmentResult, 
  SchedulingValidationResult 
} from '@/services/integration';
import type { CreateOrderDTO, Order } from '@/types/order';
import type { ScheduledOrder } from '@/types/scheduling';
import type { WorkflowStep } from '@/types/workflow';

interface UseWorkflowIntegrationReturn {
  isLoading: boolean;
  error: string | null;
  
  autoAssignWorkflow: (orderData: Partial<CreateOrderDTO> | Partial<Order>) => Promise<WorkflowAssignmentResult>;
  prepareOrderWithWorkflow: (orderData: CreateOrderDTO) => Promise<{
    enrichedData: CreateOrderDTO;
    assignment: WorkflowAssignmentResult;
    warnings: string[];
  }>;
  
  validateScheduling: (scheduledOrder: Partial<ScheduledOrder>) => Promise<SchedulingValidationResult>;
  getWorkflowDuration: (workflowId: string) => Promise<number | null>;
  getWorkflowSteps: (workflowId: string) => Promise<WorkflowStep[] | null>;
  
  validateWorkflowGeofences: (workflowId: string) => Promise<{
    valid: boolean;
    missingGeofences: string[];
  }>;
  
  clearError: () => void;
}

/**
 * Hook para integración de workflows con otros módulos del TMS
 * 
 */
export function useWorkflowIntegration(): UseWorkflowIntegrationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Auto-asigna el workflow más apropiado a una orden
   */
  const autoAssignWorkflow = useCallback(async (
    orderData: Partial<CreateOrderDTO> | Partial<Order>
  ): Promise<WorkflowAssignmentResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await moduleConnectorService.autoAssignWorkflow(orderData);
      
      if (!result.success) {
        setError(result.reason);
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar workflow';
      setError(message);
      return {
        success: false,
        workflowId: null,
        workflowName: null,
        reason: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Prepara una orden con workflow, milestones y validaciones
   */
  const prepareOrderWithWorkflow = useCallback(async (
    orderData: CreateOrderDTO
  ): Promise<{
    enrichedData: CreateOrderDTO;
    assignment: WorkflowAssignmentResult;
    warnings: string[];
  }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await moduleConnectorService.prepareOrderWithConnections(orderData);
      
      return {
        enrichedData: result.enrichedData,
        assignment: result.workflowAssignment,
        warnings: result.validationWarnings,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al preparar orden';
      setError(message);
      return {
        enrichedData: orderData,
        assignment: {
          success: false,
          workflowId: null,
          workflowName: null,
          reason: message,
        },
        warnings: [message],
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Valida una orden programada contra su workflow
   */
  const validateScheduling = useCallback(async (
    scheduledOrder: Partial<ScheduledOrder>
  ): Promise<SchedulingValidationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await moduleConnectorService.validateSchedulingWithWorkflow(scheduledOrder);
      
      if (!result.isValid && result.errors.length > 0) {
        setError(result.errors.join('. '));
      }
      
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar programación';
      setError(message);
      return {
        isValid: false,
        warnings: [],
        errors: [message],
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Obtiene la duración sugerida de un workflow en horas
   */
  const getWorkflowDuration = useCallback(async (
    workflowId: string
  ): Promise<number | null> => {
    try {
      return await moduleConnectorService.getSuggestedDuration(workflowId);
    } catch {
      return null;
    }
  }, []);

  /**
   * Obtiene los pasos de un workflow para mostrar en la UI
   */
  const getWorkflowSteps = useCallback(async (
    workflowId: string
  ): Promise<WorkflowStep[] | null> => {
    try {
      const info = await moduleConnectorService.getWorkflowStepsForScheduling(workflowId);
      return info?.steps || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Valida que las geocercas de un workflow existan
   */
  const validateWorkflowGeofences = useCallback(async (
    workflowId: string
  ): Promise<{ valid: boolean; missingGeofences: string[] }> => {
    try {
      const result = await moduleConnectorService.validateWorkflowGeofences(workflowId);
      return {
        valid: result.valid,
        missingGeofences: result.missingGeofences,
      };
    } catch {
      return {
        valid: false,
        missingGeofences: [],
      };
    }
  }, []);

  /**
   * Limpia el estado de error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    autoAssignWorkflow,
    prepareOrderWithWorkflow,
    validateScheduling,
    getWorkflowDuration,
    getWorkflowSteps,
    validateWorkflowGeofences,
    clearError,
  };
}

/**
 * Hook simplificado para obtener info de workflow de una orden
 * 
 */
export function useOrderWorkflowInfo(workflowId: string | undefined) {
  const [workflowInfo, setWorkflowInfo] = useState<{
    name: string;
    steps: number;
    duration: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadInfo = useCallback(async () => {
    if (!workflowId) {
      setWorkflowInfo(null);
      return;
    }

    setIsLoading(true);
    try {
      const info = await moduleConnectorService.getWorkflowStepsForScheduling(workflowId);
      if (info) {
        setWorkflowInfo({
          name: workflowId, // En producción vendría el nombre real
          steps: info.steps.length,
          duration: info.totalDuration / 60, // Convertir a horas
        });
      }
    } catch {
      setWorkflowInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  return { workflowInfo, isLoading, refresh: loadInfo };
}
