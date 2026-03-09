/**
 * @fileoverview Tipos para el Módulo de Mantenimiento de Flota
 * Sistema TMS Navitel - Gestión integral de mantenimiento vehicular
 */

// ==================== VEHÍCULOS ====================

export type VehicleStatus = 'active' | 'maintenance' | 'out_of_service' | 'reserved';
export type VehicleType = 'truck' | 'van' | 'pickup' | 'trailer' | 'car';
export type FuelType = 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'cng';

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  brand: string;
  model: string;
  year: number;
  fuelType: FuelType;
  
  // Capacidades
  capacityKg: number;
  capacityM3?: number;
  
  // Kilometraje
  currentMileage: number;
  lastMileageUpdate: string;
  
  // Estado operativo
  status: VehicleStatus;
  availableFrom?: string; // Si está en mantenimiento, cuándo estará disponible
  
  // Datos técnicos
  vin?: string; // Vehicle Identification Number
  engineNumber?: string;
  transmission: 'manual' | 'automatic';
  axles?: number;
  
  // Documentación
  registrationExpiry?: string;
  insuranceExpiry?: string;
  technicalReviewExpiry?: string;
  
  // Mantenimiento
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  maintenanceKmInterval: number; // Intervalo en KM
  maintenanceDaysInterval: number; // Intervalo en días
  
  // Costos
  acquisitionCost?: number;
  acquisitionDate?: string;
  
  // Ubicación y asignación
  currentLocation?: string;
  assignedDriverId?: string;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  notes?: string;
}

// ==================== MANTENIMIENTO PREVENTIVO ====================

export type MaintenanceType = 
  | 'oil_change'
  | 'filter_change'
  | 'tire_rotation'
  | 'brake_inspection'
  | 'general_inspection'
  | 'technical_review'
  | 'tune_up'
  | 'alignment'
  | 'battery_check'
  | 'cooling_system'
  | 'transmission_service'
  | 'custom';

export type MaintenanceScheduleStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed';

export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  customTypeName?: string; // Si type === 'custom'
  
  // Programación
  scheduleType: 'mileage' | 'time' | 'both';
  intervalKm?: number; // Cada cuántos KM
  intervalDays?: number; // Cada cuántos días
  
  // Próximo mantenimiento
  nextDueDate?: string;
  nextDueMileage?: number;
  
  // Estado
  status: MaintenanceScheduleStatus;
  isActive: boolean;
  
  // Alertas
  alertDaysBefore: number;
  alertKmBefore: number;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
}

// ==================== MANTENIMIENTO CORRECTIVO ====================

export type BreakdownSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreakdownStatus = 'reported' | 'diagnosed' | 'in_repair' | 'resolved';

export interface Breakdown {
  id: string;
  vehicleId: string;
  
  // Descripción del problema
  title: string;
  description: string;
  severity: BreakdownSeverity;
  
  // Contexto
  reportedDate: string;
  reportedBy: string; // userId
  reportedByName: string;
  mileageAtBreakdown: number;
  location?: string;
  
  // Estado
  status: BreakdownStatus;
  diagnosisDate?: string;
  diagnosis?: string;
  
  // Relación con OT
  workOrderId?: string;
  
  // Tiempo fuera de servicio
  vehicleDownFrom: string;
  vehicleDownUntil?: string;
  totalDowntimeHours?: number;
  
  // Conductor afectado
  driverId?: string;
  driverName?: string;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// ==================== ÓRDENES DE TRABAJO ====================

export type WorkOrderType = 'preventive' | 'corrective' | 'inspection' | 'emergency';
export type WorkOrderStatus = 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
export type WorkOrderPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  orderNumber: string; // OT-2024-001
  vehicleId: string;
  
  // Tipo y clasificación
  type: WorkOrderType;
  maintenanceType?: MaintenanceType;
  priority: WorkOrderPriority;
  
  // Descripción
  title: string;
  description: string;
  
  // Estado
  status: WorkOrderStatus;
  
  // Fechas
  createdDate: string;
  scheduledDate?: string;
  startedDate?: string;
  completedDate?: string;
  
  // Asignación
  workshopId?: string;
  workshopName?: string;
  technicianId?: string;
  technicianName?: string;
  
  // Kilometraje
  mileageAtService?: number;
  
  // Costos
  estimatedCost?: number;
  estimatedLaborHours?: number;
  
  actualCost?: number;
  laborCost?: number;
  partsCost?: number;
  actualLaborHours?: number;
  
  // Repuestos usados
  partsUsed: WorkOrderPart[];
  
  // Relaciones
  scheduleId?: string; // Si viene de mantenimiento preventivo
  breakdownId?: string; // Si viene de falla
  
  // Resultados
  workDone?: string;
  recommendations?: string;
  
  // Auditoría
  createdBy: string;
  updatedAt: string;
  completedBy?: string;
  
  // Documentos
  attachments?: string[];
  
  notes?: string;
}

export interface WorkOrderPart {
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

// ==================== TALLERES ====================

export type WorkshopType = 'internal' | 'external';

export interface Workshop {
  id: string;
  name: string;
  type: WorkshopType;
  
  // Datos de contacto
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  
  // Especialidades
  specialties: string[];
  
  // Métricas
  totalWorkOrders: number;
  averageCompletionTime: number; // horas
  totalCost: number;
  rating?: number;
  
  // Estado
  isActive: boolean;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

// ==================== REPUESTOS E INVENTARIO ====================

export type PartCategory = 
  | 'engine'
  | 'transmission'
  | 'brakes'
  | 'suspension'
  | 'electrical'
  | 'filters'
  | 'fluids'
  | 'tires'
  | 'body'
  | 'accessories'
  | 'other';

export interface Part {
  id: string;
  partNumber: string; // Número de parte del fabricante
  name: string;
  category: PartCategory;
  
  // Descripción
  description?: string;
  brand?: string;
  
  // Compatibilidad
  compatibleVehicles?: string[]; // IDs de vehículos
  vehicleModels?: string[]; // Marcas/modelos compatibles
  
  // Inventario
  currentStock: number;
  minStock: number;
  maxStock?: number;
  unit: string; // pieza, litro, kg, etc.
  
  // Ubicación
  location?: string; // Almacén, estante, etc.
  
  // Costos
  unitCost: number;
  lastPurchasePrice?: number;
  lastPurchaseDate?: string;
  
  // Proveedor
  supplierId?: string;
  supplierName?: string;
  supplierPartNumber?: string;
  
  // Estado
  isActive: boolean;
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface PartTransaction {
  id: string;
  partId: string;
  type: 'purchase' | 'usage' | 'adjustment' | 'return';
  
  quantity: number;
  unitCost: number;
  totalCost: number;
  
  // Contexto
  workOrderId?: string;
  supplierId?: string;
  
  stockBefore: number;
  stockAfter: number;
  
  reason?: string;
  
  // Auditoría
  transactionDate: string;
  performedBy: string;
  notes?: string;
}

// ==================== INSPECCIONES ====================

export type InspectionType = 'pre_trip' | 'post_trip' | 'periodic' | 'safety';
export type InspectionStatus = 'pending' | 'completed' | 'failed' | 'expired';

export interface Inspection {
  id: string;
  vehicleId: string;
  type: InspectionType;
  
  // Programación
  scheduledDate?: string;
  dueDate?: string;
  
  // Ejecución
  performedDate?: string;
  performedBy: string; // userId
  performedByName: string;
  mileage: number;
  
  // Estado
  status: InspectionStatus;
  passed: boolean;
  score?: number; // 0-100
  
  // Checklist
  checklistId: string;
  items: InspectionItem[];
  
  // Resultados
  findings: string[];
  recommendations?: string;
  
  // Evidencia
  photos?: string[];
  signature?: string; // Base64 o URL
  
  // Acciones requeridas
  requiresImmediateAction: boolean;
  actionItems?: string[];
  workOrderCreated?: string; // ID de OT creada
  
  // Auditoría
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface InspectionItem {
  id: string;
  category: string;
  item: string;
  status: 'ok' | 'warning' | 'fail' | 'na';
  notes?: string;
  photoUrl?: string;
}

export interface InspectionChecklist {
  id: string;
  name: string;
  type: InspectionType;
  vehicleTypes: VehicleType[];
  
  categories: InspectionChecklistCategory[];
  
  isActive: boolean;
  isDefault: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface InspectionChecklistCategory {
  id: string;
  name: string;
  items: InspectionChecklistItem[];
}

export interface InspectionChecklistItem {
  id: string;
  description: string;
  requiresPhoto: boolean;
  isCritical: boolean;
}

// ==================== ALERTAS ====================

export type AlertType = 
  | 'maintenance_due_soon'
  | 'maintenance_overdue'
  | 'inspection_required'
  | 'document_expiring'
  | 'low_stock'
  | 'work_order_delayed'
  | 'vehicle_unavailable';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  
  title: string;
  message: string;
  
  // Contexto
  vehicleId?: string;
  workOrderId?: string;
  partId?: string;
  
  // Estado
  isRead: boolean;
  isDismissed: boolean;
  
  // Acción sugerida
  actionUrl?: string;
  actionLabel?: string;
  
  // Fecha
  createdAt: string;
  expiresAt?: string;
}

// ==================== REPORTES Y ANÁLISIS ====================

export interface MaintenanceMetrics {
  // Por vehículo
  vehicleId?: string;
  
  // Período
  periodStart: string;
  periodEnd: string;
  
  // Mantenimientos
  totalPreventive: number;
  totalCorrective: number;
  totalWorkOrders: number;
  
  // Costos
  totalCost: number;
  preventiveCost: number;
  correctiveCost: number;
  costPerKm: number;
  costPerDay: number;
  
  // Tiempo
  totalDowntimeHours: number;
  averageDowntimePerIncident: number;
  mtbf?: number; // Mean Time Between Failures (horas)
  mttr?: number; // Mean Time To Repair (horas)
  
  // Disponibilidad
  availabilityRate: number; // Porcentaje
  
  // Tendencias
  monthlyTrend?: MonthlyMaintenanceTrend[];
}

export interface MonthlyMaintenanceTrend {
  month: string;
  preventiveCount: number;
  correctiveCount: number;
  totalCost: number;
  downtimeHours: number;
}

export interface VehicleMaintenanceHistory {
  vehicleId: string;
  vehicle: Vehicle;
  
  summary: {
    totalWorkOrders: number;
    totalCost: number;
    totalDowntimeHours: number;
    lastMaintenanceDate?: string;
    nextMaintenanceDue?: string;
  };
  
  timeline: MaintenanceEvent[];
}

export interface MaintenanceEvent {
  id: string;
  type: 'work_order' | 'inspection' | 'breakdown' | 'document';
  date: string;
  title: string;
  description: string;
  cost?: number;
  mileage?: number;
  status?: string;
}

// ==================== CONFIGURACIÓN ====================

export interface MaintenanceSettings {
  // Alertas
  maintenanceDueAlertDays: number;
  maintenanceDueAlertKm: number;
  documentExpiryAlertDays: number;
  lowStockAlertThreshold: number;
  
  // Bloqueos
  blockVehicleIfMaintenanceOverdue: boolean;
  blockVehicleIfInspectionExpired: boolean;
  blockVehicleIfDocumentExpired: boolean;
  
  // Notificaciones
  notifyMaintenanceDue: boolean;
  notifyLowStock: boolean;
  notifyWorkOrderDelayed: boolean;
  
  // Email destinatarios
  maintenanceAlertEmails: string[];
  
  // Otros
  defaultLaborRate: number; // Costo por hora
  defaultCurrency: string;
}
