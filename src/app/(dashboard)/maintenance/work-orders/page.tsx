/**
 * @fileoverview Página de Órdenes de Trabajo
 * Gestión completa de órdenes de trabajo de mantenimiento
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Truck,
  User,
  Building2,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { WorkOrder, Vehicle, Workshop } from '@/types/maintenance';
import Link from 'next/link';

const statusConfig = {
  pending: {
    label: 'Pendiente',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Clock,
  },
  scheduled: {
    label: 'Programada',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
  in_progress: {
    label: 'En Progreso',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Wrench,
  },
  on_hold: {
    label: 'En Espera',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: AlertCircle,
  },
  waiting_parts: {
    label: 'Esperando Repuestos',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: AlertCircle,
  },
  completed: {
    label: 'Completada',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
} as const;

const priorityConfig = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
} as const;

export default function WorkOrdersPage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrder['status'] | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workOrdersData, vehiclesData, workshopsData] = await Promise.all([
        maintenance.getWorkOrders(),
        maintenance.getVehicles(),
        maintenance.getWorkshops(),
      ]);
      setWorkOrders(workOrdersData);
      setVehicles(vehiclesData);
      setWorkshops(workshopsData);
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
    const filteredOrders = workOrders.filter(wo => {
      const vehicle = getVehicle(wo.vehicleId);
      const matchesSearch = !searchTerm || 
        wo.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const csvContent = [
      ['N\u00famero Orden', 'Veh\u00edculo', 'Tipo', 'Estado', 'Prioridad', 'Fecha Inicio', 'Fecha Fin', 'T\u00e9cnico', 'Costo'].join(','),
      ...filteredOrders.map(wo => {
        const vehicle = getVehicle(wo.vehicleId);
        return [
          wo.orderNumber,
          vehicle?.plate || wo.vehicleId,
          wo.maintenanceType || '',
          statusConfig[wo.status]?.label || wo.status,
          priorityConfig[wo.priority]?.label || wo.priority,
          new Date(wo.startedDate || wo.scheduledDate || wo.createdDate).toLocaleDateString(),
          wo.completedDate ? new Date(wo.completedDate).toLocaleDateString() : '',
          wo.technicianName || '',
          wo.actualCost || wo.estimatedCost || '0'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ordenes_trabajo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getWorkshop = (workshopId: string) => {
    return workshops.find((w) => w.id === workshopId);
  };

  // Filtrado
  const filteredOrders = workOrders.filter((order) => {
    const vehicle = getVehicle(order.vehicleId);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.description?.toLowerCase().includes(searchLower) ||
      vehicle?.plate?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estadísticas
  const stats = {
    total: workOrders.length,
    pending: workOrders.filter((o) => o.status === 'pending').length,
    inProgress: workOrders.filter((o) => o.status === 'in_progress').length,
    completed: workOrders.filter((o) => o.status === 'completed').length,
    totalCost: workOrders.reduce((sum, order) => sum + (order.actualCost || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando órdenes de trabajo...</p>
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
            <ClipboardList className="h-8 w-8 text-primary" />
            Órdenes de Trabajo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de órdenes de mantenimiento y reparación
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Link href="/maintenance/work-orders/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Órdenes</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <ClipboardList className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En Progreso</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <Wrench className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Costo Total</p>
              <p className="text-2xl font-bold">S/ {stats.totalCost.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por OT, vehículo o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Todas
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              size="sm"
            >
              Pendientes
            </Button>
            <Button
              variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('in_progress')}
              size="sm"
            >
              En Progreso
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
              size="sm"
            >
              Completadas
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de Órdenes */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Orden</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Taller</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders
                .sort((a, b) => {
                  // Ordenar por prioridad y fecha
                  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
                  const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
                  if (priorityDiff !== 0) return priorityDiff;
                  return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
                })
                .map((order) => {
                  const vehicle = getVehicle(order.vehicleId);
                  const workshop = order.workshopId
                    ? getWorkshop(order.workshopId)
                    : null;
                  const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;
                  const priorityInfo = priorityConfig[order.priority as keyof typeof priorityConfig] || priorityConfig.normal;

                  return (
                    <TableRow key={order.id} className="hover:bg-slate-50">
                      <TableCell>
                        <p className="font-mono font-bold text-primary">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdDate).toLocaleDateString()}
                        </p>
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
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[200px] truncate" title={order.description}>
                          {order.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        {workshop ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm">{workshop.name}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No asignado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.actualCost ? (
                          <div>
                            <p className="font-medium">S/ {order.actualCost.toLocaleString()}</p>
                            {order.estimatedCost && (
                              <p className="text-xs text-muted-foreground">
                                Est: S/ {order.estimatedCost.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : order.estimatedCost ? (
                          <p className="text-sm text-muted-foreground">
                            Est: S/ {order.estimatedCost.toLocaleString()}
                          </p>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/maintenance/work-orders/${order.id}`}>
                          <Button size="sm" variant="ghost">
                            Ver Detalles
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {filteredOrders.length === 0 && (
          <div className="p-8 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No se encontraron órdenes de trabajo</p>
          </div>
        )}
      </Card>
    </div>
  );
}
