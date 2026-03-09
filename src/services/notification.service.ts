import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";
import {
  mockNotifications,
  mockNotificationTemplates,
  defaultPreferences,
} from "@/mocks/notifications";
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
 * Servicio para gestión de notificaciones del sistema
 */
class NotificationService {
  private notifications: SystemNotification[] = [...mockNotifications];
  private templates: NotificationTemplate[] = [...mockNotificationTemplates];
  private preferences: Map<string, NotificationPreferences> = new Map([
    ["user-001", defaultPreferences],
  ]);
  private listeners: Set<(notification: SystemNotification) => void> = new Set();
  private useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Simula delay de red
   */
  private async simulateDelay(ms: number = 200): Promise<void> {
    if (this.useMocks) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  /**
   * Genera ID único
   */
  private generateId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

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
    await this.simulateDelay();

    if (this.useMocks) {
      let filtered = [...this.notifications];

      // Aplicar filtros
      if (filters.userId) {
        filtered = filtered.filter(n => n.userId === filters.userId);
      }
      if (filters.category) {
        filtered = filtered.filter(n => n.category === filters.category);
      }
      if (filters.priority) {
        filtered = filtered.filter(n => n.priority === filters.priority);
      }
      if (filters.channel) {
        filtered = filtered.filter(n => n.channel === filters.channel);
      }
      if (filters.status) {
        filtered = filtered.filter(n => n.status === filters.status);
      }
      if (filters.isRead !== undefined) {
        filtered = filtered.filter(n => 
          filters.isRead ? n.readAt !== undefined : n.readAt === undefined
        );
      }
      if (filters.startDate) {
        filtered = filtered.filter(n => 
          new Date(n.createdAt) >= new Date(filters.startDate!)
        );
      }
      if (filters.endDate) {
        filtered = filtered.filter(n => 
          new Date(n.createdAt) <= new Date(filters.endDate!)
        );
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(n =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search)
        );
      }

      // Ordenar por fecha (más reciente primero)
      filtered.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Contar no leídas
      const unreadCount = filtered.filter(n => !n.readAt).length;

      // Paginación
      const start = (page - 1) * pageSize;
      const paginatedData = filtered.slice(start, start + pageSize);

      return {
        data: paginatedData,
        total: filtered.length,
        page,
        pageSize,
        unreadCount,
      };
    }

    return apiClient.get(API_ENDPOINTS.notifications.base, { params: { ...filters, page, pageSize } });
  }

  /**
   * Obtiene una notificación por ID
   */
  async getNotificationById(id: string): Promise<SystemNotification | null> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.notifications.find(n => n.id === id) || null;
    }

    return apiClient.get(`${API_ENDPOINTS.notifications.base}/${id}`);
  }

  /**
   * Crea y envía una notificación
   */
  async createNotification(data: CreateNotificationDTO): Promise<SystemNotification> {
    await this.simulateDelay(300);

    if (this.useMocks) {
      const now = new Date().toISOString();
      
      const newNotification: SystemNotification = {
        id: this.generateId(),
        title: data.title,
        message: data.message,
        category: data.category,
        priority: data.priority || "medium",
        channel: data.channel || "in_app",
        status: "pending",
        userId: data.userId,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        relatedEntity: data.relatedEntity,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        metadata: data.metadata,
        expiresAt: data.expiresAt,
        createdAt: now,
      };

      // Simular envío
      newNotification.status = "sent";
      newNotification.sentAt = now;

      // Simular entrega (para in_app es inmediato)
      if (newNotification.channel === "in_app") {
        newNotification.status = "delivered";
      }

      this.notifications.unshift(newNotification);

      // Notificar a los listeners
      this.notifyListeners(newNotification);

      return newNotification;
    }

    return apiClient.post(API_ENDPOINTS.notifications.base, data);
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(id: string): Promise<SystemNotification> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      const notification = this.notifications.find(n => n.id === id);
      if (!notification) {
        throw new Error(`Notificación con ID ${id} no encontrada`);
      }

      notification.status = "read";
      notification.readAt = new Date().toISOString();

      return notification;
    }

    return apiClient.patch(`${API_ENDPOINTS.notifications.base}/${id}/read`);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  async markAllAsRead(userId?: string): Promise<number> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      let count = 0;
      const now = new Date().toISOString();

      for (const notification of this.notifications) {
        if (!notification.readAt) {
          if (!userId || notification.userId === userId) {
            notification.status = "read";
            notification.readAt = now;
            count++;
          }
        }
      }

      return count;
    }

    return apiClient.patch(`${API_ENDPOINTS.notifications.base}/mark-all-read`, { userId });
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(id: string): Promise<boolean> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      const index = this.notifications.findIndex(n => n.id === id);
      if (index === -1) {
        return false;
      }

      this.notifications.splice(index, 1);
      return true;
    }

    return apiClient.delete(`${API_ENDPOINTS.notifications.base}/${id}`);
  }

  /**
   * Elimina notificaciones antiguas
   */
  async deleteOldNotifications(olderThanDays: number = 30): Promise<number> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const initialLength = this.notifications.length;
      this.notifications = this.notifications.filter(n => 
        n.isPersistent || new Date(n.createdAt) >= cutoffDate
      );

      return initialLength - this.notifications.length;
    }

    return apiClient.delete(`${API_ENDPOINTS.notifications.base}/old`, { params: { olderThanDays } });
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  async getStats(userId?: string): Promise<NotificationStats> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      let notifications = this.notifications;
      if (userId) {
        notifications = notifications.filter(n => n.userId === userId);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const byCategory: Record<NotificationCategory, number> = {
        order: 0,
        driver: 0,
        vehicle: 0,
        maintenance: 0,
        document: 0,
        geofence: 0,
        alert: 0,
        system: 0,
      };

      const byPriority: Record<NotificationPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      };

      notifications.forEach(n => {
        byCategory[n.category]++;
        byPriority[n.priority]++;
      });

      return {
        total: notifications.length,
        unread: notifications.filter(n => !n.readAt).length,
        pending: notifications.filter(n => n.status === "pending").length,
        sentToday: notifications.filter(n => 
          n.sentAt && new Date(n.sentAt) >= today
        ).length,
        failed: notifications.filter(n => n.status === "failed").length,
        byCategory,
        byPriority,
      };
    }

    return apiClient.get(API_ENDPOINTS.notifications.stats, { params: userId ? { userId } : undefined });
  }

  // PREFERENCIAS

  /**
   * Obtiene preferencias de notificación de un usuario
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      return this.preferences.get(userId) || {
        ...defaultPreferences,
        userId,
      };
    }

    return apiClient.get(`${API_ENDPOINTS.notifications.preferences}/${userId}`);
  }

  /**
   * Actualiza preferencias de notificación
   */
  async updatePreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    await this.simulateDelay(200);

    if (this.useMocks) {
      const current = this.preferences.get(userId) || { ...defaultPreferences, userId };
      const updated = { ...current, ...updates, userId };
      this.preferences.set(userId, updated);
      return updated;
    }

    return apiClient.put(`${API_ENDPOINTS.notifications.preferences}/${userId}`, updates);
  }

  // PLANTILLAS

  /**
   * Obtiene plantillas de notificación
   */
  async getTemplates(category?: NotificationCategory): Promise<NotificationTemplate[]> {
    await this.simulateDelay(100);

    if (this.useMocks) {
      if (category) {
        return this.templates.filter(t => t.category === category);
      }
      return this.templates;
    }

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
    await this.simulateDelay(200);

    if (this.useMocks) {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Plantilla con ID ${templateId} no encontrada`);
      }

      // Reemplazar variables en el cuerpo
      let message = template.body;
      let subject = template.subject;
      
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        message = message.replace(regex, value);
        if (subject) {
          subject = subject.replace(regex, value);
        }
      }

      return this.createNotification({
        title: subject || template.name,
        message,
        category: template.category,
        channel: template.channel,
        ...options,
      });
    }

    return apiClient.post(`${API_ENDPOINTS.notifications.templates}/${templateId}/create`, { variables, ...options });
  }

  // SUSCRIPCIÓN EN TIEMPO REAL

  /**
   * Suscribe a nuevas notificaciones
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
