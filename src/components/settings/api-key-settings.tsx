"use client";

import { useState } from "react";
import {
  Key,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Shield,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  fullKey?: string;
  scopes: string[];
  createdAt: string;
  lastUsed?: string;
  expiresAt?: string;
  status: "active" | "expired" | "revoked";
}

const mockApiKeys: ApiKey[] = [
  {
    id: "1",
    name: "Producción - App Móvil",
    keyPreview: "sk_live_****...7f3d",
    scopes: ["orders:read", "orders:write", "tracking:read"],
    createdAt: "2024-01-01",
    lastUsed: "2024-01-15T10:30:00",
    status: "active",
  },
  {
    id: "2",
    name: "Desarrollo - Testing",
    keyPreview: "sk_test_****...2a1b",
    scopes: ["orders:read", "orders:write", "tracking:read", "tracking:write", "admin"],
    createdAt: "2024-01-10",
    lastUsed: "2024-01-14T15:45:00",
    status: "active",
  },
  {
    id: "3",
    name: "Integración ERP",
    keyPreview: "sk_live_****...9c4e",
    scopes: ["orders:read", "finance:read"],
    createdAt: "2023-11-01",
    expiresAt: "2024-01-01",
    lastUsed: "2023-12-31T23:59:00",
    status: "expired",
  },
];

const availableScopes = [
  { id: "orders:read", label: "Leer Órdenes", group: "Órdenes" },
  { id: "orders:write", label: "Crear/Editar Órdenes", group: "Órdenes" },
  { id: "tracking:read", label: "Leer Tracking", group: "Tracking" },
  { id: "tracking:write", label: "Actualizar Tracking", group: "Tracking" },
  { id: "vehicles:read", label: "Leer Vehículos", group: "Flota" },
  { id: "vehicles:write", label: "Gestionar Vehículos", group: "Flota" },
  { id: "drivers:read", label: "Leer Conductores", group: "Flota" },
  { id: "drivers:write", label: "Gestionar Conductores", group: "Flota" },
  { id: "finance:read", label: "Leer Finanzas", group: "Finanzas" },
  { id: "finance:write", label: "Gestionar Finanzas", group: "Finanzas" },
  { id: "reports:read", label: "Generar Reportes", group: "Reportes" },
  { id: "admin", label: "Administración Completa", group: "Admin" },
];

const statusConfig = {
  active: { label: "Activa", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  expired: { label: "Expirada", color: "bg-amber-100 text-amber-800", icon: Clock },
  revoked: { label: "Revocada", color: "bg-red-100 text-red-800", icon: AlertTriangle },
};

export function ApiKeySettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(mockApiKeys);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [newKeyForm, setNewKeyForm] = useState({
    name: "",
    scopes: [] as string[],
    expiresIn: "never",
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Aquí podrías agregar un toast de confirmación
  };

  const handleToggleShow = (keyId: string) => {
    setShowKey((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleCreateKey = () => {
    // Simular generación de key
    const newKey = `sk_${newKeyForm.name.includes("test") ? "test" : "live"}_${Math.random().toString(36).substring(2, 15)}`;
    setGeneratedKey(newKey);

    const newApiKey: ApiKey = {
      id: String(apiKeys.length + 1),
      name: newKeyForm.name,
      keyPreview: `${newKey.substring(0, 10)}****...${newKey.substring(newKey.length - 4)}`,
      fullKey: newKey,
      scopes: newKeyForm.scopes,
      createdAt: new Date().toISOString().split("T")[0],
      status: "active",
    };

    setApiKeys((prev) => [...prev, newApiKey]);
    setNewKeyDialog(false);
    setNewKeyForm({ name: "", scopes: [], expiresIn: "never" });
  };

  const handleRevoke = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((key) =>
        key.id === keyId ? { ...key, status: "revoked" as const } : key
      )
    );
  };

  const handleDelete = (keyId: string) => {
    setApiKeys((prev) => prev.filter((key) => key.id !== keyId));
  };

  const handleScopeToggle = (scopeId: string) => {
    setNewKeyForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Info */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Información de Seguridad</AlertTitle>
        <AlertDescription>
          Las API Keys permiten a aplicaciones externas acceder a tu cuenta de forma segura.
          Nunca compartas tus keys y revócalas si sospechas que fueron comprometidas.
        </AlertDescription>
      </Alert>

      {/* Lista de API Keys */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Gestiona las claves de acceso a la API
              </CardDescription>
            </div>
            <Dialog open={newKeyDialog} onOpenChange={setNewKeyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Crear Nueva API Key</DialogTitle>
                  <DialogDescription>
                    Genera una nueva clave de acceso para la API
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Nombre de la Key</Label>
                    <Input
                      id="keyName"
                      value={newKeyForm.name}
                      onChange={(e) =>
                        setNewKeyForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Producción - App Móvil"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Expiración</Label>
                    <Select
                      value={newKeyForm.expiresIn}
                      onValueChange={(value) =>
                        setNewKeyForm((prev) => ({ ...prev, expiresIn: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Nunca expira</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                        <SelectItem value="180">180 días</SelectItem>
                        <SelectItem value="365">1 año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Permisos (Scopes)</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availableScopes.map((scope) => (
                        <div key={scope.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={scope.id}
                            checked={newKeyForm.scopes.includes(scope.id)}
                            onCheckedChange={() => handleScopeToggle(scope.id)}
                          />
                          <Label htmlFor={scope.id} className="text-sm font-normal">
                            {scope.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewKeyDialog(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newKeyForm.name || newKeyForm.scopes.length === 0}
                  >
                    Crear API Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {generatedKey && (
            <Alert className="mb-4">
              <Key className="h-4 w-4" />
              <AlertTitle>¡Nueva API Key Generada!</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Copia esta key ahora. Por seguridad, no podrás verla de nuevo.
                </p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                  <span className="flex-1 break-all">{generatedKey}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(generatedKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGeneratedKey(null)}
                >
                  Entendido
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="hidden md:table-cell">Permisos</TableHead>
                <TableHead className="hidden sm:table-cell">Último Uso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-24">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((apiKey) => {
                const status = statusConfig[apiKey.status];
                const StatusIcon = status.icon;

                return (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{apiKey.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Creada: {apiKey.createdAt}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {showKey[apiKey.id] && apiKey.fullKey
                            ? apiKey.fullKey
                            : apiKey.keyPreview}
                        </code>
                        {apiKey.fullKey && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleShow(apiKey.id)}
                          >
                            {showKey[apiKey.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleCopy(apiKey.fullKey || apiKey.keyPreview)
                          }
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary">
                              {apiKey.scopes.length} permisos
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <ul className="text-xs">
                              {apiKey.scopes.map((scope) => (
                                <li key={scope}>{scope}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {apiKey.status === "active" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRevoke(apiKey.id)}
                            title="Revocar"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(apiKey.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Documentación */}
      <Card>
        <CardHeader>
          <CardTitle>Documentación de la API</CardTitle>
          <CardDescription>
            Aprende a usar la API de TMS NAVITEL
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Guía de Inicio</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Aprende los conceptos básicos de la API
              </p>
              <Button variant="link" className="p-0 h-auto">
                Ver documentación →
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Referencia de Endpoints</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Lista completa de endpoints disponibles
              </p>
              <Button variant="link" className="p-0 h-auto">
                Ver referencia →
              </Button>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Ejemplos de Código</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Ejemplos en varios lenguajes
              </p>
              <Button variant="link" className="p-0 h-auto">
                Ver ejemplos →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
