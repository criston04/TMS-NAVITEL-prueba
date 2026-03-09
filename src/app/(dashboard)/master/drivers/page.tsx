"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { 
  UserCircle, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  MapPin,
  FileSpreadsheet,
  Shield,
  ShieldOff,
  MoreHorizontal,
  Eye,
  Pencil,
  Truck,
  Trash2,
  LayoutGrid,
  List,
  Building2,
  Filter,
  X,
} from "lucide-react";
import { driversService, vehiclesService } from "@/services/master";
import { useService } from "@/hooks/use-service";
import { Driver, DriverStats, DriverStatus, DriverAvailability, LicenseCategory, DriverDocumentType, Vehicle } from "@/types/models";
import { exportToExcel, EXPORT_CONFIGS } from "@/lib/excel-utils";
import { DriverFormModal } from "./components/driver-form-modal";
import type { DriverFormData } from "./components/driver-form-modal";
import { DriverDetailDrawer } from "./components/driver-detail-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";

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
 * Estado de disponibilidad del conductor
 */
function AvailabilityBadge({ availability }: Readonly<{ availability: Driver["availability"] }>) {
  const config: Record<Driver["availability"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle }> = {
    "available": { label: "Disponible", variant: "default", icon: CheckCircle },
    "on-route": { label: "En Ruta", variant: "secondary", icon: MapPin },
    "resting": { label: "Descansando", variant: "outline", icon: Clock },
    "vacation": { label: "Vacaciones", variant: "outline", icon: Clock },
    "suspended": { label: "Suspendido", variant: "destructive", icon: Clock },
    "sick-leave": { label: "Descanso Médico", variant: "outline", icon: Clock },
    "unavailable": { label: "No disponible", variant: "destructive", icon: Clock },
  };

  const availabilityConfig = config[availability] || config["unavailable"];
  const { label, variant, icon: Icon } = availabilityConfig;

  return (
    <Badge variant={variant}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
    </Badge>
  );
}

/**
 * Tarjeta de conductor
 */
function DriverCard({ driver, onView, onEdit, onDelete, isSelected, onToggleSelect }: Readonly<{ 
  driver: Driver;
  onView?: (driver: Driver) => void;
  onEdit?: (driver: Driver) => void;
  onDelete?: (driver: Driver) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string, selected: boolean) => void;
}>) {
  const checklistProgress = driver.checklist?.completionPercentage ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">{driver.firstName} {driver.lastName}</p>
              <p className="text-sm text-muted-foreground">{driver.documentNumber}</p>
            </div>
          </div>
          <AvailabilityBadge availability={driver.availability} />
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
            {driver.isEnabled ? (
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
            <Button variant="ghost" size="sm" onClick={() => onView?.(driver)}>Ver</Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(driver)}>Editar</Button>
          </div>
        </div>

        {/* Documentos por vencer */}
        {driver.documents.some(doc => {
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

const STATS_SKELETON_KEYS = ['stat-1', 'stat-2', 'stat-3', 'stat-4', 'stat-5', 'stat-6'] as const;

/**
 * Página principal de Conductores
 */
export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<DriverAvailability | "all">("all");
  const [licenseFilter, setLicenseFilter] = useState<LicenseCategory | "all">("all");
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
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Verificar si hay filtros activos
  const hasActiveFilters = statusFilter !== "all" || availabilityFilter !== "all" || licenseFilter !== "all" || operatorFilter !== "all";
  
  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setAvailabilityFilter("all");
    setLicenseFilter("all");
    setOperatorFilter("all");
    setSearch("");
  }, []);
  
  // Cargar estadísticas
  const { 
    data: stats, 
    loading: statsLoading,
    execute: refreshStats,
  } = useService<DriverStats>(
    () => driversService.getStats(),
    { immediate: true }
  );

  // Cargar lista de conductores
  const { 
    data: driversRaw, 
    loading: driversLoading,
    execute: refreshDrivers 
  } = useService<Driver[]>(
    () => driversService.getAll({ search }).then(res => res.items),
    { immediate: true }
  );

  // Filtrar conductores localmente
  const filteredDrivers = useMemo(() => {
    return driversRaw?.filter(driver => {
      if (statusFilter !== "all" && driver.status !== statusFilter) return false;
      if (availabilityFilter !== "all" && driver.availability !== availabilityFilter) return false;
      // Soportar tanto license.category como licenseCategory (legacy)
      if (licenseFilter !== "all") {
        const driverLicenseCategory = driver.license?.category || (driver as unknown as { licenseCategory?: string }).licenseCategory;
        if (driverLicenseCategory !== licenseFilter) return false;
      }
      // Filtro por empresa transportista / operador logístico
      if (operatorFilter !== "all") {
        if (driver.operatorId !== operatorFilter) return false;
      }
      return true;
    }) ?? [];
  }, [driversRaw, statusFilter, availabilityFilter, licenseFilter, operatorFilter]);

  // Operadores/empresas transportistas únicos para filtro
  const operatorOptions = useMemo(() => {
    if (!driversRaw) return [];
    const operators = new Map<string, string>();
    driversRaw.forEach(d => {
      if (d.operatorId && d.operatorName) {
        operators.set(d.operatorId, d.operatorName);
      }
    });
    return Array.from(operators.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [driversRaw]);

  // Calcular paginación
  const totalItems = filteredDrivers.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Aplicar paginación
  const paginatedDrivers = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredDrivers.slice(start, end);
  }, [filteredDrivers, page, pageSize]);

  // Alias para compatibilidad
  const drivers = paginatedDrivers;

  // Reset página cuando cambian filtros
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, availabilityFilter, licenseFilter, operatorFilter, search]);

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
      setSelectedIds(new Set(paginatedDrivers.map(d => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [paginatedDrivers]);

  const isAllSelected = paginatedDrivers.length > 0 && 
    paginatedDrivers.every(d => selectedIds.has(d.id));
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected;

  // Re-fetch cuando cambia la búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshDrivers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, refreshDrivers]);

  // Handlers
  const handleOpenCreate = useCallback(() => {
    setSelectedDriver(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    setIsFormModalOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleOpenView = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleOpenDelete = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteDialogOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleRefresh = useCallback(() => {
    refreshDrivers();
    refreshStats();
  }, [refreshDrivers, refreshStats]);

  const handleFormSubmit = useCallback(async (data: DriverFormData) => {
    setIsSubmitting(true);
    try {
      if (selectedDriver) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await driversService.update(selectedDriver.id, data as any);
        toast.success("Conductor actualizado correctamente");
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await driversService.create(data as any);
        toast.success("Conductor creado correctamente");
      }
      setIsFormModalOpen(false);
      setSelectedDriver(null);
      handleRefresh();
    } catch {
      toast.error("Error al guardar conductor");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDriver, handleRefresh]);

  const handleDelete = useCallback(async () => {
    if (!selectedDriver) return;
    setIsSubmitting(true);
    try {
      await driversService.delete(selectedDriver.id);
      toast.success("Conductor eliminado correctamente");
      setIsDeleteDialogOpen(false);
      setSelectedDriver(null);
      handleRefresh();
    } catch {
      toast.error("Error al eliminar conductor");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedDriver, handleRefresh]);

  // Handler de eliminación masiva
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await driversService.bulkDelete(Array.from(selectedIds));
      toast.success(`${selectedIds.size} conductor(es) eliminado(s)`);
      setIsBulkDeleteOpen(false);
      setSelectedIds(new Set());
      handleRefresh();
    } catch {
      toast.error("Error al eliminar conductores");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, handleRefresh]);

  // Cargar vehículos para asignación
  const { data: vehiclesForAssignment } = useService<Vehicle[]>(
    () => vehiclesService.getAll().then(res => res.items),
    { immediate: true }
  );

  // Handler de exportación Excel
  const handleExport = useCallback(() => {
    if (!filteredDrivers || filteredDrivers.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    try {
      exportToExcel(filteredDrivers, EXPORT_CONFIGS.drivers);
      toast.success(`${filteredDrivers.length} conductores exportados`);
    } catch {
      toast.error("Error al exportar datos");
    }
  }, [filteredDrivers]);

  // Handler de asignación conductor-vehículo
  const handleOpenAssignment = useCallback((driver: Driver) => {
    setSelectedDriver(driver);
    setIsAssignmentModalOpen(true);
  }, []);

  const handleAssign = useCallback(async (driverId: string, vehicleId: string) => {
    try {
      await driversService.assignVehicle(driverId, vehicleId);
      toast.success("Vehículo asignado correctamente");
      handleRefresh();
    } catch {
      toast.error("Error al asignar vehículo");
    }
  }, [handleRefresh]);

  const handleUnassign = useCallback(async (driverId: string, vehicleId: string) => {
    try {
      await driversService.unassignVehicle(driverId, vehicleId);
      toast.success("Vehículo desasignado correctamente");
      handleRefresh();
    } catch {
      toast.error("Error al desasignar vehículo");
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
        await driversService.create({
          firstName: String(row.firstName || ""),
          lastName: String(row.lastName || ""),
          documentType: (row.documentType as DriverDocumentType) || "DNI",
          documentNumber: String(row.documentNumber || ""),
          phone: String(row.phone || ""),
          email: String(row.email || ""),
          license: {
            number: String(row.licenseNumber || ""),
            category: (row.licenseCategory as LicenseCategory) || "A-IIa",
            expiryDate: row.licenseExpiry ? String(row.licenseExpiry) : new Date().toISOString().split("T")[0],
          },
          status: "active",
          availability: "available",
          isEnabled: true,
        } as unknown as Parameters<typeof driversService.create>[0]);
        successCount++;
      } catch {
        errorCount++;
        errors.push({
          row: i + 2, // +2 porque la fila 1 es el header
          field: "general",
          message: "Error al crear el conductor",
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
    { excelHeader: "Nombres", fieldKey: "firstName", required: true },
    { excelHeader: "Apellidos", fieldKey: "lastName", required: true },
    { excelHeader: "Tipo Doc", fieldKey: "documentType" },
    { excelHeader: "Nro. Documento", fieldKey: "documentNumber", required: true },
    { excelHeader: "Teléfono", fieldKey: "phone" },
    { excelHeader: "Email", fieldKey: "email" },
    { excelHeader: "Nro. Licencia", fieldKey: "licenseNumber", required: true },
    { excelHeader: "Cat. Licencia", fieldKey: "licenseCategory", required: true },
    { excelHeader: "Venc. Licencia", fieldKey: "licenseExpiry", required: true },
  ];

  const importTemplateConfig = {
    filename: "plantilla_conductores",
    columns: [
      { header: "Nombres", example: "Juan Carlos" },
      { header: "Apellidos", example: "Pérez García" },
      { header: "Tipo Doc", example: "DNI" },
      { header: "Nro. Documento", example: "12345678" },
      { header: "Teléfono", example: "987654321" },
      { header: "Email", example: "juan.perez@email.com" },
      { header: "Nro. Licencia", example: "Q12345678" },
      { header: "Cat. Licencia", example: "A-IIIa" },
      { header: "Venc. Licencia", example: "2027-12-31" },
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
        <StatCard title="Total" value={stats.total} icon={UserCircle} />
        <StatCard title="Habilitados" value={stats.enabled} icon={Shield} variant="success" />
        <StatCard title="Bloqueados" value={stats.blocked} icon={ShieldOff} variant="danger" />
        <StatCard title="Disponibles" value={stats.available} icon={CheckCircle} variant="info" />
        <StatCard title="En Ruta" value={stats.onRoute} icon={MapPin} variant="warning" />
        <StatCard title="Docs por vencer" value={stats.expiringSoon} icon={AlertTriangle} variant="danger" />
      </>
    );
  };

  // Renderizar lista de conductores
  const renderDriversList = () => {
    if (driversLoading) {
      return <CardsSkeleton />;
    }
    
    if (drivers && drivers.length > 0) {
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
                  <TableHead>Conductor</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead>Disponibilidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Documentación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => {
                  // Compatibilidad con datos legacy
                  const driverAny = driver as unknown as { 
                    licenseCategory?: string; 
                    name?: string;
                    licenseNumber?: string;
                  };
                  const licenseCategory = driver.license?.category || driverAny.licenseCategory || "N/A";
                  const checklistProgress = driver.checklist?.completionPercentage ?? 0;
                  
                  return (
                    <TableRow key={driver.id} className={selectedIds.has(driver.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(driver.id)}
                          onCheckedChange={(checked) => handleToggleSelect(driver.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{driver.firstName} {driver.lastName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{driver.documentNumber}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {driver.operatorName || "Sin asignar"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{licenseCategory}</Badge>
                      </TableCell>
                      <TableCell>
                        <AvailabilityBadge availability={driver.availability} />
                      </TableCell>
                      <TableCell>
                        {driver.isEnabled ? (
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
                            <DropdownMenuItem onClick={() => handleOpenView(driver)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(driver)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenAssignment(driver)}>
                              <Truck className="h-4 w-4 mr-2" />
                              Asignar vehículo
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenDelete(driver)}
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
          {drivers.map((driver) => (
            <DriverCard 
              key={driver.id} 
              driver={driver}
              onView={handleOpenView}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              isSelected={selectedIds.has(driver.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>
      );
    }
    
    return (
      <Card>
        <CardContent className="text-center py-12">
          <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay conductores</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "No se encontraron resultados" : "Comienza agregando tu primer conductor"}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Conductor
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageWrapper title="Conductores">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="h-6 w-6" />
            Gestión de Conductores
          </h1>
          <p className="text-muted-foreground">
            Administra conductores y su documentación
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Conductor
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {renderStatsSection()}
      </div>

      {/* Barra de filtros y búsqueda */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          {/* Fila 1: Búsqueda + Toggle vista */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conductor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="h-4 w-4 mr-1" />
                  Limpiar filtros
                </Button>
              )}
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar ({selectedIds.size})
                </Button>
              )}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Fila 2: Filtros */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DriverStatus | "all")}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={availabilityFilter} onValueChange={(v) => setAvailabilityFilter(v as DriverAvailability | "all")}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Disponibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda disponibilidad</SelectItem>
                <SelectItem value="available">Disponible</SelectItem>
                <SelectItem value="on-route">En Ruta</SelectItem>
                <SelectItem value="resting">Descansando</SelectItem>
                <SelectItem value="vacation">Vacaciones</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
                <SelectItem value="sick-leave">Descanso Médico</SelectItem>
                <SelectItem value="unavailable">No disponible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={licenseFilter} onValueChange={(v) => setLicenseFilter(v as LicenseCategory | "all")}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Licencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las licencias</SelectItem>
                <SelectItem value="A-I">A-I</SelectItem>
                <SelectItem value="A-IIa">A-IIa</SelectItem>
                <SelectItem value="A-IIb">A-IIb</SelectItem>
                <SelectItem value="A-IIIa">A-IIIa</SelectItem>
                <SelectItem value="A-IIIb">A-IIIb</SelectItem>
                <SelectItem value="A-IIIc">A-IIIc</SelectItem>
              </SelectContent>
            </Select>

            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Empresa Transportista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las empresas</SelectItem>
                {operatorOptions.map(op => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de conductores */}
      {renderDriversList()}

      {/* Modal de formulario (crear/editar) */}
      <DriverFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        driver={selectedDriver}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      {/* Drawer de detalle */}
      <DriverDetailDrawer
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        driver={selectedDriver}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onAssignVehicle={() => selectedDriver && handleOpenAssignment(selectedDriver)}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar conductor?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al conductor{" "}
              <strong>{selectedDriver?.firstName} {selectedDriver?.lastName}</strong>.
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
            <AlertDialogTitle>¿Eliminar {selectedIds.size} conductor(es)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente los conductores seleccionados.
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
