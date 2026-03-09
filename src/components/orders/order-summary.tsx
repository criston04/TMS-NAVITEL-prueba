'use client';

import {
  User,
  Package,
  Calendar,
  MapPin,
  Truck,
  Workflow,
  Tag,
  FileText,
  Building2,
  DollarSign,
  Weight,
  Boxes,
  ChevronDown,
  ChevronUp,
  Edit2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { OrderPriority, CargoType } from '@/types/order';

export interface OrderSummaryData {
  // Cliente
  customer: {
    id: string;
    name: string;
    tradeName?: string;
    contact?: {
      name: string;
      phone: string;
      email: string;
    };
  };
  
  // Prioridad
  priority: OrderPriority;
  orderNumber?: string;
  externalReference?: string;
  
  // Workflow
  workflow?: {
    id: string;
    name: string;
    isAutoAssigned: boolean;
    stepsCount: number;
  };
  
  // Carga
  cargo: {
    description: string;
    type: CargoType;
    weightKg: number;
    volumeM3?: number;
    quantity: number;
    declaredValue?: number;
  };
  
  // Fechas
  scheduledStart: string;
  scheduledEnd: string;
  
  // Milestones
  milestones: Array<{
    id: string;
    sequence: number;
    type: 'origin' | 'waypoint' | 'destination';
    geofenceName: string;
    address: string;
    estimatedArrival?: string;
  }>;
  
  assignment?: {
    vehicle?: {
      id: string;
      plate: string;
      type: string;
    };
    driver?: {
      id: string;
      name: string;
    };
    carrier?: {
      id: string;
      name: string;
    };
    gpsOperator?: {
      id: string;
      name: string;
    };
  };
  
  // Adicional
  notes?: string;
  tags?: string[];
  
  // Conflictos
  conflicts?: Array<{
    type: 'vehicle' | 'driver';
    message: string;
  }>;
}

interface OrderSummaryProps {
  data: OrderSummaryData;
  onEditSection?: (section: string) => void;
}

interface SummarySectionProps {
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

const PRIORITY_CONFIG: Record<OrderPriority, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-slate-500' },
  normal: { label: 'Normal', color: 'bg-blue-500' },
  high: { label: 'Alta', color: 'bg-orange-500' },
  urgent: { label: 'Urgente', color: 'bg-red-500' },
};

const CARGO_TYPE_LABELS: Record<CargoType, string> = {
  general: 'Carga General',
  refrigerated: 'Refrigerada',
  hazardous: 'Peligrosa',
  fragile: 'Frágil',
  oversized: 'Sobredimensionada',
  liquid: 'Líquidos',
  bulk: 'Granel',
};

const MILESTONE_TYPE_LABELS = {
  origin: 'Origen',
  waypoint: 'Parada',
  destination: 'Destino',
};

// COMPONENTE SECCIÓN COLAPSABLE

function SummarySection({
  title,
  icon,
  onEdit,
  defaultExpanded = true,
  children,
}: SummarySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <CardHeader 
        className="cursor-pointer py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

// COMPONENTE PRINCIPAL

export function OrderSummary({ data, onEditSection }: OrderSummaryProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const hasConflicts = data.conflicts && data.conflicts.length > 0;
  const hasAssignment = data.assignment?.vehicle || data.assignment?.driver;

  return (
    <div className="space-y-4">
      {/* Alertas de Conflictos */}
      {hasConflicts && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-700 dark:text-orange-400">
                  Conflictos Detectados
                </p>
                <ul className="mt-2 space-y-1 text-sm text-orange-600 dark:text-orange-300">
                  {data.conflicts?.map((conflict, i) => (
                    <li key={i}>• {conflict.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de Confirmación */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-primary" />
            <div>
              <p className="font-medium">Revisa los datos antes de crear la orden</p>
              <p className="text-sm text-muted-foreground">
                Una vez creada, algunos campos no podrán modificarse.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sección: Cliente y Prioridad */}
      <SummarySection
        title="Cliente y Prioridad"
        icon={<User className="w-4 h-4" />}
        onEdit={() => onEditSection?.('customer')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Cliente</Label>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{data.customer.name}</span>
            </div>
            {data.customer.tradeName && (
              <p className="text-sm text-muted-foreground ml-6">
                {data.customer.tradeName}
              </p>
            )}
          </div>
          
          <div>
            <Label>Prioridad</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('w-2 h-2 rounded-full', PRIORITY_CONFIG[data.priority].color)} />
              <span>{PRIORITY_CONFIG[data.priority].label}</span>
            </div>
          </div>

          {data.orderNumber && (
            <div>
              <Label>Número de Orden</Label>
              <p className="font-mono text-sm mt-1">{data.orderNumber}</p>
            </div>
          )}

          {data.externalReference && (
            <div>
              <Label>Referencia Externa</Label>
              <p className="text-sm mt-1">{data.externalReference}</p>
            </div>
          )}
        </div>

        {/* Contacto del Cliente */}
        {data.customer.contact && (
          <>
            <Separator className="my-4" />
            <div>
              <Label>Contacto</Label>
              <div className="mt-2 text-sm space-y-1">
                <p><strong>{data.customer.contact.name}</strong></p>
                <p className="text-muted-foreground">{data.customer.contact.phone}</p>
                <p className="text-muted-foreground">{data.customer.contact.email}</p>
              </div>
            </div>
          </>
        )}
      </SummarySection>

      {/* Sección: Workflow */}
      {data.workflow && (
        <SummarySection
          title="Workflow"
          icon={<Workflow className="w-4 h-4" />}
          onEdit={() => onEditSection?.('workflow')}
        >
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{data.workflow.name}</Badge>
            {data.workflow.isAutoAssigned && (
              <Badge variant="outline" className="text-xs">Auto-asignado</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {data.workflow.stepsCount} pasos
            </span>
          </div>
        </SummarySection>
      )}

      {/* Sección: Carga */}
      <SummarySection
        title="Información de Carga"
        icon={<Package className="w-4 h-4" />}
        onEdit={() => onEditSection?.('cargo')}
      >
        <div className="space-y-4">
          <p className="text-sm">{data.cargo.description}</p>
          
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="font-medium text-sm">{CARGO_TYPE_LABELS[data.cargo.type]}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Weight className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="font-medium text-sm">{data.cargo.weightKg.toLocaleString()} kg</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cantidad</p>
                <p className="font-medium text-sm">{data.cargo.quantity} bultos</p>
              </div>
            </div>

            {data.cargo.declaredValue && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor Declarado</p>
                  <p className="font-medium text-sm">{formatCurrency(data.cargo.declaredValue)}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </SummarySection>

      {/* Sección: Programación */}
      <SummarySection
        title="Programación"
        icon={<Calendar className="w-4 h-4" />}
        onEdit={() => onEditSection?.('schedule')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Inicio Programado</Label>
            <p className="text-sm mt-1">{formatDate(data.scheduledStart)}</p>
          </div>
          <div>
            <Label>Fin Programado</Label>
            <p className="text-sm mt-1">{formatDate(data.scheduledEnd)}</p>
          </div>
        </div>
      </SummarySection>

      {/* Sección: Ruta */}
      <SummarySection
        title={`Ruta (${data.milestones.length} puntos)`}
        icon={<MapPin className="w-4 h-4" />}
        onEdit={() => onEditSection?.('route')}
      >
        <div className="space-y-3">
          {data.milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="flex items-start gap-3 relative"
            >
              {/* Línea vertical */}
              {index < data.milestones.length - 1 && (
                <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-muted-foreground/20" />
              )}
              
              {/* Marcador */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                  milestone.type === 'origin' && 'bg-green-500 text-white',
                  milestone.type === 'destination' && 'bg-red-500 text-white',
                  milestone.type === 'waypoint' && 'bg-blue-500 text-white'
                )}
              >
                {milestone.sequence}
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{milestone.geofenceName}</span>
                  <Badge variant="outline" className="text-xs">
                    {MILESTONE_TYPE_LABELS[milestone.type]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {milestone.address}
                </p>
                {milestone.estimatedArrival && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ETA: {formatDate(milestone.estimatedArrival)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </SummarySection>

      {/* Sección: Asignación */}
      <SummarySection
        title="Asignación"
        icon={<Truck className="w-4 h-4" />}
        onEdit={() => onEditSection?.('assignment')}
      >
        {hasAssignment ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.assignment?.vehicle && (
              <div>
                <Label>Vehículo</Label>
                <div className="mt-1">
                  <p className="font-medium">{data.assignment.vehicle.plate}</p>
                  <p className="text-sm text-muted-foreground">{data.assignment.vehicle.type}</p>
                </div>
              </div>
            )}
            
            {data.assignment?.driver && (
              <div>
                <Label>Conductor</Label>
                <p className="font-medium mt-1">{data.assignment.driver.name}</p>
              </div>
            )}

            {data.assignment?.carrier && (
              <div>
                <Label>Transportista</Label>
                <p className="font-medium mt-1">{data.assignment.carrier.name}</p>
              </div>
            )}

            {data.assignment?.gpsOperator && (
              <div>
                <Label>Operador GPS</Label>
                <p className="font-medium mt-1">{data.assignment.gpsOperator.name}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sin asignación. Se puede asignar después desde el módulo de Programación.
          </p>
        )}
      </SummarySection>

      {/* Sección: Información Adicional */}
      {(data.notes || (data.tags && data.tags.length > 0)) && (
        <SummarySection
          title="Información Adicional"
          icon={<FileText className="w-4 h-4" />}
          onEdit={() => onEditSection?.('additional')}
        >
          <div className="space-y-4">
            {data.notes && (
              <div>
                <Label>Notas</Label>
                <p className="text-sm mt-1 whitespace-pre-line">{data.notes}</p>
              </div>
            )}
            
            {data.tags && data.tags.length > 0 && (
              <div>
                <Label>Etiquetas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SummarySection>
      )}
    </div>
  );
}

// Componente auxiliar Label (simplificado para este módulo)
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      {children}
    </span>
  );
}
