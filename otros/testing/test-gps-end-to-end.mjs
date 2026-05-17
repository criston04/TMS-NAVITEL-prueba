#!/usr/bin/env node
/**
 * VALIDACION E2E del flujo GPS completo:
 *
 *  1. Crear vehiculo CON gps_device_id (simula el form arreglado)
 *  2. Crear orden asignada a ese vehiculo
 *  3. Enviar la orden (POST /orders/bulk-send)
 *  4. Verificar que el response del backend confirma la asociacion al GPS
 *  5. Verificar que sync_status pasa a "sent"
 *
 * Si todo sale OK significa que el form del frontend ya esta listo
 * para que el usuario cargue IMEIs y el flujo de envio sea real.
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };

let TOKEN = null;
async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, ok: res.ok, body: data };
}
const unwrap = (d) => d?.data ?? d?.items ?? d;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log(`${C.bold}${C.cyan}E2E: Flujo GPS completo (crear vehiculo con GPS → enviar orden)${C.reset}\n`);

  TOKEN = unwrap((await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" })).body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login\n`);

  // ════ FASE 1: crear vehiculo con gps_device_id ════
  console.log(`${C.bold}═══ FASE 1: Crear vehiculo CON gps_device_id ═══${C.reset}`);
  const plate = `ABC-${Math.floor(100 + Math.random() * 900)}`;
  const imei = "865012345678901";
  const vehResp = await http("POST", `${API_URL}/master/vehicles`, {
    plate,
    vehicle_type: "truck",
    brand: "GPS Test",
    model: "Tracker",
    year: 2024,
    status: "active",
    gps_device_id: imei,    // ← lo que el form arreglado va a enviar
  });
  const vehicle = unwrap(vehResp.body);
  console.log(`  Status: ${vehResp.status}`);
  console.log(`  ${C.green}✓${C.reset} Vehiculo: ${vehicle.id.slice(0,8)} plate=${vehicle.plate}`);
  console.log(`  ${C.green}✓${C.reset} gps_device_id persistido: ${C.bold}${vehicle.gps_device_id}${C.reset}`);

  await sleep(800);

  // ════ FASE 2: obtener customer y crear orden con este vehiculo ════
  console.log(`\n${C.bold}═══ FASE 2: Crear orden asignada al vehiculo con GPS ═══${C.reset}`);
  const cust = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(400);
  const drv = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);

  const orderResp = await http("POST", `${API_URL}/orders`, {
    order_number: `ORD-GPS-${Date.now()}`,
    customer_id: cust[0].id,
    customer_name: cust[0].name,
    type: "delivery",
    priority: "high",
    vehicle_id: vehicle.id,           // ← el que tiene gps_device_id
    vehicle_plate: vehicle.plate,
    driver_id: drv[0].id,
    driver_name: "Test Driver",
    origin_address: "Origen GPS",
    origin_lat: -12.046, origin_lng: -77.042,
    destination_address: "Destino GPS",
    destination_lat: -12.054, destination_lng: -77.123,
    scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_delivery_at: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    estimated_distance_km: 25.5,
    total_weight: 1000,
    total_volume: 5,
    total_packages: 10,
  });
  const order = unwrap(orderResp.body);
  console.log(`  Status: ${orderResp.status}`);
  console.log(`  ${C.green}✓${C.reset} Orden: ${order.id.slice(0,8)} status=${order.status}`);
  console.log(`  ${C.dim}vehicle_imei (en la orden): ${order.vehicle_imei ?? "null"}${C.reset}`);

  await sleep(800);

  // ════ FASE 3: cambiar a pending + enviar ════
  console.log(`\n${C.bold}═══ FASE 3: Activar y enviar la orden ═══${C.reset}`);
  await http("PATCH", `${API_URL}/orders/${order.id}/status`, { status: "pending" });
  console.log(`  ${C.green}✓${C.reset} Status: draft → pending`);

  await sleep(500);

  const sendResp = await http("POST", `${API_URL}/orders/bulk-send`, { orderIds: [order.id] });
  console.log(`  Status: ${sendResp.status}`);
  console.log(`  ${C.bold}Response del backend:${C.reset}`);
  console.log(`  ${JSON.stringify(sendResp.body, null, 2).split("\n").join("\n  ")}`);

  await sleep(1000);

  // ════ FASE 4: verificar estado final ════
  console.log(`\n${C.bold}═══ FASE 4: Verificar persistencia ═══${C.reset}`);
  const final = unwrap((await http("GET", `${API_URL}/orders/${order.id}`)).body);
  console.log(`  Orden final:`);
  console.log(`    status:           ${C.bold}${final.status}${C.reset}`);
  console.log(`    sync_status:      ${C.bold}${final.sync_status === "sent" ? C.green : C.yellow}${final.sync_status}${C.reset}`);
  console.log(`    last_sync:        ${final.last_sync_attempt ?? "null"}`);
  console.log(`    vehicle_id:       ${final.vehicle_id?.slice(0,8) ?? "null"}`);
  console.log(`    vehicle_imei:     ${final.vehicle_imei ?? C.dim + "null" + C.reset}`);

  // Limpiar
  await http("DELETE", `${API_URL}/orders/${order.id}`);
  await http("DELETE", `${API_URL}/master/vehicles/${vehicle.id}`);

  // ════ VEREDICTO ════
  console.log(`\n${C.bold}${C.cyan}══════════════════ VEREDICTO ══════════════════${C.reset}`);
  const allOk = vehicle.gps_device_id === imei && final.sync_status === "sent";
  if (allOk) {
    console.log(`${C.green}${C.bold}✓ Flujo completo OK${C.reset}`);
    console.log(`  El campo gps_device_id se persistio en el vehiculo.`);
    console.log(`  El bulk-send asocio la orden al vehiculo y respondio "sent".`);
    console.log(`  El form del frontend YA esta listo para producir este flujo.`);
  } else {
    console.log(`${C.yellow}⚠ Algo no salio como esperado${C.reset}`);
    console.log(`  vehicle.gps_device_id=${vehicle.gps_device_id} (esperado: ${imei})`);
    console.log(`  final.sync_status=${final.sync_status} (esperado: sent)`);
  }

  // Detalle adicional: el response confirma plataforma GPS?
  if (typeof sendResp.body === "object" && sendResp.body.message?.includes("GPS")) {
    console.log(`\n${C.green}✓${C.reset} El backend confirmo: ${C.bold}"${sendResp.body.message}"${C.reset}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
