"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Truck,
  User,
  FileText,
  Shield,
  Wrench,
  Fuel,
  Calendar,
  Gauge,
  AlertTriangle,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Navigation,
  Box,
  Weight,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Vehicle, 
  MaintenanceRecord, 
  MaintenanceType,
  FuelRecord,
} from "@/types/models/vehicle";
import { getDaysUntilExpiry, getExpiryAlertLevel } from "@/lib/validators/driver-validators";


interface VehicleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  onAssignDriver?: (vehicle: Vehicle) => void;
  onScheduleMaintenance?: (vehicle: Vehicle) => void;
}


const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; bgLight: string; description: string }> = {
  active: { label: "Activo", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50", description: "Operando normalmente" },
  inactive: { label: "Inactivo", color: "bg-gray-500", textColor: "text-gray-700", bgLight: "bg-gray-50", description: "No disponible" },
  pending: { label: "Pendiente", color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", description: "En espera de aprobación" },
  blocked: { label: "Bloqueado", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", description: "Acceso restringido" },
  maintenance: { label: "En Mantenimiento", color: "bg-yellow-500", textColor: "text-yellow-700", bgLight: "bg-yellow-50", description: "En taller" },
  out_of_service: { label: "Fuera de Servicio", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50", description: "Requiere reparación" },
};

const VEHICLE_TYPES: Record<string, string> = {
  truck: "Camión",
  trailer: "Remolque",
  semi_trailer: "Semirremolque",
  van: "Furgoneta",
  pickup: "Camioneta",
  tanker: "Cisterna",
  flatbed: "Plataforma",
  refrigerated: "Refrigerado",
  container: "Portacontenedor",
};

const BODY_TYPES: Record<string, string> = {
  dry_van: "Furgón Seco",
  refrigerated: "Refrigerado",
  flatbed: "Plataforma",
  tanker: "Cisterna",
  container: "Contenedor",
  livestock: "Ganadero",
  car_carrier: "Portavehículos",
  dump: "Volquete",
  curtain_side: "Cortinero",
  box: "Caja Cerrada",
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

function MaintenanceHistoryItem({ record }: { record: MaintenanceRecord }) {
  const typeColors: Record<MaintenanceType, string> = {
    preventive: "bg-blue-500",
    corrective: "bg-yellow-500",
    inspection: "bg-purple-500",
    emergency: "bg-red-500",
    recall: "bg-orange-500",
    upgrade: "bg-green-500",
  };

  const typeLabels: Record<MaintenanceType, string> = {
    preventive: "Preventivo",
    corrective: "Correctivo",
    inspection: "Inspección",
    emergency: "Emergencia",
    recall: "Llamado Fabricante",
    upgrade: "Mejora",
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", typeColors[record.type])} />
        <div>
          <p className="text-sm font-medium">
            {typeLabels[record.type]}
          </p>
          <p className="text-xs text-muted-foreground">
            {record.workshopName} • {record.mileage?.toLocaleString()} km
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">
          S/ {(record.totalCost ?? record.totalActualCost ?? 0).toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(record.date ?? record.completionDate ?? record.scheduledDate ?? "").toLocaleDateString("es-PE")}
        </p>
      </div>
    </div>
  );
}

function FuelHistoryItem({ record }: { record: FuelRecord }) {
  const unitLabel = record.unit === "liters" ? "L" : "gal";
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <Fuel className="h-4 w-4 text-orange-500" />
        <div>
          <p className="text-sm font-medium">{record.quantity.toFixed(1)} {unitLabel}</p>
          <p className="text-xs text-muted-foreground">
            {record.station || "Estación"} • {record.mileage?.toLocaleString()} km
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">S/ {record.cost.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">
          S/ {record.pricePerUnit.toFixed(2)}/{unitLabel}
        </p>
      </div>
    </div>
  );
}


export function VehicleDetailDrawer({
  open,
  onOpenChange,
  vehicle,
  onEdit,
  onDelete,
  onAssignDriver,
  onScheduleMaintenance,
}: VehicleDetailDrawerProps) {
  const [activeTab, setActiveTab] = React.useState("info");

  // Calcular estadísticas de combustible - debe estar antes del early return para evitar error de hooks condicionales
  const fuelStats = React.useMemo(() => {
    const fuelHistory = vehicle?.fuelHistory;
    const performanceMetrics = vehicle?.performanceMetrics;
    
    if (!fuelHistory?.length) return null;
    
    const totalQuantity = fuelHistory.reduce((sum, r) => sum + r.quantity, 0);
    const totalCost = fuelHistory.reduce((sum, r) => sum + r.cost, 0);
    const avgEfficiency = performanceMetrics?.averageFuelEfficiency || 0;

    return { totalQuantity, totalCost, avgEfficiency };
  }, [vehicle]);

  if (!vehicle) return null;

  const statusConfig = STATUS_CONFIG[vehicle.status];

  // Calcular estado de documentos
  const getInsuranceStatus = (type: string) => {
    const insurance = vehicle.insurancePolicies?.find(p => p.type === type);
    if (!insurance) return "missing";
    const daysUntil = getDaysUntilExpiry(insurance.endDate);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    return "valid";
  };

  const getInspectionStatus = () => {
    if (!vehicle.currentInspection) return "missing";
    const daysUntil = getDaysUntilExpiry(vehicle.currentInspection.expiryDate);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    if (vehicle.currentInspection.result !== "approved") return "warning";
    return "valid";
  };

  const getCertificateStatus = () => {
    if (!vehicle.operatingCertificate) return "missing";
    const daysUntil = getDaysUntilExpiry(vehicle.operatingCertificate.expiryDate);
    const alertLevel = getExpiryAlertLevel(daysUntil);
    if (alertLevel === "expired") return "expired";
    if (alertLevel === "urgent" || alertLevel === "warning") return "warning";
    return "valid";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <ScrollArea className="h-full">
          {/* Header */}
          <div className="p-6 border-b bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{vehicle.plate}</h2>
                  <Badge 
                    variant="outline" 
                    className={cn(statusConfig.bgLight, statusConfig.textColor)}
                  >
                    <span className={cn("w-2 h-2 rounded-full mr-1.5", statusConfig.color)} />
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {vehicle.specs?.brand} {vehicle.specs?.model} ({vehicle.specs?.year})
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Gauge className="h-4 w-4" />
                    {(vehicle.currentMileage || 0).toLocaleString()} km
                  </span>
                  {vehicle.currentDriverName && (
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {vehicle.currentDriverName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex flex-wrap gap-2 mt-4">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(vehicle)}>
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
              )}
              {onAssignDriver && (
                <Button variant="outline" size="sm" onClick={() => onAssignDriver(vehicle)}>
                  <User className="h-4 w-4 mr-1" />
                  Asignar Conductor
                </Button>
              )}
              {onScheduleMaintenance && (
                <Button variant="outline" size="sm" onClick={() => onScheduleMaintenance(vehicle)}>
                  <Wrench className="h-4 w-4 mr-1" />
                  Programar Mantto.
                </Button>
              )}
              {onDelete && (
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(vehicle)}>
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
                <TabsTrigger value="maintenance">Mantto.</TabsTrigger>
                <TabsTrigger value="fuel">Combustible</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* TAB: Información General */}
              <TabsContent value="info" className="mt-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Identificación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <InfoRow 
                      icon={Truck} 
                      label="Tipo de Vehículo" 
                      value={VEHICLE_TYPES[vehicle.type] || vehicle.type}
                    />
                    <InfoRow 
                      icon={Box} 
                      label="Tipo de Carrocería" 
                      value={BODY_TYPES[vehicle.bodyType || ""] || vehicle.bodyType}
                    />
                    <InfoRow 
                      icon={FileText}
                      label="VIN / Chasis"
                      value={vehicle.specs?.chassisNumber}
                    />
                    {vehicle.registration && (
                      <InfoRow 
                        icon={FileText}
                        label="Tarjeta de Propiedad"
                        value={vehicle.registration.registrationNumber}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Especificaciones Técnicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {vehicle.specs && (
                      <>
                        <InfoRow 
                          icon={Activity} 
                          label="Motor" 
                          value={`${vehicle.specs.engineNumber || ""} ${vehicle.specs.horsepower ? `(${vehicle.specs.horsepower} HP)` : ""}`}
                        />
                        <InfoRow 
                          icon={Fuel} 
                          label="Combustible" 
                          value={`${vehicle.specs.fuelType === "diesel" ? "Diésel" : 
                                   vehicle.specs.fuelType === "gasoline" ? "Gasolina" : 
                                   vehicle.specs.fuelType === "gas_glp" ? "GLP" : 
                                   vehicle.specs.fuelType === "gas_gnv" ? "GNV" :
                                   vehicle.specs.fuelType === "electric" ? "Eléctrico" : "Híbrido"} 
                                   ${vehicle.specs.fuelTankCapacity ? `(${vehicle.specs.fuelTankCapacity}gal)` : ""}`}
                        />
                        <InfoRow 
                          icon={Gauge} 
                          label="Ejes / Neumáticos" 
                          value={`${vehicle.specs.axles || "-"} ejes / ${vehicle.specs.wheels || "-"} neumáticos`}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Capacidad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <Weight className="h-5 w-5 mx-auto text-muted-foreground" />
                        <p className="text-lg font-bold mt-1">
                          {((vehicle.capacity?.maxPayload || 0) / 1000).toFixed(1)} ton
                        </p>
                        <p className="text-xs text-muted-foreground">Carga Máxima</p>
                      </div>
                      <div className="p-3 bg-muted rounded-lg text-center">
                        <Box className="h-5 w-5 mx-auto text-muted-foreground" />
                        <p className="text-lg font-bold mt-1">
                          {vehicle.capacity?.maxVolume || 0} m³
                        </p>
                        <p className="text-xs text-muted-foreground">Volumen</p>
                      </div>
                      {vehicle.capacity?.palletCapacity && (
                        <div className="p-3 bg-muted rounded-lg text-center col-span-2">
                          <p className="text-lg font-bold">
                            {vehicle.capacity.palletCapacity} pallets
                          </p>
                          <p className="text-xs text-muted-foreground">Capacidad de Pallets</p>
                        </div>
                      )}
                    </div>

                    {vehicle.dimensions && (
                      <>
                        <Separator className="my-4" />
                        <p className="text-sm font-medium mb-2">Dimensiones (m)</p>
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div>
                            <p className="font-medium">{vehicle.dimensions.length || "-"}</p>
                            <p className="text-xs text-muted-foreground">Largo</p>
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.dimensions.width || "-"}</p>
                            <p className="text-xs text-muted-foreground">Ancho</p>
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.dimensions.height || "-"}</p>
                            <p className="text-xs text-muted-foreground">Alto</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {vehicle.gpsDevice && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Dispositivo GPS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <InfoRow 
                        icon={Activity} 
                        label="IMEI" 
                        value={vehicle.gpsDevice.imei}
                      />
                      <InfoRow 
                        icon={Shield} 
                        label="Proveedor" 
                        value={vehicle.gpsDevice.provider}
                      />
                      <InfoRow 
                        icon={CheckCircle} 
                        label="Estado" 
                        value={vehicle.gpsDevice.status === "active" ? "Activo" : 
                               vehicle.gpsDevice.status === "inactive" ? "Inactivo" :
                               vehicle.gpsDevice.status === "malfunction" ? "Falla" : "Removido"}
                        badge={
                          <Badge variant={vehicle.gpsDevice.status === "active" ? "default" : "secondary"}>
                            {vehicle.gpsDevice.status === "active" ? "Conectado" : "Desconectado"}
                          </Badge>
                        }
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Documentos */}
              <TabsContent value="docs" className="mt-0 space-y-4">
                <DocumentCard
                  title="SOAT"
                  subtitle={vehicle.insurancePolicies?.find(p => p.type === "soat")?.insurerName}
                  expiryDate={vehicle.insurancePolicies?.find(p => p.type === "soat")?.endDate}
                  status={getInsuranceStatus("soat")}
                  icon={Shield}
                />

                <DocumentCard
                  title="Revisión Técnica"
                  subtitle={vehicle.currentInspection?.inspectionCenter}
                  expiryDate={vehicle.currentInspection?.expiryDate}
                  status={getInspectionStatus()}
                  icon={FileText}
                />

                <DocumentCard
                  title="Certificado de Operación MTC"
                  subtitle={vehicle.operatingCertificate?.certificateNumber}
                  expiryDate={vehicle.operatingCertificate?.expiryDate}
                  status={getCertificateStatus()}
                  icon={Award}
                />

                <DocumentCard
                  title="Seguro Todo Riesgo"
                  subtitle={vehicle.insurancePolicies?.find(p => p.type === "full_coverage")?.insurerName}
                  expiryDate={vehicle.insurancePolicies?.find(p => p.type === "full_coverage")?.endDate}
                  status={getInsuranceStatus("full_coverage")}
                  icon={Shield}
                />

                {vehicle.gpsDevice?.homologationNumber && (
                  <DocumentCard
                    title="Certificación GPS MTC"
                    subtitle={`N° ${vehicle.gpsDevice.homologationNumber}`}
                    expiryDate={vehicle.gpsDevice.certificationExpiry}
                    status={(() => {
                      const daysUntil = getDaysUntilExpiry(vehicle.gpsDevice!.certificationExpiry);
                      return getExpiryAlertLevel(daysUntil) === "expired" ? "expired" : "valid";
                    })()}
                    icon={Navigation}
                  />
                )}

                <Separator className="my-4" />

                <h4 className="font-medium text-sm">Otras Certificaciones</h4>
                {vehicle.certifications?.length ? (
                  <div className="space-y-2">
                    {vehicle.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{cert.name}</p>
                          <p className="text-xs text-muted-foreground">{cert.certifyingEntity}</p>
                        </div>
                        {cert.expiryDate && (
                          <p className="text-xs">
                            Vence: {new Date(cert.expiryDate).toLocaleDateString("es-PE")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin certificaciones adicionales</p>
                )}
              </TabsContent>

              {/* TAB: Mantenimiento */}
              <TabsContent value="maintenance" className="mt-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Próximo Mantenimiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vehicle.maintenanceSchedules?.length ? (
                      <div className="space-y-3">
                        {vehicle.maintenanceSchedules
                          .slice(0, 2)
                          .map((schedule) => (
                            <div key={schedule.id} className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{schedule.name}</p>
                                {schedule.isCritical && <Badge variant="destructive">Crítico</Badge>}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                {schedule.nextDueDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(schedule.nextDueDate).toLocaleDateString("es-PE")}
                                  </span>
                                )}
                                {schedule.nextDueMileage && (
                                  <span className="flex items-center gap-1">
                                    <Gauge className="h-3 w-3" />
                                    {schedule.nextDueMileage.toLocaleString()} km
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin mantenimientos programados</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Historial de Mantenimientos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vehicle.maintenanceHistory?.length ? (
                      <div className="space-y-2">
                        {vehicle.maintenanceHistory.slice(0, 5).map((record) => (
                          <MaintenanceHistoryItem key={record.id} record={record} />
                        ))}
                        {vehicle.maintenanceHistory.length > 5 && (
                          <Button variant="ghost" className="w-full text-sm">
                            Ver todos ({vehicle.maintenanceHistory.length})
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin historial de mantenimientos</p>
                    )}
                  </CardContent>
                </Card>

                {vehicle.performanceMetrics && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Métricas de Rendimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">
                            {vehicle.performanceMetrics.availabilityRate?.toFixed(0) || 0}%
                          </p>
                          <p className="text-xs text-muted-foreground">Disponibilidad</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">
                            S/ {(vehicle.performanceMetrics.costPerKilometer || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">Por Km</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">
                            {vehicle.performanceMetrics.maintenanceDays || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Días Mant.</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">
                            {vehicle.performanceMetrics.incidentCount || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">Incidentes</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB: Combustible */}
              <TabsContent value="fuel" className="mt-0 space-y-6">
                {fuelStats && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Resumen de Combustible</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <Fuel className="h-5 w-5 mx-auto text-orange-500" />
                          <p className="text-lg font-bold mt-1">
                            {fuelStats.totalQuantity.toFixed(0)} L
                          </p>
                          <p className="text-xs text-muted-foreground">Total Consumido</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <Activity className="h-5 w-5 mx-auto text-blue-500" />
                          <p className="text-lg font-bold mt-1">
                            {fuelStats.avgEfficiency.toFixed(1)} km/L
                          </p>
                          <p className="text-xs text-muted-foreground">Eficiencia</p>
                        </div>
                        <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-lg font-bold">
                            S/ {fuelStats.totalCost.toFixed(0)}
                          </p>
                          <p className="text-xs text-muted-foreground">Gasto Total</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Últimas Cargas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {vehicle.fuelHistory?.length ? (
                      <div className="space-y-2">
                        {vehicle.fuelHistory.slice(0, 10).map((record) => (
                          <FuelHistoryItem key={record.id} record={record} />
                        ))}
                        {vehicle.fuelHistory.length > 10 && (
                          <Button variant="ghost" className="w-full text-sm">
                            Ver todas ({vehicle.fuelHistory.length})
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin registros de combustible</p>
                    )}
                  </CardContent>
                </Card>

                {vehicle.performanceMetrics && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Métricas de Rendimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Eficiencia vs Esperado</span>
                            <span className="font-medium">
                              {((vehicle.performanceMetrics.averageFuelEfficiency || 0) / 3.5 * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress 
                            value={(vehicle.performanceMetrics.averageFuelEfficiency || 0) / 3.5 * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Objetivo: 3.5 km/L para este tipo de vehículo
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {(vehicle.performanceMetrics.averageMonthlyMileage || 0).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Km Mensuales Prom.</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {vehicle.performanceMetrics.availabilityRate?.toFixed(0) || 0}%
                            </p>
                            <p className="text-xs text-muted-foreground">Disponibilidad</p>
                          </div>
                        </div>
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

export default VehicleDetailDrawer;
