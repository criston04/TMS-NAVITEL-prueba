/**
 * @fileoverview Página de Mantenimiento Preventivo
 * Programación, calendario y gestión de mantenimientos programados
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Truck,
  Filter,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { MaintenanceSchedule, Vehicle } from '@/types/maintenance';
import Link from 'next/link';

const maintenanceTypeLabels: Record<string, string> = {
  oil_change: 'Cambio de Aceite',
  filter_change: 'Cambio de Filtros',
  tire_rotation: 'Rotación de Neumáticos',
  brake_inspection: 'Inspección de Frenos',
  general_inspection: 'Inspección General',
  technical_review: 'Revisión Técnica',
  tune_up: 'Afinamiento',
  alignment: 'Alineación',
  battery_check: 'Revisión de Batería',
  cooling_system: 'Sistema de Refrigeración',
  transmission_service: 'Servicio de Transmisión',
  custom: 'Personalizado',
};

const statusConfig = {
  upcoming: {
    label: 'Próximo',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
  due_soon: {
    label: 'Por Vencer',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertTriangle,
  },
  overdue: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completado',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
} as const;

export default function PreventiveMaintenancePage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [schedulesData, vehiclesData] = await Promise.all([
        maintenance.getMaintenanceSchedules(),
        maintenance.getVehicles(),
      ]);
      setSchedules(schedulesData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehicle = (vehicleId: string) => {
    return vehicles.find((v) => v.id === vehicleId);
  };

  const handleExport = () => {
    const csvContent = [
      ['Vehículo', 'Tipo Mantenimiento', 'Próxima Fecha', 'Próximo Kilometraje', 'Estado', 'Activo'].join(','),
      ...schedules.map(s => {
        const vehicle = getVehicle(s.vehicleId);
        const typeLabel = s.type === 'custom' && s.customTypeName ? s.customTypeName : maintenanceTypeLabels[s.type] || s.type;
        return [
          vehicle?.plate || s.vehicleId,
          typeLabel,
          s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : '',
          s.nextDueMileage || '',
          statusConfig[s.status as keyof typeof statusConfig]?.label || s.status,
          s.isActive ? 'Sí' : 'No'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mantenimiento_preventivo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Estadísticas
  const stats = {
    total: schedules.length,
    upcoming: schedules.filter((s) => s.status === 'upcoming').length,
    dueSoon: schedules.filter((s) => s.status === 'due_soon').length,
    overdue: schedules.filter((s) => s.status === 'overdue').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando programación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/maintenance">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Mantenimiento Preventivo
          </h1>
          <p className="text-muted-foreground mt-1">
            Programación y calendario de mantenimientos
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Link href="/maintenance/preventive/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Programación
            </Button>
          </Link>
        </div>
      </div>

      {/* Alertas de Vencimiento */}
      {stats.overdue > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {stats.overdue} Mantenimiento{stats.overdue > 1 ? 's' : ''} Vencido
                {stats.overdue > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700">Requieren atención inmediata</p>
            </div>
          </div>
        </Card>
      )}

      {stats.dueSoon > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <div className="p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-yellow-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">
                {stats.dueSoon} Mantenimiento{stats.dueSoon > 1 ? 's' : ''} por Vencer
              </h3>
              <p className="text-sm text-yellow-700">Próximos 7 días</p>
            </div>
          </div>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Programados</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próximos</p>
              <p className="text-2xl font-bold text-blue-600">{stats.upcoming}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Por Vencer</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vencidos</p>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Tabla de Programaciones */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Programaciones Activas</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo de Mantenimiento</TableHead>
                <TableHead>Programación</TableHead>
                <TableHead>Próximo Mantenimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules
                .filter((s) => s.isActive)
                .sort((a, b) => {
                  // Ordenar por prioridad: vencidos, por vencer, próximos
                  const statusPriority = { overdue: 0, due_soon: 1, upcoming: 2, completed: 3 };
                  return statusPriority[a.status] - statusPriority[b.status];
                })
                .map((schedule) => {
                  const vehicle = getVehicle(schedule.vehicleId);
                  const statusInfo = statusConfig[schedule.status as keyof typeof statusConfig] || statusConfig.upcoming;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={schedule.id} className="hover:bg-slate-50">
                      <TableCell>
                        {vehicle ? (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-mono font-bold">{vehicle.plate}</p>
                              <p className="text-xs text-muted-foreground">
                                {vehicle.brand} {vehicle.model}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Vehículo no encontrado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">
                          {maintenanceTypeLabels[schedule.type] || schedule.customTypeName}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {schedule.scheduleType === 'mileage' && schedule.intervalKm && (
                            <p>Cada {schedule.intervalKm.toLocaleString()} km</p>
                          )}
                          {schedule.scheduleType === 'time' && schedule.intervalDays && (
                            <p>Cada {schedule.intervalDays} días</p>
                          )}
                          {schedule.scheduleType === 'both' && (
                            <>
                              <p>Cada {schedule.intervalKm?.toLocaleString()} km</p>
                              <p className="text-muted-foreground">o {schedule.intervalDays} días</p>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {schedule.nextDueDate || schedule.nextDueMileage ? (
                          <div className="text-sm">
                            {schedule.nextDueDate && (
                              <p>{new Date(schedule.nextDueDate).toLocaleDateString()}</p>
                            )}
                            {schedule.nextDueMileage && (
                              <p className="text-muted-foreground">
                                {schedule.nextDueMileage.toLocaleString()} km
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No definido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {schedule.status === 'overdue' || schedule.status === 'due_soon' ? (
                            <Link href={`/maintenance/work-orders/new?scheduleId=${schedule.id}`}>
                              <Button size="sm" variant="default">
                                Crear OT
                              </Button>
                            </Link>
                          ) : (
                            <Button size="sm" variant="ghost">
                              Ver Detalles
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {schedules.filter((s) => s.isActive).length === 0 && (
          <div className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No hay programaciones activas</p>
          </div>
        )}
      </Card>
    </div>
  );
}
