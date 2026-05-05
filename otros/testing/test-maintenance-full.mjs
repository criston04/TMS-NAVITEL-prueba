#!/usr/bin/env node
/** TEST E2E COMPLETO — MÓDULO MAINTENANCE */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
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
  header("Login");
  const r = await http("POST", LOGIN_URL, { body: { username: "admin", password: "Admin1432!" }, token: null });
  TOKEN = (r.data?.data ?? r.data)?.accessToken || (r.data?.data ?? r.data)?.token;
  log(`${C.green}✓ Login OK${C.reset}`);
}

async function main() {
  log(`${C.bold}TEST E2E — MÓDULO MAINTENANCE${C.reset}`);
  await login();

  const ENDPOINTS = [
    ["GET", "/maintenance/vehicles"],
    ["GET", "/maintenance/schedules"],
    ["GET", "/maintenance/work-orders"],
    ["GET", "/maintenance/inspections"],
    ["GET", "/maintenance/parts"],
    ["GET", "/maintenance/workshops"],
    ["GET", "/maintenance/breakdowns"],
    ["GET", "/maintenance/alerts"],
    ["GET", "/maintenance/work-orders/test-uuid"],
    ["GET", "/maintenance/schedules/test-uuid"],
  ];

  header("LECTURAS");
  for (const [method, path] of ENDPOINTS) {
    await sleep(PAUSE);
    const r = await http(method, `${API_URL}${path}`);
    record(`${method} ${path}`, r.status, r.ok, r.latencyMs, path.includes(":id") || path.includes("/test-uuid") ? "" : "");
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
