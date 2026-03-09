'use client';

import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isOptional?: boolean;
}

interface WizardNavigationProps {
  /** Lista de pasos del wizard */
  steps: WizardStep[];
  /** Índice del paso actual (0-based) */
  currentStep: number;
  /** Callback al cambiar de paso */
  onStepChange: (step: number) => void;
  /** Si está cargando/procesando */
  isLoading?: boolean;
  /** Si se puede avanzar al siguiente paso */
  canProceed?: boolean;
  /** Si es el último paso (mostrar "Crear" en vez de "Siguiente") */
  isLastStep?: boolean;
  /** Callback al hacer clic en Crear */
  onSubmit?: () => void;
  /** Callback al cancelar */
  onCancel?: () => void;
}

// COMPONENTE STEPPER

function Stepper({ 
  steps, 
  currentStep, 
  onStepChange 
}: { 
  steps: WizardStep[]; 
  currentStep: number; 
  onStepChange: (step: number) => void;
}) {
  return (
    <div className="w-full">
      {/* Desktop Stepper */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-initial">
              {/* Step Circle + Content */}
              <button
                type="button"
                onClick={() => isClickable && onStepChange(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-3 transition-colors',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed',
                  isCurrent && 'text-primary',
                  isCompleted && 'text-primary',
                  !isCurrent && !isCompleted && 'text-muted-foreground'
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-primary/10 text-primary',
                    !isCurrent && !isCompleted && 'border-muted-foreground/30 bg-muted/30'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>

                {/* Text */}
                <div className="hidden lg:block text-left">
                  <div className="font-medium text-sm leading-tight">
                    {step.title}
                    {step.isOptional && (
                      <span className="text-muted-foreground font-normal ml-1">(Opcional)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
              </button>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div
                    className={cn(
                      'h-0.5 transition-colors',
                      index < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Paso {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm font-medium">
            {steps[currentStep]?.title}
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index <= currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL

export function WizardNavigation({
  steps,
  currentStep,
  onStepChange,
  isLoading = false,
  canProceed = true,
  isLastStep = false,
  onSubmit,
  onCancel,
}: WizardNavigationProps) {
  const handlePrevious = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (isLastStep && onSubmit) {
      onSubmit();
    } else if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Stepper steps={steps} currentStep={currentStep} onStepChange={onStepChange} />

      {/* Navigation Buttons (se mostrarán al final del wizard) */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          {currentStep > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isLastStep && currentStep > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
          )}
          
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLastStep ? 'Creando...' : 'Validando...'}
              </>
            ) : isLastStep ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Crear Orden
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Export Stepper for standalone use
export { Stepper };
