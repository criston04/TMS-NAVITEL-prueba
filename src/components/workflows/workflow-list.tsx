'use client';

import { type FC, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, LayoutGrid, List, Filter, X, GitBranch,
  CheckCircle2, Clock, FileText as FileTextIcon, TrendingUp,
  PlayCircle, PauseCircle, ArrowUpDown, ArrowUp, ArrowDown,
  SlidersHorizontal, Route, Activity, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowCard } from './workflow-card';
import type { Workflow, WorkflowStatus } from '@/types/workflow';
import { workflowTypes, workflowStatusConfig } from '@/mocks/master/workflows.mock';

interface WorkflowListProps {
  workflows: Workflow[];
  onCreateNew: () => void;
  onSelect: (workflow: Workflow) => void;
  onEdit: (workflow: Workflow) => void;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onToggleStatus: (workflow: Workflow) => void;
  isLoading?: boolean;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'status' | 'steps' | 'date' | 'code';
type SortDirection = 'asc' | 'desc';

interface ActiveFilters {
  search: string;
  status: WorkflowStatus | 'all';
  type: string;
}

const SORT_LABELS: Record<SortField, string> = {
  name: 'Nombre',
  status: 'Estado',
  steps: 'Hitos',
  date: 'Fecha',
  code: 'Código',
};

const STATUS_ORDER: Record<WorkflowStatus, number> = {
  active: 0,
  draft: 1,
  inactive: 2,
};

export const WorkflowList: FC<WorkflowListProps> = ({
  workflows,
  onCreateNew,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  isLoading = false,
  className,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState<ActiveFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);

  const filteredWorkflows = useMemo(() => {
    let result = workflows.filter(workflow => {
      // Filtro por búsqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          workflow.name.toLowerCase().includes(searchLower) ||
          workflow.code.toLowerCase().includes(searchLower) ||
          workflow.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Filtro por estado
      if (filters.status !== 'all' && workflow.status !== filters.status) {
        return false;
      }

      // Filtro por tipo
      if (filters.type !== 'all') {
        const hasType = workflow.applicableCargoTypes?.some(ct =>
          ct.toLowerCase().includes(filters.type.toLowerCase())
        ) || workflow.code.toLowerCase().includes(filters.type.substring(0, 3).toLowerCase());
        if (!hasType) return false;
      }

      return true;
    });

    // Sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'status':
          comparison = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'steps':
          comparison = a.steps.length - b.steps.length;
          break;
        case 'date':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [workflows, filters, sortField, sortDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status !== 'all') count++;
    if (filters.type !== 'all') count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({ search: '', status: 'all', type: 'all' });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const stats = useMemo(() => ({
    total: workflows.length,
    active: workflows.filter(w => w.status === 'active').length,
    inactive: workflows.filter(w => w.status === 'inactive').length,
    draft: workflows.filter(w => w.status === 'draft').length,
  }), [workflows]);

  const getActiveFilterLabel = (key: string, value: string): string | null => {
    if (key === 'status' && value !== 'all') return workflowStatusConfig[value as WorkflowStatus]?.label ?? value;
    if (key === 'type' && value !== 'all') return workflowTypes.find(t => t.value === value)?.label ?? value;
    if (key === 'search' && value) return `"${value}"`;
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Skeleton para header */}
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        </div>
        {/* Skeleton para cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-200 dark:bg-slate-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Fixed Header Section */}
      <div className="flex-none p-6 pb-4 border-b space-y-4 bg-card/30">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Workflows</h2>
            <p className="text-sm text-muted-foreground mt-1">Gestión de procesos operativos</p>
          </div>
          <Button onClick={onCreateNew} className="h-9 gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Workflow</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total workflows', value: stats.total, icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Activos', value: stats.active, icon: PlayCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Inactivos', value: stats.inactive, icon: PauseCircle, color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20' },
            { label: 'Borradores', value: stats.draft, icon: FileTextIcon, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Tasa de éxito', value: `${stats.active > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3.5 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{kpi.label}</span>
                  <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', kpi.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', kpi.color)} />
                  </div>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">{kpi.value}</span>
              </div>
            );
          })}
        </div>

        {/* Search + Actions bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            {/* Búsqueda */}
            <div className="relative flex-1 sm:flex-none sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o descripción..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9 h-9 text-sm"
              />
              {filters.search && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Toggle Filtros */}
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1.5 relative"
              onClick={() => setShowFilters(prev => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Sort */}
            <div className="flex items-center h-9 border rounded-lg overflow-hidden bg-background">
              <Button
                variant="ghost"
                size="sm"
                className="h-full px-2.5 rounded-none hover:bg-muted border-r"
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <Select
                value={sortField}
                onValueChange={(val) => setSortField(val as SortField)}
              >
                <SelectTrigger className="h-full border-0 shadow-none rounded-none w-[120px] text-xs focus:ring-0">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([field, label]) => (
                    <SelectItem key={field} value={field}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center border rounded-lg overflow-hidden bg-background">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-9 px-3 rounded-none gap-1.5 text-xs transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'hover:bg-muted'
                )}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cuadrícula</span>
              </Button>
              <div className="w-px h-5 bg-border" />
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  'h-9 px-3 rounded-none gap-1.5 text-xs transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'hover:bg-muted'
                )}
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Expandable Filters Panel */}
        {showFilters && (
          <div className="bg-muted/40 rounded-xl border border-border/60 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por</span>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1">
                  <X className="h-3 w-3" />
                  Limpiar todo
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Estado filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Estado</label>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant={filters.status === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                  >
                    Todos
                  </Button>
                  {Object.entries(workflowStatusConfig).map(([key, config]) => (
                    <Button
                      key={key}
                      variant={filters.status === key ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-2.5 rounded-full gap-1.5"
                      onClick={() => setFilters(prev => ({ ...prev, status: key as WorkflowStatus }))}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="h-10 w-px bg-border hidden sm:block" />

              {/* Tipo filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
                <div className="flex items-center gap-1 flex-wrap">
                  <Button
                    variant={filters.type === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2.5 rounded-full"
                    onClick={() => setFilters(prev => ({ ...prev, type: 'all' }))}
                  >
                    Todos
                  </Button>
                  {workflowTypes.map(type => (
                    <Button
                      key={type.value}
                      variant={filters.type === type.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs px-2.5 rounded-full"
                      onClick={() => setFilters(prev => ({ ...prev, type: type.value }))}
                    >
                      {type.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex items-center gap-2 flex-wrap animate-in fade-in duration-200">
            <span className="text-[11px] text-muted-foreground font-medium">Filtrando por:</span>
            {Object.entries(filters).map(([key, value]) => {
              const label = getActiveFilterLabel(key, value);
              if (!label) return null;
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="h-6 pl-2 pr-1 text-xs gap-1 rounded-full bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer group/chip"
                  onClick={() => {
                    if (key === 'search') setFilters(prev => ({ ...prev, search: '' }));
                    if (key === 'status') setFilters(prev => ({ ...prev, status: 'all' }));
                    if (key === 'type') setFilters(prev => ({ ...prev, type: 'all' }));
                  }}
                >
                  {key === 'search' ? 'Búsqueda' : key === 'status' ? 'Estado' : 'Tipo'}: {label}
                  <X className="h-3 w-3 opacity-50 group-hover/chip:opacity-100" />
                </Badge>
              );
            })}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-[11px] text-muted-foreground px-1.5">
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto bg-muted/5 p-6">
        {/* Results counter */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {filteredWorkflows.length === workflows.length
              ? `${filteredWorkflows.length} workflows`
              : `${filteredWorkflows.length} de ${workflows.length} workflows`
            }
          </span>
          {viewMode === 'list' && (
            <span className="text-[11px] text-muted-foreground hidden lg:block">
              Ordenado por: <span className="font-medium text-foreground">{SORT_LABELS[sortField]}</span>
              {sortDirection === 'asc' ? ' ↑' : ' ↓'}
            </span>
          )}
        </div>

        {/* List view table header */}
        {viewMode === 'list' && filteredWorkflows.length > 0 && (
          <div className="hidden md:flex items-center gap-4 px-4 py-2.5 mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 rounded-lg border border-border/50">
            <div className="w-10 shrink-0" /> {/* Icon space */}
            <button
              className="min-w-[180px] max-w-[220px] shrink-0 flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer text-left"
              onClick={() => toggleSort('name')}
            >
              Nombre
              {sortField === 'name' && (
                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
              )}
            </button>
            <button
              className="flex-1 min-w-0 hidden md:flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer text-left"
              onClick={() => toggleSort('name')}
            >
              Descripción
            </button>
            <div className="hidden lg:block w-[140px] shrink-0 text-center">Hitos</div>
            <div className="hidden sm:flex items-center gap-3 shrink-0 w-[180px] justify-center">
              <button
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                onClick={() => toggleSort('steps')}
              >
                Métricas
                {sortField === 'steps' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </div>
            <button
              className="shrink-0 w-[100px] flex items-center justify-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              onClick={() => toggleSort('status')}
            >
              Estado
              {sortField === 'status' && (
                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
              )}
            </button>
            <div className="hidden xl:block w-[70px] shrink-0 text-right">Info</div>
            <div className="w-8 shrink-0" /> {/* Actions space */}
          </div>
        )}

        {/* Empty State */}
        {filteredWorkflows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl bg-card/50">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No se encontraron workflows</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
              {activeFilterCount > 0
                ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que necesitas.'
                : 'Comienza creando tu primer workflow operacional.'}
            </p>
            {activeFilterCount > 0 ? (
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            ) : (
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Workflow
              </Button>
            )}
          </div>
        ) : (
          /* Grid/List */
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'flex flex-col gap-2'
            )}
          >
            {filteredWorkflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onSelect={onSelect}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
