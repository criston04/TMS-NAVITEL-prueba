'use client';

import { memo, useState, useMemo } from 'react';
import {
  Search,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Plus,
  PlayCircle,
  StopCircle,
  FileText
} from 'lucide-react';
import type { Workflow, WorkflowStatus } from '@/types/workflow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface WorkflowSidebarProps {
  
  workflows: Workflow[];
  /** Workflow seleccionado */
  selectedWorkflow: Workflow | null;
  
  isLoading?: boolean;
  /** Callback al seleccionar workflow */
  onSelectWorkflow: (workflow: Workflow) => void;
  /** Callback al crear nuevo */
  onCreateNew: () => void;
  /** Panel colapsado */
  isCollapsed?: boolean;
  /** Toggle colapsar */
  onToggleCollapse?: () => void;
  /** Clase adicional */
  className?: string;
}

const STATUS_CONFIG: Record<WorkflowStatus, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof PlayCircle;
}> = {
  active: { label: 'Activo', color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: PlayCircle },
  inactive: { label: 'Inactivo', color: '#6b7280', bgColor: 'bg-gray-100 dark:bg-gray-800', icon: StopCircle },
  draft: { label: 'Borrador', color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: FileText },
};

// MINI CARD DE WORKFLOW

interface WorkflowMiniCardProps {
  workflow: Workflow;
  isSelected: boolean;
  onClick: () => void;
}

const WorkflowMiniCard = memo(function WorkflowMiniCard({
  workflow,
  isSelected,
  onClick,
}: WorkflowMiniCardProps) {
  const statusConfig = STATUS_CONFIG[workflow.status];
  const StatusIcon = statusConfig.icon;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-3 rounded-lg text-left transition-all duration-200 group',
        'border relative overflow-hidden',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      )}
    >
      {/* Indicador de selección lateral */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2 pl-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <StatusIcon 
            className="w-4 h-4 shrink-0 transition-colors" 
            style={{ color: statusConfig.color }}
          />
          <span className={cn(
            "font-medium text-sm truncate",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {workflow.name}
          </span>
        </div>
      </div>

      {/* Code & Steps */}
      <div className="flex items-center gap-3 pl-8 text-xs text-muted-foreground">
        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
          {workflow.code}
        </span>
        <span>•</span>
        <span>{workflow.steps.length} pasos</span>
      </div>
      
      {/* Date */}
      <div className="mt-2 pl-8 text-[10px] text-muted-foreground/60">
        Actualizado: {new Date(workflow.updatedAt).toLocaleDateString()}
      </div>
    </button>
  );
});

// COMPONENTE PRINCIPAL

export const WorkflowSidebar = memo(function WorkflowSidebar({
  workflows,
  selectedWorkflow,
  isLoading = false,
  onSelectWorkflow,
  onCreateNew,
  isCollapsed = false,
  onToggleCollapse,
  className,
}: Readonly<WorkflowSidebarProps>) {
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');

  // ----------------------------------------
  // FILTRADO
  // ----------------------------------------
  const filteredWorkflows = useMemo(() => {
    let result = [...workflows];

    // Filtro por búsqueda
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        w =>
          w.name.toLowerCase().includes(search) ||
          w.code.toLowerCase().includes(search) ||
          w.description?.toLowerCase().includes(search)
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      result = result.filter(w => w.status === statusFilter);
    }

    return result;
  }, [workflows, searchValue, statusFilter]);

  // ----------------------------------------
  // COLAPSADO
  // ----------------------------------------
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'w-14 flex flex-col items-center py-4 border-r bg-card/50 backdrop-blur-sm',
          className
        )}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 mb-4"
                onClick={onToggleCollapse}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expandir panel</TooltipContent>
          </Tooltip>

          <Separator className="w-8 mb-4" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 mb-2 rounded-full shadow-lg"
                onClick={onCreateNew}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Nuevo workflow</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // ----------------------------------------
  // EXPANDIDO
  // ----------------------------------------
  return (
    <div
      className={cn(
        'w-80 flex flex-col border-r bg-card/50 backdrop-blur-sm',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold leading-tight">Workflows</h2>
              <p className="text-xs text-muted-foreground">{workflows.length} definidos</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 h-10 text-sm bg-background/50"
          />
        </div>

        {/* Filtros de estado */}
        <ScrollArea className="w-full pb-1">
          <div className="flex gap-1.5 w-max">
            <Button
              variant={statusFilter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs px-3 rounded-full"
              onClick={() => setStatusFilter('all')}
            >
              Todos
            </Button>
            {(['active', 'inactive', 'draft'] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'secondary' : 'ghost'}
                size="sm"
                className={cn(
                  "h-7 text-xs px-3 rounded-full flex gap-1.5 items-center",
                  statusFilter === status && "bg-secondary font-medium"
                )}
                onClick={() => setStatusFilter(status)}
              >
                <div 
                  className="w-1.5 h-1.5 rounded-full" 
                  style={{ backgroundColor: STATUS_CONFIG[status].color }} 
                />
                {STATUS_CONFIG[status].label}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Lista de Workflows */}
      <ScrollArea className="flex-1 bg-muted/10">
        <div className="p-3 space-y-2">
          {isLoading ? (
            // Skeletons
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-card border border-border/50 animate-pulse space-y-3"
              >
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : filteredWorkflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
              <Search className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No se encontraron workflows</p>
              <p className="text-xs mt-1">Intenta con otros filtros o crea uno nuevo</p>
            </div>
          ) : (
            filteredWorkflows.map((workflow) => (
              <WorkflowMiniCard
                key={workflow.id}
                workflow={workflow}
                isSelected={selectedWorkflow?.id === workflow.id}
                onClick={() => onSelectWorkflow(workflow)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer con botón de crear */}
      <div className="p-4 border-t bg-card/50">
        <Button
          className="w-full shadow-sm"
          onClick={onCreateNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Crear Nuevo Workflow
        </Button>
      </div>
    </div>
  );
});
