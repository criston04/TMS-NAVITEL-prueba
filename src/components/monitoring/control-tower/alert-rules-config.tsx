"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings2,
  Plus,
  Trash2,
  Zap,
  Shield,
  Timer,
  WifiOff,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Bell,
  Mail,
  Smartphone,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AlertRule, AlertRuleType, AlertSeverity } from "@/types/monitoring";

interface AlertRulesConfigProps {
  rules: AlertRule[];
  onAddRule: (rule: Omit<AlertRule, "id" | "createdAt" | "updatedAt">) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
  onDeleteRule: (ruleId: string) => void;
  className?: string;
}

const RULE_TYPE_CONFIG: Record<AlertRuleType, { icon: React.ReactNode; label: string; description: string }> = {
  speed_limit: {
    icon: <Zap className="h-4 w-4" />,
    label: "Exceso de velocidad",
    description: "Alertar cuando un vehículo supere el límite de velocidad",
  },
  geofence: {
    icon: <Shield className="h-4 w-4" />,
    label: "Geocerca",
    description: "Alertar al entrar o salir de una geocerca",
  },
  stop_duration: {
    icon: <Timer className="h-4 w-4" />,
    label: "Parada excesiva",
    description: "Alertar si un vehículo permanece detenido más del tiempo permitido",
  },
  disconnection: {
    icon: <WifiOff className="h-4 w-4" />,
    label: "Desconexión GPS",
    description: "Alertar cuando un vehículo pierda conexión GPS",
  },
  sos: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: "SOS / Pánico",
    description: "Alertar cuando se active el botón de pánico",
  },
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

/**
 * Configurador de reglas de alerta
 */
export function AlertRulesConfig({
  rules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  className,
}: AlertRulesConfigProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState<AlertRuleType>("speed_limit");
  const [newRuleSeverity, setNewRuleSeverity] = useState<AlertSeverity>("warning");
  const [speedLimit, setSpeedLimit] = useState("80");
  const [maxStopMinutes, setMaxStopMinutes] = useState("30");
  const [maxDisconnectionMinutes, setMaxDisconnectionMinutes] = useState("15");
  const [notifySound, setNotifySound] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [notifySms, setNotifySms] = useState(false);

  const handleAddRule = () => {
    const conditions: AlertRule["conditions"] = {};
    
    switch (newRuleType) {
      case "speed_limit":
        conditions.speedLimit = parseInt(speedLimit) || 80;
        break;
      case "stop_duration":
        conditions.maxStopMinutes = parseInt(maxStopMinutes) || 30;
        break;
      case "disconnection":
        conditions.maxDisconnectionMinutes = parseInt(maxDisconnectionMinutes) || 15;
        break;
    }

    onAddRule({
      name: newRuleName || RULE_TYPE_CONFIG[newRuleType].label,
      type: newRuleType,
      enabled: true,
      severity: newRuleSeverity,
      conditions,
      notifySound,
      notifyEmail,
      notifySms,
    });

    // Reset form
    setNewRuleName("");
    setNewRuleType("speed_limit");
    setNewRuleSeverity("warning");
    setSpeedLimit("80");
    setMaxStopMinutes("30");
    setMaxDisconnectionMinutes("15");
    setIsDialogOpen(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Reglas de alerta</h3>
          <Badge variant="secondary" className="text-xs">
            {rules.length}
          </Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Nueva regla
            </Button>
          </DialogTrigger>
          <DialogContent className="z-[10001]">
            <DialogHeader>
              <DialogTitle>Crear regla de alerta</DialogTitle>
              <DialogDescription>
                Configura una nueva regla para recibir alertas automáticas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Nombre */}
              <div className="space-y-2">
                <Label>Nombre (opcional)</Label>
                <Input
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="Ej: Velocidad máxima carretera"
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de alerta</Label>
                <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as AlertRuleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {RULE_TYPE_CONFIG[newRuleType].description}
                </p>
              </div>

              {/* Condiciones según tipo */}
              {newRuleType === "speed_limit" && (
                <div className="space-y-2">
                  <Label>Límite de velocidad (km/h)</Label>
                  <Input
                    type="number"
                    value={speedLimit}
                    onChange={(e) => setSpeedLimit(e.target.value)}
                    min={10}
                    max={200}
                  />
                </div>
              )}
              {newRuleType === "stop_duration" && (
                <div className="space-y-2">
                  <Label>Duración máxima de parada (minutos)</Label>
                  <Input
                    type="number"
                    value={maxStopMinutes}
                    onChange={(e) => setMaxStopMinutes(e.target.value)}
                    min={1}
                    max={480}
                  />
                </div>
              )}
              {newRuleType === "disconnection" && (
                <div className="space-y-2">
                  <Label>Tiempo máximo sin conexión (minutos)</Label>
                  <Input
                    type="number"
                    value={maxDisconnectionMinutes}
                    onChange={(e) => setMaxDisconnectionMinutes(e.target.value)}
                    min={1}
                    max={120}
                  />
                </div>
              )}

              {/* Severidad */}
              <div className="space-y-2">
                <Label>Severidad</Label>
                <Select value={newRuleSeverity} onValueChange={(v) => setNewRuleSeverity(v as AlertSeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10002]">
                    <SelectItem value="info">Informativa</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Notificaciones */}
              <div className="space-y-3">
                <Label>Canales de notificación</Label>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Volume2 className="h-4 w-4" /> Sonido
                  </span>
                  <Switch checked={notifySound} onCheckedChange={setNotifySound} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" /> Email
                  </span>
                  <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4" /> SMS
                  </span>
                  <Switch checked={notifySms} onCheckedChange={setNotifySms} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRule}>Crear regla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de reglas */}
      <ScrollArea className="max-h-[500px]">
        <div className="space-y-2">
          {rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No hay reglas configuradas</p>
              <p className="text-xs text-muted-foreground">Agrega una regla para recibir alertas automáticas</p>
            </div>
          ) : (
            rules.map((rule) => {
              const typeConfig = RULE_TYPE_CONFIG[rule.type];
              return (
                <div
                  key={rule.id}
                  className={cn(
                    "rounded-lg border p-3 transition-all",
                    rule.enabled ? "bg-card" : "bg-muted/30 opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                        {typeConfig.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{rule.name}</p>
                        <p className="text-[11px] text-muted-foreground">{typeConfig.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-[10px]", SEVERITY_COLORS[rule.severity])}>
                        {rule.severity === "critical" ? "Crítica" : rule.severity === "warning" ? "Advertencia" : "Info"}
                      </Badge>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(checked) => onToggleRule(rule.id, checked)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {/* Condiciones */}
                  <div className="text-xs text-muted-foreground">
                    {rule.conditions.speedLimit && (
                      <span>Velocidad máxima: {rule.conditions.speedLimit} km/h</span>
                    )}
                    {rule.conditions.maxStopMinutes && (
                      <span>Parada máxima: {rule.conditions.maxStopMinutes} min</span>
                    )}
                    {rule.conditions.maxDisconnectionMinutes && (
                      <span>Desconexión máxima: {rule.conditions.maxDisconnectionMinutes} min</span>
                    )}
                    {rule.type === "sos" && <span>Botón de pánico activado</span>}
                    {rule.type === "geofence" && <span>Entrada/salida de geocerca</span>}
                  </div>
                  {/* Canales */}
                  <div className="flex gap-2 mt-1.5">
                    {rule.notifySound && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Volume2 className="h-2.5 w-2.5" /> Sonido
                      </span>
                    )}
                    {rule.notifyEmail && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Mail className="h-2.5 w-2.5" /> Email
                      </span>
                    )}
                    {rule.notifySms && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Smartphone className="h-2.5 w-2.5" /> SMS
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
