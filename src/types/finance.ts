
/**
 * Estado de una factura
 */
export type InvoiceStatus = 
  | "draft"       // Borrador
  | "pending"     // Pendiente de envío
  | "sent"        // Enviada al cliente
  | "partial"     // Parcialmente pagada
  | "paid"        // Pagada completamente
  | "overdue"     // Vencida
  | "cancelled"   // Cancelada
  | "disputed";   // En disputa

/**
 * Tipo de factura
 */
export type InvoiceType =
  | "service"     // Servicio de transporte
  | "freight"     // Flete
  | "accessorial" // Servicios adicionales
  | "fuel"        // Combustible
  | "credit"      // Nota de crédito
  | "debit";      // Nota de débito

/**
 * Método de pago
 */
export type PaymentMethod =
  | "cash"           // Efectivo
  | "bank_transfer"  // Transferencia bancaria
  | "check"          // Cheque
  | "credit_card"    // Tarjeta de crédito
  | "debit_card"     // Tarjeta de débito
  | "credit"         // Crédito (a cuenta)
  | "other";         // Otro

/**
 * Estado de un pago
 */
export type PaymentStatus =
  | "pending"    // Pendiente
  | "processing" // En proceso
  | "completed"  // Completado
  | "failed"     // Fallido
  | "refunded"   // Reembolsado
  | "cancelled"; // Cancelado

/**
 * Tipo de costo
 */
export type CostType =
  | "fuel"          // Combustible
  | "toll"          // Peajes
  | "maintenance"   // Mantenimiento
  | "insurance"     // Seguro
  | "labor"         // Mano de obra
  | "depreciation"  // Depreciación
  | "administrative"// Administrativo
  | "accessorial"   // Servicios adicionales
  | "penalty"       // Multas/Penalidades
  | "other";        // Otros

/**
 * Categoría de tarifa
 */
export type RateCategory =
  | "weight"        // Por peso
  | "volume"        // Por volumen
  | "distance"      // Por distancia
  | "flat"          // Tarifa plana
  | "hourly"        // Por hora
  | "package"       // Por paquete
  | "pallet"        // Por pallet
  | "custom";       // Personalizada


/**
 * Ítem de línea en factura
 */
export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  taxRate: number;
  taxAmount: number;
  discount: number;
  discountType: "percentage" | "fixed";
  subtotal: number;
  total: number;
  orderId?: string;
  orderNumber?: string;
  serviceDate?: string;
}

/**
 * Impuesto aplicado
 */
export interface TaxDetail {
  id: string;
  name: string;
  code: string;
  rate: number;
  amount: number;
  isInclusive: boolean;
}

/**
 * Factura
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  
  // Cliente
  customerId: string;
  customerName: string;
  customerTaxId?: string;
  customerAddress?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Fechas
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  
  // Montos
  currency: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  
  // Detalles
  lineItems: InvoiceLineItem[];
  taxes: TaxDetail[];
  
  // Referencias
  orderIds?: string[];
  relatedInvoiceId?: string; // Para notas de crédito/débito
  purchaseOrderNumber?: string;
  
  // Notas
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  
  // Metadatos
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  attachments?: string[];
}

/**
 * Pago
 */
export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  
  paymentDate: string;
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  checkNumber?: string;
  
  notes?: string;
  processedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Costo de transporte
 */
export interface TransportCost {
  id: string;
  type: CostType;
  category: string;
  description: string;
  
  amount: number;
  currency: string;
  quantity: number;
  unitCost: number;
  unit: string;
  
  // Referencias
  orderId?: string;
  orderNumber?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  routeId?: string;
  
  // Fechas
  date: string;
  periodStart?: string;
  periodEnd?: string;
  
  isReimbursable: boolean;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // Documentación
  receiptNumber?: string;
  attachments?: string[];
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Tarifa de servicio
 */
export interface ServiceRate {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: RateCategory;
  
  // Precios
  baseRate: number;
  currency: string;
  unit: string;
  minCharge?: number;
  maxCharge?: number;
  
  // Rangos (para tarifas escalonadas)
  ranges?: {
    from: number;
    to: number;
    rate: number;
  }[];
  
  // Aplicabilidad
  customerId?: string;      // Tarifa específica de cliente
  customerGroup?: string;   // Grupo de clientes
  originZone?: string;
  destinationZone?: string;
  vehicleType?: string;
  serviceType?: string;
  
  // Validez
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  
  // Impuestos
  taxInclusive: boolean;
  taxRate?: number;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * Resumen financiero del cliente
 */
export interface CustomerFinancialSummary {
  customerId: string;
  customerName: string;
  
  // Facturación
  totalInvoiced: number;
  totalPaid: number;
  totalDue: number;
  overdueAmount: number;
  
  // Conteo
  invoiceCount: number;
  paidInvoiceCount: number;
  pendingInvoiceCount: number;
  overdueInvoiceCount: number;
  
  // Crédito
  creditLimit?: number;
  availableCredit?: number;
  
  // Promedios
  avgPaymentDays: number;
  avgInvoiceAmount: number;
  
  // Última actividad
  lastInvoiceDate?: string;
  lastPaymentDate?: string;
  
  // Periodo
  periodStart: string;
  periodEnd: string;
}

/**
 * Análisis de rentabilidad
 */
export interface ProfitabilityAnalysis {
  // Periodo
  periodStart: string;
  periodEnd: string;
  
  // Ingresos
  totalRevenue: number;
  serviceRevenue: number;
  accessorialRevenue: number;
  otherRevenue: number;
  
  // Costos
  totalCosts: number;
  fuelCosts: number;
  laborCosts: number;
  maintenanceCosts: number;
  insuranceCosts: number;
  tollCosts: number;
  depreciationCosts: number;
  administrativeCosts: number;
  otherCosts: number;
  
  // Márgenes
  grossProfit: number;
  grossMarginPercent: number;
  operatingProfit: number;
  operatingMarginPercent: number;
  netProfit: number;
  netMarginPercent: number;
  
  // Por entidad
  byCustomer?: {
    customerId: string;
    customerName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }[];
  
  byRoute?: {
    routeId: string;
    routeName: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }[];
  
  byVehicle?: {
    vehicleId: string;
    vehiclePlate: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }[];
}

/**
 * Flujo de caja
 */
export interface CashFlowSummary {
  periodStart: string;
  periodEnd: string;
  
  openingBalance: number;
  closingBalance: number;
  
  // Entradas
  totalInflows: number;
  customerPayments: number;
  otherInflows: number;
  
  // Salidas
  totalOutflows: number;
  supplierPayments: number;
  fuelExpenses: number;
  salaryPayments: number;
  otherOutflows: number;
  
  // Neto
  netCashFlow: number;
  
  // Por día/semana
  daily?: {
    date: string;
    inflows: number;
    outflows: number;
    netFlow: number;
    balance: number;
  }[];
}


/**
 * DTO para crear factura
 */
export interface CreateInvoiceDTO {
  type: InvoiceType;
  customerId: string;
  issueDate?: string;
  dueDate: string;
  currency?: string;
  lineItems: Omit<InvoiceLineItem, "id" | "taxAmount" | "subtotal" | "total">[];
  orderIds?: string[];
  purchaseOrderNumber?: string;
  notes?: string;
  termsAndConditions?: string;
}

/**
 * DTO para registrar pago
 */
export interface CreatePaymentDTO {
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  referenceNumber?: string;
  bankName?: string;
  accountNumber?: string;
  checkNumber?: string;
  notes?: string;
}

/**
 * DTO para registrar costo
 */
export interface CreateTransportCostDTO {
  type: CostType;
  category?: string;
  description: string;
  amount: number;
  currency?: string;
  quantity?: number;
  unit?: string;
  date: string;
  orderId?: string;
  vehicleId?: string;
  driverId?: string;
  routeId?: string;
  isReimbursable?: boolean;
  receiptNumber?: string;
  notes?: string;
}

/**
 * Filtros para facturas
 */
export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus | InvoiceStatus[];
  type?: InvoiceType | InvoiceType[];
  customerId?: string;
  customerIds?: string[];
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  isOverdue?: boolean;
  hasBalance?: boolean;
}

/**
 * Filtros para pagos
 */
export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus | PaymentStatus[];
  method?: PaymentMethod | PaymentMethod[];
  invoiceId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Filtros para costos
 */
export interface CostFilters {
  search?: string;
  type?: CostType | CostType[];
  category?: string;
  orderId?: string;
  vehicleId?: string;
  driverId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  isApproved?: boolean;
  isReimbursable?: boolean;
}


/**
 * Estadísticas generales de finanzas
 */
export interface FinanceStats {
  // Facturación
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  
  // Conteos
  invoiceCount: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  
  // Costos
  totalCosts: number;
  costsByType: { type: CostType; amount: number }[];
  
  // Rentabilidad
  grossRevenue: number;
  netRevenue: number;
  profitMargin: number;
  
  // Tendencia
  revenueGrowth: number; // % vs periodo anterior
  costGrowth: number;
  
  // Por periodo
  monthlyRevenue?: { month: string; amount: number }[];
  monthlyCosts?: { month: string; amount: number }[];
}

/**
 * Cuentas por cobrar aging
 */
export interface AccountsReceivableAging {
  current: number;        // No vencido
  days1to30: number;      // 1-30 días
  days31to60: number;     // 31-60 días
  days61to90: number;     // 61-90 días
  over90Days: number;     // >90 días
  total: number;
  
  byCustomer?: {
    customerId: string;
    customerName: string;
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    over90Days: number;
    total: number;
  }[];
}

export default Invoice;
