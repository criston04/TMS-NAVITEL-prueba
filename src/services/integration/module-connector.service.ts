import type { Order, CreateOrderDTO, OrderMilestone } from '@/types/order';
import type { Workflow, WorkflowStep } from '@/types/workflow';
import type { ScheduledOrder, ScheduleConflict } from '@/types/scheduling';
import { unifiedWorkflowService } from '@/services/workflow.service';
import { apiConfig } from '@/config/api.config';

/**
 * Resultado de la asignación automática de workflow
 */
export interface WorkflowAssignmentResult {
  success: boolean;
  workflowId: string | null;
  workflowName: string | null;
  reason: string;
  generatedMilestones?: OrderMilestone[];
}

/**
 * Resultado de validación de programación con workflow
 */
export interface SchedulingValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  suggestedDuration?: number;
  workflowSteps?: WorkflowStep[];
}

/**
 * Configuración de milestone generado desde workflow
 */
export interface GeneratedMilestone {
  geofenceId: string;
  geofenceName: string;
  type: 'origin' | 'waypoint' | 'destination';
  sequence: number;
  estimatedDurationMinutes: number;
  address?: string;
  coordinates?: { lat: number; lng: number };
  notes?: string;
}

// SERVICIO DE CONEXIÓN

/**
 * Servicio que conecta los módulos del TMS
 * Implementa el patrón Mediator para desacoplar módulos
 */
class ModuleConnectorService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  // ------------------------------------------------
  // ORDERS <-> WORKFLOWS
  // ------------------------------------------------

  /**
   * Asigna automáticamente el workflow más apropiado a una orden
   * basándose en el tipo de carga, cliente y configuración del workflow
   * 
   * @param orderData - Datos de la orden (parciales o completos)
   * @returns Resultado con el workflow asignado o razón del fallo
   */
  async autoAssignWorkflow(
    orderData: Partial<CreateOrderDTO> | Partial<Order>
  ): Promise<WorkflowAssignmentResult> {
    try {
      // 1. Buscar workflow sugerido basado en criterios
      const suggestedWorkflow = await unifiedWorkflowService.suggestWorkflowForOrder(
        orderData.customerId || "",
        orderData.cargo?.type
      );

      if (!suggestedWorkflow) {
        // Intentar obtener workflow por defecto
        const defaultWorkflow = await unifiedWorkflowService.getDefault();
        
        if (!defaultWorkflow) {
          return {
            success: false,
            workflowId: null,
            workflowName: null,
            reason: 'No se encontró un workflow aplicable ni uno por defecto',
          };
        }

        return {
          success: true,
          workflowId: defaultWorkflow.id,
          workflowName: defaultWorkflow.name,
          reason: 'Se asignó el workflow por defecto',
          generatedMilestones: this.generateMilestonesFromWorkflow(defaultWorkflow, orderData),
        };
      }

      return {
        success: true,
        workflowId: suggestedWorkflow.id,
        workflowName: suggestedWorkflow.name,
        reason: this.getAssignmentReason(suggestedWorkflow, orderData),
        generatedMilestones: this.generateMilestonesFromWorkflow(suggestedWorkflow, orderData),
      };
    } catch (error) {
      console.error('Error en autoAssignWorkflow:', error);
      return {
        success: false,
        workflowId: null,
        workflowName: null,
        reason: 'Error interno al asignar workflow',
      };
    }
  }

  /**
   * Genera los milestones de una orden basándose en los steps del workflow
   */
  public generateMilestonesFromWorkflow(
    workflow: Workflow,
    orderData: Partial<CreateOrderDTO> | Partial<Order>
  ): OrderMilestone[] {
    const orderId = 'id' in orderData && orderData.id ? orderData.id : 'pending';
    
    return workflow.steps
      .filter(step => step.action === 'enter_geofence' || step.action === 'exit_geofence')
      .map((step, index, arr) => {
        // Determinar tipo de milestone
        let type: 'origin' | 'waypoint' | 'destination' = 'waypoint';
        if (index === 0) type = 'origin';
        else if (index === arr.length - 1) type = 'destination';

        return {
          id: `${orderId}-ms-${step.sequence}`,
          orderId,
          geofenceId: step.actionConfig.geofenceId || '',
          geofenceName: step.actionConfig.geofenceName || step.name,
          type,
          sequence: step.sequence,
          address: step.actionConfig.instructions || '',
          coordinates: { lat: 0, lng: 0 }, // Se llenará con datos de geocerca
          estimatedArrival: new Date().toISOString(),
          status: 'pending' as const,
          notes: step.description,
        };
      });
  }

  /**
   * Obtiene la razón descriptiva de por qué se asignó un workflow
   */
  private getAssignmentReason(
    workflow: Workflow,
    orderData: Partial<CreateOrderDTO> | Partial<Order>
  ): string {
    if (workflow.applicableCustomerIds?.includes(orderData.customerId || '')) {
      return `Asignado por configuración de cliente`;
    }
    if (orderData.cargo?.type && workflow.applicableCargoTypes?.includes(orderData.cargo.type)) {
      return `Asignado por tipo de carga: ${orderData.cargo.type}`;
    }
    if (workflow.isDefault) {
      return 'Asignado como workflow por defecto';
    }
    return 'Asignado por coincidencia de criterios';
  }

  // ------------------------------------------------
  // SCHEDULING <-> WORKFLOWS
  // ------------------------------------------------

  /**
   * Valida que una orden programada sea compatible con su workflow
   * 
   * @param scheduledOrder - Orden a programar
   * @returns Resultado de validación con errores y advertencias
   */
  async validateSchedulingWithWorkflow(
    scheduledOrder: Partial<ScheduledOrder>
  ): Promise<SchedulingValidationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Si no hay workflow, no hay nada que validar
    if (!scheduledOrder.workflowId) {
      return {
        isValid: true,
        warnings: ['La orden no tiene workflow asignado'],
        errors: [],
      };
    }

    try {
      // Obtener el workflow
      const workflow = await unifiedWorkflowService.getById(scheduledOrder.workflowId);
      
      if (!workflow) {
        errors.push(`Workflow ${scheduledOrder.workflowId} no encontrado`);
        return { isValid: false, warnings, errors };
      }

      if (workflow.status !== 'active') {
        errors.push(`El workflow "${workflow.name}" no está activo`);
      }

      // Calcular duración mínima del workflow
      const workflowDurationMinutes = workflow.steps.reduce(
        (sum, step) => sum + (step.estimatedDurationMinutes || 30),
        0
      );
      const workflowDurationHours = workflowDurationMinutes / 60;

      // Validar duración programada vs duración del workflow
      if (scheduledOrder.estimatedDuration) {
        if (scheduledOrder.estimatedDuration < workflowDurationHours) {
          warnings.push(
            `Duración programada (${scheduledOrder.estimatedDuration}h) es menor ` +
            `que la requerida por el workflow (${workflowDurationHours.toFixed(1)}h)`
          );
        }
      }

      // Validar compatibilidad con cliente
      if (
        scheduledOrder.customerId &&
        workflow.applicableCustomerIds?.length &&
        !workflow.applicableCustomerIds.includes(scheduledOrder.customerId)
      ) {
        warnings.push('El workflow no está configurado para este cliente específico');
      }

      // Validar compatibilidad con tipo de carga
      if (
        scheduledOrder.cargo?.type &&
        workflow.applicableCargoTypes?.length &&
        !workflow.applicableCargoTypes.includes(scheduledOrder.cargo.type)
      ) {
        warnings.push(
          `El workflow no está optimizado para carga tipo "${scheduledOrder.cargo.type}"`
        );
      }

      return {
        isValid: errors.length === 0,
        warnings,
        errors,
        suggestedDuration: workflowDurationHours,
        workflowSteps: workflow.steps,
      };
    } catch (error) {
      console.error('Error validando scheduling con workflow:', error);
      errors.push('Error interno al validar workflow');
      return { isValid: false, warnings, errors };
    }
  }

  /**
   * Calcula la duración sugerida para una orden basada en su workflow
   */
  async getSuggestedDuration(workflowId: string): Promise<number | null> {
    try {
      const result = await unifiedWorkflowService.calculateScheduleDuration(workflowId);
      return result.totalHours;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene los pasos del workflow para mostrar en la UI de programación
   */
  async getWorkflowStepsForScheduling(workflowId: string): Promise<{
    steps: WorkflowStep[];
    totalDuration: number;
    requiredGeofences: string[];
  } | null> {
    try {
      const workflow = await unifiedWorkflowService.getById(workflowId);
      if (!workflow) return null;

      const totalDuration = workflow.steps.reduce(
        (sum, s) => sum + (s.estimatedDurationMinutes || 0),
        0
      );

      const requiredGeofences = workflow.steps
        .filter(s => s.actionConfig.geofenceId)
        .map(s => s.actionConfig.geofenceId!)
        .filter((id, i, arr) => arr.indexOf(id) === i);

      return {
        steps: workflow.steps,
        totalDuration,
        requiredGeofences,
      };
    } catch {
      return null;
    }
  }

  // ------------------------------------------------
  // ------------------------------------------------

  /**
   * Valida que todas las geocercas de un workflow existan y esten activas
   */
  async validateWorkflowGeofences(workflowId: string): Promise<{
    valid: boolean;
    missingGeofences: string[];
    inactiveGeofences: string[];
  }> {
    const result = await unifiedWorkflowService.validateWorkflowGeofences(workflowId);
    // Convertir el resultado al formato esperado
    return {
      valid: result.valid,
      missingGeofences: result.issues?.filter(i => i.issue.includes("missing")).map(i => i.stepId) || [],
      inactiveGeofences: result.issues?.filter(i => i.issue.includes("inactive")).map(i => i.stepId) || [],
    };
  }

  // ------------------------------------------------
  // ------------------------------------------------

  /**
   * Prepara una orden con todas sus conexiones antes de guardar
   * Este método debe llamarse al crear o actualizar una orden
   */
  async prepareOrderWithConnections(
    orderData: CreateOrderDTO
  ): Promise<{
    enrichedData: CreateOrderDTO;
    workflowAssignment: WorkflowAssignmentResult;
    validationWarnings: string[];
  }> {
    const validationWarnings: string[] = [];
    const enrichedData = { ...orderData };

    // 1. Auto-asignar workflow si no tiene uno
    let workflowAssignment: WorkflowAssignmentResult;
    
    if (!orderData.workflowId) {
      workflowAssignment = await this.autoAssignWorkflow(orderData);
      
      if (workflowAssignment.success && workflowAssignment.workflowId) {
        enrichedData.workflowId = workflowAssignment.workflowId;
        validationWarnings.push(`Workflow auto-asignado: ${workflowAssignment.workflowName}`);
      }
    } else {
      // Validar el workflow existente
      const workflow = await unifiedWorkflowService.getById(orderData.workflowId);
      workflowAssignment = {
        success: !!workflow,
        workflowId: orderData.workflowId,
        workflowName: workflow?.name || null,
        reason: workflow ? 'Workflow especificado manualmente' : 'Workflow no encontrado',
      };
    }

    // 2. Si tiene workflow, generar milestones si no los tiene
    if (
      enrichedData.workflowId &&
      (!enrichedData.milestones || enrichedData.milestones.length === 0)
    ) {
      const workflow = await unifiedWorkflowService.getById(enrichedData.workflowId);
      if (workflow) {
        const generatedMilestones = this.generateMilestonesFromWorkflow(workflow, enrichedData);
        if (generatedMilestones.length > 0) {
          // Convertir a formato de CreateOrderDTO (sin id, orderId, status)
          enrichedData.milestones = generatedMilestones.map(m => ({
            geofenceId: m.geofenceId,
            geofenceName: m.geofenceName,
            type: m.type,
            sequence: m.sequence,
            address: m.address,
            coordinates: m.coordinates,
            estimatedArrival: m.estimatedArrival,
            notes: m.notes,
          }));
          validationWarnings.push(
            `Se generaron ${enrichedData.milestones.length} hitos desde el workflow`
          );
        }
      }
    }

    return {
      enrichedData,
      workflowAssignment,
      validationWarnings,
    };
  }

  /**
   * Prepara una orden programada validando contra su workflow
   */
  async prepareScheduledOrderWithValidation(
    scheduledOrder: Partial<ScheduledOrder>
  ): Promise<{
    validation: SchedulingValidationResult;
    conflicts: ScheduleConflict[];
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const conflicts: ScheduleConflict[] = [];

    // 1. Validar workflow
    const validation = await this.validateSchedulingWithWorkflow(scheduledOrder);

    // 2. Generar recomendaciones basadas en validación
    if (validation.suggestedDuration && scheduledOrder.estimatedDuration) {
      if (scheduledOrder.estimatedDuration < validation.suggestedDuration) {
        recommendations.push(
          `Considere aumentar la duración a ${validation.suggestedDuration.toFixed(1)} horas`
        );
      }
    }

    // 3. Si hay warnings del workflow, generar conflictos de tipo warning
    for (const warning of validation.warnings) {
      conflicts.push({
        id: `wf-warn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'no_resource',
        severity: 'low',
        message: warning,
        suggestedResolution: 'Revisar configuración del workflow',
        detectedAt: new Date().toISOString(),
      });
    }

    return {
      validation,
      conflicts,
      recommendations,
    };
  }
}

// Singleton export
export const moduleConnectorService = new ModuleConnectorService();

// Export class for testing
export { ModuleConnectorService };

// Type for dependency injection
export type IModuleConnectorService = InstanceType<typeof ModuleConnectorService>;
