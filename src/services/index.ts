export * from "./master";

export * from "./orders";

// Servicio unificado de Workflows (conectado con geocercas, órdenes, programación)
export { 
  unifiedWorkflowService, 
  UnifiedWorkflowService,
  WorkflowsService,
  type WorkflowGeofence,
  type WorkflowCustomer,
  type ApplyWorkflowResult,
  type OrderWorkflowProgress,
} from "./workflow.service";

export * from "./monitoring";

export * from "./integration";

// Servicio de Finanzas
export { financeService } from "./finance.service";

// Servicio de Notificaciones
export { notificationService } from "./notification.service";

// Servicio de Reportes
export { reportService } from "./report.service";

// Servicio de Configuración
export { settingsService } from "./settings.service";

// Servicio de Programación
export { schedulingService } from "./scheduling-service";

// Servicio de Geocodificación
export { geocodingService } from "./geocoding.service";

// Servicio de Mantenimiento
export * from "./maintenance";

// Servicio de Rutas (OSRM)
export { routingService } from "./routing.service";

// Servicio de Reportes PDF
export { pdfReportService } from "./pdf-report.service";

// Servicio de Recordatorios
export { reminderService } from "./reminder.service";

// Base service para extensión
export { BaseService, BulkService } from "./base.service";
export type { IBaseService, IBulkService } from "./base.service";

// Servicios de Plataforma (Nivel 1: Owner TMS)
export {
  tenantService,
  tenantModuleService,
  masterUserService,
  vehicleTransferService,
  platformDashboardService,
  fleetGroupService,
} from "./platform.service";
