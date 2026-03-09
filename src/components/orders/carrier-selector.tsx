'use client';

import { memo, useMemo } from 'react';
import {
  Truck,
  Building2,
  Phone,
  Mail,
  User,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import type { Operator } from '@/types/models/operator';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CarrierSelectorProps {
  /** ID del transportista seleccionado */
  selectedCarrierId: string | null;
  /** Lista de transportistas disponibles */
  carriers: Operator[];
  /** Callback al seleccionar */
  onSelect: (carrierId: string | null) => void;
  /** Mostrar card de información */
  showCarrierInfo?: boolean;
  /** Es requerido */
  required?: boolean;
  /** Error de validación */
  error?: string;
  /** Clase adicional */
  className?: string;
}

/**
 * Obtiene el color del badge de estado
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'enabled': return 'bg-green-100 text-green-700';
    case 'disabled': return 'bg-red-100 text-red-700';
    case 'pending': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

/**
 * Obtiene la etiqueta del estado
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'enabled': return 'Activo';
    case 'disabled': return 'Inactivo';
    case 'pending': return 'Pendiente';
    default: return status;
  }
}

// COMPONENTE DE INFO DEL CARRIER

interface CarrierInfoCardProps {
  carrier: Operator;
}

function CarrierInfoCard({ carrier }: CarrierInfoCardProps) {
  const primaryContact = carrier.contacts?.find(c => c.isPrimary) || carrier.contacts?.[0];
  const isChecklistComplete = carrier.checklist?.isComplete;

  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-3 space-y-2">
        {/* Header con nombre y estado */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{carrier.tradeName || carrier.businessName}</p>
            <p className="text-xs text-muted-foreground">{carrier.businessName}</p>
          </div>
          <div className="flex items-center gap-2">
            {isChecklistComplete ? (
              <Badge variant="outline" className="text-xs gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                Verificado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                Pendiente
              </Badge>
            )}
            <Badge className={cn('text-xs', getStatusColor(carrier.status))}>
              {getStatusLabel(carrier.status)}
            </Badge>
          </div>
        </div>

        {/* Información de contacto */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {primaryContact && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-3 h-3" />
              <span>{primaryContact.name}</span>
            </div>
          )}
          {carrier.phone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="w-3 h-3" />
              <span>{carrier.phone}</span>
            </div>
          )}
          {carrier.email && (
            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
              <Mail className="w-3 h-3" />
              <span>{carrier.email}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <div className="flex items-center gap-1 text-xs">
            <Truck className="w-3 h-3 text-muted-foreground" />
            <span>{carrier.vehiclesCount || 0} vehículos</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <User className="w-3 h-3 text-muted-foreground" />
            <span>{carrier.driversCount || 0} conductores</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// COMPONENTE PRINCIPAL

function CarrierSelectorComponent({
  selectedCarrierId,
  carriers,
  onSelect,
  showCarrierInfo = true,
  required = false,
  error,
  className,
}: Readonly<CarrierSelectorProps>) {
  // Filtrar solo carriers activos
  const activeCarriers = useMemo(() => 
    carriers.filter(c => c.status === 'enabled'),
    [carriers]
  );

  // Obtener carrier seleccionado
  const selectedCarrier = useMemo(() => 
    carriers.find(c => c.id === selectedCarrierId),
    [carriers, selectedCarrierId]
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Transportista / Operador Logístico
          {required && <span className="text-red-500">*</span>}
        </Label>
        
        <Select
          value={selectedCarrierId || 'none'}
          onValueChange={(v) => onSelect(v === 'none' ? null : v)}
        >
          <SelectTrigger className={cn(error && 'border-red-300')}>
            <SelectValue placeholder="Selecciona un transportista (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">Sin asignar (flota propia)</span>
            </SelectItem>
            
            {activeCarriers.map((carrier) => (
              <SelectItem key={carrier.id} value={carrier.id}>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{carrier.tradeName || carrier.businessName}</span>
                  <span className="text-muted-foreground text-xs">
                    ({carrier.vehiclesCount || 0} vehículos)
                  </span>
                  {carrier.checklist?.isComplete && (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* Info del carrier seleccionado */}
      {showCarrierInfo && selectedCarrier && (
        <CarrierInfoCard carrier={selectedCarrier} />
      )}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const CarrierSelector = memo(CarrierSelectorComponent);
