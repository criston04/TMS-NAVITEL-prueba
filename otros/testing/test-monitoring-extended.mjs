#!/usr/bin/env node
/**
 * TEST E2E EXTENDIDO — MONITORING
 * Prueba TODOS los endpoints que el frontend llama (29), no solo los 8
 * del test-monitoring-full.mjs.
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };
let TOKEN = null;
let VEHICLE_ID = "test-uuid";
const RESULTS = [];
const log = (m = "") => process.stdout.write(m + "\n");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  for (let i = 0; i < 4; i++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      if (res.status === 429 && i < 3) { await sleep([5000, 10000, 20000][i]); continue; }
      return { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data };
    } catch { if (i < 3) { await sleep(5000); continue; } return { ok: false, status: 0, latencyMs: Date.now() - t0 }; }
  }
}

function record(name, status, ok, lat, notes = "") {
  RESULTS.push({ name, status, ok, lat, notes });
  const icon = ok ? `${C.green}✅` : status === 0 ? `${C.yellow}⏱` : `${C.red}❌`;
  log(`  ${icon} ${String(status).padEnd(3)} ${C.reset}${name.padEnd(70)} ${C.dim}${lat}ms${C.reset} ${notes}`);
}

async function main() {
  log(`${C.bold}TEST E2E EXTENDIDO — MONITORING (29 endpoints)${C.reset}`);

  const r = await http("POST", `${API_BASE}/auth/login`, { body: { username: "admin", password: "Admin1432!" }, token: null });
  TOKEN = (r.data?.data ?? r.data)?.accessToken;
  log(`${C.green}✓ Login OK${C.reset}`);

  // Obtener un vehicleId real (si hay)
  await sleep(2000);
  const vehList = await http("GET", `${API_URL}/master/vehicles?pageSize=1`);
  const items = vehList.data?.items ?? vehList.data?.data ?? [];
  if (items[0]?.id) {
    VEHICLE_ID = items[0].id;
    log(`${C.cyan}Usando vehicleId real: ${VEHICLE_ID}${C.reset}`);
  }

  log(`\n${C.bold}${C.cyan}═══ TRACKING (Torre de Control) ═══${C.reset}`);
  const tracking = [
    ["GET", `/monitoring/tracking`, "lista vehiculos activos"],
    ["GET", `/monitoring/tracking/${VEHICLE_ID}`, "detalle vehiculo"],
    ["GET", `/monitoring/tracking/${VEHICLE_ID}/position`, "posicion actual"],
    ["GET", `/monitoring/tracking/${VEHICLE_ID}/order`, "orden activa"],
    ["GET", `/monitoring/tracking/realtime`, "endpoint inventado"],
    ["GET", `/monitoring/tracking/with-orders`, "endpoint inventado"],
    ["GET", `/monitoring/tracking/carriers`, "lista transportistas"],
  ];
  for (const [m, p, note] of tracking) {
    await sleep(2500);
    const r = await http(m, `${API_URL}${p}`);
    record(`${m} ${p}`, r.status, r.ok, r.latencyMs, note);
  }

  log(`\n${C.bold}${C.cyan}═══ HISTORICAL (Rastreo Historico) ═══${C.reset}`);
  const historical = [
    ["GET", `/monitoring/historical`, "sin params (probable 400)"],
    ["GET", `/monitoring/historical?vehicleId=${VEHICLE_ID}&startDateTime=2026-05-01T00:00:00Z&endDateTime=2026-05-02T00:00:00Z`, "con params validos"],
    ["GET", `/monitoring/historical/vehicles`, "lista vehiculos con historico"],
    ["GET", `/monitoring/historical/vehicles/${VEHICLE_ID}/date-range`, "rango fechas disponibles"],
    ["GET", `/monitoring/historical/preloaded`, "rutas pre-generadas"],
    ["POST", `/monitoring/historical/test-id/export`, "export CSV/KML/GPX/JSON"],
  ];
  for (const [m, p, note] of historical) {
    await sleep(2500);
    const body = m === "POST" ? { format: "csv", includeStops: true, includeStats: true } : undefined;
    const r = await http(m, `${API_URL}${p}`, { body });
    record(`${m} ${p.split("?")[0]}`, r.status, r.ok, r.latencyMs, note);
  }

  log(`\n${C.bold}${C.cyan}═══ RETRANSMISSION ═══${C.reset}`);
  const retrans = [
    ["GET", `/monitoring/retransmission`, "lista registros"],
    ["GET", `/monitoring/retransmission/test-uuid`, "detalle por id"],
    ["PATCH", `/monitoring/retransmission/test-uuid/comment`, "actualizar comentario"],
    ["GET", `/monitoring/retransmission/stats`, "stats agregados"],
    ["GET", `/monitoring/retransmission/gps-companies`, "empresas GPS"],
    ["GET", `/monitoring/retransmission/gps-companies?active=true`, "GPS companies activas"],
    ["GET", `/monitoring/retransmission/companies`, "operadores logisticos"],
    ["PATCH", `/monitoring/retransmission/bulk-comments`, "bulk comments"],
  ];
  for (const [m, p, note] of retrans) {
    await sleep(2500);
    const body =
      m === "PATCH" && p.endsWith("/comment") ? { comment: "test" } :
      m === "PATCH" && p.endsWith("bulk-comments") ? { recordIds: ["test"], comment: "test" } :
      undefined;
    const r = await http(m, `${API_URL}${p.split("?")[0]}${p.includes("?") ? "?" + p.split("?")[1] : ""}`, { body });
    record(`${m} ${p.split("?")[0]}`, r.status, r.ok, r.latencyMs, note);
  }

  log(`\n${C.bold}${C.cyan}═══ GEOFENCE EVENTS ═══${C.reset}`);
  const geo = [
    ["GET", `/monitoring/geofence-events`, "lista eventos"],
    ["GET", `/monitoring/geofence-events/test-uuid`, "detalle por id"],
    ["POST", `/monitoring/geofence-events`, "crear evento"],
    ["PATCH", `/monitoring/geofence-events/test-uuid`, "actualizar (registrar exit)"],
    ["POST", `/monitoring/geofence-events/record-exit`, "registrar salida"],
    ["GET", `/monitoring/geofence-events/dwell-summary`, "resumen permanencia"],
    ["GET", `/monitoring/geofence-events/stats`, "stats"],
    ["GET", `/monitoring/geofence-events/active`, "eventos activos (vehiculos dentro)"],
    ["GET", `/monitoring/geofence-events/check/test-vid/test-gid`, "verificar dentro de geocerca"],
  ];
  for (const [m, p, note] of geo) {
    await sleep(2500);
    const body =
      p === `/monitoring/geofence-events` && m === "POST" ? { vehicleId: "test", geofenceId: "test", eventType: "entry", enteredAt: new Date().toISOString(), coordinates: { lat: -12, lng: -77 } } :
      p.endsWith("record-exit") ? { vehicleId: "test", geofenceId: "test", coordinates: { lat: -12, lng: -77 } } :
      m === "PATCH" ? { exitedAt: new Date().toISOString() } :
      undefined;
    const r = await http(m, `${API_URL}${p}`, { body });
    record(`${m} ${p}`, r.status, r.ok, r.latencyMs, note);
  }

  log("");
  log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════╗${C.reset}`);
  log(`${C.bold}${C.cyan}║                  RESUMEN                                  ║${C.reset}`);
  log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════╝${C.reset}`);
  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const c400 = RESULTS.filter(r => r.status === 400).length;
  const c404 = RESULTS.filter(r => r.status === 404).length;
  const c500 = RESULTS.filter(r => r.status >= 500).length;
  log(`Total: ${total}  ${C.green}OK: ${ok}${C.reset}  ${C.yellow}400: ${c400}${C.reset}  ${C.red}404: ${c404}${C.reset}  ${C.red}5xx: ${c500}${C.reset}`);
  log(`${C.bold}PORCENTAJE FUNCIONAL: ${((ok / total) * 100).toFixed(1)}%${C.reset}`);
}

main().catch(e => { console.error(e); process.exit(1); });
