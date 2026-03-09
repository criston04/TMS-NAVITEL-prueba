
/**
 * Categoría de configuración
 */
export type SettingCategory =
  | "general"          // General
  | "operations"       // Operaciones
  | "fleet"            // Flota
  | "finance"          // Finanzas
  | "notifications"    // Notificaciones
  | "integrations"     // Integraciones
  | "security"         // Seguridad
  | "localization"     // Localización
  | "appearance"       // Apariencia
  | "advanced";        // Avanzado

/**
 * Tipo de dato de configuración
 */
export type SettingType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "multiSelect"
  | "date"
  | "time"
  | "color"
  | "json"
  | "file";

/**
 * Nivel de permiso
 */
export type PermissionLevel = "none" | "read" | "write" | "admin";

/**
 * Estado de integración
 */
export type IntegrationStatus = "active" | "inactive" | "error" | "pending";


/**
 * Definición de configuración individual
 */
export interface SettingDefinition {
  key: string;
  label: string;
  description?: string;
  category: SettingCategory;
  type: SettingType;
  defaultValue: unknown;
  currentValue: unknown;
  
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  options?: { value: string | number; label: string }[];
  
  // Permisos
  requiresRole?: string[];
  isReadOnly?: boolean;
  isSecret?: boolean;  // Para contraseñas/tokens
  
  // Metadata
  group?: string;
  order?: number;
  dependsOn?: string;  // Key de otra configuración
  showIf?: { key: string; value: unknown };
}

/**
 * Configuración del sistema por categorías
 */
export interface SystemSettings {
  general: GeneralSettings;
  operations: OperationsSettings;
  fleet: FleetSettings;
  finance: FinanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  localization: LocalizationSettings;
  appearance: AppearanceSettings;
}

/**
 * Configuración general
 */
export interface GeneralSettings {
  companyName: string;
  companyLogo?: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  companyTaxId: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  defaultLanguage: string;
  supportedLanguages: string[];
}

/**
 * Configuración de operaciones
 */
export interface OperationsSettings {
  defaultOrderStatus: string;
  autoAssignOrders: boolean;
  autoAssignRules: {
    byZone: boolean;
    byCapacity: boolean;
    byDistance: boolean;
    byWorkload: boolean;
  };
  maxOrdersPerVehicle: number;
  maxOrdersPerDriver: number;
  deliveryTimeWindowMinutes: number;
  allowPartialDelivery: boolean;
  requireSignature: boolean;
  requirePhoto: boolean;
  requireGeolocation: boolean;
  enableRouteOptimization: boolean;
  routeOptimizationAlgorithm: "nearest" | "genetic" | "savings";
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];  // 0-6 (Domingo-Sábado)
}

/**
 * Configuración de flota
 */
export interface FleetSettings {
  enableSpeedAlerts: boolean;
  maxSpeedKmh: number;
  enableIdleAlerts: boolean;
  maxIdleMinutes: number;
  enableFuelAlerts: boolean;
  minFuelLevel: number;
  enableMaintenanceAlerts: boolean;
  maintenanceIntervalKm: number;
  maintenanceIntervalDays: number;
  enableDocumentExpiryAlerts: boolean;
  documentExpiryWarningDays: number;
  trackingIntervalSeconds: number;
  historyRetentionDays: number;
  enableGeofenceAlerts: boolean;
  // Campos adicionales para UI
  defaultSpeedLimit: number;
  idleTimeThresholdMinutes: number;
  maxDrivingHoursPerDay: number;
  restBreakMinutes: number;
  distanceUnit: "km" | "mi";
  fuelCostPerKm: number;
  defaultFuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  defaultFuelCapacity: number;
}

/**
 * Configuración de finanzas
 */
export interface FinanceSettings {
  defaultCurrency: string;
  supportedCurrencies: string[];
  defaultTaxRate: number;
  taxName: string;
  taxIncludedByDefault: boolean;
  invoicePrefix: string;
  invoiceNumberDigits: number;
  paymentTermsDays: number;
  enableLateFees: boolean;
  lateFeePercentage: number;
  enableDiscounts: boolean;
  maxDiscountPercentage: number;
  requireApprovalAbove: number;
  bankAccounts: {
    name: string;
    bank: string;
    accountNumber: string;
    currency: string;
    isDefault: boolean;
  }[];
}

/**
 * Configuración de notificaciones
 */
export interface NotificationSettings {
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
  enableInAppNotifications: boolean;
  
  // Email
  emailProvider: "smtp" | "sendgrid" | "ses";
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
  
  // SMS
  smsProvider?: "twilio" | "nexmo" | "local";
  smsApiKey?: string;
  smsFromNumber?: string;
  
  // Push
  fcmServerKey?: string;
  
  // Eventos que generan notificación
  notifyOnNewOrder: boolean;
  notifyOnOrderStatusChange: boolean;
  notifyOnDeliveryCompleted: boolean;
  notifyOnIncident: boolean;
  notifyOnMaintenance: boolean;
  notifyOnDocumentExpiry: boolean;
  notifyOnGeofenceEvent: boolean;
  notifyOnPaymentReceived: boolean;
  notifyOnInvoiceOverdue: boolean;
}

/**
 * Configuración de seguridad
 */
export interface SecuritySettings {
  passwordMinLength: number;
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
  enableIpWhitelist: boolean;
  ipWhitelist: string[];
  allowedOrigins: string[];
  apiRateLimitPerMinute: number;
}

/**
 * Configuración de localización
 */
export interface LocalizationSettings {
  defaultCountry: string;
  defaultTimezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimalSeparator: string;
    thousandsSeparator: string;
    decimalPlaces: number;
  };
  currencyFormat: {
    symbol: string;
    symbolPosition: "before" | "after";
    decimalPlaces: number;
  };
  distanceUnit: "km" | "mi";
  weightUnit: "kg" | "lb";
  volumeUnit: "m3" | "ft3";
  temperatureUnit: "C" | "F";
  firstDayOfWeek: number;  // 0=Domingo, 1=Lunes
}

/**
 * Configuración de apariencia
 */
export interface AppearanceSettings {
  theme: "light" | "dark" | "system";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  showBreadcrumbs: boolean;
  sidebarCollapsed: boolean;
  tablePageSize: number;
  chartAnimations: boolean;
  animationsEnabled: boolean;
  mapStyle: "streets" | "satellite" | "hybrid" | "terrain";
  mapDefaultZoom: number;
  mapDefaultCenter: { lat: number; lng: number };
  colorScheme: string;
  language: string;
}

/**
 * Configuración de la empresa
 */
export interface CompanySettings {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  description?: string;
  industry?: string;
  timezone?: string;
}

/**
 * Configuración de email
 */
export interface EmailSettings {
  provider: "smtp" | "sendgrid" | "ses";
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  footerText?: string;
}

/**
 * Configuración regional
 */
export interface RegionalSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  currency: string;
  currencySymbol: string;
  currencyPosition: "before" | "after";
  decimalSeparator: string;
  thousandsSeparator: string;
  distanceUnit: "km" | "mi";
  weightUnit: "kg" | "lb";
  temperatureUnit: "C" | "F";
  firstDayOfWeek: number;
}

/**
 * Rol de usuario
 */
export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  permissions: RolePermission[];
  isSystem: boolean;  // No se puede eliminar
  isActive: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Permiso de rol
 */
export interface RolePermission {
  resource: string;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

/**
 * Integración externa
 */
export interface Integration {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: "gps" | "erp" | "crm" | "payment" | "maps" | "sms" | "email" | "webhook" | "other";
  status: IntegrationStatus;
  
  config: Record<string, unknown>;
  credentials?: Record<string, string>;
  
  // Endpoints
  baseUrl?: string;
  webhookUrl?: string;
  
  lastSyncAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  syncIntervalMinutes?: number;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Log de auditoría
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: "create" | "read" | "update" | "delete" | "login" | "logout" | "export" | "import" | "config";
  resource: string;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  ipAddress?: string;
  userAgent?: string;
}


/**
 * Actualizar configuración
 */
export interface UpdateSettingsDTO {
  category: SettingCategory;
  settings: Record<string, unknown>;
}

/**
 * Crear/actualizar rol
 */
export interface CreateRoleDTO {
  code: string;
  name: string;
  description?: string;
  permissions: RolePermission[];
}

/**
 * Crear/actualizar integración
 */
export interface CreateIntegrationDTO {
  code: string;
  name: string;
  description?: string;
  type: Integration["type"];
  config: Record<string, unknown>;
  credentials?: Record<string, string>;
  baseUrl?: string;
  webhookUrl?: string;
  syncIntervalMinutes?: number;
}

/**
 * Filtros de log de auditoría
 */
export interface AuditLogFilters {
  userId?: string;
  action?: string | string[];
  resource?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}


/**
 * Resumen de configuración del sistema
 */
export interface SettingsOverview {
  lastUpdated: string;
  updatedBy: string;
  totalSettings: number;
  customizedSettings: number;
  
  roles: {
    total: number;
    active: number;
  };
  
  integrations: {
    total: number;
    active: number;
    withErrors: number;
  };
  
  auditLog: {
    entriesLast24h: number;
    entriesLast7d: number;
    topActions: { action: string; count: number }[];
    topUsers: { userId: string; userName: string; count: number }[];
  };
}

/**
 * Estado de salud de integraciones
 */
export interface IntegrationHealthStatus {
  integrationId: string;
  integrationName: string;
  status: IntegrationStatus;
  lastCheck: string;
  responseTimeMs?: number;
  errorRate?: number;
  uptime?: number;
}

export default SystemSettings;
