/**
 * LicenseBanner — banner persistente arriba del dashboard que muestra:
 *  - Trial activo (azul) con dias restantes.
 *  - Suscripcion proxima a vencer ≤14 dias (amarillo).
 *  - Suscripcion vencida (rojo, bloquea write).
 *  - Tenant suspendido / cancelado (rojo full bloqueo, ya manejado en API client via 401).
 *
 * 2026-05-06: creado para enforcement de licencia en el frontend.
 *
 * Se monta en el dashboard layout: `src/app/(dashboard)/layout.tsx`.
 *
 * Tolera que el endpoint GET /me/license aun no este implementado en el backend
 * — `useLicense` devuelve `null` y este banner no renderiza nada (graceful).
 */

"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, Sparkles, Clock } from "lucide-react";
import { useLicense } from "@/hooks/useLicense";
import { cn } from "@/lib/utils";

export function LicenseBanner() {
  const { license, isLoading, isExpired, isSuspended, isExpiringSoon, daysRemaining } =
    useLicense();

  if (isLoading || !license) return null;

  // Caso 1 — tenant suspendido o cancelado (NO deberia llegar aqui porque el
  // API client ya forzo logout, pero por defensa rendereamos banner informativo)
  if (isSuspended) {
    return (
      <BannerShell variant="critical">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            {license.tenantStatus === "cancelled"
              ? "Cuenta cancelada"
              : "Cuenta suspendida"}
          </p>
          <p className="text-sm opacity-90">
            Contacta al administrador del TMS para reactivar tu cuenta.
          </p>
        </div>
      </BannerShell>
    );
  }

  // Caso 2 — suscripcion vencida (gracia de 7 dias para read-only)
  if (isExpired) {
    return (
      <BannerShell variant="critical">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            Suscripcion vencida hace {Math.abs(daysRemaining)}{" "}
            {Math.abs(daysRemaining) === 1 ? "dia" : "dias"}
          </p>
          <p className="text-sm opacity-90">
            La cuenta esta en modo solo lectura. Renueva tu plan para volver a
            crear, editar y eliminar registros.
          </p>
        </div>
        <Link
          href="/settings/subscription"
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 transition-colors shrink-0"
        >
          Renovar plan
        </Link>
      </BannerShell>
    );
  }

  // Caso 3 — trial activo
  if (license.isTrialActive) {
    return (
      <BannerShell variant="info">
        <Sparkles className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            Trial — {daysRemaining} {daysRemaining === 1 ? "dia restante" : "dias restantes"}
          </p>
          <p className="text-sm opacity-90">
            Estas usando el plan en periodo de prueba. Adquiere una suscripcion
            antes del {license.trialEndDate} para no perder tus datos.
          </p>
        </div>
        <Link
          href="/settings/subscription"
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 transition-colors shrink-0"
        >
          Adquirir plan
        </Link>
      </BannerShell>
    );
  }

  // Caso 4 — suscripcion proxima a vencer
  if (isExpiringSoon) {
    return (
      <BannerShell variant="warning">
        <Clock className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            Tu suscripcion vence en {daysRemaining}{" "}
            {daysRemaining === 1 ? "dia" : "dias"}
          </p>
          <p className="text-sm opacity-90">
            Renueva antes del {license.subscriptionEndDate} para evitar
            interrupciones del servicio.
          </p>
        </div>
        <Link
          href="/settings/subscription"
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 transition-colors shrink-0"
        >
          Renovar
        </Link>
      </BannerShell>
    );
  }

  // Caso 5 — limites del plan al >= 90% (warning blando)
  const limits = license.limits;
  if (limits.usersPercentage >= 90 || limits.vehiclesPercentage >= 90) {
    const overUsers = limits.usersPercentage >= 90;
    const overVehicles = limits.vehiclesPercentage >= 90;
    return (
      <BannerShell variant="warning">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">
            Estas cerca del limite de tu plan
          </p>
          <p className="text-sm opacity-90">
            {overUsers && (
              <span>
                {limits.currentUsersCount} / {limits.maxUsers} usuarios usados ({limits.usersPercentage}%).{" "}
              </span>
            )}
            {overVehicles && (
              <span>
                {limits.currentVehiclesCount} / {limits.maxVehicles} vehiculos ({limits.vehiclesPercentage}%).
              </span>
            )}
          </p>
        </div>
        <Link
          href="/settings/subscription"
          className="rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/30 transition-colors shrink-0"
        >
          Subir de plan
        </Link>
      </BannerShell>
    );
  }

  return null;
}

interface BannerShellProps {
  variant: "info" | "warning" | "critical";
  children: React.ReactNode;
}

function BannerShell({ variant, children }: BannerShellProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 text-white",
        variant === "info" && "bg-blue-600",
        variant === "warning" && "bg-amber-600",
        variant === "critical" && "bg-red-600",
      )}
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}
