#!/usr/bin/env node
/** TEST E2E COMPLETO — MÓDULO FINANCE */
const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };
let TOKEN = null;
const RESULTS = [];
const log = (m = "") => process.stdout.write(m + "\n");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function http(method, url, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.token !== null && (opts.token || TOKEN)) headers.Authorization = `Bearer ${opts.token || TOKEN}`;
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      if (res.status === 429 && i < 3) { await sleep([5000, 10000, 20000][i]); continue; }
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data };
    } catch { if (i < 3) { await sleep(5000); continue; } return { ok: false, status: 0 }; }
  }
}
function record(name, status, ok, lat, notes = "") {
  RESULTS.push({ name, status, ok, lat, notes });
  log(`  ${ok ? `${C.green}✅` : `${C.red}❌`} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(60)} ${C.dim}${lat || 0}ms${C.reset} ${notes}`);
}
async function main() {
  log(`${C.bold}TEST E2E — FINANCE${C.reset}`);
  const r = await http("POST", `${API_BASE}/auth/login`, { body: { username: "admin", password: "Admin1432!" }, token: null });
  TOKEN = (r.data?.data ?? r.data)?.accessToken; log(`${C.green}✓ Login OK${C.reset}`);

  const ENDPOINTS = [
    ["GET", "/finance/invoices"],
    ["GET", "/finance/payments"],
    ["GET", "/finance/costs"],
    ["GET", "/finance/rates"],
    ["GET", "/finance/stats"],
    ["GET", "/finance/aging"],
    ["GET", "/finance/profitability"],
    ["GET", "/finance/cash-flow"],
    ["GET", "/finance/invoices/test-uuid"],
    ["GET", "/finance/payments/test-uuid"],
    ["GET", "/finance/clientes/test-uuid/summary"],
  ];
  for (const [m, p] of ENDPOINTS) {
    await sleep(3000);
    const result = await http(m, `${API_URL}${p}`);
    record(`${m} ${p}`, result.status, result.ok, result.latencyMs);
  }
  log("");
  const total = RESULTS.length, ok = RESULTS.filter(r => r.ok).length;
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${((ok/total)*100).toFixed(1)}% (${ok}/${total})${C.reset}`);
}
main().catch(e => { console.error(e); process.exit(1); });
