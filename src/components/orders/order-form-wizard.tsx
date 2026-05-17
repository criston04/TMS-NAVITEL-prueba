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
import { MilestoneScheduling, type MilestoneScheduleData } from './milestone-scheduling';
import { CarrierSelector } from './carrier-selector';
import { ConflictWarning } from './conflict-warning';
import { OrderNumberField } from './order-number-field';
import { CustomerContactCard, type CustomerInfo, type OrderContactInfo } from './customer-contact-card';
import { GpsOperatorSelector } from './gps-operator-selector';
import { OrderSummary, type OrderSummaryData } from './order-summary';
import { WorkflowSelector } from './workflow-selector';
import { WorkflowStepsPreview } from './workflow-steps-preview';

import { useResourceConflicts } from '@/hooks/orders/use-resource-conflicts';
import { getOrderReadinessIssues } from '@/lib/validators/order-validators';

// Services (backend real)
import {
  customersService,
  geofencesService,
  vehiclesService,
  driversService,
  operatorsService,
} from '@/services/master';
import { moduleConnectorService } from '@/services/integration/module-connector.service';
import { unifiedWorkflowService } from '@/services/workflow.service';

// Tipos
import type { Customer } from '@/types/models/customer';
import type { Vehicle } from '@/types/models/vehicle';
import type { Driver } from '@/types/models/driver';
import type { Operator } from '@/types/models/operator';

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
  const [milestoneSchedules, setMilestoneSchedules] = useState<MilestoneScheduleData[]>([]);

  // Paso 4: Adicional
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // 2026-05-03 Fix D: Fechas manuales independientes de los milestones.
  // Si el usuario las rellena aquí, tienen prioridad sobre las derivadas
  // de los hitos. Esto permite definir fechas sin necesidad de crear hitos
  // primero (caso típico de orden draft programada para mañana).
  const initialStart = initialData?.scheduledStartDate
    ? initialData.scheduledStartDate.split('T')
    : ['', ''];
  const initialEnd = initialData?.scheduledEndDate
    ? initialData.scheduledEndDate.split('T')
    : ['', ''];
  const [manualStartDate, setManualStartDate] = useState(initialStart[0] || '');
  const [manualStartTime, setManualStartTime] = useState(
    initialStart[1]?.substring(0, 5) || '08:00'
  );
  const [manualEndDate, setManualEndDate] = useState(initialEnd[0] || '');
  const [manualEndTime, setManualEndTime] = useState(
    initialEnd[1]?.substring(0, 5) || '18:00'
  );

  // ═══════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS MAESTROS DEL BACKEND REAL (reemplaza mocks)
  // ═══════════════════════════════════════════════════════════════════════
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);

  useEffect(() => {
    // Cargamos en paralelo todas las listas maestras
    const loadMasterData = async () => {
      try {
        const [custResp, geoResp, vehResp, drvResp, opList] = await Promise.all([
          customersService.getAll({ pageSize: 200 }).catch(() => ({ items: [] })),
          geofencesService.getAll({ pageSize: 200 }).catch(() => ({ items: [] })),
          vehiclesService.getAll({ pageSize: 200 }).catch(() => ({ items: [] })),
          driversService.getAll({ pageSize: 200 }).catch(() => ({ items: [] })),
          operatorsService.getAll().catch(() => [] as Operator[]),
        ]);
        setCustomers((custResp as { items: Customer[] }).items ?? []);
        setGeofences((geoResp as { items: Geofence[] }).items ?? []);
        setVehicles((vehResp as { items: Vehicle[] }).items ?? []);
        setDrivers((drvResp as { items: Driver[] }).items ?? []);
        setOperators(Array.isArray(opList) ? opList : []);
      } catch (err) {
        console.warn("[OrderFormWizard] Error cargando datos maestros:", err);
      }
    };
    loadMasterData();
  }, []);

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

  // Sincronizar milestoneSchedules con milestones (mantener datos existentes, agregar nuevos, eliminar huérfanos)
  useEffect(() => {
    setMilestoneSchedules((prev) => {
      const existingMap = new Map(prev.map((s) => [s.milestoneId, s]));
      return milestones.map((m) => {
        const existing = existingMap.get(m.id);
        if (existing) return existing;
        // Nuevo milestone — crear schedule por defecto usando datos del hito
        const arrival = m.estimatedArrival ? new Date(m.estimatedArrival) : null;
        const departure = m.estimatedDeparture ? new Date(m.estimatedDeparture) : null;
        return {
          milestoneId: m.id,
          enabled: true,
          arrivalDate: arrival && !isNaN(arrival.getTime()) ? arrival.toISOString().split('T')[0] : '',
          arrivalTime: arrival && !isNaN(arrival.getTime()) ? arrival.toISOString().split('T')[1]?.substring(0, 5) : '08:00',
          departureDate: departure && !isNaN(departure.getTime()) ? departure.toISOString().split('T')[0] : '',
          departureTime: departure && !isNaN(departure.getTime()) ? departure.toISOString().split('T')[1]?.substring(0, 5) : '',
        };
      });
    });
  }, [milestones]);

  // Derivar fechas globales de la orden.
  // PRIORIDAD: 1) fechas manuales (Fix D); 2) derivadas de schedules de hitos.
  const { derivedStartDate, derivedStartTime, derivedEndDate, derivedEndTime } = useMemo(() => {
    // Si el usuario rellenó fechas manuales en el paso 1, ganan
    if (manualStartDate || manualEndDate) {
      return {
        derivedStartDate: manualStartDate || '',
        derivedStartTime: manualStartTime || '08:00',
        derivedEndDate: manualEndDate || '',
        derivedEndTime: manualEndTime || '18:00',
      };
    }

    // Fallback: derivar de schedules de milestones
    const enabledSchedules = milestoneSchedules.filter((s) => s.enabled && s.arrivalDate);
    if (enabledSchedules.length === 0) {
      return { derivedStartDate: '', derivedStartTime: '08:00', derivedEndDate: '', derivedEndTime: '18:00' };
    }

    const allDateTimes: string[] = [];
    for (const s of enabledSchedules) {
      if (s.arrivalDate) allDateTimes.push(`${s.arrivalDate}T${s.arrivalTime || '00:00'}`);
      if (s.departureDate) allDateTimes.push(`${s.departureDate}T${s.departureTime || '23:59'}`);
    }

    if (allDateTimes.length === 0) {
      return { derivedStartDate: '', derivedStartTime: '08:00', derivedEndDate: '', derivedEndTime: '18:00' };
    }

    allDateTimes.sort();
    const earliest = allDateTimes[0];
    const latest = allDateTimes[allDateTimes.length - 1];

    return {
      derivedStartDate: earliest.split('T')[0],
      derivedStartTime: earliest.split('T')[1]?.substring(0, 5) || '08:00',
      derivedEndDate: latest.split('T')[0],
      derivedEndTime: latest.split('T')[1]?.substring(0, 5) || '18:00',
    };
  }, [milestoneSchedules, manualStartDate, manualStartTime, manualEndDate, manualEndTime]);

  // Verificar conflictos
  const { conflicts, isChecking: isCheckingConflicts } = useResourceConflicts({
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
    startDate: derivedStartDate ? `${derivedStartDate}T${derivedStartTime}:00.000Z` : undefined,
    endDate: derivedEndDate ? `${derivedEndDate}T${derivedEndTime}:00.000Z` : undefined,
  });

  // Obtener cliente seleccionado
  const selectedCustomer = useMemo((): CustomerInfo | null => {
    const customer = customers.find(c => c.id === customerId);
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
              const geofence = geofences.find(g => g.id === milestone.geofenceId);
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
        // Los hitos son opcionales para permitir crear orden como borrador (draft).
        // Si hay hitos agregados, deben estar completos — no se permiten a medias.
        if (milestones.length > 0 && milestones.some(m => !m.geofenceId)) {
          errors.push('Los hitos agregados deben tener ubicación asignada (o elimínalos)');
        }
        break;

      case 2: // Asignación
        {
          // Si el usuario activó programación, validamos que esté completa.
          // Si no activó ninguna, también OK — la orden queda sin fechas (draft).
          const enabledSchedules = milestoneSchedules.filter((s) => s.enabled);
          if (enabledSchedules.length > 0) {
            const missingDates = enabledSchedules.filter((s) => !s.arrivalDate);
            if (missingDates.length > 0) {
              errors.push('Completa la fecha de llegada en los hitos con programación activa');
            }
          }
          if (derivedStartDate && derivedEndDate && derivedStartDate > derivedEndDate) {
            errors.push('Las fechas de los hitos generan un rango inválido');
          }
        }
        break;

      case 3: // Confirmación
        // No hay validación adicional
        break;
    }

    setStepErrors(prev => ({ ...prev, [currentStep]: errors }));
    return errors.length === 0;
  }, [currentStep, customerId, cargoDescription, cargoWeight, milestones, milestoneSchedules, derivedStartDate, derivedEndDate]);

  // Verificar si el paso actual puede avanzar (validación en tiempo real)
  const canCurrentStepProceed = useMemo((): boolean => {
    switch (currentStep) {
      case 0: // Datos Básicos
        return !!customerId && !!cargoDescription && !!cargoWeight && parseFloat(cargoWeight) > 0;

      case 1: // Workflow y Ruta
        // Permitir continuar sin hitos (draft). Si hay hitos, todos deben estar completos.
        return milestones.every(m => !!m.geofenceId);

      case 2: // Asignación
        {
          // Si el usuario activó programación, debe estar completa. Si no hay activadas, también OK.
          const enabled = milestoneSchedules.filter(s => s.enabled);
          if (enabled.length > 0 && enabled.some(s => !s.arrivalDate)) return false;
          if (derivedStartDate && derivedEndDate && derivedStartDate > derivedEndDate) return false;
          return true;
        }

      case 3: // Confirmación
        return true;

      default:
        return true;
    }
  }, [currentStep, customerId, cargoDescription, cargoWeight, milestones, milestoneSchedules, derivedStartDate, derivedEndDate]);

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
        const geofence = geofences.find(g => g.id === milestone.geofenceId);
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

    const vehicle = vehicles.find(v => v.id === vehicleId);
    const driver = drivers.find(d => d.id === driverId);

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
      // 2026-05-05 (bug fix): el backend exige order_number en POST /orders
      // (deploy 2026-05-03 cambio el contrato — antes lo generaba el; ahora
      // espera que el cliente lo envie). El wizard ya genera uno automatico
      // y lo muestra en la UI; lo enviamos siempre, no condicional al modo.
      orderNumber,
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
      scheduledStart: derivedStartDate ? `${derivedStartDate}T${derivedStartTime}:00.000Z` : '',
      scheduledEnd: derivedEndDate ? `${derivedEndDate}T${derivedEndTime}:00.000Z` : '',
      milestones: milestones.map(m => {
        const schedule = milestoneSchedules.find(s => s.milestoneId === m.id);
        return {
          id: m.id,
          sequence: m.sequence,
          type: m.type,
          geofenceName: m.geofenceName,
          address: m.address,
          estimatedArrival: schedule?.enabled && schedule.arrivalDate
            ? `${schedule.arrivalDate}T${schedule.arrivalTime || '00:00'}:00.000Z`
            : m.estimatedArrival,
          estimatedDeparture: schedule?.enabled && schedule.departureDate
            ? `${schedule.departureDate}T${schedule.departureTime || '00:00'}:00.000Z`
            : undefined,
          scheduleEnabled: schedule?.enabled ?? false,
        };
      }),
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
    cargoQuantity, cargoDeclaredValue, derivedStartDate, derivedStartTime, derivedEndDate,
    derivedEndTime, milestones, milestoneSchedules, vehicleId, driverId, notes, tags, conflicts
  ]);

  // Enviar formulario
  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) return;

    isSubmittingRef.current = true;

    const startDateTime = derivedStartDate ? `${derivedStartDate}T${derivedStartTime}:00.000Z` : '';
    const endDateTime = derivedEndDate ? `${derivedEndDate}T${derivedEndTime}:00.000Z` : '';

    const processedMilestones = milestones.map((m, i, arr) => {
      const schedule = milestoneSchedules.find(s => s.milestoneId === m.id);
      return {
        ...m,
        type: (i === 0 ? 'origin' : i === arr.length - 1 ? 'destination' : 'waypoint') as 'origin' | 'waypoint' | 'destination',
        estimatedArrival: schedule?.enabled && schedule.arrivalDate
          ? `${schedule.arrivalDate}T${schedule.arrivalTime || '00:00'}:00.000Z`
          : m.estimatedArrival,
        estimatedDeparture: schedule?.enabled && schedule.departureDate
          ? `${schedule.departureDate}T${schedule.departureTime || '00:00'}:00.000Z`
          : m.estimatedDeparture,
      };
    });

    // 2026-05-03 Fix A: Hidratar denormalizaciones (customer_name, vehicle_plate,
    // driver_name). El backend acepta estos campos y los persiste, pero NO hace
    // JOIN automático para resolverlos a partir del id. Si no los enviamos,
    // quedan en NULL aunque el id sea válido.
    const selectedCustomerObj = customers.find(c => c.id === customerId);
    const selectedVehicleObj = vehicles.find(v => v.id === vehicleId);
    const selectedDriverObj = drivers.find(d => d.id === driverId);

    const customerDisplayName = selectedCustomerObj
      ? (selectedCustomerObj.tradeName || selectedCustomerObj.name || undefined)
      : undefined;
    const vehiclePlate = selectedVehicleObj?.plate || undefined;
    const driverFullName = selectedDriverObj
      ? ([selectedDriverObj.firstName, selectedDriverObj.lastName].filter(Boolean).join(' ').trim() || undefined)
      : undefined;

    // 2026-05-05 (bug fix): Red de seguridad para order_number. El backend
    // exige el campo (deploy 2026-05-03 cambio el contrato; sin el devuelve
    // 500). En modo automatico el wizard ya genero uno al mount; en modo
    // manual el usuario lo escribe. Si por edge case llegamos aqui con
    // orderNumber vacio, generamos uno inline para no perder la creacion.
    const finalOrderNumber = orderNumber
      || `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const data: CreateOrderDTO = {
      customerId,
      carrierId: carrierId || undefined,
      vehicleId: vehicleId || undefined,
      driverId: driverId || undefined,
      workflowId: selectedWorkflow?.id || undefined,
      priority,
      serviceType,
      // Denormalizaciones que el backend persiste (customer_name, vehicle_plate, driver_name)
      ...(customerDisplayName && {
        customer: { id: customerId, name: customerDisplayName },
      }),
      ...(vehiclePlate && {
        vehicle: { id: vehicleId, plate: vehiclePlate },
      }),
      ...(driverFullName && {
        driver: { id: driverId, fullName: driverFullName },
      }),
      // 2026-05-05 (bug fix): el backend exige order_number en POST /orders
      // tras el deploy del 2026-05-03 (antes generaba uno auto; ahora 500 si
      // el cliente no lo envia). Se envia SIEMPRE; finalOrderNumber tiene
      // fallback inline por si orderNumber estuviera vacio en edge case.
      orderNumber: finalOrderNumber,
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
    milestones, milestoneSchedules, derivedStartDate, derivedStartTime, derivedEndDate, derivedEndTime,
    externalReference, notes, tags, selectedWorkflow, onSubmit, autoGenerateNumber, orderNumber,
    gpsOperatorId, orderContact,
    customers, vehicles, drivers, // <- nuevo: necesarios para hidratar denormalizaciones
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
                      {customers.map(customer => (
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

          {/* Programación (Fix D 2026-05-03): fechas independientes de los hitos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span aria-hidden="true">📅</span>
                Programación
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define cuándo se debe recoger y entregar la orden. Si dejas estos campos vacíos,
                las fechas se derivarán automáticamente de los hitos del paso 2.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manualStartDate">Fecha de recojo (pickup)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="manualStartDate"
                      type="date"
                      value={manualStartDate}
                      onChange={(e) => setManualStartDate(e.target.value)}
                    />
                    <Input
                      type="time"
                      value={manualStartTime}
                      onChange={(e) => setManualStartTime(e.target.value)}
                      disabled={!manualStartDate}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualEndDate">Fecha de entrega (delivery)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="manualEndDate"
                      type="date"
                      value={manualEndDate}
                      onChange={(e) => setManualEndDate(e.target.value)}
                      min={manualStartDate || undefined}
                    />
                    <Input
                      type="time"
                      value={manualEndTime}
                      onChange={(e) => setManualEndTime(e.target.value)}
                      disabled={!manualEndDate}
                    />
                  </div>
                </div>
              </div>

              {manualStartDate && manualEndDate && manualStartDate > manualEndDate && (
                <p className="text-sm text-destructive">
                  La fecha de entrega debe ser igual o posterior a la fecha de recojo.
                </p>
              )}

              {!manualStartDate && !manualEndDate && (derivedStartDate || derivedEndDate) && (
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  Fechas actuales (derivadas de los hitos):{' '}
                  <strong>{derivedStartDate} {derivedStartTime}</strong>
                  {' → '}
                  <strong>{derivedEndDate} {derivedEndTime}</strong>
                </div>
              )}
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
                geofences={geofences}
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

          {/* Programación por Hito */}
          <MilestoneScheduling
            milestones={milestones}
            schedules={milestoneSchedules}
            onChange={setMilestoneSchedules}
          />

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
                  carriers={operators}
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
                      {vehicles.map(vehicle => (
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
                      {drivers.map(driver => (
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
        <>
          {/* Banner de advertencias: campos faltantes para programación */}
          {(() => {
            const startDateTime = derivedStartDate ? `${derivedStartDate}T${derivedStartTime}:00.000Z` : '';
            const endDateTime = derivedEndDate ? `${derivedEndDate}T${derivedEndTime}:00.000Z` : '';
            const previewDto = {
              customerId,
              priority,
              serviceType,
              cargo: {
                description: cargoDescription,
                type: cargoType,
                weightKg: parseFloat(cargoWeight) || 0,
                volumeM3: cargoVolume ? parseFloat(cargoVolume) : undefined,
                quantity: parseInt(cargoQuantity, 10) || 1,
              },
              milestones: milestones.map(m => ({
                geofenceId: m.geofenceId,
                geofenceName: m.geofenceName,
                type: m.type,
                sequence: m.sequence,
                address: m.address,
                coordinates: m.coordinates,
              })),
              scheduledStartDate: startDateTime,
              scheduledEndDate: endDateTime,
            };
            const readinessIssues = getOrderReadinessIssues(previewDto);

            if (readinessIssues.length === 0) return null;
            return (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">⚠️</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                      La orden se creará como borrador (draft)
                    </h4>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300/90">
                      Faltan datos requeridos para programar/asignar esta orden.
                      Podrás guardarla así, pero antes de pasar a estados posteriores deberás completar:
                    </p>
                    <ul className="mt-2 list-disc list-inside text-sm text-amber-800 dark:text-amber-300/90 space-y-0.5">
                      {readinessIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Aviso de campos no soportados por backend (Fix E) */}
          {(carrierId || tags.length > 0 || (cargoDeclaredValue && parseFloat(cargoDeclaredValue) > 0)) && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">ℹ️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                    Algunos campos no se persisten en el backend todavía
                  </h4>
                  <p className="mt-1 text-sm text-blue-800 dark:text-blue-300/90">
                    Los siguientes datos los rellenaste pero el backend actual no los soporta.
                    Se preservan localmente y en notas internas:
                  </p>
                  <ul className="mt-2 list-disc list-inside text-sm text-blue-800 dark:text-blue-300/90 space-y-0.5">
                    {carrierId && <li>Transportista (carrier) — el backend no soporta este campo aún</li>}
                    {tags.length > 0 && <li>Etiquetas/Tags — el backend no implementa tags todavía</li>}
                    {cargoDeclaredValue && parseFloat(cargoDeclaredValue) > 0 && (
                      <li>Valor declarado de carga — se preserva en notas internas como referencia</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <OrderSummary
            data={summaryData}
            onEditSection={handleEditSection}
          />
        </>
      )}
    </div>
  );
}
