/**
 * Navigation Configuration - Configuracion centralizada del menu
 *
 * Cada item y grupo puede tener metadatos de acceso:
 *   - requiredPermission: recurso + acción mínima para ver el item
 *   - requiredModule: módulo que debe estar habilitado en el tenant
 *   - allowedTiers: tiers que pueden ver el item
 *   - platformOnly: solo para usuarios de plataforma
 *
 * El filtrado real se hace en el componente Sidebar usando el AuthContext.
 */

import type { NavGroup } from "@/types/navigation";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  FileText,
  DollarSign,
  Users,
  Box,
  UserCircle,
  Car,
  Building2,
  MapPinned,
  Route,
  Satellite,
  LayoutGrid,
  History,
  TowerControl,
  Wallet,
  BarChart3,
  Navigation,
  Wrench,
  ClipboardList,
  Shield,
  Globe,
  Activity,
} from "lucide-react";

// ════════════════════════════════════════════════════════
// NAVEGACIÓN DEL TENANT (Niveles 2 y 3)
// ════════════════════════════════════════════════════════

export const navigationConfig: NavGroup[] = [
  {
    groupTitle: "OPERACIONES",
    requiredModule: "operations",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        // El dashboard es visible para todos
      },
      {
        title: "Ordenes",
        href: "/orders",
        icon: Package,
        requiredPermission: { resource: "orders", action: "read" },
        requiredModule: "operations",
      },
      {
        title: "Programacion",
        href: "/scheduling",
        icon: CalendarDays,
        requiredPermission: { resource: "scheduling", action: "read" },
        requiredModule: "scheduling",
      },
      {
        title: "Planificador de Rutas",
        href: "/route-planner",
        icon: Navigation,
        requiredPermission: { resource: "route_planner", action: "read" },
        requiredModule: "route_planner",
      },
      {
        title: "Workflows",
        href: "/master/workflows",
        icon: Route,
        requiredPermission: { resource: "workflows", action: "read" },
        requiredModule: "workflows",
      },
      {
        title: "Bitácora",
        href: "/bitacora",
        icon: ClipboardList,
        requiredPermission: { resource: "bitacora", action: "read" },
        requiredModule: "bitacora",
      },
    ],
  },
  {
    groupTitle: "MONITOREO",
    requiredModule: "monitoring",
    items: [
      {
        title: "Torre de Control",
        href: "/monitoring/control-tower",
        icon: TowerControl,
        requiredPermission: { resource: "monitoring_control_tower", action: "read" },
        requiredModule: "monitoring",
      },
      {
        title: "Retransmision",
        href: "/monitoring/retransmission",
        icon: Satellite,
        requiredPermission: { resource: "monitoring_retransmission", action: "read" },
        requiredModule: "monitoring",
      },
      {
        title: "Multiventana",
        href: "/monitoring/multi-window",
        icon: LayoutGrid,
        requiredPermission: { resource: "monitoring_multiwindow", action: "read" },
        requiredModule: "monitoring",
      },
      {
        title: "Rastreo Historico",
        href: "/monitoring/historical",
        icon: History,
        requiredPermission: { resource: "monitoring_historical", action: "read" },
        requiredModule: "monitoring",
      },
    ],
  },
  {
    groupTitle: "FINANZAS",
    requiredModule: "finance",
    items: [
      {
        title: "Centro Financiero",
        href: "/finance",
        icon: Wallet,
        requiredPermission: { resource: "invoices", action: "read" },
        requiredModule: "finance",
      },
      {
        title: "Facturas",
        href: "/invoices",
        icon: FileText,
        requiredPermission: { resource: "invoices", action: "read" },
        requiredModule: "finance",
      },
      {
        title: "Tarifario",
        href: "/pricing",
        icon: DollarSign,
        requiredPermission: { resource: "rates", action: "read" },
        requiredModule: "finance",
      },
    ],
  },
  {
    groupTitle: "REPORTES",
    requiredModule: "reports",
    items: [
      {
        title: "Centro de Reportes",
        href: "/reports",
        icon: BarChart3,
        requiredPermission: { resource: "reports", action: "read" },
        requiredModule: "reports",
      },
    ],
  },
  {
    groupTitle: "MANTENIMIENTO",
    requiredModule: "maintenance",
    items: [
      {
        title: "Mantenimiento",
        href: "/maintenance",
        icon: Wrench,
        requiredPermission: { resource: "work_orders", action: "read" },
        requiredModule: "maintenance",
      },
    ],
  },
  {
    groupTitle: "MAESTRO",
    requiredModule: "master_data",
    items: [
      {
        title: "Clientes",
        href: "/master/customers",
        icon: Users,
        requiredPermission: { resource: "customers", action: "read" },
        requiredModule: "master_data",
      },
      {
        title: "Conductores",
        href: "/master/drivers",
        icon: UserCircle,
        requiredPermission: { resource: "drivers", action: "read" },
        requiredModule: "master_data",
      },
      {
        title: "Vehiculos",
        href: "/master/vehicles",
        icon: Car,
        requiredPermission: { resource: "vehicles", action: "read" },
        requiredModule: "master_data",
      },
      {
        title: "Operadores Logisticos",
        href: "/master/operators",
        icon: Building2,
        requiredPermission: { resource: "operators", action: "read" },
        requiredModule: "master_data",
      },
      {
        title: "Productos",
        href: "/master/products",
        icon: Box,
        requiredPermission: { resource: "products", action: "read" },
        requiredModule: "master_data",
      },
      {
        title: "Geocercas",
        href: "/master/geofences",
        icon: MapPinned,
        requiredPermission: { resource: "geofences", action: "read" },
        requiredModule: "geofences",
      },
    ],
  },
  {
    groupTitle: "CONFIGURACIÓN",
    allowedTiers: ["tenant_admin"],
    items: [
      {
        title: "Usuarios y Roles",
        href: "/settings/users",
        icon: Shield,
        requiredPermission: { resource: "users", action: "read" },
        allowedTiers: ["tenant_admin"],
      },
    ],
  },
];

// ════════════════════════════════════════════════════════
// NAVEGACIÓN DE LA PLATAFORMA (Nivel 1: Owner del TMS)
// ════════════════════════════════════════════════════════

export const platformNavigationConfig: NavGroup[] = [
  {
    groupTitle: "PLATAFORMA",
    platformOnly: true,
    items: [
      {
        title: "Dashboard",
        href: "/platform",
        icon: LayoutDashboard,
        platformOnly: true,
        requiredPermission: { resource: "platform_dashboard", action: "read" },
      },
      {
        title: "Clientes (Tenants)",
        href: "/platform/tenants",
        icon: Building2,
        platformOnly: true,
        requiredPermission: { resource: "platform_tenants", action: "read" },
      },
      {
        title: "Módulos",
        href: "/platform/modules",
        icon: Box,
        platformOnly: true,
        requiredPermission: { resource: "platform_modules", action: "read" },
      },
      {
        title: "Transferencias",
        href: "/platform/transfers",
        icon: Car,
        platformOnly: true,
        requiredPermission: { resource: "platform_transfers", action: "read" },
      },
      {
        title: "Usuarios Plataforma",
        href: "/platform/users",
        icon: Shield,
        platformOnly: true,
        requiredPermission: { resource: "platform_users", action: "read" },
      },
      {
        title: "Actividad Global",
        href: "/platform/activity",
        icon: Activity,
        platformOnly: true,
        requiredPermission: { resource: "platform_dashboard", action: "read" },
      },
    ],
  },
];

// ════════════════════════════════════════════════════════
// HELPERS DE FILTRADO
// ════════════════════════════════════════════════════════

/**
 * Filtra la navegación según el contexto de autenticación.
 * Usado por el componente Sidebar para mostrar solo items accesibles.
 */
export interface NavigationFilterContext {
  role: string;
  tier: string;
  can: (resource: string, action: string) => boolean;
  hasModuleEnabled: (module: string) => boolean;
  isPlatform: boolean;
}

export function filterNavigation(
  groups: NavGroup[],
  ctx: NavigationFilterContext
): NavGroup[] {
  return groups
    .filter((group) => {
      // Filtrar por plataforma
      if (group.platformOnly && !ctx.isPlatform) return false;
      // Filtrar por tier
      if (group.allowedTiers && !group.allowedTiers.includes(ctx.tier as never)) return false;
      // Filtrar por módulo del grupo
      if (group.requiredModule && !ctx.hasModuleEnabled(group.requiredModule)) return false;
      return true;
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        // Filtrar por plataforma
        if (item.platformOnly && !ctx.isPlatform) return false;
        // Filtrar por tier
        if (item.allowedTiers && !item.allowedTiers.includes(ctx.tier as never)) return false;
        // Filtrar por roles específicos
        if (item.allowedRoles && !item.allowedRoles.includes(ctx.role as never)) return false;
        // Filtrar por módulo
        if (item.requiredModule && !ctx.hasModuleEnabled(item.requiredModule)) return false;
        // Filtrar por permiso
        if (item.requiredPermission) {
          return ctx.can(item.requiredPermission.resource, item.requiredPermission.action);
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}