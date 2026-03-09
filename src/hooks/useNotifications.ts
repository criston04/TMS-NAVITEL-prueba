import { useState, useEffect, useCallback, useMemo } from "react";
import { notificationService } from "@/services/notification.service";
import type {
  SystemNotification,
  NotificationFilters,
  NotificationStats,
  NotificationPreferences,
  NotificationCategory,
  CreateNotificationDTO,
} from "@/types/notification";


/**
 * Estado del hook
 */
interface UseNotificationsState {
  notifications: SystemNotification[];
  stats: NotificationStats | null;
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
  total: number;
  unreadCount: number;
}

/**
 * Resultado del hook
 */
interface UseNotificationsReturn extends UseNotificationsState {
  /** Recargar notificaciones */
  refresh: () => Promise<void>;
  /** Cargar más notificaciones */
  loadMore: () => Promise<void>;
  /** Marcar como leída */
  markAsRead: (id: string) => Promise<void>;
  /** Marcar todas como leídas */
  markAllAsRead: () => Promise<void>;
  /** Eliminar notificación */
  deleteNotification: (id: string) => Promise<void>;
  /** Aplicar filtros */
  applyFilters: (filters: NotificationFilters) => void;
  
  filters: NotificationFilters;
  /** Crear notificación */
  createNotification: (data: CreateNotificationDTO) => Promise<SystemNotification>;
  /** Actualizar preferencias */
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  /** Notificaciones no leídas */
  unreadNotifications: SystemNotification[];
  /** Notificaciones por categoría */
  notificationsByCategory: Record<NotificationCategory, SystemNotification[]>;
  /** Tiene notificaciones no leídas */
  hasUnread: boolean;
  /** Tiene notificaciones urgentes */
  hasUrgent: boolean;
  /** Puede cargar más */
  hasMore: boolean;
}

const _defaultStats: NotificationStats = {
  total: 0,
  unread: 0,
  pending: 0,
  sentToday: 0,
  failed: 0,
  byCategory: {
    order: 0,
    driver: 0,
    vehicle: 0,
    maintenance: 0,
    document: 0,
    geofence: 0,
    alert: 0,
    system: 0,
  },
  byPriority: {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  },
};


/**
 * Hook para gestionar notificaciones del sistema
 * 
 * @param userId - ID del usuario (opcional)
 * @param autoSubscribe - Suscribirse a notificaciones en tiempo real
 * @returns Estado y funciones para gestionar notificaciones
 * 
 */
export function useNotifications(
  userId?: string,
  autoSubscribe: boolean = true
): UseNotificationsReturn {
  const [state, setState] = useState<UseNotificationsState>({
    notifications: [],
    stats: null,
    preferences: null,
    isLoading: false,
    error: null,
    total: 0,
    unreadCount: 0,
  });

  const [filters, setFilters] = useState<NotificationFilters>({ userId });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  /**
   * Carga notificaciones
   */
  const loadNotifications = useCallback(async (resetPage: boolean = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const currentPage = resetPage ? 1 : page;
      
      const result = await notificationService.getNotifications(
        { ...filters, userId },
        currentPage,
        pageSize
      );

      setState(prev => ({
        ...prev,
        notifications: resetPage 
          ? result.data 
          : [...prev.notifications, ...result.data],
        total: result.total,
        unreadCount: result.unreadCount,
        isLoading: false,
        error: null,
      }));

      if (resetPage) {
        setPage(1);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar notificaciones";
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error("[useNotifications] Error:", err);
    }
  }, [filters, userId, page]);

  /**
   * Carga estadísticas
   */
  const loadStats = useCallback(async () => {
    try {
      const stats = await notificationService.getStats(userId);
      setState(prev => ({ ...prev, stats }));
    } catch (err) {
      console.error("[useNotifications] Error al cargar stats:", err);
    }
  }, [userId]);

  /**
   * Carga preferencias
   */
  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      const preferences = await notificationService.getPreferences(userId);
      setState(prev => ({ ...prev, preferences }));
    } catch (err) {
      console.error("[useNotifications] Error al cargar preferencias:", err);
    }
  }, [userId]);

  // Cargar datos iniciales
  useEffect(() => {
    loadNotifications(true);
    loadStats();
    loadPreferences();
  }, [userId, loadNotifications, loadStats, loadPreferences]);

  // Suscribirse a notificaciones en tiempo real
  useEffect(() => {
    if (!autoSubscribe) return;

    const unsubscribe = notificationService.subscribe((notification) => {
      // Solo añadir si pertenece al usuario actual
      if (!userId || notification.userId === userId) {
        setState(prev => ({
          ...prev,
          notifications: [notification, ...prev.notifications],
          total: prev.total + 1,
          unreadCount: prev.unreadCount + 1,
        }));
      }
    });

    return unsubscribe;
  }, [userId, autoSubscribe]);

  /**
   * Recargar todo
   */
  const refresh = useCallback(async () => {
    await loadNotifications(true);
    await loadStats();
  }, [loadNotifications, loadStats]);

  /**
   * Cargar más notificaciones
   */
  const loadMore = useCallback(async () => {
    if (state.notifications.length >= state.total) return;
    
    setPage(prev => prev + 1);
    await loadNotifications(false);
  }, [state.notifications.length, state.total, loadNotifications]);

  /**
   * Aplicar filtros
   */
  const applyFilters = useCallback((newFilters: NotificationFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    loadNotifications(true);
  }, [loadNotifications]);

  /**
   * Marcar como leída
   */
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === id 
            ? { ...n, status: "read" as const, readAt: new Date().toISOString() }
            : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (err) {
      console.error("[useNotifications] Error al marcar como leída:", err);
      throw err;
    }
  }, []);

  /**
   * Marcar todas como leídas
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead(userId);
      
      const now = new Date().toISOString();
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({
          ...n,
          status: "read" as const,
          readAt: n.readAt || now,
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("[useNotifications] Error al marcar todas como leídas:", err);
      throw err;
    }
  }, [userId]);

  /**
   * Eliminar notificación
   */
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      
      setState(prev => {
        const deleted = prev.notifications.find(n => n.id === id);
        const wasUnread = deleted && !deleted.readAt;
        
        return {
          ...prev,
          notifications: prev.notifications.filter(n => n.id !== id),
          total: prev.total - 1,
          unreadCount: wasUnread ? prev.unreadCount - 1 : prev.unreadCount,
        };
      });
    } catch (err) {
      console.error("[useNotifications] Error al eliminar:", err);
      throw err;
    }
  }, []);

  /**
   * Crear notificación
   */
  const createNotification = useCallback(async (
    data: CreateNotificationDTO
  ): Promise<SystemNotification> => {
    return notificationService.createNotification(data);
  }, []);

  /**
   * Actualizar preferencias
   */
  const updatePreferences = useCallback(async (
    updates: Partial<NotificationPreferences>
  ) => {
    if (!userId) return;

    try {
      const updated = await notificationService.updatePreferences(userId, updates);
      setState(prev => ({ ...prev, preferences: updated }));
    } catch (err) {
      console.error("[useNotifications] Error al actualizar preferencias:", err);
      throw err;
    }
  }, [userId]);

  const unreadNotifications = useMemo(() => {
    return state.notifications.filter(n => !n.readAt);
  }, [state.notifications]);

  const notificationsByCategory = useMemo(() => {
    const categories: Record<NotificationCategory, SystemNotification[]> = {
      order: [],
      driver: [],
      vehicle: [],
      maintenance: [],
      document: [],
      geofence: [],
      alert: [],
      system: [],
    };

    state.notifications.forEach(n => {
      categories[n.category].push(n);
    });

    return categories;
  }, [state.notifications]);

  // Tiene notificaciones no leídas
  const hasUnread = useMemo(() => {
    return state.unreadCount > 0;
  }, [state.unreadCount]);

  // Tiene notificaciones urgentes no leídas
  const hasUrgent = useMemo(() => {
    return state.notifications.some(n => 
      !n.readAt && (n.priority === "urgent" || n.priority === "high")
    );
  }, [state.notifications]);

  // Puede cargar más
  const hasMore = useMemo(() => {
    return state.notifications.length < state.total;
  }, [state.notifications.length, state.total]);

  return {
    notifications: state.notifications,
    stats: state.stats,
    preferences: state.preferences,
    isLoading: state.isLoading,
    error: state.error,
    total: state.total,
    unreadCount: state.unreadCount,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    applyFilters,
    filters,
    createNotification,
    updatePreferences,
    unreadNotifications,
    notificationsByCategory,
    hasUnread,
    hasUrgent,
    hasMore,
  };
}

export default useNotifications;
