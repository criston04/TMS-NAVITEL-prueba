'use client';

import { type FC, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  CheckCircle2,
  FileText,
  Camera,
  Signature,
  Thermometer,
  Scale,
  Settings2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStep, WorkflowStepAction } from '@/types/workflow';

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  orientation?: 'horizontal' | 'vertical';
  showDetails?: boolean;
  className?: string;
}

const actionIcons: Record<WorkflowStepAction, React.ElementType> = {
  enter_geofence: MapPin,
  exit_geofence: MapPin,
  manual_check: CheckCircle2,
  document_upload: FileText,
  signature: Signature,
  photo_capture: Camera,
  temperature_check: Thermometer,
  weight_check: Scale,
  custom: Settings2,
};

const actionLabels: Record<WorkflowStepAction, string> = {
  enter_geofence: 'Entrada',
  exit_geofence: 'Salida',
  manual_check: 'Check',
  document_upload: 'Documento',
  signature: 'Firma',
  photo_capture: 'Foto',
  temperature_check: 'Temp.',
  weight_check: 'Peso',
  custom: 'Custom',
};

export const WorkflowTimeline: FC<WorkflowTimelineProps> = ({
  steps,
  orientation = 'horizontal',
  showDetails = true,
  className,
}) => {
  const totalTime = useMemo(() => {
    return steps.reduce((acc, step) => acc + (step.estimatedDurationMinutes || 0), 0);
  }, [steps]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  };

  if (steps.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        No hay pasos definidos en este workflow
      </div>
    );
  }

  if (orientation === 'vertical') {
    return (
      <div className={cn('relative', className)}>
        {/* Línea conectora vertical */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-slate-700" />

        <div className="space-y-0">
          {steps.map((step, index) => {
            const ActionIcon = actionIcons[step.action];
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Nodo */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: step.color || '#6b7280' }}
                  >
                    <ActionIcon className="h-5 w-5" />
                  </div>
                  {!isLast && (
                    <div className="flex-1 flex items-center justify-center py-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className={cn('flex-1 pb-8', isLast && 'pb-0')}>
                  <div className="bg-white dark:bg-slate-900 rounded-lg border p-4 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            #{step.sequence}
                          </span>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {step.name}
                          </h4>
                        </div>
                        {step.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {step.isRequired && (
                          <Badge variant="secondary" className="text-[10px]">
                            Requerido
                          </Badge>
                        )}
                      </div>
                    </div>

                    {showDetails && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t">
                        <span className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {actionLabels[step.action]}
                          </Badge>
                        </span>
                        {step.actionConfig.geofenceName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {step.actionConfig.geofenceName}
                          </span>
                        )}
                        {step.estimatedDurationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(step.estimatedDurationMinutes)}
                          </span>
                        )}
                        {step.maxDurationMinutes && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            max {formatDuration(step.maxDurationMinutes)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {steps.length} hitos en total
            </span>
            <span className="font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDuration(totalTime)} estimados
            </span>
          </div>
        )}
      </div>
    );
  }

  // Horizontal orientation
  return (
    <div className={cn('', className)}>
      {/* Timeline horizontal */}
      <div className="relative">
        {/* Línea conectora */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700" />

        <div className="flex items-start justify-between relative">
          {steps.map((step, index) => {
            const ActionIcon = actionIcons[step.action];
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center',
                  !isLast && 'flex-1'
                )}
              >
                {/* Nodo */}
                <div
                  className="relative z-10 h-12 w-12 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: step.color || '#6b7280' }}
                >
                  <ActionIcon className="h-5 w-5" />
                </div>

                {/* Label */}
                <div className="mt-3 text-center max-w-30">
                  <span className="text-[10px] font-bold text-muted-foreground block">
                    #{step.sequence}
                  </span>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                    {step.name}
                  </h4>
                  {showDetails && step.estimatedDurationMinutes && (
                    <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(step.estimatedDurationMinutes)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {showDetails && (
        <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-sm">
          <span className="text-muted-foreground">
            {steps.length} hitos
          </span>
          <span className="font-medium flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(totalTime)} estimados
          </span>
        </div>
      )}
    </div>
  );
};
