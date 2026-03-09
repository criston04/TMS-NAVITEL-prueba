'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { Order, OrderImportResult } from '@/types/order';
import { orderImportService, orderExportService } from '@/services/orders';

/**
 * Estado de importación
 */
type ImportStatus = 'idle' | 'validating' | 'previewing' | 'importing' | 'completed' | 'error';

/**
 * Resultado del hook useOrderImport
 */
interface UseOrderImportResult {
  /** Estado actual */
  status: ImportStatus;
  /** Archivo seleccionado */
  file: File | null;
  /** Preview de datos */
  preview: OrderImportResult | null;
  /** Órdenes creadas */
  createdOrders: Order[];
  
  error: string | null;
  /** Progreso (0-100) */
  progress: number;
  /** Selecciona archivo */
  selectFile: (file: File) => void;
  /** Limpia archivo */
  clearFile: () => void;
  /** Ejecuta preview */
  executePreview: () => Promise<void>;
  /** Ejecuta importación */
  executeImport: () => Promise<void>;
  /** Descarga plantilla */
  downloadTemplate: () => void;
  /** Resetea el estado */
  reset: () => void;
}

/**
 * Columna de exportación
 */
interface ExportColumnDefinition {
  key: string;
  label: string;
}

/**
 * Resultado del hook useOrderExport
 */
interface UseOrderExportResult {
  /** Está exportando */
  isExporting: boolean;
  
  error: string | null;
  /** Progreso (0-100) */
  progress: number;
  /** Columnas disponibles (aplanadas) */
  availableColumns: ExportColumnDefinition[];
  /** Columnas seleccionadas */
  selectedColumns: string[];
  /** Selecciona/deselecciona columna */
  toggleColumn: (columnKey: string) => void;
  /** Selecciona todas las columnas */
  selectAllColumns: () => void;
  /** Deselecciona todas las columnas */
  deselectAllColumns: () => void;
  /** Exporta órdenes */
  exportOrders: (orders: Order[]) => Promise<void>;
  /** Exporta IDs de órdenes */
  exportOrderIds: (orderIds: string[]) => Promise<void>;
}

/**
 * Hook para gestionar la importación de órdenes desde Excel
 * @returns Estado y métodos para importación
 */
export function useOrderImport(): UseOrderImportResult {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OrderImportResult | null>(null);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Ref para parsear archivo
  type ExcelRow = Record<string, string | number | null | undefined>;
  const parsedRowsRef = useRef<ExcelRow[]>([]);

  /**
   * Selecciona archivo
   */
  const selectFile = useCallback((newFile: File) => {
    // Validar extensión
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const extension = newFile.name.substring(newFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(extension.toLowerCase())) {
      setError('Formato de archivo no válido. Use .xlsx, .xls o .csv');
      return;
    }

    setFile(newFile);
    setPreview(null);
    setCreatedOrders([]);
    setError(null);
    setStatus('idle');
    setProgress(0);
  }, []);

  /**
   * Limpia archivo
   */
  const clearFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setCreatedOrders([]);
    setError(null);
    setStatus('idle');
    setProgress(0);
    parsedRowsRef.current = [];
  }, []);

  /**
   * Ejecuta preview
   */
  const executePreview = useCallback(async () => {
    if (!file) {
      setError('No hay archivo seleccionado');
      return;
    }

    setStatus('validating');
    setError(null);
    setProgress(10);

    try {
      // Simular lectura del archivo (en producción usar xlsx library)
      setProgress(30);
      
      // Parsear archivo
      const rows = await orderImportService.parseExcelFile(file);
      parsedRowsRef.current = rows;
      
      setProgress(60);
      setStatus('previewing');

      // Generar preview
      const previewResult = await orderImportService.preview(rows);
      
      setPreview(previewResult);
      setProgress(100);
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, [file]);

  /**
   * Ejecuta importación
   */
  const executeImport = useCallback(async () => {
    if (!preview || preview.validRows === 0) {
      setError('No hay registros válidos para importar');
      return;
    }

    setStatus('importing');
    setError(null);
    setProgress(0);

    try {
      const result = await orderImportService.import(parsedRowsRef.current);
      
      setCreatedOrders(result.createdOrders ?? []);
      setProgress(100);
      setStatus('completed');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }, [preview]);

  /**
   * Descarga plantilla
   */
  const downloadTemplate = useCallback(() => {
    orderImportService.getTemplate();
  }, []);

  /**
   * Resetea estado
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setFile(null);
    setPreview(null);
    setCreatedOrders([]);
    setError(null);
    setProgress(0);
    parsedRowsRef.current = [];
  }, []);

  return {
    status,
    file,
    preview,
    createdOrders,
    error,
    progress,
    selectFile,
    clearFile,
    executePreview,
    executeImport,
    downloadTemplate,
    reset,
  };
}

/**
 * Hook para gestionar la exportación de órdenes a Excel
 * @returns Estado y métodos para exportación
 */
export function useOrderExport(): UseOrderExportResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  /**
   * Columnas disponibles (aplanadas desde los grupos)
   */
  const availableColumns = useMemo((): ExportColumnDefinition[] => {
    const columnsGroups = orderExportService.getAvailableColumns();
    return [
      ...columnsGroups.main.map(c => ({ key: c.key, label: c.header })),
      ...columnsGroups.milestones.map(c => ({ key: c.key, label: c.header })),
      ...columnsGroups.statusHistory.map(c => ({ key: c.key, label: c.header })),
      ...columnsGroups.closure.map(c => ({ key: c.key, label: c.header })),
    ];
  }, []);

  /**
   * Toggle columna
   */
  const toggleColumn = useCallback((columnKey: string) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(k => k !== columnKey);
      }
      return [...prev, columnKey];
    });
  }, []);

  /**
   * Selecciona todas
   */
  const selectAllColumns = useCallback(() => {
    setSelectedColumns(availableColumns.map(c => c.key));
  }, [availableColumns]);

  /**
   * Deselecciona todas
   */
  const deselectAllColumns = useCallback(() => {
    setSelectedColumns([]);
  }, []);

  /**
   * Exporta órdenes por array
   */
  const exportOrders = useCallback(async (orders: Order[]) => {
    if (orders.length === 0) {
      setError('No hay órdenes para exportar');
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      const orderIds = orders.map(o => o.id);
      
      setProgress(30);

      await orderExportService.downloadExcel({
        filters: {},
        orderIds,
        includeMilestones: true,
        includeStatusHistory: true,
        includeClosureData: true,
      });

      setProgress(100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  /**
   * Exporta por IDs
   */
  const exportOrderIds = useCallback(async (orderIds: string[]) => {
    if (orderIds.length === 0) {
      setError('No hay órdenes para exportar');
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);

      await orderExportService.downloadExcel({
        filters: {},
        orderIds,
        includeMilestones: true,
        includeStatusHistory: true,
        includeClosureData: true,
      });

      setProgress(100);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    isExporting,
    error,
    progress,
    availableColumns,
    selectedColumns,
    toggleColumn,
    selectAllColumns,
    deselectAllColumns,
    exportOrders,
    exportOrderIds,
  };
}

/**
 * Acciones masivas disponibles
 */
type BulkAction = 'send_to_carrier' | 'send_to_gps' | 'export' | 'delete' | 'change_status';

/**
 * Estado de acción masiva
 */
interface BulkActionState {
  /** Acción actual */
  action: BulkAction | null;
  /** Está ejecutando */
  isExecuting: boolean;
  /** Progreso */
  progress: number;
  /** Resultados */
  results: {
    success: string[];
    failed: Array<{ id: string; error: string }>;
  };
  /** Error general */
  error: string | null;
}

/**
 * Resultado del hook useBulkActions
 */
interface UseBulkActionsResult {
  /** Estado actual */
  state: BulkActionState;
  /** Ejecuta acción masiva */
  executeAction: (action: BulkAction, orderIds: string[], params?: Record<string, unknown>) => Promise<void>;
  /** Resetea estado */
  reset: () => void;
  /** Cancela acción en progreso */
  cancel: () => void;
}

/**
 * Hook para ejecutar acciones masivas sobre órdenes
 * @returns Estado y métodos para acciones masivas
 */
export function useBulkActions(): UseBulkActionsResult {
  const [state, setState] = useState<BulkActionState>({
    action: null,
    isExecuting: false,
    progress: 0,
    results: { success: [], failed: [] },
    error: null,
  });

  const cancelledRef = useRef(false);

  /**
   * Ejecuta acción
   */
  const executeAction = useCallback(async (
    action: BulkAction,
    orderIds: string[],
    params: Record<string, unknown> = {}
  ) => {
    if (orderIds.length === 0) {
      setState(prev => ({ ...prev, error: 'No hay órdenes seleccionadas' }));
      return;
    }

    cancelledRef.current = false;
    setState({
      action,
      isExecuting: true,
      progress: 0,
      results: { success: [], failed: [] },
      error: null,
    });

    const { orderService } = await import('@/services/orders');
    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    try {
      for (let i = 0; i < orderIds.length; i++) {
        if (cancelledRef.current) break;

        const orderId = orderIds[i];
        
        try {
          switch (action) {
            case 'send_to_carrier':
              await orderService.sendToExternal(orderId);
              break;
            case 'send_to_gps':
              await orderService.sendToExternal(orderId);
              break;
            case 'delete':
              await orderService.deleteOrder(orderId);
              break;
            case 'change_status':
              if (params.status) {
                await orderService.changeStatus(
                  orderId, 
                  params.status as Order['status'],
                  params.reason as string
                );
              }
              break;
          }
          success.push(orderId);
        } catch (err) {
          failed.push({ id: orderId, error: (err as Error).message });
        }

        const progress = Math.round(((i + 1) / orderIds.length) * 100);
        setState(prev => ({
          ...prev,
          progress,
          results: { success: [...success], failed: [...failed] },
        }));
      }

      setState(prev => ({
        ...prev,
        isExecuting: false,
        progress: 100,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        isExecuting: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  /**
   * Resetea estado
   */
  const reset = useCallback(() => {
    cancelledRef.current = false;
    setState({
      action: null,
      isExecuting: false,
      progress: 0,
      results: { success: [], failed: [] },
      error: null,
    });
  }, []);

  /**
   * Cancela acción
   */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return {
    state,
    executeAction,
    reset,
    cancel,
  };
}
