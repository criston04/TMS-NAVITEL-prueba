#!/usr/bin/env node
/**
 * TEST E2E CONSOLIDADO — Modulo OPERACIONES (orders, scheduling, workflows, bitacora)
 *
 * Probamos SOLO los endpoints que el frontend REALMENTE usa, post-limpieza
 * de codigo muerto. Cada endpoint apunta al path canonico de la doc
 * `OPERACIONES_AL_DETALLE.md`.
 *
 * Route Planner NO tiene endpoints (es 100% client-side).
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", blue: "\x1b[34m", bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const raw = await res.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return { status: res.status, ok: res.ok, latencyMs: Date.now() - t0, body: data };
  } catch (err) {
    return { status: 0, ok: false, latencyMs: Date.now() - t0, body: err.message };
  }
}
const unwrap = (d) => d?.data ?? d?.items ?? d;

// ──────────────────────────────────────────────────────────
// REGISTRO DE RESULTADOS
// ──────────────────────────────────────────────────────────
const RESULTS = { orders: [], scheduling: [], workflows: [], bitacora: [] };

function record(submodule, label, r, expectStatus = [200, 201]) {
  const ok = expectStatus.includes(r.status);
  RESULTS[submodule].push({ label, status: r.status, ok, latencyMs: r.latencyMs });
  const icon = ok ? `${C.green}✅` : (r.status >= 500 ? `${C.red}💥` : `${C.red}❌`);
  console.log(`  ${icon} ${String(r.status).padEnd(3)} ${C.reset}${label.padEnd(60)} ${C.dim}${r.latencyMs}ms${C.reset}`);
}

function header(t) {
  console.log("");
  console.log(`${C.bold}${C.cyan}═══════ ${t} ═══════${C.reset}`);
}

// ══════════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════════
async function setup() {
  header("LOGIN");
  const r = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = unwrap(r.body)?.accessToken;
  if (!TOKEN) { console.log(`${C.red}LOGIN FAIL${C.reset}`); process.exit(1); }
  console.log(`${C.green}✓ Login OK${C.reset}\n`);

  // IDs de master
  await sleep(300);
  const cust = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(300);
  const drv = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);
  await sleep(300);
  const veh = unwrap((await http("GET", `${API_URL}/master/vehicles?pageSize=5`)).body);
  return {
    customer: cust[0],
    driver: drv[0],
    driver2: drv[1] ?? drv[0],
    vehicle: veh[0],
    vehicle2: veh[1] ?? veh[0],
  };
}

// ══════════════════════════════════════════════════════════
// 1. ORDERS — endpoints que el frontend USA
// ══════════════════════════════════════════════════════════
async function testOrders(ctx) {
  header("ORDERS");

  let r, orderId;

  // 1. POST /orders (crear)
  const orderNumber = `ORD-OP-${Date.now()}`;
  r = await http("POST", `${API_URL}/orders`, {
    order_number: orderNumber,
    customer_id: ctx.customer.id, customer_name: ctx.customer.name,
    type: "delivery", priority: "high",
    vehicle_id: ctx.vehicle.id, vehicle_plate: ctx.vehicle.plate,
    driver_id: ctx.driver.id, driver_name: "TestDr",
    origin_address: "Origen Test", origin_lat: -12.046, origin_lng: -77.042,
    destination_address: "Destino Test", destination_lat: -12.054, destination_lng: -77.123,
    scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_delivery_at: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    estimated_distance_km: 25,
    total_weight: 1000, total_volume: 5, total_packages: 10,
    notes: "Test e2e operaciones",
  });
  orderId = unwrap(r.body)?.id;
  record("orders", "POST /orders (crear)", r, [201]);

  await sleep(300);
  // 2. GET /orders (listar)
  r = await http("GET", `${API_URL}/orders?pageSize=20`);
  record("orders", "GET /orders (listar)", r);

  await sleep(300);
  // 3. GET /orders/stats
  r = await http("GET", `${API_URL}/orders/stats`);
  record("orders", "GET /orders/stats", r);

  if (orderId) {
    await sleep(300);
    // 4. GET /orders/:id
    r = await http("GET", `${API_URL}/orders/${orderId}`);
    record("orders", "GET /orders/:id", r);

    await sleep(300);
    // 5. PATCH /orders/:id (actualizar)
    r = await http("PATCH", `${API_URL}/orders/${orderId}`, { notes: "Test actualizado" });
    record("orders", "PATCH /orders/:id (actualizar)", r);

    await sleep(300);
    // 6. PATCH /orders/:id/status (draft → pending)
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "pending" });
    record("orders", "PATCH /orders/:id/status (pending)", r);

    await sleep(300);
    // 7. PATCH /orders/:id/assign
    r = await http("PATCH", `${API_URL}/orders/${orderId}/assign`, {
      vehicle_id: ctx.vehicle2.id, driver_id: ctx.driver2.id,
    });
    record("orders", "PATCH /orders/:id/assign", r);

    await sleep(300);
    // 8. POST /orders/bulk-send (single via bulk)
    r = await http("POST", `${API_URL}/orders/bulk-send`, { orderIds: [orderId] });
    record("orders", "POST /orders/bulk-send (notificar)", r);

    await sleep(300);
    // 9. PATCH /orders/:id/status (assigned → in_transit) — equiv a startTrip
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "in_transit" });
    record("orders", "PATCH /orders/:id/status (in_transit)", r);

    await sleep(300);
    // 10. PATCH /orders/:id/status (in_transit → completed)
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "completed" });
    record("orders", "PATCH /orders/:id/status (completed)", r);

    await sleep(300);
    // 11. POST /orders/:id/close
    r = await http("POST", `${API_URL}/orders/${orderId}/close`, {
      observations: "Cierre test", incidents: [], deviationReasons: [],
      closedBy: "test", closedByName: "Test E2E",
    });
    record("orders", "POST /orders/:id/close", r);

    await sleep(300);
    // 12. GET /orders/:id/workflow-progress (workflow service)
    r = await http("GET", `${API_URL}/orders/${orderId}/workflow-progress`);
    record("orders", "GET /orders/:id/workflow-progress", r);

    await sleep(300);
    // 13. PATCH /orders/:id/milestones/:mid — necesita un milestone real, skip si no hay
    // (este endpoint requiere milestoneId que el backend genera; sin id valido daria 404)
    record("orders", "PATCH /orders/:id/milestones/:mid (skip — req milestone real)", { status: 0, ok: true, latencyMs: 0 });
  }

  await sleep(300);
  // 14. GET /orders/export (export CSV)
  r = await http("GET", `${API_URL}/orders/export`);
  record("orders", "GET /orders/export (CSV)", r);
}

// ══════════════════════════════════════════════════════════
// 2. SCHEDULING — endpoints que el frontend USA
// ══════════════════════════════════════════════════════════
async function testScheduling() {
  header("SCHEDULING");
  const SC = `${API_URL}/operations/scheduling`;

  let r;
  await sleep(300);
  r = await http("GET", `${SC}/orders`);
  record("scheduling", "GET /operations/scheduling/orders", r);

  await sleep(300);
  r = await http("GET", `${SC}/kpis`);
  record("scheduling", "GET /operations/scheduling/kpis", r);

  await sleep(300);
  r = await http("GET", `${SC}/audit-logs`);
  record("scheduling", "GET /operations/scheduling/audit-logs", r);

  await sleep(300);
  r = await http("GET", `${SC}/blocked-days`);
  record("scheduling", "GET /operations/scheduling/blocked-days", r);

  await sleep(300);
  r = await http("GET", `${SC}/notifications`);
  record("scheduling", "GET /operations/scheduling/notifications", r);

  await sleep(300);
  r = await http("GET", `${SC}/gantt`);
  record("scheduling", "GET /operations/scheduling/gantt", r);

  await sleep(300);
  r = await http("POST", `${SC}/validate-hos`, {
    driverId: "test", scheduledStart: "2026-05-07T08:00:00Z", scheduledEnd: "2026-05-07T18:00:00Z"
  });
  record("scheduling", "POST /operations/scheduling/validate-hos", r);

  await sleep(300);
  r = await http("POST", `${SC}/detect-conflicts`, { orders: [], drivers: [], vehicles: [] });
  record("scheduling", "POST /operations/scheduling/detect-conflicts", r);
}

// ══════════════════════════════════════════════════════════
// 3. WORKFLOWS — endpoints que el frontend USA
// ══════════════════════════════════════════════════════════
async function testWorkflows() {
  header("WORKFLOWS");
  const WF = `${API_URL}/master/workflows`;

  let r, workflowId;

  await sleep(300);
  r = await http("GET", WF);
  record("workflows", "GET /master/workflows (listar)", r);
  const wfList = unwrap(r.body);
  workflowId = Array.isArray(wfList) && wfList[0]?.id;

  await sleep(300);
  r = await http("GET", `${WF}/active`);
  record("workflows", "GET /master/workflows/active", r);

  await sleep(300);
  r = await http("GET", `${WF}/default`);
  record("workflows", "GET /master/workflows/default", r, [200, 404]); // 404 ok si no hay default

  await sleep(300);
  r = await http("GET", `${WF}/helpers/available-geofences`);
  record("workflows", "GET /master/workflows/helpers/available-geofences", r);

  await sleep(300);
  r = await http("GET", `${WF}/helpers/available-customers`);
  record("workflows", "GET /master/workflows/helpers/available-customers", r);

  if (workflowId) {
    await sleep(300);
    r = await http("GET", `${WF}/${workflowId}`);
    record("workflows", "GET /master/workflows/:id", r);

    await sleep(300);
    r = await http("GET", `${WF}/${workflowId}/validate-geofences`);
    record("workflows", "GET /master/workflows/:id/validate-geofences", r);

    await sleep(300);
    r = await http("GET", `${WF}/${workflowId}/schedule-duration`);
    record("workflows", "GET /master/workflows/:id/schedule-duration", r);
  }
}

// ══════════════════════════════════════════════════════════
// 4. BITACORA — endpoints que el frontend USA
// ══════════════════════════════════════════════════════════
async function testBitacora() {
  header("BITACORA");
  const BT = `${API_URL}/bitacora`;

  let r;
  await sleep(300);
  r = await http("GET", `${BT}?pageSize=10`);
  record("bitacora", "GET /bitacora (listar)", r);

  await sleep(300);
  r = await http("GET", `${BT}/stats`);
  record("bitacora", "GET /bitacora/stats", r);

  await sleep(300);
  r = await http("GET", `${BT}/summary/vehicles`);
  record("bitacora", "GET /bitacora/summary/vehicles", r);

  await sleep(300);
  r = await http("GET", `${BT}/summary/geofences`);
  record("bitacora", "GET /bitacora/summary/geofences", r);

  await sleep(300);
  r = await http("GET", `${BT}/geofence-breaches`);
  record("bitacora", "GET /bitacora/geofence-breaches", r);

  await sleep(300);
  r = await http("GET", `${BT}/export?format=csv`);
  record("bitacora", "GET /bitacora/export?format=csv", r);
}

// ══════════════════════════════════════════════════════════
// REPORTE FINAL
// ══════════════════════════════════════════════════════════
function printSummary() {
  console.log("");
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║              REPORTE FINAL OPERACIONES (E2E REAL)             ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log("");

  let totalOk = 0, totalAll = 0;
  for (const sub of ["orders", "scheduling", "workflows", "bitacora"]) {
    const list = RESULTS[sub];
    const ok = list.filter(x => x.ok).length;
    const all = list.length;
    totalOk += ok;
    totalAll += all;
    const pct = all === 0 ? 0 : Math.round((ok / all) * 100);
    const color = pct >= 90 ? C.green : pct >= 70 ? C.yellow : C.red;
    console.log(`  ${C.bold}${sub.toUpperCase().padEnd(12)}${C.reset} ${color}${ok}/${all} (${pct}%)${C.reset}`);
    list.forEach(x => {
      const icon = x.ok ? `${C.green}✓` : `${C.red}✗`;
      console.log(`    ${icon} ${x.label.padEnd(60)} ${x.status}${C.reset}`);
    });
    console.log("");
  }
  const totalPct = Math.round((totalOk / totalAll) * 100);
  console.log(`  ${C.bold}TOTAL OPERACIONES: ${totalOk}/${totalAll} (${totalPct}%)${C.reset}`);
  console.log("");
}

async function main() {
  console.log(`${C.bold}${C.cyan}TEST E2E CONSOLIDADO — Modulo OPERACIONES${C.reset}`);
  console.log(`${C.dim}Backend: ${API_BASE}${C.reset}`);
  console.log(`${C.dim}Solo endpoints que el frontend USA realmente.${C.reset}`);

  const ctx = await setup();
  await testOrders(ctx);
  await testScheduling();
  await testWorkflows();
  await testBitacora();
  printSummary();
}

main().catch(e => { console.error(e); process.exit(1); });
