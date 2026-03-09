import type {
  Workflow,
  WorkflowStep,
  WorkflowStatus,
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  WorkflowProgress,
  WorkflowFilters,
} from '@/types/workflow';
import type { Order } from '@/types/order';
import type { ScheduledOrder } from '@/types/scheduling';
import { geofencesMock } from '@/mocks/master/geofences.mock';
import { mockWorkflows as masterWorkflows, mockCustomersForWorkflow } from '@/mocks/master/workflows.mock';
import { apiConfig, API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';

// Simulamos delay de red
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let workflowsState = [...masterWorkflows];

/**
 * Interface para geocerca disponible en workflows
 */
export interface WorkflowGeofence {
  id: string;
  name: string;
  code: string;
  type: string;
  category: string;
  color: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Interface para cliente disponible en workflows
 */
export interface WorkflowCustomer {
  id: string;
  name: string;
  code?: string;
}

/**
 * Resultado de aplicar un workflow a una orden
 */
export interface ApplyWorkflowResult {
  success: boolean;
  order: Order;
  milestones: Array<{
    id: string;
    name: string;
    geofenceId: string;
    sequence: number;
    estimatedDuration: number;
  }>;
  totalEstimatedDuration: number;
}

/**
 * Progreso de una orden en su workflow
 */
export interface OrderWorkflowProgress extends WorkflowProgress {
  order: Pick<Order, 'id' | 'orderNumber' | 'status'>;
  workflow: Pick<Workflow, 'id' | 'name' | 'code'>;
  currentStep: WorkflowStep | null;
  nextStep: WorkflowStep | null;
  estimatedCompletion: string | null;
}

/**
 * Servicio Unificado de Workflows
 * Conecta workflows con geocercas, órdenes y programación
 */
class UnifiedWorkflowService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Obtener todos los workflows
   */
  async getAll(filters?: WorkflowFilters): Promise<Workflow[]> {
    if (!this.useMocks) {
      return apiClient.get<Workflow[]>(API_ENDPOINTS.master.workflows, { params: filters as unknown as Record<string, string> });
    }

    await delay(300);
    
    let result = [...workflowsState];

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(wf =>
        wf.name.toLowerCase().includes(searchLower) ||
        wf.code.toLowerCase().includes(searchLower) ||
        wf.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.status) {
      result = result.filter(wf => wf.status === filters.status);
    }

    if (filters?.isDefault !== undefined) {
      result = result.filter(wf => wf.isDefault === filters.isDefault);
    }

    if (filters?.applicableCustomerId) {
      result = result.filter(wf =>
        !wf.applicableCustomerIds ||
        wf.applicableCustomerIds.length === 0 ||
        wf.applicableCustomerIds.includes(filters.applicableCustomerId!)
      );
    }

    return result;
  }

  /**
   * Obtener workflow por ID
   */
  async getById(id: string): Promise<Workflow | null> {
    if (!this.useMocks) {
      return apiClient.get<Workflow | null>(`${API_ENDPOINTS.master.workflows}/${id}`);
    }

    await delay(200);
    return workflowsState.find(w => w.id === id) || null;
  }

  /**
   * Obtener workflow por defecto
   */
  async getDefault(): Promise<Workflow | null> {
    if (!this.useMocks) {
      return apiClient.get<Workflow | null>(`${API_ENDPOINTS.master.workflows}/default`);
    }

    await delay(200);
    return workflowsState.find(w => w.isDefault && w.status === 'active') || null;
  }

  /**
   * Obtener workflows activos
   */
  async getActive(): Promise<Workflow[]> {
    if (!this.useMocks) {
      return apiClient.get<Workflow[]>(`${API_ENDPOINTS.master.workflows}/active`);
    }

    await delay(200);
    return workflowsState.filter(w => w.status === 'active');
  }

  /**
   * Crear nuevo workflow
   */
  async create(data: CreateWorkflowDTO): Promise<Workflow> {
    if (!this.useMocks) {
      return apiClient.post<Workflow>(API_ENDPOINTS.master.workflows, data);
    }

    await delay(400);
    
    // Si es default, desactivar el default anterior
    if (data.isDefault) {
      workflowsState = workflowsState.map(w => ({ ...w, isDefault: false }));
    }

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

  /**
   * Actualizar workflow existente
   */
  async update(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    if (!this.useMocks) {
      return apiClient.put<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}`, data);
    }

    await delay(400);
    
    const index = workflowsState.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('Workflow no encontrado');
    }

    // Si se está poniendo como default, quitar el anterior
    if (data.isDefault) {
      workflowsState = workflowsState.map(w => 
        w.id !== id ? { ...w, isDefault: false } : w
      );
    }

    // Procesar escalationRules si existen, asegurando que tengan id
    const escalationRules = data.escalationRules
      ? data.escalationRules.map((rule, idx) => ({
          ...rule,
          id: (rule as { id?: string }).id || `rule-${Date.now()}-${idx}`,
        }))
      : workflowsState[index].escalationRules;

    const updatedWorkflow: Workflow = {
      ...workflowsState[index],
      ...data,
      escalationRules,
      steps: data.steps 
        ? data.steps.map((step, idx) => ({
            ...step,
            id: (step as WorkflowStep).id || `step-${Date.now()}-${idx}`,
            sequence: idx + 1,
            transitionConditions: (step as WorkflowStep).transitionConditions || [],
            notifications: (step as WorkflowStep).notifications || [],
          })) as WorkflowStep[]
        : workflowsState[index].steps,
      version: workflowsState[index].version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: 'current-user',
    };

    workflowsState = workflowsState.map(w => w.id === id ? updatedWorkflow : w);
    return updatedWorkflow;
  }

  /**
   * Eliminar workflow
   */
  async delete(id: string): Promise<void> {
    if (!this.useMocks) {
      return apiClient.delete<void>(`${API_ENDPOINTS.master.workflows}/${id}`);
    }

    await delay(300);
    
    const workflow = workflowsState.find(w => w.id === id);
    if (!workflow) {
      throw new Error('Workflow no encontrado');
    }

    // Verificar que no sea el único activo
    const activeCount = workflowsState.filter(w => w.status === 'active').length;
    if (workflow.status === 'active' && activeCount === 1) {
      throw new Error('No se puede eliminar el único workflow activo');
    }

    workflowsState = workflowsState.filter(w => w.id !== id);
  }

  /**
   * Duplicar workflow como plantilla
   */
  async duplicate(id: string, newName: string): Promise<Workflow> {
    if (!this.useMocks) {
      return apiClient.post<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/duplicate`, { newName });
    }

    await delay(400);
    
    const original = workflowsState.find(w => w.id === id);
    if (!original) {
      throw new Error('Workflow no encontrado');
    }

    const duplicated: Workflow = {
      ...original,
      id: `wf-${Date.now()}`,
      name: newName,
      code: `${original.code}-COPY-${Date.now().toString(36).toUpperCase()}`,
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

  /**
   * Cambiar estado del workflow
   */
  async changeStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    if (!this.useMocks) {
      return apiClient.patch<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/status`, { status });
    }

    await delay(300);
    
    const index = workflowsState.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('Workflow no encontrado');
    }

    // Validar transición de estado
    const current = workflowsState[index];
    if (status === 'active' && current.steps.length === 0) {
      throw new Error('No se puede activar un workflow sin hitos');
    }

    const updatedWorkflow: Workflow = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: 'current-user',
    };

    workflowsState = workflowsState.map(w => w.id === id ? updatedWorkflow : w);
    return updatedWorkflow;
  }

  // CONEXIÓN CON GEOCERCAS

  /**
   * Obtener geocercas disponibles para usar en hitos de workflows
   * Conecta con el módulo de geocercas
   */
  async getAvailableGeofences(): Promise<WorkflowGeofence[]> {
    if (!this.useMocks) {
      return apiClient.get<WorkflowGeofence[]>(`${API_ENDPOINTS.master.workflows}/available-geofences`);
    }

    await delay(200);
    
    return geofencesMock
      .filter(g => g.status === 'active')
      .map(g => {
        // Extraer coordenadas según el tipo de geometría
        let coords: { lat: number; lng: number } | undefined;
        if (g.geometry.type === 'circle') {
          coords = g.geometry.center;
        } else if (g.geometry.type === 'polygon') {
          coords = g.geometry.coordinates?.[0];
        } else if (g.geometry.type === 'corridor') {
          coords = g.geometry.path?.[0];
        }
        
        return {
          id: g.id,
          name: g.name,
          code: g.code,
          type: g.type,
          category: g.category,
          color: g.color,
          address: g.address,
          coordinates: coords,
        };
      });
  }

  /**
   * Obtener geocercas filtradas por categoría
   */
  async getGeofencesByCategory(category: string): Promise<WorkflowGeofence[]> {
    if (!this.useMocks) {
      return apiClient.get<WorkflowGeofence[]>(`${API_ENDPOINTS.master.workflows}/geofences-by-category/${category}`);
    }

    await delay(200);
    
    return geofencesMock
      .filter(g => g.status === 'active' && g.category === category)
      .map(g => {
        // Extraer coordenadas según el tipo de geometría
        let coords: { lat: number; lng: number } | undefined;
        if (g.geometry.type === 'circle') {
          coords = g.geometry.center;
        } else if (g.geometry.type === 'polygon') {
          coords = g.geometry.coordinates?.[0];
        } else if (g.geometry.type === 'corridor') {
          coords = g.geometry.path?.[0];
        }
        
        return {
          id: g.id,
          name: g.name,
          code: g.code,
          type: g.type,
          category: g.category,
          color: g.color,
          address: g.address,
          coordinates: coords,
        };
      });
  }

  /**
   * Validar que los hitos de un workflow tienen geocercas válidas
   */
  async validateWorkflowGeofences(workflowId: string): Promise<{
    valid: boolean;
    issues: Array<{ stepId: string; stepName: string; issue: string }>;
  }> {
    if (!this.useMocks) {
      return apiClient.get<{ valid: boolean; issues: Array<{ stepId: string; stepName: string; issue: string }> }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/validate-geofences`);
    }

    await delay(200);

    const workflow = workflowsState.find(w => w.id === workflowId);
    if (!workflow) {
      return { valid: false, issues: [{ stepId: '', stepName: '', issue: 'Workflow no encontrado' }] };
    }

    const issues: Array<{ stepId: string; stepName: string; issue: string }> = [];
    const geofenceIds = new Set(geofencesMock.map(g => g.id));

    for (const step of workflow.steps) {
      if (step.action === 'enter_geofence' || step.action === 'exit_geofence') {
        if (!step.actionConfig.geofenceId) {
          issues.push({
            stepId: step.id,
            stepName: step.name,
            issue: 'No tiene geocerca asignada',
          });
        } else if (!geofenceIds.has(step.actionConfig.geofenceId)) {
          issues.push({
            stepId: step.id,
            stepName: step.name,
            issue: `Geocerca "${step.actionConfig.geofenceId}" no existe o fue eliminada`,
          });
        }
      }
    }

    return { valid: issues.length === 0, issues };
  }

  // CONEXIÓN CON CLIENTES

  /**
   * Obtener clientes disponibles para asignar workflows
   */
  async getAvailableCustomers(): Promise<WorkflowCustomer[]> {
    if (!this.useMocks) {
      return apiClient.get<WorkflowCustomer[]>(`${API_ENDPOINTS.master.workflows}/available-customers`);
    }

    await delay(200);
    return mockCustomersForWorkflow;
  }

  /**
   * Obtener workflows aplicables a un cliente específico
   */
  async getWorkflowsForCustomer(customerId: string): Promise<Workflow[]> {
    if (!this.useMocks) {
      return apiClient.get<Workflow[]>(API_ENDPOINTS.master.workflows, { params: { customerId } });
    }

    await delay(200);
    
    return workflowsState.filter(w => 
      w.status === 'active' && (
        !w.applicableCustomerIds || 
        w.applicableCustomerIds.length === 0 ||
        w.applicableCustomerIds.includes(customerId)
      )
    );
  }

  // CONEXIÓN CON ÓRDENES

  /**
   * Aplicar un workflow a una orden
   * Genera los milestones basados en los pasos del workflow
   */
  async applyWorkflowToOrder(
    order: Order, 
    workflowId: string
  ): Promise<ApplyWorkflowResult> {
    if (!this.useMocks) {
      return apiClient.post<ApplyWorkflowResult>(`${API_ENDPOINTS.master.workflows}/${workflowId}/apply`, { orderId: order.id });
    }

    await delay(300);

    const workflow = workflowsState.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error('Workflow no encontrado');
    }

    if (workflow.status !== 'active') {
      throw new Error('El workflow no está activo');
    }

    // Generar milestones desde los pasos del workflow
    const milestones = workflow.steps
      .filter(step => step.action === 'enter_geofence' || step.action === 'exit_geofence')
      .map(step => ({
        id: `milestone-${order.id}-${step.id}`,
        name: step.name,
        geofenceId: step.actionConfig.geofenceId || '',
        sequence: step.sequence,
        estimatedDuration: step.estimatedDurationMinutes || 0,
      }));

    const totalEstimatedDuration = workflow.steps.reduce(
      (sum, step) => sum + (step.estimatedDurationMinutes || 0),
      0
    );

    return {
      success: true,
      order: {
        ...order,
        workflowId: workflow.id,
        workflowName: workflow.name,
      },
      milestones,
      totalEstimatedDuration,
    };
  }

  /**
   * Obtener el progreso de una orden en su workflow
   */
  async getOrderWorkflowProgress(orderId: string): Promise<OrderWorkflowProgress | null> {
    if (!this.useMocks) {
      return apiClient.get<OrderWorkflowProgress | null>(`${API_ENDPOINTS.operations.orders}/${orderId}/workflow-progress`);
    }

    await delay(200);
    
    // Mock: Simular que tenemos una orden con workflow
    // En producción esto vendría del servicio de órdenes
    const mockOrder = {
      id: orderId,
      orderNumber: 'ORD-2025-001',
      status: 'in_transit' as const,
      workflowId: 'wf-001',
    };

    const workflow = workflowsState.find(w => w.id === mockOrder.workflowId);
    if (!workflow) return null;

    // Simular progreso
    const currentStepIndex = 1; // Segundo paso
    const completedSteps = workflow.steps.slice(0, currentStepIndex).map(s => s.id);

    return {
      workflowId: workflow.id,
      orderId: mockOrder.id,
      currentStepId: workflow.steps[currentStepIndex]?.id || '',
      currentStepIndex,
      totalSteps: workflow.steps.length,
      completedSteps,
      skippedSteps: [],
      progressPercentage: Math.round((currentStepIndex / workflow.steps.length) * 100),
      timeInCurrentStep: 45, // minutos
      isDelayed: false,
      stepHistory: completedSteps.map(stepId => ({
        stepId,
        enteredAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 1800000).toISOString(),
        status: 'completed' as const,
      })),
      order: mockOrder,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        code: workflow.code,
      },
      currentStep: workflow.steps[currentStepIndex] || null,
      nextStep: workflow.steps[currentStepIndex + 1] || null,
      estimatedCompletion: new Date(Date.now() + 7200000).toISOString(),
    };
  }

  // CONEXIÓN CON PROGRAMACIÓN (SCHEDULING)

  /**
   * Calcular duración estimada para una programación basada en workflow
   */
  async calculateScheduleDuration(workflowId: string): Promise<{
    totalMinutes: number;
    totalHours: number;
    breakdown: Array<{ stepName: string; minutes: number }>;
  }> {
    if (!this.useMocks) {
      return apiClient.get<{ totalMinutes: number; totalHours: number; breakdown: Array<{ stepName: string; minutes: number }> }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/schedule-duration`);
    }

    await delay(200);

    const workflow = workflowsState.find(w => w.id === workflowId);
    if (!workflow) {
      throw new Error('Workflow no encontrado');
    }

    const breakdown = workflow.steps.map(step => ({
      stepName: step.name,
      minutes: step.estimatedDurationMinutes || 0,
    }));

    const totalMinutes = breakdown.reduce((sum, b) => sum + b.minutes, 0);

    return {
      totalMinutes,
      totalHours: Math.ceil(totalMinutes / 60),
      breakdown,
    };
  }

  /**
   * Sugerir workflow para una orden programada basado en tipo de carga y cliente
   */
  async suggestWorkflowForOrder(
    customerId: string,
    cargoType?: string
  ): Promise<Workflow | null> {
    if (!this.useMocks) {
      return apiClient.get<Workflow | null>(`${API_ENDPOINTS.master.workflows}/suggest`, { params: { customerId, cargoType } });
    }

    await delay(200);

    // Prioridad: workflow específico del cliente y tipo de carga
    let suggested = workflowsState.find(w =>
      w.status === 'active' &&
      w.applicableCustomerIds?.includes(customerId) &&
      cargoType && w.applicableCargoTypes?.includes(cargoType)
    );

    // Si no, workflow del cliente
    if (!suggested) {
      suggested = workflowsState.find(w =>
        w.status === 'active' &&
        w.applicableCustomerIds?.includes(customerId)
      );
    }

    // Si no, workflow por tipo de carga
    if (!suggested && cargoType) {
      suggested = workflowsState.find(w =>
        w.status === 'active' &&
        w.applicableCargoTypes?.includes(cargoType)
      );
    }

    // Si no, workflow por defecto
    if (!suggested) {
      suggested = workflowsState.find(w =>
        w.status === 'active' && w.isDefault
      );
    }

    return suggested || null;
  }

  /**
   * Validar que un workflow es compatible con una orden programada
   */
  async validateWorkflowForScheduledOrder(
    workflowId: string,
    scheduledOrder: Partial<ScheduledOrder>
  ): Promise<{
    compatible: boolean;
    warnings: string[];
    errors: string[];
  }> {
    if (!this.useMocks) {
      return apiClient.post<{ compatible: boolean; warnings: string[]; errors: string[] }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/validate-for-schedule`, scheduledOrder);
    }

    await delay(200);

    const workflow = workflowsState.find(w => w.id === workflowId);
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!workflow) {
      errors.push('Workflow no encontrado');
      return { compatible: false, warnings, errors };
    }

    if (workflow.status !== 'active') {
      errors.push('El workflow no está activo');
    }

    // Validar cliente
    if (scheduledOrder.customerId && 
        workflow.applicableCustomerIds?.length &&
        !workflow.applicableCustomerIds.includes(scheduledOrder.customerId)) {
      warnings.push('El workflow no está configurado para este cliente');
    }

    // Validar tipo de carga
    if (scheduledOrder.cargo?.type && 
        workflow.applicableCargoTypes?.length &&
        !workflow.applicableCargoTypes.includes(scheduledOrder.cargo.type)) {
      warnings.push('El workflow no está configurado para este tipo de carga');
    }

    // Validar duración estimada vs tiempo programado
    if (scheduledOrder.estimatedDuration) {
      const workflowDuration = workflow.steps.reduce(
        (sum, s) => sum + (s.estimatedDurationMinutes || 0), 0
      ) / 60; // Convertir a horas
      
      if (scheduledOrder.estimatedDuration < workflowDuration) {
        warnings.push(
          `El tiempo programado (${scheduledOrder.estimatedDuration}h) es menor ` +
          `que la duración estimada del workflow (${workflowDuration.toFixed(1)}h)`
        );
      }
    }

    return {
      compatible: errors.length === 0,
      warnings,
      errors,
    };
  }
}

// Singleton export
export const unifiedWorkflowService = new UnifiedWorkflowService();

// Export class for instantiation in tests
export { UnifiedWorkflowService };

// Alias para compatibilidad con código existente
export const WorkflowsService = UnifiedWorkflowService;
