// V2: Smoke test mejorado. Hace requests secuenciales con timeout largo
// para evitar problemas con el primer build de Next.js. Detecta errores
// reales en el HTML (no falsos positivos).

const BASE = "http://localhost:3000";

const routes = [
  { path: "/login", name: "Login" },
  { path: "/master/customers", name: "Customers list" },
  { path: "/master/drivers", name: "Drivers list" },
  { path: "/master/vehicles", name: "Vehicles list" },
  { path: "/master/operators", name: "Operators list" },
  { path: "/master/products", name: "Products list" },
  { path: "/master/geofences", name: "Geofences (mapa)" },
  { path: "/master/workflows", name: "Workflows list" },
  { path: "/orders", name: "Orders list" },
  { path: "/orders/new", name: "Create order form" },
  { path: "/scheduling", name: "Scheduling" },
  { path: "/route-planner", name: "Route planner" },
  { path: "/monitoring", name: "Monitoring (WebSocket)" },
  { path: "/monitoring/control-tower", name: "Control tower" },
  { path: "/monitoring/historical", name: "Historical" },
  { path: "/maintenance", name: "Maintenance" },
  { path: "/maintenance/work-orders", name: "Work orders" },
  { path: "/bitacora", name: "Bitacora" },
  { path: "/finance", name: "Finance" },
  { path: "/reports", name: "Reports" },
  { path: "/settings", name: "Settings" },
  { path: "/platform", name: "Platform (FANTASMA)" },
  { path: "/platform/tenants", name: "Platform tenants (FANTASMA)" },
  { path: "/platform/modules", name: "Platform modules (FANTASMA)" },
  { path: "/platform/activity", name: "Platform activity (FANTASMA)" },
  { path: "/platform/transfers", name: "Platform transfers (FANTASMA)" },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log(`\n=== Smoke test v2: ${routes.length} rutas ===\n`);

const results = [];
for (const route of routes) {
  try {
    const t0 = Date.now();
    const res = await fetch(`${BASE}${route.path}`, { signal: AbortSignal.timeout(60000) });
    const status = res.status;
    const body = await res.text();
    const ms = Date.now() - t0;

    // Heurísticas más precisas para detectar errores reales:
    const errorMatches = {
      "Hydration error": /hydration error|hydration mismatch/i.test(body),
      "Unhandled exception": /Unhandled (Runtime|Promise) Rejection|Unhandled exception/i.test(body),
      "Cannot read": /Cannot read propert(y|ies) of (undefined|null)/i.test(body),
      "TypeError fatal": /<title>.*Error.*<\/title>|Application error: a (server|client)-side exception/i.test(body),
      "Next.js error": /Next\.js encountered an error|next-error-h1/i.test(body),
      "404 page": /404[:\s]/i.test(body) && body.length < 3000,
      "Empty body": body.length < 1000,
    };
    const realErrors = Object.entries(errorMatches).filter(([_, hit]) => hit).map(([k]) => k);

    const ok = status === 200 && realErrors.length === 0;
    const icon = ok ? "OK  " : "FAIL";
    results.push({ ...route, status, ms, ok, errors: realErrors });

    const errStr = realErrors.length > 0 ? ` [errores: ${realErrors.join(",")}]` : "";
    console.log(`[${icon}] [${status}] ${ms.toString().padStart(5)}ms ${route.path.padEnd(35)} ${route.name}${errStr}`);

    await sleep(500); // pausa para no saturar dev server
  } catch (err) {
    results.push({ ...route, status: 0, ok: false, error: err.message });
    console.log(`[FAIL] [---]      - ${route.path.padEnd(35)} ${route.name} TIMEOUT/ERROR: ${err.message}`);
  }
}

console.log("\n=== RESUMEN ===");
const ok = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`OK:    ${ok}/${routes.length}`);
console.log(`FAIL:  ${fail}/${routes.length}`);

if (fail > 0) {
  console.log("\nRUTAS QUE FALLARON:");
  results.filter(r => !r.ok).forEach(r => {
    console.log(`  ✗ ${r.path}: status=${r.status}, ${r.error || (r.errors || []).join(", ") || "?"}`);
  });
}
