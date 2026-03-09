'use client';

import { type FC, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  X,
  Save,
  Route,
  Users,
  Settings2,
  AlertTriangle,
  Info,
  Loader2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowMilestones } from './workflow-milestones';
import { WorkflowTimeline } from './workflow-timeline';
import type { Workflow, WorkflowStep, CreateWorkflowDTO } from '@/types/workflow';
import { workflowTypes } from '@/mocks/master/workflows.mock';

interface Customer {
  id: string;
  name: string;
}

interface Geofence {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface WorkflowFormProps {
  workflow?: Workflow | null;
  availableCustomers: Customer[];
  availableGeofences: Geofence[];
  onSave: (data: CreateWorkflowDTO) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

interface FormData {
  name: string;
  description: string;
  code: string;
  type: string;
  isDefault: boolean;
  applicableCustomerIds: string[];
  applicableCargoTypes: string[];
  steps: WorkflowStep[];
}

export const WorkflowForm: FC<WorkflowFormProps> = ({
  workflow,
  availableCustomers,
  availableGeofences,
  onSave,
  onCancel,
  isLoading: _isLoading = false,
  className,
}) => {
  const isEditing = !!workflow;
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    code: '',
    type: 'import',
    isDefault: false,
    applicableCustomerIds: [],
    applicableCargoTypes: [],
    steps: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Initialize form with workflow data if editing
  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description,
        code: workflow.code,
        type: workflow.applicableCargoTypes?.[0] || 'import',
        isDefault: workflow.isDefault,
        applicableCustomerIds: workflow.applicableCustomerIds || [],
        applicableCargoTypes: workflow.applicableCargoTypes || [],
        steps: workflow.steps,
      });
    }
  }, [workflow]);

  const generateCode = useCallback(() => {
    const prefix = 'WF';
    const typePrefix = formData.type.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${typePrefix}-${random}`;
  }, [formData.type]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'El código es requerido';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'Debe agregar al menos un hito';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      setActiveTab('general');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: formData.name,
        description: formData.description,
        code: formData.code,
        steps: formData.steps.map(({ id: _id, ...step }) => step),
        applicableCargoTypes: [formData.type, ...formData.applicableCargoTypes],
        applicableCustomerIds: formData.applicableCustomerIds,
        isDefault: formData.isDefault,
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, validateForm]);

  const handleCustomerToggle = useCallback((customerId: string) => {
    setFormData(prev => ({
      ...prev,
      applicableCustomerIds: prev.applicableCustomerIds.includes(customerId)
        ? prev.applicableCustomerIds.filter(id => id !== customerId)
        : [...prev.applicableCustomerIds, customerId],
    }));
  }, []);

  const selectedType = workflowTypes.find(t => t.value === formData.type);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: selectedType?.color ? `${selectedType.color}15` : '#f3f4f6' }}
          >
            <Route className="h-5 w-5" style={{ color: selectedType?.color || '#6b7280' }} />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-gray-900 dark:text-white">
              {isEditing ? 'Editar Workflow' : 'Nuevo Workflow'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {formData.code || 'Sin código asignado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
          </Button>
          <Button variant="outline" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className={cn('grid gap-6', showPreview && 'lg:grid-cols-2')}>
          {/* Form */}
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="milestones" className="gap-2">
                  <Route className="h-4 w-4" />
                  Hitos
                  {formData.steps.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {formData.steps.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="customers" className="gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </TabsTrigger>
              </TabsList>

              {/* Tab: General */}
              <TabsContent value="general" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Información Básica</CardTitle>
                    <CardDescription>
                      Define los datos principales del workflow
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Nombre */}
                    <div className="space-y-2">
                      <Label htmlFor="wf-name">Nombre *</Label>
                      <Input
                        id="wf-name"
                        placeholder="Ej: Importación Estándar"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, name: e.target.value }));
                          setErrors(prev => ({ ...prev, name: undefined }));
                        }}
                        className={cn(errors.name && 'border-red-500')}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.name}
                        </p>
                      )}
                    </div>

                    {/* Código */}
                    <div className="space-y-2">
                      <Label htmlFor="wf-code">Código *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="wf-code"
                          placeholder="WF-IMP-XXXX"
                          value={formData.code}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }));
                            setErrors(prev => ({ ...prev, code: undefined }));
                          }}
                          className={cn('font-mono', errors.code && 'border-red-500')}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFormData(prev => ({ ...prev, code: generateCode() }))}
                        >
                          Generar
                        </Button>
                      </div>
                      {errors.code && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.code}
                        </p>
                      )}
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                      <Label>Tipo de Workflow *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {workflowTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: type.color }}
                                />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                      <Label htmlFor="wf-description">Descripción *</Label>
                      <Textarea
                        id="wf-description"
                        placeholder="Describe el propósito y uso de este workflow..."
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setFormData(prev => ({ ...prev, description: e.target.value }));
                          setErrors(prev => ({ ...prev, description: undefined }));
                        }}
                        className={cn('min-h-25', errors.description && 'border-red-500')}
                      />
                      {errors.description && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {errors.description}
                        </p>
                      )}
                    </div>

                    {/* Por defecto */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Info className="h-5 w-5 text-[#34b7ff]" />
                        <div>
                          <p className="font-medium text-sm">Workflow por Defecto</p>
                          <p className="text-xs text-muted-foreground">
                            Este workflow se asignará automáticamente a nuevas órdenes
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.isDefault}
                        onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Milestones/Hitos */}
              <TabsContent value="milestones" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hitos del Workflow</CardTitle>
                    <CardDescription>
                      Define la secuencia de pasos que conforman este workflow.
                      Arrastra para reordenar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {errors.steps && (
                      <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {errors.steps}
                      </div>
                    )}
                    <WorkflowMilestones
                      steps={formData.steps}
                      onStepsChange={(steps) => {
                        setFormData(prev => ({ ...prev, steps }));
                        setErrors(prev => ({ ...prev, steps: undefined }));
                      }}
                      availableGeofences={availableGeofences}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Customers */}
              <TabsContent value="customers" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Clientes Aplicables</CardTitle>
                    <CardDescription>
                      Selecciona los clientes a los que se puede aplicar este workflow.
                      Si no seleccionas ninguno, estará disponible para todos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableCustomers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No hay clientes disponibles
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-100 overflow-y-auto">
                        {availableCustomers.map(customer => (
                          <label
                            key={customer.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                              formData.applicableCustomerIds.includes(customer.id)
                                ? 'bg-primary/5 border-primary'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={formData.applicableCustomerIds.includes(customer.id)}
                              onChange={() => handleCustomerToggle(customer.id)}
                              className="rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{customer.name}</p>
                              <p className="text-xs text-muted-foreground">{customer.id}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {formData.applicableCustomerIds.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          {formData.applicableCustomerIds.length} cliente(s) seleccionado(s)
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData(prev => ({ ...prev, applicableCustomerIds: [] }))}
                          className="mt-2"
                        >
                          Limpiar selección
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="lg:sticky lg:top-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vista Previa del Timeline</CardTitle>
                  <CardDescription>
                    Visualización de los hitos configurados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkflowTimeline
                    steps={formData.steps}
                    orientation="vertical"
                    showDetails
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-white dark:bg-slate-900">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <div className="flex items-center gap-2">
          {Object.keys(errors).length > 0 && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Hay errores en el formulario
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? 'Guardar Cambios' : 'Crear Workflow'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
