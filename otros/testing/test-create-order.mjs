#!/usr/bin/env node
/**
 * TEST AUTOMATIZADO — CREATE ORDER end-to-end
 *
 * Replica EXACTAMENTE el flujo de creación de orden del frontend:
 *   1. Login con credenciales reales
 *   2. Lista master entities (customers, drivers, vehicles, operators) y toma 1 ID
 *   3. Construye CreateOrderDTO simulando lo que el wizard envía
 *   4. Aplica mapOrderToBackend() (lógica replicada en JS)
 *   5. POST /orders y captura response
 *   6. Diff campo a campo: ¿qué se persistió, qué se perdió, qué cambió?
 *   7. GET /orders/{id} para verificar persistencia
 *   8. PATCH /orders/{id} para probar update
 *   9. Resumen consolidado
 *
 * USO:
 *   node otros/testing/test-create-order.mjs
 *
 * Variables de entorno (opcional):
 *   API_BASE        default: https://api-service.gruponavitel.com
 *   LOGIN_USER      default: admin
 *   LOGIN_PASSWORD  default: Admin1432!
 *   CLEANUP         si "true", elimina la orden creada al final (default: false)
 */

const API_BASE = process.env.API_BASE || "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGIN_USER = process.env.LOGIN_USER || "admin";
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || "Admin1432!";
const CLEANUP = process.env.CLEANUP === "true";

const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

let TOKEN = null;

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function log(msg = "") { process.stdout.write(msg + "\n"); }
function header(title) {
  log("");
  log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════${C.reset}`);
  log(`${C.bold}${C.cyan}  ${title}${C.reset}`);
  log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════${C.reset}`);
}
function subheader(title) {
  log("");
  log(`${C.bold}${C.blue}── ${title} ──${C.reset}`);
}

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const t0 = Date.now();
  let res, raw, data;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    raw = await res.text();
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  } catch (err) {
    return { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
  }

  return {
    ok: res.ok,
    status: res.status,
    latencyMs: Date.now() - t0,
    data,
    raw,
  };
}

/** Acepta envelope { data: ... }, { items: ... }, o array crudo */
function unwrapList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.items)) return data.data.items;
  return [];
}

function unwrapEntity(data) {
  if (!data) return null;
  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) return data.data;
  return data;
}

// ════════════════════════════════════════════════════════════════
// PASO 1: LOGIN
// ════════════════════════════════════════════════════════════════
async function login() {
  header("PASO 1 — Login");
  log(`POST ${LOGIN_URL}`);
  log(`Body: { username: "${LOGIN_USER}", password: "***" }`);

  const r = await http("POST", LOGIN_URL, {
    body: { username: LOGIN_USER, password: LOGIN_PASSWORD },
    token: null,
  });

  if (!r.ok) {
    log(`${C.red}✗ Login FAIL${C.reset}: status=${r.status} latency=${r.latencyMs}ms`);
    log(`Response: ${r.raw?.slice(0, 200)}`);
    process.exit(1);
  }

  const payload = r.data?.data ?? r.data;
  TOKEN = payload?.accessToken || payload?.token;

  if (!TOKEN) {
    log(`${C.red}✗ Login OK pero sin accessToken en respuesta${C.reset}`);
    log(`Response keys: ${Object.keys(payload || {}).join(", ")}`);
    process.exit(1);
  }

  log(`${C.green}✓ Login OK${C.reset} (${r.latencyMs}ms)`);
  log(`Token: ${TOKEN.slice(0, 30)}...`);
  log(`User: ${payload?.user?.username || payload?.user?.email || "?"} (role: ${payload?.user?.role || "?"})`);
}

// ════════════════════════════════════════════════════════════════
// PASO 2: OBTENER IDS REALES DE MASTER ENTITIES
// ════════════════════════════════════════════════════════════════
async function fetchIds() {
  header("PASO 2 — Listar master entities y tomar 1 ID de cada");

  const entities = [
    { key: "customer", url: `${API_URL}/master/customers?pageSize=5` },
    { key: "driver", url: `${API_URL}/master/drivers?pageSize=5` },
    { key: "vehicle", url: `${API_URL}/master/vehicles?pageSize=5` },
    { key: "operator", url: `${API_URL}/master/operators` },
  ];

  const ids = {};
  const refs = {};

  for (const { key, url } of entities) {
    // Pausa de 2 segundos para no saturar rate limit del backend (~1 req/s)
    await new Promise(r => setTimeout(r, 2000));

    log(`GET ${url}`);
    const r = await http("GET", url);

    if (!r.ok) {
      log(`  ${C.yellow}⚠ ${key}: status ${r.status} — saltando${C.reset}`);
      ids[key] = null;
      continue;
    }

    const list = unwrapList(r.data);
    if (list.length === 0) {
      log(`  ${C.yellow}⚠ ${key}: lista vacía — saltando${C.reset}`);
      ids[key] = null;
      continue;
    }

    const first = list[0];
    ids[key] = first.id || first[`${key}_id`] || first.uuid;
    refs[key] = first;
    log(`  ${C.green}✓ ${key}: ${ids[key]}${C.reset} (${list.length} disponibles)`);
  }

  return { ids, refs };
}

// ════════════════════════════════════════════════════════════════
// PASO 3: CONSTRUIR CreateOrderDTO (como hace el wizard del frontend)
// ════════════════════════════════════════════════════════════════
function buildCreateOrderDTO(ids, refs) {
  header("PASO 3 — Construir CreateOrderDTO (simulando wizard)");

  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // mañana
  const end = new Date(start.getTime() + 6 * 60 * 60 * 1000);  // mañana +6h

  const dto = {
    customerId: ids.customer,
    carrierId: ids.operator || undefined,
    vehicleId: ids.vehicle || undefined,
    driverId: ids.driver || undefined,
    priority: "high",
    // 2026-05-02: Probar con "delivery" en lugar de "distribucion".
    // El backend devuelve type:"" cuando enviamos "distribucion", lo que
    // sugiere que su enum no acepta los valores que el frontend usa.
    // Bruno 02-Create.bru usa "delivery" y funciona.
    serviceType: process.env.SERVICE_TYPE || "delivery",
    cargo: {
      description: "Test automatizado — fertilizante NPK",
      type: "general",
      weightKg: 1500,
      volumeM3: 5.2,
      quantity: 10,
      declaredValue: 25000,
      temperatureControlled: false,
      handlingInstructions: "Frágil, mantener seco",
    },
    milestones: [
      {
        type: "origin",
        sequence: 1,
        address: "Almacén Lima Centro - Test",
        coordinates: { lat: -12.046, lng: -77.042 },
        estimatedArrival: start.toISOString(),
        estimatedDeparture: new Date(start.getTime() + 30 * 60 * 1000).toISOString(),
        notes: "Punto de carga (test)",
        contact: {
          name: "Encargado almacén test",
          phone: "+51 999 100 100",
          email: "almacen.test@navitel.com",
        },
      },
      {
        type: "destination",
        sequence: 2,
        address: "Cliente Test SA, Av. Test 123",
        coordinates: { lat: -12.054, lng: -77.123 },
        estimatedArrival: end.toISOString(),
        notes: "Entrega final (test)",
      },
    ],
    scheduledStartDate: start.toISOString(),
    scheduledEndDate: end.toISOString(),
    reference: `TEST-AUTO-${Date.now()}`,
    externalReference: `EXT-TEST-${Date.now()}`,
    notes: "Orden creada por test-create-order.mjs",
    tags: ["test-automatizado", "smoke", "create-order"],
    estimatedDistanceKm: 25.5,
  };

  // Hidratación denormalizada (como hace el wizard cuando hay relaciones)
  if (refs.customer) {
    dto.customer = { id: ids.customer, name: refs.customer.tradeName || refs.customer.name || "Customer Test" };
  }
  if (refs.driver) {
    const fn = refs.driver.firstName ?? refs.driver.first_name ?? "";
    const ln = refs.driver.lastName ?? refs.driver.last_name ?? "";
    dto.driver = { id: ids.driver, fullName: `${fn} ${ln}`.trim() || refs.driver.fullName || "Driver Test" };
  }
  if (refs.vehicle) {
    dto.vehicle = { id: ids.vehicle, plate: refs.vehicle.plate || "TEST-001" };
  }

  log(`${C.dim}DTO construido (${Object.keys(dto).length} campos):${C.reset}`);
  log(`  customerId       = ${dto.customerId}`);
  log(`  carrierId        = ${dto.carrierId}`);
  log(`  vehicleId        = ${dto.vehicleId}`);
  log(`  driverId         = ${dto.driverId}`);
  log(`  priority         = ${dto.priority}`);
  log(`  serviceType      = ${dto.serviceType}`);
  log(`  cargo.weightKg   = ${dto.cargo.weightKg}`);
  log(`  milestones       = ${dto.milestones.length} (origin + destination)`);
  log(`  reference        = ${dto.reference}`);

  return dto;
}

// ════════════════════════════════════════════════════════════════
// PASO 4: APLICAR mapOrderToBackend (replica lógica del transformer)
// ════════════════════════════════════════════════════════════════
//
// 2026-05-02: Actualizado para reflejar la nueva versión del transformer
// que SOLO envía campos oficiales del backend Rev3. Quitados:
//   - cargo{}, milestones[], tags[]    (no existen en Rev3)
//   - carrier_id, gps_operator_id      (no existen en Rev3)
//   - service_type                     (Rev3 solo usa `type`)
//   - external_reference               (Rev3 solo usa `reference`)
//   - scheduled_start_date, scheduled_end_date (Rev3 solo *_pickup_at/*_delivery_at)
// ────────────────────────────────────────────────────────────────────

function mapServiceTypeToBackend(serviceType) {
  if (!serviceType) return undefined;
  const englishEnums = ["delivery", "pickup", "return", "transit"];
  if (englishEnums.includes(serviceType.toLowerCase())) return serviceType.toLowerCase();
  return "delivery";
}

function mapOrderToBackend(dto) {
  header("PASO 4 — Aplicar mapOrderToBackend (Rev3 oficial)");

  const p = {};

  if (dto.orderNumber !== undefined) p.order_number = dto.orderNumber;
  if (dto.customerId !== undefined) p.customer_id = dto.customerId;

  if (dto.customer?.name) p.customer_name = dto.customer.name;
  if (dto.driver?.fullName) p.driver_name = dto.driver.fullName;
  if (dto.vehicle?.plate) p.vehicle_plate = dto.vehicle.plate;
  if (dto.estimatedDistanceKm !== undefined) p.estimated_distance_km = dto.estimatedDistanceKm;

  if (dto.serviceType !== undefined) {
    const mapped = mapServiceTypeToBackend(dto.serviceType);
    if (mapped) p.type = mapped;
  }
  if (dto.priority !== undefined) p.priority = dto.priority;
  if (dto.status !== undefined) p.status = dto.status;

  if (dto.vehicleId !== undefined) p.vehicle_id = dto.vehicleId;
  if (dto.driverId !== undefined) p.driver_id = dto.driverId;

  if (dto.scheduledStartDate) p.scheduled_pickup_at = dto.scheduledStartDate;
  if (dto.scheduledEndDate)   p.scheduled_delivery_at = dto.scheduledEndDate;

  // Carga: solo campos planos
  if (dto.cargo) {
    const c = dto.cargo;
    if (c.weightKg !== undefined) p.total_weight = c.weightKg;
    if (c.volumeM3 !== undefined) p.total_volume = c.volumeM3;
    if (c.quantity !== undefined) p.total_packages = c.quantity;
    const cargoNotes = [];
    if (c.description) cargoNotes.push(`Carga: ${c.description}`);
    if (c.handlingInstructions) cargoNotes.push(`Manejo: ${c.handlingInstructions}`);
    if (cargoNotes.length > 0 && !p.notes) p.notes = cargoNotes.join(" | ");
  }

  // Milestones: solo aplanar a origin/destination
  if (Array.isArray(dto.milestones) && dto.milestones.length > 0) {
    const origin = dto.milestones.find(m => m.type === "origin") ?? dto.milestones[0];
    if (origin) {
      if (origin.address) p.origin_address = origin.address;
      if (origin.coordinates?.lat !== undefined) p.origin_lat = origin.coordinates.lat;
      if (origin.coordinates?.lng !== undefined) p.origin_lng = origin.coordinates.lng;
      if (origin.geofenceId) p.origin_geofence_id = origin.geofenceId;
    }
    const dest = dto.milestones.find(m => m.type === "destination") ?? dto.milestones[dto.milestones.length - 1];
    if (dest && dest !== origin) {
      if (dest.address) p.destination_address = dest.address;
      if (dest.coordinates?.lat !== undefined) p.destination_lat = dest.coordinates.lat;
      if (dest.coordinates?.lng !== undefined) p.destination_lng = dest.coordinates.lng;
      if (dest.geofenceId) p.destination_geofence_id = dest.geofenceId;
    }
  }

  if (dto.reference !== undefined) p.reference = dto.reference;
  if (dto.notes !== undefined) p.notes = dto.notes;

  log(`${C.dim}Payload backend (${Object.keys(p).length} keys):${C.reset}`);
  for (const k of Object.keys(p).sort()) {
    let v = p[k];
    if (typeof v === "object") v = `[${Array.isArray(v) ? "array x" + v.length : "object"}]`;
    if (typeof v === "string" && v.length > 60) v = v.slice(0, 57) + "...";
    log(`  ${k.padEnd(28)} = ${v}`);
  }

  return p;
}

// ════════════════════════════════════════════════════════════════
// PASO 5: POST /orders y comparar
// ════════════════════════════════════════════════════════════════
async function postOrder(payload) {
  header("PASO 5 — POST /orders");

  await new Promise(r => setTimeout(r, 1500)); // pausa para no chocar con rate limit

  const url = `${API_URL}/orders`;
  log(`POST ${url}`);
  log(`Body keys: ${Object.keys(payload).length}`);

  const r = await http("POST", url, { body: payload });

  if (!r.ok) {
    log(`${C.red}✗ POST FAIL${C.reset}: status=${r.status} latency=${r.latencyMs}ms`);
    log(`Response body:`);
    log(JSON.stringify(r.data, null, 2).slice(0, 1500));
    return null;
  }

  log(`${C.green}✓ POST OK${C.reset} (${r.latencyMs}ms, status ${r.status})`);

  const created = unwrapEntity(r.data);
  log(`Response keys: ${Object.keys(created || {}).length}`);
  log(`Created order id: ${created?.id || created?.order_id || "??"}`);
  log(`Order number:     ${created?.order_number || "??"}`);

  return created;
}

// ════════════════════════════════════════════════════════════════
// PASO 6: DIFF — qué campos se persistieron, qué se perdió
// ════════════════════════════════════════════════════════════════
function diffPayloadVsResponse(sent, received) {
  header("PASO 6 — Diff Request vs Response");

  const ok = [], lost = [], changed = [];

  // 1. Campos planos enviados vs recibidos
  subheader("Campos planos");
  const flatKeys = Object.keys(sent).filter(k => {
    const v = sent[k];
    return typeof v !== "object" || v === null;
  });

  for (const k of flatKeys) {
    const expected = sent[k];
    const got = received?.[k];
    if (got === undefined || got === null) {
      lost.push(k);
      log(`  ${C.red}❌ ${k.padEnd(28)} PERDIDO${C.reset}  (env: ${JSON.stringify(expected).slice(0, 50)})`);
    } else if (typeof expected === "string" && typeof got === "string" && expected === got) {
      ok.push(k);
      log(`  ${C.green}✅ ${k.padEnd(28)} ${JSON.stringify(got).slice(0, 50)}${C.reset}`);
    } else if (Number(expected) === Number(got)) {
      ok.push(k);
      log(`  ${C.green}✅ ${k.padEnd(28)} ${got}${C.reset}`);
    } else if (expected === got) {
      ok.push(k);
      log(`  ${C.green}✅ ${k.padEnd(28)} ${got}${C.reset}`);
    } else {
      changed.push(k);
      log(`  ${C.yellow}⚠️  ${k.padEnd(28)} CAMBIA — env: ${JSON.stringify(expected)} | rec: ${JSON.stringify(got)}${C.reset}`);
    }
  }

  // 2. Sub-objetos
  subheader("Sub-objetos / arrays");
  const subKeys = Object.keys(sent).filter(k => typeof sent[k] === "object" && sent[k] !== null);
  for (const k of subKeys) {
    const got = received?.[k];
    if (got === null || got === undefined) {
      log(`  ${C.red}❌ ${k.padEnd(28)} DESCARTADO por backend${C.reset}`);
      lost.push(k);
    } else if (Array.isArray(sent[k])) {
      const sentLen = sent[k].length;
      const gotLen = Array.isArray(got) ? got.length : 0;
      if (sentLen === gotLen) {
        log(`  ${C.green}✅ ${k.padEnd(28)} array preservado (${gotLen} items)${C.reset}`);
        ok.push(k);
      } else {
        log(`  ${C.yellow}⚠️  ${k.padEnd(28)} ARRAY DIFIERE — env: ${sentLen} | rec: ${gotLen}${C.reset}`);
        changed.push(k);
      }
    } else {
      const sentSubKeys = Object.keys(sent[k]);
      const gotSubKeys = Object.keys(got);
      const overlap = sentSubKeys.filter(sk => sk in got);
      log(`  ${C.green}✅ ${k.padEnd(28)} object con ${gotSubKeys.length} keys (overlap ${overlap.length}/${sentSubKeys.length})${C.reset}`);
      ok.push(k);
    }
  }

  // 3. Campos que el backend agregó (no enviamos)
  subheader("Campos agregados por backend");
  const sentKeys = new Set(Object.keys(sent));
  const recvKeys = received ? Object.keys(received) : [];
  const added = recvKeys.filter(k => !sentKeys.has(k));
  log(`  Total nuevos: ${added.length}`);
  const interesting = added.filter(k =>
    !["id", "created_at", "updated_at", "createdAt", "updatedAt", "deleted_at"].includes(k)
  );
  for (const k of interesting.slice(0, 25)) {
    const v = received[k];
    let display = v;
    if (typeof v === "object" && v !== null) display = Array.isArray(v) ? `[array x${v.length}]` : "[object]";
    if (typeof display === "string" && display.length > 60) display = display.slice(0, 57) + "...";
    log(`  ${C.cyan}🆕 ${k.padEnd(28)} = ${display}${C.reset}`);
  }
  if (interesting.length > 25) log(`  ${C.dim}... y ${interesting.length - 25} más${C.reset}`);

  return { ok, lost, changed, added };
}

// ════════════════════════════════════════════════════════════════
// PASO 7a: GET /orders (LIST) — verificar si la orden recién creada aparece
// ════════════════════════════════════════════════════════════════
async function checkInList(id, orderNumber) {
  header(`PASO 7a — GET /orders (verificar persistencia en lista)`);
  await new Promise(r => setTimeout(r, 1500));

  const r = await http("GET", `${API_URL}/orders?pageSize=20&sortBy=created_at&sortOrder=desc`);
  if (!r.ok) {
    log(`${C.red}✗ LIST FAIL${C.reset}: status=${r.status}`);
    return false;
  }
  log(`${C.green}✓ LIST OK${C.reset} (${r.latencyMs}ms)`);
  const list = unwrapList(r.data);
  log(`Órdenes en lista: ${list.length}`);

  const foundById = list.find(o => o.id === id || o.order_id === id);
  const foundByNumber = list.find(o => o.order_number === orderNumber);

  log(`Buscar por id "${id}":         ${foundById ? C.green + "✅ ENCONTRADO" + C.reset : C.red + "❌ NO ESTÁ EN LISTA" + C.reset}`);
  log(`Buscar por order_number "${orderNumber}": ${foundByNumber ? C.green + "✅ ENCONTRADO" + C.reset : C.red + "❌ NO ESTÁ EN LISTA" + C.reset}`);

  if (foundByNumber && !foundById) {
    log(`${C.yellow}⚠️  La orden EXISTE en la BD pero el ID no coincide con el que devolvió POST${C.reset}`);
    log(`   ID real en lista: ${foundByNumber.id}`);
    return foundByNumber.id;
  }

  // Mostrar primeros 3 IDs para diagnóstico
  log(`${C.dim}Primeros 3 IDs en lista:${C.reset}`);
  list.slice(0, 3).forEach(o => log(`  ${o.id} — ${o.order_number}`));

  return foundById ? id : false;
}

// ════════════════════════════════════════════════════════════════
// PASO 7b: GET /orders/{id} — fetch directo por ID
// ════════════════════════════════════════════════════════════════
async function fetchById(id) {
  header(`PASO 7b — GET /orders/${id}`);
  await new Promise(r => setTimeout(r, 1500));

  const r = await http("GET", `${API_URL}/orders/${id}`);
  if (!r.ok) {
    log(`${C.red}✗ GET FAIL${C.reset}: status=${r.status} latency=${r.latencyMs}ms`);
    log(`Response: ${typeof r.data === "string" ? r.data : JSON.stringify(r.data).slice(0, 300)}`);
    return null;
  }
  log(`${C.green}✓ GET OK${C.reset} (${r.latencyMs}ms)`);
  const obj = unwrapEntity(r.data);
  log(`Status:        ${obj?.status}`);
  log(`Customer:      ${obj?.customer_name || obj?.customer?.name}`);
  log(`Order number:  ${obj?.order_number}`);
  log(`Sync status:   ${obj?.sync_status}`);
  return obj;
}

// ════════════════════════════════════════════════════════════════
// PASO 8: PATCH /orders/{id} — probar update
// ════════════════════════════════════════════════════════════════
async function updateOrder(id) {
  header(`PASO 8 — PATCH /orders/${id} (cambiar notes y prioridad)`);
  await new Promise(r => setTimeout(r, 1500));

  const patch = {
    priority: "urgent",
    notes: `Actualizado por test-create-order.mjs en ${new Date().toISOString()}`,
  };

  log(`PATCH body: ${JSON.stringify(patch)}`);
  const r = await http("PATCH", `${API_URL}/orders/${id}`, { body: patch });

  if (!r.ok) {
    log(`${C.red}✗ PATCH FAIL${C.reset}: status=${r.status}`);
    log(JSON.stringify(r.data, null, 2).slice(0, 500));
    return false;
  }

  log(`${C.green}✓ PATCH OK${C.reset} (${r.latencyMs}ms)`);
  const updated = unwrapEntity(r.data);
  log(`priority post-update: ${updated?.priority} ${updated?.priority === "urgent" ? "✅" : "❌"}`);
  log(`notes post-update:    "${(updated?.notes || "").slice(0, 60)}..."`);
  return true;
}

// ════════════════════════════════════════════════════════════════
// PASO 9: cleanup opcional
// ════════════════════════════════════════════════════════════════
async function cleanup(id) {
  if (!CLEANUP) return;
  header(`PASO 9 — DELETE /orders/${id} (cleanup)`);
  await new Promise(r => setTimeout(r, 1500));

  const r = await http("DELETE", `${API_URL}/orders/${id}`);
  if (r.ok) log(`${C.green}✓ DELETE OK${C.reset} (${r.latencyMs}ms)`);
  else log(`${C.yellow}⚠ DELETE status ${r.status}${C.reset}`);
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
  log(`${C.bold}TEST AUTOMATIZADO — CREATE ORDER${C.reset}`);
  log(`${C.dim}API_BASE: ${API_BASE}${C.reset}`);
  log(`${C.dim}USER:     ${LOGIN_USER}${C.reset}`);
  log(`${C.dim}CLEANUP:  ${CLEANUP ? "yes" : "no"}${C.reset}`);

  await login();
  const { ids, refs } = await fetchIds();

  if (!ids.customer) {
    log(`${C.red}✗ No hay customers — no se puede crear orden. Aborto.${C.reset}`);
    process.exit(1);
  }

  const dto = buildCreateOrderDTO(ids, refs);
  const payload = mapOrderToBackend(dto);
  const created = await postOrder(payload);

  if (!created) {
    log(`${C.red}✗ Creación falló. Aborto.${C.reset}`);
    process.exit(1);
  }

  const diff = diffPayloadVsResponse(payload, created);

  let orderId = created.id || created.order_id;
  const orderNumber = created.order_number;

  // Verificar si la orden está en la lista (por id Y por order_number)
  const verifiedId = orderId ? await checkInList(orderId, orderNumber) : false;
  // Si el ID no funciona pero encontramos por order_number, usar ese
  if (verifiedId && verifiedId !== orderId) {
    log(`${C.yellow}⚠ Usando ID corregido: ${verifiedId}${C.reset}`);
    orderId = verifiedId;
  }

  const fetched = orderId ? await fetchById(orderId) : null;

  if (orderId) await updateOrder(orderId);
  if (orderId) await cleanup(orderId);

  // ═══════════════════════════════════════════════════════════════
  // RESUMEN FINAL
  // ═══════════════════════════════════════════════════════════════
  header("RESUMEN FINAL");
  log(`${C.green}✅ Persistidos OK:    ${diff.ok.length}${C.reset}`);
  log(`${C.red}❌ Perdidos:           ${diff.lost.length}${C.reset}`);
  if (diff.lost.length) log(`   → ${diff.lost.join(", ")}`);
  log(`${C.yellow}⚠️  Cambiados:        ${diff.changed.length}${C.reset}`);
  if (diff.changed.length) log(`   → ${diff.changed.join(", ")}`);
  log(`${C.cyan}🆕 Backend agregó:    ${diff.added.length}${C.reset}`);
  log(`${C.dim}Order id final:    ${orderId}${C.reset}`);
  log(`${C.dim}Order number:      ${created.order_number}${C.reset}`);
  log("");

  if (diff.lost.length === 0 && diff.changed.length === 0) {
    log(`${C.bold}${C.green}✓✓✓ TODO PERSISTIDO CORRECTAMENTE ✓✓✓${C.reset}`);
  } else {
    log(`${C.bold}${C.yellow}⚠ HAY DISCREPANCIAS — revisar arriba${C.reset}`);
  }
}

main().catch(err => {
  log(`${C.red}${C.bold}FATAL: ${err.message}${C.reset}`);
  console.error(err);
  process.exit(1);
});
