#!/usr/bin/env node
/**
 * INVESTIGACIÓN PROFUNDA — verificar si la URL :id está realmente mal
 * o si hay alguna variante que SÍ funcione.
 */

const API_BASE = "https://api-service.gruponavitel.com";
let TOKEN = null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.extraHeaders || {}) };
  if (opts.token !== null) headers.Authorization = `Bearer ${opts.token || TOKEN}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const raw = await res.text();
    const headersOut = {};
    for (const [k, v] of res.headers.entries()) headersOut[k] = v;
    return { status: res.status, latency: Date.now() - t0, headers: headersOut, body: raw };
  } catch (err) {
    return { status: 0, latency: Date.now() - t0, error: err.message };
  }
}

function dump(label, r) {
  const ok = r.status >= 200 && r.status < 300;
  const icon = ok ? "OK   " : r.status === 0 ? "ERR  " : `${r.status}  `;
  const bodyShort = (r.body || "").slice(0, 80).replace(/\n/g, " ");
  console.log(`  ${icon} ${label.padEnd(70)} → ${bodyShort}`);
}

async function main() {
  console.log("INVESTIGACIÓN PROFUNDA — descartar referenciamiento erróneo de URLs\n");

  // Login
  const login = await http("POST", `${API_BASE}/auth/login`, {
    body: { username: "admin", password: "Admin1432!" },
    token: null,
  });
  TOKEN = JSON.parse(login.body)?.data?.accessToken;
  console.log(`Login: ${login.status === 200 ? "OK" : "FAIL"}\n`);

  // Crear orden
  await sleep(2000);
  const customers = await http("GET", `${API_BASE}/api/v1/master/customers?pageSize=1`);
  const customerId = JSON.parse(customers.body)?.items?.[0]?.id;
  await sleep(2000);
  const created = await http("POST", `${API_BASE}/api/v1/orders`, {
    body: { type: "delivery", priority: "high", customer_id: customerId },
  });
  const orderId = JSON.parse(created.body)?.data?.id;
  console.log(`Orden creada: ${orderId}\n`);

  // ═══════════ HIPÓTESIS A — Variantes de path ═══════════
  console.log("═══ HIPÓTESIS A: variantes de PATH ═══");
  const pathVariants = [
    `${API_BASE}/api/v1/orders/${orderId}`,                        // exacto del frontend
    `${API_BASE}/api/v1/orders/${orderId}/`,                       // trailing slash
    `${API_BASE}/api/v1//orders/${orderId}`,                       // doble slash
    `${API_BASE}/api/v1/order/${orderId}`,                         // singular
    `${API_BASE}/api/v1/Orders/${orderId}`,                        // capitalizado
    `${API_BASE}/api/v1/operations/orders/${orderId}`,             // con namespace operations
    `${API_BASE}/api/v1/operations/orders/${orderId}/detail`,      // con sufijo detail
    `${API_BASE}/api/v2/orders/${orderId}`,                        // v2 en vez de v1
    `${API_BASE}/api/orders/${orderId}`,                           // sin v1
    `${API_BASE}/orders/${orderId}`,                               // root sin /api
    `${API_BASE}/v1/orders/${orderId}`,                            // sin /api
  ];
  for (const url of pathVariants) {
    await sleep(1500);
    const r = await http("GET", url);
    dump(url.replace(API_BASE, ""), r);
  }

  // ═══════════ HIPÓTESIS B — Headers especiales ═══════════
  console.log("\n═══ HIPÓTESIS B: HEADERS extra ═══");
  const url = `${API_BASE}/api/v1/orders/${orderId}`;
  const headerVariants = [
    { label: "Sin Authorization", extraHeaders: {}, token: null },
    { label: "Con X-Tenant-ID", extraHeaders: { "X-Tenant-ID": "00000000-0000-0000-0000-000000000001" } },
    { label: "Con Accept JSON explícito", extraHeaders: { Accept: "application/json" } },
    { label: "Con User-Agent del frontend", extraHeaders: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } },
    { label: "Con Origin", extraHeaders: { Origin: "http://localhost:3000" } },
    { label: "Con Referer", extraHeaders: { Referer: "http://localhost:3000/orders" } },
  ];
  for (const v of headerVariants) {
    await sleep(1500);
    const r = await http("GET", url, v);
    dump(v.label, r);
  }

  // ═══════════ HIPÓTESIS C — Query params ═══════════
  console.log("\n═══ HIPÓTESIS C: QUERY PARAMS ═══");
  const queryVariants = [
    `?include=items,tracking`,
    `?expand=all`,
    `?tenant_id=00000000-0000-0000-0000-000000000001`,
    `?tenantId=00000000-0000-0000-0000-000000000001`,
    `?fields=*`,
  ];
  for (const q of queryVariants) {
    await sleep(1500);
    const r = await http("GET", `${url}${q}`);
    dump(`?${q.slice(1)}`, r);
  }

  // ═══════════ HIPÓTESIS D — Otros endpoints :id de OTROS módulos ═══════════
  console.log("\n═══ HIPÓTESIS D: ¿el bug afecta otros módulos también? ═══");
  await sleep(1500);
  const drivers = await http("GET", `${API_BASE}/api/v1/master/drivers?pageSize=1`);
  const driverId = JSON.parse(drivers.body)?.items?.[0]?.id;
  await sleep(1500);
  const vehicles = await http("GET", `${API_BASE}/api/v1/master/vehicles?pageSize=1`);
  const vehicleId = JSON.parse(vehicles.body)?.items?.[0]?.id;

  const otherModules = [
    `${API_BASE}/api/v1/master/customers/${customerId}`,
    `${API_BASE}/api/v1/master/drivers/${driverId}`,
    `${API_BASE}/api/v1/master/vehicles/${vehicleId}`,
    `${API_BASE}/api/v1/master/operators/00000000-0000-0000-0000-000000000000`,
    `${API_BASE}/api/v1/master/products/00000000-0000-0000-0000-000000000000`,
    `${API_BASE}/api/v1/maintenance/work-orders/00000000-0000-0000-0000-000000000000`,
    `${API_BASE}/api/v1/finance/invoices/00000000-0000-0000-0000-000000000000`,
  ];
  for (const u of otherModules) {
    await sleep(1500);
    const r = await http("GET", u);
    dump(u.replace(API_BASE, ""), r);
  }

  // ═══════════ HIPÓTESIS E — Contraste con rutas que SÍ funcionan ═══════════
  console.log("\n═══ HIPÓTESIS E: rutas con :id que SÍ funcionan (control) ═══");
  const orderNumber = JSON.parse(created.body)?.data?.order_number;
  const workingPaths = [
    `${API_BASE}/api/v1/orders`,                                                 // sin id
    `${API_BASE}/api/v1/operations/orders/by-number/${orderNumber}`,             // path param NO uuid
    `${API_BASE}/api/v1/operations/orders/status-counts`,                        // sin id
    `${API_BASE}/api/v1/master/customers/by-document/123456`,                    // path param NO uuid
  ];
  for (const u of workingPaths) {
    await sleep(1500);
    const r = await http("GET", u);
    dump(u.replace(API_BASE, ""), r);
  }

  console.log("\n═══ FIN ═══\n");
}

main().catch(console.error);
