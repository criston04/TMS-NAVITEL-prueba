'use client';

import { memo, useMemo } from 'react';
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  X,
  Clock,
  Trash2,
} from 'lucide-react';
import type {
  SchedulingNotification,
  NotificationSeverity,
} from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SchedulingNotificationsProps {
  /** Lista de notificaciones */
  notifications: SchedulingNotification[];
  /** Callback al marcar como leída */
  onMarkRead: (id: string) => void;
  /** Callback al descartar */
  onDismiss: (id: string) => void;
  /** Callback al limpiar todas */
  onClearAll: () => void;
  /** Clase adicional */
  className?: string;
}

const SEVERITY_CONFIG: Record<NotificationSeverity, {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  bgClassName: string;
}> = {
  info: {
    icon: Info,
    className: 'text-blue-500',
    bgClassName: 'bg-blue-50 dark:bg-blue-900/20',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-500',
    bgClassName: 'bg-amber-50 dark:bg-amber-900/20',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-500',
    bgClassName: 'bg-red-50 dark:bg-red-900/20',
  },
  success: {
    icon: CheckCircle2,
    className: 'text-green-500',
    bgClassName: 'bg-green-50 dark:bg-green-900/20',
  },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// COMPONENTE: ITEM DE NOTIFICACIÓN

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: Readonly<{
  notification: SchedulingNotification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}>) {
  const config = SEVERITY_CONFIG[notification.severity];
  const Icon = config.icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if (!notification.isRead) onMarkRead(notification.id);
        }
      }}
      className={cn(
        'group relative flex items-start gap-2.5 px-3 py-2.5 transition-colors',
        'border-b last:border-b-0',
        !notification.isRead && config.bgClassName,
        notification.isRead && 'opacity-60 hover:opacity-80',
        'cursor-pointer hover:bg-muted/30'
      )}
    >
      {/* Indicador no leído */}
      {!notification.isRead && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
      )}

      {/* Icono */}
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.className)} />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-semibold truncate">{notification.title}</p>
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
            <Clock className="h-2.5 w-2.5" />
            {timeAgo(notification.timestamp)}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        {notification.actionLabel && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-[10px] text-primary mt-1"
          >
            {notification.actionLabel}
          </Button>
        )}
      </div>

      {/* Descartar */}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingNotifications = memo(function SchedulingNotifications({
  notifications,
  onMarkRead,
  onDismiss,
  onClearAll,
  className,
}: Readonly<SchedulingNotificationsProps>) {
  const visibleNotifications = useMemo(
    () => notifications.filter(n => !n.isDismissed),
    [notifications]
  );

  const unreadCount = useMemo(
    () => visibleNotifications.filter(n => !n.isRead).length,
    [visibleNotifications]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 relative', className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b">
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Notificaciones</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                {unreadCount} nuevas
              </Badge>
            )}
          </div>
          {visibleNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={onClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Lista */}
        <ScrollArea className="max-h-[360px]">
          {visibleNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BellOff className="h-8 w-8 mb-2 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Sin notificaciones</p>
            </div>
          ) : (
            visibleNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
});
