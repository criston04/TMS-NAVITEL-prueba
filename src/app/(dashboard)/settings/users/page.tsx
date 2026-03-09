"use client";

import { PageWrapper } from "@/components/page-wrapper";
import { UserManagement } from "@/components/settings";

/**
 * Página standalone de gestión de Usuarios y Roles.
 * Accesible vía /settings/users (ruta directa desde la navegación).
 * Solo visible para tier tenant_admin (Usuario Maestro / Owner).
 */
export default function UsersPage() {
  return (
    <PageWrapper
      title="Usuarios y Roles"
      description="Administra los usuarios de tu empresa, sus roles y permisos"
    >
      <UserManagement />
    </PageWrapper>
  );
}
