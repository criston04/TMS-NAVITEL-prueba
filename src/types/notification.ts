
/**
 * Tipo de notificación
 */
export type NotificationChannel = "email" | "sms" | "push" | "in_app" | "webhook";

/**
 * Categoría de notificación
 */
export type NotificationCategory =
  | "order"           // Relacionada con órdenes
  | "driver"          // Relacionada con conductores
  | "vehicle"         // Relacionada con vehículos
  | "maintenance"     // Mantenimiento
  | "document"        // Documentos por vencer
  | "geofence"        // Eventos de geocerca
  | "alert"           // Alertas del sistema
  | "system";         // Sistema general

/**
 * Prioridad de la notificación
 */
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

/**
 * Estado de la notificación
 */
export type NotificationStatus = 
  | "pending"         // Pendiente de envío
  | "sent"            // Enviada
  | "delivered"       // Entregada
  | "read"            // Leída
  | "failed"          // Falló el envío
  | "cancelled";      // Cancelada


/**
 * Notificación del sistema
 */
export interface SystemNotification {
  /** ID único */
  id: string;
  /** Título de la notificación */
  title: string;
  /** Mensaje/cuerpo de la notificación */
  message: string;
  /** Categoría */
  category: NotificationCategory;
  /** Prioridad */
  priority: NotificationPriority;
  /** Canal de envío */
  channel: NotificationChannel;
  /** Estado */
  status: NotificationStatus;
  /** ID del usuario destinatario */
  userId?: string;
  /** Email del destinatario (si aplica) */
  recipientEmail?: string;
  /** Teléfono del destinatario (si aplica) */
  recipientPhone?: string;
  /** Entidad relacionada */
  relatedEntity?: {
    type: "order" | "driver" | "vehicle" | "customer" | "geofence" | "maintenance";
    id: string;
    name?: string;
  };
  /** URL de acción (para in_app) */
  actionUrl?: string;
  /** Texto del botón de acción */
  actionLabel?: string;
  /** Datos adicionales */
  metadata?: Record<string, unknown>;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de envío */
  sentAt?: string;
  
  readAt?: string;
  /** Fecha de expiración */
  expiresAt?: string;
  /** Es persistente (no se elimina automáticamente) */
  isPersistent?: boolean;
}

/**
 * Preferencias de notificación del usuario
 */
export interface NotificationPreferences {
  
  userId: string;
  /** Canales habilitados por categoría */
  channels: {
    [key in NotificationCategory]?: NotificationChannel[];
  };
  /** Horario de no molestar */
  quietHours?: {
    enabled: boolean;
    startTime: string;  // HH:mm
    endTime: string;    // HH:mm
  };
  /** Recibir resumen diario */
  dailyDigest?: boolean;
  /** Email para resumen */
  digestEmail?: string;
  /** Sonido habilitado */
  soundEnabled?: boolean;
  /** Vibración habilitada */
  vibrationEnabled?: boolean;
}

/**
 * Plantilla de notificación
 */
export interface NotificationTemplate {
  /** ID único */
  id: string;
  /** Nombre de la plantilla */
  name: string;
  /** Categoría */
  category: NotificationCategory;
  /** Canal de envío */
  channel: NotificationChannel;
  /** Asunto (para email) */
  subject?: string;
  /** Cuerpo del mensaje */
  body: string;
  /** Variables disponibles */
  variables: string[];
  /** Está activa */
  isActive: boolean;
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de actualización */
  updatedAt: string;
}

/**
 * DTO para crear notificación
 */
export interface CreateNotificationDTO {
  title: string;
  message: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  userId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  relatedEntity?: {
    type: "order" | "driver" | "vehicle" | "customer" | "geofence" | "maintenance";
    id: string;
    name?: string;
  };
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: string;
  expiresAt?: string;
}

/**
 * Filtros para buscar notificaciones
 */
export interface NotificationFilters {
  userId?: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Estadísticas de notificaciones
 */
export interface NotificationStats {
  
  total: number;
  /** No leídas */
  unread: number;
  /** Pendientes de envío */
  pending: number;
  /** Enviadas hoy */
  sentToday: number;
  /** Fallidas */
  failed: number;
  /** Por categoría */
  byCategory: Record<NotificationCategory, number>;
  /** Por prioridad */
  byPriority: Record<NotificationPriority, number>;
}

export default SystemNotification;
