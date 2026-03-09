'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { Hash, RefreshCw, Lock, Unlock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface OrderNumberFieldProps {
  /** Valor actual */
  value: string;
  /** Callback al cambiar valor */
  onChange: (value: string) => void;
  /** Si está en modo automático */
  isAutomatic?: boolean;
  /** Callback al cambiar modo */
  onModeChange?: (isAutomatic: boolean) => void;
  /** Prefijo para generación automática */
  prefix?: string;
  /** Error de validación */
  error?: string;
  /** Está deshabilitado */
  disabled?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Genera un número de orden automático
 * Formato: PREFIX-YYYY-XXXXX
 */
function generateOrderNumber(prefix: string = 'ORD'): string {
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000); // 5 dígitos
  return `${prefix}-${year}-${random}`;
}

// COMPONENTE PRINCIPAL

function OrderNumberFieldComponent({
  value,
  onChange,
  isAutomatic: initialIsAutomatic = true,
  onModeChange,
  prefix = 'ORD',
  error,
  disabled = false,
  className,
}: Readonly<OrderNumberFieldProps>) {
  const [isAutomatic, setIsAutomatic] = useState(initialIsAutomatic);

  // Generar número inicial si está en modo automático
  useEffect(() => {
    if (isAutomatic && !value) {
      const newNumber = generateOrderNumber(prefix);
      onChange(newNumber);
    }
    // Solo ejecutar en mount o cuando cambie el modo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutomatic]);

  /**
   * Cambia el modo (automático/manual)
   */
  const handleModeChange = useCallback((checked: boolean) => {
    setIsAutomatic(checked);
    onModeChange?.(checked);

    if (checked) {
      // Generar nuevo número automático
      const newNumber = generateOrderNumber(prefix);
      onChange(newNumber);
    } else {
      // Limpiar para modo manual
      onChange('');
    }
  }, [prefix, onChange, onModeChange]);

  /**
   * Regenera el número automático
   */
  const handleRegenerate = useCallback(() => {
    const newNumber = generateOrderNumber(prefix);
    onChange(newNumber);
  }, [prefix, onChange]);

  /**
   * Maneja cambio manual
   */
  const handleManualChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
  }, [onChange]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="orderNumber" className="flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Número de Orden
        </Label>
        
        {/* Toggle automático/manual */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isAutomatic ? 'Automático' : 'Manual'}
          </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Switch
                    checked={isAutomatic}
                    onCheckedChange={handleModeChange}
                    disabled={disabled}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isAutomatic 
                  ? 'Cambiar a ingreso manual' 
                  : 'Cambiar a generación automática'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="orderNumber"
            value={value}
            onChange={handleManualChange}
            placeholder={isAutomatic ? 'Generando...' : 'Ej: ORD-2026-00001'}
            disabled={disabled || isAutomatic}
            className={cn(
              'pr-10',
              error && 'border-red-300',
              isAutomatic && 'bg-muted'
            )}
          />
          
          {/* Indicador de modo */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isAutomatic ? (
              <Lock className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Unlock className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Botón regenerar (solo en modo automático) */}
        {isAutomatic && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRegenerate}
                  disabled={disabled}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Generar nuevo número</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Info del formato */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs font-mono">
          {prefix}-YYYY-XXXXX
        </Badge>
        <span>Formato: Prefijo-Año-Número</span>
      </div>
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderNumberField = memo(OrderNumberFieldComponent);
