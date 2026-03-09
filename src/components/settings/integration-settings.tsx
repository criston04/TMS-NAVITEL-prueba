"use client";

import { useState } from "react";
import {
  Webhook,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Trash2,
  ExternalLink,
  Zap,
  Map,
  CreditCard,
  MessageSquare,
  FileText,
  Truck,
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: "gps" | "payment" | "erp" | "communication" | "maps" | "other";
  status: "connected" | "disconnected" | "error";
  enabled: boolean;
  lastSync?: string;
}

const mockIntegrations: Integration[] = [
  {
    id: "1",
    name: "GPS Tracking Pro",
    description: "Sistema de rastreo GPS en tiempo real",
    icon: Truck,
    category: "gps",
    status: "connected",
    enabled: true,
    lastSync: "Hace 5 minutos",
  },
  {
    id: "2",
    name: "Google Maps Platform",
    description: "Mapas, rutas y geocodificación",
    icon: Map,
    category: "maps",
    status: "connected",
    enabled: true,
    lastSync: "Hace 1 minuto",
  },
  {
    id: "3",
    name: "Stripe",
    description: "Procesamiento de pagos",
    icon: CreditCard,
    category: "payment",
    status: "connected",
    enabled: true,
    lastSync: "Hace 30 minutos",
  },
  {
    id: "4",
    name: "WhatsApp Business",
    description: "Notificaciones por WhatsApp",
    icon: MessageSquare,
    category: "communication",
    status: "disconnected",
    enabled: false,
  },
  {
    id: "5",
    name: "SAP Business One",
    description: "Sistema ERP",
    icon: FileText,
    category: "erp",
    status: "error",
    enabled: true,
    lastSync: "Error de conexión",
  },
  {
    id: "6",
    name: "Zapier",
    description: "Automatización de flujos de trabajo",
    icon: Zap,
    category: "other",
    status: "connected",
    enabled: true,
    lastSync: "Hace 2 horas",
  },
];

const categoryConfig = {
  gps: { label: "GPS", color: "bg-blue-100 text-blue-800" },
  payment: { label: "Pagos", color: "bg-green-100 text-green-800" },
  erp: { label: "ERP", color: "bg-purple-100 text-purple-800" },
  communication: { label: "Comunicación", color: "bg-amber-100 text-amber-800" },
  maps: { label: "Mapas", color: "bg-cyan-100 text-cyan-800" },
  other: { label: "Otro", color: "bg-gray-100 text-gray-800" },
};

const statusConfig = {
  connected: { label: "Conectado", icon: CheckCircle2, color: "text-green-500" },
  disconnected: { label: "Desconectado", icon: XCircle, color: "text-gray-500" },
  error: { label: "Error", icon: XCircle, color: "text-red-500" },
};

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [search, setSearch] = useState("");
  const [configDialog, setConfigDialog] = useState<Integration | null>(null);

  const handleToggle = (id: string, enabled: boolean) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? { ...int, enabled, status: enabled ? "connected" : "disconnected" }
          : int
      )
    );
  };

  const handleSync = (id: string) => {
    console.log("Syncing integration:", id);
    // Aquí iría la lógica de sincronización
  };

  const filtered = integrations.filter((int) =>
    int.name.toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = integrations.filter(
    (int) => int.status === "connected"
  ).length;

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{integrations.length}</p>
                <p className="text-sm text-muted-foreground">Integraciones</p>
              </div>
              <Webhook className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Conectadas</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {integrations.filter((int) => int.status === "error").length}
                </p>
                <p className="text-sm text-muted-foreground">Con Error</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {integrations.filter((int) => !int.enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">Deshabilitadas</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Integraciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Integraciones Disponibles
              </CardTitle>
              <CardDescription>
                Conecta con servicios externos para ampliar funcionalidades
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-48"
                />
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filtered.map((integration) => {
              const status = statusConfig[integration.status];
              const category = categoryConfig[integration.category];
              const StatusIcon = status.icon;
              const IntIcon = integration.icon;

              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <IntIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{integration.name}</p>
                        <Badge className={category.color}>{category.label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {integration.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <span className={`text-sm ${status.color}`}>
                          {status.label}
                        </span>
                        {integration.lastSync && (
                          <span className="text-xs text-muted-foreground">
                            • {integration.lastSync}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(checked) =>
                        handleToggle(integration.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(integration.id)}
                      disabled={!integration.enabled}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfigDialog(integration)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Webhooks
          </CardTitle>
          <CardDescription>
            Recibe notificaciones en tiempo real de eventos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Webhook de Órdenes</p>
                <p className="text-sm text-muted-foreground font-mono">
                  https://api.example.com/webhooks/orders
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">Activo</Badge>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Webhook de Entregas</p>
                <p className="text-sm text-muted-foreground font-mono">
                  https://api.example.com/webhooks/deliveries
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800">Activo</Badge>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          </div>

          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de Configuración */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configurar {configDialog?.name}
            </DialogTitle>
            <DialogDescription>
              Ajusta la configuración de esta integración
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input type="password" value="••••••••••••••••" readOnly />
            </div>
            <div className="space-y-2">
              <Label>URL del Endpoint</Label>
              <Input value="https://api.service.com/v1" readOnly />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Sincronización Automática</Label>
                <p className="text-sm text-muted-foreground">
                  Sincronizar datos cada 15 minutos
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Cancelar
            </Button>
            <Button>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
