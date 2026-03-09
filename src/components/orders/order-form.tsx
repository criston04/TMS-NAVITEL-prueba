'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Plus,
  Trash2,
  MapPin,
  Package,
  Calendar,
  User,
  Truck,
  Info,
  Loader2,
  CheckCircle,
  AlertCircle,
  Workflow,
  GripVertical,
} from 'lucide-react';
import type { 
  CreateOrderDTO, 
  OrderPriority, 
  CargoType,
  ServiceType,
} from '@/types/order';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
// Separator no se usa actualmente
import { cn } from '@/lib/utils';

// Mocks para opciones
import { customersMock } from '@/mocks/master/customers.mock';
import { geofencesMock } from '@/mocks/master/geofences.mock';
import { vehiclesMock } from '@/mocks/master/vehicles.mock';
import { driversMock } from '@/mocks/master/drivers.mock';

interface OrderFormProps {
  /** Datos iniciales para edición */
  initialData?: Partial<CreateOrderDTO>;
  /** Callback al enviar el formulario */
  onSubmit: (data: CreateOrderDTO) => Promise<void>;
  /** Callback al cancelar */
  onCancel: () => void;
  /** Indica si está procesando */
  isSubmitting?: boolean;
}

interface MilestoneFormData {
  id: string;
  geofenceId: string;
  geofenceName: string;
  type: 'origin' | 'waypoint' | 'destination';
  sequence: number;
  address: string;
  coordinates: { lat: number; lng: number };
  estimatedArrival: string;
  estimatedDeparture?: string;
  notes?: string;
}

interface WorkflowAssignmentInfo {
  workflowId: string | null;
  workflowName: string | null;
  reason: string;
  isAutoAssigned: boolean;
}

const PRIORITIES: { value: OrderPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: 'bg-slate-500' },
  { value: 'normal', label: 'Normal', color: 'bg-[#34b7ff]' },
  { value: 'high', label: 'Alta', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-500' },
];

const CARGO_TYPES: { value: CargoType; label: string }[] = [
  { value: 'general', label: 'Carga General' },
  { value: 'refrigerated', label: 'Refrigerada' },
  { value: 'hazardous', label: 'Peligrosa' },
  { value: 'fragile', label: 'Frágil' },
  { value: 'oversized', label: 'Sobredimensionada' },
  { value: 'liquid', label: 'Líquidos' },
  { value: 'bulk', label: 'Granel' },
];

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'distribucion', label: 'Distribución' },
  { value: 'importacion', label: 'Importación' },
  { value: 'exportacion', label: 'Exportación' },
  { value: 'transporte_minero', label: 'Transporte Minero' },
  { value: 'transporte_residuos', label: 'Transporte de Residuos' },
  { value: 'interprovincial', label: 'Interprovincial' },
  { value: 'mudanza', label: 'Mudanza' },
  { value: 'courier', label: 'Courier / Paquetería' },
  { value: 'otro', label: 'Otro' },
];

// COMPONENTE PRINCIPAL

export function OrderForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: OrderFormProps) {
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [carrierId, _setCarrierId] = useState(initialData?.carrierId || '');
  const [vehicleId, setVehicleId] = useState(initialData?.vehicleId || '');
  const [driverId, setDriverId] = useState(initialData?.driverId || '');
  const [priority, setPriority] = useState<OrderPriority>(initialData?.priority || 'normal');
  const [serviceType, setServiceType] = useState<ServiceType>(initialData?.serviceType || 'distribucion');
  
  const [cargoDescription, setCargoDescription] = useState(initialData?.cargo?.description || '');
  const [cargoType, setCargoType] = useState<CargoType>(initialData?.cargo?.type || 'general');
  const [cargoWeight, setCargoWeight] = useState(initialData?.cargo?.weightKg?.toString() || '');
  const [cargoVolume, setCargoVolume] = useState(initialData?.cargo?.volumeM3?.toString() || '');
  const [cargoQuantity, setCargoQuantity] = useState(initialData?.cargo?.quantity?.toString() || '1');
  const [cargoDeclaredValue, setCargoDeclaredValue] = useState(initialData?.cargo?.declaredValue?.toString() || '');
  
  const [scheduledStartDate, setScheduledStartDate] = useState(
    initialData?.scheduledStartDate?.split('T')[0] || ''
  );
  const [scheduledStartTime, setScheduledStartTime] = useState(
    initialData?.scheduledStartDate?.split('T')[1]?.substring(0, 5) || '08:00'
  );
  const [scheduledEndDate, setScheduledEndDate] = useState(
    initialData?.scheduledEndDate?.split('T')[0] || ''
  );
  const [scheduledEndTime, setScheduledEndTime] = useState(
    initialData?.scheduledEndDate?.split('T')[1]?.substring(0, 5) || '18:00'
  );
  
  const [milestones, setMilestones] = useState<MilestoneFormData[]>(() => {
    if (initialData?.milestones?.length) {
      return initialData.milestones.map((m, i) => ({
        id: `milestone-${i}`,
        geofenceId: m.geofenceId,
        geofenceName: m.geofenceName,
        type: m.type,
        sequence: m.sequence,
        address: m.address,
        coordinates: m.coordinates,
        estimatedArrival: m.estimatedArrival,
        estimatedDeparture: m.estimatedDeparture,
        notes: m.notes,
      }));
    }
    return [];
  });
  
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [externalReference, setExternalReference] = useState(initialData?.externalReference || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  
  const [workflowInfo, setWorkflowInfo] = useState<WorkflowAssignmentInfo | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Obtener cliente seleccionado
  const selectedCustomer = useMemo(() => {
    return customersMock.find(c => c.id === customerId);
  }, [customerId]);

  // Auto-asignar workflow cuando cambia el cliente o tipo de carga
  useEffect(() => {
    if (customerId && cargoType) {
      // Simulamos la auto-asignación de workflow
      const assignWorkflow = async () => {
        // En producción esto llamaría al moduleConnectorService
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Lógica simplificada de asignación
        let workflowId: string | null = null;
        let workflowName: string | null = null;
        let reason = '';

        if (cargoType === 'refrigerated') {
          workflowId = 'wf-refrigerated';
          workflowName = 'Cadena de Frío';
          reason = 'Asignado por tipo de carga: Refrigerada';
        } else if (cargoType === 'hazardous') {
          workflowId = 'wf-hazmat';
          workflowName = 'Materiales Peligrosos';
          reason = 'Asignado por tipo de carga: Peligrosa';
        } else if (selectedCustomer?.name.includes('Minera')) {
          workflowId = 'wf-mining';
          workflowName = 'Logística Minera';
          reason = `Asignado por cliente: ${selectedCustomer.name}`;
        } else {
          workflowId = 'wf-standard';
          workflowName = 'Transporte Estándar';
          reason = 'Workflow por defecto';
        }

        setWorkflowInfo({
          workflowId,
          workflowName,
          reason,
          isAutoAssigned: true,
        });
      };

      assignWorkflow();
    }
  }, [customerId, cargoType, selectedCustomer]);

  // Agregar hito
  const handleAddMilestone = useCallback(() => {
    const newMilestone: MilestoneFormData = {
      id: `milestone-${Date.now()}`,
      geofenceId: '',
      geofenceName: '',
      type: milestones.length === 0 ? 'origin' : 'waypoint',
      sequence: milestones.length + 1,
      address: '',
      coordinates: { lat: 0, lng: 0 },
      estimatedArrival: '',
      notes: '',
    };
    setMilestones(prev => [...prev, newMilestone]);
  }, [milestones.length]);

  // Eliminar hito
  const handleRemoveMilestone = useCallback((id: string) => {
    setMilestones(prev => {
      const filtered = prev.filter(m => m.id !== id);
      // Reordenar secuencias y tipos
      return filtered.map((m, i) => ({
        ...m,
        sequence: i + 1,
        type: i === 0 ? 'origin' : i === filtered.length - 1 ? 'destination' : 'waypoint',
      }));
    });
  }, []);

  // Actualizar hito
  const handleUpdateMilestone = useCallback((id: string, field: string, value: string) => {
    setMilestones(prev => prev.map(m => {
      if (m.id !== id) return m;
      
      if (field === 'geofenceId') {
        const geofence = geofencesMock.find(g => g.id === value);
        if (geofence) {
          const coords = geofence.geometry.type === 'circle' 
            ? geofence.geometry.center 
            : 'coordinates' in geofence.geometry 
              ? geofence.geometry.coordinates[0]
              : { lat: 0, lng: 0 };
          return {
            ...m,
            geofenceId: value,
            geofenceName: geofence.name,
            address: geofence.address || '',
            coordinates: coords,
          };
        }
      }
      
      return { ...m, [field]: value };
    }));
  }, []);

  // Agregar tag
  const handleAddTag = useCallback(() => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  // Eliminar tag
  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Validar formulario
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerId) newErrors.customerId = 'Selecciona un cliente';
    if (!cargoDescription) newErrors.cargoDescription = 'Describe la carga';
    if (!cargoWeight || parseFloat(cargoWeight) <= 0) newErrors.cargoWeight = 'Ingresa un peso válido';
    if (!scheduledStartDate) newErrors.scheduledStartDate = 'Selecciona fecha de inicio';
    if (!scheduledEndDate) newErrors.scheduledEndDate = 'Selecciona fecha de fin';
    if (milestones.length < 2) newErrors.milestones = 'Agrega al menos origen y destino';
    if (milestones.some(m => !m.geofenceId)) newErrors.milestones = 'Completa todos los hitos';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerId, cargoDescription, cargoWeight, scheduledStartDate, scheduledEndDate, milestones]);

  // Enviar formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Construir DTO
    const startDateTime = `${scheduledStartDate}T${scheduledStartTime}:00.000Z`;
    const endDateTime = `${scheduledEndDate}T${scheduledEndTime}:00.000Z`;

    // Actualizar tipos de hitos correctamente
    const processedMilestones = milestones.map((m, i, arr) => ({
      ...m,
      type: (i === 0 ? 'origin' : i === arr.length - 1 ? 'destination' : 'waypoint') as 'origin' | 'waypoint' | 'destination',
    }));

    const data: CreateOrderDTO = {
      customerId,
      carrierId: carrierId || undefined,
      vehicleId: vehicleId || undefined,
      driverId: driverId || undefined,
      workflowId: workflowInfo?.workflowId || undefined,
      priority,
      serviceType,
      cargo: {
        description: cargoDescription,
        type: cargoType,
        weightKg: parseFloat(cargoWeight),
        volumeM3: cargoVolume ? parseFloat(cargoVolume) : undefined,
        quantity: parseInt(cargoQuantity, 10),
        declaredValue: cargoDeclaredValue ? parseFloat(cargoDeclaredValue) : undefined,
      },
      milestones: processedMilestones.map(m => ({
        geofenceId: m.geofenceId,
        geofenceName: m.geofenceName,
        type: m.type,
        sequence: m.sequence,
        address: m.address,
        coordinates: m.coordinates,
        estimatedArrival: m.estimatedArrival || startDateTime,
        estimatedDeparture: m.estimatedDeparture,
        notes: m.notes,
      })),
      scheduledStartDate: startDateTime,
      scheduledEndDate: endDateTime,
      externalReference: externalReference || undefined,
      notes: notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    await onSubmit(data);
  }, [
    validateForm, customerId, carrierId, vehicleId, driverId, priority,
    cargoDescription, cargoType, cargoWeight, cargoVolume, cargoQuantity, cargoDeclaredValue,
    milestones, scheduledStartDate, scheduledStartTime, scheduledEndDate, scheduledEndTime,
    externalReference, notes, tags, workflowInfo, onSubmit
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Workflow Auto-asignado */}
      {workflowInfo && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Workflow className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Workflow:</span>
                  <Badge variant="secondary">{workflowInfo.workflowName}</Badge>
                  {workflowInfo.isAutoAssigned && (
                    <Badge variant="outline" className="text-xs">Auto-asignado</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {workflowInfo.reason}
                </p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección: Cliente y Prioridad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Cliente y Prioridad
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer">Cliente *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="customer" className={errors.customerId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                {customersMock.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    <span className="font-medium">{customer.name}</span>
                    <span className="text-muted-foreground ml-2">({customer.tradeName})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.customerId && (
              <p className="text-sm text-red-500">{errors.customerId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as OrderPriority)}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', p.color)} />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="externalRef">Referencia Externa</Label>
            <Input
              id="externalRef"
              placeholder="Ej: PO-2025-001234"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Tipo de Servicio</Label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
              <SelectTrigger id="serviceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map(st => (
                  <SelectItem key={st.value} value={st.value}>
                    {st.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sección: Información de Carga */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Información de Carga
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="cargoDescription">Descripción *</Label>
            <Textarea
              id="cargoDescription"
              placeholder="Describe el contenido de la carga..."
              value={cargoDescription}
              onChange={(e) => setCargoDescription(e.target.value)}
              className={errors.cargoDescription ? 'border-red-500' : ''}
            />
            {errors.cargoDescription && (
              <p className="text-sm text-red-500">{errors.cargoDescription}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoType">Tipo de Carga</Label>
            <Select value={cargoType} onValueChange={(v) => setCargoType(v as CargoType)}>
              <SelectTrigger id="cargoType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARGO_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoWeight">Peso (kg) *</Label>
            <Input
              id="cargoWeight"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cargoWeight}
              onChange={(e) => setCargoWeight(e.target.value)}
              className={errors.cargoWeight ? 'border-red-500' : ''}
            />
            {errors.cargoWeight && (
              <p className="text-sm text-red-500">{errors.cargoWeight}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoVolume">Volumen (m³)</Label>
            <Input
              id="cargoVolume"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cargoVolume}
              onChange={(e) => setCargoVolume(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoQuantity">Cantidad/Bultos</Label>
            <Input
              id="cargoQuantity"
              type="number"
              min="1"
              placeholder="1"
              value={cargoQuantity}
              onChange={(e) => setCargoQuantity(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cargoDeclaredValue">Valor Declarado (USD)</Label>
            <Input
              id="cargoDeclaredValue"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={cargoDeclaredValue}
              onChange={(e) => setCargoDeclaredValue(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sección: Fechas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Programación
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Fecha de Inicio *</Label>
            <div className="flex gap-2">
              <Input
                id="startDate"
                type="date"
                value={scheduledStartDate}
                onChange={(e) => setScheduledStartDate(e.target.value)}
                className={cn('flex-1', errors.scheduledStartDate ? 'border-red-500' : '')}
              />
              <Input
                type="time"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-28"
              />
            </div>
            {errors.scheduledStartDate && (
              <p className="text-sm text-red-500">{errors.scheduledStartDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Fecha de Fin *</Label>
            <div className="flex gap-2">
              <Input
                id="endDate"
                type="date"
                value={scheduledEndDate}
                onChange={(e) => setScheduledEndDate(e.target.value)}
                className={cn('flex-1', errors.scheduledEndDate ? 'border-red-500' : '')}
              />
              <Input
                type="time"
                value={scheduledEndTime}
                onChange={(e) => setScheduledEndTime(e.target.value)}
                className="w-28"
              />
            </div>
            {errors.scheduledEndDate && (
              <p className="text-sm text-red-500">{errors.scheduledEndDate}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sección: Hitos/Ruta */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ruta (Hitos)
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddMilestone}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar Hito
            </Button>
          </div>
          <CardDescription>
            Define los puntos de la ruta: origen, paradas intermedias y destino final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.milestones && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.milestones}
            </div>
          )}

          {milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No hay hitos definidos</p>
              <p className="text-sm">Agrega al menos un origen y un destino</p>
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                    <Badge
                      variant={
                        milestone.type === 'origin' ? 'default' :
                        milestone.type === 'destination' ? 'secondary' : 'outline'
                      }
                    >
                      {index + 1}
                    </Badge>
                  </div>

                  <div className="flex-1 grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Ubicación</Label>
                      <Select
                        value={milestone.geofenceId}
                        onValueChange={(v) => handleUpdateMilestone(milestone.id, 'geofenceId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona ubicación" />
                        </SelectTrigger>
                        <SelectContent>
                          {geofencesMock.map(geo => (
                            <SelectItem key={geo.id} value={geo.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: geo.color }}
                                />
                                {geo.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Llegada Estimada</Label>
                      <Input
                        type="datetime-local"
                        value={milestone.estimatedArrival?.split('.')[0] || ''}
                        onChange={(e) => handleUpdateMilestone(milestone.id, 'estimatedArrival', e.target.value)}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Notas</Label>
                      <Input
                        placeholder="Instrucciones..."
                        value={milestone.notes || ''}
                        onChange={(e) => handleUpdateMilestone(milestone.id, 'notes', e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMilestone(milestone.id)}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección: Asignación Opcional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Asignación (Opcional)
          </CardTitle>
          <CardDescription>
            Puedes asignar vehículo y conductor ahora o hacerlo después desde Programación.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehículo</Label>
            <Select value={vehicleId || 'none'} onValueChange={(v) => setVehicleId(v === 'none' ? '' : v)}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {vehiclesMock.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <span className="font-medium">{vehicle.plate}</span>
                    <span className="text-muted-foreground ml-2">
                      {vehicle.specs?.brand} {vehicle.specs?.model}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Conductor</Label>
            <Select value={driverId || 'none'} onValueChange={(v) => setDriverId(v === 'none' ? '' : v)}>
              <SelectTrigger id="driver">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {driversMock.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.fullName || `${driver.firstName} ${driver.lastName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sección: Notas y Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Información Adicional
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Instrucciones especiales, observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Crear Orden
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
