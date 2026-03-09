"use client";

import { useState } from "react";
import {
  Shield,
  Plus,
  Search,
  Mail,
  Phone,
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
import type { PlatformRole } from "@/types/auth";

// Usuarios de plataforma (mock local)
interface PlatformUserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: PlatformRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

const mockPlatformUsers: PlatformUserItem[] = [
  {
    id: "pu-001",
    name: "Sistema Owner",
    email: "owner@tms-navitel.com",
    phone: "+51 999 000 001",
    role: "platform_owner",
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "pu-002",
    name: "Ana García",
    email: "ana@tms-navitel.com",
    phone: "+51 999 000 002",
    role: "platform_admin",
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
    createdAt: "2024-02-15T00:00:00Z",
  },
  {
    id: "pu-003",
    name: "Carlos Rodríguez",
    email: "carlos@tms-navitel.com",
    phone: "+51 999 000 003",
    role: "platform_admin",
    isActive: true,
    lastLogin: new Date(Date.now() - 172800000).toISOString(),
    createdAt: "2024-03-10T00:00:00Z",
  },
  {
    id: "pu-004",
    name: "Laura Martínez",
    email: "laura@tms-navitel.com",
    role: "platform_admin",
    isActive: false,
    createdAt: "2024-04-01T00:00:00Z",
  },
];

const roleConfig: Record<PlatformRole, { label: string; description: string; variant: "default" | "secondary" | "outline" }> = {
  platform_owner: { label: "Owner", description: "Control total de la plataforma", variant: "default" },
  platform_admin: { label: "Admin", description: "Administración de tenants, módulos y soporte", variant: "secondary" },
};

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformUserItem[]>(mockPlatformUsers);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "platform_admin" as PlatformRole,
    password: "",
  });

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  function handleCreate() {
    const user: PlatformUserItem = {
      id: `pu-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone || undefined,
      role: newUser.role,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    setUsers([...users, user]);
    setCreateOpen(false);
    setNewUser({ name: "", email: "", phone: "", role: "platform_admin", password: "" });
  }

  function handleToggleActive(id: string) {
    setUsers(users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
  }

  return (
    <PageWrapper
      title="Usuarios de Plataforma"
      description="Gestione los usuarios con acceso al panel de administración"
      actions={
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
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nombre Apellido"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
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
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleCreate}
                disabled={!newUser.name || !newUser.email || !newUser.password}
              >
                Crear Usuario
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o rol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead className="w-25">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => {
                const role = roleConfig[user.role];
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </span>
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.variant}>{role.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "outline"}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString("es", {
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
                        {new Date(user.createdAt).toLocaleDateString("es", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleToggleActive(user.id)}
                        disabled={user.role === "platform_owner"}
                      >
                        {user.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

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
