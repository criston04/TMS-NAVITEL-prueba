"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageWrapper } from "@/components/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  ArrowLeft,
  Edit,
  Power,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import { Customer, CustomerCategory, CreateCustomerDTO, UpdateCustomerDTO } from "@/types/models";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { CustomerFormModal, CustomerDeleteDialog } from "@/components/customers";

const CATEGORY_COLORS: Record<CustomerCategory, string> = {
  standard: "bg-slate-500",
  premium: "bg-blue-500",
  vip: "bg-amber-500",
  wholesale: "bg-purple-500",
  corporate: "bg-indigo-500",
  government: "bg-emerald-500",
};

const CATEGORY_LABELS: Record<CustomerCategory, string> = {
  standard: "Estándar",
  premium: "Premium",
  vip: "VIP",
  wholesale: "Mayorista",
  corporate: "Corporativo",
  government: "Gobierno",
};

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

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error: showError } = useToast();
  const customerId = params.id as string;

  const {
    customer,
    isLoading,
    updateCustomer,
    toggleStatus,
    deleteCustomer,
  } = useCustomerDetail(customerId);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdate = async (data: CreateCustomerDTO | UpdateCustomerDTO) => {
    if (!customer) return;
    setIsSubmitting(true);
    try {
      const updated = await updateCustomer(data as UpdateCustomerDTO);
      if (updated) {
        setIsFormModalOpen(false);
        success("Actualizado", "Cliente actualizado correctamente");
      } else {
        showError("Error", "No se pudo actualizar el cliente");
      }
    } catch {
      showError("Error", "No se pudo actualizar el cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;
    try {
      const updated = await toggleStatus();
      if (updated) {
        success("Estado cambiado", `Cliente ${updated.status === "active" ? "activado" : "desactivado"}`);
      } else {
        showError("Error", "No se pudo cambiar el estado");
      }
    } catch {
      showError("Error", "No se pudo cambiar el estado");
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    setIsSubmitting(true);
    try {
      const deleted = await deleteCustomer();
      if (deleted) {
        success("Eliminado", "Cliente eliminado correctamente");
        router.push("/master/customers");
      } else {
        showError("Error", "No se pudo eliminar el cliente");
      }
    } catch {
      showError("Error", "No se pudo eliminar el cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success("Copiado", "Texto copiado al portapapeles");
  };

  if (isLoading) {
    return (
      <PageWrapper title="Cargando...">
        <LoadingSkeleton />
      </PageWrapper>
    );
  }

  if (!customer) {
    return (
      <PageWrapper title="Cliente no encontrado">
        <div className="text-center py-12">
          <p className="text-muted-foreground">El cliente no existe o fue eliminado</p>
          <Button asChild className="mt-4">
            <Link href="/master/customers">Volver a Clientes</Link>
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const category = customer.category || "standard";

  return (
    <PageWrapper title={customer.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/master/customers">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center",
              customer.type === "empresa" ? "bg-primary/10" : "bg-blue-500/10"
            )}>
              {customer.type === "empresa"
                ? <Building2 className="h-8 w-8 text-primary" />
                : <User className="h-8 w-8 text-blue-500" />
              }
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                  {customer.status === "active" ? "Activo" : "Inactivo"}
                </Badge>
                <Badge className={cn("text-white", CATEGORY_COLORS[category])}>
                  {CATEGORY_LABELS[category]}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {customer.tradeName && <span>{customer.tradeName} • </span>}
                {customer.code}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsFormModalOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="outline"
              onClick={handleToggleStatus}
              className={customer.status === "active" ? "text-amber-600" : "text-green-600"}
            >
              <Power className="h-4 w-4 mr-2" />
              {customer.status === "active" ? "Desactivar" : "Activar"}
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Órdenes</p>
                  <p className="text-2xl font-bold">
                    {customer.operationalStats?.totalOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold">
                    {customer.operationalStats?.completedOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">A tiempo</p>
                  <p className="text-2xl font-bold">
                    {customer.operationalStats?.onTimeDeliveryRate || 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Crédito</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(customer.creditLimit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs con contenido */}
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="addresses">Direcciones ({customer.addresses.length})</TabsTrigger>
            <TabsTrigger value="contacts">Contactos ({customer.contacts.length})</TabsTrigger>
            <TabsTrigger value="orders">Órdenes</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Datos del cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Datos del Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Documento</span>
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
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Email
                    </span>
                    <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                      {customer.email}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" /> Teléfono
                    </span>
                    <span className="font-medium">{customer.phone}</span>
                  </div>
                  {customer.website && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sector</span>
                      <span className="font-medium">{customer.industry}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Historial */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Historial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Registrado</span>
                    <span>{formatDate(customer.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última actualización</span>
                    <span>{formatDate(customer.updatedAt)}</span>
                  </div>
                  {customer.firstOrderDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primer pedido</span>
                      <span>{formatDate(customer.firstOrderDate)}</span>
                    </div>
                  )}
                  {customer.operationalStats?.lastOrderDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último pedido</span>
                      <span>{formatDate(customer.operationalStats.lastOrderDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tags y notas */}
            {(customer.tags?.length || customer.notes) && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {customer.tags && customer.tags.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Etiquetas</p>
                      <div className="flex flex-wrap gap-2">
                        {customer.tags.map((tag, i) => (
                          <Badge key={i} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {customer.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Notas</p>
                      <p className="text-sm">{customer.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="addresses" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {customer.addresses.map((address, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
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
                    <Button variant="outline" size="sm" className="mt-3" asChild>
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
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {customer.contacts.map((contact, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
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
                      <div className="flex gap-2 mt-3">
                        {contact.notifyDeliveries && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-1" /> Notificar entregas
                          </Badge>
                        )}
                        {contact.notifyIncidents && (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" /> Notificar incidentes
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Historial de Órdenes</h3>
                <p className="text-muted-foreground mb-4">
                  Aquí se mostrarán las órdenes del cliente
                </p>
                <Button variant="outline" asChild>
                  <Link href={`/orders?customerId=${customer.id}`}>
                    Ver Órdenes
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modales */}
      <CustomerFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleUpdate}
        customer={customer}
        isLoading={isSubmitting}
      />

      <CustomerDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        customer={customer}
        isLoading={isSubmitting}
      />
    </PageWrapper>
  );
}
