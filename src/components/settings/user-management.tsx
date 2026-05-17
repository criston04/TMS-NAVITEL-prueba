"use client";

/**
 * UserManagement — gestion de usuarios DENTRO del tenant logueado.
 *
 * 2026-05-06: REESCRITO. Antes era 100% mock con 4 usuarios hardcoded.
 * Ahora usa `userService` (src/services/user.service.ts) que llama a los
 * endpoints reales del backend (CRUD de /users + license).
 *
 * Tolera que el backend aun no implemente los endpoints — muestra un empty
 * state amigable cuando GET /users devuelve 404.
 *
 * Quien puede usar este componente: SOLO `tenant_admin` (`owner` o `admin`).
 * El sidebar ya filtra el item "Configuracion → Usuarios y Roles" por tier.
 *
 * Backend handoff: `otros/docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md`
 */

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Key,
  AlertCircle,
  Loader2,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { userService } from "@/services/user.service";
import type { AuthUser, UserRole } from "@/types/auth";
import { useLicense } from "@/hooks/useLicense";
import { UserDialog } from "./user-dialog";
import { useAuth } from "@/contexts/auth-context";
import type { SystemModuleCode } from "@/types/platform";

// ════════════════════════════════════════════════════════════════════════════
//  Catalogo de roles que un Tenant Admin puede asignar a sus subusuarios.
//  NO incluye `owner` ni `platform_*` (esos son de niveles superiores).
//  NO incluye `admin` (segun la regla 7, solo owner del tenant puede crear admin).
// ════════════════════════════════════════════════════════════════════════════

interface RoleOption {
  value: string;
  label: string;
  color: string; // Tailwind classes para Badge
  description: string;
}

/**
 * 2026-05-08: Catalogo de roles para mostrar en la tabla.
 *
 * Incluye los 5 ROLES CANONICOS de Patrick (Maestro/Supervisor/Cliente/Tercero)
 * + roles LEGACY como fallback para datos existentes.
 *
 * El render usa `normalizeRole(user.role)` para mapear legacy → canonico
 * y mostrar el badge correcto.
 */
const ROLE_OPTIONS: RoleOption[] = [
  // ── ROLES CANONICOS (Patrick 2026-05-08) ──
  {
    value: "master",
    label: "Maestro",
    color: "bg-violet-100 text-violet-800",
    description: "Usuario clave del cliente. Crea usuarios y les da permisos.",
  },
  {
    value: "admin",
    label: "Maestro (co-admin)",
    color: "bg-violet-100 text-violet-800",
    description: "Co-administrador del tenant.",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    color: "bg-blue-100 text-blue-800",
    description: "Trabajador del cliente. Opera modulos asignados, NO modifica configuraciones.",
  },
  {
    value: "cliente",
    label: "Cliente",
    color: "bg-emerald-100 text-emerald-800",
    description: "Solo visualiza datos asignados.",
  },
  {
    value: "tercero",
    label: "Tercero",
    color: "bg-amber-100 text-amber-800",
    description: "Transportista externo. Visualiza + interactua en modulos asignados.",
  },
  // ── LEGACY (display compatibility — el normalizeRole los mapea a canonicos) ──
  { value: "owner", label: "Maestro [legacy]", color: "bg-violet-100 text-violet-800", description: "Legacy. Mapeado a Maestro." },
  { value: "gerente_operaciones", label: "Supervisor [legacy: Gerente Op]", color: "bg-blue-100 text-blue-800", description: "Legacy. Mapeado a Supervisor." },
  { value: "despachador", label: "Supervisor [legacy: Despachador]", color: "bg-blue-100 text-blue-800", description: "Legacy. Mapeado a Supervisor." },
  { value: "gerente_finanzas", label: "Supervisor [legacy: Gerente Fin]", color: "bg-blue-100 text-blue-800", description: "Legacy." },
  { value: "gerente_flota", label: "Supervisor [legacy: Gerente Flota]", color: "bg-blue-100 text-blue-800", description: "Legacy." },
  { value: "operador_monitoreo", label: "Supervisor [legacy: Op Monitoreo]", color: "bg-blue-100 text-blue-800", description: "Legacy." },
  { value: "conductor", label: "Supervisor [legacy: Conductor]", color: "bg-blue-100 text-blue-800", description: "Legacy." },
  { value: "auditor", label: "Supervisor [legacy: Auditor]", color: "bg-blue-100 text-blue-800", description: "Legacy." },
  { value: "empresa_cliente", label: "Cliente [legacy]", color: "bg-emerald-100 text-emerald-800", description: "Legacy. Mapeado a Cliente." },
  { value: "operador_logistico", label: "Tercero [legacy]", color: "bg-amber-100 text-amber-800", description: "Legacy. Mapeado a Tercero." },
];

const ROLE_BY_VALUE: Record<string, RoleOption> = ROLE_OPTIONS.reduce(
  (acc, role) => ({ ...acc, [role.value]: role }),
  {},
);

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

export function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);

  const { license } = useLicense();
  const { user: currentUser } = useAuth();
  // 2026-05-08: solo el Maestro principal puede crear co-admin
  // Soporta ambos: legacy `owner` y canonico `master`.
  const canCreateAdmin = currentUser?.role === "owner" || currentUser?.role === "master";

  // Modulos activos del tenant — para filtrar permisos en el editor.
  //
  // REGLA DE NEGOCIO (2026-05-14):
  //   El Tenant Master SOLO puede dar a sus sub-usuarios permisos sobre los
  //   módulos que SU PROPIO tenant tiene habilitados. Si el tenant no tiene
  //   Facturación activa, el master no puede otorgar permisos sobre facturas.
  //
  // Fuentes de verdad (en orden de prioridad):
  //   1. license.enabledModules  ← GET /me/license (más fresco, refleja cambios
  //      en tiempo real cuando el Owner activa/desactiva módulos del tenant).
  //   2. currentUser.enabledModules ← lista que vino en el JWT/login.
  //   3. [] si nada disponible → el editor mostrará TODO como fallback seguro
  //      (vale más mostrar de más que bloquear al master por completo).
  const enabledModules: SystemModuleCode[] = (() => {
    if (license?.enabledModules && license.enabledModules.length > 0) {
      return license.enabledModules
        .filter((m) => m.isEnabled)
        .map((m) => m.moduleCode as SystemModuleCode);
    }
    if (currentUser?.enabledModules && currentUser.enabledModules.length > 0) {
      return currentUser.enabledModules as SystemModuleCode[];
    }
    return [];
  })();

  // ── Cargar usuarios ──
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await userService.getAll({ page: 1, pageSize: 100 });
      setUsers(result.items);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setErrorMessage(
        `No se pudo cargar la lista de usuarios (HTTP ${status ?? "?"}). ` +
          "Reintenta o contacta al soporte.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  // ── Abrir dialog para crear ──
  const openCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  // ── Abrir dialog para editar ──
  const openEdit = (user: AuthUser) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  // ── Activar / desactivar ──
  const handleToggleStatus = async (user: AuthUser) => {
    try {
      await userService.setStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setErrorMessage(`No se pudo cambiar el estado (HTTP ${status ?? "?"}).`);
    }
  };

  // ── Eliminar ──
  const handleDelete = async (user: AuthUser) => {
    if (!window.confirm(`Eliminar a ${user.name}? Esta accion es irreversible.`)) return;
    try {
      await userService.delete(user.id);
      await loadUsers();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = (err as Error)?.message ?? "";
      if (status === 422) {
        setErrorMessage("No se puede eliminar al Usuario Maestro del tenant.");
      } else {
        setErrorMessage(`No se pudo eliminar (HTTP ${status ?? "?"}): ${msg}`);
      }
    }
  };

  // ── Reset password ──
  const handleResetPassword = async (user: AuthUser) => {
    if (!window.confirm(`Generar nueva contraseña temporal para ${user.name}?`)) return;
    try {
      const result = await userService.resetPassword(user.id, {
        sendByEmail: true,
        forceChangeOnLogin: true,
      });
      if (result.temporaryPassword) {
        window.alert(
          `Contraseña temporal generada: ${result.temporaryPassword}\n\nCompartela con el usuario por canal seguro. ` +
            "Tambien se envio por email.",
        );
      } else {
        window.alert("Contraseña temporal enviada por email al usuario.");
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setErrorMessage(`No se pudo resetear la contraseña (HTTP ${status ?? "?"}).`);
    }
  };

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════

  // Estado: cargando
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats reales
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminCount = users.filter((u) => u.role === "owner" || u.role === "admin").length;

  // Limites del plan (si /me/license esta disponible)
  const usersLimitCopy = license
    ? `${license.limits.currentUsersCount} / ${license.limits.maxUsers === 0 ? "∞" : license.limits.maxUsers}`
    : `${totalUsers}`;

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{usersLimitCopy}</p>
                <p className="text-sm text-muted-foreground">
                  {license ? "Usuarios usados / limite del plan" : "Total Usuarios"}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
                <p className="text-sm text-muted-foreground">Activos</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{inactiveUsers}</p>
                <p className="text-sm text-muted-foreground">Inactivos</p>
              </div>
              <UserX className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{adminCount}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios del Sistema
              </CardTitle>
              <CardDescription>
                Gestiona los usuarios y sus permisos de acceso
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
              <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                user={editingUser}
                enabledModules={enabledModules}
                canCreateAdmin={canCreateAdmin}
                onSaved={loadUsers}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-30" />
              <p className="mt-2 text-sm">
                {search
                  ? `Ningun usuario coincide con "${search}".`
                  : "Aun no hay usuarios. Crea el primero con el boton de arriba."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Ultimo Acceso</TableHead>
                    <TableHead className="w-16">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => {
                    const role = ROLE_BY_VALUE[user.role] ?? {
                      label: user.role,
                      color: "bg-slate-100 text-slate-800",
                    };
                    // 2026-05-08: soporta ambos legacy (`owner`) y canonico (`master`)
                    const isMaster = user.role === "owner" || user.role === "master";
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={user.avatar} alt={user.name} />
                              <AvatarFallback>
                                {(user.name ?? "?")
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.name}
                                {isMaster && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Maestro
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={role.color}>{role.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge className="bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">
                              <UserX className="h-3 w-3 mr-1" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Intl.DateTimeFormat("es-PE", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(new Date(user.lastLoginAt))
                            : "Nunca"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar (datos / permisos / alcance)
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleResetPassword(user)}>
                                <Key className="h-4 w-4 mr-2" />
                                Restablecer contraseña
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => handleToggleStatus(user)}>
                                {user.isActive ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              {!isMaster && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onSelect={() => handleDelete(user)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
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
  );
}
