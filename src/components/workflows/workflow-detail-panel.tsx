'use client';

import { memo, useState, useCallback, useRef, useMemo } from 'react';
import {
  GitBranch,
  Edit2,
  Copy,
  Trash2,
  Play,
  Pause,
  X,
  MapPin,
  Clock,
  Users,
  AlertCircle,
  GripVertical,
  Plus,
  Settings,
  ChevronLeft,
  MoreVertical,
  FileText,
  Camera,
  Thermometer,
  Scale,
  CheckCircle2,
  Settings2,
  Signature,
  BarChart3,
  TrendingUp,
  Activity,
  Bell,
  ShieldAlert,
  Timer,
  Zap,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import type { Workflow, WorkflowStep, CreateWorkflowDTO } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface WorkflowDetailPanelProps {
  workflow: Workflow | null;
  isEditing: boolean;
  isSaving?: boolean;
  availableGeofences?: Array<{ id: string; name: string; type: string; color: string }>;
  availableCustomers?: Array<{ id: string; name: string }>;
  onEdit: () => void;
  onSave: (data: CreateWorkflowDTO) => Promise<void>;
  onCancel: () => void;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onToggleStatus: (workflow: Workflow) => void;
  className?: string; // Para layout flexible
}

// STEP CARD

interface StepCardProps {
  step: WorkflowStep;
  index: number;
  isEditing: boolean;
  geofences?: Array<{ id: string; name: string; type: string; color: string }>;
  onChange?: (step: WorkflowStep) => void;
  onRemove?: () => void;
}

const ACTION_ICONS: Record<string, typeof MapPin> = {
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

const ACTION_LABELS: Record<string, string> = {
  enter_geofence: 'Entrar a geocerca',
  exit_geofence: 'Salir de geocerca',
  manual_check: 'Verificación manual',
  document_upload: 'Subir documento',
  signature: 'Capturar firma',
  photo_capture: 'Tomar foto',
  temperature_check: 'Control de temperatura',
  weight_check: 'Control de peso',
  custom: 'Acción personalizada',
};

const StepCard = memo(function StepCard({
  step,
  index,
  isEditing,
  geofences,
  onChange,
  onRemove,
}: StepCardProps) {
  const IconComponent = ACTION_ICONS[step.action] || GitBranch;
  
  return (
    <div className="relative pl-6 pb-6 last:pb-0 group">
      {/* Timeline Line */}
      <div className="absolute left-2.75 top-8 bottom-0 w-px bg-border group-last:hidden" />
      
      {/* Step Node */}
      <div 
        className={cn(
          "absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background z-10 transition-colors",
          isEditing ? "border-primary text-primary" : "border-muted-foreground/30 text-muted-foreground"
        )}
      >
        <span className="text-[10px] font-bold">{index + 1}</span>
      </div>

      <div className={cn(
        "ml-4 rounded-xl border transition-all duration-200 overflow-hidden",
        isEditing 
          ? "bg-card shadow-sm hover:shadow-md border-primary/20" 
          : "bg-card/50 hover:bg-card border-transparent hover:border-border"
      )}>
        {/* Step Header */}
        <div className="p-3 flex items-start gap-3 bg-muted/10 border-b border-border/50">
          <div className="p-2 bg-background rounded-md border shadow-sm shrink-0">
            <IconComponent className="w-4 h-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            {isEditing ? (
              <Input
                value={step.name}
                onChange={(e) => onChange?.({ ...step, name: e.target.value })}
                className="h-7 text-sm font-medium bg-transparent border-transparent hover:border-border focus:border-primary px-1 -ml-1"
                placeholder="Nombre del paso"
              />
            ) : (
              <h4 className="font-medium text-sm truncate pr-2">{step.name}</h4>
            )}
            
            {isEditing ? (
              <Input
                value={step.description || ''}
                onChange={(e) => onChange?.({ ...step, description: e.target.value })}
                className="h-6 text-xs text-muted-foreground bg-transparent border-transparent hover:border-border focus:border-primary px-1 -ml-1 mt-1"
                placeholder="Añade una descripción..."
              />
            ) : step.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            )}
          </div>

          {isEditing && (
             <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={onRemove}
                >
                  <X className="h-3 w-3" />
                </Button>
                <div className="cursor-grab p-1 text-muted-foreground hover:text-foreground">
                   <GripVertical className="h-4 w-4" />
                </div>
             </div>
          )}
        </div>

        {/* Step Body (Config) */}
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Acción</label>
                {isEditing ? (
                  <Select
                    value={step.action}
                    onValueChange={(v) => onChange?.({ ...step, action: v as WorkflowStep['action'] })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([value, label]) => {
                        const Icon = ACTION_ICONS[value] || GitBranch;
                        return (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-xs font-medium py-1">
                    {ACTION_LABELS[step.action] || step.action}
                  </div>
                )}
             </div>

             <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Duración Est.</label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={step.estimatedDurationMinutes || ''}
                      onChange={(e) => onChange?.({ ...step, estimatedDurationMinutes: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">min</span>
                  </div>
                ) : (
                  <div className="text-xs font-medium py-1 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    {step.estimatedDurationMinutes || 0} min
                  </div>
                )}
             </div>
          </div>

          {/* Conditional Config based on action */}
          {(step.action === 'enter_geofence' || step.action === 'exit_geofence') && (
            <div className="pt-2 border-t border-border/50">
               <label className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block mb-1">Geocerca Requerida</label>
               {isEditing ? (
                 <Select
                   value={step.actionConfig?.geofenceId || ''}
                   onValueChange={(v) => {
                     const geo = geofences?.find(g => g.id === v);
                     onChange?.({
                       ...step,
                       actionConfig: {
                         ...step.actionConfig,
                         geofenceId: v,
                         geofenceName: geo?.name,
                       },
                     });
                   }}
                 >
                   <SelectTrigger className="h-8 text-xs w-full">
                     <SelectValue placeholder="Seleccionar geocerca" />
                   </SelectTrigger>
                   <SelectContent>
                     {geofences?.map((geo) => (
                       <SelectItem key={geo.id} value={geo.id}>
                         <div className="flex items-center gap-2">
                           <div 
                             className="w-2 h-2 rounded-full"
                             style={{ backgroundColor: geo.color }}
                           />
                           {geo.name}
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               ) : (
                 <div className="flex items-center gap-2 text-xs py-1">
                    {step.actionConfig?.geofenceName ? (
                      <Badge variant="secondary" className="font-normal">
                         <MapPin className="w-3 h-3 mr-1" />
                         {step.actionConfig.geofenceName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground italic">No asignada</span>
                    )}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// COMPONENTE PRINCIPAL

export const WorkflowDetailPanel = memo(function WorkflowDetailPanel({
  workflow,
  isEditing,
  isSaving = false,
  availableGeofences = [],
  availableCustomers: _availableCustomers = [],
  onEdit,
  onSave,
  onCancel, // Usado como "Back" cuando no se está editando, o "Cancelar edición"
  onDuplicate,
  onDelete,
  onToggleStatus,
  className,
}: Readonly<WorkflowDetailPanelProps>) {
  
  const [editData, setEditData] = useState<Partial<CreateWorkflowDTO>>(() => {
    if (workflow) {
      return {
        name: workflow.name,
        description: workflow.description,
        code: workflow.code,
        steps: workflow.steps,
        isDefault: workflow.isDefault,
        applicableCargoTypes: workflow.applicableCargoTypes,
        applicableCustomerIds: workflow.applicableCustomerIds,
      };
    }
    return {
      steps: [],
      name: '',
      code: '',
      isDefault: false
    };
  });
  const [activeTab, setActiveTab] = useState<'design' | 'settings' | 'analytics'>('design');

  // Sincronizar editData cuando cambia workflow usando el patrón recomendado
  // de "storing previous props" para detectar cambios y resetear estado
  const prevWorkflowIdRef = useRef(workflow?.id);
  if (workflow?.id !== prevWorkflowIdRef.current) {
    prevWorkflowIdRef.current = workflow?.id;
    // Reset editData cuando el workflow cambia (durante render, no en effect)
    const newData = workflow ? {
      name: workflow.name,
      description: workflow.description,
      code: workflow.code,
      steps: workflow.steps,
      isDefault: workflow.isDefault,
      applicableCargoTypes: workflow.applicableCargoTypes,
      applicableCustomerIds: workflow.applicableCustomerIds,
    } : {
      steps: [],
      name: '',
      code: '',
      isDefault: false
    };
    setEditData(newData);
  }

  const handleSave = () => {
    if (!editData.name || !editData.code) return; // Simple validation
    onSave(editData as CreateWorkflowDTO);
  };

  const addStep = useCallback(() => {
    const newStep: WorkflowStep = {
      id: `step-new-${Date.now()}`,
      name: 'Nuevo paso',
      description: '',
      sequence: (editData.steps?.length || 0) + 1,
      action: 'manual_check',
      isRequired: true,
      canSkip: false,
      actionConfig: {},
      estimatedDurationMinutes: 30,
      transitionConditions: [],
      notifications: [],
      color: '#3b82f6',
      icon: 'GitBranch',
    };
    setEditData(prev => ({
       ...prev,
       steps: [...(prev.steps || []), newStep]
    }));
  }, [editData.steps]);

  const updateStep = useCallback((index: number, updated: WorkflowStep) => {
    setEditData(prev => {
      const newSteps = [...(prev.steps || [])];
      newSteps[index] = updated;
      return { ...prev, steps: newSteps };
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setEditData(prev => ({
      ...prev,
      steps: prev.steps?.filter((_, i) => i !== index) || [],
    }));
  }, []);

  // Empty State eliminado porque ahora siempre mostramos el editor/visualizador completo

  const displayData = isEditing ? editData : workflow;
  // Fallback seguro
  if (!displayData) return null;

  return (
    <div className={cn("flex flex-col h-full bg-background animate-in fade-in duration-300", className)}>
      {/* Header Toolbar */}
      <div className="h-16 border-b flex items-center justify-between px-6 bg-card sticky top-0 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel}
            className="mr-2 -ml-2 text-muted-foreground hover:text-foreground"
            title="Volver a la lista"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <div className="p-2 rounded-lg bg-primary/10 text-primary hidden sm:block">
             <GitBranch className="w-5 h-5" />
          </div>
          <div className="min-w-0">
             {isEditing ? (
               <Input 
                  value={editData.name || ''} 
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="h-8 font-semibold text-lg border-transparent hover:border-border px-1 -ml-1 bg-transparent w-full md:w-64 focus-visible:ring-0"
                  placeholder="Nombre del workflow"
               />
             ) : (
               <h1 className="text-lg font-semibold truncate">{workflow?.name}</h1>
             )}
             <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                {isEditing ? (
                  <Input 
                    value={editData.code || ''}
                    onChange={e => setEditData({...editData, code: e.target.value.toUpperCase()})}
                    className="h-5 w-32 font-mono text-xs border-transparent hover:border-border px-1 -ml-1 bg-transparent uppercase"
                    placeholder="CODE_123"
                  />
                ) : (
                  <span className="font-mono">{workflow?.code}</span>
                )}
                {!isEditing && workflow?.isDefault && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">Default</Badge>
                )}
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {isEditing ? (
             <>
               <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
               <Button onClick={handleSave} disabled={isSaving}>
                 {isSaving ? 'Guardando...' : 'Guardar Cambios'}
               </Button>
             </>
           ) : (
             <>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => workflow && onDuplicate(workflow)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => workflow && onToggleStatus(workflow)}>
                      {workflow?.status === 'active' ? (
                        <>
                          <Pause className="w-4 h-4 mr-2" /> Desactivar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" /> Activar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={() => workflow && onDelete(workflow)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             </>
           )}
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'design' | 'settings' | 'analytics')} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6 bg-muted/10">
           <TabsList className="bg-transparent h-10 p-0 transform translate-y-px">
              <TabsTrigger 
                value="design" 
                className="rounded-t-lg rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-none px-4 h-10"
              >
                Diseño del Flujo
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="rounded-t-lg rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-none px-4 h-10"
              >
                Configuración
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="rounded-t-lg rounded-b-none border border-transparent data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-none px-4 h-10 gap-1.5"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Estadísticas
              </TabsTrigger>
           </TabsList>
        </div>

        <TabsContent value="design" className="flex-1 min-h-0 m-0 p-0 relative">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto p-8">
               <div className="flex items-center justify-between mb-8">
                 <div>
                   <h3 className="text-lg font-medium">Secuencia de Pasos</h3>
                   <p className="text-sm text-muted-foreground">Define el orden y las acciones que deben completarse.</p>
                 </div>
                 {isEditing && (
                   <Button size="sm" variant="secondary" onClick={addStep}>
                     <Plus className="w-4 h-4 mr-2" />
                     Agregar Paso
                   </Button>
                 )}
               </div>

               <div className="space-y-1 pb-10">
                 {/* Start Node */}
                 <div className="flex items-center gap-4 mb-4 opacity-50 text-sm">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center ml-px">
                       <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span>Inicio del Workflow</span>
                 </div>

                 {/* Steps */}
                 {(isEditing ? editData.steps : displayData.steps)?.map((step, idx) => (
                    <StepCard 
                      key={(step as WorkflowStep).id || `step-${idx}`}
                      step={step as WorkflowStep}
                      index={idx}
                      isEditing={isEditing}
                      geofences={availableGeofences}
                      onChange={(updated) => updateStep(idx, updated)}
                      onRemove={() => removeStep(idx)}
                    />
                 ))}

                 {(!displayData.steps || displayData.steps.length === 0) && (
                    <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground ml-8">
                       <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                       <p>No hay pasos definidos</p>
                    </div>
                 )}

                 {/* End Node */}
                 <div className="flex items-center gap-4 mt-8 opacity-50 text-sm">
                    <div className="w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center ml-px">
                       <div className="w-2 h-2 rounded-full bg-red-500" />
                    </div>
                    <span>Fin del Workflow</span>
                 </div>
               </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 min-h-0 m-0 p-0 overflow-auto">
          <ScrollArea className="h-full">
          <div className="max-w-2xl mx-auto p-8 space-y-8">
             {/* Descripción */}
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">Descripción y Metadatos</h3>
                </div>
                <div className="space-y-2">
                   <Label>Descripción</Label>
                   {isEditing ? (
                     <Textarea 
                       value={editData.description || ''}
                       onChange={e => setEditData({...editData, description: e.target.value})}
                       rows={4}
                       placeholder="Describe el propósito de este workflow..."
                     />
                   ) : (
                     <p className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">{displayData.description || 'Sin descripción'}</p>
                   )}
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                   <div className="flex items-center gap-3">
                     <Zap className="h-5 w-5 text-blue-500" />
                     <div>
                       <p className="font-medium text-sm">Workflow por defecto</p>
                       <p className="text-xs text-muted-foreground">Se asignará automáticamente a nuevas órdenes sin workflow específico</p>
                     </div>
                   </div>
                   <Switch 
                      id="is-default" 
                      checked={isEditing ? editData.isDefault : workflow?.isDefault}
                      disabled={!isEditing}
                      onCheckedChange={(c) => setEditData({...editData, isDefault: c})}
                   />
                </div>
             </div>

             {/* Clientes aplicables */}
             <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">Clientes aplicables</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecciona los clientes a los que se puede asignar este workflow. Si no seleccionas ninguno, estará disponible para todos.
                </p>
                {_availableCustomers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {_availableCustomers.map(customer => {
                      const isSelected = isEditing
                        ? editData.applicableCustomerIds?.includes(customer.id)
                        : workflow?.applicableCustomerIds?.includes(customer.id);
                      return (
                        <label
                          key={customer.id}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150',
                            isSelected
                              ? 'bg-primary/5 border-primary/40 shadow-sm'
                              : 'hover:bg-muted/50 border-border',
                            !isEditing && 'pointer-events-none opacity-75'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            disabled={!isEditing}
                            onChange={() => {
                              if (!isEditing) return;
                              const current = editData.applicableCustomerIds || [];
                              const updated = current.includes(customer.id)
                                ? current.filter(id => id !== customer.id)
                                : [...current, customer.id];
                              setEditData({...editData, applicableCustomerIds: updated});
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{customer.id}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary">
                              Asignado
                            </Badge>
                          )}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    No hay clientes disponibles
                  </div>
                )}
                {isEditing && (editData.applicableCustomerIds?.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {editData.applicableCustomerIds?.length} cliente(s) seleccionado(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditData({...editData, applicableCustomerIds: []})}
                      className="text-xs h-7"
                    >
                      Limpiar selección
                    </Button>
                  </div>
                )}
             </div>

             {/* Tipos de carga aplicables */}
             <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">Tipos de carga aplicables</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Define para qué tipos de carga aplica este workflow.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['container', 'general', 'air_freight', 'express', 'parcels', 'packages', 'mining_supplies', 'perishable', 'hazmat'].map(cargoType => {
                    const isSelected = isEditing
                      ? editData.applicableCargoTypes?.includes(cargoType)
                      : workflow?.applicableCargoTypes?.includes(cargoType);
                    const labels: Record<string, string> = {
                      container: 'Contenedor',
                      general: 'Carga General',
                      air_freight: 'Aérea',
                      express: 'Express',
                      parcels: 'Paquetería',
                      packages: 'Encomiendas',
                      mining_supplies: 'Minería',
                      perishable: 'Perecibles',
                      hazmat: 'Peligrosa',
                    };
                    return (
                      <button
                        key={cargoType}
                        disabled={!isEditing}
                        onClick={() => {
                          if (!isEditing) return;
                          const current = editData.applicableCargoTypes || [];
                          const updated = current.includes(cargoType)
                            ? current.filter(ct => ct !== cargoType)
                            : [...current, cargoType];
                          setEditData({...editData, applicableCargoTypes: updated});
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-150',
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50',
                          !isEditing && 'opacity-75 cursor-default'
                        )}
                      >
                        {labels[cargoType] || cargoType}
                      </button>
                    );
                  })}
                </div>
             </div>

             {/* Reglas de escalamiento */}
             <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <h3 className="font-medium">Reglas de escalamiento</h3>
                  </div>
                  {isEditing && (
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                      <Plus className="h-3 w-3" />
                      Agregar regla
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Configura alertas automáticas cuando un paso excede su tiempo estimado.
                </p>

                {(workflow?.escalationRules?.length ?? 0) === 0 ? (
                  <div className="border-2 border-dashed rounded-xl p-6 text-center">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Sin reglas de escalamiento</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Las reglas se ejecutarán cuando un paso exceda su tiempo máximo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {workflow?.escalationRules?.map(rule => (
                      <div
                        key={rule.id}
                        className={cn(
                          'p-3 rounded-lg border flex items-center gap-3',
                          rule.isActive ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' : 'bg-muted/30'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                          rule.isActive ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-muted'
                        )}>
                          <Timer className={cn('w-4 h-4', rule.isActive ? 'text-amber-600' : 'text-muted-foreground')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{rule.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Umbral: {rule.condition.thresholdMinutes} min · {rule.actions.length} acción(es)
                          </p>
                        </div>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'} className="text-[10px]">
                          {rule.isActive ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             {/* Notificaciones */}
             <div className="space-y-4 pt-6 border-t">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="font-medium">Notificaciones del workflow</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Resumen de notificaciones configuradas en los pasos.
                </p>
                {(() => {
                  const allNotifications = (displayData.steps as WorkflowStep[])?.flatMap(s => 
                    s.notifications?.map(n => ({ ...n, stepName: s.name })) || []
                  ) || [];
                  if (allNotifications.length === 0) {
                    return (
                      <div className="border-2 border-dashed rounded-xl p-6 text-center">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Sin notificaciones configuradas</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          Agrega notificaciones desde la edición de cada paso
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {allNotifications.map((n, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-card flex items-center gap-3">
                          <Bell className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{n.type}: {n.trigger}</p>
                            <p className="text-xs text-muted-foreground">Paso: {n.stepName} · {n.recipients.length} destinatario(s)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
             </div>

             {/* Info de auditoría */}
             {workflow && (
               <div className="space-y-3 pt-6 border-t">
                  <h3 className="font-medium text-sm text-muted-foreground">Auditoría</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Creado por</p>
                      <p className="font-medium mt-0.5">{workflow.createdBy}</p>
                      <p className="text-xs text-muted-foreground">{new Date(workflow.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Modificado por</p>
                      <p className="font-medium mt-0.5">{workflow.updatedBy}</p>
                      <p className="text-xs text-muted-foreground">{new Date(workflow.updatedAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
               </div>
             )}
          </div>
          </ScrollArea>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="flex-1 min-h-0 m-0 p-0 overflow-auto">
          <ScrollArea className="h-full">
          <div className="max-w-3xl mx-auto p-8 space-y-6">

            {/* KPIs de ejecución */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(() => {
                // Stable KPI values derived from workflow data instead of Math.random()
                const stepsCount = workflow?.steps?.length ?? 0;
                const totalEstimated = workflow?.steps?.reduce((a, s) => a + (s.estimatedDurationMinutes || 0), 0) ?? 0;
                const totalExecutions = workflow ? 20 + ((stepsCount * 7 + totalEstimated) % 80) : 0;
                const successRate = workflow ? 85 + ((stepsCount * 3 + totalEstimated * 2) % 15) : 0;
                const avgTime = workflow ? `${(totalEstimated * 0.9).toFixed(0)} min` : '—';
                const escalations = workflow ? (stepsCount + totalEstimated) % 5 : 0;
                return [
                  { label: 'Ejecuciones totales', value: totalExecutions, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Tasa de éxito', value: `${successRate}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                  { label: 'Tiempo prom.', value: avgTime, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  { label: 'Escalamientos', value: escalations, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                ];
              })().map((kpi) => {
                const Icon = kpi.icon;
                return (
                  <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', kpi.bg)}>
                        <Icon className={cn('h-4 w-4', kpi.color)} />
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.value}</span>
                  </div>
                );
              })}
            </div>

            {/* Rendimiento por paso */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Rendimiento por paso
                </h3>
                <Badge variant="secondary" className="text-[10px]">Últimos 30 días</Badge>
              </div>
              <div className="p-4 space-y-3">
                {(displayData.steps as WorkflowStep[])?.map((step, idx) => {
                  const estimated = step.estimatedDurationMinutes || 30;
                  // Stable pseudo-random value derived from step index instead of Math.random()
                  const seed = ((idx + 1) * 17 + estimated * 3) % 100;
                  const factor = 0.7 + (seed / 100) * 0.6;
                  const actualAvg = Math.floor(estimated * factor);
                  const percentage = Math.min(Math.round((actualAvg / estimated) * 100), 150);
                  const isOvertime = percentage > 100;
                  return (
                    <div key={(step as WorkflowStep).id || idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: step.color || '#6b7280' }}
                          />
                          <span className="font-medium truncate">{step.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs shrink-0">
                          <span className="text-muted-foreground">Est: {estimated}m</span>
                          <span className={cn('font-medium', isOvertime ? 'text-red-500' : 'text-emerald-600')}>
                            Prom: {actualAvg}m
                          </span>
                          {isOvertime && <ArrowUpRight className="h-3 w-3 text-red-500" />}
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isOvertime ? 'bg-red-400' : 'bg-emerald-400'
                          )}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Últimas ejecuciones */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Últimas ejecuciones
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-slate-900">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Orden</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Vehículo</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Pasos</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Duración</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { order: 'ORD-2024-0156', vehicle: 'ABC-123', steps: '3/3', duration: '4h 25m', status: 'completed', date: '12/02/2026' },
                    { order: 'ORD-2024-0149', vehicle: 'XYZ-789', steps: '3/3', duration: '5h 10m', status: 'completed', date: '11/02/2026' },
                    { order: 'ORD-2024-0142', vehicle: 'DEF-456', steps: '2/3', duration: '3h 45m', status: 'in_progress', date: '10/02/2026' },
                    { order: 'ORD-2024-0138', vehicle: 'GHI-012', steps: '3/3', duration: '6h 20m', status: 'delayed', date: '09/02/2026' },
                    { order: 'ORD-2024-0130', vehicle: 'ABC-123', steps: '3/3', duration: '4h 05m', status: 'completed', date: '08/02/2026' },
                  ].map((exec) => (
                    <tr key={exec.order} className="border-b last:border-b-0 border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-primary">{exec.order}</td>
                      <td className="px-4 py-3 text-muted-foreground">{exec.vehicle}</td>
                      <td className="text-center px-4 py-3">{exec.steps}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{exec.duration}</td>
                      <td className="text-center px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px]',
                            exec.status === 'completed' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                            exec.status === 'in_progress' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            exec.status === 'delayed' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {exec.status === 'completed' ? 'Completado' : exec.status === 'in_progress' ? 'En curso' : 'Retrasado'}
                        </Badge>
                      </td>
                      <td className="text-right px-4 py-3 text-muted-foreground text-xs">{exec.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
});
