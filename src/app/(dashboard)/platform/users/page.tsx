"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Plus,
  Search,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { PageWrapper } from "@/components/page-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import type { PlatformRole } from "@/types/auth";
import {
  platformUserService,
  type PlatformUserItem,
  type CreatePlatformUserDTO,
} from "@/services/platform.service";

/**
 * Roles de plataforma (Owner + Admin del TMS).
 * Solo aparecen platform_owner y platform_admin en la UI.
 */
const roleConfig: Record<PlatformRole, { label: string; description: string; variant: "default" | "secondary" | "outline" }> = {
  platform_owner: { label: "Owner", description: "Control total de la plataforma", variant: "default" },
  platform_admin: { label: "Admin", description: "Administración de tenants, módulos y soporte", variant: "secondary" },
};

/**
 * Roles aceptados como "Platform user" en la UI.
 * Incluye los canonicos + legacy (OWNER mayusculas, owner lowercase) que se
 * mostrarán como platform_owner si pertenecen al root tenant.
 */
const PLATFORM_ROLE_NAMES = new Set([
  "platform_owner",
  "platform_admin",
  "owner",
  "OWNER",
  "admin",
  "ADMIN",
]);

const ROOT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Normaliza el role del backend al PlatformRole canonico que la UI conoce.
 */
function normalizePlatformRole(rawRole: string, tenantId: string): PlatformRole | null {
  const lower = rawRole.toLowerCase();
  if (lower === "platform_owner") return "platform_owner";
  if (lower === "platform_admin") return "platform_admin";
  // Legacy: si el user es del root tenant y tiene role "owner"/"admin", se considera platform.
  if (tenantId === ROOT_TENANT_ID) {
    if (lower === "owner") return "platform_owner";
    if (lower === "admin") return "platform_admin";
  }
  return null;
}

function fullName(u: PlatformUserItem): string {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return u.username || u.email;
}

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    role: "platform_admin" as PlatformRole,
    password: "",
  });

  /**
   * Carga la lista real desde el backend.
   * Filtra client-side por roles platform (porque el backend devuelve todos
   * los users del root tenant, no solo los de plataforma).
   */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await platformUserService.getAll({ pageSize: 100 });
      const items = response?.items ?? [];
      // Si showAllRoles=true, mostramos TODOS los users del backend (incluye masters
      // huerfanos creados por el bug del endpoint /platform/users).
      // Si false, solo los que califican como platform_owner/platform_admin.
      if (showAllRoles) {
        setUsers(items);
      } else {
        setUsers(items.filter((u) => normalizePlatformRole(u.role, u.tenantId) !== null));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar usuarios";
      setError(msg);
      console.error("[PlatformUsersPage] Error cargando:", err);
    } finally {
      setLoading(false);
    }
  }, [showAllRoles]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      fullName(u).toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  async function handleCreate() {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast.error("Username, email y contraseña son obligatorios");
      return;
    }
    setCreating(true);
    try {
      const dto: CreatePlatformUserDTO = {
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
        phone: newUser.phone || undefined,
        role: newUser.role,
      };
      const created = await platformUserService.create(dto);
      toast.success(`Usuario "${created.username}" creado correctamente`);
      setCreateOpen(false);
      setNewUser({
        firstName: "",
        lastName: "",
        username: "",
        email: "",
        phone: "",
        role: "platform_admin",
        password: "",
      });
      // Recargar lista
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al crear usuario";
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user: PlatformUserItem) {
    setTogglingId(user.id);
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";
      await platformUserService.toggleStatus(user.id, newStatus);
      toast.success(
        `Usuario "${user.username}" ${newStatus === "active" ? "activado" : "desactivado"}`,
      );
      await loadUsers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cambiar estado";
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <PageWrapper
      title="Usuarios de Plataforma"
      description="Gestione los usuarios con acceso al panel de administración"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Usuario de Plataforma</DialogTitle>
                <DialogDescription>
                  Este usuario tendrá acceso al panel de administración de la plataforma.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="usuario.tms"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@tms-navitel.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+51 999 999 999"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v) => setNewUser({ ...newUser, role: v as PlatformRole })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleConfig).map(([role, cfg]) => (
                        <SelectItem key={role} value={role} disabled={role === "platform_owner"}>
                          {cfg.label} — {cfg.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contraseña *</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!newUser.username || !newUser.email || !newUser.password || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Usuario"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Usuarios de Plataforma ({filtered.length})
          </CardTitle>
          <CardDescription>
            Usuarios con acceso al panel de administración de la plataforma TMS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, username o rol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showAllRoles}
                onChange={(e) => setShowAllRoles(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span>
                Mostrar TODOS los roles
                <span className="text-xs text-muted-foreground ml-1">
                  (incluye master, supervisor, cliente, tercero huérfanos)
                </span>
              </span>
            </label>
          </div>

          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando usuarios...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  {showAllRoles && <TableHead>Tenant</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="w-25">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showAllRoles ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      {search
                        ? "No hay resultados para la búsqueda."
                        : showAllRoles
                          ? "No hay usuarios registrados."
                          : "No hay usuarios de plataforma. Activa 'Mostrar TODOS los roles' para ver todos los users del backend."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => {
                    const normalizedRole = normalizePlatformRole(user.role, user.tenantId);
                    const role = normalizedRole ? roleConfig[normalizedRole] : null;
                    const isActive = user.status === "active";
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{fullName(user)}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              {user.username && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  @{user.username}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {role ? (
                            <Badge variant={role.variant}>{role.label}</Badge>
                          ) : (
                            <Badge variant="outline">{user.role}</Badge>
                          )}
                        </TableCell>
                        {showAllRoles && (
                          <TableCell>
                            {user.tenantId === ROOT_TENANT_ID ? (
                              <Badge variant="secondary" className="text-[10px]">Root (Navitel)</Badge>
                            ) : (
                              <span
                                className="text-xs font-mono text-muted-foreground"
                                title={user.tenantId}
                              >
                                {user.tenantId.slice(0, 8)}…
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant={isActive ? "default" : "outline"}>
                            {isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.lastLoginAt
                              ? new Date(user.lastLoginAt).toLocaleDateString("es", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Nunca"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString("es", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleToggleActive(user)}
                            disabled={
                              normalizedRole === "platform_owner" || togglingId === user.id
                            }
                          >
                            {togglingId === user.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isActive ? (
                              "Desactivar"
                            ) : (
                              "Activar"
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {/* Descripción de roles */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
            <h4 className="text-sm font-semibold mb-3">Roles de Plataforma</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(roleConfig).map(([role, cfg]) => (
                <div key={role} className="flex items-start gap-2">
                  <Badge variant={cfg.variant} className="text-xs mt-0.5">
                    {cfg.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground">{cfg.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
