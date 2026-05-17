/**
 * useLicense — hook que expone el estado de la licencia del tenant logueado.
 *
 * Hace poll cada 5 minutos a GET /me/license. Tolerante a 404 (endpoint
 * pendiente en el backend) — devuelve `null` y deja que la UI se renderice
 * sin enforcement.
 *
 * 2026-05-06: creado para LicenseBanner + bloqueo de UI cuando suscripcion
 * vence o tenant esta suspendido.
 *
 * Uso:
 * ```tsx
 * const { license, isLoading, isExpired, isSuspended, isExpiringSoon, daysRemaining } = useLicense();
 * ```
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { userService, type TenantLicenseStatus } from "@/services/user.service";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos

interface UseLicenseResult {
  license: TenantLicenseStatus | null;
  isLoading: boolean;
  /** True si la suscripcion vencio (subscription_end_date < hoy). */
  isExpired: boolean;
  /** True si tenant.status es 'suspended' o 'cancelled'. */
  isSuspended: boolean;
  /** True si la suscripcion vence en <= 14 dias. */
  isExpiringSoon: boolean;
  /** Dias restantes de la suscripcion (negativo si vencio). */
  daysRemaining: number;
  /** Forzar re-fetch inmediato. */
  refresh: () => Promise<void>;
}

export function useLicense(): UseLicenseResult {
  const [license, setLicense] = useState<TenantLicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLicense = useCallback(async () => {
    try {
      const result = await userService.getLicense();
      setLicense(result);
    } catch (err) {
      // No-op: getLicense() ya tolera 404 internamente.
      // Si fue un 401 / red caida, mantenemos el ultimo state conocido.
      if (process.env.NODE_ENV === "development") {
        console.warn("[useLicense] error obteniendo licencia:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLicense();

    intervalRef.current = setInterval(() => {
      fetchLicense();
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLicense]);

  // Si el endpoint aun no esta implementado, devolver values por defecto seguros
  // (sin enforcement) — la UI NO bloquea hasta que el backend exponga /me/license.
  const isExpired = license?.isExpired ?? false;
  const isSuspended =
    license?.tenantStatus === "suspended" || license?.tenantStatus === "cancelled";
  const isExpiringSoon = license?.isExpiringSoon ?? false;
  const daysRemaining = license?.daysRemaining ?? 0;

  return {
    license,
    isLoading,
    isExpired,
    isSuspended,
    isExpiringSoon,
    daysRemaining,
    refresh: fetchLicense,
  };
}
