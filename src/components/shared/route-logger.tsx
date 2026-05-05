"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiConfig } from "@/config/api.config";

/**
 * Detecta el modulo actual a partir del pathname y cuales servicios se esperan usar.
 */
const MODULE_MAP: Record<string, { name: string; services: string[] }> = {
  "/": { name: "Dashboard", services: ["useDashboard → /dashboard/stats", "/dashboard/vehicles/overview", "/dashboard/shipments", "/dashboard/vehicles/on-route"] },

  // Master
  "/master/customers": { name: "Maestro / Clientes", services: ["customersService → /master/customers", "/master/customers/stats", "/master/customers/cities"] },
  "/master/drivers": { name: "Maestro / Conductores", services: ["driversService → /master/drivers", "/master/drivers/stats", "/master/drivers/expiring-licenses"] },
  "/master/vehicles": { name: "Maestro / Vehiculos", services: ["vehiclesService → /master/vehicles", "/master/vehicles/stats", "/master/vehicles/expiring-documents"] },
  "/master/operators": { name: "Maestro / Operadores", services: ["operatorsService → /master/operators", "/master/operators/stats"] },
  "/master/products": { name: "Maestro / Productos", services: ["productsService → /master/products", "/master/products/stats"] },
  "/master/geofences": { name: "Maestro / Geocercas", services: ["geofencesService → /geofences"] },
  "/master/workflows": { name: "Maestro / Workflows", services: ["unifiedWorkflowService → /workflows"] },

  // Operations
  "/orders": { name: "Ordenes", services: ["orderService → /orders"] },
  "/orders/new": { name: "Ordenes / Nueva", services: ["orderService, workflowService, customersService"] },
  "/scheduling": { name: "Programacion", services: ["schedulingService → /scheduling/*"] },
  "/route-planner": { name: "Planificador de Rutas", services: ["routingService → /route-planner/*"] },
  "/bitacora": { name: "Bitacora", services: ["⚠ No hay servicio FE (backend tiene /api/v1/bitacora)"] },

  // Monitoring
  "/monitoring/control-tower": { name: "Torre de Control", services: ["trackingService → /monitoring/tracking", "websocketService → /monitoring/websocket"] },
  "/monitoring/retransmission": { name: "Retransmision GPS", services: ["retransmissionService → /monitoring/retransmission"] },
  "/monitoring/historical": { name: "Ruta Historica", services: ["historicalService → /monitoring/historical"] },
  "/monitoring/multi-window": { name: "Multi-Ventana", services: ["trackingService + useMultiWindow"] },

  // Maintenance
  "/maintenance": { name: "Mantenimiento", services: ["maintenanceService → /master/maintenance/*"] },
  "/maintenance/vehicles": { name: "Mantenimiento / Vehiculos", services: ["maintenance vehicles → /maintenance/vehicles"] },
  "/maintenance/work-orders": { name: "Mantenimiento / Ordenes Trabajo", services: ["/maintenance/work-orders"] },
  "/maintenance/preventive": { name: "Mantenimiento / Preventivo", services: ["/maintenance/schedules"] },
  "/maintenance/inspections": { name: "Mantenimiento / Inspecciones", services: ["/maintenance/inspections"] },
  "/maintenance/parts": { name: "Mantenimiento / Repuestos", services: ["/maintenance/parts"] },
  "/maintenance/alerts": { name: "Mantenimiento / Alertas", services: ["/maintenance/alerts"] },
  "/maintenance/documents": { name: "Mantenimiento / Documentos", services: ["⚠ No hay servicio FE"] },

  // Finance
  "/finance": { name: "Finanzas / Dashboard", services: ["financeService → /finance/stats, /aging, /profitability, /cash-flow"] },
  "/invoices": { name: "Facturas", services: ["financeService → /finance/invoices"] },
  "/pricing": { name: "Tarifas", services: ["⚠ No hay servicio FE (hardcoded)"] },

  // Reports / Settings
  "/reports": { name: "Reportes", services: ["reportService → /reports/definitions, /templates, /generated, /schedules"] },
  "/settings": { name: "Configuracion", services: ["settingsService → /settings, /settings/roles, /settings/integrations"] },
  "/settings/users": { name: "Configuracion / Usuarios", services: ["settingsService + userService"] },

  // Platform
  "/platform": { name: "Plataforma", services: ["platformService → /platform/tenants, /platform/dashboard"] },
  "/platform/tenants": { name: "Plataforma / Tenants", services: ["platformService → /platform/tenants"] },
  "/platform/modules": { name: "Plataforma / Modulos", services: ["platformService → /platform/tenants/:id/modules"] },
  "/platform/transfers": { name: "Plataforma / Transferencias", services: ["platformService → /platform/transfers"] },
  "/platform/users": { name: "Plataforma / Usuarios", services: ["platformService → /platform/users"] },
  "/platform/activity": { name: "Plataforma / Actividad", services: ["platformService → /platform/activity"] },
};

function findModule(pathname: string): { name: string; services: string[] } {
  // Buscar match exacto
  if (MODULE_MAP[pathname]) return MODULE_MAP[pathname];

  // Buscar match por prefijo (mas especifico primero)
  const matches = Object.entries(MODULE_MAP)
    .filter(([path]) => pathname.startsWith(path) && path !== "/")
    .sort((a, b) => b[0].length - a[0].length);

  if (matches.length > 0) return matches[0][1];

  return { name: `Ruta desconocida (${pathname})`, services: [] };
}

export function RouteLogger() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;

    const mod = findModule(pathname);

    console.log(
      `\n%c📍 NAVEGACION → %c${mod.name}`,
      "color: #9c27b0; font-weight: bold; font-size: 13px",
      "color: #2196f3; font-weight: bold; font-size: 13px",
    );
    console.log(
      `%c   Ruta: %c${pathname}  %c| Modo: %cAPI REAL`,
      "color: #666",
      "color: #000; font-family: monospace",
      "color: #666",
      "color: #4caf50; font-weight: bold",
    );

    if (mod.services.length > 0) {
      console.log(
        `%c   Servicios esperados:`,
        "color: #666; font-style: italic",
      );
      mod.services.forEach((svc) => {
        const hasWarning = svc.includes("⚠");
        console.log(
          `     %c${hasWarning ? "⚠" : "•"}%c ${svc}`,
          `color: ${hasWarning ? "#ff9800" : "#4caf50"}; font-weight: bold`,
          "color: inherit",
        );
      });
    }

    console.log(`%c   Base URL: ${apiConfig.baseUrl}`, "color: #666; font-size: 10px");
  }, [pathname]);

  return null;
}
