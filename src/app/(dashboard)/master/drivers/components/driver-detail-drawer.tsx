"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Heart,
  Award,
  AlertTriangle,
  Shield,
  Truck,
  Clock,
  Activity,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Droplet,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Driver, MedicalExam, PsychologicalExam, TrainingCertification } from "@/types/models/driver";
import { getDaysUntilExpiry, getExpiryAlertLevel } from "@/lib/validators/driver-validators";


interface DriverDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onEdit?: (driver: Driver) => void;
  onDelete?: (driver: Driver) => void;
  onAssignVehicle?: (driver: Driver) => void;
}


const STATUS_CONFIG = {
  active: { label: "Activo", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" },
  inactive: { label: "Inactivo", color: "bg-gray-500", textColor: "text-gray-700", bgLight: "bg-gray-50" },
  suspended: { label: "Suspendido", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" },
  on_leave: { label: "De Permiso", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50" },
  terminated: { label: "Cesado", color: "bg-slate-500", textColor: "text-slate-700", bgLight: "bg-slate-50" },
};


function InfoRow({ 
  icon: Icon, 
  label, 
  value,
  badge,
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value?: string | React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{value || "No especificado"}</p>
          {badge}
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  title,
  subtitle,
  expiryDate,
  status,
  icon: Icon,
  onClick,
}: {
  title: string;
  subtitle?: string;
  expiryDate?: string;
  status: "valid" | "warning" | "expired" | "missing";
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const statusConfig = {
    valid: { color: "border-green-200 bg-green-50", icon: CheckCircle, iconColor: "text-green-600" },
    warning: { color: "border-yellow-200 bg-yellow-50", icon: AlertCircle, iconColor: "text-yellow-600" },
    expired: { color: "border-red-200 bg-red-50", icon: XCircle, iconColor: "text-red-600" },
    missing: { color: "border-gray-200 bg-gray-50", icon: AlertTriangle, iconColor: "text-gray-400" },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card 
      className={cn("cursor-pointer hover:shadow-md transition-shadow", config.color)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white/50">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{title}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {expiryDate && (
                <p className="text-xs mt-1">
                  Vence: {new Date(expiryDate).toLocaleDateString("es-PE")}
                </p>
              )}
            </div>
          </div>
          <StatusIcon className={cn("h-5 w-5", config.iconColor)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ExamHistoryItem({ 
  exam, 
  type 
}: { 
  exam: MedicalExam | PsychologicalExam; 
  type: "medical" | "psychological" 
}) {
  const daysUntil = getDaysUntilExpiry(exam.expiryDate);
  const alertLevel = getExpiryAlertLevel(daysUntil);

  const alertColors = {
    ok: "text-green-600",
    warning: "text-yellow-600",
    urgent: "text-orange-600",
    expired: "text-red-600",
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          exam.result === "approved" ? "bg-green-500" :
          exam.result === "conditional" ? "bg-yellow-500" :
          "bg-red-500"
        )} />
        <div>
          <p className="text-sm font-medium">
            {type === "medical" ? (exam as MedicalExam).type : "Evaluación Psicológica"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(exam.date).toLocaleDateString("es-PE")} - 
            {type === "medical" ? (exam as MedicalExam).clinicName : (exam as PsychologicalExam).centerName}
          </p>
        </div>
      </div>
      <div className="text-right">
        <Badge 
          variant={exam.result === "approved" ? "default" : exam.result === "conditional" ? "secondary" : "destructive"}
          className="text-xs"
        >
          {exam.result === "approved" ? "Aprobado" : exam.result === "conditional" ? "Condicional" : "Rechazado"}
        </Badge>
        <p className={cn("text-xs mt-1", alertColors[alertLevel])}>
          {daysUntil > 0 ? `${daysUntil} días restantes` : "Vencido"}
        </p>
      </div>
    </div>
  );
}

function CertificationCard({ cert }: { cert: TrainingCertification }) {
  const daysUntil = cert.expiryDate ? getDaysUntilExpiry(cert.expiryDate) : 999;
  const isExpired = daysUntil <= 0;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Award className={cn("h-5 w-5", isExpired ? "text-red-500" : "text-blue-500")} />
        <div>
          <p className="text-sm font-medium">{cert.name}</p>
          <p className="text-xs text-muted-foreground">{cert.institutionName}</p>
        </div>
      </div>
      <div className="text-right">
        {cert.expiryDate ? (
          <>
            <p className="text-xs text-muted-foreground">
              Vence: {new Date(cert.expiryDate).toLocaleDateString("es-PE")}
            </p>
            {isExpired && (
              <Badge variant="destructive" className="text-xs mt-1">Vencido</Badge>
            )}
          </>
        ) : (
          <Badge variant="outline" className="text-xs">Sin vencimiento</Badge>
        )}
      </div>
    </div>
  );
}


export function DriverDetailDrawer({
  open,
  onOpenChange,
  driver,
  onEdit,
  onDelete,
  onAssignVehicle,
}: DriverDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState("info");

  if (!driver) return null;

  // Compatibilidad con mocks legacy
  const driverAny = driver as unknown as Record<string, unknown>;
  const driverFullName = driver.fullName || `${driver.firstName} ${driver.lastName}` || (driverAny.name as string) || "";
  const driverLicenseCategory = driver.license?.category || (driverAny.licenseCategory as string) || (driverAny.licenseType as string) || "";
  const driverLicenseNumber = driver.license?.number || (driverAny.licenseNumber as string) || "";
  const driverLicenseExpiry = driver.license?.expiryDate || (driverAny.licenseExpiry as string);

  const statusConfig = STATUS_CONFIG[driver.status];
  const initials = driverFullName.split(" ").map(n => n[0]).join("").slice(0, 2);

  // Calcular estado de documentos
  const getLicenseStatus = () => {
    if (!driverLicenseExpiry) return "missing";
    const daysUntil = getDaysUntilExpiry(driverLicenseExpiry);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    return "valid";
  };

  const getMedicalStatus = () => {
    if (!driver.medicalExamHistory?.length) return "missing";
    const latestExam = driver.medicalExamHistory[0];
    const daysUntil = getDaysUntilExpiry(latestExam.expiryDate);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    if (latestExam.result !== "approved") return "warning";
    return "valid";
  };

  const getPsychologicalStatus = () => {
    if (!driver.psychologicalExamHistory?.length) return "missing";
    const latestExam = driver.psychologicalExamHistory[0];
    const daysUntil = getDaysUntilExpiry(latestExam.expiryDate);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    return "valid";
  };

  // Calcular horas conducidas esta semana
  const weeklyHoursProgress = driver.currentWeekHours 
    ? Math.min((driver.currentWeekHours.totalHours / 48) * 100, 100)
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={driver.photoUrl} alt={driverFullName} />
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{driverFullName}</h2>
                  <Badge 
                    variant="outline" 
                    className={cn(statusConfig.bgLight, statusConfig.textColor)}
                  >
                    <span className={cn("w-2 h-2 rounded-full mr-1.5", statusConfig.color)} />
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {driverLicenseCategory} • {driverLicenseNumber}
                </p>
                {driver.assignedVehiclePlate && (
                  <div className="flex items-center gap-1 mt-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>Vehículo: <strong>{driver.assignedVehiclePlate}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex gap-2 mt-4">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(driver)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {onAssignVehicle && (
                <Button variant="outline" size="sm" onClick={() => onAssignVehicle(driver)}>
                  <Truck className="h-4 w-4 mr-1" />
                  Asignar Vehículo
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(driver)}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          {/* Contenido con Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 pt-4 border-b">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="docs">Documentos</TabsTrigger>
                <TabsTrigger value="medical">Médico</TabsTrigger>
                <TabsTrigger value="activity">Actividad</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* TAB: Información Personal */}
              <TabsContent value="info" className="mt-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Datos Personales</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow 
                      icon={CreditCard} 
                      label="Documento" 
                      value={`${driver.documentType?.toUpperCase() || "DNI"}: ${driver.documentNumber}`}
                    />
                    <InfoRow 
                      icon={Mail} 
                      label="Email" 
                      value={driver.email}
                    />
                    <InfoRow 
                      icon={Phone} 
                      label="Teléfono" 
                      value={driver.phone}
                    />
                    <InfoRow 
                      icon={MapPin} 
                      label="Dirección" 
                      value={driver.address}
                    />
                    <InfoRow 
                      icon={Calendar} 
                      label="Fecha de Nacimiento" 
                      value={driver.birthDate ? new Date(driver.birthDate).toLocaleDateString("es-PE") : undefined}
                    />
                    <InfoRow 
                      icon={Droplet} 
                      label="Tipo de Sangre" 
                      value={driver.bloodType}
                      badge={
                        <Badge variant="outline" className="text-xs ml-2">
                          {driver.bloodType}
                        </Badge>
                      }
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Contactos de Emergencia</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driver.emergencyContact ? (
                      <div className="space-y-3">
                        {/* Contacto principal */}
                        <div className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">{driver.emergencyContact.name}</p>
                          <p className="text-xs text-muted-foreground">{driver.emergencyContact.relationship}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{driver.emergencyContact.phone}</span>
                          </div>
                        </div>
                        {/* Contactos adicionales */}
                        {driver.additionalEmergencyContacts?.map((contact, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <p className="font-medium text-sm">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.relationship}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{contact.phone}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin contactos registrados</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Información Laboral</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow 
                      icon={Calendar} 
                      label="Fecha de Contratación" 
                      value={driver.hireDate ? new Date(driver.hireDate).toLocaleDateString("es-PE") : undefined}
                    />
                    {driver.notes && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">Notas</p>
                        <p className="text-sm mt-1">{driver.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB: Documentos */}
              <TabsContent value="docs" className="mt-0 space-y-4">
                <DocumentCard
                  title="Licencia de Conducir"
                  subtitle={`${driverLicenseCategory} - ${driverLicenseNumber}`}
                  expiryDate={driverLicenseExpiry}
                  status={getLicenseStatus()}
                  icon={FileText}
                />

                <DocumentCard
                  title="Examen Médico"
                  subtitle={driver.medicalExamHistory?.[0]?.clinicName}
                  expiryDate={driver.medicalExamHistory?.[0]?.expiryDate}
                  status={getMedicalStatus()}
                  icon={Heart}
                />

                <DocumentCard
                  title="Evaluación Psicológica"
                  subtitle={driver.psychologicalExamHistory?.[0]?.centerName}
                  expiryDate={driver.psychologicalExamHistory?.[0]?.expiryDate}
                  status={getPsychologicalStatus()}
                  icon={Activity}
                />

                {driver.policeRecord && (
                  <DocumentCard
                    title="Antecedentes Policiales"
                    subtitle={`Certificado N° ${driver.policeRecord.certificateNumber}`}
                    expiryDate={driver.policeRecord.expiryDate}
                    status={driver.policeRecord.result === "with_records" ? "warning" : driver.policeRecord.result === "pending" ? "missing" : "valid"}
                    icon={Shield}
                  />
                )}

                <Separator className="my-4" />

                <h4 className="font-medium text-sm">Certificaciones</h4>
                {driver.certifications?.length ? (
                  <div className="space-y-2">
                    {driver.certifications.map((cert) => (
                      <CertificationCard key={cert.id} cert={cert} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin certificaciones registradas</p>
                )}
              </TabsContent>

              {/* TAB: Médico */}
              <TabsContent value="medical" className="mt-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historial de Exámenes Médicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driver.medicalExamHistory?.length ? (
                      <div className="space-y-2">
                        {driver.medicalExamHistory.map((exam) => (
                          <ExamHistoryItem key={exam.id} exam={exam} type="medical" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin exámenes registrados</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historial de Evaluaciones Psicológicas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driver.psychologicalExamHistory?.length ? (
                      <div className="space-y-2">
                        {driver.psychologicalExamHistory.map((exam) => (
                          <ExamHistoryItem key={exam.id} exam={exam} type="psychological" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin evaluaciones registradas</p>
                    )}
                  </CardContent>
                </Card>

                {driver.license?.restrictions && (
                  driver.license.restrictions.requiresGlasses || 
                  driver.license.restrictions.requiresHearingAid || 
                  driver.license.restrictions.automaticOnly ||
                  (driver.license.restrictions.otherRestrictions?.length ?? 0) > 0
                ) && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="h-5 w-5" />
                        Restricciones de Licencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {driver.license.restrictions.requiresGlasses && (
                          <li className="flex items-start gap-2 text-sm text-yellow-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-2" />
                            Requiere uso de lentes correctivos
                          </li>
                        )}
                        {driver.license.restrictions.requiresHearingAid && (
                          <li className="flex items-start gap-2 text-sm text-yellow-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-2" />
                            Requiere uso de audífonos
                          </li>
                        )}
                        {driver.license.restrictions.automaticOnly && (
                          <li className="flex items-start gap-2 text-sm text-yellow-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-2" />
                            Solo transmisión automática
                          </li>
                        )}
                        {driver.license.restrictions.otherRestrictions?.map((restriction, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-yellow-900">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-600 mt-2" />
                            {restriction}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Actividad */}
              <TabsContent value="activity" className="mt-0 space-y-6">
                {driver.currentWeekHours && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Horas de Conducción - Esta Semana
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total conducido</span>
                          <span className="font-medium">
                            {driver.currentWeekHours.totalHours.toFixed(1)} / 48 horas
                          </span>
                        </div>
                        <Progress 
                          value={weeklyHoursProgress} 
                          className={cn(
                            "h-2",
                            weeklyHoursProgress > 90 && "[&>div]:bg-red-500",
                            weeklyHoursProgress > 75 && weeklyHoursProgress <= 90 && "[&>div]:bg-yellow-500"
                          )}
                        />
                        {weeklyHoursProgress > 90 && (
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Cerca del límite semanal permitido
                          </p>
                        )}
                      </div>

                      <Separator className="my-4" />

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{driver.currentWeekHours.daysWorked}</p>
                          <p className="text-xs text-muted-foreground">Días trabajados</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{7 - driver.currentWeekHours.daysWorked}</p>
                          <p className="text-xs text-muted-foreground">Días de descanso</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Métricas de Desempeño</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {driver.performanceMetrics ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {driver.performanceMetrics.overallRating.toFixed(1)}/5
                          </p>
                          <p className="text-xs text-muted-foreground">Calificación General</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold">
                            {driver.performanceMetrics.completedDeliveries}
                          </p>
                          <p className="text-xs text-muted-foreground">Entregas Completadas</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold">
                            {driver.performanceMetrics.onTimeDeliveryRate.toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Entregas a Tiempo</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold">
                            {(driver.performanceMetrics.fuelEfficiency || 0).toFixed(1)}
                          </p>
                          <p className="text-xs text-muted-foreground">km/L Promedio</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {driver.performanceMetrics.totalKilometers.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Km Totales</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className={cn(
                            "text-2xl font-bold",
                            driver.performanceMetrics.incidentCount > 0 ? "text-amber-600" : "text-green-600"
                          )}>
                            {driver.performanceMetrics.incidentCount}
                          </p>
                          <p className="text-xs text-muted-foreground">Incidentes</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin métricas disponibles</p>
                    )}
                  </CardContent>
                </Card>

                {driver.incidents && driver.incidents.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-700">
                        Incidentes Registrados
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {driver.incidents.slice(0, 5).map((incident) => (
                          <div key={incident.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{incident.type}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(incident.date).toLocaleDateString("es-PE")}
                              </p>
                            </div>
                            <Badge 
                              variant={incident.severity === "high" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {incident.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default DriverDetailDrawer;
