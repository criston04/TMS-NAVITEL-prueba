#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO WORKFLOWS
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

function record(name, status, ok, latency, notes = "") {
  RESULTS.push({ name, status, ok, latency, notes });
  const icon = ok ? `${C.green}✅` : status === 0 ? `${C.red}💥` : `${C.red}❌`;
  log(`  ${icon} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(60)} ${C.dim}${latency}ms${C.reset}  ${notes}`);
}

async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, { body: { username: LOGIN_USER, password: LOGIN_PASSWORD }, token: null });
  if (!r.ok) { log(`${C.red}✗ Login FAIL${C.reset}`); process.exit(1); }
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  if (!TOKEN) { log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

function buildWorkflowPayload(suffix) {
  return {
    code: `WF-TEST-${suffix}`,
    name: `Workflow Test ${suffix}`,
    description: "Workflow de test E2E",
    status: "active",
    triggerEvent: "order_created",
    actions: [
      { type: "notify", target: "manager", message: "Nueva orden creada" },
    ],
    applicableCargoTypes: ["general"],
    applicableCustomerIds: [],
    applicableCarrierIds: [],
    steps: [
      { id: "s1", name: "Recoger en almacen", sequence: 1, estimatedDuration: 30, type: "pickup" },
      { id: "s2", name: "Entregar al cliente", sequence: 2, estimatedDuration: 60, type: "delivery" },
    ],
    escalationRules: [],
  };
}

async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO WORKFLOWS${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  // GET listar
  header("LISTAR / QUERIES");
  await sleep(PAUSE);
  let r = await http("GET", `${API_URL}/master/workflows`);
  record(`GET /workflows`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/master/workflows/active`);
  record(`GET /workflows/active`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/master/workflows/default`);
  record(`GET /workflows/default`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/master/workflows/helpers/available-geofences`);
  record(`GET /workflows/helpers/available-geofences`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/master/workflows/helpers/available-customers`);
  record(`GET /workflows/helpers/available-customers`, r.status, r.ok, r.latencyMs);

  // POST crear
  header("CRUD");
  const suffix = String(Date.now()).slice(-6);
  await sleep(PAUSE);
  const payload = buildWorkflowPayload(suffix);
  r = await http("POST", `${API_URL}/master/workflows`, { body: payload });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /workflows (crear)`, r.status, r.ok && !!id, r.latencyMs, id ? `id=${String(id).slice(0,8)}…` : (r.data?.message || ""));

  if (id) {
    await sleep(PAUSE);
    r = await http("GET", `${API_URL}/master/workflows/${id}`);
    record(`GET /workflows/:id`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");

    await sleep(PAUSE);
    r = await http("PUT", `${API_URL}/master/workflows/${id}`, { body: { name: "Updated test" } });
    record(`PUT /workflows/:id`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");

    await sleep(PAUSE);
    r = await http("PATCH", `${API_URL}/master/workflows/${id}/status`, { body: { status: "inactive" } });
    record(`PATCH /workflows/:id/status`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("POST", `${API_URL}/master/workflows/${id}/duplicate`, { body: { newName: "Copia test" } });
    record(`POST /workflows/:id/duplicate`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("GET", `${API_URL}/master/workflows/${id}/validate-geofences`);
    record(`GET /workflows/:id/validate-geofences`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("GET", `${API_URL}/master/workflows/${id}/schedule-duration`);
    record(`GET /workflows/:id/schedule-duration`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("DELETE", `${API_URL}/master/workflows/${id}`);
    record(`DELETE /workflows/:id`, r.status, r.ok, r.latencyMs);
  }

  // RESUMEN
  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                          RESUMEN FINAL                                ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);

  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = RESULTS.filter(r => !r.ok && r.status !== 0).length;

  log("");
  log(`${C.bold}DETALLE:${C.reset}`);
  log("");
  RESULTS.forEach(r => {
    const icon = r.ok ? `${C.green}✅` : r.status === 0 ? `${C.red}💥` : `${C.red}❌`;
    log(`  ${icon} [${String(r.status).padStart(3)}] ${r.name.padEnd(60)} ${C.dim}${r.notes}${C.reset}`);
  });

  log("");
  log(`  Total:    ${total}`);
  log(`  ${C.green}OK:       ${ok}${C.reset}`);
  log(`  ${C.red}Fallando: ${fail}${C.reset}`);
  log("");
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${((ok/total)*100).toFixed(1)}%${C.reset}`);
}

main().catch(err => { log(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`); console.error(err); process.exit(1); });
