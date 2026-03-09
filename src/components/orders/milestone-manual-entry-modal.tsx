'use client';

import { memo, useState, useCallback } from 'react';
import {
  X,
  AlertCircle,
  ClipboardEdit,
  Clock,
  User,
  MessageSquare,
  Save,
} from 'lucide-react';
import type { OrderMilestone } from '@/types/order';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Razones de entrada manual
 */
const MANUAL_REASONS = [
  { value: 'sin_senal_gps', label: 'Sin señal GPS' },
  { value: 'falla_equipo', label: 'Falla de equipo GPS' },
  { value: 'carga_retroactiva', label: 'Carga retroactiva' },
  { value: 'correccion', label: 'Corrección de datos' },
  { value: 'otro', label: 'Otro motivo' },
] as const;

type ManualReason = typeof MANUAL_REASONS[number]['value'];

/**
 * Datos del formulario de entrada manual
 */
interface ManualEntryFormData {
  entryDate: string;
  entryTime: string;
  exitDate: string;
  exitTime: string;
  reason: ManualReason;
  observation: string;
  registeredBy: string;
}

/**
 * Props del modal
 */
interface MilestoneManualEntryModalProps {
  /** Si el modal está abierto */
  open: boolean;
  /** Callback para cerrar el modal */
  onClose: () => void;
  /** Hito que se va a llenar manualmente */
  milestone: OrderMilestone | null;
  /** Callback al guardar los datos manuales */
  onSave: (milestoneId: string, data: {
    actualEntry: string;
    actualExit?: string;
    isManual: true;
    manualEntryData: {
      registeredBy: string;
      registeredAt: string;
      observation: string;
      reason: ManualReason;
    };
  }) => void;
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Obtiene la hora actual en formato HH:MM
 */
function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

/**
 * Modal para el llenado manual de hitos (mecanismo de contingencia)
 * Permite registrar llegada/salida cuando no hay señal GPS o el equipo falla.
 */
function MilestoneManualEntryModalComponent({
  open,
  onClose,
  milestone,
  onSave,
}: Readonly<MilestoneManualEntryModalProps>) {
  const [formData, setFormData] = useState<ManualEntryFormData>({
    entryDate: getCurrentDate(),
    entryTime: getCurrentTime(),
    exitDate: '',
    exitTime: '',
    reason: 'sin_senal_gps',
    observation: '',
    registeredBy: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ManualEntryFormData, string>>>({});

  /**
   * Actualiza un campo del formulario
   */
  const updateField = useCallback(<K extends keyof ManualEntryFormData>(
    key: K,
    value: ManualEntryFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // Limpiar error del campo
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  /**
   * Valida el formulario
   */
  const validate = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ManualEntryFormData, string>> = {};

    if (!formData.entryDate) {
      newErrors.entryDate = 'La fecha de entrada es obligatoria';
    }
    if (!formData.entryTime) {
      newErrors.entryTime = 'La hora de entrada es obligatoria';
    }
    if (!formData.observation.trim()) {
      newErrors.observation = 'La observación es obligatoria';
    }
    if (!formData.registeredBy.trim()) {
      newErrors.registeredBy = 'El responsable es obligatorio';
    }
    if (!formData.reason) {
      newErrors.reason = 'El motivo es obligatorio';
    }

    // Validar que si hay fecha de salida, también haya hora
    if (formData.exitDate && !formData.exitTime) {
      newErrors.exitTime = 'Si especifica fecha de salida, ingrese también la hora';
    }
    if (!formData.exitDate && formData.exitTime) {
      newErrors.exitDate = 'Si especifica hora de salida, ingrese también la fecha';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Maneja el guardado
   */
  const handleSave = useCallback(() => {
    if (!validate() || !milestone) return;

    const entryISO = new Date(`${formData.entryDate}T${formData.entryTime}:00`).toISOString();
    
    let exitISO: string | undefined;
    if (formData.exitDate && formData.exitTime) {
      exitISO = new Date(`${formData.exitDate}T${formData.exitTime}:00`).toISOString();
    }

    onSave(milestone.id, {
      actualEntry: entryISO,
      actualExit: exitISO,
      isManual: true,
      manualEntryData: {
        registeredBy: formData.registeredBy.trim(),
        registeredAt: new Date().toISOString(),
        observation: formData.observation.trim(),
        reason: formData.reason,
      },
    });

    // Reset form
    setFormData({
      entryDate: getCurrentDate(),
      entryTime: getCurrentTime(),
      exitDate: '',
      exitTime: '',
      reason: 'sin_senal_gps',
      observation: '',
      registeredBy: '',
    });
    setErrors({});
    onClose();
  }, [formData, milestone, onSave, onClose, validate]);

  /**
   * Maneja el cierre limpio
   */
  const handleClose = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  if (!milestone) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl w-[95vw]">
        <div className="max-h-[80vh] overflow-y-auto pr-1 space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardEdit className="w-5 h-5 text-orange-500" />
            Registro manual de hito
          </DialogTitle>
          <DialogDescription>
            Llene manualmente los datos de llegada/salida para este hito.
            Este mecanismo es de contingencia cuando no hay señal GPS o el equipo falla.
          </DialogDescription>
        </DialogHeader>

        {/* Info del hito */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">{milestone.geofenceName}</span>
            <Badge variant="outline" className="text-xs">
              #{milestone.sequence} — {milestone.type === 'origin' ? 'Origen' : milestone.type === 'destination' ? 'Destino' : 'Waypoint'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{milestone.address}</p>
          {milestone.estimatedArrival && (
            <p className="text-xs text-muted-foreground">
              <Clock className="w-3 h-3 inline mr-1" />
              ETA planeada: {new Intl.DateTimeFormat('es-MX', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              }).format(new Date(milestone.estimatedArrival))}
            </p>
          )}
        </div>

        {/* Alerta de contingencia */}
        <div className="flex items-start gap-2 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3">
          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-orange-700 dark:text-orange-400">
            Los registros manuales quedan marcados con indicador visual para distinguirlos
            de las entradas automáticas por GPS. Esta información se incluye en reportes y auditorías.
          </p>
        </div>

        {/* Formulario */}
        <div className="space-y-5">
          {/* Fecha/Hora de entrada */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Fecha y hora de llegada *
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div>
                <Input
                  type="date"
                  value={formData.entryDate}
                  onChange={(e) => updateField('entryDate', e.target.value)}
                  className={cn('h-10 text-sm', errors.entryDate && 'border-red-500')}
                />
                {errors.entryDate && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.entryDate}</p>
                )}
              </div>
              <div>
                <Input
                  type="time"
                  value={formData.entryTime}
                  onChange={(e) => updateField('entryTime', e.target.value)}
                  className={cn('h-10 text-sm', errors.entryTime && 'border-red-500')}
                />
                {errors.entryTime && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.entryTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Fecha/Hora de salida (opcional) */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Fecha y hora de salida <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <div>
                <Input
                  type="date"
                  value={formData.exitDate}
                  onChange={(e) => updateField('exitDate', e.target.value)}
                  className={cn('h-10 text-sm', errors.exitDate && 'border-red-500')}
                />
                {errors.exitDate && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.exitDate}</p>
                )}
              </div>
              <div>
                <Input
                  type="time"
                  value={formData.exitTime}
                  onChange={(e) => updateField('exitTime', e.target.value)}
                  className={cn('h-10 text-sm', errors.exitTime && 'border-red-500')}
                />
                {errors.exitTime && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.exitTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <Label className="text-sm font-medium">Motivo de registro manual *</Label>
            <Select
              value={formData.reason}
              onValueChange={(value) => updateField('reason', value as ManualReason)}
            >
              <SelectTrigger className={cn('mt-1.5 h-10 text-sm', errors.reason && 'border-red-500')}>
                <SelectValue placeholder="Seleccione un motivo" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-xs text-red-500 mt-0.5">{errors.reason}</p>
            )}
          </div>

          {/* Responsable */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              Responsable del registro *
            </Label>
            <Input
              placeholder="Nombre del operador o supervisor"
              value={formData.registeredBy}
              onChange={(e) => updateField('registeredBy', e.target.value)}
              className={cn('mt-1.5 h-10 text-sm', errors.registeredBy && 'border-red-500')}
            />
            {errors.registeredBy && (
              <p className="text-xs text-red-500 mt-0.5">{errors.registeredBy}</p>
            )}
          </div>

          {/* Observación */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              Observación *
            </Label>
            <Textarea
              placeholder="Describa la situación y detalles del registro manual..."
              value={formData.observation}
              onChange={(e) => updateField('observation', e.target.value)}
              rows={3}
              className={cn('mt-1.5 text-sm resize-none', errors.observation && 'border-red-500')}
            />
            {errors.observation && (
              <p className="text-xs text-red-500 mt-0.5">{errors.observation}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
          <Button onClick={handleSave} className="gap-1">
            <Save className="w-4 h-4" />
            Guardar registro manual
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const MilestoneManualEntryModal = memo(MilestoneManualEntryModalComponent);
