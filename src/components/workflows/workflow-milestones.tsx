'use client';

import { type FC, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  GripVertical,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Camera,
  Signature,
  Thermometer,
  Scale,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStep, WorkflowStepAction } from '@/types/workflow';

interface MilestoneGeofence {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface WorkflowMilestonesProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  availableGeofences: MilestoneGeofence[];
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
  enter_geofence: 'Entrada a Geocerca',
  exit_geofence: 'Salida de Geocerca',
  manual_check: 'Verificación Manual',
  document_upload: 'Subir Documento',
  signature: 'Capturar Firma',
  photo_capture: 'Tomar Foto',
  temperature_check: 'Control de Temperatura',
  weight_check: 'Control de Peso',
  custom: 'Acción Personalizada',
};

const defaultColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

export const WorkflowMilestones: FC<WorkflowMilestonesProps> = ({
  steps,
  onStepsChange,
  availableGeofences,
  className,
}) => {
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState<Partial<WorkflowStep>>({});

  const openAddDialog = useCallback(() => {
    setEditingStep(null);
    setFormData({
      name: '',
      action: 'enter_geofence',
      isRequired: true,
      canSkip: false,
      estimatedDurationMinutes: 30,
      maxDurationMinutes: 60,
      color: defaultColors[steps.length % defaultColors.length],
      actionConfig: {},
      transitionConditions: [],
      notifications: [],
    });
    setIsDialogOpen(true);
  }, [steps.length]);

  const openEditDialog = useCallback((step: WorkflowStep) => {
    setEditingStep(step);
    setFormData({ ...step });
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingStep(null);
    setFormData({});
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.name) return;

    if (editingStep) {
      // Update existing
      const updatedSteps = steps.map(s =>
        s.id === editingStep.id
          ? { ...s, ...formData }
          : s
      );
      onStepsChange(updatedSteps);
    } else {
      // Add new
      const newStep: WorkflowStep = {
        id: `step-${Date.now()}`,
        name: formData.name || '',
        description: formData.description,
        sequence: steps.length + 1,
        action: formData.action || 'enter_geofence',
        isRequired: formData.isRequired ?? true,
        canSkip: formData.canSkip ?? false,
        actionConfig: formData.actionConfig || {},
        estimatedDurationMinutes: formData.estimatedDurationMinutes,
        maxDurationMinutes: formData.maxDurationMinutes,
        transitionConditions: [],
        notifications: [],
        color: formData.color,
      };
      onStepsChange([...steps, newStep]);
    }
    closeDialog();
  }, [formData, editingStep, steps, onStepsChange, closeDialog]);

  const handleDelete = useCallback((stepId: string) => {
    const updatedSteps = steps
      .filter(s => s.id !== stepId)
      .map((s, index) => ({ ...s, sequence: index + 1 }));
    onStepsChange(updatedSteps);
  }, [steps, onStepsChange]);

  // Drag and Drop handlers
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSteps = [...steps];
    const [draggedStep] = newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);

    // Update sequences
    const resequencedSteps = newSteps.map((s, i) => ({
      ...s,
      sequence: i + 1,
    }));

    onStepsChange(resequencedSteps);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, steps, onStepsChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const totalEstimatedTime = useMemo(() => {
    return steps.reduce((acc, step) => acc + (step.estimatedDurationMinutes || 0), 0);
  }, [steps]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Hitos del Workflow
          </h3>
          <p className="text-sm text-muted-foreground">
            {steps.length} hitos · {formatDuration(totalEstimatedTime)} estimados
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar Hito
        </Button>
      </div>

      {/* Steps List */}
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mb-3" />
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            Sin hitos definidos
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Agrega hitos para definir la secuencia del workflow
          </p>
          <Button onClick={openAddDialog} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar primer hito
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, index) => {
            const ActionIcon = actionIcons[step.action];
            return (
              <div
                key={step.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border',
                  'transition-all duration-200 cursor-move group',
                  draggedIndex === index && 'opacity-50 scale-95',
                  dragOverIndex === index && 'ring-2 ring-primary ring-offset-2',
                  'hover:shadow-md'
                )}
              >
                {/* Drag handle */}
                <div className="text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Sequence number */}
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: step.color || '#6b7280' }}
                >
                  {step.sequence}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {step.name}
                    </h4>
                    {step.isRequired && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        Requerido
                      </Badge>
                    )}
                    {step.canSkip && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Saltable
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <ActionIcon className="h-3 w-3" />
                      {actionLabels[step.action]}
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
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(step)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(step.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? 'Editar Hito' : 'Agregar Hito'}
            </DialogTitle>
            <DialogDescription>
              {editingStep
                ? 'Modifica los datos del hito'
                : 'Define un nuevo hito para el workflow'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="step-name">Nombre del Hito *</Label>
              <Input
                id="step-name"
                placeholder="Ej: Llegada a Origen"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="step-description">Descripción</Label>
              <Input
                id="step-description"
                placeholder="Descripción opcional"
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Tipo de Acción */}
            <div className="space-y-2">
              <Label>Tipo de Acción *</Label>
              <Select
                value={formData.action}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  action: value as WorkflowStepAction,
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una acción" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionLabels).map(([value, label]) => {
                    const Icon = actionIcons[value as WorkflowStepAction];
                    return (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Geocerca (si aplica) */}
            {(formData.action === 'enter_geofence' || formData.action === 'exit_geofence') && (
              <div className="space-y-2">
                <Label>Geocerca *</Label>
                <Select
                  value={formData.actionConfig?.geofenceId || ''}
                  onValueChange={(value) => {
                    const geofence = availableGeofences.find(g => g.id === value);
                    setFormData(prev => ({
                      ...prev,
                      actionConfig: {
                        ...prev.actionConfig,
                        geofenceId: value,
                        geofenceName: geofence?.name,
                      },
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una geocerca" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGeofences.map(geofence => (
                      <SelectItem key={geofence.id} value={geofence.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: geofence.color }}
                          />
                          {geofence.name}
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {geofence.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tiempos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated-time">Tiempo Estimado (min)</Label>
                <Input
                  id="estimated-time"
                  type="number"
                  min={0}
                  value={formData.estimatedDurationMinutes || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    estimatedDurationMinutes: parseInt(e.target.value) || 0,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-time">Tiempo Máximo (min)</Label>
                <Input
                  id="max-time"
                  type="number"
                  min={0}
                  value={formData.maxDurationMinutes || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    maxDurationMinutes: parseInt(e.target.value) || 0,
                  }))}
                />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {defaultColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full transition-transform',
                      formData.color === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRequired ?? true}
                  onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Es requerido
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.canSkip ?? false}
                  onChange={(e) => setFormData(prev => ({ ...prev, canSkip: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Se puede saltar
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name}>
              {editingStep ? 'Guardar Cambios' : 'Agregar Hito'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
