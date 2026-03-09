'use client';

import { memo, useState } from 'react';
import {
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Truck,
  User,
  Calendar,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import type { ResourceConflict, ConflictType } from '@/hooks/orders/use-resource-conflicts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ConflictWarningProps {
  
  conflicts: ResourceConflict[];
  /** Callback para forzar (ignorar conflictos) */
  onForce?: () => void;
  /** Mostrar botón de forzar */
  showForceButton?: boolean;
  /** Clase adicional */
  className?: string;
}

const CONFLICT_ICONS: Record<ConflictType, typeof Truck> = {
  vehicle: Truck,
  driver: User,
  overlap: Calendar,
};

const CONFLICT_LABELS: Record<ConflictType, string> = {
  vehicle: 'Vehículo',
  driver: 'Conductor',
  overlap: 'Fechas',
};

// COMPONENTE DE CONFLICTO INDIVIDUAL

interface ConflictItemProps {
  conflict: ResourceConflict;
}

function ConflictItem({ conflict }: ConflictItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = CONFLICT_ICONS[conflict.type];
  
  const isError = conflict.severity === 'error';

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        isError ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/5 transition-colors"
      >
        <div
          className={cn(
            'p-1.5 rounded-full',
            isError ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                isError ? 'border-red-300 text-red-700' : 'border-amber-300 text-amber-700'
              )}
            >
              {CONFLICT_LABELS[conflict.type]}
            </Badge>
            <span className={cn(
              'text-sm font-medium',
              isError ? 'text-red-800' : 'text-amber-800'
            )}>
              {conflict.message}
            </span>
          </div>
          
          {conflict.details.conflictingOrderNumber && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Conflicto con orden: {conflict.details.conflictingOrderNumber}
            </p>
          )}
        </div>

        {conflict.suggestions.length > 0 && (
          isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )
        )}
      </button>

      {/* Detalles expandidos */}
      {isExpanded && conflict.suggestions.length > 0 && (
        <div className="border-t px-3 py-2 space-y-2">
          {/* Detalles del conflicto */}
          {conflict.details.conflictStartDate && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Período en conflicto: </span>
              {new Date(conflict.details.conflictStartDate).toLocaleDateString()} - 
              {conflict.details.conflictEndDate && 
                new Date(conflict.details.conflictEndDate).toLocaleDateString()
              }
            </div>
          )}

          {/* Sugerencias */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Lightbulb className="w-3 h-3" />
              Sugerencias:
            </div>
            <ul className="text-xs space-y-1">
              {conflict.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Link a orden en conflicto */}
          {conflict.details.conflictingOrderId && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              asChild
            >
              <a
                href={`/orders/${conflict.details.conflictingOrderId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver orden {conflict.details.conflictingOrderNumber}
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// COMPONENTE PRINCIPAL

function ConflictWarningComponent({
  conflicts,
  onForce,
  showForceButton = false,
  className,
}: Readonly<ConflictWarningProps>) {
  if (conflicts.length === 0) return null;

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;
  const hasOnlyWarnings = errorCount === 0 && warningCount > 0;

  return (
    <Card
      className={cn(
        'border-2',
        hasOnlyWarnings ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50',
        className
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-3 text-base">
          {hasOnlyWarnings ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className={hasOnlyWarnings ? 'text-amber-800' : 'text-red-800'}>
            {hasOnlyWarnings ? 'Advertencias detectadas' : 'Conflictos detectados'}
          </span>
          <div className="flex gap-1">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} error{errorCount > 1 ? 'es' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                {warningCount} advertencia{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2">
          {conflicts.map(conflict => (
            <ConflictItem key={conflict.id} conflict={conflict} />
          ))}
        </div>

        {/* Botón de forzar */}
        {showForceButton && hasOnlyWarnings && onForce && (
          <div className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onForce}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Continuar de todas formas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exportación memoizada
 */
export const ConflictWarning = memo(ConflictWarningComponent);
