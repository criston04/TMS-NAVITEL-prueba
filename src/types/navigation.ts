/**
 * Navigation Types - Single source of truth para tipos de navegación
 *
 * Soporta filtrado por permisos, módulos y tier según la jerarquía de 3 niveles.
 */

import { LucideIcon } from "lucide-react";
import type { PermissionResource, PermissionAction, UserTier, AnyRole } from "@/types/auth";
import type { SystemModuleCode } from "@/types/platform";

/**
 * Item de navegación individual
 */
export interface NavItem {
  /** Título del menú */
  title: string;
  /** Ruta */
  href: string;
  /** Ícono */
  icon: LucideIcon;
  /** Badge (ej: contador de pendientes) */
  badge?: string;

  // ── Control de acceso ──

  /** Recurso y acción requeridos para ver este item */
  requiredPermission?: {
    resource: PermissionResource;
    action: PermissionAction;
  };
  /** Módulo del sistema requerido (debe estar habilitado en el tenant) */
  requiredModule?: SystemModuleCode;
  /** Tiers que pueden ver este item. Si no se define, todos los tiers lo ven. */
  allowedTiers?: UserTier[];
  /** Roles específicos que pueden ver este item (override de requiredPermission) */
  allowedRoles?: AnyRole[];
  /** Si es true, solo usuarios de plataforma ven este item */
  platformOnly?: boolean;
}

/**
 * Grupo de navegación con título y items
 * Estructura: OPERACIONES, FINANZAS, MAESTRO, etc.
 */
export interface NavGroup {
  /** Título del grupo (ej: "OPERACIONES") */
  groupTitle: string;
  /** Items dentro del grupo */
  items: NavItem[];
  /** Módulo requerido para mostrar todo el grupo */
  requiredModule?: SystemModuleCode;
  /** Tiers que pueden ver este grupo */
  allowedTiers?: UserTier[];
  /** Si es true, solo usuarios de plataforma ven este grupo */
  platformOnly?: boolean;
}

export interface NavItemProps extends NavItem {
  isCollapsed: boolean;
  isActive: boolean;
  onNavigate?: () => void;
}

export interface NavGroupProps {
  group: NavGroup;
  isCollapsed: boolean;
  isActive: (href: string) => boolean;
}
