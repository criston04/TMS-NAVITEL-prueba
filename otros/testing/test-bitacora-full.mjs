#!/usr/bin/env node
/** TEST E2E COMPLETO — MÓDULO BITACORA */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";

const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };
let TOKEN = null;
const RESULTS = [];
const log = (msg = "") => process.stdout.write(msg + "\n");
const header = (t) => { log(""); log(`${C.bold}${C.cyan}═══ ${t} ═══${C.reset}`); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAUSE = 3000;

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      if (res.status === 429 && attempt < 3) { await sleep([5000,10000,20000][attempt]); continue; }
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data, raw };
    } catch (err) {
      if (attempt < 3) { await sleep([5000,10000,20000][attempt]); continue; }
      return { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
    }
  }
}

function record(name, status, ok, latency, notes = "") {
  RESULTS.push({ name, status, ok, latency, notes });
  const icon = ok ? `${C.green}✅` : `${C.red}❌`;
  log(`  ${icon} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(60)} ${C.dim}${latency}ms${C.reset}  ${notes}`);
}

async function login() {
  header("SETUP — Login");
  const r = await http("POST", LOGIN_URL, { body: { username: LOGIN_USER, password: LOGIN_PASSWORD }, token: null });
  if (!r.ok) { log(`${C.red}✗ Login FAIL${C.reset}`); process.exit(1); }
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  log(`${C.green}✓ Login OK${C.reset}`);
}

async function main() {
  log(`${C.bold}TEST E2E — MÓDULO BITACORA${C.reset}`);
  await login();

  header("LECTURAS");
  await sleep(PAUSE);
  let r = await http("GET", `${API_URL}/bitacora?pageSize=20`);
  record(`GET /bitacora (listar)`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/stats`);
  record(`GET /bitacora/stats`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/summary/vehicles`);
  record(`GET /bitacora/summary/vehicles`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/summary/geofences`);
  record(`GET /bitacora/summary/geofences`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/geofence-breaches`);
  record(`GET /bitacora/geofence-breaches`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/export?format=csv`);
  record(`GET /bitacora/export?format=csv`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/bitacora/vehicle/test-uuid`);
  record(`GET /bitacora/vehicle/:vehicleId`, r.status, r.ok, r.latencyMs);

  header("MUTACIONES (con datos sinteticos)");
  await sleep(PAUSE);
  r = await http("POST", `${API_URL}/bitacora`, { body: { event_type: "test", vehicle_id: "test", description: "test" } });
  record(`POST /bitacora (crear)`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("PUT", `${API_URL}/bitacora/test-uuid/review`, { body: { reviewedBy: "user-test" } });
  record(`PUT /bitacora/:id/review`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("PUT", `${API_URL}/bitacora/test-uuid/dismiss`, { body: { reason: "Falsa alarma" } });
  record(`PUT /bitacora/:id/dismiss`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("PUT", `${API_URL}/bitacora/test-uuid/notes`, { body: { notes: "Nota test" } });
  record(`PUT /bitacora/:id/notes`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("PUT", `${API_URL}/bitacora/test-uuid/assign-order`, { body: { orderId: "test" } });
  record(`PUT /bitacora/:id/assign-order`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("POST", `${API_URL}/bitacora/test-uuid/create-order`, { body: {} });
  record(`POST /bitacora/:id/create-order`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("PUT", `${API_URL}/bitacora/test-uuid/complete`, { body: {} });
  record(`PUT /bitacora/:id/complete`, r.status, r.ok, r.latencyMs);

  log("");
  const total = RESULTS.length, ok = RESULTS.filter(r => r.ok).length;
  RESULTS.forEach(r => {
    const icon = r.ok ? `${C.green}✅` : `${C.red}❌`;
    log(`  ${icon} [${String(r.status).padStart(3)}] ${r.name.padEnd(60)} ${C.dim}${r.notes}${C.reset}`);
  });
  log("");
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${((ok/total)*100).toFixed(1)}% (${ok}/${total})${C.reset}`);
}

main().catch(err => { log(`${C.red}FATAL: ${err.message}${C.reset}`); process.exit(1); });
