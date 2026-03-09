
/**
 * Tipo de reporte
 */
export type ReportType =
  | "operational"       // Operacional
  | "financial"         // Financiero
  | "fleet"             // Flota
  | "driver"            // Conductores
  | "customer"          // Clientes
  | "order"             // Órdenes
  | "route"             // Rutas
  | "maintenance"       // Mantenimiento
  | "fuel"              // Combustible
  | "incident"          // Incidentes
  | "compliance"        // Cumplimiento
  | "kpi"               // KPIs
  | "custom";           // Personalizado

/**
 * Formato de exportación
 */
export type ExportFormat = "pdf" | "excel" | "csv" | "json" | "html";

/**
 * Frecuencia de programación
 */
export type ScheduleFrequency =
  | "once"        // Una vez
  | "daily"       // Diario
  | "weekly"      // Semanal
  | "biweekly"    // Quincenal
  | "monthly"     // Mensual
  | "quarterly"   // Trimestral
  | "yearly";     // Anual

/**
 * Unidad de rango de fecha relativa
 */
export type RelativeDateRangeUnit = "days" | "weeks" | "months" | "quarters" | "years";

/**
 * Estado del reporte
 */
export type ReportStatus =
  | "pending"     // Pendiente
  | "generating"  // Generando
  | "completed"   // Completado
  | "failed"      // Fallido
  | "expired";    // Expirado


/**
 * Filtro de reporte
 */
export interface ReportFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in" | "between";
  value: unknown;
  label?: string;
}

/**
 * Columna de reporte
 */
export interface ReportColumn {
  id: string;
  field: string;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "date" | "datetime" | "percentage" | "boolean";
  decimals?: number;
  currency?: string;
  isVisible: boolean;
  sortable?: boolean;
  aggregation?: "sum" | "avg" | "count" | "min" | "max";
}

/**
 * Agrupación de datos
 */
export interface ReportGrouping {
  field: string;
  label: string;
  order: "asc" | "desc";
  showSubtotals: boolean;
}

/**
 * Gráfico en reporte
 */
export interface ReportChart {
  id: string;
  type: "bar" | "line" | "pie" | "doughnut" | "area" | "scatter";
  title: string;
  dataField: string;
  labelField: string;
  width?: number;
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showValues?: boolean;
}

/**
 * Definición de reporte
 */
export interface ReportDefinition {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: ReportType;
  category: string;
  
  // Fuente de datos
  dataSource: string;
  baseQuery?: string;
  
  // Estructura
  columns: ReportColumn[];
  filters: ReportFilter[];
  defaultFilters?: ReportFilter[];
  groupings?: ReportGrouping[];
  sortBy?: { field: string; direction: "asc" | "desc" }[];
  
  // Visualización
  charts?: ReportChart[];
  showTotals?: boolean;
  showRowNumbers?: boolean;
  
  // Formato
  orientation?: "portrait" | "landscape";
  pageSize?: "A4" | "letter" | "legal";
  headerText?: string;
  footerText?: string;
  logo?: string;
  
  // Permisos
  isPublic: boolean;
  allowedRoles?: string[];
  createdBy: string;
  
  // Metadatos
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

/**
 * Plantilla de reporte
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  
  definition: Partial<ReportDefinition>;
  
  // Parámetros requeridos
  requiredParams: {
    name: string;
    label: string;
    type: "string" | "number" | "date" | "dateRange" | "select" | "multiSelect";
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
    required: boolean;
  }[];
  
  // Formato predeterminado
  defaultFormat: ExportFormat;
  availableFormats: ExportFormat[];
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Reporte generado
 */
export interface GeneratedReport {
  id: string;
  definitionId: string;
  templateId?: string;
  name: string;
  type: ReportType;
  
  // Parámetros utilizados
  parameters: Record<string, unknown>;
  filters: ReportFilter[];
  dateRange?: { start: string; end: string };
  
  // Generación
  status: ReportStatus;
  format: ExportFormat;
  fileUrl?: string;
  fileSize?: number;
  rowCount?: number;
  
  // Tiempos
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  
  // Usuario
  requestedBy: string;
  
  // Error
  errorMessage?: string;
}

/**
 * Programación de reporte
 */
export interface ReportSchedule {
  id: string;
  definitionId: string;
  name: string;
  description?: string;
  
  frequency: ScheduleFrequency;
  dayOfWeek?: number;     // 0-6 (Domingo-Sábado)
  dayOfMonth?: number;    // 1-31
  timeOfDay: string;      // HH:mm
  timezone: string;
  
  // Parámetros
  parameters: Record<string, unknown>;
  relativeDateRange?: {
    unit: "days" | "weeks" | "months" | "quarters" | "years";
    value: number;
  };
  
  // Formato y entrega
  format: ExportFormat;
  recipients: string[];   // Emails
  sendEmpty: boolean;     // Enviar aunque no haya datos
  
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: ReportStatus;
  runCount: number;
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard KPI
 */
export interface KPIDashboard {
  id: string;
  name: string;
  description?: string;
  
  widgets: KPIWidget[];
  
  layout: {
    columns: number;
    rows: number;
  };
  
  refreshInterval?: number; // segundos
  
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Widget de KPI
 */
export interface KPIWidget {
  id: string;
  type: "metric" | "chart" | "table" | "map" | "gauge";
  title: string;
  
  // Posición en grid
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  config: {
    // Métrica
    metric?: {
      value: number;
      format: "number" | "currency" | "percentage";
      comparison?: {
        value: number;
        type: "previous_period" | "target";
      };
      trend?: "up" | "down" | "stable";
      color?: string;
    };
    
    // Gráfico
    chart?: ReportChart;
    
    // Tabla
    table?: {
      columns: ReportColumn[];
      data: Record<string, unknown>[];
      maxRows?: number;
    };
    
    // Gauge
    gauge?: {
      value: number;
      min: number;
      max: number;
      thresholds?: { value: number; color: string }[];
    };
  };
  
  // Fuente de datos
  dataSource: string;
  filters?: ReportFilter[];
  refreshInterval?: number;
}


/**
 * Solicitud de generación de reporte
 */
export interface GenerateReportRequest {
  definitionId?: string;
  templateId?: string;
  name?: string;
  
  parameters?: Record<string, unknown>;
  filters?: ReportFilter[];
  dateRange?: { start: string; end: string };
  
  format: ExportFormat;
  columns?: string[];     // IDs de columnas a incluir
  
  async?: boolean;        // Si es async, retorna ID para consultar estado
}

/**
 * Crear definición de reporte
 */
export interface CreateReportDefinitionDTO {
  code: string;
  name: string;
  description?: string;
  type: ReportType;
  category: string;
  dataSource: string;
  columns: Omit<ReportColumn, "id">[];
  filters?: ReportFilter[];
  groupings?: ReportGrouping[];
  charts?: Omit<ReportChart, "id">[];
  isPublic?: boolean;
}

/**
 * Crear programación de reporte
 */
export interface CreateReportScheduleDTO {
  definitionId: string;
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay: string;
  timezone?: string;
  parameters?: Record<string, unknown>;
  relativeDateRange?: { unit: string; value: number };
  format: ExportFormat;
  recipients: string[];
  sendEmpty?: boolean;
}

/**
 * Filtros para buscar reportes generados
 */
export interface GeneratedReportFilters {
  search?: string;
  type?: ReportType | ReportType[];
  status?: ReportStatus | ReportStatus[];
  format?: ExportFormat | ExportFormat[];
  requestedBy?: string;
  startDate?: string;
  endDate?: string;
}


/**
 * Estadísticas de uso de reportes
 */
export interface ReportUsageStats {
  totalGenerated: number;
  byType: { type: ReportType; count: number }[];
  byFormat: { format: ExportFormat; count: number }[];
  byStatus: { status: ReportStatus; count: number }[];
  avgGenerationTime: number; // segundos
  topReports: { 
    definitionId: string; 
    name: string; 
    count: number 
  }[];
  topUsers: { 
    userId: string; 
    userName: string; 
    count: number 
  }[];
  dailyTrend: { 
    date: string; 
    count: number 
  }[];
}

/**
 * Datos pre-calculados para reportes operacionales
 */
export interface OperationalReportData {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  completionRate: number;
  
  // Entregas
  onTimeDeliveries: number;
  lateDeliveries: number;
  onTimeRate: number;
  avgDeliveryTime: number; // minutos
  
  activeVehicles: number;
  utilizationRate: number;
  totalKmTraveled: number;
  avgKmPerVehicle: number;
  
  activeDrivers: number;
  avgOrdersPerDriver: number;
  topDrivers: { driverId: string; name: string; orders: number }[];
  
  // Incidentes
  totalIncidents: number;
  resolvedIncidents: number;
  avgResolutionTime: number; // minutos
  
  // Por período
  periodStart: string;
  periodEnd: string;
}

/**
 * Datos pre-calculados para reportes financieros
 */
export interface FinancialReportData {
  // Ingresos
  totalRevenue: number;
  revenueByService: { service: string; amount: number }[];
  revenueByCustomer: { customerId: string; name: string; amount: number }[];
  
  // Facturación
  totalInvoiced: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  
  // Costos
  totalCosts: number;
  costsByCategory: { category: string; amount: number }[];
  costsByVehicle: { vehicleId: string; plate: string; amount: number }[];
  
  // Rentabilidad
  grossProfit: number;
  grossMargin: number;
  netProfit: number;
  netMargin: number;
  
  // Comparación
  previousPeriodRevenue?: number;
  revenueGrowth?: number;
  previousPeriodCosts?: number;
  costGrowth?: number;
  
  periodStart: string;
  periodEnd: string;
}

export default ReportDefinition;
