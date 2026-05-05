// Para cada página crítica del frontend, identifica qué endpoints
// del backend invoca al cargar (analisis estático del código) y verifica
// que esos endpoints respondan algo razonable en producción.

const PROD = "https://api-service.gruponavitel.com";

// Login para tener token
const r = await fetch(`${PROD}/auth/login`, {
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body: JSON.stringify({username:"admin",password:"Admin1432!"})
});
const tok = (await r.json()).data.accessToken;
const H = { Authorization: `Bearer ${tok}` };

// Mapeo de páginas → endpoints que invocan al mount (deducido de los services)
const pages = {
  "/master/drivers": [
    "GET /api/v1/master/drivers?pageSize=20",
    "GET /api/v1/master/drivers/stats",
  ],
  "/master/vehicles": [
    "GET /api/v1/master/vehicles?pageSize=20",
    "GET /api/v1/master/vehicles/stats",
  ],
  "/master/customers": [
    "GET /api/v1/master/customers?pageSize=20",
    "GET /api/v1/master/customers/stats",
    "GET /api/v1/master/customers/cities",
  ],
  "/master/operators": [
    "GET /api/v1/master/operators?pageSize=20",
    "GET /api/v1/master/operators/stats",
  ],
  "/master/products": [
    "GET /api/v1/master/products?pageSize=20",
    "GET /api/v1/master/products/stats",
  ],
  "/master/geofences": [
    "GET /api/v1/geofences?pageSize=20",
    "GET /api/v1/geofences/stats",
  ],
  "/master/workflows": [
    "GET /api/v1/master/workflows",
    "GET /api/v1/master/workflows/active",
  ],
  "/orders": [
    "GET /api/v1/orders?pageSize=20",
    "GET /api/v1/orders/stats",
  ],
  "/orders/new": [
    "GET /api/v1/master/customers?pageSize=200",
    "GET /api/v1/master/drivers?pageSize=200",
    "GET /api/v1/master/vehicles?pageSize=200",
    "GET /api/v1/master/products?pageSize=200",
    "GET /api/v1/master/workflows/active",
  ],
  "/scheduling": [
    "GET /api/v1/operations/scheduling/orders",
    "GET /api/v1/operations/scheduling/kpis",
  ],
  "/monitoring": [
    "GET /api/v1/monitoring/tracking",
    "GET /api/v1/monitoring/stats",
  ],
  "/maintenance": [
    "GET /api/v1/maintenance/stats",
    "GET /api/v1/maintenance/alerts",
  ],
  "/bitacora": [
    "GET /api/v1/bitacora?pageSize=20",
    "GET /api/v1/bitacora/stats",
  ],
  "/finance": [
    "GET /api/v1/finance/invoices?pageSize=20",
    "GET /api/v1/finance/stats",
  ],
  "/reports": [
    "GET /api/v1/reports/definitions",
    "GET /api/v1/reports/templates",
  ],
  "/settings": [
    "GET /api/v1/settings",
    "GET /api/v1/settings/overview",
  ],
  "/platform": [
    "GET /api/v1/platform/dashboard",
  ],
  "/platform/tenants": [
    "GET /api/v1/platform/tenants",
  ],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const report = {};
for (const [page, endpoints] of Object.entries(pages)) {
  report[page] = [];
  for (const endpoint of endpoints) {
    const [method, path] = endpoint.split(" ");
    try {
      const res = await fetch(`${PROD}${path}`, { method, headers: H });
      const status = res.status;
      const ok = status === 200;
      const txt = ok ? "" : (await res.text()).slice(0, 60);
      report[page].push({ endpoint, status, ok, txt });
      await sleep(800);
    } catch (err) {
      report[page].push({ endpoint, status: 0, ok: false, txt: err.message });
    }
  }
}

console.log("\n=== Estado UX por página (qué ve el usuario al abrir) ===\n");
for (const [page, results] of Object.entries(report)) {
  const okCount = results.filter(r => r.ok).length;
  const total = results.length;
  const allOk = okCount === total;
  console.log(`\n${allOk ? "[SHOW DATOS]" : "[VACIO/ERROR]"} ${page}  (${okCount}/${total} endpoints OK)`);
  for (const r of results) {
    const icon = r.ok ? "  OK" : "  ❌";
    console.log(`  ${icon}  ${r.status}  ${r.endpoint} ${r.txt ? `→ ${r.txt}` : ""}`);
  }
}

console.log("\n=== RESUMEN UX ===\n");
const fullyWorking = Object.entries(report).filter(([, rs]) => rs.every(r => r.ok));
const partial = Object.entries(report).filter(([, rs]) => rs.some(r => r.ok) && !rs.every(r => r.ok));
const broken = Object.entries(report).filter(([, rs]) => !rs.some(r => r.ok));

console.log(`Páginas completamente funcionales: ${fullyWorking.length}`);
fullyWorking.forEach(([p]) => console.log(`  ✓ ${p}`));
console.log(`\nPáginas con algunos endpoints fallando (mostrarían datos parciales): ${partial.length}`);
partial.forEach(([p]) => console.log(`  ! ${p}`));
console.log(`\nPáginas con TODOS los endpoints fallando (vacío total): ${broken.length}`);
broken.forEach(([p]) => console.log(`  ✗ ${p}`));
