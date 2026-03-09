'use client';

import { type FC, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Play,
  Pause,
  Route,
  Clock,
  Users,
  CheckCircle2,
  Activity,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Workflow } from '@/types/workflow';
import { workflowStatusConfig, workflowTypes } from '@/mocks/master/workflows.mock';

interface WorkflowCardProps {
  workflow: Workflow;
  onSelect: (workflow: Workflow) => void;
  onEdit: (workflow: Workflow) => void;
  onDuplicate: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
  onToggleStatus: (workflow: Workflow) => void;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export const WorkflowCard: FC<WorkflowCardProps> = ({
  workflow,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  viewMode = 'grid',
  className,
}) => {
  const statusConfig = workflowStatusConfig[workflow.status];
  const workflowType = workflowTypes.find(t => 
    workflow.applicableCargoTypes?.some(ct => ct.includes(t.value)) ||
    workflow.code.toLowerCase().includes(t.value.substring(0, 3))
  ) || workflowTypes[5]; // 'other' como fallback

  const handleSelect = useCallback(() => onSelect(workflow), [onSelect, workflow]);
  const handleEdit = useCallback(() => onEdit(workflow), [onEdit, workflow]);
  const handleDuplicate = useCallback(() => onDuplicate(workflow), [onDuplicate, workflow]);
  const handleDelete = useCallback(() => onDelete(workflow), [onDelete, workflow]);
  const handleToggleStatus = useCallback(() => onToggleStatus(workflow), [onToggleStatus, workflow]);

  const totalEstimatedTime = workflow.steps.reduce(
    (acc, step) => acc + (step.estimatedDurationMinutes || 0),
    0
  );

  // Mock execution stats based on workflow id for consistency
  const executionCount = useMemo(() => {
    const hash = workflow.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return workflow.status === 'draft' ? 0 : (hash % 60) + 15;
  }, [workflow.id, workflow.status]);

  const lastUsedDaysAgo = useMemo(() => {
    if (workflow.status === 'draft') return null;
    const hash = workflow.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return (hash % 7) + 1;
  }, [workflow.id, workflow.status]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const ActionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 transition-opacity',
            viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100' : 'opacity-60 hover:opacity-100'
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(); }}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleStatus(); }}>
          {workflow.status === 'active' ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Desactivar
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Activar
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); handleDelete(); }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ─── LIST VIEW ─────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700',
          'transition-all duration-200 hover:shadow-md hover:border-primary/30',
          'cursor-pointer',
          className
        )}
        onClick={handleSelect}
      >
        <div className="flex items-center gap-4 px-4 py-3.5">
          {/* Icon + Info */}
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${workflowType.color}15` }}
          >
            <Route className="h-5 w-5" style={{ color: workflowType.color }} />
          </div>

          {/* Name & Code */}
          <div className="min-w-[180px] max-w-[220px] shrink-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
              {workflow.name}
            </h3>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{workflow.code}</p>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-1 flex-1 min-w-0 hidden md:block">
            {workflow.description}
          </p>

          {/* Timeline mini */}
          <div className="hidden lg:flex items-center gap-0.5 shrink-0">
            {workflow.steps.slice(0, 6).map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: step.color || '#6b7280' }}
                  title={step.name}
                >
                  {index + 1}
                </div>
                {index < Math.min(workflow.steps.length - 1, 5) && (
                  <div className="w-2 h-px bg-gray-300 dark:bg-slate-600" />
                )}
              </div>
            ))}
            {workflow.steps.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-0.5">+{workflow.steps.length - 6}</span>
            )}
          </div>

          {/* Stats pills */}
          <div className="hidden sm:flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
            <div className="flex items-center gap-1" title="Hitos">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{workflow.steps.length}</span>
            </div>
            <div className="flex items-center gap-1" title="Duración estimada">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDuration(totalEstimatedTime)}</span>
            </div>
            {executionCount > 0 && (
              <div className="flex items-center gap-1" title="Ejecuciones">
                <Activity className="h-3.5 w-3.5" />
                <span>{executionCount}</span>
              </div>
            )}
            {workflow.applicableCustomerIds && workflow.applicableCustomerIds.length > 0 && (
              <div className="flex items-center gap-1" title="Clientes asignados">
                <Users className="h-3.5 w-3.5" />
                <span>{workflow.applicableCustomerIds.length}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="secondary"
              className="text-[10px] px-2 py-0.5 whitespace-nowrap"
              style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
            >
              {statusConfig.label}
            </Badge>
            {workflow.isDefault && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 gap-0.5 whitespace-nowrap">
                <Zap className="h-2.5 w-2.5" />
                Default
              </Badge>
            )}
          </div>

          {/* Version + Last used */}
          <div className="hidden xl:flex flex-col items-end shrink-0 text-[10px] text-muted-foreground min-w-[70px]">
            <span>v{workflow.version}</span>
            {lastUsedDaysAgo !== null && (
              <span className="mt-0.5">Hace {lastUsedDaysAgo}d</span>
            )}
          </div>

          {/* Actions */}
          {ActionsMenu}
        </div>
      </div>
    );
  }

  // ─── GRID VIEW (default) ──────────────────────────────────────────
  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700',
        'p-5 transition-all duration-200 hover:shadow-lg hover:border-primary/30',
        'cursor-pointer',
        className
      )}
      onClick={handleSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${workflowType.color}15` }}
          >
            <Route className="h-5 w-5" style={{ color: workflowType.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {workflow.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">{workflow.code}</p>
          </div>
        </div>
        {ActionsMenu}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-10">
        {workflow.description}
      </p>

      {/* Timeline Preview */}
      <div className="flex items-center gap-1 mb-4 overflow-hidden">
        {workflow.steps.slice(0, 5).map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ backgroundColor: step.color || '#6b7280' }}
              title={step.name}
            >
              {index + 1}
            </div>
            {index < Math.min(workflow.steps.length - 1, 4) && (
              <div className="w-4 h-0.5 bg-gray-200 dark:bg-slate-700" />
            )}
          </div>
        ))}
        {workflow.steps.length > 5 && (
          <span className="text-xs text-muted-foreground ml-1">
            +{workflow.steps.length - 5}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{workflow.steps.length} hitos</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(totalEstimatedTime)}</span>
        </div>
        {executionCount > 0 && (
          <div className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5" />
            <span>{executionCount} ejecuciones</span>
          </div>
        )}
        {workflow.applicableCustomerIds && workflow.applicableCustomerIds.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{workflow.applicableCustomerIds.length}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </Badge>
          {workflow.isDefault && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 gap-0.5">
              <Zap className="h-2.5 w-2.5" />
              Por defecto
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastUsedDaysAgo !== null && (
            <span className="text-[10px] text-muted-foreground">
              Usado hace {lastUsedDaysAgo}d
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            v{workflow.version}
          </span>
        </div>
      </div>
    </div>
  );
};
