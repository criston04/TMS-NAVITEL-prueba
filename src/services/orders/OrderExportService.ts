import type {
  Order,
  OrderFilters,
  OrderExportOptions,
  OrderMilestone,
  OrderStatusHistory,
} from '@/types/order';
import { orderService } from './OrderService';
import { apiConfig, API_ENDPOINTS } from '@/config/api.config';
import { apiClient } from '@/lib/api';

/**
 * Tipo para una fila de exportación
 */
interface ExportRow {
  [key: string]: string | number | boolean | null;
}

/**
 * Configuración de columnas para exportación
 */
interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown) => string | number;
}

/**
 * Simula latencia de red
 */
const simulateDelay = (ms: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Formateadores de datos
 */
const formatters = {
  /**
   * Formatea una fecha ISO a formato legible
   */
  date: (value: string | undefined): string => {
    if (!value) return '';
    return new Date(value).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  },

  /**
   * Formatea un estado de orden
   */
  status: (value: string): string => {
    const statusMap: Record<string, string> = {
      draft: 'Borrador',
      pending: 'Pendiente',
      assigned: 'Asignada',
      in_transit: 'En tránsito',
      at_milestone: 'En hito',
      delayed: 'Retrasada',
      completed: 'Completada',
      closed: 'Cerrada',
      cancelled: 'Cancelada',
    };
    return statusMap[value] ?? value;
  },

  /**
   * Formatea una prioridad
   */
  priority: (value: string): string => {
    const priorityMap: Record<string, string> = {
      low: 'Baja',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return priorityMap[value] ?? value;
  },

  /**
   * Formatea estado de sincronización
   */
  syncStatus: (value: string): string => {
    const syncMap: Record<string, string> = {
      not_sent: 'No enviado',
      pending: 'Pendiente',
      sending: 'Enviando',
      sent: 'Enviado',
      error: 'Error',
      retry: 'Reintentando',
    };
    return syncMap[value] ?? value;
  },

  /**
   * Formatea tipo de carga
   */
  cargoType: (value: string): string => {
    const typeMap: Record<string, string> = {
      general: 'General',
      refrigerated: 'Refrigerada',
      hazardous: 'Peligrosa',
      fragile: 'Frágil',
      oversized: 'Sobredimensionada',
      liquid: 'Líquidos',
      bulk: 'Granel',
    };
    return typeMap[value] ?? value;
  },

  /**
   * Formatea estado de hito
   */
  milestoneStatus: (value: string): string => {
    const statusMap: Record<string, string> = {
      pending: 'Pendiente',
      approaching: 'Aproximándose',
      arrived: 'Llegó',
      in_progress: 'En progreso',
      completed: 'Completado',
      skipped: 'Saltado',
      delayed: 'Retrasado',
    };
    return statusMap[value] ?? value;
  },

  /**
   * Formatea valor monetario
   */
  currency: (value: number | undefined): string => {
    if (value === undefined || value === null) return '';
    return `$${value.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  },

  /**
   * Formatea porcentaje
   */
  percentage: (value: number): string => {
    return `${value}%`;
  },

  /**
   * Formatea booleano
   */
  boolean: (value: boolean | undefined): string => {
    if (value === undefined || value === null) return '';
    return value ? 'Sí' : 'No';
  },
};

/**
 * Columnas principales de exportación
 */
const MAIN_COLUMNS: ExportColumn[] = [
  { key: 'orderNumber', header: 'Número de Orden', width: 20 },
  { key: 'status', header: 'Estado', width: 15 },
  { key: 'priority', header: 'Prioridad', width: 12 },
  { key: 'customerName', header: 'Cliente', width: 30 },
  { key: 'customerCode', header: 'Código Cliente', width: 15 },
  { key: 'carrierName', header: 'Transportista', width: 25 },
  { key: 'vehiclePlate', header: 'Placa', width: 12 },
  { key: 'vehicleType', header: 'Tipo Vehículo', width: 15 },
  { key: 'driverName', header: 'Conductor', width: 25 },
  { key: 'driverPhone', header: 'Teléfono Conductor', width: 18 },
  { key: 'gpsOperatorName', header: 'Operador GPS', width: 20 },
  { key: 'workflowName', header: 'Workflow', width: 20 },
  { key: 'cargoDescription', header: 'Descripción Carga', width: 35 },
  { key: 'cargoType', header: 'Tipo Carga', width: 15 },
  { key: 'cargoWeightKg', header: 'Peso (kg)', width: 12 },
  { key: 'cargoQuantity', header: 'Cantidad', width: 10 },
  { key: 'cargoDeclaredValue', header: 'Valor Declarado', width: 15 },
  { key: 'originName', header: 'Origen', width: 25 },
  { key: 'originAddress', header: 'Dirección Origen', width: 35 },
  { key: 'destinationName', header: 'Destino', width: 25 },
  { key: 'destinationAddress', header: 'Dirección Destino', width: 35 },
  { key: 'scheduledStartDate', header: 'Fecha Inicio Programada', width: 22 },
  { key: 'scheduledEndDate', header: 'Fecha Fin Programada', width: 22 },
  { key: 'actualStartDate', header: 'Fecha Inicio Real', width: 22 },
  { key: 'actualEndDate', header: 'Fecha Fin Real', width: 22 },
  { key: 'completionPercentage', header: '% Cumplimiento', width: 15 },
  { key: 'syncStatus', header: 'Estado Sincronización', width: 20 },
  { key: 'externalReference', header: 'Referencia Externa', width: 20 },
  { key: 'notes', header: 'Notas', width: 40 },
  { key: 'tags', header: 'Etiquetas', width: 20 },
  { key: 'createdAt', header: 'Fecha Creación', width: 22 },
  { key: 'createdBy', header: 'Creado Por', width: 25 },
];

/**
 * Columnas de hitos
 */
const MILESTONE_COLUMNS: ExportColumn[] = [
  { key: 'milestoneName', header: 'Nombre Hito', width: 25 },
  { key: 'milestoneType', header: 'Tipo', width: 12 },
  { key: 'milestoneSequence', header: 'Secuencia', width: 10 },
  { key: 'milestoneAddress', header: 'Dirección', width: 35 },
  { key: 'milestoneEstimatedArrival', header: 'ETA', width: 22 },
  { key: 'milestoneActualEntry', header: 'Entrada Real', width: 22 },
  { key: 'milestoneActualExit', header: 'Salida Real', width: 22 },
  { key: 'milestoneStatus', header: 'Estado Hito', width: 15 },
  { key: 'milestoneDelayMinutes', header: 'Retraso (min)', width: 15 },
];

/**
 * Columnas de historial de estados
 */
const STATUS_HISTORY_COLUMNS: ExportColumn[] = [
  { key: 'historyFromStatus', header: 'Estado Anterior', width: 15 },
  { key: 'historyToStatus', header: 'Nuevo Estado', width: 15 },
  { key: 'historyChangedAt', header: 'Fecha Cambio', width: 22 },
  { key: 'historyChangedBy', header: 'Cambiado Por', width: 25 },
  { key: 'historyReason', header: 'Motivo', width: 35 },
];

/**
 * Columnas de cierre
 */
const CLOSURE_COLUMNS: ExportColumn[] = [
  { key: 'closureObservations', header: 'Observaciones Cierre', width: 50 },
  { key: 'closureIncidentCount', header: 'Cant. Incidencias', width: 15 },
  { key: 'closureDeviationCount', header: 'Cant. Desviaciones', width: 15 },
  { key: 'closedBy', header: 'Cerrado Por', width: 25 },
  { key: 'closedAt', header: 'Fecha Cierre', width: 22 },
];

/**
 * Clase de servicio para exportación de órdenes
 */
class OrderExportService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Convierte una orden a fila de exportación
   * @param order - Orden a convertir
   * @returns Fila de exportación
   */
  private orderToRow(order: Order): ExportRow {
    const origin = order.milestones.find(m => m.type === 'origin');
    const destination = order.milestones.find(m => m.type === 'destination');

    return {
      orderNumber: order.orderNumber,
      status: formatters.status(order.status),
      priority: formatters.priority(order.priority),
      customerName: order.customer?.name ?? '',
      customerCode: order.customer?.code ?? '',
      carrierName: order.carrierName ?? '',
      vehiclePlate: order.vehicle?.plate ?? '',
      vehicleType: order.vehicle?.type ?? '',
      driverName: order.driver?.fullName ?? '',
      driverPhone: order.driver?.phone ?? '',
      gpsOperatorName: order.gpsOperatorName ?? '',
      workflowName: order.workflowName ?? '',
      cargoDescription: order.cargo.description,
      cargoType: formatters.cargoType(order.cargo.type),
      cargoWeightKg: order.cargo.weightKg,
      cargoQuantity: order.cargo.quantity,
      cargoDeclaredValue: order.cargo.declaredValue ?? '',
      originName: origin?.geofenceName ?? '',
      originAddress: origin?.address ?? '',
      destinationName: destination?.geofenceName ?? '',
      destinationAddress: destination?.address ?? '',
      scheduledStartDate: formatters.date(order.scheduledStartDate),
      scheduledEndDate: formatters.date(order.scheduledEndDate),
      actualStartDate: formatters.date(order.actualStartDate),
      actualEndDate: formatters.date(order.actualEndDate),
      completionPercentage: formatters.percentage(order.completionPercentage),
      syncStatus: formatters.syncStatus(order.syncStatus),
      externalReference: order.externalReference ?? '',
      notes: order.notes ?? '',
      tags: order.tags?.join(', ') ?? '',
      createdAt: formatters.date(order.createdAt),
      createdBy: order.createdBy,
    };
  }

  /**
   * Convierte hitos a filas de exportación
   * @param milestones - Hitos de la orden
   * @returns Filas de hitos
   */
  private milestonesToRows(milestones: OrderMilestone[]): ExportRow[] {
    return milestones.map(m => ({
      milestoneName: m.geofenceName,
      milestoneType: m.type,
      milestoneSequence: m.sequence,
      milestoneAddress: m.address,
      milestoneEstimatedArrival: formatters.date(m.estimatedArrival),
      milestoneActualEntry: formatters.date(m.actualEntry),
      milestoneActualExit: formatters.date(m.actualExit),
      milestoneStatus: formatters.milestoneStatus(m.status),
      milestoneDelayMinutes: m.delayMinutes ?? '',
    }));
  }

  /**
   * Convierte historial de estados a filas de exportación
   * @param history - Historial de estados
   * @returns Filas de historial
   */
  private statusHistoryToRows(history: OrderStatusHistory[]): ExportRow[] {
    return history.map(h => ({
      historyFromStatus: formatters.status(h.fromStatus),
      historyToStatus: formatters.status(h.toStatus),
      historyChangedAt: formatters.date(h.changedAt),
      historyChangedBy: h.changedByName,
      historyReason: h.reason ?? '',
    }));
  }

  /**
   * Convierte datos de cierre a fila de exportación
   * @param order - Orden con datos de cierre
   * @returns Fila de cierre
   */
  private closureToRow(order: Order): ExportRow {
    if (!order.closureData) {
      return {
        closureObservations: '',
        closureIncidentCount: '',
        closureDeviationCount: '',
        closedBy: '',
        closedAt: '',
      };
    }

    return {
      closureObservations: order.closureData.observations,
      closureIncidentCount: order.closureData.incidents.length,
      closureDeviationCount: order.closureData.deviationReasons.length,
      closedBy: order.closureData.closedByName,
      closedAt: formatters.date(order.closureData.closedAt),
    };
  }

  /**
   * Prepara los datos para exportación
   * @param options - Opciones de exportación
   * @returns Datos estructurados para generar Excel
   */
  async prepareExportData(options: OrderExportOptions): Promise<{
    sheets: Array<{
      name: string;
      columns: ExportColumn[];
      rows: ExportRow[];
    }>;
    metadata: {
      generatedAt: string;
      totalOrders: number;
      filters: OrderFilters;
    };
  }> {
    if (!this.useMocks) {
      return apiClient.post<{ sheets: Array<{ name: string; columns: ExportColumn[]; rows: ExportRow[] }>; metadata: { generatedAt: string; totalOrders: number; filters: OrderFilters } }>(`${API_ENDPOINTS.operations.orders}/export/prepare`, options);
    }

    await simulateDelay(500);

    // Obtener órdenes según filtros o IDs
    let orders: Order[] = [];
    
    if (options.orderIds && options.orderIds.length > 0) {
      // Obtener órdenes específicas por ID
      const orderPromises = options.orderIds.map(id => orderService.getOrderById(id));
      const results = await Promise.all(orderPromises);
      orders = results.filter((o): o is Order => o !== null);
    } else {
      // Obtener órdenes por filtros
      const response = await orderService.getOrders({
        ...options.filters,
        pageSize: 10000, // Obtener todas para exportación
      });
      orders = response.data;
    }

    const sheets: Array<{
      name: string;
      columns: ExportColumn[];
      rows: ExportRow[];
    }> = [];

    // Hoja principal de órdenes
    const mainRows = orders.map(order => {
      const row = this.orderToRow(order);
      
      // Agregar datos de cierre si se solicita
      if (options.includeClosureData) {
        const closureRow = this.closureToRow(order);
        Object.assign(row, closureRow);
      }
      
      return row;
    });

    const mainColumns = [...MAIN_COLUMNS];
    if (options.includeClosureData) {
      mainColumns.push(...CLOSURE_COLUMNS);
    }

    sheets.push({
      name: 'Órdenes',
      columns: mainColumns,
      rows: mainRows,
    });

    // Hoja de hitos si se solicita
    if (options.includeMilestones) {
      const milestoneRows: ExportRow[] = [];
      
      for (const order of orders) {
        const orderMilestones = this.milestonesToRows(order.milestones);
        orderMilestones.forEach(row => {
          milestoneRows.push({
            orderNumber: order.orderNumber,
            ...row,
          });
        });
      }

      sheets.push({
        name: 'Hitos',
        columns: [
          { key: 'orderNumber', header: 'Número de Orden', width: 20 },
          ...MILESTONE_COLUMNS,
        ],
        rows: milestoneRows,
      });
    }

    // Hoja de historial de estados si se solicita
    if (options.includeStatusHistory) {
      const historyRows: ExportRow[] = [];
      
      for (const order of orders) {
        const orderHistory = this.statusHistoryToRows(order.statusHistory);
        orderHistory.forEach(row => {
          historyRows.push({
            orderNumber: order.orderNumber,
            ...row,
          });
        });
      }

      sheets.push({
        name: 'Historial Estados',
        columns: [
          { key: 'orderNumber', header: 'Número de Orden', width: 20 },
          ...STATUS_HISTORY_COLUMNS,
        ],
        rows: historyRows,
      });
    }

    return {
      sheets,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalOrders: orders.length,
        filters: options.filters,
      },
    };
  }

  /**
   * Genera un archivo Excel (simulado)
   * @param options - Opciones de exportación
   * @returns Promesa con el blob del archivo
   * @description En producción, usar librería como xlsx o exceljs
   */
  async generateExcel(options: OrderExportOptions): Promise<Blob> {
    if (!this.useMocks) {
      return apiClient.post<Blob>(`${API_ENDPOINTS.operations.orders}/export/excel`, options);
    }

    const data = await this.prepareExportData(options);
    
    // En producción, aquí se usaría xlsx o exceljs para generar el archivo
    console.warn('generateExcel: En producción, implementar con xlsx o exceljs');
    
    // Por ahora, generamos un CSV simple como demostración
    const csvContent = this.generateCSV(data.sheets[0]);
    
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  /**
   * Genera contenido CSV de una hoja
   * @param sheet - Datos de la hoja
   * @returns String CSV
   */
  private generateCSV(sheet: {
    columns: ExportColumn[];
    rows: ExportRow[];
  }): string {
    const BOM = '\uFEFF'; // BOM para compatibilidad UTF-8 con Excel
    const headers = sheet.columns.map(c => `"${c.header}"`).join(',');
    const rows = sheet.rows.map(row =>
      sheet.columns
        .map(col => {
          const value = row[col.key];
          if (value === null || value === undefined) return '""';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        })
        .join(',')
    );

    return BOM + [headers, ...rows].join('\n');
  }

  /**
   * Descarga el archivo Excel
   * @param options - Opciones de exportación
   * @param filename - Nombre del archivo
   */
  async downloadExcel(
    options: OrderExportOptions,
    filename: string = 'ordenes_export'
  ): Promise<void> {
    const blob = await this.generateExcel(options);
    
    // Crear enlace de descarga
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Obtiene las columnas disponibles para exportación
   * @returns Lista de columnas configurables
   */
  getAvailableColumns(): {
    main: ExportColumn[];
    milestones: ExportColumn[];
    statusHistory: ExportColumn[];
    closure: ExportColumn[];
  } {
    return {
      main: MAIN_COLUMNS,
      milestones: MILESTONE_COLUMNS,
      statusHistory: STATUS_HISTORY_COLUMNS,
      closure: CLOSURE_COLUMNS,
    };
  }
}

/**
 * Instancia singleton del servicio de exportación
 */
export const orderExportService = new OrderExportService();

/**
 * Exporta la clase para testing
 */
export { OrderExportService };
