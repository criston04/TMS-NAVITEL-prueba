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
import type { Tenant, TenantStatus, SubscriptionPlan, CreateTenantDTO, SystemModuleCode } from "@/types/platform";
import { getModulesForPlan } from "@/types/platform";
import { tenantService } from "@/services/platform.service";

const statusConfig: Record<TenantStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Activo", variant: "default" },
  trial: { label: "Trial", variant: "secondary" },
  suspended: { label: "Suspendido", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  pending: { label: "Pendiente", variant: "secondary" },
};

const planConfig: Record<SubscriptionPlan, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
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
  const [createOpen, setCreateOpen] = useState(false);
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
      setTenants(response.items);
    } catch (err) {
      console.error("Error loading tenants:", err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.taxId.includes(search) ||
        t.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || t.status === statusFilter;
      const matchesPlan = planFilter === "all" || t.plan === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [tenants, search, statusFilter, planFilter]);

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
      };
      await tenantService.create(dto);
      setCreateOpen(false);
      setNewTenant({
        code: "", name: "", legalName: "", taxId: "", email: "", phone: "",
        address: "", city: "", country: "PE", plan: "professional", maxUsers: 20,
        maxVehicles: 50, enableTrial: false, trialDays: 30,
      });
      loadTenants();
    } catch (err) {
      console.error("Error creating tenant:", err);
    }
  }

  async function handleSuspend(id: string) {
    try {
      await tenantService.suspend(id, { reason: "Suspendido desde panel de plataforma" });
      loadTenants();
    } catch (err) {
      console.error("Error suspending tenant:", err);
    }
  }

  async function handleReactivate(id: string) {
    try {
      await tenantService.reactivate(id);
      loadTenants();
    } catch (err) {
      console.error("Error reactivating tenant:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este tenant? Esta acción no se puede deshacer.")) return;
    try {
      await tenantService.delete(id);
      loadTenants();
    } catch (err) {
      console.error("Error deleting tenant:", err);
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
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  placeholder="EMPRESA-CODIGO"
                  value={newTenant.code}
                  onChange={(e) => setNewTenant({ ...newTenant, code: e.target.value.toUpperCase().replace(/\s+/g, "-") })}
                />
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
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  placeholder="PE"
                  value={newTenant.country}
                  onChange={(e) => setNewTenant({ ...newTenant, country: e.target.value })}
                />
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
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
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
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
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
                      const status = statusConfig[tenant.status];
                      const plan = planConfig[tenant.plan];
                      const moduleCount = tenant.enabledModules.filter((m) => m.isEnabled).length;
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{tenant.name}</p>
                              <p className="text-xs text-muted-foreground">{tenant.code} · {tenant.taxId}</p>
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
                              <span className="text-sm">{tenant.currentUsersCount}/{tenant.maxUsers}</span>
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
                              <span className="text-sm">{moduleCount}</span>
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
                                ) : null}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDelete(tenant.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
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
    </PageWrapper>
  );
}
