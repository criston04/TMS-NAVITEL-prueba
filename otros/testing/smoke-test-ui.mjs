// Smoke test de todas las rutas del frontend.
// Verifica que cada página responda 200 y no contenga errores visibles.
const BASE = "http://localhost:3000";

const routes = [
  // Auth
  { path: "/login", protected: false, description: "Pantalla de login" },

  // Dashboard
  { path: "/dashboard", protected: true, description: "Dashboard principal" },

  // Master
  { path: "/master/customers", protected: true, description: "Lista clientes" },
  { path: "/master/drivers", protected: true, description: "Lista conductores" },
  { path: "/master/vehicles", protected: true, description: "Lista vehiculos" },
  { path: "/master/operators", protected: true, description: "Lista operadores" },
  { path: "/master/products", protected: true, description: "Lista productos" },
  { path: "/master/geofences", protected: true, description: "Geocercas (con mapa)" },
  { path: "/master/workflows", protected: true, description: "Workflows" },

  // Orders
  { path: "/orders", protected: true, description: "Lista de ordenes" },
  { path: "/orders/new", protected: true, description: "Crear orden (form)" },
  { path: "/orders/import", protected: true, description: "Importar ordenes" },

  // Operations
  { path: "/scheduling", protected: true, description: "Programacion" },
  { path: "/route-planner", protected: true, description: "Planeador de rutas" },

  // Monitoring
  { path: "/monitoring", protected: true, description: "Monitoreo (WebSocket)" },
  { path: "/monitoring/control-tower", protected: true, description: "Torre de control" },
  { path: "/monitoring/historical", protected: true, description: "Historico" },
  { path: "/monitoring/multi-window", protected: true, description: "Multi-ventana" },
  { path: "/monitoring/retransmission", protected: true, description: "Retransmision" },

  // Maintenance
  { path: "/maintenance", protected: true, description: "Mantenimiento dashboard" },
  { path: "/maintenance/vehicles", protected: true, description: "Vehiculos en mant." },
  { path: "/maintenance/work-orders", protected: true, description: "Ordenes de trabajo" },
  { path: "/maintenance/inspections", protected: true, description: "Inspecciones" },
  { path: "/maintenance/parts", protected: true, description: "Repuestos" },
  { path: "/maintenance/preventive", protected: true, description: "Preventivo" },

  // Bitacora
  { path: "/bitacora", protected: true, description: "Bitacora" },

  // Finance
  { path: "/finance", protected: true, description: "Finanzas" },
  { path: "/finance/invoices", protected: true, description: "Facturas" },
  { path: "/finance/payments", protected: true, description: "Pagos" },
  { path: "/finance/costs", protected: true, description: "Costos" },

  // Reports
  { path: "/reports", protected: true, description: "Reportes" },

  // Settings
  { path: "/settings", protected: true, description: "Configuracion" },
  { path: "/settings/users", protected: true, description: "Usuarios" },

  // Platform (modulos fantasma)
  { path: "/platform", protected: true, description: "Platform dashboard (FANTASMA)" },
  { path: "/platform/tenants", protected: true, description: "Tenants (FANTASMA)" },
  { path: "/platform/modules", protected: true, description: "Modulos (FANTASMA)" },
  { path: "/platform/activity", protected: true, description: "Activity (FANTASMA)" },
  { path: "/platform/transfers", protected: true, description: "Transfers (FANTASMA)" },
  { path: "/platform/users", protected: true, description: "Platform users (FANTASMA)" },
];

const results = [];

console.log(`\nProbando ${routes.length} rutas en ${BASE}...\n`);

for (const route of routes) {
  try {
    const res = await fetch(`${BASE}${route.path}`, { redirect: "manual" });
    const status = res.status;
    const isRedirect = status >= 300 && status < 400;
    const location = isRedirect ? res.headers.get("location") : null;

    let bodyPreview = "";
    if (status === 200) {
      const body = await res.text();
      // Detectar errores en HTML
      const hasNextError = /__NEXT_DATA__.*"err"/i.test(body) ||
                           body.includes("Application error") ||
                           body.includes("500") ||
                           body.includes("Error: ") ||
                           body.includes("Cannot read properties");
      const hasPageContent = body.length > 5000; // Pages reales tienen mucho HTML
      bodyPreview = hasNextError ? "ERROR EN HTML" : hasPageContent ? "OK (HTML completo)" : "VACIO/MIN";
    }

    const ok = status === 200 || (isRedirect && location?.includes("/login"));
    const statusIcon = ok ? "OK" : "FAIL";
    results.push({ ...route, status, ok, bodyPreview, location });
    console.log(`[${statusIcon}] [${status}] ${route.path.padEnd(35)} ${route.description.padEnd(40)} ${bodyPreview} ${location ? `→ ${location}` : ""}`);
  } catch (err) {
    results.push({ ...route, status: 0, ok: false, error: err.message });
    console.log(`[FAIL] [---] ${route.path.padEnd(35)} ${route.description.padEnd(40)} ERROR: ${err.message}`);
  }
}

console.log("\n=== RESUMEN ===");
const ok = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`OK:    ${ok}/${routes.length}`);
console.log(`FAIL:  ${fail}/${routes.length}`);

if (fail > 0) {
  console.log("\nFALLAS:");
  results.filter(r => !r.ok).forEach(r => {
    console.log(`  - ${r.path}: status=${r.status}, ${r.error || r.bodyPreview || ""}`);
  });
}
