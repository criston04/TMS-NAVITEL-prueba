"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Users,
  Truck,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  Calendar,
  Shield,
} from "lucide-react";
import type { Operator } from "@/types/models/operator";

interface OperatorDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operator: Operator | null;
  onEdit?: (operator: Operator) => void;
  onDelete?: (operator: Operator) => void;
}

const statusConfig = {
  enabled: { label: "Habilitado", variant: "default" as const, icon: CheckCircle, className: "bg-green-500" },
  blocked: { label: "Bloqueado", variant: "destructive" as const, icon: XCircle, className: "" },
  pending: { label: "Pendiente", variant: "outline" as const, icon: AlertTriangle, className: "border-amber-500 text-amber-600" },
};

const typeLabels = {
  propio: "Propio",
  tercero: "Tercero",
  asociado: "Asociado",
};

export function OperatorDetailDrawer({
  open,
  onOpenChange,
  operator,
  onEdit,
  onDelete,
}: OperatorDetailDrawerProps) {
  if (!operator) return null;

  const status = statusConfig[operator.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const checklistProgress = operator.checklist?.items?.length
    ? Math.round(
        (operator.checklist.items.filter(i => i.checked).length / operator.checklist.items.length) * 100
      )
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {operator.tradeName || operator.businessName}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {operator.businessName} • RUC: {operator.ruc}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className={status.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline">{typeLabels[operator.type]}</Badge>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => onEdit?.(operator)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => onDelete?.(operator)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Eliminar
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="info" className="h-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="checklist">Checklist</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100vh-280px)] px-6 py-4">
            {/* TAB: INFO */}
            <TabsContent value="info" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Datos Generales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código</p>
                      <p className="font-medium">{operator.code}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium">{typeLabels[operator.type]}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{operator.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{operator.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>{operator.fiscalAddress}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Capacidad */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recursos Asignados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{operator.vehiclesCount}</p>
                        <p className="text-xs text-muted-foreground">Vehículos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{operator.driversCount}</p>
                        <p className="text-xs text-muted-foreground">Conductores</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contactos */}
              {operator.contacts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Contactos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {operator.contacts.map(contact => (
                      <div key={contact.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{contact.name}</p>
                          {contact.isPrimary && (
                            <Badge variant="outline" className="text-[10px]">Principal</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{contact.position}</p>
                        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {contact.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {contact.phone}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Contrato */}
              {(operator.contractStartDate || operator.contractEndDate) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Contrato
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Inicio</p>
                        <p className="font-medium">
                          {operator.contractStartDate
                            ? new Date(operator.contractStartDate).toLocaleDateString("es-PE")
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Fin</p>
                        <p className="font-medium">
                          {operator.contractEndDate
                            ? new Date(operator.contractEndDate).toLocaleDateString("es-PE")
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notas */}
              {operator.notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{operator.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* TAB: CHECKLIST */}
            <TabsContent value="checklist" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Checklist de Validación
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Progress value={checklistProgress} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{checklistProgress}%</span>
                  </div>
                  <div className="space-y-2">
                    {operator.checklist?.items?.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <Checkbox checked={item.checked} disabled />
                        <div className="flex-1">
                          <p className={`text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                            {item.label}
                          </p>
                          {item.date && (
                            <p className="text-xs text-muted-foreground">
                              Verificado: {new Date(item.date).toLocaleDateString("es-PE")}
                            </p>
                          )}
                        </div>
                        {item.checked ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB: DOCUMENTOS */}
            <TabsContent value="documents" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos Requeridos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {operator.documents?.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {doc.name}
                          {doc.required && <Badge variant="outline" className="text-[10px]">Obligatorio</Badge>}
                        </p>
                        {doc.uploaded ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {doc.fileName} • Subido: {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("es-PE") : ""}
                            {doc.expiresAt && ` • Vence: ${new Date(doc.expiresAt).toLocaleDateString("es-PE")}`}
                          </p>
                        ) : (
                          <p className="text-xs text-red-500 mt-1">No cargado</p>
                        )}
                      </div>
                      {doc.uploaded ? (
                        <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          Cargado
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default OperatorDetailDrawer;
