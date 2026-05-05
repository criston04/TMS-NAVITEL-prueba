#!/usr/bin/env node
/** TEST E2E COMPLETO — MÓDULO AUTH */
const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };
const RESULTS = [];
const log = (m = "") => process.stdout.write(m + "\n");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function http(method, url, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const raw = await res.text();
    let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data };
  } catch { return { ok: false, status: 0, latencyMs: Date.now() - t0 }; }
}
function record(name, status, ok, lat, notes = "") {
  RESULTS.push({ name, status, ok, lat, notes });
  log(`  ${ok ? `${C.green}✅` : `${C.red}❌`} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(60)} ${C.dim}${lat || 0}ms${C.reset} ${notes}`);
}
async function main() {
  log(`${C.bold}TEST E2E — AUTH${C.reset}`);

  // POST /auth/login (sin token)
  let r = await http("POST", `${API_BASE}/auth/login`, { body: { username: "admin", password: "Admin1432!" } });
  const ok = r.ok && (r.data?.data?.accessToken || r.data?.accessToken);
  record(`POST /auth/login`, r.status, ok, r.latencyMs);
  const TOKEN = (r.data?.data ?? r.data)?.accessToken;
  const REFRESH = (r.data?.data ?? r.data)?.refreshToken;

  // POST /auth/login con credenciales malas
  await sleep(2000);
  r = await http("POST", `${API_BASE}/auth/login`, { body: { username: "admin", password: "wrong" } });
  record(`POST /auth/login (cred. invalidas)`, r.status, r.status === 401 || r.status === 400, r.latencyMs, "espera 401");

  // GET /auth/me
  await sleep(2000);
  r = await http("GET", `${API_BASE}/auth/me`, { token: TOKEN });
  record(`GET /auth/me`, r.status, r.ok, r.latencyMs);

  // POST /auth/refresh
  if (REFRESH) {
    await sleep(2000);
    r = await http("POST", `${API_BASE}/auth/refresh`, { body: { refreshToken: REFRESH } });
    record(`POST /auth/refresh`, r.status, r.ok, r.latencyMs);
  } else {
    record(`POST /auth/refresh`, 0, false, 0, "sin refreshToken disponible");
  }

  // POST /auth/logout
  await sleep(2000);
  r = await http("POST", `${API_BASE}/auth/logout`, { token: TOKEN });
  record(`POST /auth/logout`, r.status, r.ok || r.status === 204, r.latencyMs);

  // POST /auth/login sin body
  await sleep(2000);
  r = await http("POST", `${API_BASE}/auth/login`, { body: {} });
  record(`POST /auth/login (sin body)`, r.status, r.status === 400 || r.status === 422, r.latencyMs, "espera 400/422");

  log("");
  const total = RESULTS.length, oks = RESULTS.filter(r => r.ok).length;
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${((oks/total)*100).toFixed(1)}% (${oks}/${total})${C.reset}`);
}
main().catch(e => { console.error(e); process.exit(1); });
