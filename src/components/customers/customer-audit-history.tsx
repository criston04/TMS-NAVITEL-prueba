"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  UserPlus,
  Edit,
  Trash2,
  Power,
  MapPin,
  Users,
  CreditCard,
  Package,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/models";

export type AuditEventType = 
  | "created"
  | "updated"
  | "status_changed"
  | "address_added"
  | "address_removed"
  | "contact_added"
  | "contact_removed"
  | "billing_updated"
  | "order_created"
  | "order_completed"
  | "note_added";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  userId: string;
  userName: string;
  description: string;
  details?: Record<string, unknown>;
  changes?: {
    field: string;
    oldValue?: string;
    newValue?: string;
  }[];
}

interface CustomerAuditHistoryProps {
  customer: Customer;
  className?: string;
}

const EVENT_CONFIG: Record<AuditEventType, {
  icon: typeof History;
  color: string;
  bgColor: string;
  label: string;
}> = {
  created: {
    icon: UserPlus,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Cliente creado",
  },
  updated: {
    icon: Edit,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Datos actualizados",
  },
  status_changed: {
    icon: Power,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Estado cambiado",
  },
  address_added: {
    icon: MapPin,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "Dirección agregada",
  },
  address_removed: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "Dirección eliminada",
  },
  contact_added: {
    icon: Users,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    label: "Contacto agregado",
  },
  contact_removed: {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "Contacto eliminado",
  },
  billing_updated: {
    icon: CreditCard,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Facturación actualizada",
  },
  order_created: {
    icon: Package,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    label: "Orden creada",
  },
  order_completed: {
    icon: Package,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Orden completada",
  },
  note_added: {
    icon: FileText,
    color: "text-gray-600",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    label: "Nota agregada",
  },
};

// Generar historial mock basado en el cliente
function generateMockHistory(customer: Customer): AuditEvent[] {
  const events: AuditEvent[] = [];
  const now = new Date();

  // Evento de creación
  events.push({
    id: "evt-1",
    type: "created",
    timestamp: customer.createdAt || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    userId: "user-1",
    userName: "Sistema",
    description: `Cliente ${customer.name} creado`,
  });

  // Simular algunos eventos de actualización
  if (customer.updatedAt && customer.updatedAt !== customer.createdAt) {
    events.push({
      id: "evt-2",
      type: "updated",
      timestamp: customer.updatedAt,
      userId: "user-2",
      userName: "Admin",
      description: "Datos del cliente actualizados",
      changes: [
        { field: "email", oldValue: "old@email.com", newValue: customer.email },
      ],
    });
  }

  // Si tiene más de una dirección, simular evento
  if (customer.addresses.length > 1) {
    events.push({
      id: "evt-3",
      type: "address_added",
      timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      userId: "user-2",
      userName: "Admin",
      description: `Dirección "${customer.addresses[1]?.label || "Sucursal"}" agregada`,
    });
  }

  // Si tiene más de un contacto, simular evento
  if (customer.contacts.length > 1) {
    events.push({
      id: "evt-4",
      type: "contact_added",
      timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      userId: "user-2",
      userName: "Admin",
      description: `Contacto "${customer.contacts[1]?.name}" agregado`,
    });
  }

  // Si tiene órdenes, simular eventos
  if (customer.operationalStats?.totalOrders) {
    events.push({
      id: "evt-5",
      type: "order_created",
      timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      userId: "user-3",
      userName: "Operador",
      description: "Orden de servicio creada",
      details: { orderId: "ORD-001" },
    });

    if (customer.operationalStats.completedOrders > 0) {
      events.push({
        id: "evt-6",
        type: "order_completed",
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        userId: "user-3",
        userName: "Operador",
        description: "Orden de servicio completada",
        details: { orderId: "ORD-001" },
      });
    }
  }

  // Ordenar por fecha descendente
  return events.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function CustomerAuditHistory({
  customer,
  className,
}: CustomerAuditHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<AuditEventType | "all">("all");

  // Generar historial mock
  const allEvents = useMemo(() => generateMockHistory(customer), [customer]);

  // Filtrar eventos
  const filteredEvents = useMemo(() => {
    if (selectedType === "all") return allEvents;
    return allEvents.filter(e => e.type === selectedType);
  }, [allEvents, selectedType]);

  // Eventos a mostrar (limitados si no está expandido)
  const visibleEvents = expanded ? filteredEvents : filteredEvents.slice(0, 3);

  // Formatear fecha relativa
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    
    return date.toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Historial de Actividad
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {allEvents.length} evento{allEvents.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant={selectedType === "all" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSelectedType("all")}
          >
            Todos
          </Button>
          <Button
            size="sm"
            variant={selectedType === "updated" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSelectedType("updated")}
          >
            Cambios
          </Button>
          <Button
            size="sm"
            variant={selectedType === "order_created" || selectedType === "order_completed" ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setSelectedType("order_created")}
          >
            Órdenes
          </Button>
        </div>

        {/* Timeline de eventos */}
        <ScrollArea className={cn(expanded ? "h-75" : "h-auto")}>
          <div className="space-y-3">
            {visibleEvents.map((event, index) => {
              const config = EVENT_CONFIG[event.type];
              const Icon = config.icon;

              return (
                <div key={event.id} className="flex gap-3">
                  {/* Línea del timeline */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-4 w-4", config.color)} />
                    </div>
                    {index < visibleEvents.length - 1 && (
                      <div className="w-px h-full bg-border mt-1" />
                    )}
                  </div>

                  {/* Contenido del evento */}
                  <div className="flex-1 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(event.timestamp)}
                      </div>
                    </div>

                    {/* Detalles de cambios si existen */}
                    {event.changes && event.changes.length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        {event.changes.map((change, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-muted-foreground">{change.field}:</span>
                            {change.oldValue && (
                              <span className="line-through text-red-500">{change.oldValue}</span>
                            )}
                            <span className="text-green-600">{change.newValue}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Usuario que realizó la acción */}
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {event.userName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Botón para expandir/colapsar */}
        {filteredEvents.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver {filteredEvents.length - 3} más
              </>
            )}
          </Button>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No hay eventos de este tipo
          </div>
        )}
      </CardContent>
    </Card>
  );
}
