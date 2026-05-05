#!/usr/bin/env node
/** TEST E2E COMPLETO — MÓDULO PRODUCTS */

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
const unwrap = (d) => !d ? null : Array.isArray(d) ? d : d.data || d.items || d;

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

function buildPayload(suffix) {
  return {
    code: `PRD-${suffix}`,
    sku: `SKU-${suffix}`,
    name: `Producto Test ${suffix}`,
    description: "Producto de test E2E",
    category: "general",
    unit: "unidad",
    weight_kg: 1.5,
    volume_m3: 0.01,
    is_hazardous: false,
    is_perishable: false,
    requires_refrigeration: false,
    status: "active",
    notes: "Test E2E",
  };
}

async function main() {
  log(`${C.bold}TEST E2E — MÓDULO PRODUCTS${C.reset}`);
  await login();

  header("CRUD / QUERIES");
  await sleep(PAUSE);
  let r = await http("GET", `${API_URL}/master/products?pageSize=20`);
  record(`GET /master/products`, r.status, r.ok, r.latencyMs);

  await sleep(PAUSE);
  r = await http("GET", `${API_URL}/master/products/stats`);
  record(`GET /master/products/stats`, r.status, r.ok, r.latencyMs);

  const suffix = String(Date.now()).slice(-6);
  await sleep(PAUSE);
  r = await http("POST", `${API_URL}/master/products`, { body: buildPayload(suffix) });
  const created = unwrap(r.data);
  const id = created?.id;
  record(`POST /master/products (crear)`, r.status, r.ok && !!id, r.latencyMs, id ? `id=${String(id).slice(0,8)}…` : (r.data?.message || ""));

  if (id) {
    await sleep(PAUSE);
    r = await http("GET", `${API_URL}/master/products/${id}`);
    record(`GET /master/products/:id`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");

    await sleep(PAUSE);
    r = await http("PUT", `${API_URL}/master/products/${id}`, { body: { name: "Updated test" } });
    record(`PUT /master/products/:id`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");

    await sleep(PAUSE);
    r = await http("PATCH", `${API_URL}/master/products/${id}/status`, { body: { status: "inactive" } });
    record(`PATCH /master/products/:id/status`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("POST", `${API_URL}/master/products/${id}/duplicate`, { body: {} });
    record(`POST /master/products/:id/duplicate`, r.status, r.ok, r.latencyMs);

    await sleep(PAUSE);
    r = await http("DELETE", `${API_URL}/master/products/${id}`);
    record(`DELETE /master/products/:id`, r.status, r.ok, r.latencyMs);
  }

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
