"use client";

/**
 * /settings/subscription — vista de suscripcion del tenant.
 *
 * 2026-05-07: creada para que el LicenseBanner tenga destino al hacer click
 * en "Renovar plan", "Adquirir plan" o "Subir de plan".
 *
 * Muestra:
 *  - Plan actual y dias restantes
 *  - Limites del plan vs uso real (usuarios, vehiculos)
 *  - Modulos activos
 *  - Boton "Contactar para renovar" (mailto al Owner del TMS)
 *
 * Backend correspondiente: GET /me/license (endpoint pendiente — ver
 * `otros/docs-backend/17-plataforma/PLATAFORMA-BACKEND-HANDOFF.md` U10).
 *
 * Si el endpoint no responde (404), se muestra un fallback con la informacion
 * conocida del usuario logueado.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Users,
  Truck,
  Layers,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { SYSTEM_MODULES } from "@/types/platform";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
  custom: "Custom",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-slate-100 text-slate-800",
  professional: "bg-blue-100 text-blue-800",
  enterprise: "bg-purple-100 text-purple-800",
  custom: "bg-amber-100 text-amber-800",
};

export default function SubscriptionPage() {
  const { license, isLoading, isExpired, isSuspended, isExpiringSoon, daysRemaining } =
    useLicense();
  const { user } = useAuth();

  const modulesById = useMemo(() => {
    const map = new Map<string, (typeof SYSTEM_MODULES)[number]>();
    SYSTEM_MODULES.forEach((m) => map.set(m.code, m));
    return map;
  }, []);

  const activeModules = useMemo(() => {
    if (license?.enabledModules) {
      return license.enabledModules
        .filter((m) => m.isEnabled)
        .map((m) => modulesById.get(m.moduleCode))
        .filter(Boolean) as Array<(typeof SYSTEM_MODULES)[number]>;
    }
    if (user?.enabledModules) {
      return user.enabledModules
        .map((c) => modulesById.get(c))
        .filter(Boolean) as Array<(typeof SYSTEM_MODULES)[number]>;
    }
    return [];
  }, [license, user, modulesById]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Si el endpoint /me/license no esta implementado, mostrar fallback
  if (!license) {
    return (
      <div className="container max-w-5xl py-8 space-y-6">
        <BackButton />
        <h1 className="text-2xl font-bold">Mi Suscripcion</h1>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informacion de suscripcion no disponible</AlertTitle>
          <AlertDescription>
            El endpoint <code>GET /me/license</code> aun no esta implementado en el
            backend. Contacta al equipo administrador del TMS para conocer el estado
            de tu suscripcion.
          </AlertDescription>
        </Alert>
        <ContactBlock />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <BackButton />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi Suscripcion</h1>
          <p className="text-muted-foreground">
            Estado actual de tu cuenta y limites del plan.
          </p>
        </div>
        <Badge className={cn("text-sm py-1 px-3", PLAN_COLORS[license.plan] ?? "")}>
          Plan {PLAN_LABELS[license.plan] ?? license.plan}
        </Badge>
      </div>

      {/* Estado critico al tope */}
      {isSuspended && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cuenta {license.tenantStatus === "cancelled" ? "cancelada" : "suspendida"}</AlertTitle>
          <AlertDescription>
            Contacta al administrador del TMS para reactivar tu cuenta.
          </AlertDescription>
        </Alert>
      )}

      {isExpired && !isSuspended && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            Suscripcion vencida hace {Math.abs(daysRemaining)}{" "}
            {Math.abs(daysRemaining) === 1 ? "dia" : "dias"}
          </AlertTitle>
          <AlertDescription>
            La cuenta esta en modo solo lectura. Renueva tu plan para volver a operar
            normalmente.
          </AlertDescription>
        </Alert>
      )}

      {!isExpired && !isSuspended && license.isTrialActive && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle>Periodo de prueba</AlertTitle>
          <AlertDescription>
            Estas usando el TMS en periodo de prueba. Quedan {daysRemaining} dias hasta el{" "}
            {license.trialEndDate}. Adquiere un plan antes para no perder tus datos.
          </AlertDescription>
        </Alert>
      )}

      {!isExpired && !isSuspended && !license.isTrialActive && isExpiringSoon && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Tu suscripcion vence pronto</AlertTitle>
          <AlertDescription>
            Quedan {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"} hasta el{" "}
            {license.subscriptionEndDate}. Renueva para evitar interrupciones.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de informacion */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Vencimiento */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Vencimiento</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {license.subscriptionEndDate ?? "Sin vencimiento"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {license.subscriptionEndDate
                ? `${daysRemaining} dias restantes`
                : "Plan custom sin fecha"}
            </p>
          </CardContent>
        </Card>

        {/* Inicio */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Inicio del plan</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{license.subscriptionStartDate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Plan {PLAN_LABELS[license.plan] ?? license.plan}
            </p>
          </CardContent>
        </Card>

        {/* Estado */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Estado</CardTitle>
              {isExpired || isSuspended ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold capitalize",
              isExpired || isSuspended ? "text-red-600" : "text-green-600")}>
              {license.tenantStatus}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {license.isTrialActive ? "En periodo de prueba" : "Plan activo"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Limites del plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Limites del plan
          </CardTitle>
          <CardDescription>Uso actual vs limite contratado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LimitRow
            icon={<Users className="h-4 w-4" />}
            label="Usuarios"
            current={license.limits.currentUsersCount}
            max={license.limits.maxUsers}
            percentage={license.limits.usersPercentage}
          />
          <LimitRow
            icon={<Truck className="h-4 w-4" />}
            label="Vehiculos"
            current={license.limits.currentVehiclesCount}
            max={license.limits.maxVehicles}
            percentage={license.limits.vehiclesPercentage}
          />
        </CardContent>
      </Card>

      {/* Modulos activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Modulos activos en tu plan
          </CardTitle>
          <CardDescription>
            {activeModules.length} modulos contratados. Para agregar mas, contacta al
            equipo de administracion del TMS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay modulos activados.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {activeModules.map((m) => (
                <div
                  key={m.code}
                  className="flex items-center gap-3 rounded-md border bg-card p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.category}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactBlock />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════

function LimitRow({
  icon,
  label,
  current,
  max,
  percentage,
}: {
  icon: React.ReactNode;
  label: string;
  current: number;
  max: number;
  percentage: number;
}) {
  const isUnlimited = max === 0;
  const isCritical = percentage >= 90;
  const isWarning = percentage >= 75 && percentage < 90;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </div>
        <div className="text-sm">
          <span className={cn("font-bold", isCritical && "text-red-600", isWarning && "text-amber-600")}>
            {current}
          </span>{" "}
          / <span className="text-muted-foreground">{isUnlimited ? "Ilimitado" : max}</span>
        </div>
      </div>
      {!isUnlimited && (
        <Progress
          value={percentage}
          className={cn(
            "h-2",
            isCritical && "[&>div]:bg-red-500",
            isWarning && "[&>div]:bg-amber-500",
          )}
        />
      )}
    </div>
  );
}

function BackButton() {
  return (
    <Link href="/settings">
      <Button variant="ghost" size="sm" className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Configuracion
      </Button>
    </Link>
  );
}

function ContactBlock() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Renovar / cambiar de plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Para renovar tu suscripcion, cambiar de plan o agregar mas modulos, contacta al
          equipo administrador del TMS.
        </p>
        <Button asChild>
          <a href="mailto:soporte@navitel.com.pe?subject=Renovacion%20de%20plan%20TMS">
            <Mail className="h-4 w-4 mr-2" />
            Contactar al equipo
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
