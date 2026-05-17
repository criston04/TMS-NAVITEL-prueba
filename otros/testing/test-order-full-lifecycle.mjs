#!/usr/bin/env node
/**
 * PRUEBA AUTOMATIZADA — CICLO COMPLETO DE UNA ORDEN
 *
 * Hace EL MISMO flujo que un usuario haria en la UI, paso a paso:
 *
 *   1. Crear orden (draft)
 *   2. Cambiar status a pending
 *   3. Asignar vehiculo + conductor (assigned)
 *   4. Iniciar viaje (in_transit)
 *   5. Marcar como completed (cuando todos los hitos esten OK)
 *   6. Cerrar la orden (closed)
 *
 * Cada paso muestra:
 *   - Endpoint llamado (URL + metodo)
 *   - Payload enviado
 *   - Status HTTP de respuesta
 *   - Status de la orden tras el cambio
 *
 * USO:
 *   node otros/testing/test-order-full-lifecycle.mjs
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", blue: "\x1b[34m", magenta: "\x1b[35m",
  bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
let ORDER_ID = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const t0 = Date.now();
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, ok: res.ok, latencyMs: Date.now() - t0, body: data };
}

function unwrap(d) {
  if (!d) return null;
  if (d.data) return d.data;
  if (d.items) return d.items;
  return d;
}

function step(num, title) {
  console.log("");
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}  PASO ${num}: ${title}${C.reset}`);
  console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════${C.reset}`);
}

function logRequest(method, url, body) {
  console.log(`\n${C.dim}→ ${method} ${url}${C.reset}`);
  if (body) {
    const summary = JSON.stringify(body, null, 2)
      .split("\n")
      .map(l => `  ${l}`)
      .join("\n");
    console.log(`${C.dim}  Body:${C.reset}`);
    console.log(C.dim + summary + C.reset);
  }
}

function logResponse(r, label) {
  const color = r.ok ? C.green : (r.status >= 500 ? C.red : C.yellow);
  console.log(`\n${color}← ${r.status} ${r.ok ? "OK" : "FAIL"}${C.reset} ${C.dim}(${r.latencyMs}ms)${C.reset}`);
  if (label) {
    console.log(`  ${C.bold}${label}${C.reset}`);
  }
}

async function getIds() {
  const cust = await http("GET", `${API_URL}/master/customers?pageSize=5`);
  await sleep(800);
  const drv = await http("GET", `${API_URL}/master/drivers?pageSize=5`);
  await sleep(800);
  const veh = await http("GET", `${API_URL}/master/vehicles?pageSize=5`);
  return {
    customer: unwrap(cust.body)[0],
    driver: unwrap(drv.body)[0],
    vehicle: unwrap(veh.body)[0],
    driverAlt: unwrap(drv.body)[1],
    vehicleAlt: unwrap(veh.body)[1],
  };
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${C.bold}PRUEBA AUTOMATIZADA — CICLO COMPLETO DE UNA ORDEN${C.reset}`);
  console.log(`Backend: ${API_BASE}`);
  console.log(`Fecha:   ${new Date().toISOString()}\n`);

  // ════════════════════════════════════════════════════════════
  step(0, "LOGIN");
  // ════════════════════════════════════════════════════════════
  const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = unwrap(login.body)?.accessToken;
  console.log(`  ${login.ok ? C.green + "✓" : C.red + "✗"} Login ${login.status} (${login.latencyMs}ms)${C.reset}`);
  if (!TOKEN) { console.log("Sin token, abortando"); process.exit(1); }

  await sleep(500);

  // ════════════════════════════════════════════════════════════
  step(0.5, "OBTENER IDs DE MASTER");
  // ════════════════════════════════════════════════════════════
  const ids = await getIds();
  console.log(`  customer:  ${ids.customer.id} (${ids.customer.name})`);
  console.log(`  driver:    ${ids.driver.id}`);
  console.log(`  vehicle:   ${ids.vehicle.id} (${ids.vehicle.plate})`);

  await sleep(500);

  // ════════════════════════════════════════════════════════════
  step(1, "CREAR ORDEN — esperamos status='draft'");
  // ════════════════════════════════════════════════════════════
  const orderNumber = `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const createPayload = {
    order_number: orderNumber,
    customer_id: ids.customer.id,
    customer_name: ids.customer.name,
    type: "delivery",
    priority: "high",
    vehicle_id: ids.vehicle.id,
    vehicle_plate: ids.vehicle.plate,
    driver_id: ids.driver.id,
    driver_name: "Conductor Test",
    origin_address: "Almacen Test - Origen",
    origin_lat: -12.046,
    origin_lng: -77.042,
    destination_address: "Cliente Test - Destino",
    destination_lat: -12.054,
    destination_lng: -77.123,
    scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_delivery_at: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    estimated_distance_km: 25.5,
    total_weight: 1500,
    total_volume: 5.2,
    total_packages: 10,
    notes: "Prueba ciclo completo",
  };

  logRequest("POST", `${API_URL}/orders`, createPayload);
  const create = await http("POST", `${API_URL}/orders`, createPayload);
  ORDER_ID = unwrap(create.body)?.id;
  const createdStatus = unwrap(create.body)?.status;
  logResponse(create, `Orden creada con id=${ORDER_ID?.slice(0,8)}, status="${createdStatus}"`);
  if (!ORDER_ID) { console.log("Falló creación, abortando"); process.exit(1); }
  if (createdStatus !== "draft") {
    console.log(`  ${C.yellow}⚠ Esperabamos status="draft" pero llego "${createdStatus}"${C.reset}`);
  }

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(2, "CAMBIAR A PENDING (draft → pending)");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}Operacion equivalente al boton "Activar orden" (que aun no existe en UI).${C.reset}`);
  const patchStatusPayload = { status: "pending" };
  logRequest("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, patchStatusPayload);
  const toPending = await http("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, patchStatusPayload);
  const pendingStatus = unwrap(toPending.body)?.status;
  logResponse(toPending, `Status tras PATCH: "${pendingStatus}"`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(3, "ASIGNAR VEHICULO + CONDUCTOR (pending → assigned)");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}Operacion equivalente al modal "Asignar recursos".${C.reset}`);
  const assignPayload = {
    vehicle_id: ids.vehicleAlt?.id ?? ids.vehicle.id,
    driver_id: ids.driverAlt?.id ?? ids.driver.id,
  };
  logRequest("PATCH", `${API_URL}/orders/${ORDER_ID}/assign`, assignPayload);
  const assign = await http("PATCH", `${API_URL}/orders/${ORDER_ID}/assign`, assignPayload);
  const assignedStatus = unwrap(assign.body)?.status;
  logResponse(assign, `Status tras PATCH /assign: "${assignedStatus}"`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(4, "ENVIAR A EXTERNO (carrier + GPS) — solo notifica");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}Operacion equivalente al boton "Enviar" (visible cuando status=pending|assigned).${C.reset}`);
  console.log(`  ${C.dim}NO cambia el status, solo notifica al transportista y al GPS.${C.reset}`);
  const sendPayload = { orderIds: [ORDER_ID] };
  logRequest("POST", `${API_URL}/orders/bulk-send`, sendPayload);
  const send = await http("POST", `${API_URL}/orders/bulk-send`, sendPayload);
  logResponse(send, `Notificacion enviada`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(5, "INICIAR VIAJE (assigned → in_transit)");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}Operacion equivalente al boton "Iniciar viaje".${C.reset}`);
  const startTripPayload = { status: "in_transit" };
  logRequest("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, startTripPayload);
  const startTrip = await http("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, startTripPayload);
  const inTransitStatus = unwrap(startTrip.body)?.status;
  logResponse(startTrip, `Status tras PATCH: "${inTransitStatus}"`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(6, "MARCAR COMO COMPLETED (in_transit → completed)");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}En produccion el GPS detecta entrada/salida de geocercas y marca milestones.${C.reset}`);
  console.log(`  ${C.dim}Cuando todos los milestones estan OK, status pasa a completed automaticamente.${C.reset}`);
  console.log(`  ${C.dim}Aqui forzamos manualmente con PATCH /status para probar el flujo completo.${C.reset}`);
  const completedPayload = { status: "completed" };
  logRequest("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, completedPayload);
  const complete = await http("PATCH", `${API_URL}/orders/${ORDER_ID}/status`, completedPayload);
  const completedStatus = unwrap(complete.body)?.status;
  logResponse(complete, `Status tras PATCH: "${completedStatus}"`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(7, "CERRAR ORDEN (completed → closed)");
  // ════════════════════════════════════════════════════════════
  console.log(`  ${C.dim}Operacion equivalente al boton "Cerrar orden" (visible cuando status=completed).${C.reset}`);
  const closePayload = {
    observations: "Cierre automatico desde script de prueba",
    incidents: [],
    deviationReasons: [],
    closedBy: "test-script",
    closedByName: "Script Automatizado",
  };
  logRequest("POST", `${API_URL}/orders/${ORDER_ID}/close`, closePayload);
  const close = await http("POST", `${API_URL}/orders/${ORDER_ID}/close`, closePayload);
  const closedStatus = unwrap(close.body)?.status;
  logResponse(close, `Status tras POST /close: "${closedStatus}"`);

  await sleep(1500);

  // ════════════════════════════════════════════════════════════
  step(8, "VERIFICACION FINAL");
  // ════════════════════════════════════════════════════════════
  logRequest("GET", `${API_URL}/orders/${ORDER_ID}`);
  const verify = await http("GET", `${API_URL}/orders/${ORDER_ID}`);
  const final = unwrap(verify.body);
  logResponse(verify, `Estado final de la orden`);
  if (final) {
    console.log(`\n  ${C.bold}Resumen de la orden:${C.reset}`);
    console.log(`    id:            ${final.id}`);
    console.log(`    order_number:  ${final.order_number}`);
    console.log(`    status:        ${C.green}${final.status}${C.reset}`);
    console.log(`    priority:      ${final.priority}`);
    console.log(`    customer_id:   ${final.customer_id}`);
    console.log(`    vehicle_id:    ${final.vehicle_id}`);
    console.log(`    driver_id:     ${final.driver_id}`);
    console.log(`    created_at:    ${final.created_at}`);
    console.log(`    updated_at:    ${final.updated_at}`);
  }

  // ════════════════════════════════════════════════════════════
  console.log("");
  console.log(`${C.bold}${C.green}╔═══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.green}║                       FLUJO COMPLETADO                       ║${C.reset}`);
  console.log(`${C.bold}${C.green}╚═══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log("");
  console.log(`Resumen de transiciones:`);
  const tr = (from, to, ok) => `  ${ok ? C.green + "✓" : C.red + "✗"} ${from.padEnd(12)} → ${to}${C.reset}`;
  console.log(tr("(creacion)", "draft       (POST /orders)", createdStatus === "draft"));
  console.log(tr("draft", "pending     (PATCH /status)", pendingStatus === "pending"));
  console.log(tr("pending", "assigned    (PATCH /assign)", assignedStatus === "assigned"));
  console.log(tr("assigned", "in_transit  (PATCH /status)", inTransitStatus === "in_transit"));
  console.log(tr("in_transit", "completed   (PATCH /status)", completedStatus === "completed"));
  console.log(tr("completed", "closed      (POST /close)", closedStatus === "closed"));
  console.log("");
  console.log(`Puedes ver la orden en la UI: ${C.blue}http://localhost:3000/orders/${ORDER_ID}${C.reset}`);
}

main().catch(e => { console.error(e); process.exit(1); });
