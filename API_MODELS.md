# 📐 TMS-NAVITEL — Modelos de Datos, DTOs, Validaciones y Reglas de Negocio

> **Complemento de:** `API_CONTRACT.md` (endpoints y rutas)  
> **Versión:** 1.0.0  
> **Última actualización:** 06/02/2026  
> **Este documento contiene:** Modelos de BD, DTOs request/response, enums, máquinas de estado, validaciones, FKs y reglas de negocio

---

## 📖 Tabla de Contenidos

1. [Formato de respuestas estándar](#1-formato-de-respuestas-estándar)
2. [Entidades base y tipos comunes](#2-entidades-base-y-tipos-comunes)
3. [Customer (Cliente)](#3-customer-cliente)
4. [Driver (Conductor)](#4-driver-conductor)
5. [Vehicle (Vehículo)](#5-vehicle-vehículo)
6. [Operator (Operador)](#6-operator-operador)
7. [Product (Producto)](#7-product-producto)
8. [Geofence (Geocerca)](#8-geofence-geocerca)
9. [Order (Orden)](#9-order-orden)
10. [Workflow](#10-workflow)
11. [Incident (Incidencia)](#11-incident-incidencia)
12. [Scheduling (Programación)](#12-scheduling-programación)
13. [Finance (Finanzas)](#13-finance-finanzas)
14. [Monitoring (Monitoreo)](#14-monitoring-monitoreo)
15. [Notification (Notificación)](#15-notification-notificación)
16. [Report (Reportes)](#16-report-reportes)
17. [Settings (Configuración)](#17-settings-configuración)
18. [Mapa de relaciones (Foreign Keys)](#18-mapa-de-relaciones-foreign-keys)
19. [Máquinas de estado](#19-máquinas-de-estado)
20. [Reglas de validación](#20-reglas-de-validación)
21. [Reglas de negocio](#21-reglas-de-negocio)

---

## 1. Formato de respuestas estándar

### ApiResponse\<T\>
```typescript
{
  success: boolean;        // Siempre presente
  data: T;                 // El dato o lista de datos
  message?: string;        // Mensaje de error o éxito
  timestamp: string;       // ISO 8601
}
```

### PaginatedResponse\<T\>
```typescript
{
  items: T[];
  pagination: {
    page: number;          // 1-based
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }
}
```

### PaginationParams (query string)
```
?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

### SearchParams (query string)
```
?search=texto&status=active&page=1&pageSize=20
```

---

## 2. Entidades base y tipos comunes

### BaseEntity (todos las entidades heredan estos campos)
| Campo | Tipo | Requerido | Notas |
|-------|------|-----------|-------|
| `id` | `string (UUID)` | Auto | PK generado por backend |
| `createdAt` | `string (ISO 8601)` | Auto | Timestamp de creación |
| `updatedAt` | `string (ISO 8601)` | Auto | Timestamp de última modificación |

### AuditableEntity (extiende BaseEntity)
| Campo | Tipo | Notas |
|-------|------|-------|
| `createdBy` | `string` | ID del usuario que creó |
| `updatedBy` | `string` | ID del usuario que modificó |

### ActivatableEntity (extiende BaseEntity)
| Campo | Tipo | Notas |
|-------|------|-------|
| `status` | `EntityStatus` | Ver enum abajo |
| `isEnabled` | `boolean` | Flag de habilitación |

### Enums comunes

```typescript
EntityStatus    = "active" | "inactive" | "pending" | "blocked" | "suspended" | "on_leave" | "terminated"
DocumentStatus  = "valid" | "expired" | "pending" | "missing"
```

### RequiredDocument
| Campo | Tipo | Req | Notas |
|-------|------|-----|-------|
| `id` | `string` | Sí | |
| `name` | `string` | Sí | Nombre del documento |
| `description` | `string` | No | |
| `isRequired` | `boolean` | Sí | Si es obligatorio |
| `status` | `DocumentStatus` | Sí | |
| `expirationDate` | `string` | No | ISO 8601 |
| `fileUrl` | `string` | No | URL del archivo |

### ValidationChecklist
| Campo | Tipo | Notas |
|-------|------|-------|
| `entityId` | `string` | FK → entidad evaluada |
| `entityType` | `"driver" \| "vehicle" \| "operator"` | |
| `documents` | `RequiredDocument[]` | Lista de documentos |
| `isComplete` | `boolean` | Todos los requeridos OK |
| `completionPercentage` | `number` | 0-100 |

### ImportResult / ExportOptions
```typescript
ImportResult {
  totalRows: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; field: string; message: string; value?: string }[];
}

ExportOptions {
  format: "xlsx" | "csv";
  columns?: string[];
  filters?: Record<string, unknown>;
}
```

---

## 3. Customer (Cliente)

### Enums
```typescript
CustomerType     = "empresa" | "persona"
DocumentType     = "RUC" | "DNI" | "CE" | "PASSPORT"
CustomerCategory = "standard" | "premium" | "vip" | "wholesale"
PaymentTerms     = "immediate" | "15_days" | "30_days" | "45_days" | "60_days"
```

### Customer (extiende BaseEntity)
| Campo | Tipo | Req | FK | Notas |
|-------|------|-----|----|-------|
| `code` | `string` | No | | Código auto-generado |
| `type` | `CustomerType` | Sí | | |
| `documentType` | `DocumentType` | Sí | | |
| `documentNumber` | `string` | Sí | | Único, validar formato |
| `name` | `string` | Sí | | Razón social o nombre |
| `tradeName` | `string` | No | | Nombre comercial |
| `email` | `string` | Sí | | Email válido |
| `phone` | `string` | Sí | | |
| `phone2` | `string` | No | | |
| `website` | `string` | No | | |
| `status` | `EntityStatus` | Sí | | |
| `category` | `CustomerCategory` | No | | |
| `addresses` | `CustomerAddress[]` | Sí | | Al menos 1 |
| `contacts` | `CustomerContact[]` | Sí | | |
| `creditLimit` | `number` | No | | Monto máximo |
| `creditUsed` | `number` | No | | Crédito utilizado |
| `billingConfig` | `CustomerBillingConfig` | No | | |
| `operationalStats` | `CustomerOperationalStats` | No | | Calculado |
| `notes` | `string` | No | | |
| `tags` | `string[]` | No | | |
| `industry` | `string` | No | | |
| `firstOrderDate` | `string` | No | | |
| `preferredWorkflowId` | `string` | No | → Workflow | |

### CustomerAddress
| Campo | Tipo | Req |
|-------|------|-----|
| `id` | `string` | Sí |
| `type` | `"billing" \| "shipping" \| "main" \| "branch"` | Sí |
| `label` | `string` | No |
| `address` | `string` | Sí |
| `district` | `string` | No |
| `province` | `string` | No |
| `department` | `string` | No |
| `country` | `string` | Sí |
| `postalCode` | `string` | No |
| `coordinates` | `{ lat: number; lng: number }` | No |
| `geofenceId` | `string` | No → Geofence |
| `isDefault` | `boolean` | Sí |

### CustomerBillingConfig
| Campo | Tipo |
|-------|------|
| `paymentTerms` | `PaymentTerms` |
| `defaultCurrency` | `string` |
| `taxId` | `string` |
| `invoiceEmail` | `string` |
| `invoicePrefix` | `string` |
| `requirePO` | `boolean` |

### CreateCustomerDTO
```typescript
// Omite: id, createdAt, updatedAt, operationalStats, firstOrderDate, creditUsed
{
  type: CustomerType;                 // Requerido
  documentType: DocumentType;         // Requerido
  documentNumber: string;             // Requerido, validar
  name: string;                       // Requerido
  tradeName?: string;
  email: string;                      // Requerido, email válido
  phone: string;                      // Requerido
  status?: EntityStatus;              // Default: "active"
  category?: CustomerCategory;
  addresses: CustomerAddress[];       // Al menos 1
  contacts?: CustomerContact[];
  creditLimit?: number;
  billingConfig?: CustomerBillingConfig;
  preferredWorkflowId?: string;
  notes?: string;
  tags?: string[];
}
```

---

## 4. Driver (Conductor)

### Enums
```typescript
LicenseCategory     = "A-I" | "A-IIa" | "A-IIb" | "A-IIIa" | "A-IIIb" | "A-IIIc"
DriverStatus        = "active" | "inactive" | "suspended" | "on_leave" | "terminated"
DriverAvailability  = "available" | "on-route" | "resting" | "vacation" | "sick-leave" | "suspended" | "unavailable"
DriverDocumentType  = "DNI" | "CE" | "PASSPORT"
BloodType           = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-"
MedicalExamType     = "pre_employment" | "periodic" | "post_incident" | "return_to_work" | "exit"
ExamResult          = "approved" | "conditional" | "rejected" | "pending"
CertificationType   = "matpel" | "sst_induction" | "sst_annual" | "defensive_driving" | "first_aid" | "fire_safety" | "cold_chain" | "hazmat_awareness" | "customer_service" | "gps_tracking" | "load_securing" | "other"
IncidentType        = "accident" | "traffic_violation" | "cargo_damage" | "customer_complaint" | "mechanical_issue" | "safety_violation" | "documentation" | "other"
```

### Driver (extiende ActivatableEntity) — ~60 campos
| Campo | Tipo | Req | FK | Notas |
|-------|------|-----|----|-------|
| `code` | `string` | Sí | | 3-20 chars |
| `documentType` | `DriverDocumentType` | Sí | | |
| `documentNumber` | `string` | Sí | | Validar por tipo |
| `firstName` | `string` | Sí | | 2-50 |
| `lastName` | `string` | Sí | | 2-50 |
| `motherLastName` | `string` | No | | |
| `fullName` | `string` | Sí | | Computed server-side |
| `email` | `string` | Sí | | Email válido |
| `phone` | `string` | Sí | | Regex: `^\+?[0-9\s-]{9,15}$` |
| `alternativePhone` | `string` | No | | |
| `birthDate` | `string` | Sí | | Edad 18-70 |
| `birthPlace` | `string` | No | | |
| `nationality` | `string` | Sí | | Default: "Peruana" |
| `bloodType` | `BloodType` | No | | |
| `address` | `string` | Sí | | 10-200 chars |
| `district` | `string` | No | | |
| `province` | `string` | No | | |
| `department` | `string` | No | | |
| `license` | `DriverLicense` | Sí | | Ver sub-modelo |
| `emergencyContact` | `EmergencyContact` | Sí | | |
| `additionalEmergencyContacts` | `EmergencyContact[]` | No | | |
| `availability` | `DriverAvailability` | Sí | | |
| `unavailabilityReason` | `string` | No | | Si no disponible |
| `expectedReturnDate` | `string` | No | | |
| `currentMedicalExam` | `MedicalExam` | No | | Vigente |
| `medicalExamHistory` | `MedicalExam[]` | Sí | | |
| `currentPsychologicalExam` | `PsychologicalExam` | No | | |
| `psychologicalExamHistory` | `PsychologicalExam[]` | Sí | | |
| `certifications` | `TrainingCertification[]` | Sí | | |
| `policeRecord` | `PoliceRecord` | No | | |
| `criminalRecord` | `CriminalRecord` | No | | |
| `drivingRecord` | `DrivingRecord` | No | | |
| `drivingLimits` | `DrivingLimits` | Sí | | Ver validación HOS |
| `currentWeekHours` | `WeeklyHoursSummary` | No | | Calculado |
| `incidents` | `DriverIncident[]` | Sí | | |
| `performanceMetrics` | `DriverPerformanceMetrics` | No | | Calculado |
| `hireDate` | `string` | Sí | | |
| `terminationDate` | `string` | No | | |
| `operatorId` | `string` | No | → Operator | |
| `operatorName` | `string` | No | | Denormalizado |
| `assignedVehicleId` | `string` | No | → Vehicle | |
| `assignedVehiclePlate` | `string` | No | | Denormalizado |
| `status` | `DriverStatus` | Sí | | |
| `checklist` | `ValidationChecklist` | Sí | | Calculado |
| `documents` | `RequiredDocument[]` | Sí | | |
| `photoUrl` | `string` | No | | URL |
| `signatureUrl` | `string` | No | | URL |
| `notes` | `string` | No | | Max 1000 |
| `tags` | `string[]` | No | | |

### DriverLicense
| Campo | Tipo | Req | Validación |
|-------|------|-----|------------|
| `number` | `string` | Sí | Regex: `^[A-Z]\d{8}$` |
| `category` | `LicenseCategory` | Sí | Enum |
| `issueDate` | `string` | Sí | No puede ser futura |
| `expiryDate` | `string` | Sí | |
| `issuingAuthority` | `string` | Sí | Min 3 chars |
| `issuingCountry` | `string` | Sí | Default: "Perú" |
| `points` | `number` | Sí | 0-100 |
| `maxPoints` | `number` | Sí | Default: 100 |
| `restrictions` | `LicenseRestrictions` | Sí | |
| `fileUrl` | `string` | No | URL |
| `verificationStatus` | `"pending" \| "verified" \| "rejected"` | Sí | |
| `lastVerificationDate` | `string` | No | |

### LicenseRestrictions
```typescript
{
  requiresGlasses: boolean;     // Default: false
  requiresHearingAid: boolean;  // Default: false
  automaticOnly: boolean;       // Default: false
  otherRestrictions?: string[];
}
```

### EmergencyContact
| Campo | Tipo | Req |
|-------|------|-----|
| `name` | `string` | Sí (3-100) |
| `relationship` | `"spouse" \| "parent" \| "sibling" \| "child" \| "friend" \| "other"` | Sí |
| `relationshipDetail` | `string` | No |
| `phone` | `string` | Sí (regex tel) |
| `alternativePhone` | `string` | No |
| `address` | `string` | No |

### MedicalExam
| Campo | Tipo | Req |
|-------|------|-----|
| `id` | `string` | Sí |
| `type` | `MedicalExamType` | Sí |
| `date` | `string` | Sí |
| `expiryDate` | `string` | Sí |
| `result` | `ExamResult` | Sí |
| `restrictions` | `MedicalRestriction[]` | Sí |
| `clinicName` | `string` | Sí (min 3) |
| `clinicRuc` | `string` | No (11 dígitos) |
| `doctorName` | `string` | Sí (min 3) |
| `doctorCmp` | `string` | No |
| `certificateNumber` | `string` | Sí (min 3) |
| `fileUrl` | `string` | No |
| `observations` | `string` | No |

### DrivingLimits
| Campo | Tipo | Default |
|-------|------|---------|
| `maxHoursPerDay` | `number` | 8 (min 1, max 12) |
| `maxHoursPerWeek` | `number` | 48 (min 1, max 60) |
| `restRequiredAfterHours` | `number` | 4 (min 1, max 8) |
| `minRestDuration` | `number` | 0.5 (min 0.5, max 12) |
| `nightDrivingAllowed` | `boolean` | true |
| `nightStartTime` | `string` | Opcional |
| `nightEndTime` | `string` | Opcional |

---

## 5. Vehicle (Vehículo)

### Enums
```typescript
VehicleType              = "camion" | "tractocamion" | "remolque" | "semiremolque" | "furgoneta" | "pickup" | "minivan" | "cisterna" | "volquete"
BodyType                 = "furgon" | "furgon_frigorifico" | "plataforma" | "cisterna" | "tolva" | "volquete" | "portacontenedor" | "cama_baja" | "jaula" | "baranda" | "otros"
VehicleOperationalStatus = "available" | "on-route" | "loading" | "unloading" | "maintenance" | "repair" | "inspection" | "standby" | "inactive" | "operational" | "in_transit" | "parked" | "in_maintenance" | "out_of_service"
VehicleStatus            = "active" | "inactive" | "maintenance" | "retired"
FuelType                 = "diesel" | "gasoline" | "gas_glp" | "gas_gnv" | "electric" | "hybrid"
TransmissionType         = "manual" | "automatic" | "semi_automatic"
InsuranceType            = "soat" | "rc_obligatorio" | "rc_complementario" | "full_coverage" | "cargo_insurance" | "theft_insurance"
InspectionResult         = "approved" | "observations" | "rejected"
MaintenanceType          = "preventive" | "corrective" | "inspection" | "emergency" | "recall" | "upgrade"
MaintenanceStatus        = "scheduled" | "in_progress" | "completed" | "cancelled" | "overdue"
```

### Vehicle (extiende ActivatableEntity) — ~50 campos
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `code` | `string` | Sí (3-20) | |
| `plate` | `string` | Sí | | Regex placa peruana |
| `trailerPlate` | `string` | No | |
| `type` | `VehicleType` | Sí | |
| `bodyType` | `BodyType` | Sí | |
| `mtcCategory` | `string` | No | |
| `specs` | `VehicleSpecs` | Sí | |
| `dimensions` | `VehicleDimensions` | No | |
| `capacity` | `VehicleCapacity` | Sí | |
| `registration` | `VehicleRegistration` | Sí | |
| `insurancePolicies` | `InsurancePolicy[]` | Sí | |
| `currentInspection` | `TechnicalInspection` | No | |
| `inspectionHistory` | `TechnicalInspection[]` | Sí | |
| `operatingCertificate` | `OperatingCertificate` | No | |
| `gpsDevice` | `GPSDevice` | No | |
| `lastLocation` | `VehicleLocation` | No | |
| `operationalStatus` | `VehicleOperationalStatus` | Sí | |
| `currentMileage` | `number` | Sí | ≥ 0 |
| `nextMaintenanceDate` | `string` | No | |
| `nextMaintenanceMileage` | `number` | No | |
| `maintenanceHistory` | `MaintenanceRecord[]` | Sí | |
| `maintenanceSchedules` | `MaintenanceSchedule[]` | Sí | |
| `fuelHistory` | `FuelRecord[]` | Sí | |
| `currentFuelEfficiency` | `number` | No | |
| `incidents` | `VehicleIncident[]` | Sí | |
| `certifications` | `VehicleCertification[]` | Sí | |
| `performanceMetrics` | `VehiclePerformanceMetrics` | No | Calc |
| `operatorId` | `string` | No | → Operator |
| `operatorName` | `string` | No | |
| `currentDriverId` | `string` | No | → Driver |
| `currentDriverName` | `string` | No | |
| `checklist` | `ValidationChecklist` | Sí | |
| `documents` | `RequiredDocument[]` | Sí | |
| `photos` | `string[]` | No | |
| `notes` | `string` | No | Max 1000 |
| `tags` | `string[]` | No | |

### VehicleSpecs
| Campo | Tipo | Validación |
|-------|------|------------|
| `brand` | `string` | 2-50 |
| `model` | `string` | 1-50 |
| `year` | `number` | 1990 - año actual+1 |
| `color` | `string` | 2-30 |
| `engineNumber` | `string` | 5-30 |
| `chassisNumber` | `string` | Exactamente 17, regex VIN: `[A-HJ-NPR-Z0-9]{17}` |
| `serialNumber` | `string` | Opcional |
| `axles` | `number` | 2-10 |
| `wheels` | `number` | 4-24 |
| `fuelType` | `FuelType` | Enum |
| `fuelTankCapacity` | `number` | 10-500 galones |
| `transmission` | `TransmissionType` | Enum |
| `engineDisplacement` | `number` | Opcional, > 0 |
| `horsepower` | `number` | Opcional, > 0 |

### VehicleCapacity
| Campo | Tipo | Validación |
|-------|------|------------|
| `grossWeight` | `number` | > 0 (kg) |
| `tareWeight` | `number` | > 0 (kg) |
| `maxPayload` | `number` | > 0 (kg), **≤ grossWeight - tareWeight** |
| `maxVolume` | `number` | Opcional, > 0 (m³) |
| `palletCapacity` | `number` | Opcional, entero > 0 |

### InsurancePolicy
| Campo | Tipo | Validación |
|-------|------|------------|
| `type` | `InsuranceType` | Enum |
| `policyNumber` | `string` | Min 5 |
| `insurerName` | `string` | Min 3 |
| `insurerRuc` | `string` | 11 dígitos |
| `startDate` | `string` | |
| `endDate` | `string` | **> startDate** |
| `coverageAmount` | `number` | > 0 |
| `currency` | `"PEN" \| "USD"` | |
| `verificationStatus` | `"pending" \| "verified" \| "rejected"` | |

### GPSDevice
| Campo | Tipo | Validación |
|-------|------|------------|
| `deviceId` | `string` | Min 5 |
| `imei` | `string` | Exactamente 15 dígitos |
| `simNumber` | `string` | Opcional |
| `provider` | `string` | Min 3 |
| `model` | `string` | Min 2 |
| `installationDate` | `string` | |
| `certificationExpiry` | `string` | |
| `homologationNumber` | `string` | Min 5 |
| `status` | `"active" \| "inactive" \| "malfunction" \| "removed"` | |

### Formato de placa peruana
```regex
^[A-Z]{3}-\d{3}$      // ABC-123
^[A-Z]\d[A-Z]-\d{3}$  // A1B-234
^[A-Z]{2}\d-\d{3}$    // AB1-234
```

---

## 6. Operator (Operador)

### Enums
```typescript
OperatorType   = "propio" | "tercero" | "asociado"
OperatorStatus = "enabled" | "blocked" | "pending"
```

### Operator (extiende BaseEntity)
| Campo | Tipo | Req |
|-------|------|-----|
| `code` | `string` | Sí |
| `ruc` | `string` | Sí (11 dígitos, validar mod 11) |
| `businessName` | `string` | Sí |
| `tradeName` | `string` | No |
| `type` | `OperatorType` | Sí |
| `email` | `string` | Sí |
| `phone` | `string` | Sí |
| `fiscalAddress` | `string` | Sí |
| `contacts` | `OperatorContact[]` | Sí |
| `checklist` | `OperatorValidationChecklist` | Sí |
| `documents` | `OperatorDocument[]` | Sí |
| `driversCount` | `number` | Sí |
| `vehiclesCount` | `number` | Sí |
| `contractStartDate` | `string` | No |
| `contractEndDate` | `string` | No |
| `notes` | `string` | No |
| `status` | `OperatorStatus` | Sí |

---

## 7. Product (Producto)

### Enums
```typescript
ProductCategory = "general" | "perecible" | "peligroso" | "fragil" | "refrigerado" | "congelado" | "granel"
UnitOfMeasure   = "kg" | "ton" | "lt" | "m3" | "unit" | "pallet" | "container"
```

### Product (extiende BaseEntity)
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `sku` | `string` | Sí | Único |
| `name` | `string` | Sí | |
| `description` | `string` | No | |
| `category` | `ProductCategory` | Sí | |
| `unitOfMeasure` | `UnitOfMeasure` | Sí | |
| `dimensions` | `ProductDimensions` | No | |
| `transportConditions` | `TransportConditions` | Sí | |
| `status` | `EntityStatus` | Sí | |
| `barcode` | `string` | No | |
| `unitPrice` | `number` | No | |
| `imageUrl` | `string` | No | |
| `customerId` | `string` | No | → Customer |
| `notes` | `string` | No | |

### TransportConditions
```typescript
{
  requiresRefrigeration: boolean;
  temperatureRange?: { min: number; max: number; unit: "celsius" | "fahrenheit" };
  requiresHazmatHandling: boolean;
  hazmatClass?: string;
  stackable: boolean;
  maxStackLayers?: number;
  fragile: boolean;
  specialInstructions?: string;
}
```

---

## 8. Geofence (Geocerca)

### Enums
```typescript
GeofenceType     = "polygon" | "circle" | "corridor"
GeofenceCategory = "warehouse" | "customer" | "plant" | "port" | "checkpoint" | "restricted" | "delivery" | "other"
```

### Geofence (extiende BaseEntity)
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `code` | `string` | Sí | |
| `name` | `string` | Sí | |
| `description` | `string` | No | |
| `type` | `GeofenceType` | Sí | |
| `category` | `GeofenceCategory` | Sí | |
| `geometry` | `GeofenceGeometry` | Sí | Union type |
| `tags` | `GeofenceTag[]` | Sí | |
| `alerts` | `GeofenceAlerts` | Sí | |
| `status` | `EntityStatus` | Sí | |
| `color` | `string` | Sí | Hex |
| `opacity` | `number` | Sí | 0-1 |
| `address` | `string` | No | |
| `customerId` | `string` | No | → Customer |
| `notes` | `string` | No | |

### GeofenceGeometry (union type)
```typescript
// Polígono
{ type: "polygon"; coordinates: { lat: number; lng: number }[] }

// Círculo
{ type: "circle"; center: { lat: number; lng: number }; radius: number }

// Corredor
{ type: "corridor"; path: { lat: number; lng: number }[]; width: number }
```

---

## 9. Order (Orden)

### Enums
```typescript
OrderStatus     = "draft" | "pending" | "assigned" | "in_transit" | "at_milestone" | "delayed" | "completed" | "closed" | "cancelled"
OrderSyncStatus = "not_sent" | "pending" | "sending" | "sent" | "error" | "retry"
MilestoneStatus = "pending" | "approaching" | "arrived" | "in_progress" | "completed" | "skipped" | "delayed"
OrderPriority   = "low" | "normal" | "high" | "urgent"
CargoType       = "general" | "refrigerated" | "hazardous" | "fragile" | "oversized" | "liquid" | "bulk"
```

### Order — ~40 campos
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `id` | `string` | Auto | PK |
| `orderNumber` | `string` | Auto | Único, visible |
| `customerId` | `string` | Sí | → Customer |
| `customer` | `Pick<Customer>` | No | Populated |
| `carrierId` | `string` | No | → Operator |
| `carrierName` | `string` | No | |
| `vehicleId` | `string` | No | → Vehicle |
| `vehicle` | `{ id, plate, brand, model, type }` | No | Populated |
| `driverId` | `string` | No | → Driver |
| `driver` | `Pick<Driver>` | No | Populated |
| `gpsOperatorId` | `string` | No | → Operator |
| `workflowId` | `string` | No | → Workflow |
| `workflowName` | `string` | No | |
| `status` | `OrderStatus` | Sí | Default: "draft" |
| `priority` | `OrderPriority` | Sí | |
| `syncStatus` | `OrderSyncStatus` | Sí | Default: "not_sent" |
| `syncErrorMessage` | `string` | No | |
| `lastSyncAttempt` | `string` | No | |
| `cargo` | `OrderCargo` | Sí | Ver abajo |
| `milestones` | `OrderMilestone[]` | Sí | |
| `completionPercentage` | `number` | Sí | 0-100, calculado |
| `scheduledStartDate` | `string` | Sí | |
| `scheduledEndDate` | `string` | Sí | |
| `actualStartDate` | `string` | No | |
| `actualEndDate` | `string` | No | |
| `closureData` | `OrderClosureData` | No | Solo si cerrada |
| `statusHistory` | `OrderStatusHistory[]` | Sí | |
| `externalReference` | `string` | No | Ref del cliente |
| `notes` | `string` | No | |
| `tags` | `string[]` | No | |
| `metadata` | `Record<string, unknown>` | No | |
| `createdBy` | `string` | Sí | |
| `createdAt` | `string` | Auto | |
| `updatedAt` | `string` | Auto | |

### OrderCargo
| Campo | Tipo | Req |
|-------|------|-----|
| `description` | `string` | Sí |
| `type` | `CargoType` | Sí |
| `weightKg` | `number` | Sí |
| `volumeM3` | `number` | No |
| `quantity` | `number` | Sí |
| `declaredValue` | `number` | No |
| `temperatureControlled` | `boolean` | No |
| `temperatureRange` | `{ min, max, unit }` | No |
| `handlingInstructions` | `string` | No |

### OrderMilestone
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `id` | `string` | Auto | |
| `orderId` | `string` | Sí | → Order |
| `geofenceId` | `string` | Sí | → Geofence |
| `geofenceName` | `string` | Sí | |
| `type` | `"origin" \| "waypoint" \| "destination"` | Sí | |
| `sequence` | `number` | Sí | |
| `address` | `string` | Sí | |
| `coordinates` | `{ lat, lng }` | Sí | |
| `estimatedArrival` | `string` | Sí | |
| `estimatedDeparture` | `string` | No | |
| `actualEntry` | `string` | No | |
| `actualExit` | `string` | No | |
| `status` | `MilestoneStatus` | Sí | Default: "pending" |
| `delayMinutes` | `number` | No | + = retraso, - = adelanto |
| `notes` | `string` | No | |
| `contact` | `{ name, phone, email? }` | No | |

### OrderClosureData
| Campo | Tipo | Req |
|-------|------|-----|
| `observations` | `string` | Sí |
| `incidents` | `OrderIncidentRecord[]` | Sí |
| `deviationReasons` | `DeviationReason[]` | Sí |
| `closedBy` | `string` | Sí |
| `closedByName` | `string` | Sí |
| `closedAt` | `string` | Sí |
| `signature` | `string` | No |
| `attachments` | `OrderAttachment[]` | No |

### CreateOrderDTO
```typescript
{
  customerId: string;             // Requerido
  carrierId?: string;
  vehicleId?: string;
  driverId?: string;
  workflowId?: string;
  priority: OrderPriority;        // Requerido
  cargo: OrderCargo;              // Requerido
  milestones: Omit<OrderMilestone, 'id' | 'orderId' | 'status' | 'actualEntry' | 'actualExit' | 'delayMinutes'>[];
  scheduledStartDate: string;     // Requerido
  scheduledEndDate: string;       // Requerido
  externalReference?: string;
  notes?: string;
  tags?: string[];
}
```

### OrderFilters (query params)
```
?search=ORD-001
&customerId=cust-001
&carrierId=op-001
&status=pending,assigned        // Acepta múltiples
&priority=high,urgent
&syncStatus=error
&dateFrom=2026-01-01
&dateTo=2026-01-31
&tags=urgente
&sortBy=createdAt
&sortOrder=desc
&page=1
&pageSize=20
```

### OrdersResponse
```typescript
{
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Record<OrderStatus, number>;  // Conteo por cada estado
}
```

---

## 10. Workflow

### Enums
```typescript
WorkflowStatus        = "active" | "inactive" | "draft"
WorkflowStepAction    = "enter_geofence" | "exit_geofence" | "manual_check" | "document_upload" | "signature" | "photo_capture" | "temperature_check" | "weight_check" | "custom"
WorkflowConditionType = "time_elapsed" | "time_window" | "location_reached" | "document_uploaded" | "approval_received" | "manual_trigger" | "always"
NotificationType      = "email" | "sms" | "push" | "webhook" | "in_app"
```

### Workflow
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `id` | `string` | Auto | |
| `name` | `string` | Sí | |
| `description` | `string` | Sí | |
| `code` | `string` | Sí | Único |
| `status` | `WorkflowStatus` | Sí | |
| `version` | `number` | Sí | |
| `steps` | `WorkflowStep[]` | Sí | |
| `escalationRules` | `EscalationRule[]` | Sí | |
| `applicableCargoTypes` | `string[]` | No | |
| `applicableCustomerIds` | `string[]` | No | → Customer[] |
| `applicableCarrierIds` | `string[]` | No | → Operator[] |
| `isDefault` | `boolean` | Sí | |
| `createdBy` | `string` | Sí | |
| `updatedBy` | `string` | Sí | |

### WorkflowStep
| Campo | Tipo | Req |
|-------|------|-----|
| `id` | `string` | Sí |
| `name` | `string` | Sí |
| `description` | `string` | No |
| `sequence` | `number` | Sí |
| `action` | `WorkflowStepAction` | Sí |
| `isRequired` | `boolean` | Sí |
| `canSkip` | `boolean` | Sí |
| `actionConfig.geofenceId` | `string` | No → Geofence |
| `actionConfig.customFields` | `WorkflowCustomField[]` | No |
| `estimatedDurationMinutes` | `number` | No |
| `maxDurationMinutes` | `number` | No |
| `transitionConditions` | `WorkflowCondition[]` | Sí |
| `notifications` | `WorkflowNotification[]` | Sí |

### EscalationRule
```typescript
{
  id: string;
  name: string;
  condition: {
    type: "delay_threshold" | "step_stuck" | "no_update";
    thresholdMinutes: number;
    stepIds?: string[];
  };
  actions: Array<{
    type: "notify" | "reassign" | "flag" | "auto_close";
    config: { ... };
  }>;
  isActive: boolean;
}
```

### WorkflowProgress (respuesta calculada)
| Campo | Tipo |
|-------|------|
| `workflowId` | `string` → Workflow |
| `orderId` | `string` → Order |
| `currentStepId` | `string` |
| `currentStepIndex` | `number` |
| `totalSteps` | `number` |
| `completedSteps` | `string[]` |
| `skippedSteps` | `string[]` |
| `progressPercentage` | `number` 0-100 |
| `timeInCurrentStep` | `number` minutos |
| `isDelayed` | `boolean` |

---

## 11. Incident (Incidencia)

### Enums
```typescript
IncidentCategory = "vehicle" | "cargo" | "driver" | "route" | "customer" | "weather" | "security" | "documentation" | "other"
IncidentSeverity = "low" | "medium" | "high" | "critical"
IncidentStatus   = "active" | "inactive"  // Solo para catálogo
```

### IncidentCatalogItem
| Campo | Tipo | Req |
|-------|------|-----|
| `id` | `string` | Auto |
| `code` | `string` | Sí |
| `name` | `string` | Sí |
| `description` | `string` | Sí |
| `category` | `IncidentCategory` | Sí |
| `defaultSeverity` | `IncidentSeverity` | Sí |
| `requiresEvidence` | `boolean` | Sí |
| `acceptedEvidenceTypes` | `("photo" \| "document" \| "video")[]` | No |
| `minEvidenceCount` | `number` | No |
| `requiresImmediateAction` | `boolean` | Sí |
| `suggestedActions` | `string[]` | No |
| `descriptionTemplate` | `string` | No |
| `additionalFields` | `IncidentAdditionalField[]` | No |
| `affectsCompliance` | `boolean` | Sí |
| `autoNotifyRoles` | `string[]` | No |
| `status` | `IncidentStatus` | Sí |
| `sortOrder` | `number` | Sí |
| `tags` | `string[]` | No |

### IncidentRecord (instancia en una orden)
| Campo | Tipo | Req | FK |
|-------|------|-----|----|
| `id` | `string` | Auto | |
| `orderId` | `string` | Sí | → Order |
| `catalogItemId` | `string \| null` | Sí | → IncidentCatalogItem |
| `type` | `"catalog" \| "free_text"` | Sí | |
| `name` | `string` | Sí | |
| `description` | `string` | Sí | |
| `category` | `IncidentCategory` | Sí | |
| `severity` | `IncidentSeverity` | Sí | |
| `occurredAt` | `string` | Sí | |
| `milestoneId` | `string` | No | → OrderMilestone |
| `location` | `{ lat, lng, address? }` | No | |
| `actionTaken` | `string` | Sí | |
| `resolutionStatus` | `"pending" \| "in_progress" \| "resolved" \| "unresolved"` | Sí | |
| `resolvedAt` | `string` | No | |
| `resolvedBy` | `string` | No | |
| `evidence` | `IncidentEvidence[]` | Sí | |
| `reportedBy` | `string` | Sí | |
| `reportedAt` | `string` | Sí | |

---

## 12. Scheduling (Programación)

### Enums
```typescript
ScheduleStatus   = "unscheduled" | "scheduled" | "partial" | "ready" | "in_progress" | "completed" | "conflict" | "cancelled"
ConflictType     = "vehicle_overlap" | "driver_overlap" | "driver_hos" | "vehicle_maintenance" | "driver_unavailable" | "capacity_exceeded" | "license_expired" | "no_resource"
ConflictSeverity = "low" | "medium" | "high"
```

### ScheduleOrderPayload (POST /operations/scheduling/assign)
```typescript
{
  orderId: string;
  scheduledDate: string;          // YYYY-MM-DD
  scheduledStartTime: string;     // HH:mm
  vehicleId?: string;
  driverId?: string;
  notes?: string;
}
```

### ScheduleConflict (respuesta)
| Campo | Tipo |
|-------|------|
| `id` | `string` |
| `type` | `ConflictType` |
| `severity` | `ConflictSeverity` |
| `message` | `string` |
| `suggestedResolution` | `string` |
| `affectedEntity` | `{ type, id, name }` |
| `relatedOrderIds` | `string[]` |

### HOSValidationResult
```typescript
{
  isValid: boolean;
  remainingHoursToday: number;
  weeklyHoursUsed: number;
  violations: string[];
  warnings?: string[];
}
```

### SchedulingKPIs
```typescript
{
  pendingOrders: number;
  scheduledToday: number;
  atRiskOrders: number;
  fleetUtilization: number;       // 0-100%
  driverUtilization: number;      // 0-100%
  onTimeDeliveryRate: number;     // 0-100%
  averageLeadTime: number;        // Horas
  weeklyTrend: number;            // % cambio
}
```

---

## 13. Finance (Finanzas)

### Enums
```typescript
InvoiceStatus  = "draft" | "pending" | "sent" | "partial" | "paid" | "overdue" | "cancelled" | "disputed"
InvoiceType    = "service" | "freight" | "accessorial" | "fuel" | "credit" | "debit"
PaymentMethod  = "cash" | "bank_transfer" | "check" | "credit_card" | "debit_card" | "credit" | "other"
PaymentStatus  = "pending" | "processing" | "completed" | "failed" | "refunded" | "cancelled"
CostType       = "fuel" | "toll" | "maintenance" | "insurance" | "labor" | "depreciation" | "administrative" | "accessorial" | "penalty" | "other"
RateCategory   = "weight" | "volume" | "distance" | "flat" | "hourly" | "package" | "pallet" | "custom"
```

### Invoice — Campos clave
| Campo | Tipo | FK |
|-------|------|----|
| `invoiceNumber` | `string` | Único, auto-generado |
| `type` | `InvoiceType` | |
| `status` | `InvoiceStatus` | |
| `customerId` | `string` | → Customer |
| `issueDate` | `string` | |
| `dueDate` | `string` | |
| `currency` | `string` | |
| `subtotal` | `number` | |
| `taxTotal` | `number` | |
| `discountTotal` | `number` | |
| `total` | `number` | |
| `amountPaid` | `number` | |
| `amountDue` | `number` | Calculado: total - amountPaid |
| `lineItems` | `InvoiceLineItem[]` | |
| `taxes` | `TaxDetail[]` | |
| `orderIds` | `string[]` | → Order[] |
| `relatedInvoiceId` | `string` | → Invoice (notas crédito) |

### InvoiceLineItem
| Campo | Tipo |
|-------|------|
| `description` | `string` |
| `quantity` | `number` |
| `unitPrice` | `number` |
| `unit` | `string` |
| `taxRate` | `number` |
| `discount` | `number` |
| `discountType` | `"percentage" \| "fixed"` |
| `orderId` | `string` → Order |
| `orderNumber` | `string` |

### Payment
| Campo | Tipo | FK |
|-------|------|----|
| `paymentNumber` | `string` | Único |
| `invoiceId` | `string` | → Invoice |
| `customerId` | `string` | → Customer |
| `amount` | `number` | |
| `method` | `PaymentMethod` | |
| `status` | `PaymentStatus` | |
| `paymentDate` | `string` | |
| `referenceNumber` | `string` | |

### TransportCost
| Campo | Tipo | FK |
|-------|------|----|
| `type` | `CostType` | |
| `amount` | `number` | |
| `orderId` | `string` | → Order |
| `vehicleId` | `string` | → Vehicle |
| `driverId` | `string` | → Driver |
| `isReimbursable` | `boolean` | |
| `isApproved` | `boolean` | |
| `approvedBy` | `string` | |

### ServiceRate (Tarifas)
| Campo | Tipo | FK |
|-------|------|----|
| `code` | `string` | Único |
| `category` | `RateCategory` | |
| `baseRate` | `number` | |
| `ranges` | `{ from, to, rate }[]` | Escalonadas |
| `customerId` | `string` | → Customer |
| `vehicleType` | `string` | |
| `effectiveFrom` | `string` | |
| `effectiveTo` | `string` | |
| `isActive` | `boolean` | |
| `taxInclusive` | `boolean` | |

### CreateInvoiceDTO
```typescript
{
  type: InvoiceType;
  customerId: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    unit: string;
    taxRate: number;
    discount: number;
    discountType: "percentage" | "fixed";
    orderId?: string;
  }>;
  orderIds?: string[];
  purchaseOrderNumber?: string;
  notes?: string;
}
```

### AccountsReceivableAging (respuesta)
```typescript
{
  current: number;       // No vencido
  days1to30: number;     // 1-30 días vencido
  days31to60: number;
  days61to90: number;
  over90Days: number;
  total: number;
  byCustomer?: Array<{ customerId, customerName, current, days1to30, ... }>;
}
```

---

## 14. Monitoring (Monitoreo)

### Enums
```typescript
MovementStatus       = "moving" | "stopped"
RetransmissionStatus = "online" | "temporary_loss" | "disconnected"
PlaybackSpeed        = 1 | 2 | 4 | 8 | 16 | 32
```

### RetransmissionRecord
| Campo | Tipo | FK |
|-------|------|----|
| `vehicleId` | `string` | → Vehicle |
| `vehiclePlate` | `string` | |
| `companyName` | `string` | |
| `gpsCompanyId` | `string` | → GpsCompany |
| `gpsCompanyName` | `string` | |
| `lastConnection` | `string` | ISO 8601 |
| `movementStatus` | `MovementStatus` | |
| `retransmissionStatus` | `RetransmissionStatus` | |
| `disconnectedDuration` | `number` | Segundos |
| `comments` | `string` | |
| `lastLocation` | `{ lat, lng }` | |
| `speed` | `number` | km/h |

### TrackedVehicle
| Campo | Tipo | FK |
|-------|------|----|
| `id/plate` | `string` | → Vehicle |
| `type` | `string` | |
| `position` | `VehiclePosition` | |
| `movementStatus` | `MovementStatus` | |
| `connectionStatus` | `RetransmissionStatus` | |
| `driverId` | `string` | → Driver |
| `activeOrderId` | `string` | → Order |

### VehiclePosition
```typescript
{
  lat: number;
  lng: number;
  speed: number;        // km/h
  heading: number;      // 0-360 grados
  timestamp: string;
  accuracy?: number;    // Metros
  altitude?: number;    // Metros
}
```

### HistoricalRoute
| Campo | Tipo |
|-------|------|
| `vehicleId` | `string` → Vehicle |
| `startDate` | `string` |
| `endDate` | `string` |
| `points` | `HistoricalRoutePoint[]` |
| `stats` | `HistoricalRouteStats` |

### HistoricalRoutePoint
```typescript
{
  index: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
  isStopped: boolean;
  stopDuration?: number;            // Segundos
  distanceFromStart: number;        // km
  event?: {
    type: "geofence_enter" | "geofence_exit" | "stop_start" | "stop_end" | "speed_alert" | "ignition_on" | "ignition_off";
    description: string;
  }
}
```

### HistoricalRouteStats
```typescript
{
  totalDistanceKm: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  movingTimeSeconds: number;
  stoppedTimeSeconds: number;
  totalTimeSeconds: number;
  totalPoints: number;
  totalStops: number;
  startPoint: { lat, lng };
  endPoint: { lat, lng };
}
```

### WebSocket Messages
```typescript
// Client → Server
{ type: "subscribe", vehicleIds: string[] }
{ type: "unsubscribe", vehicleIds: string[] }

// Server → Client
{ type: "position_update", vehicleId: string, position: VehiclePosition, movementStatus, connectionStatus, timestamp }
{ type: "connection_status", vehicleId: string, status: RetransmissionStatus, lastConnection }
{ type: "alert", vehicleId: string, alertType: "geofence_enter" | "geofence_exit" | "speed_limit" | "connection_lost" | "sos", message, timestamp }
```

### GeofenceEvent
| Campo | Tipo | FK |
|-------|------|----|
| `geofenceId` | `string` | → Geofence |
| `vehicleId` | `string` | → Vehicle |
| `driverId` | `string` | → Driver |
| `orderId` | `string` | → Order |
| `milestoneId` | `string` | → OrderMilestone |
| `eventType` | `"entry" \| "exit" \| "dwell"` | |
| `status` | `"active" \| "completed" \| "cancelled"` | |
| `timestamp` | `string` | |
| `coordinates` | `{ lat, lng }` | |
| `wasExpected` | `boolean` | |
| `arrivedOnTime` | `boolean` | |
| `timeDifferenceMinutes` | `number` | |

---

## 15. Notification (Notificación)

### Enums
```typescript
NotificationChannel  = "email" | "sms" | "push" | "in_app" | "webhook"
NotificationCategory = "order" | "driver" | "vehicle" | "maintenance" | "document" | "geofence" | "alert" | "system"
NotificationPriority = "low" | "medium" | "high" | "urgent"
NotificationStatus   = "pending" | "sent" | "delivered" | "read" | "failed" | "cancelled"
```

### SystemNotification
| Campo | Tipo | FK |
|-------|------|----|
| `title` | `string` | |
| `message` | `string` | |
| `category` | `NotificationCategory` | |
| `priority` | `NotificationPriority` | |
| `channel` | `NotificationChannel` | |
| `status` | `NotificationStatus` | |
| `userId` | `string` | |
| `relatedEntity` | `{ type, id, name? }` | → Cualquier entidad |
| `actionUrl` | `string` | |
| `readAt` | `string` | |
| `expiresAt` | `string` | |

### NotificationPreferences
```typescript
{
  userId: string;
  channels: {
    [category: NotificationCategory]: NotificationChannel[];
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;  // HH:mm
    endTime: string;
  };
  dailyDigest?: boolean;
  soundEnabled?: boolean;
}
```

---

## 16. Report (Reportes)

### Enums
```typescript
ReportType        = "operational" | "financial" | "fleet" | "driver" | "customer" | "order" | "route" | "maintenance" | "fuel" | "incident" | "compliance" | "kpi" | "custom"
ExportFormat      = "pdf" | "excel" | "csv" | "json" | "html"
ScheduleFrequency = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"
ReportStatus      = "pending" | "generating" | "completed" | "failed" | "expired"
```

### GenerateReportRequest
```typescript
{
  definitionId?: string;
  templateId?: string;
  name?: string;
  parameters?: Record<string, unknown>;
  filters?: ReportFilter[];
  dateRange?: { start: string; end: string };
  format: ExportFormat;
  async?: boolean;    // Si true, retorna ID para polling
}
```

### GeneratedReport (respuesta)
| Campo | Tipo |
|-------|------|
| `status` | `ReportStatus` |
| `format` | `ExportFormat` |
| `fileUrl` | `string` (cuando completed) |
| `fileSize` | `number` |
| `rowCount` | `number` |
| `errorMessage` | `string` (cuando failed) |

---

## 17. Settings (Configuración)

### Enums
```typescript
SettingCategory   = "general" | "operations" | "fleet" | "finance" | "notifications" | "security" | "localization" | "appearance" | "advanced"
IntegrationStatus = "active" | "inactive" | "error" | "pending"
PermissionLevel   = "none" | "read" | "write" | "admin"
```

### Role
| Campo | Tipo |
|-------|------|
| `code` | `string` Único |
| `name` | `string` |
| `permissions` | `RolePermission[]` |
| `isSystem` | `boolean` (no eliminable) |
| `isActive` | `boolean` |
| `userCount` | `number` |

### RolePermission
```typescript
{
  resource: string;    // "orders", "drivers", "vehicles", etc.
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  }
}
```

### Integration
| Campo | Tipo |
|-------|------|
| `code` | `string` |
| `type` | `"gps" \| "erp" \| "crm" \| "payment" \| "maps" \| "sms" \| "email" \| "webhook" \| "other"` |
| `status` | `IntegrationStatus` |
| `baseUrl` | `string` |
| `lastSyncAt` | `string` |
| `lastError` | `string` |
| `syncIntervalMinutes` | `number` |

### AuditLogEntry
```typescript
{
  timestamp: string;
  userId: string;
  userName: string;
  action: "create" | "read" | "update" | "delete" | "login" | "logout" | "export" | "import" | "config";
  resource: string;
  resourceId?: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  ipAddress?: string;
  userAgent?: string;
}
```

### SecuritySettings (referencia para backend)
```typescript
{
  passwordMinLength: number;              // Default: 8
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  passwordExpirationDays: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  enableTwoFactor: boolean;
  twoFactorMethod: "email" | "sms" | "app";
  enableAuditLog: boolean;
  auditLogRetentionDays: number;
  apiRateLimitPerMinute: number;
}
```

### OperationsSettings (referencia para backend)
```typescript
{
  autoAssignOrders: boolean;
  autoAssignRules: { byZone, byCapacity, byDistance, byWorkload };
  maxOrdersPerVehicle: number;
  maxOrdersPerDriver: number;
  deliveryTimeWindowMinutes: number;
  requireSignature: boolean;
  requirePhoto: boolean;
  requireGeolocation: boolean;
  enableRouteOptimization: boolean;
  routeOptimizationAlgorithm: "nearest" | "genetic" | "savings";
  workingHours: { start, end };
  workingDays: number[];  // 0-6
}
```

---

## 18. Mapa de relaciones (Foreign Keys)

```
┌────────────────────────── DIAGRAMA DE RELACIONES ──────────────────────────┐
│                                                                             │
│  Order.customerId          ──→  Customer.id                                 │
│  Order.carrierId           ──→  Operator.id                                 │
│  Order.vehicleId           ──→  Vehicle.id                                  │
│  Order.driverId            ──→  Driver.id                                   │
│  Order.gpsOperatorId       ──→  Operator.id                                 │
│  Order.workflowId          ──→  Workflow.id                                 │
│  OrderMilestone.orderId    ──→  Order.id                                    │
│  OrderMilestone.geofenceId ──→  Geofence.id                                │
│                                                                             │
│  Invoice.customerId        ──→  Customer.id                                 │
│  Invoice.orderIds[]        ──→  Order.id[]                                  │
│  Invoice.relatedInvoiceId  ──→  Invoice.id (notas crédito/débito)          │
│  InvoiceLineItem.orderId   ──→  Order.id                                    │
│  Payment.invoiceId         ──→  Invoice.id                                  │
│  Payment.customerId        ──→  Customer.id                                 │
│                                                                             │
│  TransportCost.orderId     ──→  Order.id                                    │
│  TransportCost.vehicleId   ──→  Vehicle.id                                  │
│  TransportCost.driverId    ──→  Driver.id                                   │
│  ServiceRate.customerId    ──→  Customer.id                                 │
│                                                                             │
│  Driver.operatorId         ──→  Operator.id                                 │
│  Driver.assignedVehicleId  ──→  Vehicle.id                                  │
│  Vehicle.operatorId        ──→  Operator.id                                 │
│  Vehicle.currentDriverId   ──→  Driver.id                                   │
│                                                                             │
│  Geofence.customerId       ──→  Customer.id                                 │
│  Product.customerId        ──→  Customer.id                                 │
│  Customer.preferredWorkflowId ──→  Workflow.id                              │
│                                                                             │
│  GeofenceEvent.geofenceId  ──→  Geofence.id                                │
│  GeofenceEvent.vehicleId   ──→  Vehicle.id                                  │
│  GeofenceEvent.driverId    ──→  Driver.id                                   │
│  GeofenceEvent.orderId     ──→  Order.id                                    │
│  GeofenceEvent.milestoneId ──→  OrderMilestone.id                          │
│                                                                             │
│  IncidentRecord.orderId    ──→  Order.id                                    │
│  IncidentRecord.catalogItemId ──→  IncidentCatalogItem.id                  │
│  IncidentRecord.milestoneId ──→  OrderMilestone.id                         │
│                                                                             │
│  Workflow.applicableCustomerIds ──→  Customer.id[]                          │
│  Workflow.applicableCarrierIds  ──→  Operator.id[]                          │
│  WorkflowStep.actionConfig.geofenceId ──→  Geofence.id                     │
│  WorkflowProgress.workflowId   ──→  Workflow.id                             │
│  WorkflowProgress.orderId      ──→  Order.id                                │
│                                                                             │
│  RetransmissionRecord.vehicleId ──→  Vehicle.id                             │
│  RetransmissionRecord.gpsCompanyId ──→  GpsCompany.id                      │
│  TrackedVehicle.driverId       ──→  Driver.id                               │
│  TrackedVehicle.activeOrderId  ──→  Order.id                                │
│                                                                             │
│  Notification.relatedEntity.id ──→  (Order|Driver|Vehicle|Customer|...)     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 19. Máquinas de estado

### 19.1 Order Status
```
                    ┌──────────────┐
                    │    draft     │
                    └──────┬───────┘
                           │ confirmar
                    ┌──────▼───────┐
                    │   pending    │
                    └──────┬───────┘
                           │ asignar vehículo+conductor
                    ┌──────▼───────┐
              ┌─────┤   assigned   │
              │     └──────┬───────┘
              │            │ inicio viaje
              │     ┌──────▼───────┐
              │     │  in_transit  │◄─────────────┐
              │     └──────┬───────┘              │
              │            │ entra a geocerca     │ sale de geocerca
              │     ┌──────▼───────┐              │
              │     │ at_milestone ├──────────────┘
              │     └──────┬───────┘
              │            │ todos los hitos completados
              │     ┌──────▼───────┐
              │     │  completed   │
              │     └──────┬───────┘
              │            │ cierre manual
              │     ┌──────▼───────┐
              │     │    closed    │
              │     └──────────────┘
              │
              │  (desde cualquier estado activo)
              │     ┌──────────────┐
              ├────►│   delayed    │ (retraso detectado por sistema)
              │     └──────────────┘
              │     ┌──────────────┐
              └────►│  cancelled   │ (cancelación manual)
                    └──────────────┘
```

**Transiciones válidas:**
| Desde | Hacia | Condición |
|-------|-------|-----------|
| `draft` | `pending` | Confirmar orden |
| `draft` | `cancelled` | Cancelar borrador |
| `pending` | `assigned` | Asignar vehículo y/o conductor |
| `pending` | `cancelled` | Cancelar |
| `assigned` | `in_transit` | Iniciar viaje |
| `assigned` | `cancelled` | Cancelar |
| `in_transit` | `at_milestone` | Vehículo entra a geocerca |
| `in_transit` | `delayed` | Retraso detectado |
| `in_transit` | `cancelled` | Cancelar |
| `at_milestone` | `in_transit` | Vehículo sale de geocerca |
| `at_milestone` | `completed` | Último hito completado |
| `at_milestone` | `delayed` | Retraso detectado |
| `delayed` | `in_transit` | Retoma ruta |
| `delayed` | `at_milestone` | Llega a hito tardío |
| `delayed` | `completed` | Completa tardíamente |
| `completed` | `closed` | Cierre manual con datos |

### 19.2 Invoice Status
```
  draft ──→ pending ──→ sent ──→ partial ──→ paid
                │         │         │
                │         ├────────►│
                │         ▼         │
                │      overdue ─────┘
                │
                ├──→ cancelled
                └──→ disputed
```

**Transiciones válidas:**
| Desde | Hacia | Condición |
|-------|-------|-----------|
| `draft` | `pending` | Completar factura |
| `pending` | `sent` | Enviar al cliente |
| `pending` | `cancelled` | Cancelar |
| `sent` | `partial` | Pago parcial recibido |
| `sent` | `paid` | Pago total recibido |
| `sent` | `overdue` | Venció fecha de pago (automático) |
| `sent` | `disputed` | Cliente disputa |
| `partial` | `paid` | Monto restante recibido |
| `partial` | `overdue` | Venció fecha |
| `overdue` | `paid` | Pago tardío recibido |
| `overdue` | `cancelled` | Cancelar vencida |
| `disputed` | `sent` | Resolución de disputa |
| `disputed` | `cancelled` | Cancelar por disputa |

### 19.3 Payment Status
```
  pending ──→ processing ──→ completed
                  │
                  ├──→ failed
                  └──→ cancelled
  completed ──→ refunded
```

### 19.4 Milestone Status
```
  pending ──→ approaching ──→ arrived ──→ in_progress ──→ completed
    │                                                        │
    └──→ skipped                                            │
    └──→ delayed ───────────────────────────────────────────┘
```

### 19.5 Maintenance Status
```
  scheduled ──→ in_progress ──→ completed
      │              │
      ├──→ overdue   └──→ cancelled
      └──→ cancelled
```

### 19.6 Workflow Status
```
  draft ──→ active ──→ inactive
    │         │
    └─────────┘
```

---

## 20. Reglas de validación

### 20.1 Documentos de identidad peruanos

| Documento | Formato | Validación |
|-----------|---------|------------|
| **RUC** | 11 dígitos | Prefijo `10/15/16/17/20` + algoritmo módulo 11 |
| **DNI** | 8 dígitos | Solo números, no patrones inválidos (00000000, etc.) |
| **CE** | 7-12 alphanum | Alfanumérico, uppercase |
| **Passport** | 6-12 alphanum | Alfanumérico |

### 20.2 Licencia de conducir
- Formato: `^[A-Z]\d{8}$` (ej: Q12345678)
- Fecha emisión no puede ser futura
- Verificación de vigencia y status **verified**

### 20.3 Placas vehiculares peruanas
```regex
^[A-Z]{3}-\d{3}$       // ABC-123
^[A-Z]\d[A-Z]-\d{3}$   // A1B-234
^[A-Z]{2}\d-\d{3}$     // AB1-234
```

### 20.4 VIN/Chasis
- Exactamente 17 caracteres
- Regex: `^[A-HJ-NPR-Z0-9]{17}$` (excluye I, O, Q)

### 20.5 Teléfono
- Regex: `^\+?[0-9\s-]{9,15}$`

### 20.6 Conductor
- Edad: 18-70 años (calculado desde birthDate)
- Nombre: 2-50 chars
- Código: 3-20 chars
- Dirección: 10-200 chars
- Notas: max 1000 chars

### 20.7 Vehículo
- Año: 1990 - año actual+1
- Tanque combustible: 10-500 galones
- Ejes: 2-10
- Ruedas: 4-24
- **maxPayload ≤ grossWeight - tareWeight**
- Seguro: endDate > startDate
- IMEI GPS: exactamente 15 dígitos

---

## 21. Reglas de negocio

### 21.1 Compatibilidad licencia-vehículo (normativa MTC Perú)

| Licencia | Vehículos permitidos | Peso máximo |
|----------|---------------------|-------------|
| A-I | pickup, minivan | 500 kg |
| A-IIa | + furgoneta | 3,500 kg |
| A-IIb | + camion | 6,000 kg |
| A-IIIa | + tractocamion | 12,000 kg |
| A-IIIb | + remolque, semiremolque | Sin límite |
| A-IIIc | + cisterna, volquete (MATPEL) | Sin límite |

### 21.2 Elegibilidad del conductor
El conductor solo puede operar si **TODOS** estos criterios se cumplen:
1. ✅ Licencia vigente Y verificada
2. ✅ Examen médico vigente Y aprobado
3. ✅ Examen psicológico vigente Y aprobado
4. ✅ Antecedentes policiales vigentes Y limpios
5. ✅ Antecedentes penales vigentes Y limpios
6. ✅ Certificaciones requeridas vigentes

### 21.3 Elegibilidad del vehículo
El vehículo solo puede operar si **TODOS** estos criterios se cumplen:
1. ✅ SOAT vigente Y verificado
2. ✅ RC Obligatorio vigente Y verificado
3. ✅ Inspección técnica vigente Y aprobada
4. ✅ Certificado de operación vigente Y verificado
5. ✅ GPS instalado, activo Y certificación vigente

### 21.4 Certificaciones por tipo de operación

| Tipo operación | Certificaciones requeridas |
|----------------|---------------------------|
| General | sst_induction, defensive_driving |
| MATPEL | matpel, hazmat_awareness, first_aid, fire_safety |
| Cadena de frío | cold_chain, sst_induction |
| Atención al cliente | customer_service, sst_induction |

### 21.5 Seguros obligatorios

| Tipo operación | Seguros requeridos |
|----------------|-------------------|
| General | SOAT, RC Obligatorio |
| MATPEL | SOAT, RC Obligatorio, RC Complementario |
| Carga valiosa | SOAT, RC Obligatorio, Seguro de carga |

### 21.6 Intervalos de mantenimiento

| Tipo | Cada (km) | Cada (días) | Descripción |
|------|-----------|-------------|-------------|
| Cambio aceite | 10,000 | 180 | Aceite y filtros |
| Frenos | 20,000 | 180 | Inspección de frenos |
| Neumáticos | 15,000 | 180 | Rotación |
| Servicio completo | 50,000 | 365 | Full service |
| Transmisión | 60,000 | 730 | Servicio transmisión |
| Enfriamiento | 40,000 | 365 | Sistema cooling |

### 21.7 Categorías MTC por vehículo

| Vehículo | Categorías MTC |
|----------|---------------|
| pickup, minivan | M1, N1 |
| furgoneta | N1, N2 |
| camion | N2, N3 |
| tractocamion | N3 |
| remolque | O2, O3, O4 |
| semiremolque | O3, O4 |
| cisterna | N3 |
| volquete | N2, N3 |

### 21.8 Inspección frecuente por antigüedad
- Vehículos con **≥10 años** requieren inspección técnica **semestral** (en vez de anual)

### 21.9 Alertas de vencimiento
| Días restantes | Nivel |
|----------------|-------|
| > 30 | `ok` (verde) |
| 16-30 | `warning` (amarillo) |
| 1-15 | `urgent` (naranja) |
| ≤ 0 | `expired` (rojo) |

### 21.10 Horas de servicio (HOS)
- Máximo horas/día: configurable (default 8, max 12)
- Máximo horas/semana: configurable (default 48, max 60)
- Descanso obligatorio después de: configurable (default 4h)
- Duración mínima descanso: configurable (default 30min)
- Conducción nocturna: configurable (permitido/prohibido con horario)

### 21.11 Órdenes
- Solo se puede eliminar en estado `draft`
- Solo se puede asignar vehículo/conductor en estado `pending`
- Solo se puede iniciar viaje en estado `assigned`
- Solo se puede cerrar en estado `completed`
- `completionPercentage` se calcula automáticamente según hitos completados

### 21.12 Facturas
- `amountDue = total - amountPaid` (calculado)
- Si `amountPaid > 0 && amountPaid < total` → estado `partial`
- Si `amountPaid >= total` → estado `paid`
- Si `dueDate < hoy && amountDue > 0` → estado `overdue` (job automático)
- Notas de crédito (`type: "credit"`) deben referenciar `relatedInvoiceId`

---

> **Este documento junto con `API_CONTRACT.md` proporciona toda la información necesaria para que el equipo de backend diseñe la base de datos, implemente los endpoints y las reglas de negocio.**
