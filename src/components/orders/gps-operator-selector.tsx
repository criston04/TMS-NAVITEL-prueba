'use client';

import { useState, useMemo } from 'react';
import {
  Radio,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  Truck,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  gpsOperatorsMock,
  getConnectedGpsOperators,
  type GpsOperator,
} from '@/mocks/master/gps-operators.mock';

interface GpsOperatorSelectorProps {
  /** Valor seleccionado */
  value?: string;
  /** Callback al cambiar selección */
  onChange: (operatorId: string | undefined) => void;
  /** Operador sugerido por el vehículo */
  suggestedOperatorId?: string;
  /** Label del campo */
  label?: string;
  /** Si es requerido */
  required?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** Si está deshabilitado */
  disabled?: boolean;
  /** Mostrar solo operadores conectados */
  onlyConnected?: boolean;
  /** Error a mostrar */
  error?: string;
  /** Modo compacto */
  compact?: boolean;
}

// COMPONENTE STATUS BADGE

function StatusBadge({ status }: { status: GpsOperator['integrationStatus'] }) {
  const config = {
    connected: {
      icon: Wifi,
      label: 'Conectado',
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
    },
    pending: {
      icon: Clock,
      label: 'Pendiente',
      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    },
    error: {
      icon: AlertCircle,
      label: 'Error',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
    'not-configured': {
      icon: WifiOff,
      label: 'Sin configurar',
      className: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    },
  };

  const { icon: Icon, label, className } = config[status];

  return (
    <Badge variant="outline" className={cn('text-xs gap-1', className)}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

// COMPONENTE PRINCIPAL

export function GpsOperatorSelector({
  value,
  onChange,
  suggestedOperatorId,
  label = 'Operador GPS',
  required = false,
  placeholder = 'Selecciona operador GPS',
  disabled = false,
  onlyConnected = false,
  error,
  compact = false,
}: GpsOperatorSelectorProps) {
  const [open, setOpen] = useState(false);

  // Filtrar operadores según configuración
  const availableOperators = useMemo(() => {
    if (onlyConnected) {
      return getConnectedGpsOperators();
    }
    return gpsOperatorsMock.filter(op => op.isActive);
  }, [onlyConnected]);

  // Encontrar operador seleccionado
  const selectedOperator = useMemo(() => {
    return gpsOperatorsMock.find(op => op.id === value);
  }, [value]);

  // Encontrar operador sugerido
  const suggestedOperator = useMemo(() => {
    return gpsOperatorsMock.find(op => op.id === suggestedOperatorId);
  }, [suggestedOperatorId]);

  const handleSelect = (operatorId: string) => {
    onChange(operatorId === 'none' ? undefined : operatorId);
    setOpen(false);
  };

  // Versión compacta con Select simple
  if (compact) {
    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        )}
        <Select
          value={value || 'none'}
          onValueChange={handleSelect}
          disabled={disabled}
        >
          <SelectTrigger className={cn(error && 'border-red-500')}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin asignar</SelectItem>
            {availableOperators.map(operator => (
              <SelectItem key={operator.id} value={operator.id}>
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  <span>{operator.shortName}</span>
                  {operator.id === suggestedOperatorId && (
                    <Badge variant="secondary" className="text-xs ml-1">
                      Sugerido
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Versión completa con Popover
  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Sugerencia del vehículo */}
      {suggestedOperator && !value && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 text-sm">
          <Radio className="w-4 h-4 text-blue-500" />
          <span className="text-muted-foreground">Sugerido por vehículo:</span>
          <span className="font-medium">{suggestedOperator.shortName}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7"
            onClick={() => onChange(suggestedOperatorId)}
          >
            Usar sugerido
          </Button>
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              error && 'border-red-500'
            )}
            disabled={disabled}
          >
            {selectedOperator ? (
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                <span>{selectedOperator.name}</span>
                <StatusBadge status={selectedOperator.integrationStatus} />
              </div>
            ) : (
              <span>{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <p className="text-sm font-medium">Seleccionar Operador GPS</p>
            <p className="text-xs text-muted-foreground">
              {availableOperators.length} operadores disponibles
            </p>
          </div>

          <div className="max-h-[300px] overflow-auto">
            {/* Opción Sin asignar */}
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left',
                !value && 'bg-muted/30'
              )}
              onClick={() => handleSelect('none')}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <WifiOff className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Sin asignar</p>
                <p className="text-xs text-muted-foreground">
                  Se puede asignar después
                </p>
              </div>
              {!value && <Check className="w-4 h-4 text-primary" />}
            </button>

            {/* Lista de operadores */}
            {availableOperators.map(operator => {
              const isSelected = value === operator.id;
              const isSuggested = operator.id === suggestedOperatorId;

              return (
                <button
                  key={operator.id}
                  type="button"
                  className={cn(
                    'w-full flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-t',
                    isSelected && 'bg-primary/5',
                    operator.integrationStatus !== 'connected' && 'opacity-60'
                  )}
                  onClick={() => handleSelect(operator.id)}
                  disabled={operator.integrationStatus === 'not-configured'}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center',
                      operator.integrationStatus === 'connected'
                        ? 'bg-green-500/10'
                        : 'bg-muted'
                    )}
                  >
                    <Radio
                      className={cn(
                        'w-4 h-4',
                        operator.integrationStatus === 'connected'
                          ? 'text-green-500'
                          : 'text-muted-foreground'
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{operator.name}</p>
                      {isSuggested && (
                        <Badge variant="secondary" className="text-xs">
                          Sugerido
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={operator.integrationStatus} />
                      {operator.vehiclesTracked !== undefined &&
                        operator.vehiclesTracked > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {operator.vehiclesTracked} vehículos
                          </span>
                        )}
                    </div>

                    {operator.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {operator.notes}
                      </p>
                    )}
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary mt-1" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Info del operador seleccionado */}
      {selectedOperator && selectedOperator.integrationStatus !== 'connected' && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-sm">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-700 dark:text-yellow-400">
            {selectedOperator.integrationStatus === 'pending'
              ? 'La integración está pendiente de configuración'
              : selectedOperator.integrationStatus === 'error'
              ? 'Hay un problema de conexión con este operador'
              : 'Este operador no está configurado'}
          </span>
        </div>
      )}
    </div>
  );
}
