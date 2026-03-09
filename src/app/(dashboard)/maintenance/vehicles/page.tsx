/**
 * @fileoverview Página de Gestión de Vehículos
 * Lista, filtros, creación y edición de vehículos de la flota
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertModal } from '@/components/ui/alert-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Truck,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import { useMaintenance } from '@/hooks/useMaintenance';
import type { Vehicle } from '@/types/maintenance';
import Link from 'next/link';

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

export default function VehiclesPage() {
  const maintenance = useMaintenance();
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [importAlert, setImportAlert] = useState<{ open: boolean; count: number }>({ open: false, count: 0 });

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await maintenance.getVehicles();
      setVehicles(data);
      setFilteredVehicles(data);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = [...vehicles];

    // Filtro por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.plate.toLowerCase().includes(search) ||
          v.brand.toLowerCase().includes(search) ||
          v.model.toLowerCase().includes(search) ||
          v.vin?.toLowerCase().includes(search)
      );
    }

    // Filtro por estado
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    // Filtro por tipo
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter((v) => v.type === typeFilter);
    }

    setFilteredVehicles(filtered);
  };

  const handleExport = () => {
    const csvContent = [
      ['Placa', 'Tipo', 'Marca', 'Modelo', 'Año', 'VIN', 'Kilometraje', 'Estado', 'Próximo Mantenimiento'].join(','),
      ...filteredVehicles.map(v => [
        v.plate,
        vehicleTypeLabels[v.type],
        v.brand,
        v.model,
        v.year,
        v.vin || '',
        v.currentMileage,
        statusConfig[v.status as keyof typeof statusConfig]?.label || v.status,
        v.nextMaintenanceDue ? new Date(v.nextMaintenanceDue).toLocaleDateString() : 'No programado'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vehiculos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').slice(1); // Skip header
        
        let successCount = 0;
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const [plate, type, brand, model, year, vin, mileage] = line.split(',');
          try {
            await maintenance.createVehicle({
              plate: plate.trim(),
              type: type.trim().toLowerCase() as Vehicle['type'],
              brand: brand.trim(),
              model: model.trim(),
              year: parseInt(year),
              vin: vin.trim(),
              currentMileage: parseInt(mileage),
              fuelType: 'diesel',
              capacityKg: 0,
              transmission: 'manual',
              maintenanceKmInterval: 5000,
              maintenanceDaysInterval: 90,
              status: 'active',
              lastMileageUpdate: new Date().toISOString(),
              createdBy: 'system',
            });
            successCount++;
          } catch (error) {
            console.error('Error importing vehicle:', error);
          }
        }
        
        setImportAlert({ open: true, count: successCount });
        loadVehicles();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Estadísticas
  const stats = {
    total: vehicles.length,
    active: vehicles.filter((v) => v.status === 'active').length,
    maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    outOfService: vehicles.filter((v) => v.status === 'out_of_service').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando vehículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>          <Link href="/maintenance">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            Gestión de Vehículos
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra tu flota de vehículos
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleImport}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <Link href="/maintenance/vehicles/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Vehículo
            </Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Vehículos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Truck className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">En Mantenimiento</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Fuera de Servicio</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfService}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, marca, modelo o VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                <SelectItem value="out_of_service">Fuera de Servicio</SelectItem>
                <SelectItem value="reserved">Reservado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="truck">Camión</SelectItem>
                <SelectItem value="van">Furgoneta</SelectItem>
                <SelectItem value="pickup">Camioneta</SelectItem>
                <SelectItem value="trailer">Tráiler</SelectItem>
                <SelectItem value="car">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabla de Vehículos */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Próx. Mant.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => {
                const statusInfo = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.active;
                const StatusIcon = statusInfo.icon;
                const daysUntilMaintenance = vehicle.nextMaintenanceDue
                  ? Math.ceil(
                      (new Date(vehicle.nextMaintenanceDue).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  : null;

                return (
                  <TableRow key={vehicle.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-bold">{vehicle.plate}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{vehicleTypeLabels[vehicle.type]}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vehicle.brand}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.year}</TableCell>
                    <TableCell>
                      <span className="font-mono">{vehicle.currentMileage.toLocaleString()} km</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusInfo.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.nextMaintenanceDue ? (
                        <div>
                          <p className="text-sm">
                            {new Date(vehicle.nextMaintenanceDue).toLocaleDateString()}
                          </p>
                          {daysUntilMaintenance !== null && (
                            <p
                              className={`text-xs ${
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
                      ) : (
                        <span className="text-sm text-muted-foreground">No programado</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/maintenance/vehicles/${vehicle.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/maintenance/vehicles/${vehicle.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filteredVehicles.length === 0 && (
          <div className="p-8 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No se encontraron vehículos</p>
          </div>
        )}
      </Card>
      <AlertModal
        open={importAlert.open}
        onOpenChange={(open) => setImportAlert({ open, count: 0 })}
        title="Importación exitosa"
        description={`Se importaron ${importAlert.count} vehículos exitosamente.`}
        variant="success"
      />
    </div>
  );
}
