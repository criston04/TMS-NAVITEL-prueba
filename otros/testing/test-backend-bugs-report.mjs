#!/usr/bin/env node
/**
 * AUDITORIA EXHAUSTIVA — bugs reales del backend
 *
 * Objetivo: detectar TODOS los endpoints que el frontend usa y que el
 * backend implementa MAL. NO parchear con fallbacks — solo reportar.
 *
 * Para cada endpoint que falla:
 *  - Obtenemos un ID/payload REAL valido (no dummy)
 *  - Probamos contra produccion
 *  - Capturamos request y response completos
 *  - Categorizamos: 500 (crash interno) | 404 (endpoint no existe en path) | 400 (payload mal)
 *
 * Output: reporte consolidado en json + markdown.
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", magenta: "\x1b[35m", bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const raw = await res.text();
    let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return { status: res.status, ok: res.ok, latencyMs: Date.now() - t0, body: data, raw };
  } catch (err) {
    return { status: 0, ok: false, latencyMs: Date.now() - t0, body: err.message, raw: "" };
  }
}
const unwrap = (d) => d?.data ?? d?.items ?? d;

// ──────────────────────────────────────────────────────────
// REGISTRO DE BUGS
// ──────────────────────────────────────────────────────────
const BUGS = [];

function logBug(category, method, path, request, response, expected) {
  BUGS.push({ category, method, path, request, response, expected });
  const color = category === "500_crash" ? C.red
    : category === "404_missing" ? C.yellow
    : category === "400_payload" ? C.magenta
    : C.cyan;
  console.log(`${color}  [${category}] ${method} ${path} → ${response.status}${C.reset}`);
}

function logOk(method, path, status) {
  console.log(`${C.green}  ✓ ${method} ${path} → ${status}${C.reset}`);
}

// ══════════════════════════════════════════════════════════
async function main() {
  console.log(`${C.bold}${C.cyan}AUDITORIA EXHAUSTIVA — bugs del backend${C.reset}\n`);

  // Login
  TOKEN = unwrap((await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" })).body)?.accessToken;
  if (!TOKEN) { console.log(`${C.red}LOGIN FAIL${C.reset}`); process.exit(1); }
  console.log(`${C.green}✓ Login OK${C.reset}\n`);

  // Obtener IDs reales
  await sleep(300);
  const customers = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(300);
  const drivers = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);
  await sleep(300);
  const vehicles = unwrap((await http("GET", `${API_URL}/master/vehicles?pageSize=5`)).body);
  await sleep(300);
  const orders = unwrap((await http("GET", `${API_URL}/orders?pageSize=10`)).body);
  await sleep(300);
  const workflows = unwrap((await http("GET", `${API_URL}/master/workflows?pageSize=5`)).body);
  await sleep(300);
  const geofences = unwrap((await http("GET", `${API_URL}/geofences?pageSize=5`)).body);
  await sleep(300);
  const bitacora = unwrap((await http("GET", `${API_URL}/bitacora?pageSize=5`)).body);

  const customerId = customers?.[0]?.id;
  const driverId = drivers?.[0]?.id;
  const vehicleId = vehicles?.[0]?.id;
  const orderId = orders?.[0]?.id;
  const workflowId = workflows?.[0]?.id;
  const geofenceId = geofences?.[0]?.id;
  const bitacoraId = bitacora?.[0]?.id;

  console.log(`IDs reales:`);
  console.log(`  customer:  ${customerId?.slice(0, 8)}`);
  console.log(`  driver:    ${driverId?.slice(0, 8)}`);
  console.log(`  vehicle:   ${vehicleId?.slice(0, 8)}`);
  console.log(`  order:     ${orderId?.slice(0, 8) ?? "(none)"}`);
  console.log(`  workflow:  ${workflowId?.slice(0, 8)}`);
  console.log(`  geofence:  ${geofenceId?.slice(0, 8) ?? "(none)"}`);
  console.log(`  bitacora:  ${bitacoraId?.slice(0, 8) ?? "(none)"}`);
  console.log("");

  // ════════════════════════════════════════════════════════
  // ORDERS
  // ════════════════════════════════════════════════════════
  console.log(`${C.bold}${C.cyan}═══ ORDERS ═══${C.reset}`);

  // Endpoints documentados que dan 404 en el path canónico
  for (const path of [
    "/orders/status-counts",
    `/orders/by-driver/${driverId}`,
    `/orders/by-vehicle/${vehicleId}`,
    `/orders/by-number/test-num`,
  ]) {
    await sleep(300);
    const r = await http("GET", `${API_URL}${path}`);
    if (r.status === 404) logBug("404_missing", "GET", path, null, r, 200);
    else logOk("GET", path, r.status);
  }

  if (orderId) {
    await sleep(300);
    const r = await http("PATCH", `${API_URL}/orders/${orderId}/start-trip`);
    if (r.status === 404) logBug("404_missing", "PATCH", "/orders/:id/start-trip", null, r, 200);
    else logOk("PATCH", "/orders/:id/start-trip", r.status);
  }

  // ════════════════════════════════════════════════════════
  // SCHEDULING
  // ════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.cyan}═══ SCHEDULING ═══${C.reset}`);
  const SC = `${API_URL}/operations/scheduling`;

  // GET /kpis — falla 500
  await sleep(300);
  let r = await http("GET", `${SC}/kpis`);
  if (r.status >= 500) logBug("500_crash", "GET", "/operations/scheduling/kpis", null, r, 200);
  else logOk("GET", "/operations/scheduling/kpis", r.status);

  // GET /suggestions/:orderId con orderId REAL
  if (orderId) {
    await sleep(300);
    r = await http("GET", `${SC}/suggestions/${orderId}?date=${new Date().toISOString()}`);
    if (r.status >= 500) logBug("500_crash", "GET", "/operations/scheduling/suggestions/:orderId", null, r, 200);
    else if (r.status === 404) logBug("404_missing", "GET", "/operations/scheduling/suggestions/:orderId", null, r, 200);
    else logOk("GET", "/operations/scheduling/suggestions/:orderId", r.status);
  }

  // POST /validate-hos con payload VALIDO segun doc sec 3.8
  if (driverId) {
    await sleep(300);
    const validHosBody = {
      driverId,
      scheduledStart: new Date(Date.now() + 86400000).toISOString(),
      scheduledEnd: new Date(Date.now() + 86400000 + 21600000).toISOString(),
      estimatedDurationMinutes: 360,
    };
    r = await http("POST", `${SC}/validate-hos`, validHosBody);
    if (r.status === 400) logBug("400_payload", "POST", "/operations/scheduling/validate-hos", validHosBody, r, 200);
    else if (r.status >= 500) logBug("500_crash", "POST", "/operations/scheduling/validate-hos", validHosBody, r, 200);
    else logOk("POST", "/operations/scheduling/validate-hos", r.status);
  }

  // POST /detect-conflicts con payload valido segun doc sec 3.9
  await sleep(300);
  const conflictsBody = {
    orders: orderId ? [{
      orderId,
      vehicleId: vehicleId ?? "",
      driverId: driverId ?? "",
      scheduledStart: new Date(Date.now() + 86400000).toISOString(),
      scheduledEnd: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    }] : [],
    drivers: driverId ? [{ id: driverId, status: "active" }] : [],
    vehicles: vehicleId ? [{ id: vehicleId, status: "active" }] : [],
  };
  r = await http("POST", `${SC}/detect-conflicts`, conflictsBody);
  if (r.status === 400) logBug("400_payload", "POST", "/operations/scheduling/detect-conflicts", conflictsBody, r, 200);
  else if (r.status >= 500) logBug("500_crash", "POST", "/operations/scheduling/detect-conflicts", conflictsBody, r, 200);
  else logOk("POST", "/operations/scheduling/detect-conflicts", r.status);

  // POST /assign con payload valido sec 3.11
  if (orderId && driverId && vehicleId) {
    await sleep(300);
    const assignBody = {
      orderId,
      driverId,
      vehicleId,
      scheduledStart: new Date(Date.now() + 86400000).toISOString(),
      scheduledEnd: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    };
    r = await http("POST", `${SC}/assign`, assignBody);
    if (r.status === 400) logBug("400_payload", "POST", "/operations/scheduling/assign", assignBody, r, 200);
    else if (r.status >= 500) logBug("500_crash", "POST", "/operations/scheduling/assign", assignBody, r, 200);
    else logOk("POST", "/operations/scheduling/assign", r.status);
  }

  // POST /block-day con payload valido sec 3.14
  await sleep(300);
  const blockBody = {
    date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    reason: "Test bug audit",
    type: "holiday",
  };
  r = await http("POST", `${SC}/block-day`, blockBody);
  if (r.status === 400) logBug("400_payload", "POST", "/operations/scheduling/block-day", blockBody, r, 200);
  else if (r.status >= 500) logBug("500_crash", "POST", "/operations/scheduling/block-day", blockBody, r, 200);
  else logOk("POST", "/operations/scheduling/block-day", r.status);

  // GET /workflow-info/:wfId
  if (workflowId) {
    await sleep(300);
    r = await http("GET", `${SC}/workflow-info/${workflowId}`);
    if (r.status === 404) logBug("404_missing", "GET", "/operations/scheduling/workflow-info/:wfId", null, r, 200);
    else logOk("GET", "/operations/scheduling/workflow-info/:wfId", r.status);
  }

  // ════════════════════════════════════════════════════════
  // BITACORA — endpoints :id con ID real
  // ════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.cyan}═══ BITACORA (con IDs reales) ═══${C.reset}`);

  if (bitacoraId) {
    for (const [method, path, body] of [
      ["PUT", `/bitacora/${bitacoraId}/review`, { reviewedBy: "admin" }],
      ["PUT", `/bitacora/${bitacoraId}/dismiss`, { reason: "Test audit" }],
      ["PUT", `/bitacora/${bitacoraId}/notes`, { notes: "Test note" }],
      ["PUT", `/bitacora/${bitacoraId}/assign-order`, { orderId: orderId ?? "test" }],
      ["POST", `/bitacora/${bitacoraId}/create-order`, { customerId: customerId ?? "test" }],
      ["PUT", `/bitacora/${bitacoraId}/complete`, { observations: "Test" }],
    ]) {
      await sleep(300);
      const r = await http(method, `${API_URL}${path}`, body);
      const pathKey = path.replace(bitacoraId, ":id");
      if (r.status === 404) logBug("404_missing", method, pathKey, body, r, 200);
      else if (r.status >= 500) logBug("500_crash", method, pathKey, body, r, 200);
      else if (r.status === 400) logBug("400_payload", method, pathKey, body, r, 200);
      else logOk(method, pathKey, r.status);
    }
  } else {
    console.log(`${C.yellow}  (no hay bitacora entries — skip tests :id)${C.reset}`);
  }

  if (vehicleId) {
    await sleep(300);
    const r = await http("GET", `${API_URL}/bitacora/vehicle/${vehicleId}`);
    if (r.status === 404) logBug("404_missing", "GET", "/bitacora/vehicle/:vehicleId", null, r, 200);
    else logOk("GET", "/bitacora/vehicle/:vehicleId", r.status);
  }

  // ════════════════════════════════════════════════════════
  // GEOFENCES — :id con ID real (regresion documentada)
  // ════════════════════════════════════════════════════════
  console.log(`\n${C.bold}${C.cyan}═══ GEOFENCES (regresion :id) ═══${C.reset}`);

  if (geofenceId) {
    for (const method of ["GET", "PUT", "DELETE"]) {
      await sleep(300);
      const body = method === "PUT" ? { name: "Test update" } : null;
      const r = await http(method, `${API_BASE}/api/v1/geofences/${geofenceId}`, body);
      if (r.status === 404) logBug("404_missing", method, "/api/v1/geofences/:id", body, r, 200);
      else logOk(method, "/api/v1/geofences/:id", r.status);
    }
  }

  // ════════════════════════════════════════════════════════
  // REPORTE FINAL
  // ════════════════════════════════════════════════════════
  console.log("");
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                  REPORTE CONSOLIDADO BUGS                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log("");

  const by500 = BUGS.filter(b => b.category === "500_crash");
  const by404 = BUGS.filter(b => b.category === "404_missing");
  const by400 = BUGS.filter(b => b.category === "400_payload");

  console.log(`${C.bold}${C.red}Bugs categoria 500 (handler crashea internamente): ${by500.length}${C.reset}`);
  by500.forEach(b => console.log(`  • ${b.method} ${b.path}`));

  console.log(`\n${C.bold}${C.yellow}Bugs categoria 404 (endpoint no implementado / path equivocado): ${by404.length}${C.reset}`);
  by404.forEach(b => console.log(`  • ${b.method} ${b.path}`));

  console.log(`\n${C.bold}${C.magenta}Bugs categoria 400 (payload rechazado pese a estar valido segun doc): ${by400.length}${C.reset}`);
  by400.forEach(b => console.log(`  • ${b.method} ${b.path}`));

  console.log(`\n${C.bold}TOTAL bugs reportables: ${BUGS.length}${C.reset}`);

  // Guardar reporte JSON
  const fs = await import("fs/promises");
  await fs.writeFile("/tmp/audit-final/bugs-report.json", JSON.stringify(BUGS, null, 2));
  console.log(`\n${C.dim}Detalle completo guardado en /tmp/audit-final/bugs-report.json${C.reset}`);
}

main().catch(e => { console.error(e); process.exit(1); });
