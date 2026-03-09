'use client';

import { memo, useMemo, useState } from 'react';
import {
  MoreHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import type { Order } from '@/types/order';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG, PRIORITY_CONFIG } from './order-card';
import { printOrderReport } from './order-print-report';
import { AlertModal } from '@/components/ui/alert-modal';

// SERVICE TYPE LABELS

const SERVICE_TYPE_LABELS: Record<string, string> = {
  distribucion: 'Distribución',
  importacion: 'Importación',
  exportacion: 'Exportación',
  transporte_minero: 'Minería',
  transporte_residuos: 'Residuos',
  interprovincial: 'Interprovincial',
  mudanza: 'Mudanza',
  courier: 'Courier',
  otro: 'Otro',
};

// PROPS

interface OrderTableProps {
  orders: Order[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll?: (checked: boolean) => void;
  allSelected?: boolean;
  onClick: (order: Order) => void;
  className?: string;
}

// UTILS

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Calcula el progreso de hitos: completados vs total
 */
function getMilestoneProgress(order: Order): { completed: number; total: number } {
  const total = order.milestones.length;
  const completed = order.milestones.filter(
    m => m.status === 'completed' || m.status === 'skipped'
  ).length;
  return { completed, total };
}

/**
 * Calcula la ETA del próximo hito pendiente
 */
function getNextMilestoneETA(order: Order): string | null {
  const sorted = [...order.milestones].sort((a, b) => a.sequence - b.sequence);
  const next = sorted.find(
    m => m.status === 'pending' || m.status === 'approaching' || m.status === 'in_progress' || m.status === 'delayed'
  );
  return next?.estimatedArrival || null;
}

/**
 * Obtiene la fecha de cita (estimatedArrival del primer hito de destino)
 */
function getAppointmentDate(order: Order): string | null {
  // Fecha cita = estimatedArrival del último hito (destino)
  const destination = order.milestones
    .filter(m => m.type === 'destination')
    .sort((a, b) => a.sequence - b.sequence)[0];
  return destination?.estimatedArrival || null;
}

// COMPONENTE

function OrderTableComponent({
  orders,
  selectedIds,
  onSelect,
  onSelectAll,
  allSelected,
  onClick,
  className,
}: Readonly<OrderTableProps>) {
  const [printBlockedAlert, setPrintBlockedAlert] = useState(false);

  return (
    <div className={cn('rounded-md border bg-card overflow-x-auto', className)}>
      <Table className="min-w-[800px] lg:min-w-0">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12.5">
              <Checkbox 
                checked={allSelected || (selectedIds.size > 0 ? 'indeterminate' : false)}
                onCheckedChange={(checked) => onSelectAll?.(!!checked)}
              />
            </TableHead>
            <TableHead className="w-30">Orden</TableHead>
            <TableHead className="w-28 hidden lg:table-cell">Referencia</TableHead>
            <TableHead className="min-w-35">Cliente</TableHead>
            <TableHead className="w-28 hidden xl:table-cell">Tipo Servicio</TableHead>
            <TableHead className="min-w-50 hidden md:table-cell">Ruta</TableHead>
            <TableHead className="w-24 hidden lg:table-cell">Progreso</TableHead>
            <TableHead className="w-30">Estado</TableHead>
            <TableHead className="w-25 hidden xl:table-cell">Prioridad</TableHead>
            <TableHead className="w-32 hidden lg:table-cell">ETA Próximo</TableHead>
            <TableHead className="w-32 hidden xl:table-cell">Fecha Cita</TableHead>
            <TableHead className="w-35 hidden md:table-cell">Conductor/Vehículo</TableHead>
            <TableHead className="w-35 text-right hidden lg:table-cell">Creación</TableHead>
            <TableHead className="w-12.5"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status];
            const priorityConfig = PRIORITY_CONFIG[order.priority];
            const origin = order.milestones[0];
            const destination = order.milestones.at(-1);
            const isSelected = selectedIds.has(order.id);
            const progress = getMilestoneProgress(order);
            const nextETA = getNextMilestoneETA(order);
            const appointmentDate = getAppointmentDate(order);

            return (
              <TableRow 
                key={order.id}
                data-state={isSelected ? 'selected' : undefined}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onClick(order)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onSelect(order.id)}
                  />
                </TableCell>
                
                {/* ID de Orden */}
                <TableCell className="font-medium font-mono">
                  {order.orderNumber}
                </TableCell>

                {/* Referencia */}
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-col text-xs">
                    {order.reference ? (
                      <span className="font-medium truncate max-w-24" title={order.reference}>
                        {order.reference}
                      </span>
                    ) : order.externalReference ? (
                      <span className="text-muted-foreground truncate max-w-24" title={order.externalReference}>
                        {order.externalReference}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </div>
                </TableCell>
                
                {/* Cliente */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="truncate font-medium text-sm">
                      {order.customer?.name ?? 'Sin cliente'}
                    </span>
                    {order.customer?.code && (
                      <span className="text-xs text-muted-foreground">
                        {order.customer.code}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Tipo de Servicio */}
                <TableCell className="hidden xl:table-cell">
                  <Badge variant="outline" className="text-xs whitespace-nowrap font-normal">
                    {SERVICE_TYPE_LABELS[order.serviceType] || order.serviceType || '—'}
                  </Badge>
                </TableCell>
                
                {/* Ruta - Compacta */}
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      <span className="truncate max-w-37.5">{origin?.geofenceName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <span className="truncate max-w-37.5">{destination?.geofenceName}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Progreso de hitos */}
                <TableCell className="hidden lg:table-cell">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span>{progress.completed} de {progress.total}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                
                {/* Estado */}
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'whitespace-nowrap font-normal',
                      statusConfig.className.replace('bg-', 'border-').replace('text-', 'text-foreground ')
                    )}
                  >
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                
                {/* Prioridad */}
                <TableCell className="hidden xl:table-cell">
                  <div className={cn('flex items-center gap-1.5 text-xs font-medium', priorityConfig.className)}>
                    {order.priority === 'urgent' && <AlertTriangle className="w-3 h-3" />}
                    {priorityConfig.label}
                  </div>
                </TableCell>

                {/* ETA Próximo Hito */}
                <TableCell className="hidden lg:table-cell">
                  {nextETA ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatShortDate(nextETA)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {order.status === 'completed' || order.status === 'closed' ? 'Completado' : '—'}
                    </span>
                  )}
                </TableCell>

                {/* Fecha Cita (destino) */}
                <TableCell className="hidden xl:table-cell">
                  {appointmentDate ? (
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(appointmentDate)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">—</span>
                  )}
                </TableCell>
                
                {/* Recursos */}
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-col text-xs text-muted-foreground">
                    {order.driver && (
                      <span className="truncate">{order.driver.fullName}</span>
                    )}
                    {order.vehicle && (
                      <span className="truncate opacity-80">{order.vehicle.plate}</span>
                    )}
                    {!order.driver && !order.vehicle && (
                      <span className="italic opacity-50">Sin asignar</span>
                    )}
                  </div>
                </TableCell>
                
                {/* Fecha */}
                <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">
                  {formatDate(order.createdAt)}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onClick(order)}>Ver detalles</DropdownMenuItem>
                      <DropdownMenuItem>Editar orden</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        if (!printOrderReport(order)) {
                          setPrintBlockedAlert(true);
                        }
                      }}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir orden
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertModal
        open={printBlockedAlert}
        onOpenChange={setPrintBlockedAlert}
        title="Ventana bloqueada"
        description="No se pudo abrir la ventana de impresión. Verifica que tu navegador no esté bloqueando los pop-ups."
        variant="error"
      />
    </div>
  );
}

export const OrderTable = memo(OrderTableComponent);
