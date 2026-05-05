#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO ORDERS
 *
 * Prueba TODOS los endpoints del módulo Orders documentados en Rev3,
 * separa los que requieren GPS (no aplica para esta instalación) y al
 * final calcula un % EXACTO de funcionalidad.
 *
 * USO:
 *   node otros/testing/test-orders-full.mjs
 *
 * OUTPUT:
 *   - Logs detallados por endpoint
 *   - Tabla resumen al final
 *   - % de funcionalidad real
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", magenta: "\x1b[35m", gray: "\x1b[90m",
  bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
const RESULTS = [];

function log(msg = "") { process.stdout.write(msg + "\n"); }
function header(t) {
  log("");
  log(`${C.bold}${C.cyan}═══ ${t} ═══${C.reset}`);
}

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Retry-on-429 con backoff: si el backend rate-limita, esperar y reintentar
  // hasta 3 veces antes de darnos por vencidos.
  const retryDelays = [5000, 10000, 20000];
  let lastResult = null;

  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const raw = await res.text();
      let data;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }

      lastResult = { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data, raw };

      // Si es 429 y aún tenemos retries, esperar y reintentar
      if (res.status === 429 && attempt < retryDelays.length) {
        process.stdout.write(`${C.yellow}    ⏳ 429 — esperando ${retryDelays[attempt]/1000}s...${C.reset}\n`);
        await sleep(retryDelays[attempt]);
        continue;
      }

      return lastResult;
    } catch (err) {
      lastResult = { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
      if (attempt < retryDelays.length) {
        await sleep(retryDelays[attempt]);
        continue;
      }
      return lastResult;
    }
  }
  return lastResult;
}

function unwrap(d) {
  if (!d) return null;
  if (Array.isArray(d)) return d;
  if (d.data) return d.data;
  if (d.items) return d.items;
  return d;
}

function unwrapList(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.data)) return d.data;
  if (d.data?.orders && Array.isArray(d.data.orders)) return d.data.orders;
  if (d.data?.items && Array.isArray(d.data.items)) return d.data.items;
  return [];
}

/** Registra resultado de un test individual */
function record(name, status, ok, latency, notes = "") {
  RESULTS.push({ name, status, ok, latency, notes });
  const icon = ok ? `${C.green}✅` : status === 0 ? `${C.red}💥` : `${C.red}❌`;
  const statusStr = String(status).padEnd(3);
  log(`  ${icon} ${statusStr} ${C.reset}${name.padEnd(58)} ${C.dim}${latency}ms${C.reset}  ${notes}`);
}

/** Pausa para no saturar rate limit del backend */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAUSE = 3000; // 3s entre requests para mantenerse bajo el rate limit

// ════════════════════════════════════════════════════════════════
// SETUP
// ════════════════════════════════════════════════════════════════
async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, {
    body: { username: LOGIN_USER, password: LOGIN_PASSWORD },
    token: null,
  });
  if (!r.ok) {
    log(`${C.red}✗ Login FAIL: ${r.status}${C.reset}`);
    process.exit(1);
  }
  const p = r.data?.data ?? r.data;
  TOKEN = p?.accessToken || p?.token;
  if (!TOKEN) { log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

async function fetchIds() {
  header("SETUP — IDs reales");
  await sleep(PAUSE);
  const cust = await http("GET", `${API_URL}/master/customers?pageSize=5`);
  await sleep(PAUSE);
  const drv = await http("GET", `${API_URL}/master/drivers?pageSize=5`);
  await sleep(PAUSE);
  const veh = await http("GET", `${API_URL}/master/vehicles?pageSize=5`);

  const ids = {
    customerId: unwrapList(cust.data)[0]?.id,
    driverId: unwrapList(drv.data)[0]?.id,
    vehicleId: unwrapList(veh.data)[0]?.id,
  };

  // Tomar un segundo vehículo/conductor para reasignación
  ids.vehicleId2 = unwrapList(veh.data)[1]?.id || ids.vehicleId;
  ids.driverId2 = unwrapList(drv.data)[1]?.id || ids.driverId;

  log(`  customer:  ${ids.customerId}`);
  log(`  driver:    ${ids.driverId}  (alt: ${ids.driverId2})`);
  log(`  vehicle:   ${ids.vehicleId}  (alt: ${ids.vehicleId2})`);

  if (!ids.customerId || !ids.driverId || !ids.vehicleId) {
    log(`${C.red}✗ Faltan master entities${C.reset}`); process.exit(1);
  }
  return ids;
}

// ════════════════════════════════════════════════════════════════
// PAYLOAD HELPER (replica el wizard real)
// ════════════════════════════════════════════════════════════════
function buildOrderPayload(ids, refSuffix) {
  const now = Date.now();
  const start = new Date(now + 86400000).toISOString();      // mañana
  const end = new Date(now + 86400000 + 21600000).toISOString(); // mañana +6h
  return {
    type: "delivery",
    priority: "high",
    customer_id: ids.customerId,
    customer_name: "Test Customer Auto",
    driver_id: ids.driverId,
    driver_name: "Test Driver Auto",
    vehicle_id: ids.vehicleId,
    vehicle_plate: "TST-001",
    origin_address: "Almacén Test - Origen",
    origin_lat: -12.046,
    origin_lng: -77.042,
    destination_address: "Cliente Test - Destino",
    destination_lat: -12.054,
    destination_lng: -77.123,
    scheduled_pickup_at: start,
    scheduled_delivery_at: end,
    estimated_distance_km: 25.5,
    total_weight: 1500,
    total_volume: 5.2,
    total_packages: 10,
    notes: `Test E2E ${refSuffix}`,
    reference: `TEST-FULL-${refSuffix}`,
  };
}

// ════════════════════════════════════════════════════════════════
// TESTS — CRUD
// ════════════════════════════════════════════════════════════════
async function testCreate(ids) {
  header("CRUD — POST /orders");
  await sleep(PAUSE);
  const payload = buildOrderPayload(ids, Date.now());
  const r = await http("POST", `${API_URL}/orders`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record("POST /orders (crear orden)", r.status, r.ok && !!id, r.latencyMs,
    id ? `id=${id.slice(0, 8)}…` : "sin id");
  return id ? created : null;
}

async function testList() {
  header("CRUD — GET /orders");
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders?pageSize=20`);
  const list = unwrapList(r.data);
  record("GET /orders (listar)", r.status, r.ok && list.length >= 0, r.latencyMs,
    `${list.length} órdenes`);
  return list;
}

async function testGetById(id) {
  header(`CRUD — GET /orders/:id`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders/${id}`);
  record(`GET /orders/:id (detalle)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "BUG backend confirmado");
  return r.ok ? unwrap(r.data) : null;
}

async function testUpdate(id) {
  header(`CRUD — PATCH /orders/:id`);
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/orders/${id}`, {
    body: { priority: "urgent", notes: "Test update auto" },
  });
  record(`PATCH /orders/:id (actualizar)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "BUG backend confirmado");
  return r.ok;
}

async function testDelete(id) {
  header(`CRUD — DELETE /orders/:id (solo draft)`);
  await sleep(PAUSE);
  const r = await http("DELETE", `${API_URL}/orders/${id}`);
  record(`DELETE /orders/:id (eliminar draft)`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

// ════════════════════════════════════════════════════════════════
// TESTS — ACCIONES
// ════════════════════════════════════════════════════════════════
async function testChangeStatus(id, newStatus) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/orders/${id}/status`, {
    body: { status: newStatus, reason: "Test E2E auto" },
  });
  record(`PATCH /orders/:id/status → "${newStatus}"`, r.status, r.ok, r.latencyMs,
    r.ok ? `transición OK` : (r.data?.message || "").slice(0, 50));
  return r.ok;
}

async function testAssign(id, ids) {
  header(`ACCIONES — PATCH /orders/:id/assign`);
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/orders/${id}/assign`, {
    body: {
      vehicleId: ids.vehicleId2,
      vehiclePlate: "TST-002",
      driverId: ids.driverId2,
      driverName: "Driver Alt Auto",
    },
  });
  record(`PATCH /orders/:id/assign`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testCancel(id) {
  header(`ACCIONES — POST /orders/:id/cancel`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/orders/${id}/cancel`, {
    body: { reason: "Test E2E auto - cancelación" },
  });
  record(`POST /orders/:id/cancel`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testClose(id) {
  header(`ACCIONES — POST /orders/:id/close`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/orders/${id}/close`, {
    body: { notes: "Test E2E auto - cierre administrativo" },
  });
  record(`POST /orders/:id/close`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "requiere status=completed");
  return r.ok;
}

async function testAddItems(id) {
  header(`ACCIONES — POST /orders/:id/items`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/orders/${id}/items`, {
    body: {
      items: [
        { product_name: "Item Test 1", quantity: 5, unit: "bag", weight: 100, volume: 0.1 },
        { product_name: "Item Test 2", quantity: 3, unit: "box", weight: 50, volume: 0.05 },
      ],
    },
  });
  record(`POST /orders/:id/items`, r.status, r.ok, r.latencyMs,
    r.ok ? `2 items agregados` : "");
  return r.ok;
}

async function testStartTrip(id) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/operations/orders/${id}/start-trip`);
  record(`PATCH /operations/orders/:id/start-trip`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "puede requerir asignación previa");
  return r.ok;
}

// ════════════════════════════════════════════════════════════════
// TESTS — STATS Y QUERIES
// ════════════════════════════════════════════════════════════════
async function testStats() {
  header(`STATS — GET /orders/stats`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders/stats`);
  const stats = unwrap(r.data);
  record(`GET /orders/stats`, r.status, r.ok, r.latencyMs,
    stats?.total !== undefined ? `total=${stats.total}` : "");
  return r.ok;
}

async function testStatusCounts() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/operations/orders/status-counts`);
  const counts = unwrap(r.data);
  record(`GET /operations/orders/status-counts`, r.status, r.ok, r.latencyMs,
    counts ? Object.keys(counts).length + " estados" : "");
  return r.ok;
}

async function testByDriver(driverId) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/operations/orders/by-driver/${driverId}`);
  record(`GET /operations/orders/by-driver/:id`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testByVehicle(vehicleId) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/operations/orders/by-vehicle/${vehicleId}`);
  record(`GET /operations/orders/by-vehicle/:id`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testByNumber(orderNumber) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/operations/orders/by-number/${orderNumber}`);
  record(`GET /operations/orders/by-number/:n`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testWorkflowProgress(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders/${id}/workflow-progress`);
  record(`GET /orders/:id/workflow-progress`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

async function testTracking(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders/${id}/tracking`);
  record(`GET /orders/:id/tracking`, r.status, r.ok, r.latencyMs,
    "(no aplica sin GPS)");
  return r.ok;
}

async function testExport() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/orders/export`);
  record(`GET /orders/export (CSV)`, r.status, r.ok, r.latencyMs);
  return r.ok;
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO ORDERS${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);
  log(`${C.dim}USER:     ${LOGIN_USER}${C.reset}`);

  await login();
  const ids = await fetchIds();

  // ─── Crear orden principal para los tests ──────────────────
  const order1 = await testCreate(ids);
  if (!order1) {
    log(`${C.red}✗ No se pudo crear orden inicial. Abortando.${C.reset}`);
    process.exit(1);
  }
  const id1 = order1.id;
  const orderNum1 = order1.order_number;

  // ─── CRUD ──────────────────────────────────────────────────
  await testList();
  await testGetById(id1);
  await testUpdate(id1);

  // ─── STATS / QUERIES (sin mutar) ───────────────────────────
  header("STATS / QUERIES");
  await testStats();
  await testStatusCounts();
  await testByDriver(ids.driverId);
  await testByVehicle(ids.vehicleId);
  await testByNumber(orderNum1);
  await testWorkflowProgress(id1);
  await testTracking(id1);
  await testExport();

  // ─── ACCIONES (mutación de estado) ─────────────────────────
  // Crear órdenes nuevas para cada acción que muta estado, así no
  // dependen unas de otras.

  // 2. Items
  await testAddItems(id1);

  // 3. Asignación
  await testAssign(id1, ids);

  // 4. Cambio de status: draft → pending
  header("ACCIONES — Transiciones de status");
  await testChangeStatus(id1, "pending");

  // 5. Crear orden para probar cancelación
  log("");
  const order2 = await testCreate(ids);
  if (order2) {
    await testCancel(order2.id);
  }

  // 6. Crear orden para probar start-trip (necesita asignación previa)
  log("");
  const order3 = await testCreate(ids);
  if (order3) {
    await testStartTrip(order3.id);
  }

  // 7. Crear orden para probar close (debería fallar — solo aplica a completed)
  log("");
  const order4 = await testCreate(ids);
  if (order4) {
    await testClose(order4.id);
  }

  // 8. Crear orden para probar delete (solo aplica a draft)
  log("");
  const order5 = await testCreate(ids);
  if (order5) {
    await testDelete(order5.id);
  }

  // ════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ════════════════════════════════════════════════════════════
  log("");
  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                          RESUMEN FINAL                                ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);

  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = RESULTS.filter(r => !r.ok && r.status !== 0).length;
  const errors = RESULTS.filter(r => r.status === 0).length;

  // GPS endpoints (no aplican porque no hay GPS conectado)
  const gpsEndpoints = RESULTS.filter(r => r.notes.includes("(no aplica sin GPS)"));
  const applicable = total - gpsEndpoints.length;
  const applicableOk = ok - gpsEndpoints.filter(r => r.ok).length;

  log("");
  log(`${C.bold}DETALLE POR ENDPOINT:${C.reset}`);
  log("");
  RESULTS.forEach(r => {
    const icon = r.ok ? `${C.green}✅` : r.status === 0 ? `${C.red}💥` : `${C.red}❌`;
    log(`  ${icon} [${String(r.status).padStart(3)}] ${r.name.padEnd(58)} ${C.dim}${r.notes}${C.reset}`);
  });

  log("");
  log(`${C.bold}MÉTRICAS:${C.reset}`);
  log(`  Total endpoints probados:      ${total}`);
  log(`  ${C.green}Funcionando OK:                ${ok}${C.reset}`);
  log(`  ${C.red}Fallando con error HTTP:       ${fail}${C.reset}`);
  log(`  ${C.yellow}Errores de red/conexión:       ${errors}${C.reset}`);
  log(`  ${C.dim}GPS-dependientes (excluidos):  ${gpsEndpoints.length}${C.reset}`);

  log("");
  log(`${C.bold}PORCENTAJES:${C.reset}`);
  const pctTotal = ((ok / total) * 100).toFixed(1);
  const pctApplicable = ((applicableOk / applicable) * 100).toFixed(1);
  log(`  Sobre TOTAL endpoints:         ${C.bold}${pctTotal}%${C.reset}`);
  log(`  Sobre endpoints APLICABLES:    ${C.bold}${C.green}${pctApplicable}%${C.reset} ${C.dim}(excluyendo GPS)${C.reset}`);

  log("");
  log(`${C.bold}DIAGNÓSTICO:${C.reset}`);
  const failed = RESULTS.filter(r => !r.ok);
  if (failed.length === 0) {
    log(`  ${C.green}✓ Todos los endpoints aplicables funcionan${C.reset}`);
  } else {
    log(`  ${C.yellow}Endpoints con problemas:${C.reset}`);
    failed.forEach(f => {
      log(`    ${C.red}✗${C.reset} ${f.name} (HTTP ${f.status}) ${f.notes}`);
    });
  }

  log("");
  if (parseFloat(pctApplicable) >= 90) {
    log(`${C.green}${C.bold}✓ MÓDULO ORDERS: ${pctApplicable}% FUNCIONAL${C.reset}`);
  } else if (parseFloat(pctApplicable) >= 70) {
    log(`${C.yellow}${C.bold}⚠ MÓDULO ORDERS: ${pctApplicable}% FUNCIONAL — bugs reportables al backend${C.reset}`);
  } else {
    log(`${C.red}${C.bold}✗ MÓDULO ORDERS: ${pctApplicable}% FUNCIONAL — múltiples bugs críticos${C.reset}`);
  }
}

main().catch(err => {
  log(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`);
  console.error(err);
  process.exit(1);
});
