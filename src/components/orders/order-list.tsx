'use client';

import { memo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
} from 'lucide-react';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderCard } from './order-card';
import { OrderTable } from './order-table';
import { cn } from '@/lib/utils';

/**
 * Props del componente OrderList
 */
interface OrderListProps {
  /** Lista de órdenes */
  orders: Order[];
  
  isLoading?: boolean;
  
  page: number;
  /** Total de páginas */
  totalPages: number;
  
  total: number;
  /** IDs seleccionados */
  selectedIds: Set<string>;
  /** Toggle selección */
  onToggleSelection: (id: string) => void;
  /** Seleccionar todas */
  onSelectAll: () => void;
  /** Limpiar selección */
  onClearSelection: () => void;
  /** Cambiar página */
  onPageChange: (page: number) => void;
  /** Click en orden */
  onOrderClick: (order: Order) => void;
  /** Vista actual */
  viewMode?: 'list' | 'grid';
  /** Callback al cambiar vista */
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  /** Clase adicional */
  className?: string;
}

// COMPONENTES AUXILIARES

/**
 * Skeleton de carga para lista
 */
function OrderListSkeleton() {
  return (
    <div className="space-y-3">
      {new Array(5).fill(null).map((_, i) => (
        <Card key={`skeleton-${i}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-3 w-48" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Estado vacío
 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <List className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No hay órdenes</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          No se encontraron órdenes con los filtros actuales. 
          Intenta ajustar los criterios de búsqueda.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Paginación
 */
interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, onPageChange }: Readonly<PaginationProps>) {
  const startRecord = (page - 1) * 10 + 1;
  const endRecord = Math.min(page * 10, total);

  // Generar array de páginas a mostrar
  const getPageNumbers = (): (number | 'ellipsis-start' | 'ellipsis-end')[] => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    
    if (totalPages <= 7) {
      // Mostrar todas las páginas si son pocas
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Siempre mostrar primera página
      pages.push(1);
      
      if (page > 4) {
        pages.push('ellipsis-start');
      }
      
      // Páginas alrededor de la actual
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      
      if (page < totalPages - 3) {
        pages.push('ellipsis-end');
      }
      
      // Siempre mostrar última página
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground hidden sm:block">
        Mostrando {startRecord}-{endRecord} de {total.toLocaleString()} órdenes
      </span>
      <span className="text-xs text-muted-foreground sm:hidden">
        {startRecord}-{endRecord} de {total.toLocaleString()}
      </span>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 sm:px-3"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Anterior</span>
        </Button>
        
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((pageNum) => {
            if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
              return (
                <span key={pageNum} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }
            
            return (
              <Button
                key={pageNum}
                variant={page === pageNum ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Mobile: solo indicador de página */}
        <span className="sm:hidden text-sm text-muted-foreground px-2">
          {page}/{totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-2 sm:px-3"
        >
          <span className="hidden sm:inline mr-1">Siguiente</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// COMPONENTE PRINCIPAL

/**
 * Lista de órdenes con paginación y selección
 * @param props - Props del componente
 * @returns Componente de lista
 */
function OrderListComponent({
  orders,
  isLoading,
  page,
  totalPages,
  total,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onPageChange,
  onOrderClick,
  viewMode = 'list',
  onViewModeChange,
  className,
}: Readonly<OrderListProps>) {
  const allSelected = orders.length > 0 && orders.every(o => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  /**
   * Maneja el checkbox de seleccionar todos
   */
  const handleSelectAllChange = useCallback(() => {
    if (allSelected) {
      onClearSelection();
    } else {
      onSelectAll();
    }
  }, [allSelected, onClearSelection, onSelectAll]);

  if (isLoading) {
    return (
      <div className={className}>
        <OrderListSkeleton />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header con controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Checkbox seleccionar todos */}
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected || (someSelected ? 'indeterminate' : false)}
              onCheckedChange={handleSelectAllChange}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} seleccionadas`
                : 'Seleccionar todas'}
            </span>
          </div>
        </div>

        {/* Controles de vista */}
        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-r-none"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-l-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de órdenes */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isSelected={selectedIds.has(order.id)}
              onSelect={onToggleSelection}
              onClick={onOrderClick}
            />
          ))}
        </div>
      ) : (
        <OrderTable
          orders={orders}
          selectedIds={selectedIds}
          onSelect={onToggleSelection}
          allSelected={allSelected}
          onSelectAll={selected => {
            if (selected) onSelectAll();
            else onClearSelection();
          }}
          onClick={onOrderClick}
        />
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

/**
 * Exportación memoizada
 */
export const OrderList = memo(OrderListComponent);
