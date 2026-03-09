'use client';

import React, { memo, useState, useEffect, useMemo, useCallback, type FC } from 'react';
import {
  Truck,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  MapPin,
  Loader2,
  X,
  ChevronDown,
  FileText,
} from 'lucide-react';
import type { Order } from '@/types/order';
import type {
  ScheduledOrder,
  ResourceSuggestion,
  ScheduleConflict,
  SchedulingFeatureFlags,
  HOSValidationResult,
} from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SchedulingVehicle {
  id: string;
  plateNumber: string;
  model: string;
  status?: string;
  type?: string;
  capacityKg?: number;
}

interface SchedulingDriver {
  id: string;
  fullName: string;
  name: string;
  status: string;
  phone: string;
}

interface AssignmentModalProps {
  open: boolean;
  order: Order | ScheduledOrder | null;
  proposedDate?: Date | null;
  vehicles: SchedulingVehicle[];
  drivers?: SchedulingDriver[];
  suggestions?: ResourceSuggestion[];
  conflicts?: ScheduleConflict[];
  hosValidation?: HOSValidationResult | null;
  featureFlags?: SchedulingFeatureFlags;
  isLoading?: boolean;
  isLoadingSuggestions?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    orderId: string;
    vehicleId: string;
    driverId: string;
    scheduledDate: Date;
    notes?: string;
  }) => void;
  onRequestSuggestions?: (orderId: string, date: Date) => void;
  onValidateHOS?: (driverId: string, date: Date, duration: number) => void;
  className?: string;
}

/**
 * Returns the appropriate CSS classes for priority badge styling
 */
function getPriorityBadgeStyle(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'high':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
  }
}

/**
 * Returns the display label for priority
 */
function getPriorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'Urgente';
    case 'high':
      return 'Alta';
    default:
      return 'Normal';
  }
}

// SUBCOMPONENTES

interface SuggestionChipProps {
  suggestion: ResourceSuggestion;
  isSelected: boolean;
  onClick: () => void;
}

const SuggestionChip: FC<Readonly<SuggestionChipProps>> = memo(function SuggestionChip({
  suggestion,
  isSelected,
  onClick,
}) {
  const Icon = suggestion.type === 'vehicle' ? Truck : User;
  const isVehicle = suggestion.type === 'vehicle';
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 p-2 rounded-lg border text-left w-full',
        'transition-all duration-150',
        'hover:border-primary/60 hover:bg-primary/5',
        isSelected 
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30' 
          : 'border-border bg-card'
      )}
    >
      <div className={cn(
        'p-1.5 rounded-md shrink-0 self-start mt-0.5',
        isVehicle ? 'bg-[#34b7ff]/10 text-[#34b7ff] dark:bg-[#34b7ff]/20 dark:text-[#34b7ff]' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="font-medium text-xs truncate">{suggestion.name}</span>
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full border border-amber-100 dark:border-amber-900/50">
            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500">{suggestion.score}%</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight">
          {suggestion.reason}
        </p>
      </div>
    </button>
  );
});

interface HOSIndicatorProps {
  validation: HOSValidationResult;
}

const HOSIndicator: FC<Readonly<HOSIndicatorProps>> = memo(function HOSIndicator({ validation }) {
  const isValid = validation.isValid;
  
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border',
      isValid 
        ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
        : 'bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
    )}>
      {isValid ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
      )}
      <div className="flex-1 font-medium text-green-700 dark:text-green-300">
        {isValid ? 'HOS Válido' : 'Violación HOS'}
      </div>
      <div className="flex items-center gap-3 opacity-80">
        <span>Hoy: {validation.remainingHoursToday}h</span>
        <span>Semana: {validation.weeklyHoursUsed}/60h</span>
      </div>
    </div>
  );
});

interface ConflictAlertProps {
  conflict: ScheduleConflict;
}

const ConflictAlert: FC<Readonly<ConflictAlertProps>> = memo(function ConflictAlert({ conflict }) {
  const severityStyles = {
    high: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300',
    medium: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    low: 'bg-[#34b7ff]/10 border-[#34b7ff]/30 text-[#34b7ff] dark:bg-[#34b7ff]/20 dark:border-[#34b7ff]/20 dark:text-[#34b7ff]',
  };

  return (
    <div className={cn(
      'flex items-start gap-2 p-2 rounded-lg border text-xs',
      severityStyles[conflict.severity]
    )}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div>
        <p className="font-medium">{conflict.message}</p>
        {conflict.suggestedResolution && (
          <p className="mt-0.5 opacity-80">{conflict.suggestedResolution}</p>
        )}
      </div>
    </div>
  );
});

// RENDER HELPERS

/**
 * Renders the suggestions section of the modal
 */
function renderSuggestionsSection({
  featureFlags,
  suggestions,
  isLoadingSuggestions,
  showSuggestions,
  toggleSuggestions,
  selectedVehicleId,
  selectedDriverId,
  handleApplySuggestion,
}: {
  featureFlags?: SchedulingFeatureFlags;
  suggestions: ResourceSuggestion[];
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  toggleSuggestions: () => void;
  selectedVehicleId: string;
  selectedDriverId: string;
  handleApplySuggestion: (suggestion: ResourceSuggestion) => void;
}): React.ReactNode {
  // Feature disabled
  if (!featureFlags?.enableAutoSuggestion) {
    return null;
  }

  // Loading state with no suggestions yet
  if (isLoadingSuggestions && suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center py-4 bg-muted/20 rounded-lg border border-border/30">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-xs text-muted-foreground">Cargando sugerencias...</span>
      </div>
    );
  }

  // No suggestions available
  if (suggestions.length === 0) {
    return null;
  }

  const vehicleSuggestions = suggestions.filter(s => s.type === 'vehicle').slice(0, 3);
  const driverSuggestions = suggestions.filter(s => s.type === 'driver').slice(0, 3);

  // Suggestions available
  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={toggleSuggestions}
        className="flex items-center justify-between w-full text-left group"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
            Sugerencias ({suggestions.length})
          </span>
        </div>
        <ChevronDown className={cn(
          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
          showSuggestions && "rotate-180"
        )} />
      </button>
      
      {showSuggestions && (
        <div className="bg-muted/20 p-2.5 rounded-lg border border-border/30 max-h-[200px] overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {isLoadingSuggestions ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {/* Columna: Camiones */}
              {vehicleSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <Truck className="h-3 w-3 text-[#34b7ff]" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Camiones</span>
                  </div>
                  {vehicleSuggestions.map((suggestion) => (
                    <SuggestionChip
                      key={suggestion.resourceId}
                      suggestion={suggestion}
                      isSelected={suggestion.resourceId === selectedVehicleId}
                      onClick={() => handleApplySuggestion(suggestion)}
                    />
                  ))}
                </div>
              )}
              {/* Columna: Conductores */}
              {driverSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <User className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Conductores</span>
                  </div>
                  {driverSuggestions.map((suggestion) => (
                    <SuggestionChip
                      key={suggestion.resourceId}
                      suggestion={suggestion}
                      isSelected={suggestion.resourceId === selectedDriverId}
                      onClick={() => handleApplySuggestion(suggestion)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// COMPONENTE PRINCIPAL

export const AssignmentModal: FC<Readonly<AssignmentModalProps>> = memo(function AssignmentModal({
  open,
  order,
  proposedDate,
  vehicles,
  drivers = [],
  suggestions = [],
  conflicts = [],
  hosValidation,
  featureFlags,
  isLoading = false,
  isLoadingSuggestions = false,
  onClose,
  onConfirm,
  onRequestSuggestions,
  onValidateHOS,
  className,
}) {
  // Calcular valores iniciales
  const getInitialVehicleId = () => {
    if (!order) return '';
    return 'vehicleId' in order && order.vehicleId ? order.vehicleId : '';
  };

  const getInitialDriverId = () => {
    if (!order) return '';
    return 'driverId' in order && order.driverId ? order.driverId : '';
  };
  
  const getInitialDate = () => {
    if (!order) return '';
    const date = proposedDate || ('scheduledDate' in order ? new Date(order.scheduledDate) : new Date());
    return date.toISOString().split('T')[0];
  };
  
  const getInitialTime = () => {
    if (!order) return '';
    const date = proposedDate || ('scheduledDate' in order ? new Date(order.scheduledDate) : new Date());
    return date.toTimeString().slice(0, 5);
  };

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(getInitialVehicleId);
  const [selectedDriverId, setSelectedDriverId] = useState<string>(getInitialDriverId);
  const [scheduledDate, setScheduledDate] = useState<string>(getInitialDate);
  const [scheduledTime, setScheduledTime] = useState<string>(getInitialTime);
  const [notes, setNotes] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Track order id para resetear cuando cambia
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(order?.id ?? null);

  // Reset cuando cambia la orden
  if (open && order && order.id !== trackedOrderId) {
    setTrackedOrderId(order.id);
    setSelectedVehicleId(getInitialVehicleId());
    setSelectedDriverId(getInitialDriverId());
    setScheduledDate(getInitialDate());
    setScheduledTime(getInitialTime());
    setNotes('');
    setShowSuggestions(true);
  }

  // Solicitar sugerencias cuando se abre el modal
  // Usamos un ref para evitar llamadas duplicadas
  const lastRequestRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    // Solo ejecutar si el modal está abierto y tenemos orden
    if (!open || !order) {
      lastRequestRef.current = null;
      return;
    }
    
    // Verificar si las sugerencias automáticas están habilitadas
    if (!featureFlags?.enableAutoSuggestion || !onRequestSuggestions) {
      return;
    }
    
    // Crear un identificador único para esta solicitud
    const date = proposedDate || ('scheduledDate' in order ? new Date(order.scheduledDate) : new Date());
    const requestKey = `${order.id}-${date.getTime()}`;
    
    // Evitar llamadas duplicadas
    if (lastRequestRef.current === requestKey) {
      return;
    }
    
    lastRequestRef.current = requestKey;
    onRequestSuggestions(order.id, date);
    
  }, [open, order, featureFlags?.enableAutoSuggestion, onRequestSuggestions, proposedDate]);

  // Aplicar sugerencia
  const handleApplySuggestion = (suggestion: ResourceSuggestion) => {
    if (suggestion.type === 'vehicle') {
      setSelectedVehicleId(suggestion.resourceId);
    } else if (suggestion.type === 'driver') {
      setSelectedDriverId(suggestion.resourceId);
    }
  };

  // Confirmar asignación
  const handleConfirm = useCallback(() => {
    if (!order || !selectedVehicleId || !selectedDriverId || !scheduledDate) return;

    const dateTime = new Date(`${scheduledDate}T${scheduledTime || '08:00'}`);
    
    onConfirm({
      orderId: order.id,
      vehicleId: selectedVehicleId,
      driverId: selectedDriverId,
      scheduledDate: dateTime,
      notes: notes || undefined,
    });
  }, [order, selectedVehicleId, selectedDriverId, scheduledDate, scheduledTime, notes, onConfirm]);

  // Toggle sugerencias
  const toggleSuggestions = useCallback(() => {
    setShowSuggestions(prev => !prev);
  }, []);

  const canSubmit = useMemo(() => {
    if (!selectedVehicleId || !selectedDriverId || !scheduledDate) return false;
    if (conflicts.some(c => c.severity === 'high')) return false;
    return true;
  }, [selectedVehicleId, selectedDriverId, scheduledDate, conflicts]);

  // Early return si no está abierto
  if (!open || !order) return null;

  const destination = order.milestones?.find(m => m.type === 'destination');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <dialog 
        open
        aria-labelledby="modal-title"
        className={cn(
          'relative w-full max-w-125 bg-background rounded-xl shadow-2xl flex flex-col',
          'border border-border',
          'animate-in fade-in-0 zoom-in-95 duration-200',
          className
        )}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header - Fixed & Compact */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-background/50 backdrop-blur supports-backdrop-filter:bg-background/20 rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-semibold tracking-tight">
                Programar Orden
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div 
          className={cn(
            'flex-1 overflow-y-auto overscroll-contain px-4 py-4',
            'scrollbar-none',
            '[&::-webkit-scrollbar]:hidden',
            '[-ms-overflow-style:none]',
            '[scrollbar-width:none]'
          )}
        >
          <div className="space-y-5">
            {/* Order Info Bar - Very Compact */}
            <div className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2 rounded-lg border border-border/50">
               <div className="flex items-center gap-2.5">
                  <span className="text-sm font-semibold">{order.orderNumber}</span>
                  <Separator orientation="vertical" className="h-3.5 bg-border" />
                  <span className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    getPriorityBadgeStyle(order.priority)
                  )}>
                    {getPriorityLabel(order.priority)}
                  </span>
               </div>
               
               {destination && (
                  <div className="flex items-center gap-1 text-muted-foreground text-xs max-w-35">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{destination.geofenceName}</span>
                  </div>
               )}
            </div>

            {/* Sugerencias - Compact Layout */}
            {renderSuggestionsSection({
              featureFlags,
              suggestions,
              isLoadingSuggestions,
              showSuggestions,
              toggleSuggestions,
              selectedVehicleId,
              selectedDriverId,
              handleApplySuggestion,
            })}

            {/* Formulario */}
            <div className="space-y-4">
              {/* Vehículo */}
              <div className="space-y-1.5">
                <label htmlFor="vehicle-select" className="text-xs font-medium text-muted-foreground">
                  Camión
                </label>
                <Select
                  value={selectedVehicleId}
                  onValueChange={setSelectedVehicleId}
                >
                  <SelectTrigger id="vehicle-select" className="h-9 bg-background focus:ring-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Truck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {selectedVehicleId 
                          ? vehicles.find(v => v.id === selectedVehicleId)?.plateNumber 
                          : 'Seleccionar...'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{vehicle.plateNumber}</span>
                          <span className="text-muted-foreground text-xs">{vehicle.model.split(' ')[0]}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conductor */}
              <div className="space-y-1.5">
                <label htmlFor="driver-select" className="text-xs font-medium text-muted-foreground">
                  Conductor
                </label>
                <Select
                  value={selectedDriverId}
                  onValueChange={setSelectedDriverId}
                >
                  <SelectTrigger id="driver-select" className="h-9 bg-background focus:ring-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {selectedDriverId 
                          ? drivers.find(d => d.id === selectedDriverId)?.fullName 
                          : 'Seleccionar...'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.filter(d => d.status === 'available').map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{driver.fullName}</span>
                          <span className="text-muted-foreground text-xs">{driver.phone}</span>
                        </span>
                      </SelectItem>
                    ))}
                    {drivers.filter(d => d.status !== 'available').length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">No disponibles</div>
                        {drivers.filter(d => d.status !== 'available').map((driver) => (
                          <SelectItem key={driver.id} value={driver.id} disabled>
                            <span className="flex items-center gap-2 opacity-50">
                              <span className="font-medium">{driver.fullName}</span>
                              <span className="text-muted-foreground text-xs">{driver.status === 'on_duty' ? 'En servicio' : 'Fuera de servicio'}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="date-input" className="text-xs font-medium text-muted-foreground">
                    Fecha
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="date-input"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="h-9 pl-8 bg-background focus:ring-1"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="time-input" className="text-xs font-medium text-muted-foreground">
                    Hora
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="time-input"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="h-9 pl-8 bg-background focus:ring-1"
                    />
                  </div>
                </div>
              </div>

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <ConflictAlert key={conflict.id} conflict={conflict} />
                  ))}
                </div>
              )}

              {/* Notas */}
              <div className="space-y-1.5">
                 <label htmlFor="notes-input" className="text-xs font-medium text-muted-foreground">
                    Notas opcionales
                 </label>
                 <div className="relative">
                  <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    id="notes-input"
                    placeholder="Instrucciones especiales..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 pl-8 bg-background focus:ring-1"
                  />
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-4 py-3 border-t border-border bg-muted/20">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="h-8 px-3 text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
            className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Guardando
              </>
            ) : (
              <>
                Confirmar
              </>
            )}
          </Button>
        </div>
      </dialog>
    </div>
  );
});
