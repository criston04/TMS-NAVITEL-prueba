'use client';

import { memo, useState } from 'react';
import {
  X,
  Send,
  Download,
  Trash2,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Acciones disponibles
 */
type BulkAction = 
  | 'send_to_carrier' 
  | 'send_to_gps' 
  | 'export' 
  | 'delete';

/**
 * Props del componente
 */
interface OrderBulkActionsProps {
  /** Número de órdenes seleccionadas */
  selectedCount: number;
  /** Callback al ejecutar acción */
  onAction: (action: BulkAction) => Promise<void>;
  /** Callback al limpiar selección */
  onClearSelection: () => void;
  /** Está ejecutando una acción */
  isExecuting?: boolean;
  /** Acción en progreso */
  currentAction?: BulkAction | null;
  /** Progreso (0-100) */
  progress?: number;
  /** Resultados de la última acción */
  results?: {
    success: number;
    failed: number;
  };
  /** Clase adicional */
  className?: string;
}

/**
 * Configuración de acciones
 */
const ACTION_CONFIG: Record<BulkAction, {
  label: string;
  icon: typeof Send;
  variant: 'default' | 'outline' | 'destructive';
  description: string;
}> = {
  send_to_carrier: {
    label: 'Enviar a transportista',
    icon: Send,
    variant: 'default',
    description: 'Envía las órdenes seleccionadas al sistema del transportista',
  },
  send_to_gps: {
    label: 'Enviar a GPS',
    icon: Send,
    variant: 'default',
    description: 'Envía las órdenes al operador GPS para monitoreo',
  },
  export: {
    label: 'Exportar a Excel',
    icon: FileSpreadsheet,
    variant: 'outline',
    description: 'Descarga las órdenes seleccionadas en formato Excel',
  },
  delete: {
    label: 'Eliminar',
    icon: Trash2,
    variant: 'destructive',
    description: 'Elimina permanentemente las órdenes seleccionadas',
  },
};

// COMPONENTE

/**
 * Barra de acciones masivas para órdenes
 * @param props - Props del componente
 * @returns Componente de acciones masivas
 */
function OrderBulkActionsComponent({
  selectedCount,
  onAction,
  onClearSelection,
  isExecuting = false,
  currentAction = null,
  progress = 0,
  results,
  className,
}: Readonly<OrderBulkActionsProps>) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // No mostrar si no hay selección
  if (selectedCount === 0) return null;

  /**
   * Maneja el click en una acción
   */
  const handleAction = async (action: BulkAction) => {
    if (action === 'delete' && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    
    setConfirmDelete(false);
    await onAction(action);
  };

  /**
   * Cancela la confirmación de eliminación
   */
  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-background border rounded-lg shadow-lg p-4',
        'flex items-center gap-4 min-w-100 max-w-[90vw]',
        'animate-in slide-in-from-bottom-5 duration-300',
        className,
      )}
    >
      {/* Estado de ejecución */}
      {isExecuting && currentAction ? (
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">
              {ACTION_CONFIG[currentAction].label}...
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <span className="text-xs text-muted-foreground">
            {progress}% completado
          </span>
        </div>
      ) : results ? (
        /* Resultados */
        <div className="flex-1">
          <div className="flex items-center gap-4">
            {results.success > 0 && (
              <div className="flex items-center gap-1.5 text-green-500">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">{results.success} exitosas</span>
              </div>
            )}
            {results.failed > 0 && (
              <div className="flex items-center gap-1.5 text-red-500">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{results.failed} fallidas</span>
              </div>
            )}
          </div>
        </div>
      ) : confirmDelete ? (
        /* Confirmación de eliminación */
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">¿Eliminar {selectedCount} órdenes?</p>
              <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer</p>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="ghost" onClick={handleCancelDelete}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleAction('delete')}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Acciones normales */
        <>
          {/* Contador */}
          <div className="flex items-center gap-2 border-r pr-4">
            <span className="text-lg font-bold">{selectedCount}</span>
            <span className="text-sm text-muted-foreground">
              {selectedCount === 1 ? 'orden' : 'órdenes'}
            </span>
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-2 flex-1">
            {/* Enviar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Send className="w-4 h-4" />
                  Enviar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleAction('send_to_carrier')}>
                  <Send className="w-4 h-4 mr-2" />
                  A transportista
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAction('send_to_gps')}>
                  <Send className="w-4 h-4 mr-2" />
                  A operador GPS
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Exportar */}
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => handleAction('export')}
            >
              <Download className="w-4 h-4" />
              Exportar
            </Button>

            {/* Eliminar */}
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleAction('delete')}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Cerrar */}
          <Button
            size="icon"
            variant="ghost"
            onClick={onClearSelection}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderBulkActions = memo(OrderBulkActionsComponent);
