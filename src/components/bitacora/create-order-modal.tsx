'use client';

/**
 * Modal para crear una nueva orden a partir de un evento de bitácora.
 * Pre-llena datos del evento (vehículo, conductor, ubicación) y permite
 * al operador seleccionar prioridad, tipo de servicio y agregar notas.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Truck,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type { BitacoraEntry } from '@/types/bitacora';

interface CreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: BitacoraEntry | null;
  onConfirm: (data: {
    entryId: string;
    priority: string;
    serviceType: string;
    notes: string;
    reference: string;
  }) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja', color: 'bg-gray-100 text-gray-700' },
  { value: 'medium', label: 'Media', color: 'bg-amber-100 text-amber-700' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-700' },
];

const SERVICE_TYPE_OPTIONS = [
  { value: 'delivery', label: 'Entrega' },
  { value: 'pickup', label: 'Recojo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'return', label: 'Devolución' },
  { value: 'express', label: 'Express' },
];

const EVENT_TYPE_LABELS: Record<string, string> = {
  entry: 'Ingreso',
  exit: 'Salida',
  unplanned_stop: 'Parada no planificada',
  unplanned_route: 'Recorrido no planificado',
  dwell: 'Permanencia prolongada',
  deviation: 'Desviación de ruta',
  idle: 'Tiempo inactivo',
  speeding: 'Exceso de velocidad',
};

export function CreateOrderModal({
  open,
  onOpenChange,
  entry,
  onConfirm,
}: CreateOrderModalProps) {
  const [priority, setPriority] = useState('medium');
  const [serviceType, setServiceType] = useState('delivery');
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!entry) return;
    setLoading(true);
    // Simular delay de API
    await new Promise((r) => setTimeout(r, 800));
    onConfirm({
      entryId: entry.id,
      priority,
      serviceType,
      notes,
      reference,
    });
    setLoading(false);
    // Reset form
    setPriority('medium');
    setServiceType('delivery');
    setNotes('');
    setReference('');
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Crear orden desde bitácora
          </DialogTitle>
          <DialogDescription>
            Se creará una nueva orden vinculada al evento seleccionado.
          </DialogDescription>
        </DialogHeader>

        {/* Info del evento origen */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Evento de origen
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Truck className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Vehículo</div>
                <div className="text-sm font-semibold">{entry.vehiclePlate}</div>
              </div>
            </div>

            {entry.driverName && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Conductor</div>
                  <div className="text-sm font-semibold">{entry.driverName}</div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Ubicación</div>
                <div className="text-sm font-medium truncate max-w-[180px]">
                  {entry.geofenceName || entry.address || 'Sin dirección'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Tipo de evento</div>
                <div className="text-sm font-medium">
                  {EVENT_TYPE_LABELS[entry.eventType] || entry.eventType}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 col-span-2">
              <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground">Fecha del evento</div>
                <div className="text-sm font-medium">
                  {new Date(entry.startTimestamp).toLocaleString('es-PE')}
                </div>
              </div>
            </div>
          </div>

          {entry.description && (
            <div className="text-xs text-muted-foreground bg-white dark:bg-slate-800 rounded-md p-2 border">
              {entry.description}
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${opt.color}`}>
                          {opt.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceType">Tipo de servicio</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger id="serviceType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (opcional)</Label>
            <Input
              id="reference"
              placeholder="Ej: GR-2026-00123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              placeholder="Describa el motivo de la orden, instrucciones especiales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-1.5" />
                Crear orden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
