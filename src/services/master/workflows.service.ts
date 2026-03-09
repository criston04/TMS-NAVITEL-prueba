import type { Workflow, WorkflowStep, WorkflowStatus, CreateWorkflowDTO, UpdateWorkflowDTO } from '@/types/workflow';
import { mockWorkflows, mockGeofencesForMilestones, mockCustomersForWorkflow } from '@/mocks/master/workflows.mock';
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

// Simulamos un delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let workflowsState = [...mockWorkflows];

/**
 * Servicio de Workflows
 */
class WorkflowMasterService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtener todos los workflows
   */
  async getAll(): Promise<Workflow[]> {
    if (this.useMocks) {
      await delay(300);
      return [...workflowsState];
    }
    return apiClient.get<Workflow[]>(API_ENDPOINTS.master.workflows);
  }

  /**
   * Obtener workflow por ID
   */
  async getById(id: string): Promise<Workflow | null> {
    if (this.useMocks) {
      await delay(200);
      return workflowsState.find(w => w.id === id) || null;
    }
    return apiClient.get<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}`);
  }

  /**
   * Crear nuevo workflow
   */
  async create(data: CreateWorkflowDTO): Promise<Workflow> {
    if (this.useMocks) {
      await delay(400);
      
      const newWorkflow: Workflow = {
        id: `wf-${Date.now()}`,
        ...data,
        status: 'draft',
        version: 1,
        isDefault: data.isDefault ?? false,
        steps: data.steps.map((step, index) => ({
          ...step,
          id: `step-${Date.now()}-${index}`,
          sequence: index + 1,
          transitionConditions: [],
          notifications: [],
        })) as WorkflowStep[],
        escalationRules: [],
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user',
      };

      workflowsState = [...workflowsState, newWorkflow];
      return newWorkflow;
    }
    return apiClient.post<Workflow>(API_ENDPOINTS.master.workflows, data);
  }

  /**
   * Actualizar workflow existente
   */
  async update(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    if (this.useMocks) {
      await delay(400);

      const index = workflowsState.findIndex(w => w.id === id);
      if (index === -1) {
        throw new Error('Workflow no encontrado');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updatedWorkflow: any = {
        ...workflowsState[index],
        ...data,
        steps: data.steps 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? data.steps.map((step: any, idx: number) => ({
              ...step,
              id: step.id || `step-${Date.now()}-${idx}`,
              sequence: idx + 1,
              transitionConditions: step.transitionConditions || [],
              notifications: step.notifications || [],
            }))
          : workflowsState[index].steps,
        version: workflowsState[index].version + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user',
      };

      workflowsState = workflowsState.map(w => w.id === id ? updatedWorkflow : w);
      return updatedWorkflow as Workflow;
    }
    return apiClient.put<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}`, data);
  }

  /**
   * Eliminar workflow
   */
  async delete(id: string): Promise<void> {
    if (this.useMocks) {
      await delay(300);
      workflowsState = workflowsState.filter(w => w.id !== id);
      return;
    }
    await apiClient.delete(`${API_ENDPOINTS.master.workflows}/${id}`);
  }

  /**
   * Duplicar workflow como plantilla
   */
  async duplicate(id: string, newName: string): Promise<Workflow> {
    if (this.useMocks) {
      await delay(400);
      
      const original = workflowsState.find(w => w.id === id);
      if (!original) {
        throw new Error('Workflow no encontrado');
      }

      const duplicated: Workflow = {
        ...original,
        id: `wf-${Date.now()}`,
        name: newName,
        code: `${original.code}-COPY`,
        status: 'draft',
        version: 1,
        isDefault: false,
        steps: original.steps.map((step, index) => ({
          ...step,
          id: `step-${Date.now()}-${index}`,
        })),
        createdAt: new Date().toISOString(),
        createdBy: 'current-user',
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user',
      };

      workflowsState = [...workflowsState, duplicated];
      return duplicated;
    }
    return apiClient.post<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/duplicate`, { newName });
  }

  /**
   * Cambiar estado del workflow
   */
  async changeStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    if (this.useMocks) {
      await delay(300);
      
      const index = workflowsState.findIndex(w => w.id === id);
      if (index === -1) {
        throw new Error('Workflow no encontrado');
      }

      const updatedWorkflow: Workflow = {
        ...workflowsState[index],
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: 'current-user',
      };

      workflowsState = workflowsState.map(w => w.id === id ? updatedWorkflow : w);
      return updatedWorkflow;
    }
    return apiClient.patch<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/status`, { status });
  }

  /**
   * Obtener geocercas disponibles para hitos
   */
  async getAvailableGeofences(): Promise<typeof mockGeofencesForMilestones> {
    if (this.useMocks) {
      await delay(200);
      return mockGeofencesForMilestones;
    }
    return apiClient.get<typeof mockGeofencesForMilestones>(`${API_ENDPOINTS.master.workflows}/available-geofences`);
  }

  /**
   * Obtener clientes disponibles
   */
  async getAvailableCustomers(): Promise<typeof mockCustomersForWorkflow> {
    if (this.useMocks) {
      await delay(200);
      return mockCustomersForWorkflow;
    }
    return apiClient.get<typeof mockCustomersForWorkflow>(`${API_ENDPOINTS.master.workflows}/available-customers`);
  }
}

export const workflowMasterService = new WorkflowMasterService();
export { WorkflowMasterService as WorkflowsService };
