import type {
  Workflow,
  WorkflowStep,
  EscalationRule,
  WorkflowProgress,
  WorkflowFilters,
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
} from '@/types/workflow';
import type { Order } from '@/types/order';
import { mockWorkflows } from '@/mocks/orders/workflows.mock';
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Simula latencia de red
 * @param ms - Milisegundos de delay
 */
const simulateDelay = (ms: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Genera un ID único
 * @param prefix - Prefijo para el ID
 */
const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Clase de servicio para gestión de workflows
 */
class WorkflowService {
  private workflows: Workflow[] = [...mockWorkflows];
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtiene todos los workflows
   * @param filters - Filtros opcionales
   * @returns Promesa con lista de workflows
   */
  async getWorkflows(filters?: WorkflowFilters): Promise<Workflow[]> {
    if (this.useMocks) {
      await simulateDelay();

      let result = [...this.workflows];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          wf =>
            wf.name.toLowerCase().includes(searchLower) ||
            wf.description.toLowerCase().includes(searchLower) ||
            wf.code.toLowerCase().includes(searchLower)
        );
      }

      if (filters?.status) {
        result = result.filter(wf => wf.status === filters.status);
      }

      if (filters?.isDefault !== undefined) {
        result = result.filter(wf => wf.isDefault === filters.isDefault);
      }

      if (filters?.applicableCargoType) {
        result = result.filter(
          wf =>
            !wf.applicableCargoTypes ||
            wf.applicableCargoTypes.length === 0 ||
            wf.applicableCargoTypes.includes(filters.applicableCargoType!)
        );
      }

      return result;
    }
    return apiClient.get<Workflow[]>(API_ENDPOINTS.operations.orderWorkflows, { params: filters as unknown as Record<string, string> });
  }

  /**
   * Obtiene un workflow por ID
   * @param id - ID del workflow
   * @returns Promesa con el workflow o null
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.workflows.find(wf => wf.id === id) ?? null;
    }
    return apiClient.get<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/${id}`);
  }

  /**
   * Obtiene workflows activos
   * @returns Promesa con workflows activos
   */
  async getActiveWorkflows(): Promise<Workflow[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.workflows.filter(wf => wf.status === 'active');
    }
    return apiClient.get<Workflow[]>(`${API_ENDPOINTS.operations.orderWorkflows}/active`);
  }

  /**
   * Obtiene el workflow por defecto
   * @returns Promesa con el workflow por defecto
   */
  async getDefaultWorkflow(): Promise<Workflow | null> {
    if (this.useMocks) {
      await simulateDelay(100);
      return this.workflows.find(wf => wf.isDefault) ?? null;
    }
    return apiClient.get<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/default`);
  }

  /**
   * Obtiene workflows aplicables a un tipo de carga
   * @param cargoType - Tipo de carga
   * @returns Promesa con workflows aplicables
   */
  async getWorkflowsForCargoType(cargoType: string): Promise<Workflow[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.workflows.filter(
        wf =>
          wf.status === 'active' &&
          (!wf.applicableCargoTypes ||
            wf.applicableCargoTypes.length === 0 ||
            wf.applicableCargoTypes.includes(cargoType))
      );
    }
    return apiClient.get<Workflow[]>(API_ENDPOINTS.operations.orderWorkflows, { params: { cargoType } });
  }

  /**
   * Obtiene workflows aplicables a un cliente
   * @param customerId - ID del cliente
   * @returns Promesa con workflows aplicables
   */
  async getWorkflowsForCustomer(customerId: string): Promise<Workflow[]> {
    if (this.useMocks) {
      await simulateDelay(200);
      return this.workflows.filter(
        wf =>
          wf.status === 'active' &&
          (!wf.applicableCustomerIds ||
            wf.applicableCustomerIds.length === 0 ||
            wf.applicableCustomerIds.includes(customerId))
      );
    }
    return apiClient.get<Workflow[]>(API_ENDPOINTS.operations.orderWorkflows, { params: { customerId } });
  }

  /**
   * Crea un nuevo workflow
   * @param data - Datos del workflow
   * @returns Promesa con el workflow creado
   */
  async createWorkflow(data: CreateWorkflowDTO): Promise<Workflow> {
    if (this.useMocks) {
      await simulateDelay(500);

      const now = new Date().toISOString();
      const id = generateId('wf');

      // Si es default, quitar default de los demás
      if (data.isDefault) {
        this.workflows = this.workflows.map(wf => ({
          ...wf,
          isDefault: false,
        }));
      }

      const newWorkflow: Workflow = {
        id,
        name: data.name,
        description: data.description,
        code: data.code,
        status: 'draft',
        version: 1,
        steps: data.steps.map((step, index) => ({
          ...step,
          id: `${id}-step-${index + 1}`,
        })),
        escalationRules: (data.escalationRules ?? []).map((rule, index) => ({
          ...rule,
          id: `${id}-rule-${index + 1}`,
        })),
        applicableCargoTypes: data.applicableCargoTypes,
        applicableCustomerIds: data.applicableCustomerIds,
        isDefault: data.isDefault ?? false,
        createdAt: now,
        createdBy: 'current-user',
        updatedAt: now,
        updatedBy: 'current-user',
      };

      this.workflows.push(newWorkflow);
      return newWorkflow;
    }
    return apiClient.post<Workflow>(API_ENDPOINTS.operations.orderWorkflows, data);
  }

  /**
   * Actualiza un workflow existente
   * @param id - ID del workflow
   * @param data - Datos a actualizar
   * @returns Promesa con el workflow actualizado
   */
  async updateWorkflow(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    if (this.useMocks) {
      await simulateDelay(400);

      const index = this.workflows.findIndex(wf => wf.id === id);
      if (index === -1) {
        throw new Error(`Workflow ${id} not found`);
      }

      const now = new Date().toISOString();

      // Si es default, quitar default de los demás
      if (data.isDefault) {
        this.workflows = this.workflows.map(wf => ({
          ...wf,
          isDefault: wf.id === id,
        }));
      }

      const updatedWorkflow: Workflow = {
        ...this.workflows[index],
        ...data,
        version: this.workflows[index].version + 1,
        updatedAt: now,
        updatedBy: 'current-user',
        steps: data.steps
          ? data.steps.map((step, i): WorkflowStep => ({
              ...step,
              id: `${id}-step-${i + 1}`,
            }))
          : this.workflows[index].steps,
        escalationRules: data.escalationRules
          ? data.escalationRules.map((rule, i): EscalationRule => ({
              ...rule,
              id: `${id}-esc-${i + 1}`,
            }))
          : this.workflows[index].escalationRules,
      };

      this.workflows[index] = updatedWorkflow;
      return updatedWorkflow;
    }
    return apiClient.put<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/${id}`, data);
  }

  /**
   * Activa un workflow
   * @param id - ID del workflow
   * @returns Promesa con el workflow activado
   */
  async activateWorkflow(id: string): Promise<Workflow> {
    if (this.useMocks) {
      return this.updateWorkflow(id, { status: 'active' });
    }
    return apiClient.patch<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/${id}/activate`);
  }

  /**
   * Desactiva un workflow
   * @param id - ID del workflow
   * @returns Promesa con el workflow desactivado
   */
  async deactivateWorkflow(id: string): Promise<Workflow> {
    if (this.useMocks) {
      const workflow = await this.getWorkflowById(id);
      if (workflow?.isDefault) {
        throw new Error('Cannot deactivate default workflow');
      }
      return this.updateWorkflow(id, { status: 'inactive' });
    }
    return apiClient.patch<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/${id}/deactivate`);
  }

  /**
   * Elimina un workflow
   * @param id - ID del workflow
   * @returns Promesa que indica éxito
   */
  async deleteWorkflow(id: string): Promise<boolean> {
    if (this.useMocks) {
      await simulateDelay(300);

      const index = this.workflows.findIndex(wf => wf.id === id);
      if (index === -1) {
        throw new Error(`Workflow ${id} not found`);
      }

      const workflow = this.workflows[index];
      if (workflow.isDefault) {
        throw new Error('Cannot delete default workflow');
      }

      if (workflow.status === 'active') {
        throw new Error('Cannot delete active workflow. Deactivate it first.');
      }

      this.workflows.splice(index, 1);
      return true;
    }
    await apiClient.delete(`${API_ENDPOINTS.operations.orderWorkflows}/${id}`);
    return true;
  }

  /**
   * Duplica un workflow
   * @param id - ID del workflow a duplicar
   * @param newName - Nombre para el nuevo workflow
   * @returns Promesa con el workflow duplicado
   */
  async duplicateWorkflow(id: string, newName: string): Promise<Workflow> {
    if (this.useMocks) {
      await simulateDelay(400);

      const original = await this.getWorkflowById(id);
      if (!original) {
        throw new Error(`Workflow ${id} not found`);
      }

      return this.createWorkflow({
        name: newName,
        description: `Copia de: ${original.description}`,
        code: `${original.code}-COPY`,
        steps: original.steps.map(({ id: _id, ...step }) => step),
        escalationRules: original.escalationRules.map(({ id: _id, ...rule }) => rule),
        applicableCargoTypes: original.applicableCargoTypes,
        applicableCustomerIds: original.applicableCustomerIds,
        isDefault: false,
      });
    }
    return apiClient.post<Workflow>(`${API_ENDPOINTS.operations.orderWorkflows}/${id}/duplicate`, { newName });
  }

  /**
   * Calcula el progreso de una orden en su workflow
   * @param order - Orden a evaluar
   * @returns Progreso del workflow
   */
  async calculateProgress(order: Order): Promise<WorkflowProgress | null> {
    if (this.useMocks) {
      await simulateDelay(100);

      if (!order.workflowId) {
        return null;
      }

      const workflow = await this.getWorkflowById(order.workflowId);
      if (!workflow) {
        return null;
      }

      // Determinar paso actual basado en hitos completados
      const completedMilestones = order.milestones.filter(
        m => m.status === 'completed'
      ).length;
      
      const currentStepIndex = Math.min(completedMilestones, workflow.steps.length - 1);
      const currentStep = workflow.steps[currentStepIndex];

      const completedSteps = workflow.steps
        .slice(0, completedMilestones)
        .map(s => s.id);

      // Calcular tiempo en paso actual
      const lastMilestone = order.milestones
        .filter(m => m.status === 'completed')
        .pop();
      
      const timeInCurrentStep = lastMilestone?.actualExit
        ? Math.round(
            (Date.now() - new Date(lastMilestone.actualExit).getTime()) / 60000
          )
        : 0;

      // Determinar si está retrasado
      const isDelayed = currentStep.maxDurationMinutes
        ? timeInCurrentStep > currentStep.maxDurationMinutes
        : false;

      return {
        workflowId: workflow.id,
        orderId: order.id,
        currentStepId: currentStep.id,
        currentStepIndex,
        totalSteps: workflow.steps.length,
        completedSteps,
        skippedSteps: [],
        progressPercentage: Math.round((completedSteps.length / workflow.steps.length) * 100),
        timeInCurrentStep,
        isDelayed,
        stepHistory: completedSteps.map((stepId, i) => ({
          stepId,
          enteredAt: order.milestones[i]?.actualEntry ?? new Date().toISOString(),
          completedAt: order.milestones[i]?.actualExit,
          status: 'completed' as const,
        })),
      };
    }
    return apiClient.post<WorkflowProgress>(`${API_ENDPOINTS.operations.orderWorkflows}/calculate-progress`, { orderId: order.id });
  }

  /**
   * Obtiene el siguiente paso del workflow para una orden
   * @param order - Orden actual
   * @returns Siguiente paso o null si no hay más
   */
  async getNextStep(order: Order): Promise<WorkflowStep | null> {
    if (this.useMocks) {
      if (!order.workflowId) {
        return null;
      }

      const progress = await this.calculateProgress(order);
      if (!progress) {
        return null;
      }

      const workflow = await this.getWorkflowById(order.workflowId);
      if (!workflow) {
        return null;
      }

      const nextIndex = progress.currentStepIndex + 1;
      if (nextIndex >= workflow.steps.length) {
        return null;
      }

      return workflow.steps[nextIndex];
    }
    return apiClient.get<WorkflowStep>(`${API_ENDPOINTS.operations.orderWorkflows}/next-step/${order.id}`);
  }

  /**
   * Verifica las reglas de escalamiento para una orden
   * @param order - Orden a verificar
   * @returns Lista de reglas que aplican
   */
  async checkEscalationRules(
    order: Order
  ): Promise<Array<{ rule: string; triggered: boolean; message?: string }>> {
    if (this.useMocks) {
      if (!order.workflowId) {
        return [];
      }

      const workflow = await this.getWorkflowById(order.workflowId);
      if (!workflow) {
        return [];
      }

      const progress = await this.calculateProgress(order);
      if (!progress) {
        return [];
      }

      const results: Array<{ rule: string; triggered: boolean; message?: string }> = [];

      for (const rule of workflow.escalationRules) {
        if (!rule.isActive) continue;

        let triggered = false;
        let message: string | undefined;

        switch (rule.condition.type) {
          case 'delay_threshold':
            if (progress.isDelayed && progress.timeInCurrentStep > rule.condition.thresholdMinutes) {
              triggered = true;
              message = `Retraso de ${progress.timeInCurrentStep} minutos (umbral: ${rule.condition.thresholdMinutes} min)`;
            }
            break;

          case 'no_update':
            // Simular verificación de última actualización
            const lastUpdate = new Date(order.updatedAt).getTime();
            const minutesSinceUpdate = (Date.now() - lastUpdate) / 60000;
            if (minutesSinceUpdate > rule.condition.thresholdMinutes) {
              triggered = true;
              message = `Sin actualización por ${Math.round(minutesSinceUpdate)} minutos`;
            }
            break;

          case 'step_stuck':
            if (rule.condition.stepIds?.includes(progress.currentStepId)) {
              if (progress.timeInCurrentStep > rule.condition.thresholdMinutes) {
                triggered = true;
                message = `Detenido en paso por ${progress.timeInCurrentStep} minutos`;
              }
            }
            break;
        }

        results.push({
          rule: rule.name,
          triggered,
          message,
        });
      }

      return results;
    }
    return apiClient.post<Array<{ rule: string; triggered: boolean; message?: string }>>(`${API_ENDPOINTS.operations.orderWorkflows}/check-escalation`, { orderId: order.id });
  }
}

/**
 * Instancia singleton del servicio de workflows
 */
export const workflowService = new WorkflowService();

/**
 * Exporta la clase para testing
 */
export { WorkflowService };

/**
 * Tipo del servicio para inyección de dependencias
 */
export type IWorkflowService = InstanceType<typeof WorkflowService>;
