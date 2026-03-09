'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { Order, OrderStatus, OrderFilters as OrderFiltersType } from '@/types/order';

import { useOrders, useOrderFilters } from '@/hooks/useOrders';
import { useOrderExport, useBulkActions } from '@/hooks/useOrderImportExport';
import { useToast } from '@/components/ui/toast';
import { useTranslations } from '@/contexts/locale-context';

// Componentes
import { PageWrapper } from '@/components/page-wrapper';
import { Button } from '@/components/ui/button';
import {
  OrderStatsCards,
  OrderFilters,
  OrderList,
  OrderBulkActions,
} from '@/components/orders';

/**
 * Vista disponible
 */
type ViewMode = 'list' | 'grid';

/**
 * Convierte status a array para manejo uniforme
 */
function toStatusArray(status: OrderStatus | OrderStatus[] | undefined): OrderStatus[] {
  if (!status) return [];
  return Array.isArray(status) ? status : [status];
}

// COMPONENTE PRINCIPAL

/**
 * Página principal del módulo de órdenes
 * @returns Página de órdenes
 */
export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Leer filtros iniciales desde URL
  const initialFiltersFromUrl = useMemo((): Partial<OrderFiltersType> => {
    const urlFilters: Partial<OrderFiltersType> = {};
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const customerId = searchParams.get('customerId');
    const pageParam = searchParams.get('page');

    if (search) urlFilters.search = search;
    if (status) urlFilters.status = status.split(',') as OrderStatus[];
    if (priority) urlFilters.priority = priority as OrderFiltersType['priority'];
    if (customerId) urlFilters.customerId = customerId;
    if (pageParam) urlFilters.page = parseInt(pageParam, 10);

    return urlFilters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  const {
    filters,
    setFilters,
    clearFilters: clearFiltersBase,
    activeFilterCount,
    filterOptions,
    isLoadingOptions,
  } = useOrderFilters(initialFiltersFromUrl);

  const {
    orders,
    total,
    page,
    totalPages,
    statusCounts,
    isLoading,
    error,
    setPage,
    refresh,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setFilters: setOrderFilters,
  } = useOrders({
    initialFilters: filters,
    pageSize: 10,
    autoFetch: true,
  });

  // Sincronizar filtros del hook de órdenes cuando cambian los filtros locales
  useEffect(() => {
    setOrderFilters(filters);
  }, [filters, setOrderFilters]);

  // Sincronizar filtros con URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) {
      const statusArr = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (statusArr.length > 0) params.set('status', statusArr.join(','));
    }
    if (filters.priority) {
      const priorityStr = Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority;
      params.set('priority', priorityStr);
    }
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));

    const queryString = params.toString();
    const newUrl = queryString ? `?${queryString}` : '/orders';
    router.replace(newUrl, { scroll: false });
  }, [filters, router]);

  // Limpiar filtros y URL
  const clearFilters = useCallback(() => {
    clearFiltersBase();
    router.replace('/orders', { scroll: false });
  }, [clearFiltersBase, router]);

  const { exportOrders, isExporting } = useOrderExport();

  const { state: bulkState, executeAction } = useBulkActions();
  const { success: toastSuccess, error: toastError } = useToast();

  // Sincronizar filtros con el hook de órdenes
  const handleFiltersChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
  }, [setFilters]);

  // Navegar a detalle de orden
  const handleOrderClick = useCallback((order: Order) => {
    router.push(`/orders/${order.id}`);
  }, [router]);

  // Navegar a nueva orden
  const handleNewOrder = useCallback(() => {
    router.push('/orders/new');
  }, [router]);

  // Navegar a importación
  const handleImport = useCallback(() => {
    router.push('/orders/import');
  }, [router]);

  const handleExport = useCallback(async () => {
    const selectedOrders = orders.filter(o => selectedIds.has(o.id));
    if (selectedOrders.length > 0) {
      try {
        await exportOrders(selectedOrders);
        toastSuccess(t('orders.exportSuccess'), `${selectedOrders.length} ${t('orders.totalOrders').toLowerCase()}`);
      } catch {
        toastError(t('common.error'), t('orders.exportError'));
      }
    }
  }, [orders, selectedIds, exportOrders, toastSuccess, toastError]);

  // Filtrar por estado desde las cards
  const handleStatusClick = useCallback((status: OrderStatus) => {
    const currentArray = toStatusArray(filters.status);
    
    if (currentArray.includes(status)) {
      // Quitar el filtro si ya está activo
      const newArray = currentArray.filter(s => s !== status);
      setFilters({
        ...filters,
        status: newArray.length > 0 ? newArray : undefined,
      });
    } else {
      // Agregar el filtro
      setFilters({
        ...filters,
        status: [status],
      });
    }
  }, [filters, setFilters]);

  // Ejecutar acción masiva
  const handleBulkAction = useCallback(async (action: 'send_to_carrier' | 'send_to_gps' | 'export' | 'delete') => {
    if (action === 'export') {
      await handleExport();
    } else {
      try {
        await executeAction(action, Array.from(selectedIds));
        if (action === 'delete') {
          toastSuccess(t('orders.orderDeleted'), `${selectedIds.size} ${t('orders.totalOrders').toLowerCase()}`);
          clearSelection();
          await refresh();
        } else {
          toastSuccess(t('orders.bulkActionSuccess'), `${selectedIds.size} ${t('orders.totalOrders').toLowerCase()}`);
        }
      } catch {
        toastError(t('common.error'), t('orders.bulkActionError'));
      }
    }
  }, [selectedIds, executeAction, handleExport, clearSelection, refresh, toastSuccess, toastError]);

  const activeStatus = useMemo(() => {
    const currentArray = toStatusArray(filters.status);
    if (currentArray.length === 1) {
      return currentArray[0];
    }
    return undefined;
  }, [filters.status]);

  // Resultados para el componente de bulk actions
  const bulkResults = useMemo(() => {
    if (bulkState.results.success.length > 0 || bulkState.results.failed.length > 0) {
      return {
        success: bulkState.results.success.length,
        failed: bulkState.results.failed.length,
      };
    }
    return undefined;
  }, [bulkState.results]);

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
            <p className="text-muted-foreground">
              {t('orders.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Refresh */}
            <Button
              variant="outline"
              size="icon"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Importar */}
            <Button variant="outline" size="sm" className="gap-1 sm:gap-2" onClick={handleImport}>
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.import')}</span>
            </Button>

            {/* Exportar todas */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2"
              onClick={() => exportOrders(orders)}
              disabled={isExporting || orders.length === 0}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{t('common.export')}</span>
            </Button>

            {/* Nueva orden */}
            <Button size="sm" className="gap-1 sm:gap-2" onClick={handleNewOrder}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t('orders.newOrder')}</span>
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <OrderStatsCards
          statusCounts={statusCounts}
          onStatusClick={handleStatusClick}
          activeStatus={activeStatus}
        />

        {/* Filtros */}
        <OrderFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClear={clearFilters}
          filterOptions={filterOptions}
          activeFilterCount={activeFilterCount}
          isLoading={isLoadingOptions}
        />

        {/* Lista de órdenes */}
        <OrderList
          orders={orders}
          isLoading={isLoading}
          page={page}
          totalPages={totalPages}
          total={total}
          selectedIds={selectedIds}
          onToggleSelection={toggleSelection}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onPageChange={setPage}
          onOrderClick={handleOrderClick}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Barra de acciones masivas */}
        <OrderBulkActions
          selectedCount={selectedIds.size}
          onAction={handleBulkAction}
          onClearSelection={clearSelection}
          isExecuting={bulkState.isExecuting}
          currentAction={bulkState.action === 'change_status' ? null : bulkState.action}
          progress={bulkState.progress}
          results={bulkResults}
        />

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4">
            <p className="font-medium">{t('common.error')}</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
