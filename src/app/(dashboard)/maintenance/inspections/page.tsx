/**
 * @fileoverview Página de Inspecciones de Vehículos
 * Gestión de inspecciones pre-operacionales y periódicas
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
  ClipboardCheck,
  Plus,
  Search,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  User,
  Calendar,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Inspection, Vehicle } from '@/types/maintenance';
import Link from 'next/link';

const statusConfig = {
  completed: {
    label: 'Completada',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Reprobada',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertTriangle,
  },
  expired: {
    label: 'Vencida',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: AlertTriangle,
  },
} as const;

const inspectionTypeLabels: Record<string, string> = {
  pre_trip: 'Pre-Operacional',
  post_trip: 'Post-Operacional',
  periodic: 'Periódica',
  annual: 'Anual',
  technical_review: 'Revisión Técnica',
  custom: 'Personalizada',
};

export default function InspectionsPage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Inspection['status'] | 'all'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inspectionsData, vehiclesData] = await Promise.all([
        maintenance.getInspections(),
        maintenance.getVehicles(),
      ]);
      setInspections(inspectionsData);
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

  // Filtrado
  const filteredInspections = inspections.filter((inspection) => {
    const vehicle = getVehicle(inspection.vehicleId);
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      inspection.performedByName?.toLowerCase().includes(searchLower) ||
      vehicle?.plate?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || inspection.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Estadísticas
  const stats = {
    total: inspections.length,
    completed: inspections.filter((i) => i.status === 'completed').length,
    failed: inspections.filter((i) => i.status === 'failed').length,
    pending: inspections.filter((i) => i.status === 'pending').length,
    expired: inspections.filter((i) => i.status === 'expired').length,
  };
  const handleExport = () => {
    const csvContent = [
      ['Veh\u00edculo', 'Tipo Inspecci\u00f3n', 'Inspector', 'Fecha', 'Estado', 'Kilometraje', 'Observaciones'].join(','),
      ...filteredInspections.map(insp => {
        const vehicle = getVehicle(insp.vehicleId);
        return [
          vehicle?.plate || insp.vehicleId,
          inspectionTypeLabels[insp.type] || insp.type,
          insp.performedByName || '',
          insp.performedDate ? new Date(insp.performedDate).toLocaleDateString() : '',
          statusConfig[insp.status]?.label || insp.status,
          insp.mileage || '',
          (insp.notes || '').replace(/,/g, ';')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inspecciones_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando inspecciones...</p>
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
            <ClipboardCheck className="h-8 w-8 text-primary" />
            Inspecciones de Vehículos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de inspecciones y checklists operacionales
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Link href="/maintenance/inspections/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Inspección
            </Button>
          </Link>
        </div>
      </div>

      {/* Alertas */}
      {stats.failed > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {stats.failed} Inspección{stats.failed > 1 ? 'es' : ''} Reprobada
                {stats.failed > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700">Vehículos fuera de operación</p>
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
            <ClipboardCheck className="h-8 w-8 text-blue-500" />
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
              <p className="text-sm text-muted-foreground">Reprobadas</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vencidas</p>
              <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-500" />
          </div>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por vehículo o inspector..."
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
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
              size="sm"
            >
              Completadas
            </Button>
            <Button
              variant={statusFilter === 'failed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('failed')}
              size="sm"
            >
              Reprobadas
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('pending')}
              size="sm"
            >
              Pendientes
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de Inspecciones */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Inspector</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections
                .sort((a, b) => {
                  const aDate = a.performedDate ? new Date(a.performedDate).getTime() : 0;
                  const bDate = b.performedDate ? new Date(b.performedDate).getTime() : 0;
                  return bDate - aDate;
                })
                .map((inspection) => {
                  const vehicle = getVehicle(inspection.vehicleId);
                  const statusInfo = statusConfig[inspection.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={inspection.id} className="hover:bg-slate-50">
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
                        <Badge variant="outline">
                          {inspectionTypeLabels[inspection.type] || inspection.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">{inspection.performedByName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm">
                            {inspection.performedDate ? new Date(inspection.performedDate).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {inspection.mileage?.toLocaleString() || '-'} km
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {inspection.items?.filter((item) => item.status === 'ok')
                              .length || 0}{' '}
                            /{inspection.items?.length || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Items aprobados</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/maintenance/inspections/${inspection.id}`}>
                          <Button size="sm" variant="ghost">
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Reporte
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
        {filteredInspections.length === 0 && (
          <div className="p-8 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No se encontraron inspecciones</p>
          </div>
        )}
      </Card>
    </div>
  );
}
