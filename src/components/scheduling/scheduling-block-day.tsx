'use client';

import { memo, useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  Calendar as CalendarIcon,
  AlertTriangle,
  Truck,
  Loader2,
  Trash2,
} from 'lucide-react';
import type { BlockedDay } from '@/types/scheduling';
import type { MockVehicle } from '@/mocks/scheduling';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SchedulingBlockDayProps {
  /** Diálogo abierto */
  open: boolean;
  /** Días actualmente bloqueados */
  blockedDays: BlockedDay[];
  /** Vehículos para selección de recursos */
  vehicles: MockVehicle[];
  /** Procesando */
  isLoading?: boolean;
  /** Fecha pre-seleccionada (al hacer clic en un día) */
  preselectedDate?: Date | null;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al bloquear un día */
  onBlockDay: (data: Omit<BlockedDay, 'id' | 'createdAt'>) => void;
  /** Callback al desbloquear */
  onUnblockDay: (blockId: string) => void;
}

const BLOCK_TYPE_OPTIONS: { value: BlockedDay['blockType']; label: string }[] = [
  { value: 'full_day', label: 'Día completo' },
  { value: 'partial', label: 'Parcial (algunos recursos)' },
  { value: 'holiday', label: 'Feriado' },
];

function formatBlockDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// COMPONENTE: ITEM DE DÍA BLOQUEADO

const BlockedDayItem = memo(function BlockedDayItem({
  block,
  onUnblock,
}: Readonly<{
  block: BlockedDay;
  onUnblock: (id: string) => void;
}>) {
  return (
    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-red-50/30 dark:bg-red-900/10">
      <div className="flex items-center gap-2 min-w-0">
        <Lock className="h-4 w-4 text-red-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">
            {formatBlockDate(block.date)}
          </p>
          <p className="text-[10px] text-muted-foreground">{block.reason}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="secondary" className="text-[9px] px-1 py-0">
              {block.blockType === 'holiday' ? 'Feriado' :
                block.blockType === 'full_day' ? 'Día completo' : 'Parcial'}
            </Badge>
            {!block.appliesToAll && block.resourceIds && (
              <Badge variant="outline" className="text-[9px] px-1 py-0">
                {block.resourceIds.length} recursos
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:text-red-700 shrink-0"
        onClick={() => onUnblock(block.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const SchedulingBlockDay = memo(function SchedulingBlockDay({
  open,
  blockedDays,
  vehicles,
  isLoading = false,
  preselectedDate,
  onClose,
  onBlockDay,
  onUnblockDay,
}: Readonly<SchedulingBlockDayProps>) {
  const [date, setDate] = useState(
    preselectedDate
      ? preselectedDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [blockType, setBlockType] = useState<BlockedDay['blockType']>('full_day');
  const [appliesToAll, setAppliesToAll] = useState(true);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Sync preselectedDate when dialog opens or preselectedDate changes
  useEffect(() => {
    if (open) {
      setDate(
        preselectedDate
          ? preselectedDate.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setReason('');
      setBlockType('full_day');
      setAppliesToAll(true);
      setSelectedResources([]);
    }
  }, [open, preselectedDate]);

  const isFormValid = date && reason.length > 2;

  const handleSubmit = () => {
    if (!isFormValid) return;
    onBlockDay({
      date,
      reason,
      blockType,
      appliesToAll,
      resourceIds: appliesToAll ? undefined : selectedResources,
      createdBy: 'Usuario Actual',
    });
    // Reset form
    setReason('');
    setBlockType('full_day');
    setAppliesToAll(true);
    setSelectedResources([]);
  };

  const toggleResource = (id: string) => {
    setSelectedResources(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            Gestión de Días Bloqueados
          </DialogTitle>
          <DialogDescription>
            Bloquea días para impedir programación de órdenes. Los días bloqueados se
            mostrarán en el calendario y Gantt.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0 py-2">
          {/* Formulario de nuevo bloqueo */}
          <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
            <h4 className="text-xs font-semibold flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-red-500" />
              Nuevo bloqueo
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Fecha */}
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  Fecha
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-1">
                <label className="text-xs font-medium">Tipo</label>
                <Select value={blockType} onValueChange={(v) => setBlockType(v as BlockedDay['blockType'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Razón */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Razón del bloqueo</label>
              <Input
                placeholder="Ej: Feriado nacional, mantenimiento de flota..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Aplica a todos */}
            <div className="flex items-center justify-between">
              <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                <Truck className="h-3 w-3" />
                Aplica a todos los recursos
              </label>
              <Switch
                checked={appliesToAll}
                onCheckedChange={setAppliesToAll}
                className="h-4 w-7"
              />
            </div>

            {/* Selección de recursos (si parcial) */}
            {!appliesToAll && (
              <div className="space-y-1.5 ml-4">
                <p className="text-[10px] text-muted-foreground">Seleccionar vehículos afectados:</p>
                <div className="flex flex-wrap gap-1">
                  {vehicles.map(v => (
                    <Button
                      key={v.id}
                      variant={selectedResources.includes(v.id) ? 'default' : 'outline'}
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => toggleResource(v.id)}
                    >
                      {v.plateNumber}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Botón */}
            <Button
              size="sm"
              className="w-full h-8"
              disabled={!isFormValid || isLoading}
              onClick={handleSubmit}
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5 mr-1" />
              )}
              Bloquear día
            </Button>
          </div>

          <Separator />

          {/* Lista de días bloqueados */}
          <div className="flex flex-col flex-1 min-h-0 space-y-2">
            <h4 className="text-xs font-semibold flex items-center gap-1.5 shrink-0">
              <CalendarIcon className="h-3 w-3" />
              Días bloqueados activos ({blockedDays.length})
            </h4>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
              {blockedDays.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Unlock className="h-8 w-8 mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">Sin días bloqueados</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-1">
                  {blockedDays.map(block => (
                    <BlockedDayItem
                      key={block.id}
                      block={block}
                      onUnblock={onUnblockDay}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
