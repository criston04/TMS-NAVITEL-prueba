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
import { API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';
import { snakeToCamel } from '@/lib/case-converter';

/**
 * Normaliza un Workflow asegurando que arrays requeridos siempre existan.
 * El backend a veces devuelve workflows sin el array `steps` (solo metadatos),
 * lo que provoca crashes en componentes que hacen `workflow.steps.length`.
 * Este helper garantiza que nunca llegue undefined a la UI.
 */
/**
 * 2026-05-03: el backend devuelve los workflows en snake_case
 * (`trigger_event`, `is_active`, `is_default`, `execution_count`,
 * `last_executed_at`, `created_by`, `created_at`, `updated_at`, `tenant_id`)
 * y NO incluye campos como `code`, `version`, `steps`, `applicableCargoTypes`,
 * etc. Convertimos snake → camel y forzamos defaults para que la UI no crashee.
 *
 * `actions` en backend viene como string JSON (`"[...]"`), lo deserializamos.
 */
function parseJsonField<T>(raw: unknown, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeWorkflow(rawInput: unknown): Workflow | null {
  if (!rawInput || typeof rawInput !== 'object') return null;
  const w = snakeToCamel<Record<string, unknown>>(rawInput);

  // El backend no devuelve `steps` por separado todavia; los `actions` se
  // serializan como JSON-string. Si actions es array, lo usamos como steps
  // estimados (cada accion ≈ un hito).
  const actions = parseJsonField<unknown[]>((w as { actions?: unknown }).actions, []);
  const steps = Array.isArray((w as { steps?: unknown }).steps)
    ? ((w as { steps: unknown[] }).steps)
    : Array.isArray(actions)
      ? actions
      : [];

  return {
    ...(w as Record<string, unknown>),
    steps: steps as Workflow['steps'],
    escalationRules: Array.isArray((w as { escalationRules?: unknown }).escalationRules)
      ? ((w as { escalationRules: Workflow['escalationRules'] }).escalationRules)
      : [],
    applicableCargoTypes: Array.isArray((w as { applicableCargoTypes?: unknown }).applicableCargoTypes)
      ? ((w as { applicableCargoTypes: string[] }).applicableCargoTypes)
      : [],
    applicableCustomerIds: Array.isArray((w as { applicableCustomerIds?: unknown }).applicableCustomerIds)
      ? ((w as { applicableCustomerIds: string[] }).applicableCustomerIds)
      : [],
    applicableCarrierIds: Array.isArray((w as { applicableCarrierIds?: unknown }).applicableCarrierIds)
      ? ((w as { applicableCarrierIds: string[] }).applicableCarrierIds)
      : [],
    // Backend no devuelve `code`; usamos id corto como pseudo-codigo
    code: (w as { code?: string }).code
      ?? (typeof (w as { id?: string }).id === 'string'
        ? `WF-${((w as { id: string }).id).slice(0, 8).toUpperCase()}`
        : ''),
    version: (w as { version?: number }).version ?? 1,
    // Coerce flags numéricos (backend devuelve 0/1) a boolean
    isActive: Boolean((w as { isActive?: unknown }).isActive),
    isDefault: Boolean((w as { isDefault?: unknown }).isDefault),
  } as unknown as Workflow;
}

function normalizeWorkflowList(list: unknown): Workflow[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((w) => normalizeWorkflow(w))
    .filter((w): w is Workflow => w !== null);
}

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
  /**
   * Obtener todos los workflows
   */
  async getAll(filters?: WorkflowFilters): Promise<Workflow[]> {
    // 2026-05-03: comentarios viejos referían a `/workflows/definitions` que NO
    // existe. La constante `workflowDefinitions` apunta a `/master/workflows`
    // (sin /definitions). Verificado contra producción.
    const response = await apiClient.get<unknown>(
      API_ENDPOINTS.master.workflowDefinitions,
      { params: filters as unknown as Record<string, string> }
    );
    // Unwrap envelope (backend a veces devuelve {data: []} o {items: []})
    let list: unknown = response;
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const r = response as { data?: unknown; items?: unknown };
      list = r.data ?? r.items ?? [];
    }
    // Normaliza: snake→camel, defaults para arrays opcionales y campos faltantes
    return normalizeWorkflowList(list);
  }

  /**
   * Obtener workflow por ID
   */
  async getById(id: string): Promise<Workflow | null> {
    // v3 Rev3: CRUD de definiciones bajo /workflows/definitions/:id
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflowDefinitions}/${id}`);
    return normalizeWorkflow(raw);
  }

  /**
   * Obtener workflow por defecto
   */
  async getDefault(): Promise<Workflow | null> {
    // /workflows/default es otro endpoint que backend no implementa (ver BACKEND_PENDIENTE)
    const raw = await apiClient.getOptional<unknown>(`${API_ENDPOINTS.master.workflows}/default`);
    return normalizeWorkflow(raw);
  }

  /**
   * Obtener workflows activos
   */
  async getActive(): Promise<Workflow[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/active`);
    return normalizeWorkflowList(raw);
  }

  /**
   * Crear nuevo workflow
   */
  async create(data: CreateWorkflowDTO): Promise<Workflow> {
    // v3 Rev3: POST /workflows/definitions
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.master.workflowDefinitions, data);
    return normalizeWorkflow(raw) as Workflow;
  }

  /**
   * Actualizar workflow existente
   */
  async update(id: string, data: UpdateWorkflowDTO): Promise<Workflow> {
    // v3 Rev3: PUT /workflows/definitions/:id
    const raw = await apiClient.put<unknown>(`${API_ENDPOINTS.master.workflowDefinitions}/${id}`, data);
    return normalizeWorkflow(raw) as Workflow;
  }

  /**
   * Eliminar workflow
   */
  async delete(id: string): Promise<void> {
    // v3 Rev3: DELETE /workflows/definitions/:id
    return apiClient.delete<void>(`${API_ENDPOINTS.master.workflowDefinitions}/${id}`);
  }

  /**
   * Duplicar workflow como plantilla
   */
  async duplicate(id: string, newName: string): Promise<Workflow> {
    return apiClient.post<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/duplicate`, { newName });
  }

  /**
   * Cambiar estado del workflow
   */
  async changeStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    return apiClient.patch<Workflow>(`${API_ENDPOINTS.master.workflows}/${id}/status`, { status });
  }

  // CONEXIÓN CON GEOCERCAS

  /**
   * Obtener geocercas disponibles para usar en hitos de workflows
   * Conecta con el módulo de geocercas
   */
  async getAvailableGeofences(): Promise<WorkflowGeofence[]> {
    return apiClient.get<WorkflowGeofence[]>(`${API_ENDPOINTS.master.workflows}/helpers/available-geofences`);
  }

  /**
   * Obtener geocercas filtradas por categoría
   */
  async getGeofencesByCategory(category: string): Promise<WorkflowGeofence[]> {
    return apiClient.get<WorkflowGeofence[]>(`${API_ENDPOINTS.master.workflows}/helpers/geofences-by-category/${category}`);
  }

  /**
   * Validar que los hitos de un workflow tienen geocercas válidas
   */
  async validateWorkflowGeofences(workflowId: string): Promise<{
    valid: boolean;
    issues: Array<{ stepId: string; stepName: string; issue: string }>;
  }> {
    return apiClient.get<{ valid: boolean; issues: Array<{ stepId: string; stepName: string; issue: string }> }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/validate-geofences`);
  }

  // CONEXIÓN CON CLIENTES

  /**
   * Obtener clientes disponibles para asignar workflows
   */
  async getAvailableCustomers(): Promise<WorkflowCustomer[]> {
    return apiClient.get<WorkflowCustomer[]>(`${API_ENDPOINTS.master.workflows}/helpers/available-customers`);
  }

  /**
   * Obtener workflows aplicables a un cliente específico
   */
  async getWorkflowsForCustomer(customerId: string): Promise<Workflow[]> {
    const response = await apiClient.get<unknown>(
      API_ENDPOINTS.master.workflows,
      { params: { customerId } }
    );
    let list: unknown = response;
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const r = response as { data?: unknown; items?: unknown };
      list = r.data ?? r.items ?? [];
    }
    return normalizeWorkflowList(list);
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
    return apiClient.post<ApplyWorkflowResult>(`${API_ENDPOINTS.master.workflows}/${workflowId}/apply`, { orderId: order.id });
  }

  /**
   * Obtener el progreso de una orden en su workflow
   */
  async getOrderWorkflowProgress(orderId: string): Promise<OrderWorkflowProgress | null> {
    return apiClient.get<OrderWorkflowProgress | null>(`${API_ENDPOINTS.operations.orders}/${orderId}/workflow-progress`);
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
    return apiClient.get<{ totalMinutes: number; totalHours: number; breakdown: Array<{ stepName: string; minutes: number }> }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/schedule-duration`);
  }

  /**
   * Sugerir workflow para una orden programada basado en tipo de carga y cliente
   */
  async suggestWorkflowForOrder(
    customerId: string,
    cargoType?: string
  ): Promise<Workflow | null> {
    // NOTE: /workflows/suggest es un endpoint custom del frontend que el backend
    // NO implementa todavia (ver documentos pendientes/BACKEND_PENDIENTE).
    // getOptional() trata el 404 como "sin sugerencia" y el caller cae a getDefault().
    return apiClient.getOptional<Workflow>(
      `${API_ENDPOINTS.master.workflows}/suggest`,
      { params: { customerId, cargoType } }
    );
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
    return apiClient.post<{ compatible: boolean; warnings: string[]; errors: string[] }>(`${API_ENDPOINTS.master.workflows}/${workflowId}/validate-for-schedule`, scheduledOrder);
  }
}

// Singleton export
export const unifiedWorkflowService = new UnifiedWorkflowService();

// Export class for instantiation in tests
export { UnifiedWorkflowService };

// Alias para compatibilidad con código existente
export const WorkflowsService = UnifiedWorkflowService;
