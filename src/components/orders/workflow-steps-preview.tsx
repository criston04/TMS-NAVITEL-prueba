'use client';

import { memo, useMemo } from 'react';
import {
  MapPin,
  Clock,
  FileCheck,
  Camera,
  Thermometer,
  Weight,
  CheckCircle2,
  Circle,
  ArrowRight,
} from 'lucide-react';
import type { WorkflowStep, WorkflowStepAction } from '@/types/workflow';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface WorkflowStepsPreviewProps {
  /** Pasos del workflow */
  steps: WorkflowStep[];
  /** Mostrar duración total */
  showTotalDuration?: boolean;
  /** Mostrar en formato compacto */
  compact?: boolean;
  /** Paso actual (para highlight) */
  currentStepIndex?: number;
  /** Clase adicional */
  className?: string;
}

/**
 * Configuración de iconos y colores por tipo de acción
 */
const ACTION_CONFIG: Record<WorkflowStepAction, {
  icon: typeof MapPin;
  label: string;
  color: string;
}> = {
  enter_geofence: {
    icon: MapPin,
    label: 'Entrada a geocerca',
    color: 'text-blue-500',
  },
  exit_geofence: {
    icon: ArrowRight,
    label: 'Salida de geocerca',
    color: 'text-indigo-500',
  },
  manual_check: {
    icon: FileCheck,
    label: 'Verificación manual',
    color: 'text-amber-500',
  },
  document_upload: {
    icon: FileCheck,
    label: 'Subir documento',
    color: 'text-purple-500',
  },
  signature: {
    icon: CheckCircle2,
    label: 'Capturar firma',
    color: 'text-green-500',
  },
  photo_capture: {
    icon: Camera,
    label: 'Tomar foto',
    color: 'text-pink-500',
  },
  temperature_check: {
    icon: Thermometer,
    label: 'Verificar temperatura',
    color: 'text-cyan-500',
  },
  weight_check: {
    icon: Weight,
    label: 'Verificar peso',
    color: 'text-orange-500',
  },
  custom: {
    icon: Circle,
    label: 'Acción personalizada',
    color: 'text-gray-500',
  },
};

/**
 * Formatea duración en minutos a texto legible
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

/**
 * Determina el tipo de milestone basado en posición
 */
function getMilestoneType(index: number, total: number): 'origin' | 'waypoint' | 'destination' {
  if (index === 0) return 'origin';
  if (index === total - 1) return 'destination';
  return 'waypoint';
}

/**
 * Obtiene el color del indicador según tipo
 */
function getIndicatorColor(type: 'origin' | 'waypoint' | 'destination'): string {
  switch (type) {
    case 'origin': return 'bg-green-500 border-green-500';
    case 'destination': return 'bg-red-500 border-red-500';
    default: return 'bg-blue-500 border-blue-500';
  }
}

// COMPONENTE DE PASO INDIVIDUAL

interface StepItemProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  isCompact: boolean;
  isCurrent: boolean;
}

function StepItem({ step, index, totalSteps, isCompact, isCurrent }: StepItemProps) {
  const milestoneType = getMilestoneType(index, totalSteps);
  const isLast = index === totalSteps - 1;
  const actionConfig = ACTION_CONFIG[step.action];
  const ActionIcon = actionConfig.icon;

  if (isCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2',
                  isCurrent && 'ring-2 ring-primary ring-offset-2',
                  getIndicatorColor(milestoneType)
                )}
              >
                <span className="text-white text-xs font-bold">{index + 1}</span>
              </div>
              {!isLast && (
                <div className="w-8 h-0.5 bg-muted-foreground/30" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-sm">
              <p className="font-medium">{step.name}</p>
              {step.estimatedDurationMinutes && (
                <p className="text-xs text-muted-foreground">
                  {formatDuration(step.estimatedDurationMinutes)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex gap-3', isCurrent && 'bg-primary/5 rounded-lg p-2 -mx-2')}>
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0',
            getIndicatorColor(milestoneType)
          )}
        >
          <span className="text-white text-xs font-bold">{index + 1}</span>
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-muted-foreground/30 min-h-[40px]" />
        )}
      </div>

      {/* Contenido del paso */}
      <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{step.name}</p>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {step.description}
              </p>
            )}
          </div>
          
          {/* Badge de tipo de acción */}
          <Badge variant="outline" className={cn('text-xs shrink-0', actionConfig.color)}>
            <ActionIcon className="w-3 h-3 mr-1" />
            {actionConfig.label}
          </Badge>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {step.actionConfig?.geofenceName && (
            <Badge variant="secondary" className="text-xs gap-1">
              <MapPin className="w-3 h-3" />
              {step.actionConfig.geofenceName}
            </Badge>
          )}
          
          {step.estimatedDurationMinutes && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(step.estimatedDurationMinutes)}
            </span>
          )}

          {step.isRequired && (
            <Badge variant="outline" className="text-xs text-red-500">
              Obligatorio
            </Badge>
          )}

          {step.canSkip && (
            <Badge variant="outline" className="text-xs text-amber-500">
              Omitible
            </Badge>
          )}
        </div>

        {/* Instrucciones si existen */}
        {step.actionConfig?.instructions && (
          <div className="mt-2 text-xs bg-muted/50 rounded p-2 text-muted-foreground">
            <strong>Instrucciones:</strong> {step.actionConfig.instructions}
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL

function WorkflowStepsPreviewComponent({
  steps,
  showTotalDuration = true,
  compact = false,
  currentStepIndex,
  className,
}: Readonly<WorkflowStepsPreviewProps>) {
  // Ordenar pasos por secuencia
  const sortedSteps = useMemo(() => 
    [...steps].sort((a, b) => a.sequence - b.sequence),
    [steps]
  );

  // Calcular duración total
  const totalDuration = useMemo(() => 
    steps.reduce((total, step) => total + (step.estimatedDurationMinutes || 0), 0),
    [steps]
  );

  if (steps.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay pasos definidos en este workflow</p>
      </div>
    );
  }

  // Vista compacta (horizontal)
  if (compact) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="flex items-center justify-center gap-0 overflow-x-auto py-2">
          {sortedSteps.map((step, index) => (
            <StepItem
              key={step.id}
              step={step}
              index={index}
              totalSteps={sortedSteps.length}
              isCompact={true}
              isCurrent={currentStepIndex === index}
            />
          ))}
        </div>
        
        {showTotalDuration && (
          <div className="text-center text-xs text-muted-foreground">
            <Clock className="w-3 h-3 inline mr-1" />
            Duración estimada total: <strong>{formatDuration(totalDuration)}</strong>
          </div>
        )}
      </div>
    );
  }

  // Vista completa (vertical)
  return (
    <div className={className}>
      {/* Header con resumen */}
      {showTotalDuration && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <span className="text-sm text-muted-foreground">
            {sortedSteps.length} pasos en el workflow
          </span>
          <Badge variant="secondary" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(totalDuration)} estimados
          </Badge>
        </div>
      )}

      {/* Lista de pasos */}
      <div className="space-y-0">
        {sortedSteps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            index={index}
            totalSteps={sortedSteps.length}
            isCompact={false}
            isCurrent={currentStepIndex === index}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const WorkflowStepsPreview = memo(WorkflowStepsPreviewComponent);

// COMPONENTE CARD WRAPPER

interface WorkflowStepsCardProps extends WorkflowStepsPreviewProps {
  title?: string;
}

function WorkflowStepsCardComponent({
  title = 'Pasos del Workflow',
  ...props
}: WorkflowStepsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WorkflowStepsPreview {...props} />
      </CardContent>
    </Card>
  );
}

export const WorkflowStepsCard = memo(WorkflowStepsCardComponent);
