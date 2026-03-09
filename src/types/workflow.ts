/**
 * Estados posibles de un workflow
 * @enum {string}
 */
export type WorkflowStatus = 'active' | 'inactive' | 'draft';

/**
 * Tipos de acción en un paso del workflow
 * @enum {string}
 */
export type WorkflowStepAction =
  | 'enter_geofence'    // Entrar a una geocerca
  | 'exit_geofence'     // Salir de una geocerca
  | 'manual_check'      // Verificación manual
  | 'document_upload'   // Subir documento
  | 'signature'         // Capturar firma
  | 'photo_capture'     // Tomar foto
  | 'temperature_check' // Verificar temperatura
  | 'weight_check'      // Verificar peso
  | 'custom';           // Acción personalizada

/**
 * Tipos de condición para transiciones
 * @enum {string}
 */
export type WorkflowConditionType =
  | 'time_elapsed'      // Tiempo transcurrido
  | 'time_window'       // Dentro de ventana horaria
  | 'location_reached'  // Ubicación alcanzada
  | 'document_uploaded' // Documento subido
  | 'approval_received' // Aprobación recibida
  | 'manual_trigger'    // Disparador manual
  | 'always';           // Siempre (sin condición)

/**
 * Tipos de notificación del workflow
 * @enum {string}
 */
export type NotificationType =
  | 'email'
  | 'sms'
  | 'push'
  | 'webhook'
  | 'in_app';

/**
 * Representa una condición para una transición
 * @interface WorkflowCondition
 */
export interface WorkflowCondition {
  /** ID único de la condición */
  id: string;
  /** Tipo de condición */
  type: WorkflowConditionType;
  /** Parámetros de la condición */
  params: {
    /** Para time_elapsed: minutos */
    minutes?: number;
    /** Para time_window: hora inicio */
    startTime?: string;
    /** Para time_window: hora fin */
    endTime?: string;
    /** Para location_reached: ID de geocerca */
    geofenceId?: string;
    /** Para document_uploaded: tipo de documento */
    documentType?: string;
    /** Para approval_received: roles que pueden aprobar */
    approverRoles?: string[];
    /** Expresión personalizada */
    customExpression?: string;
  };
  /** Descripción legible de la condición */
  description: string;
}

/**
 * Configuración de notificación para un paso
 * @interface WorkflowNotification
 */
export interface WorkflowNotification {
  /** ID único */
  id: string;
  /** Tipo de notificación */
  type: NotificationType;
  /** Evento que dispara la notificación */
  trigger: 'on_enter' | 'on_exit' | 'on_delay' | 'on_complete';
  /** Destinatarios (roles o emails específicos) */
  recipients: string[];
  /** Plantilla del mensaje */
  template: {
    subject?: string;
    body: string;
    /** Variables disponibles: {{orderNumber}}, {{milestoneName}}, {{vehiclePlate}}, etc. */
    variables?: string[];
  };
  /** Retraso antes de enviar (minutos) */
  delayMinutes?: number;
  /** Solo enviar si hay retraso */
  onlyOnDelay?: boolean;
}

/**
 * Representa un paso/etapa del workflow
 * @interface WorkflowStep
 */
export interface WorkflowStep {
  /** ID único del paso */
  id: string;
  
  name: string;
  /** Descripción */
  description?: string;
  /** Orden de secuencia */
  sequence: number;
  /** Tipo de acción requerida */
  action: WorkflowStepAction;
  /** Es obligatorio completar este paso */
  isRequired: boolean;
  /** Permite saltar este paso */
  canSkip: boolean;
  /** Configuración específica de la acción */
  actionConfig: {
    /** Para geofence: ID de la geocerca */
    geofenceId?: string;
    /** Para geofence: nombre de la geocerca */
    geofenceName?: string;
    /** Para document: tipos de documento aceptados */
    acceptedDocumentTypes?: string[];
    /** Para photo: cantidad mínima de fotos */
    minPhotos?: number;
    /** Para temperature: rango aceptable */
    temperatureRange?: { min: number; max: number };
    /** Instrucciones para el operador */
    instructions?: string;
    /** Campos personalizados requeridos */
    customFields?: WorkflowCustomField[];
  };
  /** Tiempo estimado en este paso (minutos) */
  estimatedDurationMinutes?: number;
  /** Tiempo máximo permitido (minutos) antes de marcar como retraso */
  maxDurationMinutes?: number;
  /** Condiciones para avanzar al siguiente paso */
  transitionConditions: WorkflowCondition[];
  /** Notificaciones configuradas */
  notifications: WorkflowNotification[];
  /** Color para visualización */
  color?: string;
  /** Icono para visualización */
  icon?: string;
}

/**
 * Campo personalizado en un paso del workflow
 * @interface WorkflowCustomField
 */
export interface WorkflowCustomField {
  
  id: string;
  /** Nombre/etiqueta del campo */
  label: string;
  
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file';
  /** Es obligatorio */
  required: boolean;
  /** Texto de placeholder */
  placeholder?: string;
  /** Opciones (para select) */
  options?: Array<{ value: string; label: string }>;
  /** Valor por defecto */
  defaultValue?: string | number | boolean;
  /** Validación regex (para text) */
  validation?: string;
  /** Mensaje de error de validación */
  validationMessage?: string;
}

/**
 * Regla de escalamiento
 * @interface EscalationRule
 */
export interface EscalationRule {
  /** ID único */
  id: string;
  /** Nombre de la regla */
  name: string;
  /** Condición de activación */
  condition: {
    /** Tipo de condición */
    type: 'delay_threshold' | 'step_stuck' | 'no_update';
    /** Umbral en minutos */
    thresholdMinutes: number;
    /** Aplicar a pasos específicos (vacío = todos) */
    stepIds?: string[];
  };
  /** Acciones a ejecutar */
  actions: Array<{
    type: 'notify' | 'reassign' | 'flag' | 'auto_close';
    config: {
      notificationConfig?: WorkflowNotification;
      reassignTo?: string;
      flagType?: 'warning' | 'critical';
      autoCloseReason?: string;
    };
  }>;
  /** Está activa */
  isActive: boolean;
}

/**
 * Representa un workflow completo configurable
 * @interface Workflow
 */
export interface Workflow {
  /** ID único del workflow */
  id: string;
  
  name: string;
  /** Descripción */
  description: string;
  /** Código único (para referencia) */
  code: string;
  
  status: WorkflowStatus;
  /** Versión del workflow */
  version: number;
  
  steps: WorkflowStep[];
  /** Reglas de escalamiento */
  escalationRules: EscalationRule[];
  /** Tipos de carga aplicables (vacío = todos) */
  applicableCargoTypes?: string[];
  /** Clientes aplicables (vacío = todos) */
  applicableCustomerIds?: string[];
  /** Transportistas aplicables (vacío = todos) */
  applicableCarrierIds?: string[];
  /** Es el workflow por defecto */
  isDefault: boolean;
  /** Fecha de creación */
  createdAt: string;
  /** Usuario que lo creó */
  createdBy: string;
  /** Fecha de última modificación */
  updatedAt: string;
  /** Usuario que lo modificó */
  updatedBy: string;
  /** Metadatos adicionales */
  metadata?: Record<string, unknown>;
}

/**
 * DTO para crear un nuevo workflow
 * @interface CreateWorkflowDTO
 */
export interface CreateWorkflowDTO {
  name: string;
  description: string;
  code: string;
  steps: Omit<WorkflowStep, 'id'>[];
  escalationRules?: Omit<EscalationRule, 'id'>[];
  applicableCargoTypes?: string[];
  applicableCustomerIds?: string[];
  applicableCarrierIds?: string[];
  isDefault?: boolean;
}

/**
 * DTO para actualizar un workflow
 * @interface UpdateWorkflowDTO
 */
export interface UpdateWorkflowDTO extends Partial<CreateWorkflowDTO> {
  status?: WorkflowStatus;
}

/**
 * Progreso de una orden en un workflow
 * @interface WorkflowProgress
 */
export interface WorkflowProgress {
  
  workflowId: string;
  /** ID de la orden */
  orderId: string;
  /** Paso actual */
  currentStepId: string;
  /** Índice del paso actual */
  currentStepIndex: number;
  
  totalSteps: number;
  /** Pasos completados */
  completedSteps: string[];
  /** Pasos saltados */
  skippedSteps: string[];
  /** Porcentaje de avance */
  progressPercentage: number;
  /** Tiempo en el paso actual (minutos) */
  timeInCurrentStep: number;
  /** Está retrasado */
  isDelayed: boolean;
  /** Historial de pasos */
  stepHistory: Array<{
    stepId: string;
    enteredAt: string;
    completedAt?: string;
    skippedAt?: string;
    status: 'completed' | 'skipped' | 'in_progress';
    data?: Record<string, unknown>;
  }>;
}

/**
 * Filtros para búsqueda de workflows
 * @interface WorkflowFilters
 */
export interface WorkflowFilters {
  search?: string;
  status?: WorkflowStatus;
  isDefault?: boolean;
  applicableCargoType?: string;
  applicableCustomerId?: string;
}
