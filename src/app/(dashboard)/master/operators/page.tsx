'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageWrapper } from '@/components/page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  Truck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { operatorsService } from '@/services/master';
import type { CreateOperatorDTO } from '@/services/master';
import { useService } from '@/hooks/use-service';
import type { Operator, OperatorStats, OperatorType, OperatorStatus } from '@/types/models/operator';
import { OperatorFormModal } from './components/operator-form-modal';
import type { OperatorFormData } from './components/operator-form-modal';
import { OperatorDetailDrawer } from './components/operator-detail-drawer';

/**
 * Tarjeta de estadísticas
 */
function StatCard({ title, value, icon: Icon, variant = 'default' }: Readonly<{
  title: string;
  value: number | string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}>) {
  const variantStyles = {
    default: 'bg-muted/50',
    success: 'bg-green-500/10 text-green-600',
    warning: 'bg-yellow-500/10 text-yellow-600',
    danger: 'bg-red-500/10 text-red-600',
    info: 'bg-[#34b7ff]/10 text-[#34b7ff]',
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

const statusConfig: Record<OperatorStatus, { label: string; variant: 'default' | 'destructive' | 'outline'; icon: typeof CheckCircle; className: string }> = {
  enabled: { label: 'Habilitado', variant: 'default', icon: CheckCircle, className: 'bg-green-500' },
  blocked: { label: 'Bloqueado', variant: 'destructive', icon: XCircle, className: '' },
  pending: { label: 'Pendiente', variant: 'outline', icon: AlertTriangle, className: 'border-amber-500 text-amber-600' },
};

const typeLabels: Record<OperatorType, string> = {
  propio: 'Propio',
  tercero: 'Tercero',
  asociado: 'Asociado',
};

const STATS_SKELETON_KEYS = ['stat-1', 'stat-2', 'stat-3', 'stat-4', 'stat-5', 'stat-6'] as const;

export default function OperatorsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<OperatorType | 'all'>('all');
  const [statusFilterValue, setStatusFilterValue] = useState<OperatorStatus | 'all'>('all');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasActiveFilters = typeFilter !== 'all' || statusFilterValue !== 'all';

  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilterValue('all');
    setSearch('');
  }, []);

  // Cargar estadísticas
  const {
    data: stats,
    loading: statsLoading,
    execute: refreshStats,
  } = useService<OperatorStats>(
    () => operatorsService.getStats(),
    { immediate: true }
  );

  // Cargar lista de operadores
  const {
    data: operatorsRaw,
    loading: operatorsLoading,
    execute: refreshOperators,
  } = useService<Operator[]>(
    () => operatorsService.getAll({ search }),
    { immediate: true }
  );

  // Filtrar localmente
  const filteredOperators = useMemo(() => {
    return operatorsRaw?.filter(op => {
      if (typeFilter !== 'all' && op.type !== typeFilter) return false;
      if (statusFilterValue !== 'all' && op.status !== statusFilterValue) return false;
      return true;
    }) ?? [];
  }, [operatorsRaw, typeFilter, statusFilterValue]);

  // Re-fetch cuando cambia la búsqueda
  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshOperators();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, refreshOperators]);

  // Handlers
  const handleRefresh = useCallback(() => {
    refreshOperators();
    refreshStats();
  }, [refreshOperators, refreshStats]);

  const handleOpenCreate = useCallback(() => {
    setSelectedOperator(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((operator: Operator) => {
    setSelectedOperator(operator);
    setIsFormModalOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleOpenView = useCallback((operator: Operator) => {
    setSelectedOperator(operator);
    setIsDetailDrawerOpen(true);
  }, []);

  const handleOpenDelete = useCallback((operator: Operator) => {
    setSelectedOperator(operator);
    setIsDeleteDialogOpen(true);
    setIsDetailDrawerOpen(false);
  }, []);

  const handleFormSubmit = useCallback(async (data: OperatorFormData) => {
    setIsSubmitting(true);
    try {
      const dto: CreateOperatorDTO = {
        ruc: data.ruc,
        businessName: data.businessName,
        tradeName: data.tradeName,
        type: data.type,
        email: data.email,
        phone: data.phone,
        fiscalAddress: data.fiscalAddress,
        contacts: data.contactName ? [{
          id: `cont-${Date.now()}`,
          name: data.contactName,
          position: data.contactPosition || '',
          email: data.contactEmail || '',
          phone: data.contactPhone || '',
          isPrimary: true,
        }] : [],
        contractStartDate: data.contractStartDate,
        contractEndDate: data.contractEndDate,
        notes: data.notes,
      };

      if (selectedOperator) {
        await operatorsService.update(selectedOperator.id, dto);
        toast.success('Operador actualizado correctamente');
      } else {
        await operatorsService.create(dto);
        toast.success('Operador registrado correctamente');
      }
      setIsFormModalOpen(false);
      setSelectedOperator(null);
      handleRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar operador';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOperator, handleRefresh]);

  const handleDelete = useCallback(async () => {
    if (!selectedOperator) return;
    setIsSubmitting(true);
    try {
      await operatorsService.delete(selectedOperator.id);
      toast.success('Operador eliminado correctamente');
      setIsDeleteDialogOpen(false);
      setSelectedOperator(null);
      handleRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar operador';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedOperator, handleRefresh]);

  // Renderizar estadísticas  
  const renderStatsSection = () => {
    if (statsLoading) {
      return STATS_SKELETON_KEYS.map(key => (
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
        <StatCard title="Total" value={stats.total} icon={Building2} />
        <StatCard title="Habilitados" value={stats.enabled} icon={CheckCircle} variant="success" />
        <StatCard title="Bloqueados" value={stats.blocked} icon={XCircle} variant="danger" />
        <StatCard title="Por Validar" value={stats.pendingValidation} icon={AlertTriangle} variant="warning" />
        <StatCard title="Propios" value={stats.propios} icon={Truck} variant="info" />
        <StatCard title="Terceros" value={stats.terceros} icon={Users} variant="info" />
      </>
    );
  };

  return (
    <PageWrapper title="Operadores Logísticos">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Gestión de Operadores Logísticos
          </h1>
          <p className="text-muted-foreground">
            Administra operadores logísticos con validación y checklist
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Operador
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {renderStatsSection()}
      </div>

      {/* Búsqueda y Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, RUC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilterValue} onValueChange={(v) => setStatusFilterValue(v as OperatorStatus | 'all')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="enabled">Habilitado</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as OperatorType | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="propio">Propio</SelectItem>
                <SelectItem value="tercero">Tercero</SelectItem>
                <SelectItem value="asociado">Asociado</SelectItem>
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

      {/* Tabla de operadores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Lista de Operadores Logísticos
            <Badge variant="outline" className="text-xs">
              {filteredOperators.length} registro{filteredOperators.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {operatorsLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOperators.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead>RUC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Validación</TableHead>
                  <TableHead>Vehículos</TableHead>
                  <TableHead>Conductores</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperators.map(op => {
                  const stConfig = statusConfig[op.status] || statusConfig.pending;
                  const StIcon = stConfig.icon;
                  const checkPct = op.checklist?.items?.length
                    ? Math.round(
                        (op.checklist.items.filter(i => i.checked).length / op.checklist.items.length) * 100
                      )
                    : 0;

                  return (
                    <TableRow key={op.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{op.tradeName || op.businessName}</p>
                            <p className="text-xs text-muted-foreground">{op.code}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{op.ruc}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{typeLabels[op.type]}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={stConfig.variant} className={stConfig.className}>
                          <StIcon className="h-3 w-3 mr-1" />
                          {stConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={checkPct} className="w-16 h-2" />
                          <span className="text-sm">{checkPct}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{op.vehiclesCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{op.driversCount}</span>
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
                            <DropdownMenuItem onClick={() => handleOpenView(op)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(op)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDelete(op)}
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No hay operadores registrados</h3>
              <p className="text-muted-foreground mb-4">
                {search ? 'No se encontraron resultados' : 'Registra operadores manualmente'}
              </p>
              {!search && (
                <Button onClick={handleOpenCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Operador
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulario */}
      <OperatorFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        operator={selectedOperator}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      {/* Drawer de detalle */}
      <OperatorDetailDrawer
        open={isDetailDrawerOpen}
        onOpenChange={setIsDetailDrawerOpen}
        operator={selectedOperator}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />

      {/* Diálogo de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar operador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al operador{' '}
              <strong>{selectedOperator?.tradeName || selectedOperator?.businessName}</strong> (RUC: {selectedOperator?.ruc}).
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
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
