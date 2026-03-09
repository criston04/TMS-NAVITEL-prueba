"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Car,
  Box,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  PauseCircle,
  PlayCircle,
  Key,
  Plus,
  Check,
  X,
  AlertTriangle,
  Globe,
  DollarSign,
  Clock,
  FileText,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Tenant,
  TenantStatus,
  SubscriptionPlan,
  TenantModuleConfig,
  SystemModuleCode,
  SystemModuleDefinition,
  UpdateTenantDTO,
  CreateMasterUserDTO,
} from "@/types/platform";
import {
  SYSTEM_MODULES,
  getModuleDefinition,
  checkModuleDependencies,
  checkModuleDependents,
} from "@/types/platform";
import { tenantService, tenantModuleService, masterUserService } from "@/services/platform.service";

const statusConfig: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Check }> = {
  active: { label: "Activo", variant: "default", icon: Check },
  trial: { label: "Trial", variant: "secondary", icon: Clock },
  suspended: { label: "Suspendido", variant: "destructive", icon: PauseCircle },
  cancelled: { label: "Cancelado", variant: "outline", icon: X },
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
};

const planConfig: Record<SubscriptionPlan, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  professional: { label: "Professional", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  custom: { label: "Custom", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

const categoryLabels: Record<string, string> = {
  operations: "Operaciones",
  monitoring: "Monitoreo",
  finance: "Finanzas",
  maintenance: "Mantenimiento",
  master: "Datos Maestros",
  reports: "Reportes",
  support: "Soporte",
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [masterUserOpen, setMasterUserOpen] = useState(false);
  const [editForm, setEditForm] = useState<UpdateTenantDTO>({});
  const [masterForm, setMasterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    forcePasswordChange: true,
  });

  const loadTenant = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantService.getById(tenantId);
      setTenant(data);
    } catch (err) {
      console.error("Error loading tenant:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  // Agrupar módulos por categoría
  const modulesByCategory = useMemo(() => {
    const groups: Record<string, { module: SystemModuleDefinition; config: TenantModuleConfig | undefined }[]> = {};
    for (const mod of SYSTEM_MODULES) {
      const cat = mod.category;
      if (!groups[cat]) groups[cat] = [];
      const config = tenant?.enabledModules.find((m) => m.moduleCode === mod.code);
      groups[cat].push({ module: mod, config });
    }
    return groups;
  }, [tenant]);

  async function handleToggleModule(moduleCode: SystemModuleCode, enable: boolean) {
    if (!tenant) return;

    const enabledCodes = tenant.enabledModules.filter((m) => m.isEnabled).map((m) => m.moduleCode);

    if (enable) {
      const { canEnable, missingDependencies } = checkModuleDependencies(moduleCode, enabledCodes);
      if (!canEnable) {
        const names = missingDependencies.map((d) => getModuleDefinition(d)?.name ?? d).join(", ");
        alert(`No se puede activar: faltan dependencias (${names})`);
        return;
      }
      await tenantModuleService.updateModules(tenantId, { enableModules: [moduleCode] });
    } else {
      const { canDisable, dependentModules } = checkModuleDependents(moduleCode, enabledCodes);
      if (!canDisable) {
        const names = dependentModules.map((d) => getModuleDefinition(d)?.name ?? d).join(", ");
        alert(`No se puede desactivar: otros módulos dependen de este (${names})`);
        return;
      }
      await tenantModuleService.updateModules(tenantId, { disableModules: [moduleCode] });
    }
    loadTenant();
  }

  async function handleSuspend() {
    if (!tenant) return;
    const reason = prompt("Motivo de la suspensión:");
    if (!reason) return;
    try {
      await tenantService.suspend(tenantId, { reason });
      loadTenant();
    } catch (err) {
      console.error("Error suspending:", err);
    }
  }

  async function handleReactivate() {
    if (!tenant) return;
    try {
      await tenantService.reactivate(tenantId);
      loadTenant();
    } catch (err) {
      console.error("Error reactivating:", err);
    }
  }

  async function handleUpdate() {
    setSaving(true);
    try {
      await tenantService.update(tenantId, editForm);
      setEditOpen(false);
      loadTenant();
    } catch (err) {
      console.error("Error updating:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateMasterUser() {
    if (!tenant) return;
    setSaving(true);
    try {
      const dto: CreateMasterUserDTO = {
        tenantId: tenant.id,
        name: masterForm.name,
        email: masterForm.email,
        password: masterForm.password,
        phone: masterForm.phone || undefined,
        forcePasswordChange: masterForm.forcePasswordChange,
      };
      await masterUserService.createMasterUser(dto);
      setMasterUserOpen(false);
      setMasterForm({ name: "", email: "", phone: "", password: "", forcePasswordChange: true });
      loadTenant();
    } catch (err) {
      console.error("Error creating master user:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleForcePasswordReset() {
    if (!tenant?.masterUserId) return;
    try {
      const result = await masterUserService.forcePasswordReset({
        userId: tenant.masterUserId,
        tenantId: tenant.id,
        sendByEmail: true,
        forceChangeOnLogin: true,
      });
      alert(result.message);
    } catch (err) {
      console.error("Error:", err);
    }
  }

  function openEditDialog() {
    if (!tenant) return;
    setEditForm({
      name: tenant.name,
      legalName: tenant.legalName,
      taxId: tenant.taxId,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      city: tenant.city,
      country: tenant.country,
      plan: tenant.plan,
      maxUsers: tenant.maxUsers,
      maxVehicles: tenant.maxVehicles,
    });
    setEditOpen(true);
  }

  if (loading) {
    return (
      <PageWrapper title="Detalle de Cliente" description="Cargando...">
        <div className="h-60 flex items-center justify-center text-muted-foreground">
          Cargando información del cliente...
        </div>
      </PageWrapper>
    );
  }

  if (!tenant) {
    return (
      <PageWrapper title="Cliente no encontrado" description="">
        <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p>No se encontró el cliente solicitado</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/platform/tenants")}>
            Volver a la lista
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const status = statusConfig[tenant.status];
  const plan = planConfig[tenant.plan];
  const enabledCount = tenant.enabledModules.filter((m) => m.isEnabled).length;

  return (
    <PageWrapper
      title={tenant.name}
      description={`${tenant.code} · ${tenant.legalName}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/platform/tenants">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          {(tenant.status === "active" || tenant.status === "trial") && (
            <Button variant="destructive" size="sm" onClick={handleSuspend}>
              <PauseCircle className="mr-2 h-4 w-4" />
              Suspender
            </Button>
          )}
          {tenant.status === "suspended" && (
            <Button variant="default" size="sm" onClick={handleReactivate}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Reactivar
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Resumen Rápido */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <Badge variant={status.variant} className="mt-1">
                    {status.label}
                  </Badge>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${plan.color}`}>
                    {plan.label}
                  </span>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Usuarios</p>
                  <p className="text-2xl font-bold">{tenant.currentUsersCount}<span className="text-sm font-normal text-muted-foreground">/{tenant.maxUsers}</span></p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vehículos</p>
                  <p className="text-2xl font-bold">{tenant.currentVehiclesCount}<span className="text-sm font-normal text-muted-foreground">/{tenant.maxVehicles}</span></p>
                </div>
                <Car className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="modules">Módulos ({enabledCount})</TabsTrigger>
            <TabsTrigger value="master-user">Usuario Maestro</TabsTrigger>
            <TabsTrigger value="subscription">Suscripción</TabsTrigger>
          </TabsList>

          {/* Tab: Información General */}
          <TabsContent value="info">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Datos de la Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Código</p>
                      <p className="font-medium">{tenant.code}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">RUC / NIT</p>
                      <p className="font-medium">{tenant.taxId}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Razón Social</p>
                      <p className="font-medium">{tenant.legalName}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.address}, {tenant.city}, {tenant.country}</span>
                  </div>
                  {tenant.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{tenant.website}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Configuración Regional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-muted-foreground">Zona Horaria</p>
                      <p className="font-medium">{tenant.timezone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Moneda</p>
                      <p className="font-medium">{tenant.defaultCurrency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Idioma</p>
                      <p className="font-medium">{tenant.defaultLanguage === "es" ? "Español" : "English"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Notas Internas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {tenant.internalNotes || "Sin notas internas"}
                  </p>
                  {tenant.suspensionReason && (
                    <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                      <p className="text-sm font-medium text-destructive">Motivo de suspensión:</p>
                      <p className="text-sm">{tenant.suspensionReason}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Módulos */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Módulos del Sistema
                </CardTitle>
                <CardDescription>
                  Active o desactive los módulos disponibles para este cliente. Los módulos core (★) no se pueden desactivar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(modulesByCategory).map(([category, modules]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                      {categoryLabels[category] ?? category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {modules.map(({ module: mod, config }) => {
                        const isEnabled = config?.isEnabled ?? false;
                        return (
                          <div
                            key={mod.code}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isEnabled ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">
                                  {mod.isCore && <span className="text-amber-500 mr-1">★</span>}
                                  {mod.name}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {mod.description}
                              </p>
                              {mod.dependencies && mod.dependencies.length > 0 && (
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  Depende de: {mod.dependencies.map((d) => getModuleDefinition(d)?.name ?? d).join(", ")}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => handleToggleModule(mod.code, checked)}
                              disabled={mod.isCore}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Usuario Maestro */}
          <TabsContent value="master-user">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Usuario Maestro
                </CardTitle>
                <CardDescription>
                  El usuario maestro es el administrador principal de la cuenta del cliente.
                  Puede crear subusuarios, asignar roles y configurar el sistema dentro de su cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tenant.masterUserId ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{tenant.masterUserName}</p>
                        <p className="text-sm text-muted-foreground">{tenant.masterUserEmail}</p>
                        <p className="text-xs text-muted-foreground mt-1">ID: {tenant.masterUserId}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleForcePasswordReset}>
                        <Key className="mr-2 h-4 w-4" />
                        Reset Contraseña
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-4">
                      Este cliente aún no tiene un usuario maestro asignado
                    </p>
                    <Dialog open={masterUserOpen} onOpenChange={setMasterUserOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Crear Usuario Maestro
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Crear Usuario Maestro</DialogTitle>
                          <DialogDescription>
                            Cree el administrador principal para {tenant.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input
                              value={masterForm.name}
                              onChange={(e) => setMasterForm({ ...masterForm, name: e.target.value })}
                              placeholder="Juan Pérez"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={masterForm.email}
                              onChange={(e) => setMasterForm({ ...masterForm, email: e.target.value })}
                              placeholder="admin@empresa.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Teléfono</Label>
                            <Input
                              value={masterForm.phone}
                              onChange={(e) => setMasterForm({ ...masterForm, phone: e.target.value })}
                              placeholder="+51 999 999 999"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Contraseña Temporal</Label>
                            <Input
                              type="password"
                              value={masterForm.password}
                              onChange={(e) => setMasterForm({ ...masterForm, password: e.target.value })}
                              placeholder="••••••••"
                            />
                          </div>
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={masterForm.forcePasswordChange}
                              onChange={(e) => setMasterForm({ ...masterForm, forcePasswordChange: e.target.checked })}
                              className="h-4 w-4 rounded border-input"
                            />
                            Forzar cambio de contraseña en primer login
                          </Label>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setMasterUserOpen(false)}>
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateMasterUser}
                            disabled={saving || !masterForm.name || !masterForm.email || !masterForm.password}
                          >
                            Crear Usuario
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Suscripción */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Información de Suscripción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan Actual</p>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${plan.color}`}>
                        {plan.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                      <p className="font-medium">{new Date(tenant.subscriptionStartDate).toLocaleDateString("es")}</p>
                    </div>
                    {tenant.subscriptionEndDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                        <p className="font-medium">{new Date(tenant.subscriptionEndDate).toLocaleDateString("es")}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Periodo de Prueba</p>
                      {tenant.isTrialActive ? (
                        <div>
                          <Badge variant="secondary">Activo</Badge>
                          {tenant.trialEndDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Vence: {new Date(tenant.trialEndDate).toLocaleDateString("es")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm">No activo</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Límites</p>
                      <div className="flex gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {tenant.currentUsersCount}/{tenant.maxUsers} usuarios
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {tenant.currentVehiclesCount}/{tenant.maxVehicles} vehículos
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Módulos Activos</p>
                      <p className="font-medium">{enabledCount} de {SYSTEM_MODULES.length}</p>
                    </div>
                  </div>
                </div>
                <Separator className="my-6" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Creado: {new Date(tenant.createdAt).toLocaleString("es")} por {tenant.createdBy}</p>
                  <p>Última actualización: {new Date(tenant.updatedAt).toLocaleString("es")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualice los datos de {tenant.name}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre Comercial</Label>
              <Input
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Razón Social</Label>
              <Input
                value={editForm.legalName ?? ""}
                onChange={(e) => setEditForm({ ...editForm, legalName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>RUC / NIT</Label>
              <Input
                value={editForm.taxId ?? ""}
                onChange={(e) => setEditForm({ ...editForm, taxId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={editForm.phone ?? ""}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select
                value={editForm.plan ?? tenant.plan}
                onValueChange={(v) => setEditForm({ ...editForm, plan: v as SubscriptionPlan })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Máx. Usuarios</Label>
              <Input
                type="number"
                min={tenant.currentUsersCount}
                value={editForm.maxUsers ?? tenant.maxUsers}
                onChange={(e) => setEditForm({ ...editForm, maxUsers: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. Vehículos</Label>
              <Input
                type="number"
                min={tenant.currentVehiclesCount}
                value={editForm.maxVehicles ?? tenant.maxVehicles}
                onChange={(e) => setEditForm({ ...editForm, maxVehicles: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
