import type {
  OrderFilters,
  OrderExportOptions,
} from '@/types/order';
import { API_ENDPOINTS, apiConfig } from '@/config/api.config';

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
  constructor() {}

  /**
   * Descarga el export de órdenes en formato CSV.
   *
   * 2026-05-03: corregido. Antes el frontend usaba dos endpoints inventados
   * (POST /orders/export/prepare y POST /orders/export/excel) que devolvían 404.
   * El endpoint real (verificado contra producción) es:
   *   GET /api/v1/orders/export
   *
   * Devuelve siempre CSV (ignora cualquier query param `format`). Los filtros
   * que el backend acepta están pendientes de definición — actualmente devuelve
   * el listado completo del tenant, ignorando filtros enviados.
   *
   * `OrderExportOptions.filters` se serializa como query params por si en el
   * futuro el backend los soporta. `orderIds`, `includeMilestones`, etc.
   * NO se envían al backend (no están soportados); quedan en el contrato del
   * frontend para uso client-side futuro si se quiere filtrar el blob.
   */
  async downloadExport(
    options: OrderExportOptions,
    filename: string = 'ordenes_export'
  ): Promise<void> {
    // Construir URL con filtros como query params (backend los ignora hoy)
    const params = new URLSearchParams();
    if (options.filters) {
      for (const [k, v] of Object.entries(options.filters as OrderFilters)) {
        if (v !== undefined && v !== null && v !== "") {
          params.append(k, String(v));
        }
      }
    }
    const queryString = params.toString();
    const url = `${apiConfig.baseUrl}${API_ENDPOINTS.operations.orders}/export${queryString ? `?${queryString}` : ""}`;

    const token = typeof window !== "undefined"
      ? localStorage.getItem("tms_access_token") ?? localStorage.getItem("accessToken")
      : null;

    const res = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      throw new Error(`Export falló: HTTP ${res.status}`);
    }

    const blob = await res.blob();

    // Disparar descarga en el navegador
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Alias de compatibilidad. Antes era `downloadExcel` pero el backend solo
   * devuelve CSV. Mantengo el nombre viejo para no romper consumidores
   * existentes mientras migran.
   * @deprecated usa `downloadExport()`
   */
  async downloadExcel(
    options: OrderExportOptions,
    filename: string = 'ordenes_export'
  ): Promise<void> {
    return this.downloadExport(options, filename);
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
