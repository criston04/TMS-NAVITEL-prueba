/**
 * @fileoverview Página de detalle de vehículo
 * Muestra información completa de un vehículo específico
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  Truck,
  Calendar,
  Gauge,
  Wrench,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle } from '@/types/maintenance';

const statusConfig = {
  active: {
    label: 'Activo',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  maintenance: {
    label: 'En Mantenimiento',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  out_of_service: {
    label: 'Fuera de Servicio',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
  reserved: {
    label: 'Reservado',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
} as const;

const vehicleTypeLabels = {
  truck: 'Camión',
  van: 'Furgoneta',
  pickup: 'Camioneta',
  trailer: 'Tráiler',
  car: 'Auto',
};

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const maintenance = useMaintenance();
  const vehicleId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (vehicleId) {
      loadVehicle();
    }
  }, [vehicleId]);

  const loadVehicle = async () => {
    try {
      setLoading(true);
      const vehicles = await maintenance.getVehicles();
      const found = vehicles.find((v) => v.id === vehicleId);
      setVehicle(found || null);
    } catch (error) {
      console.error('Error loading vehicle:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando vehículo...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Vehículo no encontrado</h3>
          <p className="text-muted-foreground mb-4">
            No se pudo encontrar el vehículo solicitado
          </p>
          <Link href="/maintenance/vehicles">
            <Button>Volver a la lista</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.active;
  const StatusIcon = statusInfo.icon;
  
  const daysUntilMaintenance = vehicle.nextMaintenanceDue
    ? Math.ceil(
        (new Date(vehicle.nextMaintenanceDue).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/maintenance/vehicles">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la lista
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            {vehicle.plate}
          </h1>
          <p className="text-muted-foreground mt-1">
            {vehicle.brand} {vehicle.model} ({vehicle.year})
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/maintenance/vehicles/${vehicle.id}/edit`}>
            <Button className="gap-2">
              <Edit className="h-4 w-4" />
              Editar Vehículo
            </Button>
          </Link>
        </div>
      </div>

      {/* Estado y Tipo */}
      <div className="flex gap-3">
        <Badge variant="outline" className={`${statusInfo.color} px-4 py-2 text-base`}>
          <StatusIcon className="h-4 w-4 mr-2" />
          {statusInfo.label}
        </Badge>
        <Badge variant="outline" className="px-4 py-2 text-base">
          {vehicleTypeLabels[vehicle.type]}
        </Badge>
      </div>

      {/* Información General */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Información del Vehículo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Placa</label>
                <p className="font-mono font-bold text-lg">{vehicle.plate}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">VIN</label>
                <p className="font-mono text-sm">{vehicle.vin || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Marca</label>
                <p className="font-semibold">{vehicle.brand}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Modelo</label>
                <p className="font-semibold">{vehicle.model}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Año</label>
                <p className="font-semibold">{vehicle.year}</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Color</label>
                <p className="font-semibold capitalize">{'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Kilometraje y Uso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Kilometraje Actual</label>
              <p className="font-mono font-bold text-2xl">
                {vehicle.currentMileage.toLocaleString()} km
              </p>
            </div>
            {vehicle.acquisitionDate && (
              <div>
                <label className="text-sm text-muted-foreground">Fecha de Adquisición</label>
                <p className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(vehicle.acquisitionDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {vehicle.assignedDriverId && (
              <div>
                <label className="text-sm text-muted-foreground">Conductor Asignado</label>
                <p className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {vehicle.assignedDriverId}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mantenimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Información de Mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vehicle.lastMaintenanceDate && (
              <div>
                <label className="text-sm text-muted-foreground">Último Mantenimiento</label>
                <p className="font-semibold text-lg">
                  {new Date(vehicle.lastMaintenanceDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {vehicle.nextMaintenanceDue && (
              <div>
                <label className="text-sm text-muted-foreground">Próximo Mantenimiento</label>
                <p className="font-semibold text-lg">
                  {new Date(vehicle.nextMaintenanceDue).toLocaleDateString()}
                </p>
                {daysUntilMaintenance !== null && (
                  <p
                    className={`text-sm mt-1 ${
                      daysUntilMaintenance < 7
                        ? 'text-red-600 font-semibold'
                        : daysUntilMaintenance < 14
                        ? 'text-yellow-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {daysUntilMaintenance < 0
                      ? `Vencido hace ${Math.abs(daysUntilMaintenance)} días`
                      : `En ${daysUntilMaintenance} días`}
                  </p>
                )}
              </div>
            )}
            {vehicle.maintenanceKmInterval > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Intervalo de Mantenimiento</label>
                <p className="font-semibold text-lg">
                  {vehicle.maintenanceKmInterval.toLocaleString()} km
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacidad */}
      {(vehicle.capacityKg > 0 || vehicle.capacityM3) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Capacidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {vehicle.capacityKg > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground">Capacidad de Carga</label>
                  <p className="font-semibold text-lg">{vehicle.capacityKg} kg</p>
                </div>
              )}
              {vehicle.capacityM3 && (
                <div>
                  <label className="text-sm text-muted-foreground">Capacidad Volumétrica</label>
                  <p className="font-semibold text-lg">{vehicle.capacityM3} m³</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ubicación */}
      {vehicle.currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{vehicle.currentLocation}</p>
          </CardContent>
        </Card>
      )}

      {/* Notas */}

    </div>
  );
}
