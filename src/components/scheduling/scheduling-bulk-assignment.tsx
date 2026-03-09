'use client';

import { memo, useState, useMemo, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Truck,
  User,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  X,
} from 'lucide-react';
import type { Order } from '@/types/order';
import type { BulkAssignmentResult } from '@/types/scheduling';
import type { MockVehicle } from '@/mocks/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SchedulingBulkAssignmentProps {
  /** Diálogo abierto */
  open: boolean;
  /** Órdenes pendientes disponibles */
  pendingOrders: Order[];
  /** IDs ya seleccionados */
  selectedOrderIds: string[];
  /** Vehículos disponibles */
  vehicles: MockVehicle[];
  /** Procesando */
  isLoading?: boolean;
  /** Resultado de última asignación masiva */
  lastResult?: BulkAssignmentResult | null;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al cambiar selección */
  onSelectionChange: (ids: string[]) => void;
  /** Callback al confirmar asignación masiva */
  onConfirm: (
    orderIds: string[],
    vehicleId: string,
    driverId: string,
    date: Date,
    notes?: string
  ) => void;
}

// COMPONENTE: FILA DE ORDEN SELECCIONABLE

const SelectableOrderRow = memo(function SelectableOrderRow({
  order,
  isSelected,
  onToggle,
}: Readonly<{
  order: Order;
  isSelected: boolean;
  onToggle: (id: string) => void;
}>) {
  const destination = order.milestones?.find(m => m.type === 'destination');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(order.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(order.id); }}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer',
        'hover:bg-muted/50 border',
        isSelected
          ? 'border-primary/50 bg-primary/5'
          : 'border-transparent',
      )}
    >
      {/* Checkbox visual */}
      {isSelected ? (
        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{order.orderNumber}</span>
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] px-1.5 py-0',
              order.priority === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              order.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
              order.priority === 'normal' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              order.priority === 'low' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
            )}
          >
            {order.priority || 'normal'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="truncate">{order.customer?.name || '—'}</span>
          {destination && (
            <>
              <span>→</span>
              <span className="truncate">{destination.geofenceName}</span>
            </>
          )}
        </div>
      </div>

      {/* Peso */}
      {order.cargo && (
        <span className="text-[10px] text-muted-foreground shrink-0">
          {(order.cargo.weightKg / 1000).toFixed(1)}t
        </span>
      )}
    </div>
  );
});

// COMPONENTE: RESULTADO

const ResultDisplay = memo(function ResultDisplay({
  result,
}: Readonly<{ result: BulkAssignmentResult }>) {
  return (
    <div className="space-y-3 py-4">
      <div className="flex items-center justify-center gap-2 text-lg font-semibold">
        {result.failed === 0 ? (
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        ) : (
          <AlertCircle className="h-6 w-6 text-amber-500" />
        )}
        Asignación completada
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{result.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <p className="text-2xl font-bold text-green-600">{result.success}</p>
          <p className="text-xs text-green-600">Exitosas</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-2xl font-bold text-red-600">{result.failed}</p>
          <p className="text-xs text-red-600">Fallidas</p>
        </div>
      </div>

      {result.errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-red-600">Errores:</p>
          {result.errors.map(err => (
            <div
              key={err.orderId}
              className="flex items-center gap-2 text-xs p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span><strong>{err.orderNumber}</strong>: {err.error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingBulkAssignment = memo(function SchedulingBulkAssignment({
  open,
  pendingOrders,
  selectedOrderIds,
  vehicles,
  isLoading = false,
  lastResult,
  onClose,
  onSelectionChange,
  onConfirm,
}: Readonly<SchedulingBulkAssignmentProps>) {
  const [vehicleId, setVehicleId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Reset form state when dialog opens
  useEffect(() => {
    if (open) {
      setVehicleId('');
      setScheduledDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [open]);

  const availableVehicles = useMemo(
    () => vehicles.filter(v => v.status === 'available'),
    [vehicles]
  );

  const toggleSelection = (id: string) => {
    const current = new Set(selectedOrderIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    onSelectionChange(Array.from(current));
  };

  const selectAll = () => {
    onSelectionChange(pendingOrders.map(o => o.id));
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const isFormValid =
    selectedOrderIds.length > 0 && vehicleId && scheduledDate;

  const handleConfirm = () => {
    if (!isFormValid) return;
    onConfirm(
      selectedOrderIds,
      vehicleId,
      '', // No driver assignment
      new Date(scheduledDate + 'T08:00:00'),
      notes || undefined
    );
  };

  // ────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Asignación Masiva
          </DialogTitle>
          <DialogDescription>
            Selecciona múltiples órdenes y asígnalas al mismo camión.
          </DialogDescription>
        </DialogHeader>

        {/* Si hay resultado, mostrarlo */}
        {lastResult ? (
          <ResultDisplay result={lastResult} />
        ) : (
          <div className="flex flex-col gap-4 min-h-0 flex-1">
            {/* Toolbar de selección */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <CheckSquare className="h-3 w-3" />
                  {selectedOrderIds.length} de {pendingOrders.length}
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  Seleccionar todas
                </Button>
                {selectedOrderIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
                    <X className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Lista de órdenes — contenedor con borde visible */}
            <div className="border rounded-lg overflow-hidden shrink-0">
              <ScrollArea className="max-h-[240px]">
                <div className="space-y-0.5 p-2">
                  {pendingOrders.map(order => (
                    <SelectableOrderRow
                      key={order.id}
                      order={order}
                      isSelected={selectedOrderIds.includes(order.id)}
                      onToggle={toggleSelection}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator className="shrink-0" />

            {/* Recursos y fecha */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {/* Vehículo */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  Camión
                </label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Seleccionar camión..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVehicles.map(v => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.plateNumber} - {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Fecha programada
                </label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Notas */}
              <div className="space-y-1.5 col-span-2">
                <label className="text-xs font-medium">Notas (opcional)</label>
                <Input
                  placeholder="Notas de la asignación..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {lastResult ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!lastResult && (
            <Button
              onClick={handleConfirm}
              disabled={!isFormValid || isLoading}
              className={cn(
                !isFormValid && !isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Asignando...
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Asignar {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'orden' : 'órdenes'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
