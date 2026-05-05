#!/usr/bin/env node
/**
 * TEST E2E COMPLETO — MÓDULO GEOFENCES
 *
 * Las geocercas viven en path NO estandar. Probamos varios candidates:
 *   - /geofences (root, NO /api/v1)
 *   - /api/v1/geofences
 *   - /api/v1/master/geofences
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const ROOT_URL = API_BASE;
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

const CANDIDATES = [
  { label: "/api/v1/geofences", url: (path) => `${API_URL}/geofences${path}` },
  { label: "/api/v1/master/geofences", url: (path) => `${API_URL}/master/geofences${path}` },
  { label: "/geofences (root)", url: (path) => `${ROOT_URL}/geofences${path}` },
];

async function findActivePath() {
  header(`DESCUBRIR PATH ACTIVO`);
  for (const c of CANDIDATES) {
    await sleep(PAUSE);
    const r = await http("GET", c.url("?pageSize=1"));
    if (r.status !== 404 && r.status !== 429) {
      log(`${C.green}✓ Path activo descubierto: ${c.label}${C.reset} (status ${r.status})`);
      return c;
    }
    log(`${C.dim}  ${c.label}: status ${r.status}${C.reset}`);
  }
  log(`${C.red}✗ Ningun path responde con algo distinto a 404/429${C.reset}`);
  return null;
}

function buildGeofencePayload(suffix, customerId) {
  return {
    code: `GEO-${suffix}`,
    name: `Geocerca Test ${suffix}`,
    shortName: `GEO-${suffix}`,
    description: "Geocerca de test E2E",
    address: "Av. Test 123, Lima",
    type: "CIRCLE",
    lat: -12.046374,
    lng: -77.042793,
    radius: 500,
    gpoints: null,
    category: "warehouse",
    color: "#3b82f6",
    opacity: 0.2,
    alt: 0,
    alerts: {
      onEntry: true,
      onExit: true,
      onDwell: false,
      dwellTimeMinutes: null,
      notifyEmails: [],
    },
    tags: ["test", "lima"],
    status: "active",
    customer_id: customerId,
  };
}

async function testList(active) {
  header(`CRUD — GET ${active.label}`);
  await sleep(PAUSE);
  const r = await http("GET", active.url("?pageSize=20"));
  const list = unwrapList(r.data);
  record(`GET ${active.label} (listar)`, r.status, r.ok, r.latencyMs, `${list.length} geocercas`);
  return list;
}

async function testCreate(active, suffix, customerId) {
  header(`CRUD — POST ${active.label} (crear)`);
  await sleep(PAUSE);
  const payload = buildGeofencePayload(suffix, customerId);
  const r = await http("POST", active.url(""), { body: payload });
  const created = unwrap(r.data);
  const c = Array.isArray(created) ? created[0] : created;
  const id = c?.id || c?.geofenceid || c?.Geofenceid;
  record(`POST ${active.label} (crear)`, r.status, r.ok && !!id, r.latencyMs,
    id ? `id=${String(id).slice(0, 8)}…` : (r.data?.message || JSON.stringify(r.data).slice(0, 80)));
  return id ? { ...c, id } : null;
}

async function testGetById(active, id) {
  await sleep(PAUSE);
  const r = await http("GET", active.url(`/${id}`));
  record(`GET ${active.label}/:id (detalle)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testUpdate(active, id) {
  await sleep(PAUSE);
  const r = await http("PUT", active.url(`/${id}`), {
    body: { name: "Actualizado test", color: "#ff0000" },
  });
  record(`PUT ${active.label}/:id (actualizar)`, r.status, r.ok, r.latencyMs, r.ok ? "" : "BUG NGINX :id");
}

async function testDelete(active, id) {
  await sleep(PAUSE);
  const r = await http("DELETE", active.url(`/${id}`));
  record(`DELETE ${active.label}/:id`, r.status, r.ok, r.latencyMs);
}

async function testStats(active) {
  await sleep(PAUSE);
  const r = await http("GET", active.url("/stats"));
  record(`GET ${active.label}/stats`, r.status, r.ok, r.latencyMs);
}

async function main() {
  log(`${C.bold}TEST E2E COMPLETO — MÓDULO GEOFENCES${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);

  await login();

  const active = await findActivePath();
  if (!active) {
    log(`${C.red}✗ Sin path activo, abortando.${C.reset}`);
    process.exit(1);
  }

  await testList(active);

  // Necesitamos un customer_id para crear geofences
  const customers = await http("GET", `${API_URL}/master/customers?pageSize=1`);
  const customerId = unwrapList(customers.data)[0]?.id;
  log(`${C.dim}Usando customer_id=${customerId}${C.reset}`);

  const suffix = String(Date.now()).slice(-6);
  const created = await testCreate(active, suffix, customerId);
  if (created) {
    const id = created.id;
    await testGetById(active, id);
    await testUpdate(active, id);
    await testStats(active);
    await testDelete(active, id);
  } else {
    log(`${C.yellow}⚠ No se pudo crear, saltando tests dependientes${C.reset}`);
    await testStats(active);
  }

  // RESUMEN
  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                          RESUMEN FINAL                                ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}`);

  log(`${C.dim}Path activo: ${active.label}${C.reset}`);

  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = RESULTS.filter(r => !r.ok && r.status !== 0).length;

  log("");
  log(`${C.bold}DETALLE POR ENDPOINT:${C.reset}`);
  log("");
  RESULTS.forEach(r => {
    const icon = r.ok ? `${C.green}✅` : r.status === 0 ? `${C.red}💥` : `${C.red}❌`;
    log(`  ${icon} [${String(r.status).padStart(3)}] ${r.name.padEnd(60)} ${C.dim}${r.notes}${C.reset}`);
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
