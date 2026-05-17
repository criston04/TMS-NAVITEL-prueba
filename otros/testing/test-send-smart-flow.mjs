#!/usr/bin/env node
/**
 * Verifica que el flujo "Activar y enviar" (sendSmart) funcione 100%
 * contra el backend de produccion.
 *
 * Replica los 4 endpoints que el frontend dispara cuando el usuario hace
 * click en "Activar y enviar" desde una orden en draft:
 *
 *   1. GET    /orders/:id           ← lee status actual
 *   2. PATCH  /orders/:id/status    ← cambia draft → pending  (ACTIVAR)
 *   3. POST   /orders/bulk-send     ← notifica carrier + GPS  (ENVIAR)
 *   4. GET    /orders/:id           ← refetch para state final
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let TOKEN = null;
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
const unwrap = (d) => d?.data ?? d?.items ?? d;

function logCall(num, method, url, body, response, expectedStatus) {
  const ok = response.status === expectedStatus;
  const icon = ok ? `${C.green}✓` : `${C.red}✗`;
  console.log(`\n${C.bold}${icon} [${num}] ${method} ${url.replace(API_BASE, "")}${C.reset}`);
  if (body) {
    console.log(`${C.dim}    Body: ${JSON.stringify(body)}${C.reset}`);
  }
  console.log(`    Status: ${ok ? C.green : C.red}${response.status}${C.reset} (esperado ${expectedStatus}) ${C.dim}${response.latencyMs}ms${C.reset}`);
  if (!ok) {
    console.log(`${C.red}    Response: ${JSON.stringify(response.body).slice(0, 200)}${C.reset}`);
  }
  return ok;
}

async function main() {
  console.log(`${C.bold}${C.cyan}VERIFICACION: el backend soporta "Activar y enviar"${C.reset}\n`);

  // Login
  const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = unwrap(login.body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login OK\n`);

  // IDs
  const cust = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(400);
  const drv = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);
  await sleep(400);
  const veh = unwrap((await http("GET", `${API_URL}/master/vehicles?pageSize=5`)).body);

  // ─────────────────────────────────────────────────────────
  // SETUP: crear una orden en draft (simula la creacion del wizard)
  // ─────────────────────────────────────────────────────────
  console.log(`${C.bold}${C.cyan}── SETUP: crear orden en draft ──${C.reset}`);
  const orderNumber = `ORD-SEND-${Date.now()}`;
  const create = await http("POST", `${API_URL}/orders`, {
    order_number: orderNumber,
    customer_id: cust[0].id,
    customer_name: cust[0].name,
    type: "delivery",
    priority: "high",
    vehicle_id: veh[0].id,
    vehicle_plate: veh[0].plate,
    driver_id: drv[0].id,
    driver_name: "Test Driver",
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
    notes: "Test sendSmart",
  });
  const order = unwrap(create.body);
  console.log(`${C.green}✓${C.reset} Orden creada: ${C.bold}${order.id.slice(0,8)}...${C.reset} status=${C.yellow}${order.status}${C.reset}\n`);

  await sleep(1000);

  // ─────────────────────────────────────────────────────────
  // SIMULAR sendSmart paso a paso
  // ─────────────────────────────────────────────────────────
  console.log(`${C.bold}${C.cyan}══════ FLUJO sendSmart() ══════${C.reset}`);

  // 1. GET /orders/:id (lee status actual)
  await sleep(800);
  const get1 = await http("GET", `${API_URL}/orders/${order.id}`);
  const ok1 = logCall(1, "GET", `${API_URL}/orders/${order.id}`, null, get1, 200);
  const currentStatus = unwrap(get1.body)?.status;
  console.log(`    ${C.dim}status actual: ${currentStatus}${C.reset}`);

  // 2. PATCH /orders/:id/status (cambia a pending) ← ACTIVAR
  await sleep(800);
  const patchBody = { status: "pending" };
  const patch = await http("PATCH", `${API_URL}/orders/${order.id}/status`, patchBody);
  const ok2 = logCall(2, "PATCH", `${API_URL}/orders/${order.id}/status`, patchBody, patch, 200);
  console.log(`    ${C.dim}↑ esto es ACTIVAR${C.reset}`);

  // 3. POST /orders/bulk-send (notifica carrier + GPS) ← ENVIAR
  await sleep(800);
  const sendBody = { orderIds: [order.id] };
  const send = await http("POST", `${API_URL}/orders/bulk-send`, sendBody);
  const ok3 = logCall(3, "POST", `${API_URL}/orders/bulk-send`, sendBody, send, 200);
  console.log(`    ${C.dim}↑ esto es ENVIAR${C.reset}`);

  // 4. GET /orders/:id (verifica el estado final)
  await sleep(800);
  const get2 = await http("GET", `${API_URL}/orders/${order.id}`);
  const ok4 = logCall(4, "GET", `${API_URL}/orders/${order.id}`, null, get2, 200);
  const finalOrder = unwrap(get2.body);

  console.log(`\n${C.bold}${C.cyan}══════ ESTADO FINAL DE LA ORDEN ══════${C.reset}`);
  console.log(`  id:           ${finalOrder.id}`);
  console.log(`  order_number: ${finalOrder.order_number}`);
  console.log(`  status:       ${finalOrder.status === "pending" ? C.green : C.red}${finalOrder.status}${C.reset} ${C.dim}(esperado: pending)${C.reset}`);
  console.log(`  sync_status:  ${finalOrder.sync_status === "sent" ? C.green : C.yellow}${finalOrder.sync_status}${C.reset}`);
  console.log(`  last_sync:    ${finalOrder.last_sync_attempt ?? "null"}`);

  // VEREDICTO
  console.log("");
  const allOk = ok1 && ok2 && ok3 && ok4 && finalOrder.status === "pending";
  if (allOk) {
    console.log(`${C.bold}${C.green}╔══════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.green}║  ✓ EL BACKEND SOPORTA "ACTIVAR Y ENVIAR" 100%                ║${C.reset}`);
    console.log(`${C.bold}${C.green}║  Los 4 endpoints respondieron OK y la orden cambio a pending ║${C.reset}`);
    console.log(`${C.bold}${C.green}╚══════════════════════════════════════════════════════════════╝${C.reset}`);
  } else {
    console.log(`${C.bold}${C.red}✗ ALGO FALLO. Revisar logs arriba.${C.reset}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
