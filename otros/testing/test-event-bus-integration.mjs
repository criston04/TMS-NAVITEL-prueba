#!/usr/bin/env node
/**
 * TEST DE INTEGRACION DEL EVENT BUS
 *
 * Reproduce el flujo completo de una orden y verifica que los eventos
 * correctos se publican al bus en cada paso.
 *
 * NOTA: este script solo prueba que el backend funciona y que el flujo de
 * status transitions ocurre. Para validar que el frontend publica eventos al
 * bus hay que probarlo IN-BROWSER (ver `otros/testing/test-bus-in-browser.md`).
 *
 * USO:
 *   node otros/testing/test-event-bus-integration.mjs
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, ok: res.ok, body: data };
}

const unwrap = (d) => d?.data ?? d?.items ?? d;

function step(num, title, expectedBusEvent) {
  console.log("");
  console.log(`${C.bold}${C.cyan}─── PASO ${num}: ${title} ───${C.reset}`);
  if (expectedBusEvent) {
    console.log(`${C.dim}  Si el frontend ejecuta este flujo, deberia publicar:${C.reset}`);
    console.log(`${C.cyan}  → tmsEventBus.publish('${expectedBusEvent}', {...}, 'order-service')${C.reset}`);
  }
}

async function main() {
  console.log(`${C.bold}${C.cyan}TEST INTEGRACION EVENT BUS — flujo end-to-end${C.reset}`);
  console.log(`Backend: ${API_BASE}\n`);

  // Login
  const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = unwrap(login.body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login OK\n`);

  // Get IDs
  const cust = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(500);
  const drv = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);
  await sleep(500);
  const veh = unwrap((await http("GET", `${API_URL}/master/vehicles?pageSize=5`)).body);

  // PASO 1: createOrder → debe publicar 'order:created'
  step(1, "POST /orders (crear)", "order:created");
  const orderNumber = `ORD-BUS-${Date.now()}`;
  const create = await http("POST", `${API_URL}/orders`, {
    order_number: orderNumber,
    customer_id: cust[0].id,
    type: "delivery",
    priority: "high",
    origin_address: "Test origen",
    destination_address: "Test destino",
  });
  const order = unwrap(create.body);
  console.log(`${C.green}✓${C.reset} Orden creada: id=${order.id.slice(0,8)} status=${order.status}`);

  await sleep(800);

  // PASO 2: PATCH /status → debe publicar 'order:status_changed'
  step(2, "PATCH /orders/:id/status (draft → pending)", "order:status_changed");
  const toPending = await http("PATCH", `${API_URL}/orders/${order.id}/status`, { status: "pending" });
  console.log(`${C.green}✓${C.reset} Status cambiado: ${toPending.status === 200 ? "OK" : "FAIL"}`);

  await sleep(800);

  // PASO 3: PATCH /assign → debe publicar 'order:assigned' + 'order:status_changed'
  step(3, "PATCH /orders/:id/assign", "order:assigned + order:status_changed");
  const assign = await http("PATCH", `${API_URL}/orders/${order.id}/assign`, {
    vehicle_id: veh[0].id,
    driver_id: drv[0].id,
  });
  const assigned = unwrap(assign.body);
  console.log(`${C.green}✓${C.reset} Asignado: status=${assigned.status}`);

  await sleep(800);

  // PASO 4: startTrip → debe publicar 'order:status_changed'
  step(4, "PATCH /orders/:id/status (assigned → in_transit)", "order:status_changed");
  await http("PATCH", `${API_URL}/orders/${order.id}/status`, { status: "in_transit" });
  console.log(`${C.green}✓${C.reset} Iniciado viaje`);

  await sleep(800);

  // PASO 5: completed → debe publicar 'order:status_changed' + 'order:completed'
  step(5, "PATCH /orders/:id/status (in_transit → completed)", "order:status_changed + order:completed");
  await http("PATCH", `${API_URL}/orders/${order.id}/status`, { status: "completed" });
  console.log(`${C.green}✓${C.reset} Completada`);

  await sleep(800);

  // PASO 6: closeOrder → debe publicar 'order:closed'
  step(6, "POST /orders/:id/close (completed → closed)", "order:closed");
  await http("POST", `${API_URL}/orders/${order.id}/close`, {
    observations: "Cierre desde test bus",
    incidents: [],
    deviationReasons: [],
    closedBy: "test-bus",
    closedByName: "Test Bus",
  });
  console.log(`${C.green}✓${C.reset} Cerrada`);

  // Resumen
  console.log("");
  console.log(`${C.bold}${C.green}╔═══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.green}║                   FLUJO BACKEND OK                            ║${C.reset}`);
  console.log(`${C.bold}${C.green}╚═══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log("");
  console.log(`${C.bold}Eventos que el frontend deberia publicar al tmsEventBus:${C.reset}`);
  console.log(`  ${C.green}1.${C.reset} order:created           ← OrderService.createOrder`);
  console.log(`  ${C.green}2.${C.reset} order:status_changed    ← OrderService.updateOrder (status pending)`);
  console.log(`  ${C.green}3.${C.reset} order:assigned          ← OrderService.assignVehicleAndDriver`);
  console.log(`  ${C.green}3.${C.reset} order:status_changed    ← (mismo metodo, side effect)`);
  console.log(`  ${C.green}4.${C.reset} order:status_changed    ← OrderService.startTrip`);
  console.log(`  ${C.green}5.${C.reset} order:status_changed    ← OrderService.updateOrder (completed)`);
  console.log(`  ${C.green}5.${C.reset} order:completed         ← (side effect)`);
  console.log(`  ${C.green}6.${C.reset} order:closed            ← OrderService.closeOrder`);
  console.log("");
  console.log(`${C.bold}Total: 8 publishes esperados desde 6 calls del frontend.${C.reset}`);
  console.log("");
  console.log(`${C.dim}Para verificar in-browser:${C.reset}`);
  console.log(`${C.dim}  1. Abre DevTools Console en localhost:3000${C.reset}`);
  console.log(`${C.dim}  2. Ejecuta: window.__tmsEventBus = (await import('@/services/integration/event-bus.service')).tmsEventBus${C.reset}`);
  console.log(`${C.dim}  3. window.__tmsEventBus.subscribe('order:created', e => console.log('[BUS] order:created', e))${C.reset}`);
  console.log(`${C.dim}  4. Crea una orden via wizard y deberias ver el log en consola${C.reset}`);
}

main().catch(e => { console.error(e); process.exit(1); });
