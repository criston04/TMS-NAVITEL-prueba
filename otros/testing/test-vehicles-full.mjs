#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO VEHICLES
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m", bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
const RESULTS = [];

function log(msg = "") { process.stdout.write(msg + "\n"); }
function header(t) { log(""); log(`${C.bold}${C.cyan}═══ ${t} ═══${C.reset}`); }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAUSE = 3000;
const RETRY_429 = [5000, 10000, 20000];

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt <= RETRY_429.length; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      const result = { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data, raw };
      if (res.status === 429 && attempt < RETRY_429.length) { await sleep(RETRY_429[attempt]); continue; }
      return result;
    } catch (err) {
      if (attempt < RETRY_429.length) { await sleep(RETRY_429[attempt]); continue; }
      return { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
    }
  }
}

function unwrap(d) { if (!d) return null; if (Array.isArray(d)) return d; if (d.data) return d.data; if (d.items) return d.items; return d; }
function unwrapList(d) { if (!d) return []; if (Array.isArray(d)) return d; if (Array.isArray(d.items)) return d.items; if (Array.isArray(d.data)) return d.data; return []; }

function record(name, status, ok, latency, notes = "") {
  RESULTS.push({ name, status, ok, latency, notes });
  const icon = ok ? `${C.green}✅` : status === 0 ? `${C.red}💥` : `${C.red}❌`;
  log(`  ${icon} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(58)} ${C.dim}${latency}ms${C.reset}  ${notes}`);
}

// ═══════════════════════════════════════════════════════════════
async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, { body: { username: LOGIN_USER, password: LOGIN_PASSWORD }, token: null });
  if (!r.ok) { log(`${C.red}✗ Login FAIL${C.reset}`); process.exit(1); }
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  if (!TOKEN) { log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

// ═══════════════════════════════════════════════════════════════
function randomPlate() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const a = letters[Math.floor(Math.random()*letters.length)] + letters[Math.floor(Math.random()*letters.length)] + letters[Math.floor(Math.random()*letters.length)];
  const n = String(Math.floor(Math.random()*900+100));
  return `${a}-${n}`;
}

function buildVehiclePayload(suffix) {
  return {
    code: `VEH-TEST-${suffix}`,
    plate: randomPlate(),
    type: "camion",
    body_type: "furgon",
    brand: "Volvo",
    model: "FH16",
    year: 2022,
    vin: `VIN${String(suffix).padStart(14, "0")}`,
    color: "Blanco",
    fuel_type: "diesel",
    operational_status: "available",
    status: "active",
    current_mileage: 50000,
    capacity_kg: 25000,
    capacity_m3: 80,
    notes: "Vehiculo de test E2E",
    specs: {
      engine_type: "diesel",
      engine_number: `ENG${suffix}`,
      chassis_number: `CHS${suffix}`,
      axles: 3,
      tires: 12,
      fuel_tank_capacity: 400,
      transmission: "manual",
    },
    capacity: {
      max_weight_kg: 25000,
      max_volume_m3: 80,
      max_pallets: 33,
      gross_weight: 35000,
      tare_weight: 10000,
    },
    insurance: {
      type: "SOAT",
      policy_number: `POL-${suffix}`,
      insurer: "Pacifico Seguros",
      start_date: "2025-01-01",
      end_date: "2026-12-31",
      coverage_amount: 100000,
    },
    registration: {
      registration_number: `REG-${suffix}`,
      owner_name: "Grupo Navitel SAC",
      owner_document: "20111222333",
      registration_date: "2022-03-15",
      registry_office: "SUNARP Lima",
    },
  };
}

// ═══════════════════════════════════════════════════════════════
async function testCreate(suffix) {
  header(`CRUD — POST /master/vehicles (crear)`);
  await sleep(PAUSE);
  const payload = buildVehiclePayload(suffix);
  const r = await http("POST", `${API_URL}/master/vehicles`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /master/vehicles (crear)`, r.status, r.ok && !!id, r.latencyMs, id ? `id=${id.slice(0, 8)}…` : "sin id");
  return id ? created : null;
}

async function testList() {
  header(`CRUD — GET /master/vehicles`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/vehicles?pageSize=20`);
  const list = unwrapList(r.data);
  record(`GET /master/vehicles (listar)`, r.status, r.ok, r.latencyMs, `${list.length} vehiculos`);
  return list;
}

async function testGetById(id) {
  header(`CRUD — GET /master/vehicles/:id`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/vehicles/${id}`);
  record(`GET /master/vehicles/:id (detalle)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testUpdate(id) {
  header(`CRUD — PUT /master/vehicles/:id`);
  await sleep(PAUSE);
  const r = await http("PUT", `${API_URL}/master/vehicles/${id}`, {
    body: { current_mileage: 51000, notes: "Actualizado por test" },
  });
  record(`PUT /master/vehicles/:id (actualizar)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testDelete(id) {
  header(`CRUD — DELETE /master/vehicles/:id`);
  await sleep(PAUSE);
  const r = await http("DELETE", `${API_URL}/master/vehicles/${id}`);
  record(`DELETE /master/vehicles/:id`, r.status, r.ok, r.latencyMs);
}

async function testStats() {
  header(`STATS — GET /master/vehicles/stats`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/vehicles/stats`);
  const stats = unwrap(r.data);
  record(`GET /master/vehicles/stats`, r.status, r.ok, r.latencyMs,
    stats?.total !== undefined ? `total=${stats.total}` : "");
}

async function testByPlate(plate) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/vehicles/by-plate/${plate}`);
  record(`GET /master/vehicles/by-plate/:plate`, r.status, r.ok, r.latencyMs);
}

async function testChecklist(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/vehicles/${id}/checklist`);
  record(`GET /master/vehicles/:id/checklist`, r.status, r.ok, r.latencyMs);
}

async function testEnable(id) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/vehicles/${id}/enable`, { body: {} });
  record(`POST /master/vehicles/:id/enable`, r.status, r.ok, r.latencyMs);
}

async function testBlock(id) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/vehicles/${id}/block`, {
    body: { reason: "Test E2E" },
  });
  record(`POST /master/vehicles/:id/block`, r.status, r.ok, r.latencyMs);
}

async function testAssignDriver(vehicleId, driverId) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/vehicles/${vehicleId}/assign-driver`, {
    body: { driverId },
  });
  record(`POST /master/vehicles/:id/assign-driver`, r.status, r.ok, r.latencyMs);
}

async function testUnassignDriver(vehicleId) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/vehicles/${vehicleId}/unassign-driver`, { body: {} });
  record(`POST /master/vehicles/:id/unassign-driver`, r.status, r.ok, r.latencyMs);
}

async function testBulkDelete(ids) {
  header(`BULK — POST /master/vehicles/bulk-delete`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/vehicles/bulk-delete`, { body: { ids } });
  record(`POST /master/vehicles/bulk-delete`, r.status, r.ok, r.latencyMs,
    r.ok ? `eliminados ${ids.length}` : "");
}

// ═══════════════════════════════════════════════════════════════
async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO VEHICLES${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  const suffix = String(Date.now()).slice(-6);
  const created = await testCreate(suffix);
  if (!created) { log(`${C.red}✗ No se pudo crear vehicle. Aborto.${C.reset}`); process.exit(1); }
  const id1 = created.id;
  const plate = created.plate;

  await testList();
  await testGetById(id1);
  await testUpdate(id1);

  header("STATS / QUERIES");
  await testStats();
  await testByPlate(plate);
  await testChecklist(id1);

  header("ACCIONES DE STATUS");
  await testEnable(id1);
  await testBlock(id1);

  header("ASIGNACION CONDUCTOR");
  await sleep(PAUSE);
  const drivers = await http("GET", `${API_URL}/master/drivers?pageSize=1`);
  const driverId = unwrapList(drivers.data)[0]?.id;
  if (driverId) {
    await testAssignDriver(id1, driverId);
    await testUnassignDriver(id1);
  } else {
    log(`${C.yellow}⚠ Sin drivers disponibles, saltando assign tests${C.reset}`);
  }

  const created2 = await testCreate(`${suffix}-2`);
  if (created2) await testBulkDelete([created2.id]);

  await testDelete(id1);

  // RESUMEN
  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                          RESUMEN FINAL                                ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);

  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = RESULTS.filter(r => !r.ok && r.status !== 0).length;

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

  const pctTotal = ((ok / total) * 100).toFixed(1);
  log("");
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${pctTotal}%${C.reset}`);
}

main().catch(err => { log(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`); console.error(err); process.exit(1); });
