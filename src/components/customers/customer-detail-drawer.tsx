"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  Clock,
  Edit,
  Power,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Customer } from "@/types/models";
import { cn } from "@/lib/utils";
import { useCustomerCategories } from "@/contexts/customer-categories-context";
import { CustomerOperationalStatsCard } from "./customer-operational-stats";
import { CustomerAuditHistory } from "./customer-audit-history";

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onEdit?: (customer: Customer) => void;
  onToggleStatus?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

// CATEGORY_COLORS y CATEGORY_LABELS ahora vienen del hook useCustomerCategories()

function formatDate(date: string | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined) return "N/A";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export function CustomerDetailDrawer({
  isOpen,
  onClose,
  customer,
  onEdit,
  onToggleStatus,
  onDelete,
}: CustomerDetailDrawerProps) {
  const { colorMap: CATEGORY_COLORS, labelMap: CATEGORY_LABELS } = useCustomerCategories();
  if (!customer) return null;

  const category = customer.category || "standard";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                customer.type === "empresa" ? "bg-primary/10" : "bg-blue-500/10"
              )}>
                {customer.type === "empresa" 
                  ? <Building2 className="h-6 w-6 text-primary" />
                  : <User className="h-6 w-6 text-blue-500" />
                }
              </div>
              <div>
                <SheetTitle className="text-left">{customer.name}</SheetTitle>
                <SheetDescription className="text-left">
                  {customer.tradeName || customer.code}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                {customer.status === "active" ? "Activo" : "Inactivo"}
              </Badge>
              <Badge className={cn("text-white", CATEGORY_COLORS[category] || "bg-slate-500")}>
                {CATEGORY_LABELS[category] || category}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea type="always" className="flex-1 -mx-6 px-6 min-h-0">
          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="addresses">Direcciones</TabsTrigger>
              <TabsTrigger value="contacts">Contactos</TabsTrigger>
              <TabsTrigger value="audit">Historial</TabsTrigger>
            </TabsList>

            {/* Tab Información */}
            <TabsContent value="info" className="space-y-4 mt-4">
              {/* Datos principales */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Datos del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Documento</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {customer.documentType}: {customer.documentNumber}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(customer.documentNumber)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </span>
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                      {customer.email}
                    </a>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Teléfono
                    </span>
                    <a href={`tel:${customer.phone}`} className="font-medium">
                      {customer.phone}
                    </a>
                  </div>

                  {customer.website && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Web
                      </span>
                      <a 
                        href={customer.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        Visitar <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {customer.industry && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sector</span>
                      <span className="font-medium">{customer.industry}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Crédito */}
              {(customer.creditLimit || customer.creditUsed !== undefined) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Crédito
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Límite</span>
                        <span className="font-medium">{formatCurrency(customer.creditLimit)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Utilizado</span>
                        <span className="font-medium">{formatCurrency(customer.creditUsed)}</span>
                      </div>
                      {customer.creditLimit && (
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ 
                              width: `${Math.min(((customer.creditUsed || 0) / customer.creditLimit) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Estadísticas operativas */}
              {customer.operationalStats && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Estadísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold">{customer.operationalStats.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">Órdenes Totales</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {customer.operationalStats.onTimeDeliveryRate}%
                        </p>
                        <p className="text-xs text-muted-foreground">Entregas a Tiempo</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{customer.operationalStats.completedOrders}</p>
                        <p className="text-xs text-muted-foreground">Completadas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-600">
                          {customer.operationalStats.totalVolumeKg.toLocaleString()} kg
                        </p>
                        <p className="text-xs text-muted-foreground">Volumen Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fechas */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Historial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Registrado</span>
                    <span>{formatDate(customer.createdAt)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Última actualización</span>
                    <span>{formatDate(customer.updatedAt)}</span>
                  </div>
                  {customer.firstOrderDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Primer pedido</span>
                      <span>{formatDate(customer.firstOrderDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              {customer.tags && customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag, i) => (
                    <Badge key={i} variant="outline">{tag}</Badge>
                  ))}
                </div>
              )}

              {/* Notas */}
              {customer.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tab Estadísticas */}
            <TabsContent value="stats" className="space-y-4 mt-4">
              <CustomerOperationalStatsCard customer={customer} />
            </TabsContent>

            {/* Tab Direcciones */}
            <TabsContent value="addresses" className="space-y-4 mt-4">
              {customer.addresses.map((address, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {address.label || `Dirección ${index + 1}`}
                      </CardTitle>
                      {address.isDefault && <Badge variant="secondary">Principal</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="font-medium">{address.street}</p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.country} {address.zipCode && `- ${address.zipCode}`}
                    </p>
                    {address.reference && (
                      <p className="text-sm italic text-muted-foreground mt-2">
                        Ref: {address.reference}
                      </p>
                    )}
                    <Button variant="outline" size="sm" className="mt-2" asChild>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${address.street}, ${address.city}, ${address.country}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver en Mapa <ExternalLink className="ml-2 h-3 w-3" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab Contactos */}
            <TabsContent value="contacts" className="space-y-4 mt-4">
              {customer.contacts.map((contact, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {contact.name}
                      </CardTitle>
                      {contact.isPrimary && <Badge variant="secondary">Principal</Badge>}
                    </div>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground">{contact.position}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                    </div>
                    {(contact.notifyDeliveries || contact.notifyIncidents) && (
                      <div className="flex gap-2 mt-2">
                        {contact.notifyDeliveries && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" /> Entregas
                          </Badge>
                        )}
                        {contact.notifyIncidents && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Incidentes
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tab Historial de Auditoría */}
            <TabsContent value="audit" className="space-y-4 mt-4">
              <CustomerAuditHistory customer={customer} />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Acciones */}
        <div className="flex gap-2 pt-4 border-t">
          {onEdit && (
            <Button variant="outline" className="flex-1" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {onToggleStatus && (
            <Button 
              variant="outline" 
              onClick={() => onToggleStatus(customer)}
              className={customer.status === "active" ? "text-amber-600" : "text-green-600"}
            >
              <Power className="h-4 w-4 mr-2" />
              {customer.status === "active" ? "Desactivar" : "Activar"}
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" className="text-red-600" onClick={() => onDelete(customer)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
