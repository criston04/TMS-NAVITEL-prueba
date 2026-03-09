export { customersService } from "./customers.service";
export { driversService } from "./drivers.service";
export { vehiclesService } from "./vehicles.service";
export { geofencesService } from "./geofences.service";
export { operatorsService, OperatorsService } from "./operators.service";
export type { OperatorFilters, CreateOperatorDTO, UpdateOperatorDTO, OperatorsResponse } from "./operators.service";
export { productsService, ProductsService } from "./products.service";
export type { ProductFilters, CreateProductDTO, UpdateProductDTO, ProductsResponse } from "./products.service";

// Servicios adicionales de master
export { assignmentService } from "./assignment.service";
export { auditService } from "./audit.service";
export { maintenanceService as maintenanceMasterService } from "./maintenance.service";
export { medicalExamsService } from "./medical-exams.service";
export { workflowMasterService } from "./workflows.service";
