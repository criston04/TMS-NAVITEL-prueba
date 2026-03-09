/**
 * @fileoverview Página de Alertas de Mantenimiento
 * Gestión y visualización de alertas críticas del sistema
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
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Alert, Vehicle } from '@/types/maintenance';
import Link from 'next/link';

const severityConfig = {
  critical: {
    label: 'Crítica',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  error: {
    label: 'Error',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: AlertTriangle,
  },
  warning: {
    label: 'Advertencia',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Bell,
  },
  info: {
    label: 'Información',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Bell,
  },
} as const;

const statusConfigAlert = {
  active: {
    label: 'Activa',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: Bell,
  },
  acknowledged: {
    label: 'Reconocida',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  resolved: {
    label: 'Resuelta',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  dismissed: {
    label: 'Descartada',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: XCircle,
  },
} as const;

export default function AlertsPage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('active');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertsData, vehiclesData] = await Promise.all([
        maintenance.getAlerts(),
        maintenance.getVehicles(),
      ]);
      setAlerts(alertsData);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehicle = (vehicleId?: string) => {
    if (!vehicleId) return null;
    return vehicles.find((v) => v.id === vehicleId);
  };

  // Filtrado
  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return !alert.isDismissed && !alert.isRead;
    if (filterStatus === 'acknowledged') return alert.isRead && !alert.isDismissed;
    if (filterStatus === 'resolved') return alert.isDismissed;
    return true;
  });

  // Estadísticas
  const stats = {
    total: alerts.length,
    active: alerts.filter((a) => !a.isDismissed && !a.isRead).length,
    critical: alerts.filter((a) => a.severity === 'error' && !a.isDismissed).length,
    acknowledged: alerts.filter((a) => a.isRead && !a.isDismissed).length,
    resolved: alerts.filter((a) => a.isDismissed).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando alertas...</p>
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
            <Bell className="h-8 w-8 text-primary" />
            Alertas de Mantenimiento
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo de alertas y notificaciones críticas
          </p>
        </div>
      </div>

      {/* Alertas Críticas */}
      {stats.critical > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {stats.critical} Alerta{stats.critical > 1 ? 's' : ''} Crítica
                {stats.critical > 1 ? 's' : ''} Activa{stats.critical > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700">Requieren atención inmediata</p>
            </div>
          </div>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Activas</p>
              <p className="text-2xl font-bold text-red-600">{stats.active}</p>
            </div>
            <Bell className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Críticas</p>
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reconocidas</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resueltas</p>
              <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('active')}
            size="sm"
          >
            Activas
          </Button>
          <Button
            variant={filterStatus === 'acknowledged' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('acknowledged')}
            size="sm"
          >
            Reconocidas
          </Button>
          <Button
            variant={filterStatus === 'resolved' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('resolved')}
            size="sm"
          >
            Resueltas
          </Button>
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            Todas
          </Button>
        </div>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severidad</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Mensaje</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts
                .sort((a, b) => {
                  // Ordenar por severidad y fecha
                  const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 };
                  const severityDiff =
                    severityOrder[a.severity as keyof typeof severityOrder] -
                    severityOrder[b.severity as keyof typeof severityOrder];
                  if (severityDiff !== 0) return severityDiff;
                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map((alert) => {
                  const vehicle = getVehicle(alert.vehicleId);
                  const severityInfo =
                    severityConfig[alert.severity as keyof typeof severityConfig] ||
                    severityConfig.info;
                  const SeverityIcon = severityInfo.icon;
                  
                  // Determine status based on isRead and isDismissed
                  let statusInfo;
                  let StatusIcon;
                  if (alert.isDismissed) {
                    statusInfo = statusConfigAlert.dismissed;
                    StatusIcon = statusConfigAlert.dismissed.icon;
                  } else if (alert.isRead) {
                    statusInfo = statusConfigAlert.acknowledged;
                    StatusIcon = statusConfigAlert.acknowledged.icon;
                  } else {
                    statusInfo = statusConfigAlert.active;
                    StatusIcon = statusConfigAlert.active.icon;
                  }

                  return (
                    <TableRow key={alert.id} className="hover:bg-slate-50">
                      <TableCell>
                        <Badge variant="outline" className={severityInfo.color}>
                          <SeverityIcon className="h-3 w-3 mr-1" />
                          {severityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alert.type}</Badge>
                      </TableCell>
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
                        ) : alert.vehicleId ? (
                          <span className="text-sm text-muted-foreground">
                            ID: {alert.vehicleId}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[300px]">{alert.message}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleTimeString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.isRead && !alert.isDismissed && (
                          <Button size="sm" variant="outline">
                            Reconocer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No hay alertas {filterStatus !== 'all' && filterStatus}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
