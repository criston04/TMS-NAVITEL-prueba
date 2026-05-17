"use client";

/**
 * UserDialog — dialog para CREAR o EDITAR un usuario del tenant.
 *
 * Combina:
 *  - Datos basicos (name, email, password, phone, role)
 *  - PermissionsEditor (custom permissions opcionales)
 *  - ScopeEditor (alcance/visibilidad)
 *
 * Modo create: crea via `userService.create(CreateUserDTO)`
 * Modo edit:   actualiza via `userService.update(id, UpdateUserDTO)` + permissions + scope por separado
 *
 * 2026-05-07: creado para reemplazar el dialog basico de UserManagement.
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, User, Shield, Globe } from "lucide-react";
import { PermissionsEditor } from "./permissions-editor";
import { ScopeEditor } from "./scope-editor";
import { userService } from "@/services/user.service";
import type { AuthUser, UserRole, Permission } from "@/types/auth";
import type { UserScope, SystemModuleCode } from "@/types/platform";

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  category: "master" | "supervisor" | "cliente" | "tercero";
}

/**
 * 2026-05-08: 5 ROLES CANONICOS definidos por el Owner del TMS.
 *
 *   Owner       → platform_owner (NOSOTROS, no se crea desde aqui)
 *   Maestro     → master         (creado por el Owner del TMS, no aqui)
 *   Supervisor  → supervisor     (trabajador del cliente)
 *   Cliente     → cliente        (solo visualiza)
 *   Tercero     → tercero        (transportista externo, opera modulos asignados)
 *
 * Patrick:
 *   - "Maestro - usuario clave del cliente puede crear usuarios y darles permisos"
 *   - "Supervisor - usuario que usaran los trabajadores del cliente
 *      no pueden modificar configuraciones pero si operar en los modulos
 *      que se le asignen"
 *   - "Cliente - solo visualiza"
 *   - "Tercero - solo visualiza y puede interactuar en los modulos
 *      que se le asignen"
 *
 * El Maestro crea los 3 tipos: Supervisor / Cliente / Tercero.
 * El co-admin (`admin`) se mantiene como variante del Maestro pero solo
 * el `master` (Maestro principal) puede crearlo.
 */
const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "supervisor",
    label: "Supervisor",
    category: "supervisor",
    description:
      "Trabajador del cliente. Opera modulos asignados pero NO modifica configuraciones. Sin permisos por defecto — los asignas tu en la pestaña 'Permisos'.",
  },
  {
    value: "cliente",
    label: "Cliente",
    category: "cliente",
    description:
      "Solo visualiza. Acceso de lectura sobre datos que tu le permitas (ej: portal del cliente para ver sus ordenes).",
  },
  {
    value: "tercero",
    label: "Tercero",
    category: "tercero",
    description:
      "Transportista externo. Visualiza Y puede interactuar (crear/editar) en los modulos que le asignes.",
  },
  {
    value: "admin",
    label: "Maestro (co-administrador)",
    category: "master",
    description:
      "Co-administrador del tenant — equivalente al Maestro pero secundario. Solo el Maestro principal puede crearlo.",
  },
];

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si se provee, modo EDITAR. Si null/undefined, modo CREAR. */
  user?: AuthUser | null;
  /** Modulos activos del tenant (para filtrar permisos) */
  enabledModules?: SystemModuleCode[];
  /** Callback tras guardar exitoso */
  onSaved: () => void;
  /** Si el usuario logueado puede crear admins (solo el `owner` del tenant). */
  canCreateAdmin?: boolean;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  enabledModules,
  onSaved,
  canCreateAdmin = false,
}: UserDialogProps) {
  const isEdit = !!user;

  const [tab, setTab] = useState<"basic" | "permissions" | "scope">("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos basicos
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("supervisor");

  // Permisos y scope
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);
  const [scope, setScope] = useState<UserScope>({ type: "all" });

  // Hidratar al abrir en modo edit
  useEffect(() => {
    if (!open) return;
    setError(null);
    setTab("basic");
    if (isEdit && user) {
      setUsername((user as AuthUser & { username?: string }).username ?? "");
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setPassword("");
      setRole(user.role as UserRole);
      setCustomPermissions(user.permissions ?? []);
      setScope(user.scope ?? { type: "all" });
    } else {
      setUsername("");
      setName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("supervisor");
      setCustomPermissions([]);
      setScope({ type: "all" });
    }
  }, [open, isEdit, user]);

  const availableRoles = canCreateAdmin
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((r) => r.value !== "admin");

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (isEdit && user) {
        // EDIT mode: PUT datos basicos + PATCH permisos + PATCH scope
        // Cada uno va a su endpoint dedicado según documentación sección 10.
        await userService.update(user.id, {
          name,
          email,
          phone: phone || undefined,
          role,
        });

        // PATCH /platform/users/:id/permissions (endpoint 6 de la doc)
        const permissionsChanged = JSON.stringify(customPermissions) !== JSON.stringify(user.permissions ?? []);
        if (permissionsChanged) {
          await userService.updatePermissions(user.id, customPermissions.length > 0 ? customPermissions : null);
        }

        // PATCH /platform/users/:id/scope (endpoint 7 de la doc)
        const scopeChanged = JSON.stringify(scope) !== JSON.stringify(user.scope ?? { type: "all" });
        if (scopeChanged) {
          await userService.updateScope(user.id, scope);
        }
      } else {
        // CREATE mode
        if (!username.trim()) {
          setError("El username es obligatorio (es el campo de login).");
          setIsSaving(false);
          return;
        }
        if (password.length < 8) {
          setError("La contraseña temporal debe tener al menos 8 caracteres.");
          setIsSaving(false);
          return;
        }
        await userService.create({
          username: username.trim(),
          name,
          email,
          password,
          phone: phone || undefined,
          role,
          customPermissions: customPermissions.length > 0 ? customPermissions : undefined,
          scope: scope.type !== "all" ? scope : undefined,
          forcePasswordChange: true,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = (err as Error)?.message ?? "Error desconocido";
      if (status === 403) setError("Sin permisos o limite de plan alcanzado.");
      else if (status === 409) setError("Ya existe un usuario con ese email.");
      else if (status === 422) setError(`Validacion: ${msg}`);
      else setError(`Error (HTTP ${status ?? "?"}): ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isBasicComplete =
    name.length > 0 &&
    email.length > 0 &&
    (isEdit || (username.trim().length > 0 && password.length >= 8));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar usuario: ${user?.name}` : "Crear usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza datos basicos, permisos custom y alcance del usuario."
              : "Crea un nuevo subusuario del tenant. Configura sus permisos y alcance ahora o despues."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="basic" className="gap-2">
              <User className="h-4 w-4" /> Datos basicos
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2" disabled={!isBasicComplete}>
              <Shield className="h-4 w-4" />
              Permisos
              {customPermissions.length > 0 && (
                <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs">
                  {customPermissions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="scope" className="gap-2" disabled={!isBasicComplete}>
              <Globe className="h-4 w-4" />
              Alcance
              {scope.type !== "all" && <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs">·</span>}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pt-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="basic" className="space-y-4 mt-0">
              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username de login *</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="juan.perez"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    El usuario usará este nombre + contraseña para iniciar sesión (NO el email).
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Juan Perez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (notificaciones) *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+51 999 888 777"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isEdit && (
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="password">Contraseña temporal *</Label>
                    <Input
                      id="password"
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimo 8 caracteres"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se le pedira al usuario cambiarla en su primer login.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <PermissionsEditor
                value={customPermissions}
                onChange={setCustomPermissions}
                enabledModules={enabledModules}
                role={role}
              />
            </TabsContent>

            <TabsContent value="scope" className="mt-0">
              <ScopeEditor value={scope} onChange={setScope} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isBasicComplete}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
