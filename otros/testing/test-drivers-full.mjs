#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO DRIVERS
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
function buildDriverPayload(suffix) {
  return {
    code: `DRV-TEST-${suffix}`,
    document_type: "DNI",
    document_number: String(suffix).padStart(8, "4"),
    first_name: `Conductor Test`,
    last_name: `${suffix}`,
    birth_date: "1985-06-15",
    email: `driver-${suffix}@example.com`,
    phone: "+51 999 111 222",
    address: "Av. Test 123",
    hire_date: "2022-03-01",
    blood_type: "O+",
    operator_id: null,
    license: {
      category: "AIII",
      number: `Q${String(suffix).padStart(8, "1")}`,
      issue_date: "2020-06-15",
      expiry_date: "2027-06-15",
      issuing_authority: "MTC",
      issuing_country: "PE",
    },
    emergency_contact: {
      name: "Rosa Perez",
      relationship: "spouse",
      phone: "+51 999 555 666",
    },
  };
}

// ═══════════════════════════════════════════════════════════════
async function testCreate(suffix) {
  header(`CRUD — POST /master/drivers (crear)`);
  await sleep(PAUSE);
  const payload = buildDriverPayload(suffix);
  const r = await http("POST", `${API_URL}/master/drivers`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /master/drivers (crear)`, r.status, r.ok && !!id, r.latencyMs, id ? `id=${id.slice(0, 8)}…` : "sin id");
  return id ? created : null;
}

async function testList() {
  header(`CRUD — GET /master/drivers`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers?pageSize=20`);
  const list = unwrapList(r.data);
  record(`GET /master/drivers (listar)`, r.status, r.ok, r.latencyMs, `${list.length} conductores`);
  return list;
}

async function testGetById(id) {
  header(`CRUD — GET /master/drivers/:id`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers/${id}`);
  // Estado: en Excel oficial pero NO implementado por el backend en producccion.
  record(`GET /master/drivers/:id (detalle)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testUpdate(id) {
  header(`CRUD — PUT /master/drivers/:id`);
  await sleep(PAUSE);
  const r = await http("PUT", `${API_URL}/master/drivers/${id}`, {
    body: { phone: "+51 999 000 000" },
  });
  record(`PUT /master/drivers/:id (actualizar)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testDelete(id) {
  header(`CRUD — DELETE /master/drivers/:id`);
  await sleep(PAUSE);
  const r = await http("DELETE", `${API_URL}/master/drivers/${id}`);
  record(`DELETE /master/drivers/:id`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testStats() {
  header(`STATS — GET /master/drivers/stats`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers/stats`);
  const stats = unwrap(r.data);
  record(`GET /master/drivers/stats`, r.status, r.ok, r.latencyMs,
    stats?.total !== undefined ? `total=${stats.total}` : "");
}

async function testExpiringLicenses() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers/expiring-licenses?daysAhead=30`);
  record(`GET /master/drivers/expiring-licenses`, r.status, r.ok, r.latencyMs);
}

async function testByDocument(docNumber) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers/by-document/${docNumber}`);
  record(`GET /master/drivers/by-document/:documentNumber`, r.status, r.ok, r.latencyMs);
}

async function testChecklist(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/drivers/${id}/checklist`);
  record(`GET /master/drivers/:id/checklist`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "NO esta en Excel oficial; calculo client-side");
}

// 2026-05-03: enable y block ya NO usan endpoints inventados (/enable, /block).
// Ahora se hacen via PATCH /:id/status (path canonico del Excel oficial).
async function testEnableViaStatus(id) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/master/drivers/${id}/status`, {
    body: { status: "active" },
  });
  record(`PATCH /master/drivers/:id/status (active = enable)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testBlockViaStatus(id) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/master/drivers/${id}/status`, {
    body: { status: "blocked", reason: "Test E2E" },
  });
  record(`PATCH /master/drivers/:id/status (blocked = block)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testStatusPatch(id) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/master/drivers/${id}/status`, {
    body: { status: "on_leave", reason: "Vacaciones test" },
  });
  record(`PATCH /master/drivers/:id/status (on_leave)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "Excel: SI / Backend: NO IMPLEMENTADO");
}

async function testAssignVehicle(driverId, vehicleId) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/drivers/${driverId}/assign-vehicle`, {
    body: { vehicle_id: vehicleId },
  });
  record(`POST /master/drivers/:id/assign-vehicle`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "NO en Excel; ver /master/assignments");
}

async function testUnassignVehicle(driverId) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/drivers/${driverId}/unassign-vehicle`, { body: {} });
  record(`POST /master/drivers/:id/unassign-vehicle`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "NO en Excel; ver /master/assignments");
}

async function testBulkDelete(ids) {
  header(`BULK — POST /master/drivers/bulk-delete`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/drivers/bulk-delete`, { body: { ids } });
  record(`POST /master/drivers/bulk-delete`, r.status, r.ok, r.latencyMs,
    r.ok ? `eliminados ${ids.length}` : "");
}

// NOTA: NO probamos POST /import ni POST /export porque la pagina de Drivers
// los maneja CLIENT-SIDE (lee Excel localmente con xlsx-utils, exporta con
// exportToExcel). Aunque BulkService los expone como capacidad heredada, el UI
// de Drivers nunca los invoca. El backend NO necesita implementarlos.
// Customers SI los usa, por eso ahi si los probamos.

// ═══════════════════════════════════════════════════════════════
async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO DRIVERS${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  // CRUD principal
  const suffix = String(Date.now()).slice(-6);
  const created = await testCreate(suffix);
  if (!created) { log(`${C.red}✗ No se pudo crear driver. Aborto.${C.reset}`); process.exit(1); }
  const id1 = created.id;
  const docNumber = created.document_number || created.documentNumber;

  await testList();
  await testGetById(id1);
  await testUpdate(id1);

  // Stats / queries
  header("STATS / QUERIES");
  await testStats();
  await testExpiringLicenses();
  await testByDocument(docNumber);
  await testChecklist(id1);

  // Acciones de status (todas via PATCH /:id/status segun Excel oficial)
  header("ACCIONES DE STATUS");
  await testEnableViaStatus(id1);
  await testBlockViaStatus(id1);
  await testStatusPatch(id1);

  // Asignación vehículo (necesitamos un vehicle_id real)
  header("ASIGNACIÓN VEHÍCULO");
  await sleep(PAUSE);
  const vehicles = await http("GET", `${API_URL}/master/vehicles?pageSize=1`);
  const vehicleId = unwrapList(vehicles.data)[0]?.id;
  if (vehicleId) {
    await testAssignVehicle(id1, vehicleId);
    await testUnassignVehicle(id1);
  } else {
    log(`${C.yellow}⚠ Sin vehículos disponibles, saltando assign tests${C.reset}`);
  }

  // Bulk delete con segundo driver
  const created2 = await testCreate(`${suffix}-2`);
  if (created2) await testBulkDelete([created2.id]);

  // Delete del primero
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
