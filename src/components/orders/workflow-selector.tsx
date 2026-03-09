'use client';

import { memo, useState } from 'react';
import {
  Workflow as WorkflowIcon,
  ChevronDown,
  Check,
  Sparkles,
  Clock,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import type { Workflow, WorkflowStep } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WorkflowSelectorProps {
  /** Workflow seleccionado actualmente */
  selectedWorkflow: Workflow | null;
  /** Lista de workflows disponibles */
  workflows: Workflow[];
  /** Workflow sugerido por el sistema */
  suggestedWorkflowId?: string | null;
  /** Razón de la sugerencia */
  suggestionReason?: string;
  /** Callback al seleccionar workflow */
  onSelect: (workflow: Workflow) => void;
  /** Está cargando workflows */
  isLoading?: boolean;
  /** Mostrar vista previa de pasos */
  showStepsPreview?: boolean;
  /** Clase adicional */
  className?: string;
}

/**
 * Calcula la duración total de un workflow
 */
function calculateTotalDuration(steps: WorkflowStep[]): number {
  return steps.reduce((total, step) => total + (step.estimatedDurationMinutes || 0), 0);
}

/**
 * Formatea duración en minutos a texto legible
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// COMPONENTE DE PASO DEL WORKFLOW

interface StepPreviewItemProps {
  step: WorkflowStep;
  isFirst: boolean;
  isLast: boolean;
}

function StepPreviewItem({ step, isFirst, isLast }: StepPreviewItemProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Línea de conexión */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2',
            isFirst ? 'bg-green-500 border-green-500' :
            isLast ? 'bg-red-500 border-red-500' :
            'bg-blue-500 border-blue-500'
          )}
        />
        {!isLast && (
          <div className="w-0.5 h-8 bg-muted-foreground/30" />
        )}
      </div>
      
      {/* Contenido del paso */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{step.name}</span>
          {step.actionConfig?.geofenceName && (
            <Badge variant="outline" className="text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {step.actionConfig.geofenceName}
            </Badge>
          )}
        </div>
        {step.estimatedDurationMinutes && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(step.estimatedDurationMinutes)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL

function WorkflowSelectorComponent({
  selectedWorkflow,
  workflows,
  suggestedWorkflowId,
  suggestionReason,
  onSelect,
  isLoading = false,
  showStepsPreview = true,
  className,
}: Readonly<WorkflowSelectorProps>) {
  const [isStepsOpen, setIsStepsOpen] = useState(true);

  // Verificar si el workflow seleccionado es el sugerido
  const isSuggested = selectedWorkflow?.id === suggestedWorkflowId;

  // Calcular duración total
  const totalDuration = selectedWorkflow 
    ? calculateTotalDuration(selectedWorkflow.steps) 
    : 0;

  // Filtrar solo workflows activos
  const activeWorkflows = workflows.filter(w => w.status === 'active');

  return (
    <Card className={cn('border-primary/20', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <WorkflowIcon className="w-5 h-5 text-primary" />
            Workflow
          </CardTitle>
          
          {/* Selector dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {selectedWorkflow ? 'Cambiar' : 'Seleccionar'}
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Workflows Disponibles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {activeWorkflows.length === 0 ? (
                <DropdownMenuItem disabled>
                  No hay workflows activos
                </DropdownMenuItem>
              ) : (
                activeWorkflows.map((workflow) => (
                  <DropdownMenuItem
                    key={workflow.id}
                    onClick={() => onSelect(workflow)}
                    className="flex items-start gap-2 py-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{workflow.name}</span>
                        {workflow.id === suggestedWorkflowId && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Sparkles className="w-3 h-3" />
                            Sugerido
                          </Badge>
                        )}
                        {workflow.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {workflow.steps.length} pasos • {formatDuration(calculateTotalDuration(workflow.steps))}
                      </div>
                    </div>
                    {selectedWorkflow?.id === workflow.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Descripción y badges */}
        {selectedWorkflow && (
          <CardDescription className="mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {selectedWorkflow.name}
              </span>
              
              {isSuggested && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="w-3 h-3" />
                  Auto-sugerido
                </Badge>
              )}
              
              <Badge variant="outline" className="text-xs">
                {selectedWorkflow.steps.length} pasos
              </Badge>
              
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {formatDuration(totalDuration)}
              </Badge>
            </div>
            
            {suggestionReason && isSuggested && (
              <p className="text-xs text-muted-foreground mt-1">
                {suggestionReason}
              </p>
            )}
          </CardDescription>
        )}
      </CardHeader>

      {/* Vista previa de pasos */}
      {selectedWorkflow && showStepsPreview && (
        <CardContent className="pt-0">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-muted-foreground hover:text-foreground"
            onClick={() => setIsStepsOpen(!isStepsOpen)}
          >
            <span className="text-xs">Ver pasos del workflow</span>
            <ChevronDown 
              className={cn(
                'w-4 h-4 transition-transform',
                isStepsOpen && 'rotate-180'
              )} 
            />
          </Button>
          {isStepsOpen && (
            <div className="mt-3 pl-2 border-l-2 border-muted ml-1">
              {selectedWorkflow.steps
                .sort((a, b) => a.sequence - b.sequence)
                .map((step, index, arr) => (
                  <StepPreviewItem
                    key={step.id}
                    step={step}
                    isFirst={index === 0}
                    isLast={index === arr.length - 1}
                  />
                ))
              }
            </div>
          )}
        </CardContent>
      )}

      {/* Sin workflow seleccionado */}
      {!selectedWorkflow && !isLoading && (
        <CardContent className="pt-0">
          <div className="text-center py-4 text-muted-foreground">
            <WorkflowIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Selecciona un workflow para definir los pasos de la orden</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Exportación memoizada
 */
export const WorkflowSelector = memo(WorkflowSelectorComponent);
