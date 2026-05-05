const BASE = "http://localhost:3000";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const routes = [
  "/login", "/master/customers", "/master/drivers", "/master/vehicles",
  "/master/operators", "/master/products", "/master/geofences", "/master/workflows",
  "/orders", "/orders/new", "/scheduling", "/route-planner",
  "/monitoring", "/monitoring/control-tower", "/monitoring/historical",
  "/maintenance", "/maintenance/work-orders", "/maintenance/parts",
  "/bitacora", "/finance", "/reports", "/settings",
  "/platform", "/platform/tenants", "/platform/modules", "/platform/activity",
  "/platform/transfers", "/platform/users",
];

const results = [];
for (const path of routes) {
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(60000) });
    const body = await res.text();
    // Errores REALES (los que muestra Next.js al usuario)
    const realErrors = [
      body.includes("Application error: a server-side exception has occurred"),
      body.includes("Application error: a client-side exception has occurred"),
      /<title>404[^<]*<\/title>/i.test(body),
      /<h1[^>]*>500[^<]*<\/h1>/i.test(body),
      /<h2[^>]*>This page could not be found/i.test(body),
    ].filter(Boolean).length;
    const ok = res.status === 200 && realErrors === 0 && body.length > 1000;
    const sizeKb = (body.length / 1024).toFixed(0);
    console.log(`${ok ? "OK" : "FAIL"}  ${res.status}  ${sizeKb.padStart(4)}KB  ${path.padEnd(35)} ${ok ? "" : "(errors=" + realErrors + ")"}`);
    results.push({ path, ok });
    await sleep(300);
  } catch (err) {
    console.log(`FAIL  ---       --  ${path.padEnd(35)} ${err.message}`);
    results.push({ path, ok: false });
  }
}

const ok = results.filter(r => r.ok).length;
console.log(`\nResultado: ${ok}/${results.length} páginas OK`);
if (ok < results.length) {
  console.log("Fallaron:", results.filter(r => !r.ok).map(r => r.path).join(", "));
}
