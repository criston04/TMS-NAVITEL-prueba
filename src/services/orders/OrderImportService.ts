import type {
  Order,
  CreateOrderDTO,
  OrderImportRow,
  OrderImportResult,
  CargoType,
  OrderPriority,
} from '@/types/order';
import { orderService } from './OrderService';
import { apiConfig, API_ENDPOINTS } from "@/config/api.config";
import { apiClient } from "@/lib/api";

/**
 * Columnas esperadas en el archivo Excel
 */
export const EXPECTED_COLUMNS = [
  'cliente_id',
  'cliente_nombre',
  'transportista_id',
  'vehiculo_id',
  'conductor_id',
  'workflow_id',
  'prioridad',
  'carga_descripcion',
  'carga_tipo',
  'carga_peso_kg',
  'carga_cantidad',
  'carga_valor',
  'origen_nombre',
  'origen_direccion',
  'origen_lat',
  'origen_lng',
  'destino_nombre',
  'destino_direccion',
  'destino_lat',
  'destino_lng',
  'fecha_inicio',
  'fecha_fin',
  'referencia_externa',
  'notas',
] as const;

/**
 * Tipo para una fila del Excel
 */
type ExcelRow = Record<string, string | number | null | undefined>;

/**
 * Mapeo de prioridades válidas
 */
const PRIORITY_MAP: Record<string, OrderPriority> = {
  baja: 'low',
  normal: 'normal',
  alta: 'high',
  urgente: 'urgent',
  low: 'low',
  high: 'high',
  urgent: 'urgent',
};

/**
 * Mapeo de tipos de carga válidos
 */
const CARGO_TYPE_MAP: Record<string, CargoType> = {
  general: 'general',
  refrigerada: 'refrigerated',
  refrigerated: 'refrigerated',
  peligrosa: 'hazardous',
  hazardous: 'hazardous',
  fragil: 'fragile',
  fragile: 'fragile',
  sobredimensionada: 'oversized',
  oversized: 'oversized',
  liquida: 'liquid',
  liquid: 'liquid',
  granel: 'bulk',
  bulk: 'bulk',
};

/**
 * Simula latencia de red
 */
const simulateDelay = (ms: number = 300): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Clase de servicio para importación de órdenes
 */
class OrderImportService {
  private readonly useMocks: boolean;

  constructor() {
    this.useMocks = apiConfig.useMocks;
  }

  /**
   * Valida el formato del archivo Excel
   * @param headers - Encabezados del archivo
   * @returns Objeto con estado de validación
   */
  validateHeaders(headers: string[]): {
    isValid: boolean;
    missingColumns: string[];
    extraColumns: string[];
  } {
    const normalizedHeaders = headers.map(h => 
      h.toLowerCase().trim().replaceAll(/\s+/g, '_')
    );

    const requiredColumns = [
      'cliente_id',
      'carga_descripcion',
      'origen_nombre',
      'destino_nombre',
      'fecha_inicio',
      'fecha_fin',
    ];

    const missingColumns = requiredColumns.filter(
      col => !normalizedHeaders.includes(col)
    );

    const extraColumns = normalizedHeaders.filter(
      col => !EXPECTED_COLUMNS.includes(col as typeof EXPECTED_COLUMNS[number])
    );

    return {
      isValid: missingColumns.length === 0,
      missingColumns,
      extraColumns,
    };
  }

  /**
   * Parsea y valida una fila del Excel
   * @param row - Fila del Excel
   * @param rowNumber - Número de fila
   * @returns Fila parseada con errores y advertencias
   */
  parseRow(row: ExcelRow, rowNumber: number): OrderImportRow {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Validaciones obligatorias
    if (!row['cliente_id']) {
      errors.push('El campo cliente_id es obligatorio');
    }

    if (!row['carga_descripcion']) {
      errors.push('El campo carga_descripcion es obligatorio');
    }

    if (!row['origen_nombre']) {
      errors.push('El campo origen_nombre es obligatorio');
    }

    if (!row['destino_nombre']) {
      errors.push('El campo destino_nombre es obligatorio');
    }

    if (!row['fecha_inicio']) {
      errors.push('El campo fecha_inicio es obligatorio');
    }

    if (!row['fecha_fin']) {
      errors.push('El campo fecha_fin es obligatorio');
    }

    // Validaciones de formato
    const priority = row['prioridad']?.toString().toLowerCase();
    if (priority && !PRIORITY_MAP[priority]) {
      errors.push(`Prioridad inválida: ${priority}. Valores válidos: baja, normal, alta, urgente`);
    }

    const cargoType = row['carga_tipo']?.toString().toLowerCase();
    if (cargoType && !CARGO_TYPE_MAP[cargoType]) {
      warnings.push(`Tipo de carga desconocido: ${cargoType}. Se usará "general"`);
    }

    // Validar coordenadas
    const originLat = Number(row['origen_lat']);
    const originLng = Number(row['origen_lng']);
    if (row['origen_lat'] && (Number.isNaN(originLat) || originLat < -90 || originLat > 90)) {
      errors.push('Latitud de origen inválida');
    }
    if (row['origen_lng'] && (Number.isNaN(originLng) || originLng < -180 || originLng > 180)) {
      errors.push('Longitud de origen inválida');
    }

    const destLat = Number(row['destino_lat']);
    const destLng = Number(row['destino_lng']);
    if (row['destino_lat'] && (Number.isNaN(destLat) || destLat < -90 || destLat > 90)) {
      errors.push('Latitud de destino inválida');
    }
    if (row['destino_lng'] && (Number.isNaN(destLng) || destLng < -180 || destLng > 180)) {
      errors.push('Longitud de destino inválida');
    }

    // Validar fechas
    const startDate = new Date(row['fecha_inicio'] as string);
    const endDate = new Date(row['fecha_fin'] as string);
    if (row['fecha_inicio'] && Number.isNaN(startDate.getTime())) {
      errors.push('Formato de fecha_inicio inválido');
    }
    if (row['fecha_fin'] && Number.isNaN(endDate.getTime())) {
      errors.push('Formato de fecha_fin inválido');
    }
    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate > endDate) {
      errors.push('La fecha de inicio no puede ser posterior a la fecha de fin');
    }

    // Validar peso y cantidad
    const weight = Number(row['carga_peso_kg']);
    if (row['carga_peso_kg'] && (Number.isNaN(weight) || weight <= 0)) {
      warnings.push('Peso de carga inválido o no especificado');
    }

    const quantity = Number(row['carga_cantidad']);
    if (row['carga_cantidad'] && (Number.isNaN(quantity) || quantity <= 0)) {
      warnings.push('Cantidad de carga inválida o no especificada');
    }

    // Construir DTO si no hay errores críticos
    const data: Partial<CreateOrderDTO> = {
      customerId: row['cliente_id']?.toString() ?? '',
      carrierId: row['transportista_id']?.toString(),
      vehicleId: row['vehiculo_id']?.toString(),
      driverId: row['conductor_id']?.toString(),
      workflowId: row['workflow_id']?.toString(),
      priority: PRIORITY_MAP[priority ?? 'normal'] ?? 'normal',
      cargo: {
        description: row['carga_descripcion']?.toString() ?? '',
        type: CARGO_TYPE_MAP[cargoType ?? 'general'] ?? 'general',
        weightKg: weight > 0 ? weight : 1000,
        quantity: quantity > 0 ? quantity : 1,
        declaredValue: Number(row['carga_valor']) || undefined,
      },
      milestones: [
        {
          geofenceId: `geo-origin-${rowNumber}`,
          geofenceName: row['origen_nombre']?.toString() ?? 'Origen',
          type: 'origin' as const,
          sequence: 1,
          address: row['origen_direccion']?.toString() ?? '',
          coordinates: {
            lat: originLat || -12.0464,
            lng: originLng || -77.0428,
          },
          estimatedArrival: row['fecha_inicio']?.toString() ?? new Date().toISOString(),
        },
        {
          geofenceId: `geo-dest-${rowNumber}`,
          geofenceName: row['destino_nombre']?.toString() ?? 'Destino',
          type: 'destination' as const,
          sequence: 2,
          address: row['destino_direccion']?.toString() ?? '',
          coordinates: {
            lat: destLat || -12.0464,
            lng: destLng || -77.0428,
          },
          estimatedArrival: row['fecha_fin']?.toString() ?? new Date().toISOString(),
        },
      ],
      scheduledStartDate: row['fecha_inicio']?.toString() ?? new Date().toISOString(),
      scheduledEndDate: row['fecha_fin']?.toString() ?? new Date().toISOString(),
      externalReference: row['referencia_externa']?.toString(),
      notes: row['notas']?.toString(),
    };

    return {
      rowNumber,
      data,
      errors,
      warnings,
      status: this.determineRowStatus(errors, warnings),
    };
  }

  /**
   * Determines the row status based on errors and warnings
   */
  private determineRowStatus(errors: string[], warnings: string[]): 'valid' | 'warning' | 'invalid' {
    if (errors.length > 0) return 'invalid';
    if (warnings.length > 0) return 'warning';
    return 'valid';
  }

  /**
   * Previsualiza la importación sin crear órdenes
   * @param rows - Filas del Excel
   * @returns Resultado de la previsualización
   */
  async preview(rows: ExcelRow[]): Promise<OrderImportResult> {
    await simulateDelay(500);

    const parsedRows = rows.map((row, index) => this.parseRow(row, index + 2)); // +2 porque row 1 es header

    return {
      totalRows: parsedRows.length,
      validRows: parsedRows.filter(r => r.status === 'valid').length,
      errorRows: parsedRows.filter(r => r.status === 'invalid').length,
      warningRows: parsedRows.filter(r => r.status === 'warning').length,
      rows: parsedRows,
    };
  }

  /**
   * Ejecuta la importación creando las órdenes
   * @param rows - Filas validadas del Excel
   * @param options - Opciones de importación
   * @returns Resultado de la importación con órdenes creadas
   */
  async import(
    rows: ExcelRow[],
    options: {
      skipInvalid?: boolean;
      skipWarnings?: boolean;
    } = {}
  ): Promise<OrderImportResult> {
    if (this.useMocks) {
      await simulateDelay(500);

      const { skipInvalid = true, skipWarnings = false } = options;
      const parsedRows = rows.map((row, index) => this.parseRow(row, index + 2));
      const createdOrders: Order[] = [];

      // Filtrar filas a procesar
      let rowsToProcess = parsedRows;
      if (skipInvalid) {
        rowsToProcess = rowsToProcess.filter(r => r.status !== 'invalid');
      }
      if (skipWarnings) {
        rowsToProcess = rowsToProcess.filter(r => r.status === 'valid');
      }

      // Crear órdenes
      for (const row of rowsToProcess) {
        if (row.status === 'invalid') continue;

        try {
          const order = await orderService.createOrder(row.data as CreateOrderDTO);
          createdOrders.push(order);
        } catch (error) {
          row.errors.push(`Error al crear orden: ${(error as Error).message}`);
          row.status = 'invalid';
        }
      }

      return {
        totalRows: parsedRows.length,
        validRows: parsedRows.filter(r => r.status === 'valid').length,
        errorRows: parsedRows.filter(r => r.status === 'invalid').length,
        warningRows: parsedRows.filter(r => r.status === 'warning').length,
        rows: parsedRows,
        createdOrders,
      };
    }
    return apiClient.post<OrderImportResult>(`${API_ENDPOINTS.operations.orders}/import`, { rows, ...options });
  }

  /**
   * Genera una plantilla de Excel para importación y la descarga como CSV
   * @description En producción, generar un archivo .xlsx con exceljs
   */
  getTemplate(): void {
    const headers = [...EXPECTED_COLUMNS];
    const sampleRow: Record<string, string | number> = {
      cliente_id: 'cust-001',
      cliente_nombre: 'Cliente Ejemplo',
      transportista_id: 'car-001',
      vehiculo_id: 'veh-001',
      conductor_id: 'drv-001',
      workflow_id: 'wf-1',
      prioridad: 'normal',
      carga_descripcion: 'Carga de ejemplo',
      carga_tipo: 'general',
      carga_peso_kg: 5000,
      carga_cantidad: 50,
      carga_valor: 10000,
      origen_nombre: 'Almacén Central',
      origen_direccion: 'Av. Principal 123',
      origen_lat: -12.0464,
      origen_lng: -77.0428,
      destino_nombre: 'Centro Distribución',
      destino_direccion: 'Calle Destino 456',
      destino_lat: -12.1,
      destino_lng: -77.05,
      fecha_inicio: '2026-02-01T08:00:00',
      fecha_fin: '2026-02-01T18:00:00',
      referencia_externa: 'REF-EXT-001',
      notas: 'Notas de ejemplo',
    };

    // Instrucciones como filas comentadas
    const instructions = [
      '# Campos obligatorios: cliente_id, carga_descripcion, origen_nombre, destino_nombre, fecha_inicio, fecha_fin',
      '# Prioridades válidas: baja, normal, alta, urgente',
      '# Tipos de carga: general, refrigerada, peligrosa, fragil, sobredimensionada, liquida, granel',
      '# Formato de fechas: YYYY-MM-DDTHH:mm:ss (ISO 8601)',
      '# Coordenadas: Latitud entre -90 y 90, Longitud entre -180 y 180',
    ];

    // Construir CSV
    const csvRows: string[] = [];
    // Instrucciones al inicio
    for (const instruction of instructions) {
      csvRows.push(instruction);
    }
    // Headers
    csvRows.push(headers.join(','));
    // Datos de ejemplo
    const sampleValues = headers.map(h => {
      const val = sampleRow[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return val?.toString() ?? '';
    });
    csvRows.push(sampleValues.join(','));

    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importacion_ordenes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parsea un archivo Excel (simulado)
   * @param _file - Archivo a parsear (no usado en mock)
   * @returns Promesa con las filas parseadas
   * @description En producción, usar librería como xlsx o exceljs
   */
  async parseExcelFile(_file: File): Promise<ExcelRow[]> {
    await simulateDelay(1000);

    // En producción, aquí se usaría xlsx o exceljs
    // Por ahora retornamos datos mock para demostración
    console.warn('parseExcelFile: En producción, implementar con xlsx o exceljs');
    
    return [
      {
        cliente_id: 'cust-001',
        cliente_nombre: 'Corporación Andina de Fomento',
        transportista_id: 'car-001',
        vehiculo_id: 'veh-001',
        conductor_id: 'drv-001',
        workflow_id: 'wf-1',
        prioridad: 'normal',
        carga_descripcion: 'Carga importada desde Excel',
        carga_tipo: 'general',
        carga_peso_kg: 5000,
        carga_cantidad: 50,
        carga_valor: 10000,
        origen_nombre: 'Almacén Lima',
        origen_direccion: 'Av. Argentina 1234',
        origen_lat: -12.0464,
        origen_lng: -77.0428,
        destino_nombre: 'Centro Arequipa',
        destino_direccion: 'Parque Industrial',
        destino_lat: -16.409,
        destino_lng: -71.5375,
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(Date.now() + 24 * 3600000).toISOString(),
        referencia_externa: 'EXT-IMPORT-001',
        notas: 'Importado desde Excel',
      },
    ];
  }
}

/**
 * Instancia singleton del servicio de importación
 */
export const orderImportService = new OrderImportService();

/**
 * Exporta la clase para testing
 */
export { OrderImportService };
