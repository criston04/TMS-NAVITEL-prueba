"use client";

/**
 * TierGuard — guard cliente que valida la ruta contra el tier/rol del usuario.
 *
 * Reglas (basadas en jerarquia canonica de Patrick, §13 PLATAFORMA.md):
 *
 *   /platform/*       → SOLO `tier === "platform"` (Owner / Platform Admin)
 *   /settings/users   → SOLO Maestro (role: "master" | "owner" | "admin")
 *   /settings/*       → Cualquier tenant_admin o platform
 *   resto             → cualquier usuario autenticado
 *
 * Si un usuario intenta acceder a una ruta no autorizada:
 *  - Muestra un placeholder "Acceso denegado" amigable
 *  - NO redirige (asi el user puede ver que tiene la URL incorrecta sin loop)
 */

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { isMasterUserRole } from "@/types/auth";

interface TierGuardProps {
  children: React.ReactNode;
}

export function TierGuard({ children }: TierGuardProps) {
  const pathname = usePathname();
  const { user, platformUser } = useAuth();

  const isPlatform = !!platformUser;
  const tenantRole = user?.role;

  // ── Rutas /platform/* → solo platform users ──
  if (pathname.startsWith("/platform")) {
    if (!isPlatform) {
      return (
        <AccessDenied
          title="Solo para usuarios de Plataforma"
          description="Este módulo está reservado al Owner y Admins de la plataforma TMS (Navitel). Tu cuenta pertenece a un tenant cliente."
          backTo="/"
          backLabel="Volver a mi panel"
        />
      );
    }
  }

  // ── /settings/users → solo Maestro del tenant ──
  // Un platform_owner NO debería gestionar users del tenant (eso es del Maestro)
  if (pathname === "/settings/users" || pathname.startsWith("/settings/users/")) {
    if (isPlatform) {
      return (
        <AccessDenied
          title="Sección del Maestro del tenant"
          description="Esta pantalla es para que el Maestro de un tenant gestione sus subusuarios. Tú eres usuario de Plataforma — para gestionar admins de Navitel ve a 'Usuarios de Plataforma'."
          backTo="/platform/users"
          backLabel="Ir a Usuarios de Plataforma"
        />
      );
    }
    if (tenantRole && !isMasterUserRole(tenantRole)) {
      return (
        <AccessDenied
          title="Solo el Maestro puede gestionar usuarios"
          description="Necesitas rol Maestro para crear o editar subusuarios. Habla con el administrador de tu empresa."
          backTo="/"
          backLabel="Volver al panel"
        />
      );
    }
  }

  return <>{children}</>;
}

function AccessDenied({
  title,
  description,
  backTo,
  backLabel,
}: {
  title: string;
  description: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <ShieldAlert className="h-10 w-10 text-destructive" />
      </div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="max-w-md text-muted-foreground">{description}</p>
      <Button asChild variant="default" className="mt-2">
        <Link href={backTo}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
      </Button>
    </div>
  );
}
