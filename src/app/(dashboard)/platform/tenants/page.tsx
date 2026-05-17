"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  PauseCircle,
  PlayCircle,
  Trash2,
  Users,
  Car,
  Box,
  Filter,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Tenant, TenantStatus, SubscriptionPlan, CreateTenantDTO, SystemModuleCode } from "@/types/platform";
import { getModulesForPlan } from "@/types/platform";
import { tenantService, tenantModuleService } from "@/services/platform.service";

const ROOT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const statusConfig: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Activo", variant: "default" },
  trial: { label: "Trial", variant: "secondary" },
  suspended: { label: "Suspendido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  pending: { label: "Pendiente", variant: "secondary" },
};

const planConfig: Record<SubscriptionPlan, { label: string; color: string }> = {
  basic: { label: "Basic", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
  professional: { label: "Professional", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  custom: { label: "Custom", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [showCancelled, setShowCancelled] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 2026-05-14: el endpoint GET /platform/tenants NO devuelve enabled_modules en el listado.
  // Hay que pedir GET /platform/tenants/:id/modules por cada tenant en background.
  // null = aún cargando, number = ya cargado.
  const [moduleCounts, setModuleCounts] = useState<Map<string, number | null>>(new Map());
  const [newTenant, setNewTenant] = useState({
    code: "",
    name: "",
    legalName: "",
    taxId: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "PE",
    plan: "professional" as SubscriptionPlan,
    maxUsers: 20,
    maxVehicles: 50,
    enableTrial: false,
    trialDays: 30,
  });

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    setLoading(true);
    try {
      const response = await tenantService.getAll({ pageSize: 100 });
      // 2026-05-07: defensive — el backend a veces responde sin items[]
      setTenants(Array.isArray(response?.items) ? response.items : []);
    } catch (err) {
      console.error("Error loading tenants:", err);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }

  // 2026-05-14: lazy-load del count de módulos por tenant.
  // El backend (GET /platform/tenants) no incluye enabled_modules en el listado,
  // así que pedimos /platform/tenants/:id/modules por cada uno en secuencia.
  // - Delay de 800ms entre requests para respetar rate-limit (10 req/min del backend).
  // - apiClient cachea por 30s, así que re-renders no re-pegan al backend.
  // - Si el componente se desmonta o cambia tenants, abortamos con `cancelled`.
  useEffect(() => {
    if (tenants.length === 0) return;

    let cancelled = false;

    // Inicializar a null (loading) los tenants nuevos que aún no tienen count.
    setModuleCounts((prev) => {
      const next = new Map(prev);
      for (const t of tenants) {
        if (!next.has(t.id)) next.set(t.id, null);
      }
      return next;
    });

    (async () => {
      for (const tenant of tenants) {
        if (cancelled) return;
        // Skip tenants cancelados — su count ya no importa en la lista.
        if (tenant.status === "cancelled") {
          setModuleCounts((prev) => {
            const next = new Map(prev);
            next.set(tenant.id, 0);
            return next;
          });
          continue;
        }
        try {
          const modules = await tenantModuleService.getByTenant(tenant.id);
          if (cancelled) return;
          const count = modules.filter((m) => m.isEnabled).length;
          setModuleCounts((prev) => {
            const next = new Map(prev);
            next.set(tenant.id, count);
            return next;
          });
        } catch (err) {
          console.error(`Error loading modules for tenant ${tenant.id}:`, err);
          if (cancelled) return;
          // Fallback a 0 ante error (el usuario verá 0 y al entrar al detalle verá la verdad).
          setModuleCounts((prev) => {
            const next = new Map(prev);
            next.set(tenant.id, 0);
            return next;
          });
        }
        // Espaciar requests para evitar 429 del backend (10 req/min).
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tenants]);

  const filtered = useMemo(() => {
    if (!Array.isArray(tenants)) return [];
    return tenants.filter((t) => {
      // Backend hace soft-delete: tenants "eliminados" quedan como status='cancelled'.
      // Por default los ocultamos a menos que el usuario active el toggle.
      if (!showCancelled && t.status === "cancelled") return false;

      // Defensive: campos pueden venir undefined si el backend cambio shape
      const name = t.name ?? "";
      const code = t.code ?? "";
      const taxId = t.taxId ?? "";
      const email = t.email ?? "";
      const matchesSearch =
        !search ||
        name.toLowerCase().includes(search.toLowerCase()) ||
        code.toLowerCase().includes(search.toLowerCase()) ||
        taxId.includes(search) ||
        email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPlan = planFilter === "all" || t.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, search, statusFilter, planFilter, showCancelled]);

  // Contar cuántos cancelled hay (para mostrar el toggle con el número)
  const cancelledCount = useMemo(
    () => tenants.filter((t) => t.status === "cancelled").length,
    [tenants],
  );

  async function handleCreate() {
    try {
      const defaultModules = getModulesForPlan(newTenant.plan).map((m) => m.code);
      const dto: CreateTenantDTO = {
        code: newTenant.code,
        name: newTenant.name,
        legalName: newTenant.legalName || newTenant.name,
        taxId: newTenant.taxId,
        email: newTenant.email,
        phone: newTenant.phone,
        address: newTenant.address,
        city: newTenant.city,
        country: newTenant.country,
        plan: newTenant.plan,
        maxUsers: newTenant.maxUsers,
        maxVehicles: newTenant.maxVehicles,
        enabledModules: defaultModules as SystemModuleCode[],
        enableTrial: newTenant.enableTrial,
        trialDays: newTenant.enableTrial ? newTenant.trialDays : undefined,
        // Campos OBLIGATORIOS segun PLATAFORMA.md §4.3.4 (defaults razonables para Peru)
        timezone: "America/Lima",
        defaultCurrency: "PEN",
        defaultLanguage: "es",
      };
      await tenantService.create(dto);
      toast.success(`Tenant "${newTenant.name}" creado correctamente`);
      setCreateOpen(false);
      setNewTenant({
        code: "", name: "", legalName: "", taxId: "", email: "", phone: "",
        address: "", city: "", country: "PE", plan: "professional", maxUsers: 20,
        maxVehicles: 50, enableTrial: false, trialDays: 30,
      });
      loadTenants();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "Error creando tenant";
      // Bug §4.3.9 conocido: 500 viene del backend por FK created_by invalido.
      if (status === 500) {
        toast.error(
          "El backend no pudo crear el tenant (HTTP 500). Bug conocido §4.3.9: falta registro del admin en platform_users. Reportado al equipo backend.",
          { duration: 10000 },
        );
      } else if (status === 400) {
        toast.error(`Validación: ${msg}`);
      } else if (status === 409) {
        toast.error("Ya existe un tenant con ese código o RUC.");
      } else {
        toast.error(status ? `HTTP ${status}: ${msg}` : msg);
      }
      console.error("Error creating tenant:", err);
    }
  }

  async function handleSuspend(id: string) {
    try {
      await tenantService.suspend(id, { reason: "Suspendido desde panel de plataforma" });
      toast.success("Tenant suspendido");
      loadTenants();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error suspendiendo tenant";
      toast.error(msg);
      console.error("Error suspending tenant:", err);
    }
  }

  async function handleReactivate(id: string) {
    try {
      await tenantService.reactivate(id);
      toast.success("Tenant reactivado");
      loadTenants();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error reactivando tenant";
      toast.error(msg);
      console.error("Error reactivating tenant:", err);
    }
  }

  /**
   * 2026-05-14: activación de un tenant `pending` (recién creado).
   *
   * Estrategia con fallback:
   *  1) Intenta `POST /platform/tenants/:id/reactivate` — es la misma operación
   *     lógica (poner el tenant en `active`). El backend puede aceptarlo si su
   *     state-machine modela `pending → active` igual que `suspended → active`.
   *  2) Si devuelve INVALID_TRANSITION (state-machine estricto), cae a
   *     `PUT /platform/tenants/:id` con `{ status: "active" }`.
   */
  async function handleActivate(id: string, tenantName: string) {
    try {
      await tenantService.reactivate(id);
      toast.success(`Tenant "${tenantName}" activado`);
      loadTenants();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isInvalidTransition =
        msg.includes("INVALID_TRANSITION") || msg.includes("invalid transition");
      if (isInvalidTransition) {
        // Fallback: el backend no acepta reactivate desde pending. Usamos PUT.
        try {
          await tenantService.update(id, { status: "active" });
          toast.success(`Tenant "${tenantName}" activado`);
          loadTenants();
          return;
        } catch (err2) {
          const msg2 = err2 instanceof Error ? err2.message : "Error activando tenant";
          toast.error(msg2);
          console.error("Error activating tenant (fallback PUT):", err2);
          return;
        }
      }
      toast.error(msg || "Error activando tenant");
      console.error("Error activating tenant (reactivate):", err);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await tenantService.delete(deleteTarget.id);
      toast.success(`Tenant "${deleteTarget.name ?? deleteTarget.code}" eliminado`);
      setDeleteTarget(null);
      loadTenants();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : "Error eliminando tenant";
      // El backend hace soft-delete. Si el tenant ya esta cancelled, devuelve 400 con
      // mensaje "INVALID_TRANSITION: tenant is already cancelled".
      if (msg.includes("INVALID_TRANSITION") || msg.includes("already cancelled")) {
        toast.warning("Este tenant ya fue eliminado anteriormente (status = cancelado). La lista se refrescará.");
        setDeleteTarget(null);
        loadTenants(); // recargar para que el frontend vea el status real
      } else if (status === 404) {
        toast.error("El tenant ya no existe en el backend.");
        setDeleteTarget(null);
        loadTenants();
      } else {
        toast.error(status ? `HTTP ${status}: ${msg}` : msg);
      }
      console.error("Error deleting tenant:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageWrapper
      title="Gestión de Clientes (Tenants)"
      description="Administra las cuentas de clientes que utilizan el sistema TMS"
      actions={
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Cuenta de Cliente</DialogTitle>
              <DialogDescription>
                Configure los datos del nuevo tenant. Podrá asignar módulos y crear el usuario maestro después.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  placeholder="EMPRESACODIGO"
                  value={newTenant.code}
                  onChange={(e) => setNewTenant({
                    ...newTenant,
                    // El backend exige solo alfanumerico (sin guiones ni espacios).
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  })}
                  maxLength={32}
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras y números (sin guiones ni espacios). Ej: <code>TRANSPGARCIA</code>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Comercial</Label>
                <Input
                  id="name"
                  placeholder="Mi Empresa S.A.C."
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Razón Social</Label>
                <Input
                  id="legalName"
                  placeholder="Mi Empresa Sociedad Anónima Cerrada"
                  value={newTenant.legalName}
                  onChange={(e) => setNewTenant({ ...newTenant, legalName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">RUC / NIT</Label>
                <Input
                  id="taxId"
                  placeholder="20XXXXXXXXX"
                  value={newTenant.taxId}
                  onChange={(e) => setNewTenant({ ...newTenant, taxId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@empresa.com"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+51 999 999 999"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  placeholder="Av. Principal 123, Lima"
                  value={newTenant.address}
                  onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  placeholder="Lima"
                  value={newTenant.city}
                  onChange={(e) => setNewTenant({ ...newTenant, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País *</Label>
                <Select
                  value={newTenant.country}
                  onValueChange={(v) => setNewTenant({ ...newTenant, country: v })}
                >
                  <SelectTrigger id="country">
                    <SelectValue placeholder="PE" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PE">Perú (PE)</SelectItem>
                    <SelectItem value="CO">Colombia (CO)</SelectItem>
                    <SelectItem value="CL">Chile (CL)</SelectItem>
                    <SelectItem value="EC">Ecuador (EC)</SelectItem>
                    <SelectItem value="MX">México (MX)</SelectItem>
                    <SelectItem value="AR">Argentina (AR)</SelectItem>
                    <SelectItem value="BR">Brasil (BR)</SelectItem>
                    <SelectItem value="US">Estados Unidos (US)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Código ISO de 2 letras (no escribir el nombre del país).
                </p>
              </div>

              <Separator className="col-span-2" />

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={newTenant.plan}
                  onValueChange={(v) => setNewTenant({ ...newTenant, plan: v as SubscriptionPlan })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Standard</SelectItem>
                    <SelectItem value="custom">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Máx. Usuarios</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  min={1}
                  value={newTenant.maxUsers}
                  onChange={(e) => setNewTenant({ ...newTenant, maxUsers: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxVehicles">Máx. Vehículos</Label>
                <Input
                  id="maxVehicles"
                  type="number"
                  min={1}
                  value={newTenant.maxVehicles}
                  onChange={(e) => setNewTenant({ ...newTenant, maxVehicles: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTenant.enableTrial}
                    onChange={(e) => setNewTenant({ ...newTenant, enableTrial: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  Periodo de prueba
                </Label>
                {newTenant.enableTrial && (
                  <Input
                    type="number"
                    min={7}
                    max={90}
                    value={newTenant.trialDays}
                    onChange={(e) => setNewTenant({ ...newTenant, trialDays: parseInt(e.target.value) || 30 })}
                    placeholder="Días de prueba"
                  />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTenant.code || !newTenant.name || !newTenant.taxId || !newTenant.email}
              >
                Crear Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-4">
        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código, RUC, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspendidos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los planes</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              {cancelledCount > 0 && (
                <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer select-none ml-auto">
                  <input
                    type="checkbox"
                    checked={showCancelled}
                    onChange={(e) => setShowCancelled(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-muted-foreground">
                    Mostrar eliminados
                    <span className="ml-1 text-xs">({cancelledCount})</span>
                  </span>
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Clientes ({filtered.length})
            </CardTitle>
            <CardDescription>
              Todas las cuentas de clientes registradas en la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground">
                Cargando clientes...
              </div>
            ) : filtered.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground">
                <Building2 className="h-8 w-8 mb-2 opacity-50" />
                <p>No se encontraron clientes</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Usuarios</TableHead>
                      <TableHead className="text-center">Vehículos</TableHead>
                      <TableHead className="text-center">Módulos</TableHead>
                      <TableHead>Usuario Maestro</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((tenant) => {
                      // Fallbacks defensivos: si el backend devuelve un valor de status/plan
                      // que no esta en el config (ej: legacy "professional", "trial" en status),
                      // usamos el valor crudo en lugar de crashear.
                      const status = statusConfig[tenant.status] ?? {
                        label: String(tenant.status ?? "desconocido"),
                        variant: "outline" as const,
                      };
                      const plan = planConfig[tenant.plan] ?? {
                        label: String(tenant.plan ?? "—"),
                        color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                      };
                      // El listado del backend no trae enabledModules; usamos el count
                      // lazy-cargado por tenant. `undefined` = aún no iniciado, `null` = en vuelo.
                      const lazyCount = moduleCounts.get(tenant.id);
                      const moduleCount: number | null =
                        Array.isArray(tenant.enabledModules) && tenant.enabledModules.length > 0
                          ? tenant.enabledModules.filter((m) => m.isEnabled).length
                          : lazyCount === undefined
                            ? null
                            : lazyCount;
                      const isRoot = tenant.id === ROOT_TENANT_ID;
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{tenant.name}</p>
                                {isRoot && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-amber-400 text-amber-700 dark:text-amber-400">
                                    ROOT · Navitel
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{tenant.code} · {tenant.taxId}</p>
                              {isRoot && (
                                <p className="text-[10px] text-muted-foreground/70 italic">
                                  Tenant principal del sistema · No se puede suspender ni eliminar
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${plan.color}`}>
                              {plan.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {/* Workaround bug backend: si tiene master_user_id asignado, count >= 1 */}
                              <span className="text-sm">
                                {tenant.masterUserId
                                  ? Math.max(tenant.currentUsersCount ?? 0, 1)
                                  : (tenant.currentUsersCount ?? 0)
                                }/{tenant.maxUsers}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Car className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{tenant.currentVehiclesCount}/{tenant.maxVehicles}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Box className="h-3 w-3 text-muted-foreground" />
                              {moduleCount === null ? (
                                <span className="text-sm text-muted-foreground/60">…</span>
                              ) : (
                                <span className="text-sm">{moduleCount}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant.masterUserName ? (
                              <div>
                                <p className="text-sm">{tenant.masterUserName}</p>
                                <p className="text-xs text-muted-foreground">{tenant.masterUserEmail}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Sin asignar</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/platform/tenants/${tenant.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Ver detalle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/platform/tenants/${tenant.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                                {tenant.id !== ROOT_TENANT_ID && tenant.status !== "cancelled" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {tenant.status === "active" || tenant.status === "trial" ? (
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleSuspend(tenant.id)}
                                      >
                                        <PauseCircle className="mr-2 h-4 w-4" />
                                        Suspender
                                      </DropdownMenuItem>
                                    ) : tenant.status === "suspended" ? (
                                      <DropdownMenuItem onClick={() => handleReactivate(tenant.id)}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Reactivar
                                      </DropdownMenuItem>
                                    ) : tenant.status === "pending" ? (
                                      <DropdownMenuItem onClick={() => handleActivate(tenant.id, tenant.name ?? tenant.code)}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Activar
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteTarget(tenant)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmación de eliminación */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar el tenant{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name ?? deleteTarget?.code}
              </span>
              {deleteTarget?.taxId && (
                <>
                  {" "}
                  (RUC <span className="font-mono">{deleteTarget.taxId}</span>)
                </>
              )}
              . Esta acción no se puede deshacer y se perderán todos los datos asociados:
              usuarios, vehículos, órdenes, módulos contratados y referencias de pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
