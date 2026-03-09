'use client';

import { memo, useState, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Package,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import type { Order, OrderPriority } from '@/types/order';
import type { PendingOrdersFilters } from '@/types/scheduling';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SchedulingOrderCard } from './scheduling-order-card';
import { cn } from '@/lib/utils';

interface SchedulingSidebarProps {
  /** Órdenes pendientes de programar */
  orders: Order[];
  
  isLoading?: boolean;
  
  filters: PendingOrdersFilters;
  /** Actualizar filtros */
  onFiltersChange: (filters: PendingOrdersFilters) => void;
  /** Callback al iniciar arrastre de una orden */
  onDragStart?: (order: Order) => void;
  /** Callback al terminar arrastre */
  onDragEnd?: () => void;
  /** Callback al hacer clic en una orden */
  onOrderClick?: (order: Order) => void;
  /** Panel colapsado */
  isCollapsed?: boolean;
  /** Toggle colapsar */
  onToggleCollapse?: () => void;
  /** Ancho del panel */
  width?: number;
  /** Clase adicional */
  className?: string;
}

const PRIORITY_FILTERS: { value: OrderPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'urgent', label: 'Urgentes' },
  { value: 'high', label: 'Alta' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Baja' },
];

// COMPONENTE

export const SchedulingSidebar = memo(function SchedulingSidebar({
  orders,
  isLoading = false,
  filters,
  onFiltersChange,
  onDragStart,
  onDragEnd,
  onOrderClick,
  isCollapsed = false,
  onToggleCollapse,
  width = 300,
  className,
}: Readonly<SchedulingSidebarProps>) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [selectedPriority, setSelectedPriority] = useState<OrderPriority | 'all'>('all');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ----------------------------------------
  // FILTRADO LOCAL
  // ----------------------------------------
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Filtro por búsqueda
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(
        o =>
          o.orderNumber?.toLowerCase().includes(search) ||
          o.customer?.name.toLowerCase().includes(search) ||
          o.reference?.toLowerCase().includes(search) ||
          o.externalReference?.toLowerCase().includes(search)
      );
    }

    // Filtro por prioridad
    if (selectedPriority !== 'all') {
      result = result.filter(o => o.priority === selectedPriority);
    }

    return result;
  }, [orders, searchValue, selectedPriority]);

  // ----------------------------------------
  // ----------------------------------------
  const stats = useMemo(() => {
    return {
      total: orders.length,
      urgent: orders.filter(o => o.priority === 'urgent').length,
      high: orders.filter(o => o.priority === 'high').length,
    };
  }, [orders]);

  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    // Cancel previous debounce timeout
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value || undefined });
    }, 300);
  }, [filters, onFiltersChange]);

  const handlePriorityChange = (priority: OrderPriority | 'all') => {
    setSelectedPriority(priority);
    onFiltersChange({
      ...filters,
      priority: priority === 'all' ? undefined : priority,
    });
  };

  // ----------------------------------------
  // COLAPSADO
  // ----------------------------------------
  if (isCollapsed) {
    return (
      <div
        className={cn(
          // Layout
          'flex flex-col items-center',
          // Spacing
          'py-3',
          // Visual
          'bg-card border-r',
          // States
          'transition-all duration-300',
          className
        )}
        style={{ width: 44 }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-3 h-7 w-7"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Package className="h-4 w-4 text-muted-foreground" />
            <Badge
              variant="secondary"
              className="absolute -top-1 -right-1.5 flex items-center justify-center h-3.5 min-w-3.5 p-0 text-[9px]"
            >
              {stats.total}
            </Badge>
          </div>
          
          {stats.urgent > 0 && (
            <div className="relative">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1.5 flex items-center justify-center h-3.5 min-w-3.5 p-0 text-[9px]"
              >
                {stats.urgent}
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // EXPANDIDO
  // ----------------------------------------
  return (
    <div
      className={cn(
        // Layout
        'flex flex-col h-full',
        // Visual
        'bg-card border-r',
        // States
        'transition-all duration-300',
        className
      )}
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b">
        <div className="flex items-center gap-1.5 min-w-0">
          <Package className="h-3.5 w-3.5 text-primary shrink-0" />
          <h2 className="font-semibold text-xs truncate">Órdenes Pendientes</h2>
          <Badge variant="secondary" className="shrink-0 h-5 text-[10px]">
            {stats.total}
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-7 w-7 shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="px-2.5 py-2 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar orden, cliente o referencia..."
            value={searchValue}
            onChange={handleSearchChange}
            className="pl-7 h-7 text-xs"
          />
        </div>

        {/* Filtros rápidos de prioridad */}
        <div className="flex flex-wrap gap-0.5">
          {PRIORITY_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              variant={selectedPriority === value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePriorityChange(value)}
              className="h-5 px-1.5 text-[10px]"
            >
              {label}
              {value === 'urgent' && stats.urgent > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-0.5 h-3 px-0.5 text-[8px]"
                >
                  {stats.urgent}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Lista de órdenes */}
      <div 
        className={cn(
          "flex-1 overflow-y-auto",
          "scrollbar-none [&::-webkit-scrollbar]:hidden",
          "[-ms-overflow-style:none] [scrollbar-width:none]"
        )}
      >
        <div className="px-2 py-1.5 space-y-1">
          {isLoading ? (
            // Skeletons
            new Array(5).fill(null).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                className="h-20 rounded-md bg-muted animate-pulse"
              />
            ))
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Package className="h-8 w-8 mb-2 text-muted-foreground/50" />
              <p className="text-xs font-medium text-muted-foreground">
                No hay órdenes pendientes
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                {searchValue
                  ? 'Intenta con otra búsqueda'
                  : 'Todas programadas'}
              </p>
            </div>
          ) : (
            // Lista de órdenes
            filteredOrders.map(order => (
              <SchedulingOrderCard
                key={order.id}
                order={order}
                variant="sidebar"
                draggable
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={onOrderClick}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer con estadísticas */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-t bg-muted/30">
        <span className="text-[10px] text-muted-foreground">
          {filteredOrders.length}/{stats.total} órdenes
        </span>
        {stats.urgent > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-600">
            <AlertCircle className="h-2.5 w-2.5" />
            {stats.urgent} urgentes
          </span>
        )}
      </div>
    </div>
  );
});
