"use client";

/**
 * PermissionsEditor — matriz de permisos custom por usuario.
 *
 * 2026-05-07: creado para que un Tenant Admin pueda customizar PERMISOS
 * GRANULARES de un subusuario, sobreescribiendo los defaults del rol.
 *
 * Cumple el requisito explicito del usuario:
 *   "cada entidad que usara nuestro tms podra crear usuarios y ojo dar
 *    permiso a sus usuario sobre los modulos a que el mismo tenga acceso"
 *
 * Reglas:
 *  - Filtra por `enabledModules` del tenant (si se proveen). El Tenant Admin
 *    NO puede dar permisos sobre modulos que su tenant NO tiene activos.
 *  - Los recursos `platform_*` NUNCA aparecen aqui (son del Owner del TMS).
 *  - Los recursos `roles`, `audit_log`, `subscription`, `billing` solo
 *    aparecen para el rol `owner` del tenant (no para subusuarios).
 *
 * Backend correspondiente: `PATCH /users/:id/permissions`
 *  (ver `userService.updatePermissions` y handoff seccion U6).
 */

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type {
  Permission,
  PermissionResource,
  PermissionAction,
  UserRole,
} from "@/types/auth";
import type { SystemModuleCode } from "@/types/platform";
import { DEFAULT_ROLES } from "@/types/auth";

// ════════════════════════════════════════════════════════════════════════════
//  Catalogo de resources agrupados por categoria, con su modulo asociado
// ════════════════════════════════════════════════════════════════════════════

type ResourceCategory =
  | "operations"
  | "monitoring"
  | "finance"
  | "maintenance"
  | "master"
  | "reports"
  | "notifications"
  | "settings";

interface ResourceMeta {
  resource: PermissionResource;
  label: string;
  /** Modulo del sistema al que pertenece. Si null, no se filtra por enabledModules. */
  module: SystemModuleCode | null;
  category: ResourceCategory;
  /** Acciones disponibles para este recurso (subset de PermissionAction). */
  availableActions: readonly PermissionAction[];
}

const ALL_ACTIONS: readonly PermissionAction[] = [
  "create",
  "read",
  "update",
  "delete",
  "export",
  "import",
  "approve",
  "assign",
] as const;

const CRUD: readonly PermissionAction[] = ["create", "read", "update", "delete"] as const;
const READ_ONLY: readonly PermissionAction[] = ["read"] as const;
const CRUD_EXPORT: readonly PermissionAction[] = ["create", "read", "update", "delete", "export"] as const;

// 2026-05-14: alineado con el catalogo REAL del backend (`data_seeds.md`).
// El backend solo conoce estos codigos en `system_modules`:
//   dashboard, orders, scheduling, route_planner, monitoring, maintenance,
//   finance, reports, notifications, master_data, workflows, bitacora,
//   settings, platform
//
// Los recursos individuales del frontend (customers, drivers, invoices, etc.)
// se mapean al MODULO AGREGADO del backend que los cubre:
//   - Maestros (customers, drivers, vehicles, etc.)  → "master_data"
//   - Finanzas (invoices, payments, costs, etc.)     → "finance"
//   - Monitoreo (control_tower, retransmision, etc.) → "monitoring"
//   - Alertas / Incidencias                          → "monitoring" / "orders"
//   - Integraciones                                  → null (sin filtro)
const RESOURCE_CATALOG: readonly ResourceMeta[] = [
  // OPERATIONS
  { resource: "orders", label: "Ordenes", module: "orders", category: "operations", availableActions: [...CRUD, "approve", "assign", "export", "import"] },
  { resource: "scheduling", label: "Programacion", module: "scheduling", category: "operations", availableActions: [...CRUD, "assign"] },
  { resource: "workflows", label: "Workflows", module: "workflows", category: "operations", availableActions: CRUD },
  { resource: "incidents", label: "Incidencias", module: "orders", category: "operations", availableActions: [...CRUD, "approve"] }, // backend no tiene `incidents` → bajo orders
  { resource: "bitacora", label: "Bitacora", module: "bitacora", category: "operations", availableActions: [...CRUD, "approve"] },
  { resource: "route_planner", label: "Planificador de Rutas", module: "route_planner", category: "operations", availableActions: CRUD },

  // MONITORING
  { resource: "monitoring_control_tower", label: "Torre de Control", module: "monitoring", category: "monitoring", availableActions: ["read", "update"] },
  { resource: "monitoring_retransmission", label: "Retransmision", module: "monitoring", category: "monitoring", availableActions: ["create", "read", "update"] },
  { resource: "monitoring_historical", label: "Historico GPS", module: "monitoring", category: "monitoring", availableActions: ["read", "export"] },
  { resource: "monitoring_multiwindow", label: "Multiventana", module: "monitoring", category: "monitoring", availableActions: ["read", "create"] },
  { resource: "monitoring_alerts", label: "Alertas", module: "monitoring", category: "monitoring", availableActions: [...CRUD, "approve"] }, // backend no tiene `alerts` → bajo monitoring

  // FINANCE — todos mapean a "finance" (modulo agregado del backend)
  { resource: "invoices", label: "Facturas", module: "finance", category: "finance", availableActions: [...CRUD_EXPORT, "approve"] },
  { resource: "payments", label: "Cobros y Pagos", module: "finance", category: "finance", availableActions: CRUD_EXPORT },
  { resource: "costs", label: "Control de Costos", module: "finance", category: "finance", availableActions: CRUD },
  { resource: "rates", label: "Tarifario", module: "finance", category: "finance", availableActions: CRUD },
  { resource: "finance_reports", label: "Reportes Financieros", module: "finance", category: "finance", availableActions: ["read", "export"] },
  { resource: "settlements", label: "Liquidaciones", module: "finance", category: "finance", availableActions: [...CRUD, "approve"] },

  // MAINTENANCE
  { resource: "work_orders", label: "Ordenes de Trabajo", module: "maintenance", category: "maintenance", availableActions: [...CRUD, "approve"] },
  { resource: "maintenance_schedules", label: "Cronogramas", module: "maintenance", category: "maintenance", availableActions: CRUD },
  { resource: "inspections", label: "Inspecciones", module: "maintenance", category: "maintenance", availableActions: CRUD },
  { resource: "parts_inventory", label: "Inventario Repuestos", module: "maintenance", category: "maintenance", availableActions: [...CRUD, "import", "export"] },
  { resource: "workshops", label: "Talleres", module: "maintenance", category: "maintenance", availableActions: CRUD },
  { resource: "breakdowns", label: "Averias", module: "maintenance", category: "maintenance", availableActions: CRUD },

  // MASTER DATA — todos mapean a "master_data" (modulo agregado del backend)
  { resource: "customers", label: "Clientes", module: "master_data", category: "master", availableActions: [...CRUD, "import", "export"] },
  { resource: "drivers", label: "Conductores", module: "master_data", category: "master", availableActions: [...CRUD, "import", "export"] },
  { resource: "vehicles", label: "Vehiculos", module: "master_data", category: "master", availableActions: [...CRUD, "import", "export"] },
  { resource: "operators", label: "Operadores Logisticos", module: "master_data", category: "master", availableActions: CRUD },
  { resource: "products", label: "Productos", module: "master_data", category: "master", availableActions: [...CRUD, "import", "export"] },
  { resource: "geofences", label: "Geocercas", module: "master_data", category: "master", availableActions: CRUD },
  { resource: "assignments", label: "Asignaciones", module: null, category: "master", availableActions: CRUD },

  // REPORTS
  { resource: "reports", label: "Centro de Reportes", module: "reports", category: "reports", availableActions: ["read", "create", "export"] },
  { resource: "report_schedules", label: "Reportes Programados", module: "reports", category: "reports", availableActions: CRUD },

  // NOTIFICATIONS
  { resource: "notifications", label: "Notificaciones", module: "notifications", category: "notifications", availableActions: ["read", "update"] },
  { resource: "notification_templates", label: "Plantillas", module: "notifications", category: "notifications", availableActions: CRUD },

  // SETTINGS — solo aparece para tenant_admin (owner/admin)
  { resource: "settings_general", label: "Empresa (datos generales)", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_operations", label: "Configuracion Operaciones", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_fleet", label: "Configuracion Flota", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_finance", label: "Configuracion Finanzas", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_notifications", label: "Configuracion Notificaciones", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_security", label: "Seguridad", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "settings_appearance", label: "Apariencia", module: null, category: "settings", availableActions: ["read", "update"] },
  { resource: "integrations", label: "Integraciones", module: null, category: "settings", availableActions: CRUD }, // backend no tiene `integrations` → sin filtro
  { resource: "audit_log", label: "Log de Auditoria", module: null, category: "settings", availableActions: ["read", "export"] },
] as const;

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  operations: "Operaciones",
  monitoring: "Monitoreo",
  finance: "Finanzas",
  maintenance: "Mantenimiento",
  master: "Datos Maestros",
  reports: "Reportes",
  notifications: "Notificaciones",
  settings: "Configuracion",
};

const ACTION_LABELS: Record<PermissionAction, string> = {
  create: "Crear",
  read: "Leer",
  update: "Editar",
  delete: "Eliminar",
  export: "Exportar",
  import: "Importar",
  approve: "Aprobar",
  assign: "Asignar",
};

// ════════════════════════════════════════════════════════════════════════════
//  COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

interface PermissionsEditorProps {
  /** Permisos actuales del usuario (los del backend) */
  value: Permission[];
  /** Callback cuando cambian los permisos */
  onChange: (permissions: Permission[]) => void;
  /** Modulos activos del tenant (para filtrar). Si es vacio o undefined, NO filtra. */
  enabledModules?: SystemModuleCode[];
  /** Rol del usuario (para mostrar comparacion con permisos default del rol). */
  role?: UserRole;
  /** Modo solo lectura (para visualizar permisos sin editar). */
  readOnly?: boolean;
}

export function PermissionsEditor({
  value,
  onChange,
  enabledModules,
  role,
  readOnly = false,
}: PermissionsEditorProps) {
  const [filterEnabled, setFilterEnabled] = useState(true);

  // Map: resource → Set de actions seleccionadas
  const permissionsMap = useMemo(() => {
    const map = new Map<PermissionResource, Set<PermissionAction>>();
    value.forEach((p) => {
      map.set(p.resource, new Set(p.actions));
    });
    return map;
  }, [value]);

  // Default permissions del rol — para mostrar como comparacion
  const defaultPermissions = useMemo(() => {
    if (!role) return new Map<PermissionResource, Set<PermissionAction>>();
    const def = DEFAULT_ROLES.find((r) => r.code === role);
    const map = new Map<PermissionResource, Set<PermissionAction>>();
    def?.permissions.forEach((p) => {
      map.set(p.resource, new Set(p.actions));
    });
    return map;
  }, [role]);

  // Filtrar resources segun modulos activos del tenant
  const visibleResources = useMemo(() => {
    if (!enabledModules || enabledModules.length === 0 || !filterEnabled) {
      return RESOURCE_CATALOG;
    }
    return RESOURCE_CATALOG.filter((r) => {
      // Resources sin modulo asociado (settings, assignments, audit_log) siempre visibles
      if (r.module === null) return true;
      return enabledModules.includes(r.module);
    });
  }, [enabledModules, filterEnabled]);

  // Agrupar por categoria
  const byCategoy = useMemo(() => {
    const groups = new Map<ResourceCategory, ResourceMeta[]>();
    visibleResources.forEach((r) => {
      if (!groups.has(r.category)) groups.set(r.category, []);
      groups.get(r.category)!.push(r);
    });
    return groups;
  }, [visibleResources]);

  // Stats
  const totalPermissions = value.reduce((sum, p) => sum + p.actions.length, 0);
  const hiddenCount = RESOURCE_CATALOG.length - visibleResources.length;

  // ── Toggle individual ──
  const toggleAction = (resource: PermissionResource, action: PermissionAction) => {
    if (readOnly) return;
    const newMap = new Map(permissionsMap);
    const current = newMap.get(resource) ?? new Set<PermissionAction>();
    const next = new Set(current);
    if (next.has(action)) next.delete(action);
    else next.add(action);
    if (next.size === 0) newMap.delete(resource);
    else newMap.set(resource, next);
    emitChange(newMap);
  };

  // ── Toggle row (todas las acciones de un resource) ──
  const toggleAllForResource = (meta: ResourceMeta) => {
    if (readOnly) return;
    const newMap = new Map(permissionsMap);
    const current = newMap.get(meta.resource) ?? new Set<PermissionAction>();
    const all = new Set<PermissionAction>(meta.availableActions);
    const isAllSelected = meta.availableActions.every((a) => current.has(a));
    if (isAllSelected) newMap.delete(meta.resource);
    else newMap.set(meta.resource, all);
    emitChange(newMap);
  };

  // ── Reset a permisos default del rol ──
  const resetToRoleDefaults = () => {
    if (readOnly) return;
    if (!role) return;
    if (!window.confirm("Restablecer a los permisos por defecto del rol? Se perderan todos los permisos custom.")) return;
    onChange([]); // null/[] indica al backend "usar defaults del rol"
  };

  // ── Limpiar todo ──
  const clearAll = () => {
    if (readOnly) return;
    if (!window.confirm("Quitar TODOS los permisos del usuario? El usuario no podra acceder a nada.")) return;
    onChange([]);
  };

  // Helper para emitir cambio
  const emitChange = (map: Map<PermissionResource, Set<PermissionAction>>) => {
    const next: Permission[] = [];
    map.forEach((actions, resource) => {
      next.push({ resource, actions: Array.from(actions) });
    });
    onChange(next);
  };

  // ════════════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            Permisos seleccionados:
          </span>
          <Badge variant="secondary">
            {totalPermissions} {totalPermissions === 1 ? "permiso" : "permisos"} en {value.length}{" "}
            {value.length === 1 ? "recurso" : "recursos"}
          </Badge>
          {hiddenCount > 0 && filterEnabled && (
            <Badge variant="outline" className="text-xs">
              {hiddenCount} ocultos (modulo no activo)
            </Badge>
          )}
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            {enabledModules && enabledModules.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterEnabled((prev) => !prev)}
                className="h-7 text-xs"
              >
                {filterEnabled ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {filterEnabled ? "Mostrar todos" : "Filtrar por modulos activos"}
              </Button>
            )}
            {role && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToRoleDefaults}
                className="h-7 text-xs"
                title={`Restablecer a permisos default del rol ${role}`}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Resetear a rol
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-7 text-xs text-red-600 hover:text-red-700"
            >
              Quitar todos
            </Button>
          </div>
        )}
      </div>

      {/* Aviso si el filtro de modulos esta activo */}
      {filterEnabled && enabledModules && enabledModules.length > 0 && hiddenCount > 0 && (
        <Alert>
          <AlertDescription className="text-xs">
            Solo se muestran recursos de los <strong>{enabledModules.length} modulos activos</strong> de
            tu tenant. {hiddenCount} recursos ocultos (modulo no activo).
          </AlertDescription>
        </Alert>
      )}

      {/* Matriz de permisos */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {Array.from(byCategoy.entries()).map(([category, items]) => (
          <div key={category} className="space-y-1">
            <h4 className="text-sm font-semibold text-muted-foreground sticky top-0 bg-background py-1">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Recurso</th>
                    {ALL_ACTIONS.map((a) => (
                      <th key={a} className="px-2 py-2 text-center font-medium text-xs w-12">
                        {ACTION_LABELS[a].slice(0, 6)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center font-medium text-xs w-16">Todo</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((meta) => {
                    const current = permissionsMap.get(meta.resource) ?? new Set<PermissionAction>();
                    const def = defaultPermissions.get(meta.resource);
                    const allSelected =
                      meta.availableActions.length > 0 &&
                      meta.availableActions.every((a) => current.has(a));

                    return (
                      <tr
                        key={meta.resource}
                        className={cn(
                          "border-b last:border-0 hover:bg-muted/30 transition-colors",
                          current.size === 0 && "opacity-60",
                        )}
                      >
                        <td className="px-3 py-2 font-medium">
                          <div>{meta.label}</div>
                          {def && def.size > 0 && current.size === 0 && (
                            <div className="text-xs text-muted-foreground">
                              Default del rol: {Array.from(def).map((a) => ACTION_LABELS[a]).join(", ")}
                            </div>
                          )}
                        </td>
                        {ALL_ACTIONS.map((action) => {
                          const isAvailable = meta.availableActions.includes(action);
                          const isChecked = current.has(action);
                          if (!isAvailable) {
                            return (
                              <td key={action} className="px-2 py-2 text-center text-muted-foreground/30">
                                —
                              </td>
                            );
                          }
                          return (
                            <td key={action} className="px-2 py-2 text-center">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleAction(meta.resource, action)}
                                disabled={readOnly}
                                aria-label={`${ACTION_LABELS[action]} ${meta.label}`}
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleAllForResource(meta)}
                            disabled={readOnly || meta.availableActions.length === 0}
                            aria-label={`Todas las acciones de ${meta.label}`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {value.length === 0 && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Sin permisos custom — el usuario usara los <strong>permisos por defecto del rol {role ?? "?"}</strong>.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
