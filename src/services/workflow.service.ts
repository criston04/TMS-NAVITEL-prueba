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

/**
 * 2026-05-03: helper para desempacar el envelope `{data: ...}` que el backend
 * devuelve sistematicamente en los endpoints nuevos de workflows. Aplica a
 * shapes que NO son Workflow (validate-geofences, schedule-duration, helpers).
 */
function unwrapData<T>(response: unknown): T {
  if (Array.isArray(response)) return response as T;
  if (response && typeof response === 'object') {
    const r = response as { data?: unknown; items?: unknown };
    if (r.data !== undefined) return r.data as T;
    if (r.items !== undefined) return r.items as T;
  }
  return response as T;
}

/**
 * Acciones del backend (shape libre) → WorkflowStepAction del frontend.
 * Si el tipo no encaja en ninguno de los 9 enums, cae a 'custom' (icono Circle).
 */
const BACKEND_TYPE_TO_STEP_ACTION: Record<string, string> = {
  enter_geofence: 'enter_geofence',
  exit_geofence: 'exit_geofence',
  manual_check: 'manual_check',
  document_upload: 'document_upload',
  signature: 'signature',
  photo_capture: 'photo_capture',
  temperature_check: 'temperature_check',
  weight_check: 'weight_check',
  notify: 'custom',
  notification: 'custom',
  webhook: 'custom',
  email: 'custom',
  sms: 'custom',
};

function mapBackendActionToStep(action: unknown, idx: number): Record<string, unknown> {
  if (!action || typeof action !== 'object') {
    return {
      id: `step-${idx}`,
      name: `Paso ${idx + 1}`,
      sequence: idx,
      action: 'custom',
      isRequired: true,
      canSkip: false,
      actionConfig: {},
      transitionConditions: [],
      notifications: [],
    };
  }
  const a = action as Record<string, unknown>;
  const rawType = (a.type ?? a.action) as string | undefined;
  const mappedAction = (rawType && BACKEND_TYPE_TO_STEP_ACTION[rawType]) ?? 'custom';
  const message = typeof a.message === 'string' ? a.message : undefined;
  const name =
    (typeof a.name === 'string' ? a.name : undefined)
    ?? message
    ?? `Paso ${idx + 1}`;

  return {
    id: typeof a.id === 'string' ? a.id : `step-${idx}`,
    name,
    description: typeof a.description === 'string' ? a.description : message,
    sequence: typeof a.sequence === 'number' ? a.sequence : idx,
    action: mappedAction,
    isRequired: typeof a.isRequired === 'boolean' ? a.isRequired : true,
    canSkip: typeof a.canSkip === 'boolean' ? a.canSkip : false,
    actionConfig: (a.actionConfig && typeof a.actionConfig === 'object')
      ? a.actionConfig as Record<string, unknown>
      : { instructions: message },
    estimatedDurationMinutes: typeof a.estimatedDurationMinutes === 'number'
      ? a.estimatedDurationMinutes
      : undefined,
    transitionConditions: Array.isArray(a.transitionConditions) ? a.transitionConditions : [],
    notifications: Array.isArray(a.notifications) ? a.notifications : [],
  };
}

function normalizeWorkflow(rawInput: unknown): Workflow | null {
  if (!rawInput || typeof rawInput !== 'object') return null;

  // 2026-05-03 (bug fix): el backend a veces devuelve {data: {...}} envuelto,
  // a veces el workflow directo. Desempacamos defensivamente antes de
  // normalizar. Detectado en suggestWorkflowForOrder cuando el backend
  // implemento /master/workflows/suggest devolviendo {data: {workflow}}.
  let unwrapped: unknown = rawInput;
  if (rawInput && typeof rawInput === 'object' && 'data' in (rawInput as Record<string, unknown>)) {
    const inner = (rawInput as { data?: unknown }).data;
    if (inner && typeof inner === 'object') {
      unwrapped = inner;
    } else {
      // {data: null} o {data: undefined} = sin workflow.
      return null;
    }
  }

  const w = snakeToCamel<Record<string, unknown>>(unwrapped);

  // El backend no devuelve `steps` por separado todavia; los `actions` se
  // serializan como JSON-string con shape backend-specific:
  //   [{type:"notify", target:"manager", message:"..."}, ...]
  // 2026-05-05 (bug fix): Antes copiabamos `actions` directo en `steps` y eso
  // crasheaba <WorkflowStepsPreview/> con:
  //   - "Each child should have a unique key" (step.id era undefined)
  //   - "Cannot read properties of undefined (reading 'icon')" (step.action
  //     era undefined porque backend usa `type`, no `action`)
  // Mapeamos cada accion del backend a la forma WorkflowStep que el front
  // espera, sintetizando id/sequence/action defensivamente.
  const actions = parseJsonField<unknown[]>((w as { actions?: unknown }).actions, []);
  const rawSteps = (w as { steps?: unknown }).steps;
  const steps = Array.isArray(rawSteps)
    ? (rawSteps as unknown[])
    : Array.isArray(actions)
      ? actions.map((a, idx) => mapBackendActionToStep(a, idx))
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
   * Crear nuevo workflow.
   *
   * 2026-05-15: el backend devuelve 400 "name, triggerEvent, actions required"
   * si faltan estos 3 campos top-level. El frontend conceptualiza workflows
   * como secuencia de `steps` con `action` por paso; el backend espera
   * además un `triggerEvent` (evento disparador) y un array `actions`
   * (acciones agregadas). Derivamos ambos automáticamente desde los steps
   * si no vienen explicitos en el DTO.
   */
  async create(data: CreateWorkflowDTO): Promise<Workflow> {
    const enriched = data as CreateWorkflowDTO & {
      triggerEvent?: string;
      actions?: unknown;
      steps?: Array<{ action?: string }>;
    };
    const payload: Record<string, unknown> = { ...enriched };

    // Default triggerEvent → "order_created" (caso más común en TMS)
    if (!payload.triggerEvent) {
      payload.triggerEvent = "order_created";
    }
    // Default actions → derivado de steps (cada step.action) o steps completos
    if (!payload.actions) {
      if (Array.isArray(enriched.steps) && enriched.steps.length > 0) {
        // Enviar tanto el array de acciones como referencia al backend
        payload.actions = enriched.steps;
      } else {
        payload.actions = [];
      }
    }

    // v3 Rev3: POST /workflows/definitions
    const raw = await apiClient.post<unknown>(API_ENDPOINTS.master.workflowDefinitions, payload);
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
   * Duplicar workflow como plantilla.
   * 2026-05-03: agregado normalizeWorkflow porque el backend devuelve {data: {...}}.
   */
  async duplicate(id: string, newName: string): Promise<Workflow> {
    const raw = await apiClient.post<unknown>(`${API_ENDPOINTS.master.workflows}/${id}/duplicate`, { newName });
    return normalizeWorkflow(raw) as Workflow;
  }

  /**
   * Cambiar estado del workflow.
   * 2026-05-03: agregado normalizeWorkflow.
   */
  async changeStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    const raw = await apiClient.patch<unknown>(`${API_ENDPOINTS.master.workflows}/${id}/status`, { status });
    return normalizeWorkflow(raw) as Workflow;
  }

  // CONEXIÓN CON GEOCERCAS

  /**
   * Obtener geocercas disponibles para usar en hitos de workflows
   * Conecta con el módulo de geocercas
   */
  async getAvailableGeofences(): Promise<WorkflowGeofence[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/helpers/available-geofences`);
    return unwrapData<WorkflowGeofence[]>(raw);
  }

  /**
   * Obtener geocercas filtradas por categoría
   */
  async getGeofencesByCategory(category: string): Promise<WorkflowGeofence[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/helpers/geofences-by-category/${category}`);
    return unwrapData<WorkflowGeofence[]>(raw);
  }

  /**
   * Validar que los hitos de un workflow tienen geocercas válidas.
   * 2026-05-03: agregado unwrapData. Backend devuelve {data: {valid, issues}}.
   */
  async validateWorkflowGeofences(workflowId: string): Promise<{
    valid: boolean;
    issues: Array<{ stepId: string; stepName: string; issue: string }>;
  }> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/${workflowId}/validate-geofences`);
    return unwrapData<{ valid: boolean; issues: Array<{ stepId: string; stepName: string; issue: string }> }>(raw);
  }

  // CONEXIÓN CON CLIENTES

  /**
   * Obtener clientes disponibles para asignar workflows
   */
  async getAvailableCustomers(): Promise<WorkflowCustomer[]> {
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/helpers/available-customers`);
    return unwrapData<WorkflowCustomer[]>(raw);
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
    // 2026-05-03: agregado unwrapData. Backend devuelve {data: {totalMinutes, totalHours, breakdown}}.
    const raw = await apiClient.get<unknown>(`${API_ENDPOINTS.master.workflows}/${workflowId}/schedule-duration`);
    return unwrapData<{ totalMinutes: number; totalHours: number; breakdown: Array<{ stepName: string; minutes: number }> }>(raw);
  }

  /**
   * Sugerir workflow para una orden programada basado en tipo de carga y cliente.
   *
   * 2026-05-03 (bug fix): el backend ahora SI implementa /master/workflows/suggest
   * (antes era 404 y el codigo caia al fallback getDefault). Pero el shape devuelto
   * es {data: {workflow sin steps}} y el frontend antes asignaba el envelope
   * completo a `Workflow` causando crash en `workflow.steps.filter` en
   * `module-connector.service.ts:120`. Fix: aplicar normalizeWorkflow que
   * desempaca {data} y sintetiza steps[] desde actions JSON-string.
   */
  async suggestWorkflowForOrder(
    customerId: string,
    cargoType?: string
  ): Promise<Workflow | null> {
    const raw = await apiClient.getOptional<unknown>(
      `${API_ENDPOINTS.master.workflows}/suggest`,
      { params: { customerId, cargoType } }
    );
    return normalizeWorkflow(raw);
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
