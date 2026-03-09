"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Truck, 
  Plus, 
  Search, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Wrench,
  MapPin,
  FileSpreadsheet,
  Shield,
  ShieldOff,
  Gauge,
  Package,
  MoreHorizontal,
  Eye,
  Pencil,
  UserCircle,
  Trash2,
  Building2,
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";
import { vehiclesService, driversService } from "@/services/master";
import { useService } from "@/hooks/use-service";
import { Vehicle, VehicleStats, VehicleStatus, VehicleOperationalStatus, VehicleType, FuelType, Driver } from "@/types/models";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { exportToExcel, EXPORT_CONFIGS } from "@/lib/excel-utils";
import { VehicleFormModal } from "./components/vehicle-form-modal";
import type { VehicleFormData } from "./components/vehicle-form-modal";
import { VehicleDetailDrawer } from "./components/vehicle-detail-drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Tarjeta de estadísticas
 */
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  variant = "default" 
}: Readonly<{ 
  title: string; 
  value: number | string; 
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}>) {
  const variantStyles = {
    default: "bg-muted/50",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    danger: "bg-red-500/10 text-red-600",
    info: "bg-[#34b7ff]/10 text-[#34b7ff]",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${variantStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Estado operacional del vehículo
 */
function OperationalBadge({ status }: Readonly<{ status: Vehicle["operationalStatus"] }>) {
  const config: Record<Vehicle["operationalStatus"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle }> = {
    "available": { label: "Disponible", variant: "default", icon: CheckCircle },
    "on-route": { label: "En Ruta", variant: "secondary", icon: MapPin },
    "loading": { label: "Cargando", variant: "secondary", icon: Package },
    "unloading": { label: "Descargando", variant: "secondary", icon: Package },
    "maintenance": { label: "Mantenimiento", variant: "outline", icon: Wrench },
    "repair": { label: "En Reparación", variant: "outline", icon: Wrench },
    "inspection": { label: "Inspección", variant: "outline", icon: Shield },
    "standby": { label: "En Espera", variant: "outline", icon: AlertTriangle },
    "inactive": { label: "Inactivo", variant: "destructive", icon: XCircle },
    "operational": { label: "Operativo", variant: "default", icon: CheckCircle },
    "in_transit": { label: "En Tránsito", variant: "secondary", icon: MapPin },
    "parked": { label: "Estacionado", variant: "outline", icon: Truck },
    "in_maintenance": { label: "En Mantenimiento", variant: "outline", icon: Wrench },
    "out_of_service": { label: "Fuera de Servicio", variant: "destructive", icon: XCircle },
  };

  const statusConfig = config[status] || config["inactive"];
  const { label, variant, icon: Icon } = statusConfig;

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

/**
 * Tarjeta de vehículo
 */
function VehicleCard({ vehicle, onView, onEdit, onDelete, isSelected, onToggleSelect }: Readonly<{ 
  vehicle: Vehicle;
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string, selected: boolean) => void;
}>) {
  const checklistProgress = vehicle.checklist?.completionPercentage ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">{vehicle.plate}</p>
              <p className="text-sm text-muted-foreground">
                {vehicle.specs.brand} {vehicle.specs.model} ({vehicle.specs.year})
              </p>
            </div>
          </div>
          <OperationalBadge status={vehicle.operationalStatus} />
        </div>

        {/* Especificaciones */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{(vehicle.capacity?.maxPayload ?? 0).toLocaleString()} kg</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-4 w-4" />
            <span>{vehicle.currentMileage?.toLocaleString() || 0} km</span>
          </div>
        </div>

        {/* Checklist Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Documentación</span>
            <span className={checklistProgress === 100 ? "text-green-600" : "text-yellow-600"}>
              {checklistProgress}%
            </span>
          </div>
          <Progress value={checklistProgress} className="h-2" />
        </div>

        {/* Status y Acciones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {vehicle.isEnabled ? (
              <Badge variant="default" className="bg-green-500">
                <Shield className="h-3 w-3 mr-1" />
                Habilitado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <ShieldOff className="h-3 w-3 mr-1" />
                Bloqueado
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onView?.(vehicle)}>Ver</Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(vehicle)}>Editar</Button>
          </div>
        </div>

        {/* Alertas */}
        {vehicle.documents.some(doc => {
          if (!doc.expirationDate) return false;
          const expiry = new Date(doc.expirationDate);
          const thirtyDays = new Date();
          thirtyDays.setDate(thirtyDays.getDate() + 30);
          return expiry <= thirtyDays && expiry > new Date();
        }) && (
          <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg flex items-center gap-2 text-sm text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            Documentos por vencer
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CARD_SKELETON_KEYS = ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'] as const;

/**
 * Skeleton de carga
 */
function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {CARD_SKELETON_KEYS.map((key) => (
        <Card key={key}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-37.5" />
                <Skeleton className="h-3 w-25" />
              </div>
            </div>
            <Skeleton className="h-2 w-full mb-4" />
            <Skeleton className="h-8 w-25" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const STATS_SKELETON_KEYS = ['stat-1', 'stat-2', 'stat-3', 'stat-4', 'stat-5', 'stat-6', 'stat-7'] as const;

/**
 * Página principal de Vehículos
 */
export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [operationalFilter, setOperationalFilter] = useState<VehicleOperationalStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Verificar si hay filtros activos
  const hasActiveFilters = statusFilter !== "all" || operationalFilter !== "all" || typeFilter !== "all" || operatorFilter !== "all";
  
  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setOperationalFilter("all");
    setTypeFilter("all");
    setOperatorFilter("all");
    setSearch("");
  }, []);
  
  // Cargar estadísticas
  const { 
    data: stats, 
    loading: statsLoading,
    execute: refreshStats,
  } = useService<VehicleStats>(
    () => vehiclesService.getStats(),
    { immediate: true }
  );

  // Cargar lista de vehículos
  const { 
    data: vehiclesRaw, 
    loading: vehiclesLoading,
    execute: refreshVehicles 
  } = useService<Vehicle[]>(
    () => vehiclesService.getAll({ search }).then(res => res.items),
    { immediate: true }
  );

  // Filtrar vehículos localmente
  const filteredVehicles = useMemo(() => {
    return vehiclesRaw?.filter(vehicle => {
      if (statusFilter !== "all" && vehicle.status !== statusFilter) return false;
      if (operationalFilter !== "all" && vehicle.operationalStatus !== operationalFilter) return false;
      if (typeFilter !== "all" && vehicle.type !== typeFilter) return false;
      if (operatorFilter !== "all" && (vehicle.operatorName || "Sin asignar") !== operatorFilter) return false;
      return true;
    }) ?? [];
  }, [vehiclesRaw, statusFilter, operationalFilter, typeFilter, operatorFilter]);

  // Calcular paginación
  const totalItems = filteredVehicles.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Aplicar paginación
  const paginatedVehicles = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredVehicles.slice(start, end);
  }, [filteredVehicles, page, pageSize]);

  // Alias para compatibilidad
  const vehicles = paginatedVehicles;

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, operationalFilter, typeFilter, operatorFilter, search]);

  // Handlers de selección
  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedIds(new Set(paginatedVehicles.map(v => v.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [paginatedVehicles]);

  const isAllSelected = paginatedVehicles.length > 0 && 
    paginatedVehicles.every(v => selectedIds.has(v.id));
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected;

  // Re-fetch cuando cambia la búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshVehicles();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, refreshVehicles]);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setSelectedVehicle(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsFormModalOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleOpenView = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleOpenDelete = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteDialogOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshVehicles();
    refreshStats();
  }, [refreshVehicles, refreshStats]);

  const handleFormSubmit = useCallback(async (data: VehicleFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedVehicle) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vehiclesService.update(selectedVehicle.id, data as any);
        toast.success("Vehículo actualizado correctamente");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vehiclesService.create(data as any);
        toast.success("Vehículo creado correctamente");
      }
      setIsFormModalOpen(false);
      setSelectedVehicle(null);
      handleRefresh();
    } catch {
      toast.error("Error al guardar vehículo");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedVehicle, handleRefresh]);

  const handleDelete = useCallback(async () => {
    if (!selectedVehicle) return;
    setIsSubmitting(true);
    try {
      await vehiclesService.delete(selectedVehicle.id);
      toast.success("Vehículo eliminado correctamente");
      setIsDeleteDialogOpen(false);
      setSelectedVehicle(null);
      handleRefresh();
    } catch {
      toast.error("Error al eliminar vehículo");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedVehicle, handleRefresh]);

  // Handler de eliminación masiva
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await vehiclesService.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} vehículo(s) eliminado(s)`);
      setIsBulkDeleteOpen(false);
      setSelectedIds(new Set());
      handleRefresh();
    } catch {
      toast.error("Error al eliminar vehículos");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, handleRefresh]);

  // Cargar conductores para asignación
  const { data: driversForAssignment } = useService<Driver[]>(
    () => driversService.getAll().then(res => res.items),
    { immediate: true }
  );

  // Handler de exportación Excel
  const handleExport = useCallback(() => {
    if (!filteredVehicles || filteredVehicles.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    try {
      exportToExcel(filteredVehicles, EXPORT_CONFIGS.vehicles);
      toast.success(`${filteredVehicles.length} vehículos exportados`);
    } catch {
      toast.error("Error al exportar datos");
    }
  }, [filteredVehicles]);

  // Handler de asignación vehículo-conductor
  const handleOpenAssignment = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsAssignmentModalOpen(true);
  }, []);

  const handleAssign = useCallback(async (driverId: string, vehicleId: string) => {
    try {
      await vehiclesService.assignDriver(vehicleId, driverId);
      toast.success("Conductor asignado correctamente");
      handleRefresh();
    } catch {
      toast.error("Error al asignar conductor");
    }
  }, [handleRefresh]);

  const handleUnassign = useCallback(async (driverId: string, vehicleId: string) => {
    try {
      await vehiclesService.unassignDriver(vehicleId, driverId);
      toast.success("Conductor desasignado correctamente");
      handleRefresh();
    } catch {
      toast.error("Error al desasignar conductor");
    }
  }, [handleRefresh]);

  // Handler de importación desde Excel
  const handleImport = useCallback(async (data: Record<string, unknown>[]) => {
    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; field: string; message: string; value?: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        await vehiclesService.create({
          plate: String(row.plate || ""),
          type: (row.type as VehicleType) || "camion",
          specs: {
            brand: String(row.brand || ""),
            model: String(row.model || ""),
            year: Number(row.year) || new Date().getFullYear(),
            engineNumber: String(row.engineNumber || ""),
            chassisNumber: String(row.chassisNumber || ""),
            color: String(row.color || ""),
            fuelType: (row.fuelType as FuelType) || "diesel",
          },
          capacity: {
            grossWeight: Number(row.capacityWeight) || 0,
            tareWeight: 0,
            maxPayload: Number(row.capacityWeight) || 0,
            maxVolume: Number(row.capacityVolume) || 0,
            palletCapacity: Number(row.capacityPallets) || 0,
          },
          status: "active",
          operationalStatus: "available",
          isEnabled: true,
          currentMileage: Number(row.mileage) || 0,
        } as unknown as Parameters<typeof vehiclesService.create>[0]);
        successCount++;
      } catch {
        errorCount++;
        errors.push({
          row: i + 2, // +2 porque la fila 1 es el header
          field: "general",
          message: "Error al crear el vehículo",
        });
      }
    }

    handleRefresh();
    return {
      totalRows: data.length,
      successCount,
      errorCount,
      errors,
    };
  }, [handleRefresh]);

  const importColumnMapping = [
    { excelHeader: "Placa", fieldKey: "plate", required: true },
    { excelHeader: "Tipo", fieldKey: "type", required: true },
    { excelHeader: "Marca", fieldKey: "brand", required: true },
    { excelHeader: "Modelo", fieldKey: "model", required: true },
    { excelHeader: "Año", fieldKey: "year", required: true },
    { excelHeader: "Nro. Motor", fieldKey: "engineNumber" },
    { excelHeader: "Nro. Chasis", fieldKey: "chassisNumber" },
    { excelHeader: "Color", fieldKey: "color" },
    { excelHeader: "Combustible", fieldKey: "fuelType" },
    { excelHeader: "Capacidad (Kg)", fieldKey: "capacityWeight" },
    { excelHeader: "Capacidad (m³)", fieldKey: "capacityVolume" },
    { excelHeader: "Capacidad (Pallets)", fieldKey: "capacityPallets" },
    { excelHeader: "Kilometraje", fieldKey: "mileage" },
  ];

  const importTemplateConfig = {
    filename: "plantilla_vehiculos",
    columns: [
      { header: "Placa", example: "ABC-123" },
      { header: "Tipo", example: "camion" },
      { header: "Marca", example: "Volvo" },
      { header: "Modelo", example: "FH16" },
      { header: "Año", example: "2023" },
      { header: "Nro. Motor", example: "MOT12345678" },
      { header: "Nro. Chasis", example: "CHS12345678" },
      { header: "Color", example: "Blanco" },
      { header: "Combustible", example: "diesel" },
      { header: "Capacidad (Kg)", example: "25000" },
      { header: "Capacidad (m³)", example: "80" },
      { header: "Capacidad (Pallets)", example: "24" },
      { header: "Kilometraje", example: "50000" },
    ],
  };

  // Renderizar estadísticas
  const renderStatsSection = () => {
    if (statsLoading) {
      return STATS_SKELETON_KEYS.map((key) => (
        <Card key={key}>
          <CardContent className="p-4">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ));
    }
    
    if (!stats) return null;
    
    return (
      <>
        <StatCard title="Total" value={stats.total} icon={Truck} />
        <StatCard title="Habilitados" value={stats.enabled} icon={Shield} variant="success" />
        <StatCard title="Bloqueados" value={stats.blocked} icon={ShieldOff} variant="danger" />
        <StatCard title="Disponibles" value={stats.available} icon={CheckCircle} variant="info" />
        <StatCard title="En Ruta" value={stats.onRoute} icon={MapPin} variant="warning" />
        <StatCard title="Mantenimiento" value={stats.inMaintenance} icon={Wrench} variant="warning" />
        <StatCard title="Docs por vencer" value={stats.expiringSoon} icon={AlertTriangle} variant="danger" />
      </>
    );
  };

  // Renderizar lista de vehículos
  const renderVehiclesList = () => {
    if (vehiclesLoading) {
      return <CardsSkeleton />;
    }
    
    if (vehicles && vehicles.length > 0) {
      // Vista de tabla
      if (viewMode === "table") {
        return (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      className={isPartialSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Habilitación</TableHead>
                  <TableHead>Kilometraje</TableHead>
                  <TableHead>Documentación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => {
                  const checklistProgress = vehicle.checklist?.completionPercentage ?? 0;
                  
                  return (
                    <TableRow key={vehicle.id} className={selectedIds.has(vehicle.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(vehicle.id)}
                          onCheckedChange={(checked) => handleToggleSelect(vehicle.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Truck className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.specs?.brand} {vehicle.specs?.model}</p>
                            <p className="text-sm text-muted-foreground">{vehicle.specs?.year}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{vehicle.plate}</Badge>
                      </TableCell>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{vehicle.operatorName || "Sin asignar"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OperationalBadge status={vehicle.operationalStatus} />
                      </TableCell>
                      <TableCell>
                        {vehicle.isEnabled ? (
                          <Badge variant="default" className="bg-green-500">
                            <Shield className="h-3 w-3 mr-1" />
                            Habilitado
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <ShieldOff className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          {vehicle.currentMileage?.toLocaleString() ?? 0} km
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={checklistProgress} className="w-16 h-2" />
                          <span className="text-sm">{checklistProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenView(vehicle)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(vehicle)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAssignment(vehicle)}>
                              <UserCircle className="h-4 w-4 mr-2" />
                              Asignar conductor
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenDelete(vehicle)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        );
      }
      
      // Vista de tarjetas
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <VehicleCard 
              key={vehicle.id} 
              vehicle={vehicle}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              isSelected={selectedIds.has(vehicle.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      );
    }
    
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay vehículos</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "No se encontraron resultados" : "Comienza agregando tu primer vehículo"}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Vehículo
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageWrapper title="Vehículos">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Gestión de Vehículos
          </h1>
          <p className="text-muted-foreground">
            Administra tu flota vehicular
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Vehículo
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
        {renderStatsSection()}
      </div>

      {/* Búsqueda y Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar vehículo (placa, marca)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as VehicleStatus | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as VehicleType | "all")}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="camion">Camión</SelectItem>
                <SelectItem value="tractocamion">Tractocamión</SelectItem>
                <SelectItem value="remolque">Remolque</SelectItem>
                <SelectItem value="semiremolque">Semiremolque</SelectItem>
                <SelectItem value="furgoneta">Furgoneta</SelectItem>
                <SelectItem value="pickup">Pickup</SelectItem>
                <SelectItem value="cisterna">Cisterna</SelectItem>
                <SelectItem value="volquete">Volquete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="w-52">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Empresa transportista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {Array.from(new Set(vehiclesRaw?.map(v => v.operatorName || "Sin asignar") ?? [])).sort().map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de vehículos */}
      {renderVehiclesList()}

      {/* Modal de formulario (crear/editar) */}
      <VehicleFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        vehicle={selectedVehicle}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      {/* Drawer de detalle */}
      <VehicleDetailDrawer
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        vehicle={selectedVehicle}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onAssignDriver={() => selectedVehicle && handleOpenAssignment(selectedVehicle)}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el vehículo{" "}
              <strong>{selectedVehicle?.plate}</strong> ({selectedVehicle?.specs?.brand} {selectedVehicle?.specs?.model}).
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de eliminación masiva */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} vehículo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los vehículos seleccionados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Eliminando..." : `Eliminar ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
