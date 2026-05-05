#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO SCHEDULING
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
  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
}

async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO SCHEDULING${C.reset}`);
  await login();

  const SC = `${API_URL}/operations/scheduling`;

  header("LECTURAS / KPIS");
  await sleep(PAUSE);
  let r = await http("GET", `${SC}/orders`);
  record(`GET /operations/scheduling/orders`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/kpis`);
  record(`GET /operations/scheduling/kpis`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/audit-logs`);
  record(`GET /operations/scheduling/audit-logs`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/blocked-days`);
  record(`GET /operations/scheduling/blocked-days`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/notifications`);
  record(`GET /operations/scheduling/notifications`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/gantt`);
  record(`GET /operations/scheduling/gantt`, r.status, r.ok, r.latencyMs);

  header("VALIDACIONES / ASIGNACIONES");
  await sleep(PAUSE);
  r = await http("POST", `${SC}/validate-hos`, { body: { driverId: "test", scheduledStart: "2026-05-04T08:00:00Z", scheduledEnd: "2026-05-04T18:00:00Z" } });
  record(`POST /operations/scheduling/validate-hos`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${SC}/detect-conflicts`, { body: { orders: [], drivers: [], vehicles: [] } });
  record(`POST /operations/scheduling/detect-conflicts`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${SC}/auto-schedule`, { body: { orderIds: [], constraints: {} } });
  record(`POST /operations/scheduling/auto-schedule`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${SC}/assign`, { body: { orderId: "test", driverId: "test", vehicleId: "test" } });
  record(`POST /operations/scheduling/assign`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${SC}/reschedule`, { body: { orderId: "test", newStart: "2026-05-04T10:00:00Z" } });
  record(`POST /operations/scheduling/reschedule`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${SC}/bulk-assign`, { body: { assignments: [] } });
  record(`POST /operations/scheduling/bulk-assign`, r.status, r.ok, r.latencyMs);

  header("BLOCKED DAYS / SUGGESTIONS");
  await sleep(PAUSE);
  r = await http("POST", `${SC}/block-day`, { body: { date: "2026-12-25", reason: "Navidad" } });
  record(`POST /operations/scheduling/block-day`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/suggestions/test-order-id`);
  record(`GET /operations/scheduling/suggestions/:orderId`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${SC}/workflow-info/test-wf-id`);
  record(`GET /operations/scheduling/workflow-info/:wfId`, r.status, r.ok, r.latencyMs);

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
