#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO OPERATORS (Operadores Logisticos)
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

async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, { body: { username: LOGIN_USER, password: LOGIN_PASSWORD }, token: null });
  if (!r.ok) { log(`${C.red}✗ Login FAIL${C.reset}`); process.exit(1); }
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  if (!TOKEN) { log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

function buildOperatorPayload(suffix) {
  // Generar RUC valido peruano (11 digitos, empieza con 10/15/16/17/20)
  const ruc = `20${String(suffix).padStart(9, "1")}`.slice(0, 11);
  return {
    code: `OPL-${suffix}`,
    type: "carrier",
    document_type: "RUC",
    document_number: ruc,
    ruc: ruc,
    name: `Operador Test ${suffix}`,
    business_name: `Operador Test ${suffix} SAC`,
    trade_name: `OpTest${suffix}`,
    contact_name: "Juan Contacto",
    email: `op-${suffix}@example.com`,
    phone: "+51 999 111 222",
    address: "Av. Operadores 123",
    fiscal_address: "Av. Operadores 123, Lima",
    city: "Lima",
    country: "PE",
    contract_start_date: "2025-01-01",
    contract_end_date: "2026-12-31",
    notes: "Operador de test E2E",
    contacts: [
      { name: "Juan Contacto", position: "Gerente", email: `juan-${suffix}@example.com`, phone: "+51 999 111 222", is_primary: true },
    ],
  };
}

async function testCreate(suffix) {
  header(`CRUD — POST /master/operators (crear)`);
  await sleep(PAUSE);
  const payload = buildOperatorPayload(suffix);
  const r = await http("POST", `${API_URL}/master/operators`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /master/operators (crear)`, r.status, r.ok && !!id, r.latencyMs, id ? `id=${id.slice(0, 8)}…` : (r.data?.message || "sin id"));
  return id ? created : null;
}

async function testList() {
  header(`CRUD — GET /master/operators`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators?pageSize=20`);
  const list = unwrapList(r.data);
  record(`GET /master/operators (listar)`, r.status, r.ok, r.latencyMs, `${list.length} operadores`);
  return list;
}

async function testGetById(id) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators/${id}`);
  record(`GET /master/operators/:id (detalle)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testUpdate(id) {
  await sleep(PAUSE);
  const r = await http("PUT", `${API_URL}/master/operators/${id}`, {
    body: { phone: "+51 999 000 000", notes: "Actualizado test" },
  });
  record(`PUT /master/operators/:id (actualizar)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testDelete(id) {
  await sleep(PAUSE);
  const r = await http("DELETE", `${API_URL}/master/operators/${id}`);
  record(`DELETE /master/operators/:id`, r.status, r.ok, r.latencyMs);
}

async function testStats() {
  header(`STATS — GET /master/operators/stats`);
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators/stats`);
  const stats = unwrap(r.data);
  record(`GET /master/operators/stats`, r.status, r.ok, r.latencyMs,
    stats?.total !== undefined ? `total=${stats.total}` : "");
}

async function testByRuc(ruc) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators/by-ruc/${ruc}`);
  record(`GET /master/operators/by-ruc/:ruc`, r.status, r.ok, r.latencyMs);
}

async function testByCode(code) {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators/by-code/${code}`);
  record(`GET /master/operators/by-code/:code`, r.status, r.ok, r.latencyMs);
}

async function testSearch() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators?search=Test`);
  record(`GET /master/operators?search=Test`, r.status, r.ok, r.latencyMs);
}

async function testEnabled() {
  await sleep(PAUSE);
  const r = await http("GET", `${API_URL}/master/operators?status=active`);
  record(`GET /master/operators?status=active`, r.status, r.ok, r.latencyMs);
}

async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO OPERATORS${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  const suffix = String(Date.now()).slice(-6);
  const created = await testCreate(suffix);
  if (!created) { log(`${C.red}✗ No se pudo crear operator. Aborto.${C.reset}`); process.exit(1); }
  const id1 = created.id;
  const ruc = created.ruc || created.document_number;
  const code = created.code;

  await testList();
  await testGetById(id1);
  await testUpdate(id1);

  header("STATS / QUERIES");
  await testStats();
  await testByRuc(ruc);
  await testByCode(code);
  await testSearch();
  await testEnabled();

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
