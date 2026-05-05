#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO CUSTOMERS
 *
 * Prueba TODOS los endpoints del módulo Customers documentados en la tabla
 * maestra del backend, separa los que requieren GPS o features no disponibles,
 * y al final calcula un % EXACTO de funcionalidad.
 *
 * USO:
 *   node otros/testing/test-customers-full.mjs
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
function header(t) {
  log("");
  log(`${C.bold}${C.cyan}═══ ${t} ═══${C.reset}`);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAUSE = 3000;
const RETRY_429 = [5000, 10000, 20000];

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 0; attempt <= RETRY_429.length; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      const result = { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data, raw };
      if (res.status === 429 && attempt < RETRY_429.length) {
        await sleep(RETRY_429[attempt]); continue;
      }
      return result;
    } catch (err) {
      if (attempt < RETRY_429.length) { await sleep(RETRY_429[attempt]); continue; }
      return { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
    }
  }
}

function unwrap(d) { if (!d) return null; if (Array.isArray(d)) return d; if (d.data) return d.data; if (d.items) return d.items; return d; }
function unwrapList(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

function record(name, status, ok, latency, notes = "") {
  RESULTS.push({ name, status, ok, latency, notes });
  const icon = ok ? `${C.green}✅` : status === 0 ? `${C.red}💥` : `${C.red}❌`;
  log(`  ${icon} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(58)} ${C.dim}${latency}ms${C.reset}  ${notes}`);
}

// ═══════════════════════════════════════════════════════════════
async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, {
    body: { username: LOGIN_USER, password: LOGIN_PASSWORD }, token: null,
  });
  if (!r.ok) { log(`${C.red}✗ Login FAIL${C.reset}`); process.exit(1); }
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  if (!TOKEN) { log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: construir payload de cliente
// ═══════════════════════════════════════════════════════════════
function buildCustomerPayload(suffix) {
  return {
    code: `CUST-TEST-${suffix}`,
    type: "company",
    document_type: "RUC",
    document_number: `20${String(suffix).padStart(9, "0")}`,
    name: `Empresa Test E2E ${suffix}`,
    trade_name: `TestCorp ${suffix}`,
    email: `test-${suffix}@example.com`,
    phone: `+51 999 ${String(suffix).slice(-6).padStart(6, "0")}`,
    address: "Av. Test 123, Lima",
    category: "standard",
    credit_limit: 50000,
    addresses: [
      {
        label: "Principal",
        street: "Av. Industrial 123",
        city: "Lima",
        state: "Lima",
        country: "PE",
        is_default: true,
        lat: -12.046374,
        lng: -77.042793,
      },
    ],
    contacts: [
      {
        name: `Contacto Test ${suffix}`,
        email: `contact-${suffix}@example.com`,
        phone: "+51 999 333 444",
        position: "Gerente Logística",
        is_primary: true,
        notify_deliveries: true,
        notify_incidents: true,
      },
    ],
    billing_config: {
      payment_terms: "30_days",
      currency: "PEN",
      requires_po: false,
      billing_email: `billing-${suffix}@example.com`,
      volume_discount: 5,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// TESTS — CRUD
// ═══════════════════════════════════════════════════════════════
async function testCreate(suffix) {
  header(`CRUD — POST /master/customers (crear)`);
  await sleep(PAUSE);
  const payload = buildCustomerPayload(suffix);
  const r = await http("POST", `${API_URL}/master/customers`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /master/customers (crear)`, r.status, r.ok && !!id, r.latencyMs,
    id ? `id=${id.slice(0, 8)}…` : "sin id");
  return id ? created : null;
}

async function testList() {
  header(`CRUD — GET /master/customers`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers?pageSize=20`);
  const list = unwrapList(r.data);
  record(`GET /master/customers (listar)`, r.status, r.ok, r.latencyMs,
    `${list.length} clientes`);
  return list;
}

async function testGetById(id) {
  header(`CRUD — GET /master/customers/:id`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/${id}`);
  record(`GET /master/customers/:id (detalle)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "BUG NGINX :id");
  return r.ok ? unwrap(r.data) : null;
}

async function testUpdate(id) {
  header(`CRUD — PUT /master/customers/:id`);
  await sleep(PAUSE);
  const r = await http("PUT", `${API_URL}/master/customers/${id}`, {
    body: { trade_name: "TestCorp Updated", phone: "+51 999 000 000" },
  });
  record(`PUT /master/customers/:id (actualizar)`, r.status, r.ok, r.latencyMs,
    r.ok ? "" : "BUG NGINX :id");
  return r.ok;
}

async function testToggleStatus(id) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/customers/${id}/toggle-status`);
  record(`POST /master/customers/:id/toggle-status`, r.status, r.ok, r.latencyMs);
}

async function testStatusPatch(id) {
  await sleep(PAUSE);
  const r = await http("PATCH", `${API_URL}/master/customers/${id}/status`, {
    body: { status: "inactive" },
  });
  record(`PATCH /master/customers/:id/status`, r.status, r.ok, r.latencyMs);
}

async function testDelete(id) {
  header(`CRUD — DELETE /master/customers/:id`);
  await sleep(PAUSE);
  const r = await http("DELETE", `${API_URL}/master/customers/${id}`);
  record(`DELETE /master/customers/:id`, r.status, r.ok, r.latencyMs);
}

// ═══════════════════════════════════════════════════════════════
// TESTS — STATS Y QUERIES ESPECIALES
// ═══════════════════════════════════════════════════════════════
async function testStats() {
  header(`STATS — GET /master/customers/stats`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/stats`);
  const stats = unwrap(r.data);
  record(`GET /master/customers/stats`, r.status, r.ok, r.latencyMs,
    stats?.total !== undefined ? `total=${stats.total}` : "");
}

async function testCities() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/cities`);
  const cities = unwrap(r.data);
  record(`GET /master/customers/cities`, r.status, r.ok, r.latencyMs,
    Array.isArray(cities) ? `${cities.length} ciudades` : "");
}

async function testFindByDocumentQuery(docNumber) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/find-by-document?documentNumber=${docNumber}`);
  record(`GET /master/customers/find-by-document?documentNumber=`, r.status, r.ok, r.latencyMs);
}

async function testByDocumentPath(docNumber) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/by-document/${docNumber}`);
  record(`GET /master/customers/by-document/:documentNumber`, r.status, r.ok, r.latencyMs);
}

async function testOperationalStats(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/${id}/operational-stats`);
  record(`GET /master/customers/:id/operational-stats`, r.status, r.ok, r.latencyMs);
}

async function testCustomerOrders(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/${id}/orders`);
  record(`GET /master/customers/:id/orders`, r.status, r.ok, r.latencyMs);
}

async function testRefreshStats(id) {
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/customers/${id}/refresh-stats`, { body: {} });
  record(`POST /master/customers/:id/refresh-stats`, r.status, r.ok, r.latencyMs);
}

// ═══════════════════════════════════════════════════════════════
// TESTS — BULK / IMPORT / EXPORT
// ═══════════════════════════════════════════════════════════════
async function testBulkDelete(ids) {
  header(`BULK — POST /master/customers/bulk-delete`);
  await sleep(PAUSE);
  const r = await http("POST", `${API_URL}/master/customers/bulk-delete`, {
    body: { ids },
  });
  record(`POST /master/customers/bulk-delete`, r.status, r.ok, r.latencyMs,
    r.ok ? `eliminados ${ids.length}` : "");
}

async function testImport() {
  header(`IMPORT — POST /master/customers/import`);
  await sleep(PAUSE);
  // El backend espera un ARRAY DIRECTO, no { customers: [...] }
  const importPayload = buildCustomerPayload(`IMPORT-${Date.now() % 1000}`);
  const r = await http("POST", `${API_URL}/master/customers/import`, {
    body: [importPayload],
  });
  record(`POST /master/customers/import`, r.status, r.ok, r.latencyMs);
}

async function testExportCSV() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/customers/export/csv`);
  record(`GET /master/customers/export/csv`, r.status, r.ok, r.latencyMs);
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO CUSTOMERS${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  // ─── CRUD principal ──────────────────────────
  const suffix = String(Date.now()).slice(-6);
  const created = await testCreate(suffix);
  if (!created) {
    log(`${C.red}✗ No se pudo crear cliente. Abortando.${C.reset}`);
    process.exit(1);
  }
  const id1 = created.id;
  const docNumber = created.document_number || created.documentNumber;

  await testList();
  await testGetById(id1);
  await testUpdate(id1);

  // ─── Stats / queries ────────────────────────
  header("STATS / QUERIES");
  await testStats();
  await testCities();
  await testFindByDocumentQuery(docNumber);
  await testByDocumentPath(docNumber);
  await testOperationalStats(id1);
  await testCustomerOrders(id1);
  await testRefreshStats(id1);

  // ─── Acciones de status ─────────────────────
  header("ACCIONES DE STATUS");
  await testToggleStatus(id1);
  await testStatusPatch(id1);

  // ─── Bulk / import / export ─────────────────
  await testImport();
  await testExportCSV();

  // ─── Crear segundo cliente para bulk delete ─
  const created2 = await testCreate(`${suffix}-2`);
  if (created2) {
    await testBulkDelete([created2.id]);
  }

  // ─── Delete del primero ─────────────────────
  await testDelete(id1);

  // ════════════════════════════════════════════════════════════
  // RESUMEN
  // ════════════════════════════════════════════════════════════
  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                          RESUMEN FINAL                                ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);

  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = RESULTS.filter(r => !r.ok && r.status !== 0).length;
  const errors = RESULTS.filter(r => r.status === 0).length;

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

  log("");
  const pctTotal = ((ok / total) * 100).toFixed(1);
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${pctTotal}%${C.reset}`);

  if (parseFloat(pctTotal) >= 80) {
    log(`${C.green}${C.bold}✓ MÓDULO CUSTOMERS: ${pctTotal}% FUNCIONAL${C.reset}`);
  } else if (parseFloat(pctTotal) >= 50) {
    log(`${C.yellow}${C.bold}⚠ MÓDULO CUSTOMERS: ${pctTotal}% FUNCIONAL — bugs reportables${C.reset}`);
  } else {
    log(`${C.red}${C.bold}✗ MÓDULO CUSTOMERS: ${pctTotal}% FUNCIONAL — múltiples bugs críticos${C.reset}`);
  }
}

main().catch(err => {
  log(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`);
  console.error(err);
  process.exit(1);
});
