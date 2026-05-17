#!/usr/bin/env node
/**
 * PRUEBA MANUAL DE CREACION DE ORDEN — POST /orders
 *
 * Reproduce paso a paso lo que hace el frontend cuando un usuario llena
 * el wizard y hace click en "Crear orden". Captura request y response
 * COMPLETAS para diagnosticar el HTTP 500.
 *
 * USO:
 *   node otros/testing/test-orders-create-manual.mjs
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};

const sep = (t) => console.log(`\n${C.bold}${C.cyan}═══════ ${t} ═══════${C.reset}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let TOKEN = null;

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const t0 = Date.now();
  const res = await fetch(url, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return {
    status: res.status,
    ok: res.ok,
    latencyMs: Date.now() - t0,
    headers: Object.fromEntries(res.headers.entries()),
    body: data,
    raw,
  };
}

function unwrapList(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (Array.isArray(d.items)) return d.items;
  if (Array.isArray(d.data)) return d.data;
  return [];
}

// ─────────────────────────────────────────────────────────────────
// PASO 1: LOGIN
// ─────────────────────────────────────────────────────────────────
async function login() {
  sep("PASO 1 — LOGIN");
  console.log(`POST ${LOGIN_URL}`);
  console.log(`  body: { username: "${LOGIN_USER}", password: "***" }`);
  const r = await http("POST", LOGIN_URL, { username: LOGIN_USER, password: LOGIN_PASSWORD });
  console.log(`  → ${r.status} ${r.ok ? C.green + "OK" : C.red + "FAIL"}${C.reset} (${r.latencyMs}ms)`);
  if (!r.ok) {
    console.log(`  body:`, r.body);
    process.exit(1);
  }
  const p = r.body?.data ?? r.body;
  TOKEN = p?.accessToken || p?.token;
  if (!TOKEN) { console.log(`${C.red}✗ Sin token${C.reset}`); process.exit(1); }
  console.log(`  token: ${TOKEN.slice(0, 30)}...`);
}

// ─────────────────────────────────────────────────────────────────
// PASO 2: OBTENER IDs REALES (igual que el wizard)
// ─────────────────────────────────────────────────────────────────
async function getIds() {
  sep("PASO 2 — OBTENER IDs DE MASTER");
  await sleep(1500);
  const cust = await http("GET", `${API_URL}/master/customers?pageSize=5`);
  console.log(`  GET /master/customers → ${cust.status} (${unwrapList(cust.body).length} clientes)`);
  await sleep(1500);
  const drv = await http("GET", `${API_URL}/master/drivers?pageSize=5`);
  console.log(`  GET /master/drivers   → ${drv.status} (${unwrapList(drv.body).length} conductores)`);
  await sleep(1500);
  const veh = await http("GET", `${API_URL}/master/vehicles?pageSize=5`);
  console.log(`  GET /master/vehicles  → ${veh.status} (${unwrapList(veh.body).length} vehiculos)`);

  const ids = {
    customerId: unwrapList(cust.body)[0]?.id,
    customerName: unwrapList(cust.body)[0]?.name || unwrapList(cust.body)[0]?.legal_name,
    driverId: unwrapList(drv.body)[0]?.id,
    driverName: unwrapList(drv.body)[0]?.full_name || unwrapList(drv.body)[0]?.fullName,
    vehicleId: unwrapList(veh.body)[0]?.id,
    vehiclePlate: unwrapList(veh.body)[0]?.plate,
  };

  console.log(`\n  customer: ${ids.customerId}  (${ids.customerName})`);
  console.log(`  driver:   ${ids.driverId}  (${ids.driverName})`);
  console.log(`  vehicle:  ${ids.vehicleId}  (${ids.vehiclePlate})`);

  if (!ids.customerId || !ids.driverId || !ids.vehicleId) {
    console.log(`${C.red}✗ Faltan IDs${C.reset}`);
    process.exit(1);
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────
// PASO 3: PAYLOAD COMPLETO (replica wizard del frontend tal cual)
// ─────────────────────────────────────────────────────────────────
function buildPayloadCompleto(ids) {
  const now = Date.now();
  return {
    type: "delivery",
    priority: "high",
    customer_id: ids.customerId,
    customer_name: ids.customerName || "Test Customer",
    driver_id: ids.driverId,
    driver_name: ids.driverName || "Test Driver",
    vehicle_id: ids.vehicleId,
    vehicle_plate: ids.vehiclePlate || "TST-001",
    origin_address: "Almacen Test - Origen",
    origin_lat: -12.046,
    origin_lng: -77.042,
    destination_address: "Cliente Test - Destino",
    destination_lat: -12.054,
    destination_lng: -77.123,
    scheduled_pickup_at: new Date(now + 86400000).toISOString(),
    scheduled_delivery_at: new Date(now + 86400000 + 21600000).toISOString(),
    estimated_distance_km: 25.5,
    total_weight: 1500,
    total_volume: 5.2,
    total_packages: 10,
    notes: `Prueba manual ${new Date().toISOString()}`,
    reference: `MANUAL-${now}`,
  };
}

function buildPayloadMinimo(ids) {
  return {
    type: "delivery",
    priority: "medium",
    customer_id: ids.customerId,
    origin_address: "Origen minimo",
    destination_address: "Destino minimo",
  };
}

// ─────────────────────────────────────────────────────────────────
// PASO 4: TRES INTENTOS DE POST /orders CON PAYLOADS DISTINTOS
// ─────────────────────────────────────────────────────────────────
async function intento(label, payload) {
  console.log(`\n${C.bold}${C.yellow}── ${label} ──${C.reset}`);
  console.log(`POST ${API_URL}/orders`);
  console.log(`Authorization: Bearer ${TOKEN.slice(0, 20)}...`);
  console.log(`Content-Type: application/json`);
  console.log(`\nPayload:`);
  console.log(JSON.stringify(payload, null, 2));

  const r = await http("POST", `${API_URL}/orders`, payload);

  console.log(`\n${C.bold}Response:${C.reset}`);
  const statusColor = r.ok ? C.green : (r.status >= 500 ? C.red : C.yellow);
  console.log(`  Status: ${statusColor}${r.status}${C.reset} (${r.latencyMs}ms)`);
  console.log(`  Response headers:`);
  for (const [k, v] of Object.entries(r.headers)) {
    console.log(`    ${k}: ${v}`);
  }
  console.log(`\n  Response body:`);
  if (typeof r.body === 'string') {
    console.log(`    ${r.body}`);
  } else {
    console.log(JSON.stringify(r.body, null, 2).split('\n').map(l => '    ' + l).join('\n'));
  }
  console.log(`\n  Raw response (first 500 chars):`);
  console.log(`    ${(r.raw || '').slice(0, 500)}`);
  return r;
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function main() {
  console.log(`${C.bold}PRUEBA MANUAL — POST /orders${C.reset}`);
  console.log(`Backend: ${API_BASE}`);
  console.log(`Fecha:   ${new Date().toISOString()}`);

  await login();
  const ids = await getIds();

  sep("PASO 3 — INTENTOS DE CREACION");

  const payloadCompleto = buildPayloadCompleto(ids);
  await sleep(2000);
  const r1 = await intento("INTENTO 1: payload completo (los 21 campos del wizard)", payloadCompleto);

  await sleep(2000);
  const payloadMinimo = buildPayloadMinimo(ids);
  const r2 = await intento("INTENTO 2: payload minimo (5 campos)", payloadMinimo);

  await sleep(2000);
  const r3 = await intento("INTENTO 3: payload vacio {}", {});

  // INTENTO 4: con order_number generado en el front (lo que pide el backend)
  await sleep(2000);
  const orderNumberFront = `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const r4 = await intento(
    "INTENTO 4: completo + order_number generado en el front",
    { ...buildPayloadCompleto(ids), order_number: orderNumberFront }
  );

  // INTENTO 5: minimo + order_number
  await sleep(2000);
  const orderNumberFront2 = `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const r5 = await intento(
    "INTENTO 5: minimo + order_number",
    { ...buildPayloadMinimo(ids), order_number: orderNumberFront2 }
  );

  // ─────────────────────────────────────────────────────────────
  // VEREDICTO
  // ─────────────────────────────────────────────────────────────
  sep("VEREDICTO");
  const results = [r1, r2, r3, r4, r5];
  const labels = [
    "completo SIN order_number",
    "minimo SIN order_number",
    "vacio {}",
    "completo CON order_number",
    "minimo CON order_number",
  ];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const tag = r.ok ? `${C.green}OK${C.reset}` : `${C.red}FAIL${C.reset}`;
    console.log(`  ${labels[i].padEnd(32)} → ${r.status}  ${tag}`);
  }

  const all500 = results.every(r => r.status === 500);
  const all400 = results.every(r => r.status === 400);
  const anyOk = results.some(r => r.ok);
  const onlyWithOrderNumberOk = !r1.ok && !r2.ok && (r4.ok || r5.ok);

  console.log("");
  if (onlyWithOrderNumberOk) {
    console.log(`${C.yellow}${C.bold}⚠ HIPOTESIS CONFIRMADA: el backend AHORA EXIGE order_number.${C.reset}`);
    console.log(`  Sin order_number: 500. Con order_number: ${r4.ok ? '200/201' : r4.status}.`);
    console.log(`  Hay que fixear el wizard para que envie order_number incluso en modo automatico.`);
  } else if (anyOk) {
    console.log(`${C.green}${C.bold}✓ POST /orders FUNCIONA con al menos un payload.${C.reset}`);
    console.log(`  Ver cual de los intentos fue 200/201 arriba.`);
  } else if (all500) {
    console.log(`${C.red}${C.bold}✗ BUG CONFIRMADO: POST /orders → 500 con TODOS los payloads.${C.reset}`);
    console.log(`  Esto descarta que sea problema del payload del frontend.`);
    console.log(`  El handler del backend tiene un bug interno (excepcion no controlada).`);
    console.log(`  Causas probables:`);
    console.log(`    1. Trigger SQL fallando (probablemente uno nuevo del deploy 2026-05-03).`);
    console.log(`    2. Columna NOT NULL agregada sin DEFAULT y sin contemplar en el handler.`);
    console.log(`    3. Hook/middleware que crashea al insertar.`);
    console.log(`    4. Constraint FK rota.`);
    console.log(`  Pedir al backend: stack trace del 500 + revisar logs del deploy.`);
  } else if (all400) {
    console.log(`${C.yellow}${C.bold}⚠ POST /orders rechaza con 400 — el payload no cumple validacion.${C.reset}`);
  } else {
    console.log(`${C.yellow}Resultado mixto. Revisar arriba.${C.reset}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
