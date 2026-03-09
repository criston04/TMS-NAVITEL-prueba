'use client';

import { memo } from 'react';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Zap,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SchedulingAutoAssignProps {
  /** Diálogo abierto */
  open: boolean;
  /** Número de órdenes pendientes */
  pendingCount: number;
  /** Procesando */
  isLoading: boolean;
  /** Resultado de la auto-programación */
  result?: {
    assigned: number;
    failed: number;
    errors: string[];
  } | null;
  /** Callback al cerrar */
  onClose: () => void;
  /** Callback al confirmar auto-programación */
  onConfirm: () => void;
}

// COMPONENTE PRINCIPAL

export const SchedulingAutoAssign = memo(function SchedulingAutoAssign({
  open,
  pendingCount,
  isLoading,
  result,
  onClose,
  onConfirm,
}: Readonly<SchedulingAutoAssignProps>) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Auto-Programación Inteligente
          </DialogTitle>
          <DialogDescription>
            El sistema asignará automáticamente vehículos basándose
            en disponibilidad, capacidad y proximidad geográfica.
          </DialogDescription>
        </DialogHeader>

        {/* Estado: Pendiente */}
        {!isLoading && !result && (
          <div className="space-y-4 py-4">
            {/* Info box */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-medium">El algoritmo considerará:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  <li>Disponibilidad de vehículos</li>
                  <li>Capacidad de carga (peso/volumen)</li>
                  <li>Cercanía geográfica al punto de origen</li>
                  <li>Historial de conflictos previos</li>
                </ul>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted mx-auto">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-1 text-xl font-bold">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Pendientes</p>
              </div>
              <Zap className="h-5 w-5 text-primary animate-pulse" />
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-50 dark:bg-green-900/20 mx-auto">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="mt-1 text-xl font-bold text-green-600">?</p>
                <p className="text-[10px] text-muted-foreground">Programadas</p>
              </div>
            </div>

            {pendingCount === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No hay órdenes pendientes para programar.
              </div>
            )}
          </div>
        )}

        {/* Estado: Procesando */}
        {isLoading && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-3" />
              <p className="text-sm font-medium">Optimizando asignaciones...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Analizando disponibilidad y buscando la mejor combinación
              </p>
            </div>
            <Progress value={65} className="h-1.5" />
          </div>
        )}

        {/* Estado: Resultado */}
        {result && !isLoading && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              {result.failed === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-500" />
              )}
              Auto-programación completada
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{result.assigned}</p>
                <p className="text-xs text-green-600">Asignadas exitosamente</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-red-600">No se pudieron asignar</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Razones:</p>
                {result.errors.map((err, i) => (
                  <div
                    key={`err-${i}`}
                    className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50"
                  >
                    <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {result ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!result && (
            <Button
              onClick={onConfirm}
              disabled={isLoading || pendingCount === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Auto-Programación
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
