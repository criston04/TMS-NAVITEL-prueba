"use client";

/**
 * RenewSubscriptionDialog — dialog para renovar / extender la suscripcion
 * de un tenant. Lo usa el Platform Owner desde /platform/tenants/[id].
 *
 * 2026-05-07: creado para cumplir el requisito de renovacion mensual / por
 * fechas. El usuario explicitamente pidio:
 *   "el tema de la suscripcion no veo que pueda renovarlo mensual o por
 *    fechas todo eso contemplaste?"
 *
 * Endpoint: POST /platform/tenants/:id/renew (pendiente de backend, ver
 * docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md).
 *
 * Modos:
 *  - "extend": agregar 1/3/6/12/24 meses a la suscripcion actual.
 *  - "set_date": establecer fecha exacta de vencimiento.
 *
 * Tambien permite cambiar plan + limites en la misma operacion.
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CalendarPlus,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { tenantService } from "@/services/platform.service";
import type {
  Tenant,
  RenewSubscriptionDTO,
  SubscriptionPlan,
} from "@/types/platform";
import { cn } from "@/lib/utils";

interface RenewSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant;
  onRenewed: () => void;
}

const PRESET_MONTHS: Array<{ value: 1 | 3 | 6 | 12 | 24; label: string; popular?: boolean }> = [
  { value: 1, label: "1 mes" },
  { value: 3, label: "3 meses" },
  { value: 6, label: "6 meses" },
  { value: 12, label: "1 año", popular: true },
  { value: 24, label: "2 años" },
];

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  basic: "Basic",
  professional: "Professional",
  enterprise: "Enterprise",
  custom: "Custom",
};

// Helpers de fecha — sumar meses preservando dia (con clamp si Feb)
function addMonths(dateIso: string | undefined, months: number): string {
  const baseDate = dateIso ? new Date(dateIso) : new Date();
  // Si la fecha base ya paso, partir de hoy (no extender una fecha vencida)
  const startDate = baseDate.getTime() < Date.now() ? new Date() : baseDate;
  const result = new Date(startDate);
  result.setMonth(result.getMonth() + months);
  return result.toISOString().slice(0, 10);
}

function formatDateEs(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysRemaining(iso: string | undefined | null): number {
  if (!iso) return Infinity;
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════════════════════════════════════════

export function RenewSubscriptionDialog({
  open,
  onOpenChange,
  tenant,
  onRenewed,
}: RenewSubscriptionDialogProps) {
  const [tab, setTab] = useState<"extend" | "set_date">("extend");
  const [selectedMonths, setSelectedMonths] = useState<1 | 3 | 6 | 12 | 24>(12);
  const [customEndDate, setCustomEndDate] = useState("");
  const [changePlan, setChangePlan] = useState(false);
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>(tenant.plan);
  const [changeLimits, setChangeLimits] = useState(false);
  const [newMaxUsers, setNewMaxUsers] = useState(tenant.maxUsers);
  const [newMaxVehicles, setNewMaxVehicles] = useState(tenant.maxVehicles);
  const [paymentReference, setPaymentReference] = useState("");
  const [notifyMasterUser, setNotifyMasterUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setTab("extend");
    setSelectedMonths(12);
    // Default custom date = hoy + 12 meses
    setCustomEndDate(addMonths(undefined, 12));
    setChangePlan(false);
    setNewPlan(tenant.plan);
    setChangeLimits(false);
    setNewMaxUsers(tenant.maxUsers);
    setNewMaxVehicles(tenant.maxVehicles);
    setPaymentReference("");
    setNotifyMasterUser(true);
    setError(null);
  }, [open, tenant]);

  // Calcular nueva fecha de vencimiento (preview)
  const previewEndDate = useMemo(() => {
    if (tab === "set_date") return customEndDate;
    return addMonths(tenant.subscriptionEndDate, selectedMonths);
  }, [tab, selectedMonths, customEndDate, tenant.subscriptionEndDate]);

  const previewDaysRemaining = daysRemaining(previewEndDate);
  const currentDaysRemaining = daysRemaining(tenant.subscriptionEndDate);

  // Validacion
  const isValid = useMemo(() => {
    if (tab === "set_date") {
      if (!customEndDate) return false;
      const target = new Date(customEndDate).getTime();
      if (target <= Date.now()) return false; // No aceptar fecha pasada
    }
    return true;
  }, [tab, customEndDate]);

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSaving(true);
    setError(null);
    try {
      const dto: RenewSubscriptionDTO = {
        mode: tab,
        ...(tab === "extend" && { months: selectedMonths }),
        ...(tab === "set_date" && { customEndDate }),
        ...(changePlan && { plan: newPlan }),
        ...(changeLimits && { maxUsers: newMaxUsers, maxVehicles: newMaxVehicles }),
        ...(paymentReference && { paymentReference }),
        notifyMasterUser,
      };
      await tenantService.renew(tenant.id, dto);
      onRenewed();
      onOpenChange(false);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const msg = (err as Error)?.message ?? "Error desconocido";
      if (status === 404) {
        setError(
          "El endpoint POST /platform/tenants/:id/renew aun no esta implementado en el backend. " +
            "Ver docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md.",
        );
      } else if (status === 422) {
        setError(`Validacion: ${msg}`);
      } else {
        setError(`Error (HTTP ${status ?? "?"}): ${msg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isExpiring = currentDaysRemaining <= 14 && currentDaysRemaining >= 0;
  const isExpired = currentDaysRemaining < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Renovar suscripcion
          </DialogTitle>
          <DialogDescription>
            Extiende o establece una nueva fecha de vencimiento para{" "}
            <strong>{tenant.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Estado actual */}
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Plan actual</span>
            <Badge variant="secondary">{PLAN_LABELS[tenant.plan]}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Vence
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                isExpired && "text-red-600",
                isExpiring && "text-amber-600",
              )}
            >
              {formatDateEs(tenant.subscriptionEndDate)}
              {isExpired && (
                <span className="ml-2 text-xs">(vencido hace {Math.abs(currentDaysRemaining)} dias)</span>
              )}
              {isExpiring && !isExpired && (
                <span className="ml-2 text-xs">(en {currentDaysRemaining} dias)</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Limites del plan</span>
            <span className="text-sm">
              {tenant.maxUsers === 0 ? "∞" : tenant.maxUsers} usuarios ·{" "}
              {tenant.maxVehicles === 0 ? "∞" : tenant.maxVehicles} vehiculos
            </span>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tabs: Extender vs Fecha exacta */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as "extend" | "set_date")}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="extend" className="gap-2">
              <Clock className="h-4 w-4" /> Extender por meses
            </TabsTrigger>
            <TabsTrigger value="set_date" className="gap-2">
              <Calendar className="h-4 w-4" /> Fecha exacta
            </TabsTrigger>
          </TabsList>

          {/* MODO 1: Extender por meses */}
          <TabsContent value="extend" className="space-y-3 pt-4">
            <Label>¿Cuantos meses quieres extender?</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_MONTHS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSelectedMonths(preset.value)}
                  className={cn(
                    "relative rounded-md border p-3 text-center transition-colors",
                    selectedMonths === preset.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted",
                  )}
                >
                  {preset.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Popular
                    </span>
                  )}
                  <div className="font-semibold">{preset.label}</div>
                  {selectedMonths === preset.value && (
                    <Check className="absolute top-1 right-1 h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {tenant.subscriptionEndDate &&
              new Date(tenant.subscriptionEndDate).getTime() > Date.now() ? (
                <>Se sumara {selectedMonths} meses a la fecha actual de vencimiento.</>
              ) : (
                <>La suscripcion {isExpired ? "vencida" : "actual"} se renovara desde HOY por {selectedMonths} meses.</>
              )}
            </p>
          </TabsContent>

          {/* MODO 2: Fecha exacta */}
          <TabsContent value="set_date" className="space-y-3 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customEndDate">Nueva fecha de vencimiento</Label>
              <Input
                id="customEndDate"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-xs text-muted-foreground">
                La nueva fecha SOBRESCRIBE la actual. Util para custom plans o ajustes.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Preview de la nueva fecha */}
        {isValid && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between gap-2">
                <span>Nueva fecha de vencimiento:</span>
                <strong>{formatDateEs(previewEndDate)}</strong>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {previewDaysRemaining} dias desde hoy
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Opciones avanzadas */}
        <div className="space-y-3 border-t pt-4">
          {/* Cambiar plan */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={changePlan} onCheckedChange={(v) => setChangePlan(!!v)} />
            <span className="text-sm">Cambiar plan junto con la renovacion</span>
          </label>
          {changePlan && (
            <div className="ml-6 space-y-2">
              <Label htmlFor="newPlan">Nuevo plan</Label>
              <Select value={newPlan} onValueChange={(v) => setNewPlan(v as SubscriptionPlan)}>
                <SelectTrigger id="newPlan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cambiar limites */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={changeLimits} onCheckedChange={(v) => setChangeLimits(!!v)} />
            <span className="text-sm">Actualizar limites del plan</span>
          </label>
          {changeLimits && (
            <div className="ml-6 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="newMaxUsers" className="text-xs">
                  Max usuarios
                </Label>
                <Input
                  id="newMaxUsers"
                  type="number"
                  min={0}
                  value={newMaxUsers}
                  onChange={(e) => setNewMaxUsers(Number(e.target.value))}
                />
                <p className="text-[10px] text-muted-foreground">0 = ilimitado</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="newMaxVehicles" className="text-xs">
                  Max vehiculos
                </Label>
                <Input
                  id="newMaxVehicles"
                  type="number"
                  min={0}
                  value={newMaxVehicles}
                  onChange={(e) => setNewMaxVehicles(Number(e.target.value))}
                />
                <p className="text-[10px] text-muted-foreground">0 = ilimitado</p>
              </div>
            </div>
          )}

          {/* Referencia de pago */}
          <div className="space-y-1">
            <Label htmlFor="paymentRef" className="text-xs">
              Referencia de pago / factura (opcional)
            </Label>
            <Input
              id="paymentRef"
              placeholder="FAC-2026-001 / Transfer #12345"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Se guarda en el log de actividad para auditoria.
            </p>
          </div>

          {/* Notificar */}
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={notifyMasterUser} onCheckedChange={(v) => setNotifyMasterUser(!!v)} />
            <span className="text-sm">
              Notificar al usuario maestro por email ({tenant.masterUserEmail ?? "sin email"})
            </span>
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
            {isExpired ? "Reactivar y renovar" : "Renovar suscripcion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
