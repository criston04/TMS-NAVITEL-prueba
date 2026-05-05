import { API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import type {
  SystemNotification,
  NotificationPreferences,
  NotificationTemplate,
  CreateNotificationDTO,
  NotificationFilters,
  NotificationStats,
  NotificationCategory,
  NotificationPriority,
} from "@/types/notification";

/**
 * ⚠️ MÓDULO PENDIENTE DE BACKEND (verificado 2026-05-03)
 *
 * Los endpoints `/notifications/*` que este service llama NO están en el
 * Excel oficial ni implementados en producción. La UI usa este service en
 * el header (campana de notificaciones), `scheduling-notifications.tsx`
 * y la integración con reminders.
 *
 * Mientras el backend implemente, el hook `useNotifications` debe manejar
 * el 404 con `isBackendNotImplemented` para mostrar estado "sin notificaciones"
 * en lugar de error.
 *
 * Ver `otros/docs-backend/...-notifications-...` para detalle del contrato.
 */


/**
 * Servicio para gestión de notificaciones del sistema
 */
class NotificationService {
  private listeners: Set<(notification: SystemNotification) => void> = new Set();

  /**
   * Obtiene notificaciones con filtros
   */
  async getNotifications(
    filters: NotificationFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    data: SystemNotification[];
    total: number;
    page: number;
    pageSize: number;
    unreadCount: number;
  }> {
    return apiClient.get(API_ENDPOINTS.notifications.base, { params: { ...filters, page, pageSize } });
  }

  /**
   * Obtiene una notificación por ID
   */
  async getNotificationById(id: string): Promise<SystemNotification | null> {
    return apiClient.get(`${API_ENDPOINTS.notifications.base}/${id}`);
  }

  /**
   * Crea y envía una notificación
   */
  async createNotification(data: CreateNotificationDTO): Promise<SystemNotification> {
    const created = await apiClient.post<SystemNotification>(API_ENDPOINTS.notifications.base, data);
    // Notificar a los listeners locales
    this.notifyListeners(created);
    return created;
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string): Promise<SystemNotification> {
    return apiClient.patch(`${API_ENDPOINTS.notifications.base}/${id}/read`);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId?: string): Promise<number> {
    return apiClient.patch(`${API_ENDPOINTS.notifications.base}/mark-all-read`, { userId });
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(id: string): Promise<boolean> {
    return apiClient.delete(`${API_ENDPOINTS.notifications.base}/${id}`);
  }

  /**
   * Elimina notificaciones antiguas
   */
  async deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
    return apiClient.delete(`${API_ENDPOINTS.notifications.base}/old`, { params: { olderThanDays } });
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  async getStats(userId?: string): Promise<NotificationStats> {
    return apiClient.get(API_ENDPOINTS.notifications.stats, { params: userId ? { userId } : undefined });
  }

  // PREFERENCIAS

  /**
   * Obtiene preferencias de notificación de un usuario
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return apiClient.get(`${API_ENDPOINTS.notifications.preferences}/${userId}`);
  }

  /**
   * Actualiza preferencias de notificación
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    return apiClient.put(`${API_ENDPOINTS.notifications.preferences}/${userId}`, updates);
  }

  // PLANTILLAS

  /**
   * Obtiene plantillas de notificación
   */
  async getTemplates(category?: NotificationCategory): Promise<NotificationTemplate[]> {
    return apiClient.get(API_ENDPOINTS.notifications.templates, { params: category ? { category } : undefined });
  }

  /**
   * Crea una notificación usando una plantilla
   */
  async createFromTemplate(
    templateId: string,
    variables: Record<string, string>,
    options: Partial<CreateNotificationDTO> = {}
  ): Promise<SystemNotification> {
    return apiClient.post(
      `${API_ENDPOINTS.notifications.templates}/${templateId}/create`,
      { variables, ...options }
    );
  }

  // SUSCRIPCIÓN EN TIEMPO REAL

  /**
   * Suscribe a nuevas notificaciones (eventos locales tras createNotification)
   */
  subscribe(callback: (notification: SystemNotification) => void): () => void {
    this.listeners.add(callback);

    // Retorna función de desuscripción
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica a todos los listeners
   */
  private notifyListeners(notification: SystemNotification): void {
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error("[NotificationService] Error en listener:", error);
      }
    });
  }

  /**
   * Envía notificación de orden completada
   */
  async notifyOrderCompleted(
    orderId: string,
    orderNumber: string,
    userId?: string
  ): Promise<SystemNotification> {
    return this.createNotification({
      title: "Orden completada",
      message: `La orden ${orderNumber} ha sido completada exitosamente.`,
      category: "order",
      priority: "medium",
      channel: "in_app",
      userId,
      relatedEntity: {
        type: "order",
        id: orderId,
        name: orderNumber,
      },
      actionUrl: `/orders/${orderId}`,
      actionLabel: "Ver orden",
    });
  }

  /**
   * Envía notificación de documento por vencer
   */
  async notifyDocumentExpiring(
    entityType: "driver" | "vehicle",
    entityId: string,
    entityName: string,
    documentType: string,
    daysRemaining: number,
    userId?: string
  ): Promise<SystemNotification> {
    const priority: NotificationPriority =
      daysRemaining <= 7 ? "urgent" : daysRemaining <= 15 ? "high" : "medium";

    return this.createNotification({
      title: "Documento por vencer",
      message: `El documento "${documentType}" de ${entityName} vence en ${daysRemaining} días.`,
      category: "document",
      priority,
      channel: "in_app",
      userId,
      relatedEntity: {
        type: entityType,
        id: entityId,
        name: entityName,
      },
      actionUrl: `/master/${entityType}s/${entityId}`,
      actionLabel: `Ver ${entityType === "driver" ? "conductor" : "vehículo"}`,
    });
  }

  /**
   * Envía notificación de evento de geocerca
   */
  async notifyGeofenceEvent(
    vehicleId: string,
    vehiclePlate: string,
    geofenceName: string,
    eventType: "entry" | "exit",
    userId?: string
  ): Promise<SystemNotification> {
    const action = eventType === "entry" ? "ha ingresado a" : "ha salido de";

    return this.createNotification({
      title: `Alerta de geocerca: ${eventType === "entry" ? "Entrada" : "Salida"}`,
      message: `El vehículo ${vehiclePlate} ${action} la geocerca "${geofenceName}".`,
      category: "geofence",
      priority: "high",
      channel: "in_app",
      userId,
      relatedEntity: {
        type: "vehicle",
        id: vehicleId,
        name: vehiclePlate,
      },
      actionUrl: "/monitoring/tracking",
      actionLabel: "Ver en mapa",
      metadata: {
        eventType,
        geofenceName,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Envía notificación de mantenimiento próximo
   */
  async notifyMaintenanceDue(
    vehicleId: string,
    vehiclePlate: string,
    maintenanceType: string,
    dueDate: string,
    userId?: string
  ): Promise<SystemNotification> {
    const daysUntil = Math.ceil(
      (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const priority: NotificationPriority =
      daysUntil <= 0 ? "urgent" : daysUntil <= 3 ? "high" : "medium";

    return this.createNotification({
      title: "Mantenimiento programado",
      message: `El vehículo ${vehiclePlate} tiene ${maintenanceType} programado para ${
        daysUntil <= 0 ? "hoy" : `en ${daysUntil} días`
      }.`,
      category: "maintenance",
      priority,
      channel: "in_app",
      userId,
      relatedEntity: {
        type: "vehicle",
        id: vehicleId,
        name: vehiclePlate,
      },
      actionUrl: `/master/vehicles/${vehicleId}/maintenance`,
      actionLabel: "Ver mantenimiento",
    });
  }
}

/** Instancia singleton del servicio */
export const notificationService = new NotificationService();

export default notificationService;
