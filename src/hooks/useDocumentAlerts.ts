"use client";

import * as React from "react";
import { Driver } from "@/types/models/driver";
import { Vehicle } from "@/types/models/vehicle";
import { 
  getExpiryAlertLevel, 
  getDaysUntilExpiry,
  type ExpiryAlertLevel 
} from "@/lib/validators/driver-validators";


export type DocumentType = 
  // Documentos de Conductor
  | "driver_license"
  | "medical_exam"
  | "psychological_exam"
  | "police_record"
  | "criminal_record"
  | "training_certification"
  // Documentos de Vehículo
  | "soat"
  | "technical_inspection"
  | "operating_certificate"
  | "gps_certification"
  | "vehicle_registration"
  | "insurance_policy";

export interface DocumentAlert {
  id: string;
  type: DocumentType;
  entityType: "driver" | "vehicle";
  entityId: string;
  entityName: string;
  documentName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  alertLevel: ExpiryAlertLevel;
  description: string;
  actions: DocumentAlertAction[];
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  dismissed?: boolean;
}

export interface DocumentAlertAction {
  id: string;
  label: string;
  type: "renew" | "schedule" | "view" | "contact" | "remind";
  url?: string;
  handler?: () => void;
}

export interface AlertsSummary {
  total: number;
  expired: number;
  urgent: number;
  warning: number;
  ok: number;
  byEntityType: {
    drivers: number;
    vehicles: number;
  };
  byDocumentType: Record<DocumentType, number>;
}

export interface UseDocumentAlertsOptions {
  drivers?: Driver[];
  vehicles?: Vehicle[];
  autoRefresh?: boolean;
  refreshInterval?: number; // en milisegundos
  warningThresholdDays?: number;
  urgentThresholdDays?: number;
}

export interface UseDocumentAlertsReturn {
  alerts: DocumentAlert[];
  summary: AlertsSummary;
  isLoading: boolean;
  error: string | null;
  
  refreshAlerts: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  dismissAllExpired: () => void;
  
  getAlertsByLevel: (level: ExpiryAlertLevel) => DocumentAlert[];
  getAlertsByEntity: (entityType: "driver" | "vehicle", entityId: string) => DocumentAlert[];
  getAlertsByDocumentType: (type: DocumentType) => DocumentAlert[];
  getExpiredAlerts: () => DocumentAlert[];
  getUrgentAlerts: () => DocumentAlert[];
  
  enableNotifications: () => Promise<boolean>;
  sendTestNotification: () => void;
}


const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  // Conductor
  driver_license: "Licencia de Conducir",
  medical_exam: "Examen Médico",
  psychological_exam: "Examen Psicológico",
  police_record: "Récord Policial",
  criminal_record: "Antecedentes Penales",
  training_certification: "Certificación de Capacitación",
  // Vehículo
  soat: "SOAT",
  technical_inspection: "Revisión Técnica",
  operating_certificate: "Certificado de Operación",
  gps_certification: "Certificación GPS MTC",
  vehicle_registration: "Tarjeta de Propiedad",
  insurance_policy: "Póliza de Seguro",
};

const ALERT_LEVEL_PRIORITY: Record<ExpiryAlertLevel, number> = {
  expired: 0,
  urgent: 1,
  warning: 2,
  ok: 3,
};


/**
 * Genera alertas para documentos de un conductor
 */
function generateDriverAlerts(driver: Driver): DocumentAlert[] {
  const alerts: DocumentAlert[] = [];
  const now = new Date();

  // Licencia de conducir
  const licenseExpiry = driver.license?.expiryDate || driver.licenseExpiry;
  if (licenseExpiry) {
    const days = getDaysUntilExpiry(licenseExpiry);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-drv-license-${driver.id}`,
        type: "driver_license",
        entityType: "driver",
        entityId: driver.id,
        entityName: driver.name,
        documentName: DOCUMENT_TYPE_LABELS.driver_license,
        expiryDate: licenseExpiry,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Licencia vencida hace ${Math.abs(days)} días`
          : `Licencia vence en ${days} días`,
        actions: [
          { id: "renew", label: "Renovar", type: "renew" },
          { id: "view", label: "Ver detalles", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Examen médico
  const medicalExam = driver.medicalExamHistory?.[0];
  if (medicalExam?.expiryDate) {
    const days = getDaysUntilExpiry(medicalExam.expiryDate);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-drv-medical-${driver.id}`,
        type: "medical_exam",
        entityType: "driver",
        entityId: driver.id,
        entityName: driver.name,
        documentName: DOCUMENT_TYPE_LABELS.medical_exam,
        expiryDate: medicalExam.expiryDate,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Examen médico vencido hace ${Math.abs(days)} días`
          : `Examen médico vence en ${days} días`,
        actions: [
          { id: "schedule", label: "Agendar examen", type: "schedule" },
          { id: "view", label: "Ver historial", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Examen psicológico
  const psychExam = driver.psychologicalExamHistory?.[0];
  if (psychExam?.expiryDate) {
    const days = getDaysUntilExpiry(psychExam.expiryDate);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-drv-psych-${driver.id}`,
        type: "psychological_exam",
        entityType: "driver",
        entityId: driver.id,
        entityName: driver.name,
        documentName: DOCUMENT_TYPE_LABELS.psychological_exam,
        expiryDate: psychExam.expiryDate,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Examen psicológico vencido hace ${Math.abs(days)} días`
          : `Examen psicológico vence en ${days} días`,
        actions: [
          { id: "schedule", label: "Agendar examen", type: "schedule" },
          { id: "view", label: "Ver historial", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Certificaciones de capacitación
  driver.certifications?.forEach((cert, index) => {
    if (cert.expiryDate) {
      const days = getDaysUntilExpiry(cert.expiryDate);
      const level = getExpiryAlertLevel(days);
      
      if (level !== "ok") {
        alerts.push({
          id: `alert-drv-cert-${driver.id}-${index}`,
          type: "training_certification",
          entityType: "driver",
          entityId: driver.id,
          entityName: driver.name,
          documentName: `${cert.name} (${cert.type})`,
          expiryDate: cert.expiryDate,
          daysUntilExpiry: days,
          alertLevel: level,
          description: days < 0 
            ? `Certificación ${cert.name} vencida hace ${Math.abs(days)} días`
            : `Certificación ${cert.name} vence en ${days} días`,
          actions: [
            { id: "renew", label: "Renovar certificación", type: "renew" },
            { id: "view", label: "Ver detalles", type: "view" },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  });

  return alerts;
}

/**
 * Genera alertas para documentos de un vehículo
 */
function generateVehicleAlerts(vehicle: Vehicle): DocumentAlert[] {
  const alerts: DocumentAlert[] = [];
  const now = new Date();

  // SOAT
  const soat = vehicle.insurancePolicies?.find(p => p.type === "soat");
  if (soat?.endDate) {
    const days = getDaysUntilExpiry(soat.endDate);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-veh-soat-${vehicle.id}`,
        type: "soat",
        entityType: "vehicle",
        entityId: vehicle.id,
        entityName: `${vehicle.plate} - ${vehicle.specs?.brand} ${vehicle.specs?.model}`,
        documentName: DOCUMENT_TYPE_LABELS.soat,
        expiryDate: soat.endDate,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `SOAT vencido hace ${Math.abs(days)} días - VEHÍCULO NO PUEDE CIRCULAR`
          : `SOAT vence en ${days} días`,
        actions: [
          { id: "renew", label: "Renovar SOAT", type: "renew" },
          { id: "view", label: "Ver póliza", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Revisión Técnica
  if (vehicle.currentInspection?.expiryDate) {
    const days = getDaysUntilExpiry(vehicle.currentInspection.expiryDate);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-veh-insp-${vehicle.id}`,
        type: "technical_inspection",
        entityType: "vehicle",
        entityId: vehicle.id,
        entityName: `${vehicle.plate} - ${vehicle.specs?.brand} ${vehicle.specs?.model}`,
        documentName: DOCUMENT_TYPE_LABELS.technical_inspection,
        expiryDate: vehicle.currentInspection.expiryDate,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Revisión técnica vencida hace ${Math.abs(days)} días - VEHÍCULO NO PUEDE CIRCULAR`
          : `Revisión técnica vence en ${days} días`,
        actions: [
          { id: "schedule", label: "Agendar inspección", type: "schedule" },
          { id: "view", label: "Ver certificado", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Certificado de Operación
  if (vehicle.operatingCertificate?.expiryDate) {
    const days = getDaysUntilExpiry(vehicle.operatingCertificate.expiryDate);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-veh-cert-${vehicle.id}`,
        type: "operating_certificate",
        entityType: "vehicle",
        entityId: vehicle.id,
        entityName: `${vehicle.plate} - ${vehicle.specs?.brand} ${vehicle.specs?.model}`,
        documentName: DOCUMENT_TYPE_LABELS.operating_certificate,
        expiryDate: vehicle.operatingCertificate.expiryDate,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Certificado de operación vencido hace ${Math.abs(days)} días`
          : `Certificado de operación vence en ${days} días`,
        actions: [
          { id: "renew", label: "Renovar certificado", type: "renew" },
          { id: "view", label: "Ver detalles", type: "view" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Certificación GPS MTC
  if (vehicle.gpsDevice?.certificationExpiry) {
    const days = getDaysUntilExpiry(vehicle.gpsDevice.certificationExpiry);
    const level = getExpiryAlertLevel(days);
    
    if (level !== "ok") {
      alerts.push({
        id: `alert-veh-gps-${vehicle.id}`,
        type: "gps_certification",
        entityType: "vehicle",
        entityId: vehicle.id,
        entityName: `${vehicle.plate} - ${vehicle.specs?.brand} ${vehicle.specs?.model}`,
        documentName: DOCUMENT_TYPE_LABELS.gps_certification,
        expiryDate: vehicle.gpsDevice.certificationExpiry,
        daysUntilExpiry: days,
        alertLevel: level,
        description: days < 0 
          ? `Certificación GPS MTC vencida hace ${Math.abs(days)} días`
          : `Certificación GPS MTC vence en ${days} días`,
        actions: [
          { id: "renew", label: "Renovar certificación", type: "renew" },
          { id: "contact", label: "Contactar proveedor GPS", type: "contact" },
        ],
        createdAt: now.toISOString(),
      });
    }
  }

  // Otras pólizas de seguro
  vehicle.insurancePolicies?.filter(p => p.type !== "soat").forEach((policy, index) => {
    if (policy.endDate) {
      const days = getDaysUntilExpiry(policy.endDate);
      const level = getExpiryAlertLevel(days);
      
      if (level !== "ok") {
        alerts.push({
          id: `alert-veh-ins-${vehicle.id}-${index}`,
          type: "insurance_policy",
          entityType: "vehicle",
          entityId: vehicle.id,
          entityName: `${vehicle.plate} - ${vehicle.specs?.brand} ${vehicle.specs?.model}`,
          documentName: `Seguro ${policy.type} - ${policy.insurerName}`,
          expiryDate: policy.endDate,
          daysUntilExpiry: days,
          alertLevel: level,
          description: days < 0 
            ? `Póliza de seguro vencida hace ${Math.abs(days)} días`
            : `Póliza de seguro vence en ${days} días`,
          actions: [
            { id: "renew", label: "Renovar póliza", type: "renew" },
            { id: "contact", label: "Contactar aseguradora", type: "contact" },
          ],
          createdAt: now.toISOString(),
        });
      }
    }
  });

  return alerts;
}

/**
 * Calcula el resumen de alertas
 */
function calculateSummary(alerts: DocumentAlert[]): AlertsSummary {
  const summary: AlertsSummary = {
    total: alerts.length,
    expired: 0,
    urgent: 0,
    warning: 0,
    ok: 0,
    byEntityType: {
      drivers: 0,
      vehicles: 0,
    },
    byDocumentType: {} as Record<DocumentType, number>,
  };

  // Inicializar contadores por tipo de documento
  Object.keys(DOCUMENT_TYPE_LABELS).forEach(type => {
    summary.byDocumentType[type as DocumentType] = 0;
  });

  alerts.forEach(alert => {
    // Por nivel de alerta
    switch (alert.alertLevel) {
      case "expired":
        summary.expired++;
        break;
      case "urgent":
        summary.urgent++;
        break;
      case "warning":
        summary.warning++;
        break;
      case "ok":
        summary.ok++;
        break;
    }

    // Por tipo de entidad
    if (alert.entityType === "driver") {
      summary.byEntityType.drivers++;
    } else {
      summary.byEntityType.vehicles++;
    }

    // Por tipo de documento
    summary.byDocumentType[alert.type]++;
  });

  return summary;
}


export function useDocumentAlerts(options: UseDocumentAlertsOptions = {}): UseDocumentAlertsReturn {
  const {
    drivers = [],
    vehicles = [],
    autoRefresh = false,
    refreshInterval = 60000, // 1 minuto por defecto
  } = options;

  const [alerts, setAlerts] = React.useState<DocumentAlert[]>([]);
  const [summary, setSummary] = React.useState<AlertsSummary>({
    total: 0,
    expired: 0,
    urgent: 0,
    warning: 0,
    ok: 0,
    byEntityType: { drivers: 0, vehicles: 0 },
    byDocumentType: {} as Record<DocumentType, number>,
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /**
   * Actualiza las alertas
   */
  const refreshAlerts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allAlerts: DocumentAlert[] = [];

      // Generar alertas de conductores
      drivers.forEach(driver => {
        const driverAlerts = generateDriverAlerts(driver);
        allAlerts.push(...driverAlerts);
      });

      // Generar alertas de vehículos
      vehicles.forEach(vehicle => {
        const vehicleAlerts = generateVehicleAlerts(vehicle);
        allAlerts.push(...vehicleAlerts);
      });

      // Ordenar por prioridad (expirado primero, luego urgente, etc.)
      allAlerts.sort((a, b) => {
        const priorityDiff = ALERT_LEVEL_PRIORITY[a.alertLevel] - ALERT_LEVEL_PRIORITY[b.alertLevel];
        if (priorityDiff !== 0) return priorityDiff;
        // Si mismo nivel, ordenar por días hasta expiración
        return a.daysUntilExpiry - b.daysUntilExpiry;
      });

      setAlerts(allAlerts);
      setSummary(calculateSummary(allAlerts));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar alertas");
    } finally {
      setIsLoading(false);
    }
  }, [drivers, vehicles]);

  /**
   * Marca una alerta como reconocida
   */
  const acknowledgeAlert = React.useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledgedAt: new Date().toISOString() }
          : alert
      )
    );
  }, []);

  /**
   * Descarta una alerta
   */
  const dismissAlert = React.useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  /**
   * Descarta todas las alertas expiradas
   */
  const dismissAllExpired = React.useCallback(() => {
    setAlerts(prev => prev.filter(alert => alert.alertLevel !== "expired"));
  }, []);

  /**
   * Obtiene alertas por nivel
   */
  const getAlertsByLevel = React.useCallback((level: ExpiryAlertLevel): DocumentAlert[] => {
    return alerts.filter(alert => alert.alertLevel === level);
  }, [alerts]);

  /**
   * Obtiene alertas por entidad
   */
  const getAlertsByEntity = React.useCallback((
    entityType: "driver" | "vehicle", 
    entityId: string
  ): DocumentAlert[] => {
    return alerts.filter(alert => 
      alert.entityType === entityType && alert.entityId === entityId
    );
  }, [alerts]);

  /**
   * Obtiene alertas por tipo de documento
   */
  const getAlertsByDocumentType = React.useCallback((type: DocumentType): DocumentAlert[] => {
    return alerts.filter(alert => alert.type === type);
  }, [alerts]);

  /**
   * Obtiene alertas expiradas
   */
  const getExpiredAlerts = React.useCallback((): DocumentAlert[] => {
    return alerts.filter(alert => alert.alertLevel === "expired");
  }, [alerts]);

  /**
   * Obtiene alertas urgentes
   */
  const getUrgentAlerts = React.useCallback((): DocumentAlert[] => {
    return alerts.filter(alert => alert.alertLevel === "urgent");
  }, [alerts]);

  /**
   * Habilita notificaciones del navegador
   */
  const enableNotifications = React.useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      console.warn("Este navegador no soporta notificaciones");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  /**
   * Envía una notificación de prueba
   */
  const sendTestNotification = React.useCallback(() => {
    if (Notification.permission === "granted") {
      new Notification("NAVITEL TMS - Alertas de Documentos", {
        body: `Tienes ${summary.expired} documentos vencidos y ${summary.urgent} por vencer pronto.`,
        icon: "/logo/navitel-logo.svg",
        tag: "document-alerts",
      });
    }
  }, [summary]);

  React.useEffect(() => {
    refreshAlerts();
  }, [refreshAlerts]);

  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAlerts]);

  React.useEffect(() => {
    if (summary.expired > 0 && Notification.permission === "granted") {
      new Notification("⚠️ NAVITEL TMS - Documentos Vencidos", {
        body: `Tienes ${summary.expired} documento(s) vencido(s). Acción inmediata requerida.`,
        icon: "/logo/navitel-logo.svg",
        tag: "document-alerts-critical",
        requireInteraction: true,
      });
    }
  }, [summary.expired]);

  return {
    alerts,
    summary,
    isLoading,
    error,
    refreshAlerts,
    acknowledgeAlert,
    dismissAlert,
    dismissAllExpired,
    getAlertsByLevel,
    getAlertsByEntity,
    getAlertsByDocumentType,
    getExpiredAlerts,
    getUrgentAlerts,
    enableNotifications,
    sendTestNotification,
  };
}

export default useDocumentAlerts;
export { DOCUMENT_TYPE_LABELS };
