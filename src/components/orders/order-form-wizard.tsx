'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  User,
  Package,
  MapPin,
  Truck,
  Info,
  CheckCircle,
  AlertCircle,
  Workflow as WorkflowIcon,
  Calendar,
  Plus,
} from 'lucide-react';
import type {
  CreateOrderDTO, 
  OrderPriority, 
  CargoType,
  ServiceType,
} from '@/types/order';
import type { Workflow } from '@/types/workflow';
import type { Geofence } from '@/types/models/geofence';

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
import { cn } from '@/lib/utils';

// Custom Components
import { WizardNavigation, type WizardStep } from './wizard-navigation';
import { MilestoneEditor, type MilestoneFormData } from './milestone-editor';
import { CarrierSelector } from './carrier-selector';
import { ConflictWarning } from './conflict-warning';
import { OrderNumberField } from './order-number-field';
import { CustomerContactCard, type CustomerInfo, type OrderContactInfo } from './customer-contact-card';
import { GpsOperatorSelector } from './gps-operator-selector';
import { OrderSummary, type OrderSummaryData } from './order-summary';
import { WorkflowSelector } from './workflow-selector';
import { WorkflowStepsPreview } from './workflow-steps-preview';

// Mocks
import { customersMock } from '@/mocks/master/customers.mock';
import { geofencesMock } from '@/mocks/master/geofences.mock';
import { vehiclesMock } from '@/mocks/master/vehicles.mock';
import { driversMock } from '@/mocks/master/drivers.mock';
import { operatorsMock } from '@/mocks/master/operators.mock';

import { useResourceConflicts } from '@/hooks/orders/use-resource-conflicts';

// Services
import { moduleConnectorService } from '@/services/integration/module-connector.service';
import { unifiedWorkflowService } from '@/services/workflow.service';

const RoutePreviewMapLazy = dynamic(
  () => import('./route-preview-map').then(mod => mod.RoutePreviewMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[200px] sm:h-[300px] rounded-lg border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
        Cargando mapa...
      </div>
    ),
  }
);

interface OrderFormWizardProps {
  /** Datos iniciales para edición */
  initialData?: Partial<CreateOrderDTO>;
  /** Callback al enviar el formulario */
  onSubmit: (data: CreateOrderDTO) => Promise<void>;
  /** Callback al cancelar */
  onCancel: () => void;
  /** Indica si está procesando */
  isSubmitting?: boolean;
  /** Modo del formulario */
  mode?: 'create' | 'edit';
}

const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'customer',
    title: 'Datos Básicos',
    description: 'Cliente y carga',
    icon: <User className="w-4 h-4" />,
  },
  {
    id: 'workflow',
    title: 'Workflow y Ruta',
    description: 'Pasos y milestones',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: 'assignment',
    title: 'Asignación',
    description: 'Recursos y fechas',
    icon: <Truck className="w-4 h-4" />,
    isOptional: true,
  },
  {
    id: 'confirmation',
    title: 'Confirmación',
    description: 'Revisar y crear',
    icon: <CheckCircle className="w-4 h-4" />,
  },
];

const PRIORITIES: { value: OrderPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: 'bg-slate-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
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

function getGeofenceCoordinates(geofence: Geofence): { lat: number; lng: number } {
  switch (geofence.geometry.type) {
    case 'circle':
      return geofence.geometry.center;
    case 'corridor':
      return geofence.geometry.path[0];
    case 'polygon':
    default:
      return geofence.geometry.coordinates[0];
  }
}

// COMPONENTE PRINCIPAL

export function OrderFormWizard({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
}: OrderFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({});

  // Paso 1: Datos Básicos
  const [orderNumber, setOrderNumber] = useState('');
  const [autoGenerateNumber, setAutoGenerateNumber] = useState(true);
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [priority, setPriority] = useState<OrderPriority>(initialData?.priority || 'normal');
  const [serviceType, setServiceType] = useState<ServiceType>(initialData?.serviceType || 'distribucion');
  const [externalReference, setExternalReference] = useState(initialData?.externalReference || '');
  const [orderContact, setOrderContact] = useState<OrderContactInfo | null>(null);

  // Carga
  const [cargoDescription, setCargoDescription] = useState(initialData?.cargo?.description || '');
  const [cargoType, setCargoType] = useState<CargoType>(initialData?.cargo?.type || 'general');
  const [cargoWeight, setCargoWeight] = useState(initialData?.cargo?.weightKg?.toString() || '');
  const [cargoVolume, setCargoVolume] = useState(initialData?.cargo?.volumeM3?.toString() || '');
  const [cargoQuantity, setCargoQuantity] = useState(initialData?.cargo?.quantity?.toString() || '1');
  const [cargoDeclaredValue, setCargoDeclaredValue] = useState(initialData?.cargo?.declaredValue?.toString() || '');

  // Paso 2: Workflow y Ruta
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [workflowReason, setWorkflowReason] = useState('');
  const [suggestedWorkflowId, setSuggestedWorkflowId] = useState<string | null>(null);
  const [isWorkflowAutoAssigned, setIsWorkflowAutoAssigned] = useState(true);
  const [isManualWorkflowOverride, setIsManualWorkflowOverride] = useState(false);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [isAssigningWorkflow, setIsAssigningWorkflow] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneFormData[]>([]);

  // Paso 3: Asignación
  const [carrierId, setCarrierId] = useState(initialData?.carrierId || '');
  const [vehicleId, setVehicleId] = useState(initialData?.vehicleId || '');
  const [driverId, setDriverId] = useState(initialData?.driverId || '');
  const [gpsOperatorId, setGpsOperatorId] = useState('');
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

  // Paso 4: Adicional
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Tracking de cambios sin guardar
  const hasUnsavedChanges = useRef(false);
  const isSubmittingRef = useRef(false);

  // Detectar cambios
  useEffect(() => {
    hasUnsavedChanges.current = !!(customerId || cargoDescription || cargoWeight || milestones.length > 0);
  }, [customerId, cargoDescription, cargoWeight, milestones]);

  // Warning de navegación con beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current && !isSubmittingRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Verificar conflictos
  const { conflicts, isChecking: isCheckingConflicts } = useResourceConflicts({
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
    startDate: scheduledStartDate ? `${scheduledStartDate}T${scheduledStartTime}:00.000Z` : undefined,
    endDate: scheduledEndDate ? `${scheduledEndDate}T${scheduledEndTime}:00.000Z` : undefined,
  });

  // Obtener cliente seleccionado
  const selectedCustomer = useMemo((): CustomerInfo | null => {
    const customer = customersMock.find(c => c.id === customerId);
    if (!customer) return null;
    
    const defaultAddress = customer.addresses?.find(a => a.isDefault) || customer.addresses?.[0];
    
    return {
      id: customer.id,
      name: customer.name,
      tradeName: customer.tradeName,
      rfc: customer.documentNumber,
      address: defaultAddress
        ? `${defaultAddress.street}, ${defaultAddress.city}, ${defaultAddress.state}`
        : undefined,
      phone: customer.phone,
      email: customer.email,
      mainContact: customer.contacts?.[0] 
        ? {
            name: customer.contacts[0].name,
            position: customer.contacts[0].position,
            phone: customer.contacts[0].phone,
            email: customer.contacts[0].email,
          }
        : undefined,
    };
  }, [customerId]);

  useEffect(() => {
    setIsManualWorkflowOverride(false);
  }, [customerId]);

  useEffect(() => {
    let isActive = true;

    if (!customerId) {
      setWorkflows([]);
      return () => {
        isActive = false;
      };
    }

    const loadWorkflows = async () => {
      setIsLoadingWorkflows(true);
      try {
        const activeWorkflows = await unifiedWorkflowService.getAll({
          status: 'active',
          applicableCustomerId: customerId,
        });
        if (isActive) {
          setWorkflows(activeWorkflows);
        }
      } finally {
        if (isActive) {
          setIsLoadingWorkflows(false);
        }
      }
    };

    loadWorkflows();

    return () => {
      isActive = false;
    };
  }, [customerId]);

  // Auto-asignar workflow cuando cambia el cliente o tipo de carga
  useEffect(() => {
    let isActive = true;

    if (!customerId || !cargoType || isManualWorkflowOverride) {
      return () => {
        isActive = false;
      };
    }

    const assignWorkflow = async () => {
      setIsAssigningWorkflow(true);

      try {
        // Usar solo tipo de carga para la sugerencia (evita loop infinito)
        const assignment = await moduleConnectorService.autoAssignWorkflow({
          customerId,
          cargo: { type: cargoType, description: '', weightKg: 0, quantity: 1 },
        });

        if (!isActive) return;

        if (assignment.success && assignment.workflowId) {
          const workflow = await unifiedWorkflowService.getById(assignment.workflowId);
          if (!isActive) return;

          setSelectedWorkflow(workflow);
          setWorkflowReason(assignment.reason);
          setSuggestedWorkflowId(assignment.workflowId);
          setIsWorkflowAutoAssigned(true);

          if (assignment.generatedMilestones?.length) {
            const mapped = assignment.generatedMilestones.map((milestone, index) => {
              const geofence = geofencesMock.find(g => g.id === milestone.geofenceId);
              const coordinates = geofence
                ? getGeofenceCoordinates(geofence)
                : milestone.coordinates || { lat: 0, lng: 0 };

              return {
                id: milestone.id || `milestone-${index}`,
                geofenceId: milestone.geofenceId,
                geofenceName: milestone.geofenceName || geofence?.name || 'Sin nombre',
                type: milestone.type,
                sequence: milestone.sequence,
                address: milestone.address || geofence?.address || '',
                coordinates,
                estimatedArrival: milestone.estimatedArrival || new Date().toISOString(),
                estimatedDeparture: milestone.estimatedDeparture,
                notes: milestone.notes,
                isFromWorkflow: true,
              };
            });
            setMilestones(mapped);
          }
        } else {
          setSelectedWorkflow(null);
          setWorkflowReason(assignment.reason);
          setSuggestedWorkflowId(null);
        }
      } finally {
        if (isActive) {
          setIsAssigningWorkflow(false);
        }
      }
    };

    assignWorkflow();

    return () => {
      isActive = false;
    };
  }, [customerId, cargoType, isManualWorkflowOverride]);

  // Validar paso actual
  const validateCurrentStep = useCallback((): boolean => {
    const errors: string[] = [];

    switch (currentStep) {
      case 0: // Datos Básicos
        if (!customerId) errors.push('Selecciona un cliente');
        if (!cargoDescription) errors.push('Describe la carga');
        if (!cargoWeight || parseFloat(cargoWeight) <= 0) errors.push('Ingresa un peso válido');
        break;

      case 1: // Workflow y Ruta
        if (milestones.length < 2) errors.push('Agrega al menos origen y destino');
        if (milestones.some(m => !m.geofenceId)) errors.push('Completa todas las ubicaciones');
        break;

      case 2: // Asignación
        if (!scheduledStartDate) errors.push('Selecciona fecha de inicio');
        if (!scheduledEndDate) errors.push('Selecciona fecha de fin');
        if (scheduledStartDate && scheduledEndDate && scheduledStartDate > scheduledEndDate) {
          errors.push('La fecha de inicio debe ser anterior a la fecha de fin');
        }
        break;

      case 3: // Confirmación
        // No hay validación adicional
        break;
    }

    setStepErrors(prev => ({ ...prev, [currentStep]: errors }));
    return errors.length === 0;
  }, [currentStep, customerId, cargoDescription, cargoWeight, milestones, scheduledStartDate, scheduledEndDate]);

  // Verificar si el paso actual puede avanzar (validación en tiempo real)
  const canCurrentStepProceed = useMemo((): boolean => {
    switch (currentStep) {
      case 0: // Datos Básicos
        return !!customerId && !!cargoDescription && !!cargoWeight && parseFloat(cargoWeight) > 0;

      case 1: // Workflow y Ruta
        return milestones.length >= 2 && milestones.every(m => !!m.geofenceId);

      case 2: // Asignación
        if (!scheduledStartDate || !scheduledEndDate) return false;
        return scheduledStartDate <= scheduledEndDate;

      case 3: // Confirmación
        return true;

      default:
        return true;
    }
  }, [currentStep, customerId, cargoDescription, cargoWeight, milestones, scheduledStartDate, scheduledEndDate]);

  // Limpiar errores cuando los datos cambian y son válidos
  useEffect(() => {
    if (canCurrentStepProceed) {
      setStepErrors(prev => {
        // Solo actualizar si hay errores que limpiar
        if (prev[currentStep]?.length > 0) {
          return { ...prev, [currentStep]: [] };
        }
        return prev;
      });
    }
  }, [canCurrentStepProceed, currentStep]);

  // Cambiar paso
  const handleStepChange = useCallback((newStep: number) => {
    if (newStep > currentStep) {
      // Validar antes de avanzar
      if (!validateCurrentStep()) return;
    }
    setCurrentStep(newStep);
  }, [currentStep, validateCurrentStep]);

  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setWorkflowReason('Workflow seleccionado manualmente');
    setIsWorkflowAutoAssigned(false);
    setIsManualWorkflowOverride(true);

    const generatedMilestones = moduleConnectorService.generateMilestonesFromWorkflow(
      workflow,
      { customerId, cargo: { type: cargoType, description: cargoDescription || '', weightKg: parseFloat(cargoWeight) || 0, quantity: parseInt(cargoQuantity, 10) || 1 } }
    );

    if (generatedMilestones.length > 0) {
      const mapped = generatedMilestones.map((milestone, index) => {
        const geofence = geofencesMock.find(g => g.id === milestone.geofenceId);
        const coordinates = geofence
          ? getGeofenceCoordinates(geofence)
          : milestone.coordinates || { lat: 0, lng: 0 };

        return {
          id: milestone.id || `milestone-${index}`,
          geofenceId: milestone.geofenceId,
          geofenceName: milestone.geofenceName || geofence?.name || 'Sin nombre',
          type: milestone.type,
          sequence: milestone.sequence,
          address: milestone.address || geofence?.address || '',
          coordinates,
          estimatedArrival: milestone.estimatedArrival || new Date().toISOString(),
          estimatedDeparture: milestone.estimatedDeparture,
          notes: milestone.notes,
          isFromWorkflow: true,
        };
      });
      setMilestones(mapped);
    }
  }, [customerId, cargoType, cargoDescription, cargoWeight, cargoQuantity]);

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

  // Construir datos del resumen
  const summaryData = useMemo((): OrderSummaryData | null => {
    if (currentStep !== 3 || !selectedCustomer) return null;

    const vehicle = vehiclesMock.find(v => v.id === vehicleId);
    const driver = driversMock.find(d => d.id === driverId);

    return {
      customer: {
        id: selectedCustomer.id,
        name: selectedCustomer.name,
        tradeName: selectedCustomer.tradeName,
        contact: orderContact ? {
          name: orderContact.name,
          phone: orderContact.phone,
          email: orderContact.email,
        } : undefined,
      },
      priority,
      orderNumber: autoGenerateNumber ? undefined : orderNumber,
      externalReference: externalReference || undefined,
      workflow: selectedWorkflow ? {
        id: selectedWorkflow.id,
        name: selectedWorkflow.name,
        isAutoAssigned: isWorkflowAutoAssigned,
        stepsCount: selectedWorkflow.steps.length,
      } : undefined,
      cargo: {
        description: cargoDescription,
        type: cargoType,
        weightKg: parseFloat(cargoWeight) || 0,
        volumeM3: cargoVolume ? parseFloat(cargoVolume) : undefined,
        quantity: parseInt(cargoQuantity, 10) || 1,
        declaredValue: cargoDeclaredValue ? parseFloat(cargoDeclaredValue) : undefined,
      },
      scheduledStart: `${scheduledStartDate}T${scheduledStartTime}:00.000Z`,
      scheduledEnd: `${scheduledEndDate}T${scheduledEndTime}:00.000Z`,
      milestones: milestones.map(m => ({
        id: m.id,
        sequence: m.sequence,
        type: m.type,
        geofenceName: m.geofenceName,
        address: m.address,
        estimatedArrival: m.estimatedArrival,
      })),
      assignment: {
        vehicle: vehicle ? {
          id: vehicle.id,
          plate: vehicle.plate,
          type: vehicle.type,
        } : undefined,
        driver: driver ? {
          id: driver.id,
          name: driver.fullName || `${driver.firstName} ${driver.lastName}`,
        } : undefined,
      },
      notes: notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
      conflicts: conflicts
        .filter(c => c.type === 'vehicle' || c.type === 'driver')
        .map(c => ({
          type: c.type as 'vehicle' | 'driver',
          message: c.message,
        })),
    };
  }, [
    currentStep, selectedCustomer, orderContact, priority, orderNumber, autoGenerateNumber,
    externalReference, selectedWorkflow, isWorkflowAutoAssigned, cargoDescription, cargoType, cargoWeight, cargoVolume,
    cargoQuantity, cargoDeclaredValue, scheduledStartDate, scheduledStartTime, scheduledEndDate,
    scheduledEndTime, milestones, vehicleId, driverId, notes, tags, conflicts
  ]);

  // Enviar formulario
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) return;

    isSubmittingRef.current = true;

    const startDateTime = `${scheduledStartDate}T${scheduledStartTime}:00.000Z`;
    const endDateTime = `${scheduledEndDate}T${scheduledEndTime}:00.000Z`;

    const processedMilestones = milestones.map((m, i, arr) => ({
      ...m,
      type: (i === 0 ? 'origin' : i === arr.length - 1 ? 'destination' : 'waypoint') as 'origin' | 'waypoint' | 'destination',
    }));

    const data: CreateOrderDTO = {
      customerId,
      carrierId: carrierId || undefined,
      vehicleId: vehicleId || undefined,
      driverId: driverId || undefined,
      workflowId: selectedWorkflow?.id || undefined,
      priority,
      serviceType,
      // Número de orden manual (si no es automático)
      ...((!autoGenerateNumber && orderNumber) && { orderNumber }),
      // Referencia externa
      externalReference: externalReference || undefined,
      // Operador GPS
      ...(gpsOperatorId && { gpsOperatorId }),
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
      notes: notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
      // Contacto específico para la orden
      ...(orderContact && {
        orderContact: {
          name: orderContact.name,
          phone: orderContact.phone,
          email: orderContact.email,
          notes: orderContact.notes,
        },
      }),
    };

    await onSubmit(data);
  }, [
    validateCurrentStep, customerId, carrierId, vehicleId, driverId, priority, serviceType,
    cargoDescription, cargoType, cargoWeight, cargoVolume, cargoQuantity, cargoDeclaredValue,
    milestones, scheduledStartDate, scheduledStartTime, scheduledEndDate, scheduledEndTime,
    externalReference, notes, tags, selectedWorkflow, onSubmit, autoGenerateNumber, orderNumber,
    gpsOperatorId, orderContact
  ]);

  // Ir a sección desde resumen
  const handleEditSection = useCallback((section: string) => {
    const sectionStepMap: Record<string, number> = {
      customer: 0,
      cargo: 0,
      workflow: 1,
      route: 1,
      schedule: 2,
      assignment: 2,
      additional: 2,
    };
    const step = sectionStepMap[section];
    if (step !== undefined) {
      setCurrentStep(step);
    }
  }, []);

  // Verificar si hay errores en el paso actual para mostrar mensaje
  const currentStepErrors = stepErrors[currentStep] || [];
  const hasCurrentStepErrors = currentStepErrors.length > 0;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <WizardNavigation
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        isLoading={isSubmitting || isCheckingConflicts}
        canProceed={canCurrentStepProceed}
        isLastStep={currentStep === 3}
        onSubmit={handleSubmit}
        onCancel={onCancel}
      />

      {/* Errores del paso actual */}
      {hasCurrentStepErrors && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600">Completa los campos requeridos:</p>
                <ul className="text-sm text-red-500 mt-1 space-y-0.5">
                  {currentStepErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 1: Datos Básicos */}
      {currentStep === 0 && (
        <div className="space-y-6">
          {/* Número de Orden */}
          <OrderNumberField
            value={orderNumber}
            onChange={setOrderNumber}
            isAutomatic={autoGenerateNumber}
            onModeChange={setAutoGenerateNumber}
          />

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger id="customer">
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
              </div>

              {/* Info del Cliente */}
              {selectedCustomer && (
                <CustomerContactCard
                  customer={selectedCustomer}
                  orderContact={orderContact || undefined}
                  onOrderContactChange={setOrderContact}
                />
              )}
            </CardContent>
          </Card>

          {/* Información de Carga */}
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
                />
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
                />
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
        </div>
      )}

      {/* PASO 2: Workflow y Ruta */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Workflow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WorkflowIcon className="w-5 h-5" />
                Workflow Asignado
              </CardTitle>
              <CardDescription>
                El workflow se asigna automáticamente según el cliente y tipo de carga.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WorkflowSelector
                selectedWorkflow={selectedWorkflow}
                workflows={workflows}
                suggestedWorkflowId={suggestedWorkflowId}
                suggestionReason={workflowReason || 'Sin sugerencia disponible'}
                onSelect={handleWorkflowSelect}
                isLoading={isAssigningWorkflow || isLoadingWorkflows}
                showStepsPreview={false}
              />

              {selectedWorkflow ? (
                <WorkflowStepsPreview
                  steps={selectedWorkflow.steps}
                  showTotalDuration
                />
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <WorkflowIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Selecciona un cliente y tipo de carga para asignar workflow</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Milestones/Ruta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Ruta (Hitos)
              </CardTitle>
              <CardDescription>
                Define los puntos de la ruta: origen, paradas intermedias y destino final.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <MilestoneEditor
                milestones={milestones}
                onChange={setMilestones}
                geofences={geofencesMock}
              />

              {/* Mapa de preview */}
              {milestones.length >= 2 && (
                <div className="mt-4">
                  <RoutePreviewMapLazy
                    points={milestones.map(m => ({
                      id: m.id,
                      name: m.geofenceName,
                      type: m.type,
                      coordinates: m.coordinates,
                      sequence: m.sequence,
                    }))}
                    height={250}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* PASO 3: Asignación */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Conflictos */}
          {conflicts.length > 0 && (
            <ConflictWarning
              conflicts={conflicts}
              onForce={() => {/* permitir continuar */}}
              showForceButton
            />
          )}

          {/* Fechas */}
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
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={scheduledStartTime}
                    onChange={(e) => setScheduledStartTime(e.target.value)}
                    className="w-24 sm:w-28"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha de Fin *</Label>
                <div className="flex gap-2">
                  <Input
                    id="endDate"
                    type="date"
                    value={scheduledEndDate}
                    onChange={(e) => setScheduledEndDate(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="time"
                    value={scheduledEndTime}
                    onChange={(e) => setScheduledEndTime(e.target.value)}
                    className="w-24 sm:w-28"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Asignación de Recursos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Asignación de Recursos
              </CardTitle>
              <CardDescription>
                Puedes asignar recursos ahora o hacerlo después desde Programación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Transportista */}
                <CarrierSelector
                  selectedCarrierId={carrierId || null}
                  carriers={operatorsMock}
                  onSelect={(id) => setCarrierId(id || '')}
                />

                {/* Vehículo */}
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

                {/* Conductor */}
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

                {/* Operador GPS */}
                <GpsOperatorSelector
                  value={gpsOperatorId || undefined}
                  onChange={(v) => setGpsOperatorId(v || '')}
                  compact
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Adicional */}
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
        </div>
      )}

      {/* PASO 4: Confirmación */}
      {currentStep === 3 && summaryData && (
        <OrderSummary
          data={summaryData}
          onEditSection={handleEditSection}
        />
      )}
    </div>
  );
}
