#!/usr/bin/env node
/**
 * PRUEBA "FUERTE" — POST /orders con TODOS los campos rellenos
 *
 * Manda el payload mas completo posible (lo que el wizard genera cuando
 * el usuario llena todo: origen, destino, coordenadas, geocercas,
 * fechas programadas, distancia, items, vehiculo con IMEI, etc).
 *
 * Despues hace GET del id devuelto para verificar que los campos
 * persistieron en la BD (no solo que el backend dijo OK).
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m",
};
const sep = (t) => console.log(`\n${C.bold}${C.cyan}═══════ ${t} ═══════${C.reset}`);
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
  return { status: res.status, ok: res.ok, latencyMs: Date.now() - t0, body: data, raw };
}
const list = (d) => d ? (Array.isArray(d) ? d : (d.items || d.data || [])) : [];

async function login() {
  sep("LOGIN");
  const r = await http("POST", LOGIN_URL, { username: LOGIN_USER, password: LOGIN_PASSWORD });
  const p = r.body?.data ?? r.body;
  TOKEN = p?.accessToken || p?.token;
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.status} (${r.latencyMs}ms)`);
}

async function getIds() {
  sep("OBTENER IDs DE MASTER");
  const cust = list((await http("GET", `${API_URL}/master/customers?pageSize=10`)).body);
  await sleep(800);
  const drv = list((await http("GET", `${API_URL}/master/drivers?pageSize=10`)).body);
  await sleep(800);
  const veh = list((await http("GET", `${API_URL}/master/vehicles?pageSize=20`)).body);
  await sleep(800);
  const geo = list((await http("GET", `${API_URL}/geofences?pageSize=10`)).body);
  await sleep(800);
  const wf = list((await http("GET", `${API_URL}/master/workflows?pageSize=5`)).body);

  // Buscar vehiculo con IMEI para flujo GPS
  const vehiculoConIMEI = veh.find(v => v.imei || v.vehicle_imei);
  const vehiculoSinIMEI = veh.find(v => !v.imei && !v.vehicle_imei);

  console.log(`  ${cust.length} clientes, ${drv.length} conductores, ${veh.length} vehiculos`);
  console.log(`  ${geo.length} geocercas, ${wf.length} workflows`);
  console.log(`  vehiculo con IMEI:  ${vehiculoConIMEI ? `${vehiculoConIMEI.plate} (imei=${vehiculoConIMEI.imei || vehiculoConIMEI.vehicle_imei})` : 'NINGUNO'}`);
  console.log(`  vehiculo sin IMEI:  ${vehiculoSinIMEI?.plate || 'NINGUNO'}`);

  return {
    customer: cust[0],
    driver: drv[0],
    vehiculoConIMEI,
    vehiculoSinIMEI: vehiculoSinIMEI ?? veh[0],
    geofenceOrigin: geo[0],
    geofenceDestination: geo[1] ?? geo[0],
    workflow: wf[0],
  };
}

function generateOrderNumber() {
  return `ORD-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
}

// PAYLOAD COMPLETO — todo lo que mapOrderToBackend produce + IMEI
function buildFullPayload(ctx, useGps) {
  const now = Date.now();
  const veh = useGps ? ctx.vehiculoConIMEI : ctx.vehiculoSinIMEI;
  if (!veh) throw new Error('No hay vehiculo disponible');

  return {
    // Identificacion
    order_number: generateOrderNumber(),
    customer_id: ctx.customer.id,
    customer_name: ctx.customer.name || ctx.customer.legal_name,

    // Tipo y prioridad
    type: 'delivery',
    priority: 'high',
    status: 'pending',

    // Asignacion
    vehicle_id: veh.id,
    vehicle_plate: veh.plate,
    vehicle_imei: veh.imei || veh.vehicle_imei || undefined,
    driver_id: ctx.driver.id,
    driver_name: ctx.driver.full_name || ctx.driver.fullName || `${ctx.driver.first_name ?? ''} ${ctx.driver.last_name ?? ''}`.trim(),

    // Origen (con geocerca + coordenadas)
    origin_address: 'Almacen Central Lurin - Av. Industrial 1234, Lurin, Lima',
    origin_lat: -12.273,
    origin_lng: -76.871,
    origin_geofence_id: ctx.geofenceOrigin?.id,

    // Destino (con geocerca + coordenadas)
    destination_address: 'Cliente VIP - Av. Conquistadores 567, San Isidro, Lima',
    destination_lat: -12.097,
    destination_lng: -77.030,
    destination_geofence_id: ctx.geofenceDestination?.id,

    // Timing
    scheduled_pickup_at: new Date(now + 86400000).toISOString(),       // mañana
    scheduled_delivery_at: new Date(now + 86400000 + 28800000).toISOString(), // mañana + 8h

    // Distancia (Route Planner ya simulado)
    estimated_distance_km: 35.7,

    // Carga (aplanada)
    total_weight: 1850,
    total_volume: 7.4,
    total_packages: 24,

    // Notas
    notes: 'Cliente prefiere entrega antes de las 16h. Llamar al telefono del receptor antes de salir.',
    internal_notes: '[Carga] Descripcion: contenedores refrigerados | Tipo: refrigerated | Valor declarado: 12500 USD | Manejo: no apilar mas de 2 cajas | Temperatura controlada: si | Rango: 2-8 celsius',
    reference: 'BL-NAV-2026-555',

    // Items
    items: [
      { product_name: 'Contenedor Frigo 40ft', quantity: 1, unit: 'unidad', weight: 1500, volume: 6.5, notes: 'Conexion electrica requerida' },
      { product_name: 'Caja farmaceuticos', quantity: 24, unit: 'caja', weight: 350, volume: 0.9, notes: 'Mantener entre 2-8C' },
    ],
  };
}

async function intento(label, payload) {
  console.log(`\n${C.bold}${C.yellow}── ${label} ──${C.reset}`);
  console.log(`Campos enviados: ${Object.keys(payload).length}`);
  console.log(`Payload:\n${JSON.stringify(payload, null, 2).split('\n').map(l => '  ' + l).join('\n')}`);

  const r = await http("POST", `${API_URL}/orders`, payload);

  console.log(`\n${C.bold}Response:${C.reset}`);
  const cl = r.ok ? C.green : (r.status >= 500 ? C.red : C.yellow);
  console.log(`  Status: ${cl}${r.status}${C.reset} (${r.latencyMs}ms)`);
  if (typeof r.body === 'string') {
    console.log(`  Body: ${r.body}`);
  } else {
    const created = r.body?.data ?? r.body;
    if (r.ok && created) {
      console.log(`  id: ${created.id}`);
      console.log(`  order_number: ${created.order_number}`);
      console.log(`  status: ${created.status}`);
      console.log(`  Persistio ${Object.values(created).filter(v => v !== null && v !== undefined).length} de ${Object.keys(created).length} campos`);
    } else {
      console.log(`  Body:\n${JSON.stringify(r.body, null, 2).split('\n').map(l => '  ' + l).join('\n')}`);
    }
  }
  return r;
}

// Compara lo que enviamos con lo que el backend devolvio
function diffPayloads(sent, returned, label) {
  console.log(`\n${C.bold}${C.cyan}── ANALISIS DE PERSISTENCIA: ${label} ──${C.reset}`);
  const persistio = [];
  const seIgnoro = [];
  const cambioValor = [];
  const noEnEsquema = [];

  for (const [k, vSent] of Object.entries(sent)) {
    if (!(k in returned)) {
      noEnEsquema.push(k);
      continue;
    }
    const vRet = returned[k];
    if (vRet === null || vRet === undefined) {
      seIgnoro.push({ k, sent: vSent });
    } else if (JSON.stringify(vSent) !== JSON.stringify(vRet)) {
      cambioValor.push({ k, sent: vSent, returned: vRet });
    } else {
      persistio.push(k);
    }
  }

  console.log(`\n  ${C.green}Campos que PERSISTIERON tal cual (${persistio.length}):${C.reset}`);
  persistio.forEach(k => console.log(`    ✓ ${k}`));

  if (cambioValor.length) {
    console.log(`\n  ${C.yellow}Campos que CAMBIARON de valor (${cambioValor.length}):${C.reset}`);
    cambioValor.forEach(({ k, sent, returned }) => {
      console.log(`    ⚠ ${k}: enviado=${JSON.stringify(sent).slice(0,60)}  ->  devuelto=${JSON.stringify(returned).slice(0,60)}`);
    });
  }

  if (seIgnoro.length) {
    console.log(`\n  ${C.red}Campos que el backend IGNORO / no persistio (${seIgnoro.length}):${C.reset}`);
    seIgnoro.forEach(({ k, sent }) => {
      const v = JSON.stringify(sent ?? null);
      console.log(`    ✗ ${k}: enviado=${v.slice(0,80)}`);
    });
  }

  if (noEnEsquema.length) {
    console.log(`\n  ${C.dim}Campos enviados pero NO existen en el shape de respuesta (${noEnEsquema.length}):${C.reset}`);
    noEnEsquema.forEach(k => console.log(`    ? ${k}`));
  }
}

async function main() {
  console.log(`${C.bold}PRUEBA — POST /orders con TODOS los campos${C.reset}`);
  console.log(`Backend: ${API_BASE}\n`);

  await login();
  const ctx = await getIds();
  await sleep(1500);

  // ═══ INTENTO A: Sin GPS pero con TODO lo demás ═══
  sep("INTENTO A — Sin IMEI + todos los campos");
  const payloadA = buildFullPayload(ctx, false);
  const rA = await intento("Sin GPS + completo", payloadA);
  if (rA.ok && rA.body) {
    diffPayloads(payloadA, rA.body.data ?? rA.body, "Sin GPS + completo");
  }

  // ═══ INTENTO B: Con vehiculo IMEI (si lo encontramos) ═══
  if (ctx.vehiculoConIMEI) {
    await sleep(2000);
    sep("INTENTO B — Con IMEI + todos los campos");
    const payloadB = buildFullPayload(ctx, true);
    const rB = await intento("Con GPS + completo", payloadB);
    if (rB.ok && rB.body) {
      diffPayloads(payloadB, rB.body.data ?? rB.body, "Con GPS + completo");
    }
  } else {
    console.log(`\n${C.dim}Skip INTENTO B: no hay vehiculo con IMEI en la base.${C.reset}`);
  }

  // ═══ Verificar que se puede leer la orden ═══
  if (rA.ok) {
    await sleep(2000);
    sep("VERIFICACION — GET /orders/:id");
    const id = (rA.body.data ?? rA.body).id;
    const get = await http("GET", `${API_URL}/orders/${id}`);
    console.log(`  GET /orders/${id} -> ${get.status}`);
    if (get.ok) {
      const order = get.body?.data ?? get.body;
      console.log(`  La orden EXISTE en la BD.`);
      console.log(`  origin_address tras GET: ${order.origin_address ?? 'null'}`);
      console.log(`  destination_address tras GET: ${order.destination_address ?? 'null'}`);
      console.log(`  scheduled_pickup_at tras GET: ${order.scheduled_pickup_at ?? 'null'}`);
      console.log(`  estimated_distance_km tras GET: ${order.estimated_distance_km ?? 'null'}`);
      console.log(`  items tras GET: ${JSON.stringify(order.items)}`);
    }
  }

  sep("FIN");
}

main().catch(e => { console.error(e); process.exit(1); });
