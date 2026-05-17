#!/usr/bin/env node
/**
 * AUDITORIA COMPLETA E2E — Modulo OPERACIONES
 *
 * Cubre todos los endpoints que el frontend invoca:
 *  - Orders     (OrderService, IncidentService, OrderImportService, OrderExportService)
 *  - Scheduling (SchedulingService)
 *  - Bitacora   (bitacoraService)
 *  - Workflows  (UnifiedWorkflowService)
 *
 * Salida: JSON con resultados detallados que el doc generador consume.
 */

import fs from "node:fs";

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  cyan: "\x1b[36m", blue: "\x1b[34m", bold: "\x1b[1m", dim: "\x1b[2m",
};

let TOKEN = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }
    return {
      status: res.status,
      ok: res.ok,
      latencyMs: Date.now() - t0,
      body: data,
      rawText: raw.slice(0, 500),
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      latencyMs: Date.now() - t0,
      body: err.message,
      rawText: err.message,
    };
  }
}

const unwrap = (d) => d?.data ?? d?.items ?? d;
const RESULTS = []; // todos los endpoints

function record(submodule, endpoint) {
  RESULTS.push({ submodule, ...endpoint });
  const icon = endpoint.ok
    ? `${C.green}OK`
    : endpoint.status >= 500
      ? `${C.red}500`
      : endpoint.status === 404
        ? `${C.yellow}404`
        : `${C.red}ERR`;
  console.log(
    `  ${icon} ${String(endpoint.status).padEnd(3)} ${C.reset}${endpoint.label.padEnd(70)} ${C.dim}${endpoint.latencyMs}ms${C.reset}`
  );
}

function header(t) {
  console.log("");
  console.log(`${C.bold}${C.cyan}═══════ ${t} ═══════${C.reset}`);
}

// ═════════════ SETUP ═════════════
async function setup() {
  header("LOGIN");
  const r = await http("POST", `${API_BASE}/auth/login`, {
    username: "admin",
    password: "Admin1432!",
  });
  TOKEN = unwrap(r.body)?.accessToken;
  if (!TOKEN) {
    console.log(`${C.red}LOGIN FAIL${C.reset}`);
    console.log(JSON.stringify(r.body));
    process.exit(1);
  }
  console.log(`${C.green}OK Login${C.reset}\n`);

  await sleep(200);
  const cust = unwrap((await http("GET", `${API_URL}/master/customers?pageSize=5`)).body);
  await sleep(200);
  const drv = unwrap((await http("GET", `${API_URL}/master/drivers?pageSize=5`)).body);
  await sleep(200);
  const veh = unwrap((await http("GET", `${API_URL}/master/vehicles?pageSize=5`)).body);
  await sleep(200);
  const wf = unwrap((await http("GET", `${API_URL}/master/workflows?pageSize=5`)).body);
  await sleep(200);
  const geo = unwrap((await http("GET", `${API_BASE}/api/v1/geofences?pageSize=5`)).body) ||
              unwrap((await http("GET", `${API_BASE}/geofences?pageSize=5`)).body);

  return {
    customer: cust?.[0],
    driver: drv?.[0],
    driver2: drv?.[1] ?? drv?.[0],
    vehicle: veh?.[0],
    vehicle2: veh?.[1] ?? veh?.[0],
    workflow: wf?.[0],
    geofence: geo?.[0],
  };
}

// ═════════════ ORDERS ═════════════
async function testOrders(ctx) {
  header("ORDERS");
  let r, orderId;

  // 1. POST /orders (crear)
  const orderNumber = `ORD-VER-${Date.now()}`;
  const createBody = {
    order_number: orderNumber,
    customer_id: ctx.customer.id,
    customer_name: ctx.customer.name,
    type: "delivery",
    priority: "high",
    vehicle_id: ctx.vehicle.id,
    vehicle_plate: ctx.vehicle.plate,
    driver_id: ctx.driver.id,
    driver_name: "TestDr",
    origin_address: "Origen Test",
    origin_lat: -12.046,
    origin_lng: -77.042,
    destination_address: "Destino Test",
    destination_lat: -12.054,
    destination_lng: -77.123,
    scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
    scheduled_delivery_at: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    estimated_distance_km: 25,
    total_weight: 1000,
    total_volume: 5,
    total_packages: 10,
    notes: "Test e2e operaciones",
  };
  r = await http("POST", `${API_URL}/orders`, createBody);
  orderId = unwrap(r.body)?.id;
  record("orders", {
    label: "POST /orders (crear orden)",
    method: "POST",
    path: "/orders",
    status: r.status,
    ok: r.status === 201 || r.status === 200,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  // 2. GET /orders (listar)
  r = await http("GET", `${API_URL}/orders?pageSize=20`);
  record("orders", {
    label: "GET /orders (listar paginado)",
    method: "GET",
    path: "/orders",
    queryParams: { pageSize: 20 },
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  // 3. GET /orders/stats
  r = await http("GET", `${API_URL}/orders/stats`);
  record("orders", {
    label: "GET /orders/stats (totales por estado)",
    method: "GET",
    path: "/orders/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  if (orderId) {
    await sleep(200);
    // 4. GET /orders/:id
    r = await http("GET", `${API_URL}/orders/${orderId}`);
    record("orders", {
      label: "GET /orders/:id (detalle)",
      method: "GET",
      path: "/orders/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 5. PATCH /orders/:id (update generico)
    const updateBody = { notes: "Test actualizado e2e" };
    r = await http("PATCH", `${API_URL}/orders/${orderId}`, updateBody);
    record("orders", {
      label: "PATCH /orders/:id (actualizar campos)",
      method: "PATCH",
      path: "/orders/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: updateBody,
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 6. PATCH /orders/:id/status -> pending
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "pending" });
    record("orders", {
      label: "PATCH /orders/:id/status (draft->pending)",
      method: "PATCH",
      path: "/orders/:id/status",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "pending" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 7. PATCH /orders/:id/assign
    r = await http("PATCH", `${API_URL}/orders/${orderId}/assign`, {
      vehicle_id: ctx.vehicle2.id,
      driver_id: ctx.driver2.id,
    });
    record("orders", {
      label: "PATCH /orders/:id/assign (vehicle+driver)",
      method: "PATCH",
      path: "/orders/:id/assign",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { vehicle_id: ctx.vehicle2.id, driver_id: ctx.driver2.id },
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 8. POST /orders/bulk-send (one id)
    r = await http("POST", `${API_URL}/orders/bulk-send`, { orderIds: [orderId] });
    record("orders", {
      label: "POST /orders/bulk-send (envio masivo)",
      method: "POST",
      path: "/orders/bulk-send",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: { orderIds: [orderId] },
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 9. PATCH /orders/:id/status -> in_transit
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "in_transit" });
    record("orders", {
      label: "PATCH /orders/:id/status (assigned->in_transit / startTrip)",
      method: "PATCH",
      path: "/orders/:id/status",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "in_transit" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 10. PATCH /orders/:id/status -> completed
    r = await http("PATCH", `${API_URL}/orders/${orderId}/status`, { status: "completed" });
    record("orders", {
      label: "PATCH /orders/:id/status (in_transit->completed)",
      method: "PATCH",
      path: "/orders/:id/status",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "completed" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 11. POST /orders/:id/close
    const closeBody = {
      observations: "Cierre test e2e",
      incidents: [],
      deviationReasons: [],
      closedBy: "test",
      closedByName: "Test E2E",
    };
    r = await http("POST", `${API_URL}/orders/${orderId}/close`, closeBody);
    record("orders", {
      label: "POST /orders/:id/close (cerrar orden)",
      method: "POST",
      path: "/orders/:id/close",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: closeBody,
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    // 12. GET /orders/:id/workflow-progress
    r = await http("GET", `${API_URL}/orders/${orderId}/workflow-progress`);
    record("orders", {
      label: "GET /orders/:id/workflow-progress",
      method: "GET",
      path: "/orders/:id/workflow-progress",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });

    // 13. PATCH /orders/:id/milestones/:mid (skip - no se puede sin milestone real)
    // Probamos con un id inventado para registrar el comportamiento real
    await sleep(200);
    const fakeMs = "00000000-0000-0000-0000-000000000000";
    r = await http("PATCH", `${API_URL}/orders/${orderId}/milestones/${fakeMs}`, {
      status: "completed",
    });
    record("orders", {
      label: "PATCH /orders/:id/milestones/:mid (con id dummy)",
      method: "PATCH",
      path: "/orders/:id/milestones/:milestoneId",
      status: r.status,
      ok: r.status === 200 || r.status === 404, // 404 esperado si la ruta no existe
      latencyMs: r.latencyMs,
      requestBody: { status: "completed" },
      responseBody: r.body,
      rawText: r.rawText,
      note: "milestoneId dummy — comportamiento esperado: 404 si milestone no existe, no 500",
    });

    await sleep(200);
    // 14. DELETE /orders/:id (esperado 409 porque no esta en draft)
    r = await http("DELETE", `${API_URL}/orders/${orderId}`);
    record("orders", {
      label: "DELETE /orders/:id (esperado 409 — orden cerrada)",
      method: "DELETE",
      path: "/orders/:id",
      status: r.status,
      ok: r.status === 409 || r.status === 200, // 409 = correcto si no esta en draft
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
      note: "409 esperado: solo se puede borrar drafts",
    });
  }

  await sleep(200);
  // 15. GET /orders/export (CSV)
  r = await http("GET", `${API_URL}/orders/export`);
  record("orders", {
    label: "GET /orders/export (CSV export)",
    method: "GET",
    path: "/orders/export",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: typeof r.body === "string" ? r.body.slice(0, 200) : r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  // 16. POST /orders/import (con body vacio para verificar comportamiento)
  r = await http("POST", `${API_URL}/orders/import`, { rows: [] });
  record("orders", {
    label: "POST /orders/import (Excel rows)",
    method: "POST",
    path: "/orders/import",
    status: r.status,
    ok: r.status === 200 || r.status === 400, // 400 si rechaza body vacio
    latencyMs: r.latencyMs,
    requestBody: { rows: [] },
    responseBody: r.body,
    rawText: r.rawText,
  });

  // 17. INCIDENTS — el feature flag esta off, pero tocamos el endpoint para verificar
  await sleep(200);
  r = await http("GET", `${API_URL}/incidents/catalog`);
  record("orders", {
    label: "GET /incidents/catalog (feature flag off en frontend)",
    method: "GET",
    path: "/incidents/catalog",
    status: r.status,
    ok: false, // anotamos como no implementado en cualquier caso
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Feature flag BACKEND_FEATURES.incidents = false. Front no llama. Verificacion externa.",
  });

  await sleep(200);
  r = await http("GET", `${API_URL}/incidents/catalog/active`);
  record("orders", {
    label: "GET /incidents/catalog/active",
    method: "GET",
    path: "/incidents/catalog/active",
    status: r.status,
    ok: false,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Feature flag off",
  });

  if (orderId) {
    await sleep(200);
    r = await http("GET", `${API_URL}/incidents/orders/${orderId}`);
    record("orders", {
      label: "GET /incidents/orders/:id",
      method: "GET",
      path: "/incidents/orders/:id",
      status: r.status,
      ok: false,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
      note: "Feature flag off",
    });
  }

  await sleep(200);
  r = await http("GET", `${API_URL}/incidents/statistics`);
  record("orders", {
    label: "GET /incidents/statistics",
    method: "GET",
    path: "/incidents/statistics",
    status: r.status,
    ok: false,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Feature flag off",
  });
}

// ═════════════ SCHEDULING ═════════════
async function testScheduling(ctx) {
  header("SCHEDULING");
  const SC = `${API_URL}/operations/scheduling`;

  let r;

  await sleep(200);
  r = await http("GET", `${SC}/orders`);
  record("scheduling", {
    label: "GET /operations/scheduling/orders",
    method: "GET",
    path: "/operations/scheduling/orders",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/orders?status=pending`);
  record("scheduling", {
    label: "GET /operations/scheduling/orders?status=pending",
    method: "GET",
    path: "/operations/scheduling/orders",
    queryParams: { status: "pending" },
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/kpis`);
  record("scheduling", {
    label: "GET /operations/scheduling/kpis",
    method: "GET",
    path: "/operations/scheduling/kpis",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/audit-logs`);
  record("scheduling", {
    label: "GET /operations/scheduling/audit-logs",
    method: "GET",
    path: "/operations/scheduling/audit-logs",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/blocked-days`);
  record("scheduling", {
    label: "GET /operations/scheduling/blocked-days",
    method: "GET",
    path: "/operations/scheduling/blocked-days",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/notifications`);
  record("scheduling", {
    label: "GET /operations/scheduling/notifications",
    method: "GET",
    path: "/operations/scheduling/notifications",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${SC}/gantt?startDate=${new Date().toISOString()}&days=7`);
  record("scheduling", {
    label: "GET /operations/scheduling/gantt",
    method: "GET",
    path: "/operations/scheduling/gantt",
    queryParams: { startDate: "ISO", days: 7 },
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  // POST /assign — minimal body (sin scheduledStartTime para forzar 400)
  await sleep(200);
  let bodyMin = {
    orderId: "00000000-0000-0000-0000-000000000000",
    vehicleId: ctx.vehicle?.id,
    driverId: ctx.driver?.id,
    scheduledDate: new Date().toISOString().split("T")[0],
  };
  r = await http("POST", `${SC}/assign`, bodyMin);
  record("scheduling", {
    label: "POST /operations/scheduling/assign (minimal — sin time)",
    method: "POST",
    path: "/operations/scheduling/assign",
    status: r.status,
    ok: r.status === 200 || r.status === 400 || r.status === 404,
    latencyMs: r.latencyMs,
    requestBody: bodyMin,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Body minimal sin scheduledStartTime — esperamos 400 que documente requirement",
  });

  // POST /assign — full body
  await sleep(200);
  let bodyFull = {
    ...bodyMin,
    scheduledStartTime: "08:00",
    notes: "Test",
    force: false,
  };
  r = await http("POST", `${SC}/assign`, bodyFull);
  record("scheduling", {
    label: "POST /operations/scheduling/assign (full body)",
    method: "POST",
    path: "/operations/scheduling/assign",
    status: r.status,
    ok: r.status === 200 || r.status === 404, // 404 ok porque orderId es dummy
    latencyMs: r.latencyMs,
    requestBody: bodyFull,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Body full con orderId dummy — esperamos 404 (orden no existe) no 500",
  });

  await sleep(200);
  r = await http("POST", `${SC}/validate-hos`, {
    driverId: ctx.driver?.id ?? "test",
    date: new Date().toISOString(),
    estimatedDuration: 8,
  });
  record("scheduling", {
    label: "POST /operations/scheduling/validate-hos",
    method: "POST",
    path: "/operations/scheduling/validate-hos",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    requestBody: {
      driverId: ctx.driver?.id ?? "test",
      date: "ISO",
      estimatedDuration: 8,
    },
    responseBody: r.body,
    rawText: r.rawText,
  });

  // detect-conflicts requiere orderId real (no dummy) — backend devuelve 500 si no encuentra la orden
  await sleep(200);
  // Para que devuelva 200, necesitamos un orderId real. Lo obtenemos antes
  const ordsRes = await http("GET", `${API_URL}/orders?pageSize=1`);
  const realOrderId = unwrap(ordsRes.body)?.[0]?.id;
  r = await http("POST", `${SC}/detect-conflicts`, {
    orderId: realOrderId ?? "00000000-0000-0000-0000-000000000000",
    vehicleId: ctx.vehicle?.id,
    driverId: ctx.driver?.id,
    scheduledDate: new Date().toISOString(),
  });
  record("scheduling", {
    label: "POST /operations/scheduling/detect-conflicts",
    method: "POST",
    path: "/operations/scheduling/detect-conflicts",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    requestBody: {
      orderId: realOrderId ? "<real>" : "<dummy>",
      vehicleId: ctx.vehicle?.id,
      driverId: ctx.driver?.id,
      scheduledDate: "ISO",
    },
    responseBody: r.body,
    rawText: r.rawText,
    note: "Con orderId real funciona; con dummy tira 500 (bug backend: no maneja orden inexistente)",
  });

  // POST /bulk-assign
  await sleep(200);
  r = await http("POST", `${SC}/bulk-assign`, {
    orderIds: ["dummy"],
    vehicleId: ctx.vehicle?.id,
    driverId: ctx.driver?.id,
    scheduledDate: new Date().toISOString(),
    notes: "test",
  });
  record("scheduling", {
    label: "POST /operations/scheduling/bulk-assign",
    method: "POST",
    path: "/operations/scheduling/bulk-assign",
    status: r.status,
    ok: r.status === 200 || r.status === 400 || r.status === 404,
    latencyMs: r.latencyMs,
    requestBody: { orderIds: ["dummy"], vehicleId: "...", driverId: "...", scheduledDate: "ISO" },
    responseBody: r.body,
    rawText: r.rawText,
  });

  // POST /reschedule
  await sleep(200);
  r = await http("POST", `${SC}/reschedule`, {
    orderId: "dummy",
    newDate: new Date().toISOString(),
  });
  record("scheduling", {
    label: "POST /operations/scheduling/reschedule",
    method: "POST",
    path: "/operations/scheduling/reschedule",
    status: r.status,
    ok: r.status === 200 || r.status === 400 || r.status === 404,
    latencyMs: r.latencyMs,
    requestBody: { orderId: "dummy", newDate: "ISO" },
    responseBody: r.body,
    rawText: r.rawText,
  });

  // POST /auto-schedule
  await sleep(200);
  r = await http("POST", `${SC}/auto-schedule`, { orderIds: [] });
  record("scheduling", {
    label: "POST /operations/scheduling/auto-schedule",
    method: "POST",
    path: "/operations/scheduling/auto-schedule",
    status: r.status,
    ok: r.status === 200 || r.status === 400,
    latencyMs: r.latencyMs,
    requestBody: { orderIds: [] },
    responseBody: r.body,
    rawText: r.rawText,
  });

  // GET /suggestions/:orderId — el frontend captura 500/404
  await sleep(200);
  const dummyOrder = "00000000-0000-0000-0000-000000000000";
  r = await http(
    "GET",
    `${SC}/suggestions/${dummyOrder}?date=${new Date().toISOString()}`
  );
  record("scheduling", {
    label: "GET /operations/scheduling/suggestions/:orderId (orden dummy)",
    method: "GET",
    path: "/operations/scheduling/suggestions/:orderId",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Frontend captura 500 con fallback a [] para no crashear modal",
  });

  // GET /workflow-info/:wfId
  if (ctx.workflow) {
    await sleep(200);
    r = await http("GET", `${SC}/workflow-info/${ctx.workflow.id}`);
    record("scheduling", {
      label: "GET /operations/scheduling/workflow-info/:id",
      method: "GET",
      path: "/operations/scheduling/workflow-info/:workflowId",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
      note: "Frontend usa getOptional, devuelve null en 404",
    });
  }

  // POST /block-day
  // Backend expects `date`, `reason`, `blockType` (probado: error 400 con blockedDate)
  await sleep(200);
  const blockBody = {
    date: "2030-12-25",
    reason: "Test e2e",
    blockType: "full_day",
    appliesToAll: true,
    createdBy: "test",
  };
  r = await http("POST", `${SC}/block-day`, blockBody);
  const blockId = unwrap(r.body)?.id;
  record("scheduling", {
    label: "POST /operations/scheduling/block-day",
    method: "POST",
    path: "/operations/scheduling/block-day",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: blockBody,
    responseBody: r.body,
    rawText: r.rawText,
  });

  if (blockId) {
    await sleep(200);
    r = await http("DELETE", `${SC}/block-day/${blockId}`);
    record("scheduling", {
      label: "DELETE /operations/scheduling/block-day/:id",
      method: "DELETE",
      path: "/operations/scheduling/block-day/:id",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });
  } else {
    record("scheduling", {
      label: "DELETE /operations/scheduling/block-day/:id (skip — no block creado)",
      method: "DELETE",
      path: "/operations/scheduling/block-day/:id",
      status: 0,
      ok: false,
      latencyMs: 0,
      note: "No se pudo probar — POST /block-day fallo",
    });
  }
}

// ═════════════ WORKFLOWS ═════════════
async function testWorkflows(ctx) {
  header("WORKFLOWS");
  const WF = `${API_URL}/master/workflows`;

  let r, workflowId;

  await sleep(200);
  r = await http("GET", WF);
  const wfList = unwrap(r.body);
  workflowId = Array.isArray(wfList) && wfList[0]?.id;
  record("workflows", {
    label: "GET /master/workflows (listar)",
    method: "GET",
    path: "/master/workflows",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${WF}/active`);
  record("workflows", {
    label: "GET /master/workflows/active",
    method: "GET",
    path: "/master/workflows/active",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${WF}/default`);
  record("workflows", {
    label: "GET /master/workflows/default",
    method: "GET",
    path: "/master/workflows/default",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
    note: "Frontend usa getOptional — 404 = sin default configurado",
  });

  await sleep(200);
  r = await http("GET", `${WF}/helpers/available-geofences`);
  record("workflows", {
    label: "GET /master/workflows/helpers/available-geofences",
    method: "GET",
    path: "/master/workflows/helpers/available-geofences",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${WF}/helpers/available-customers`);
  record("workflows", {
    label: "GET /master/workflows/helpers/available-customers",
    method: "GET",
    path: "/master/workflows/helpers/available-customers",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${WF}/helpers/geofences-by-category/origin`);
  record("workflows", {
    label: "GET /master/workflows/helpers/geofences-by-category/:category",
    method: "GET",
    path: "/master/workflows/helpers/geofences-by-category/:category",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  // GET /suggest
  await sleep(200);
  r = await http(
    "GET",
    `${WF}/suggest?customerId=${ctx.customer?.id}&cargoType=general`
  );
  record("workflows", {
    label: "GET /master/workflows/suggest",
    method: "GET",
    path: "/master/workflows/suggest",
    queryParams: { customerId: "...", cargoType: "general" },
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  if (workflowId) {
    await sleep(200);
    r = await http("GET", `${WF}/${workflowId}`);
    record("workflows", {
      label: "GET /master/workflows/:id",
      method: "GET",
      path: "/master/workflows/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    r = await http("GET", `${WF}/${workflowId}/validate-geofences`);
    record("workflows", {
      label: "GET /master/workflows/:id/validate-geofences",
      method: "GET",
      path: "/master/workflows/:id/validate-geofences",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });

    await sleep(200);
    r = await http("GET", `${WF}/${workflowId}/schedule-duration`);
    record("workflows", {
      label: "GET /master/workflows/:id/schedule-duration",
      method: "GET",
      path: "/master/workflows/:id/schedule-duration",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });

    // POST /apply
    await sleep(200);
    r = await http("POST", `${WF}/${workflowId}/apply`, {
      orderId: "00000000-0000-0000-0000-000000000000",
    });
    record("workflows", {
      label: "POST /master/workflows/:id/apply (orden dummy)",
      method: "POST",
      path: "/master/workflows/:id/apply",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      requestBody: { orderId: "dummy" },
      responseBody: r.body,
      rawText: r.rawText,
      note: "Esperado 404 con orden dummy — testear que no sea 500",
    });

    // POST /validate-for-schedule
    await sleep(200);
    r = await http("POST", `${WF}/${workflowId}/validate-for-schedule`, {
      orderId: "dummy",
      scheduledDate: new Date().toISOString(),
    });
    record("workflows", {
      label: "POST /master/workflows/:id/validate-for-schedule",
      method: "POST",
      path: "/master/workflows/:id/validate-for-schedule",
      status: r.status,
      ok: r.status === 200 || r.status === 400,
      latencyMs: r.latencyMs,
      requestBody: { orderId: "dummy", scheduledDate: "ISO" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // PATCH /:id/status
    await sleep(200);
    r = await http("PATCH", `${WF}/${workflowId}/status`, { status: "active" });
    record("workflows", {
      label: "PATCH /master/workflows/:id/status",
      method: "PATCH",
      path: "/master/workflows/:id/status",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "active" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // POST /:id/duplicate
    await sleep(200);
    r = await http("POST", `${WF}/${workflowId}/duplicate`, {
      newName: `WF Copy ${Date.now()}`,
    });
    const dupId = unwrap(r.body)?.id;
    record("workflows", {
      label: "POST /master/workflows/:id/duplicate",
      method: "POST",
      path: "/master/workflows/:id/duplicate",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: { newName: "WF Copy ..." },
      responseBody: r.body,
      rawText: r.rawText,
    });
    // limpieza: borrar el duplicado
    if (dupId) {
      await sleep(200);
      const del = await http("DELETE", `${WF}/${dupId}`);
      record("workflows", {
        label: "DELETE /master/workflows/:id (limpieza duplicado)",
        method: "DELETE",
        path: "/master/workflows/:id",
        status: del.status,
        ok: del.status === 200 || del.status === 204,
        latencyMs: del.latencyMs,
        responseBody: del.body,
        rawText: del.rawText,
      });
    }
  }

  // POST /master/workflows (crear)
  await sleep(200);
  const createWfBody = {
    name: `WF Test ${Date.now()}`,
    description: "Test e2e auditoria",
    triggerEvent: "order.created",
    isActive: true,
    isDefault: false,
    actions: [{ type: "notify", message: "Test" }],
  };
  r = await http("POST", WF, createWfBody);
  const createdWfId = unwrap(r.body)?.id;
  record("workflows", {
    label: "POST /master/workflows (crear nuevo workflow)",
    method: "POST",
    path: "/master/workflows",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createWfBody,
    responseBody: r.body,
    rawText: r.rawText,
  });

  if (createdWfId) {
    // PUT /master/workflows/:id (actualizar)
    await sleep(200);
    r = await http("PUT", `${WF}/${createdWfId}`, {
      name: `WF Test Updated ${Date.now()}`,
    });
    record("workflows", {
      label: "PUT /master/workflows/:id (actualizar)",
      method: "PUT",
      path: "/master/workflows/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { name: "..." },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // DELETE limpieza
    await sleep(200);
    r = await http("DELETE", `${WF}/${createdWfId}`);
    record("workflows", {
      label: "DELETE /master/workflows/:id (limpieza)",
      method: "DELETE",
      path: "/master/workflows/:id",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });
  }
}

// ═════════════ BITACORA ═════════════
async function testBitacora(ctx) {
  header("BITACORA");
  const BT = `${API_URL}/bitacora`;

  let r, entryId;

  await sleep(200);
  r = await http("GET", `${BT}?pageSize=10`);
  const list = unwrap(r.body);
  if (Array.isArray(list) && list[0]?.id) entryId = list[0].id;
  record("bitacora", {
    label: "GET /bitacora (listar entries)",
    method: "GET",
    path: "/bitacora",
    queryParams: { pageSize: 10 },
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  if (entryId) {
    await sleep(200);
    r = await http("GET", `${BT}/${entryId}`);
    record("bitacora", {
      label: "GET /bitacora/:id (detalle)",
      method: "GET",
      path: "/bitacora/:id",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });
  }

  await sleep(200);
  r = await http("GET", `${BT}/stats`);
  record("bitacora", {
    label: "GET /bitacora/stats",
    method: "GET",
    path: "/bitacora/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${BT}/summary/vehicles`);
  record("bitacora", {
    label: "GET /bitacora/summary/vehicles",
    method: "GET",
    path: "/bitacora/summary/vehicles",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${BT}/summary/geofences`);
  record("bitacora", {
    label: "GET /bitacora/summary/geofences",
    method: "GET",
    path: "/bitacora/summary/geofences",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${BT}/geofence-breaches`);
  record("bitacora", {
    label: "GET /bitacora/geofence-breaches",
    method: "GET",
    path: "/bitacora/geofence-breaches",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
    rawText: r.rawText,
  });

  await sleep(200);
  r = await http("GET", `${BT}/export?format=csv`);
  record("bitacora", {
    label: "GET /bitacora/export?format=csv",
    method: "GET",
    path: "/bitacora/export",
    queryParams: { format: "csv" },
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: typeof r.body === "string" ? r.body.slice(0, 200) : r.body,
    rawText: r.rawText,
  });

  if (ctx.vehicle?.id) {
    await sleep(200);
    r = await http("GET", `${BT}/vehicle/${ctx.vehicle.id}`);
    record("bitacora", {
      label: "GET /bitacora/vehicle/:vehicleId (historial)",
      method: "GET",
      path: "/bitacora/vehicle/:vehicleId",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
      rawText: r.rawText,
    });
  }

  // POST /bitacora (crear entry manual)
  await sleep(200);
  const createEntryBody = {
    eventType: "entry",
    vehicleId: ctx.vehicle?.id,
    vehiclePlate: ctx.vehicle?.plate,
    geofenceId: ctx.geofence?.id ?? null,
    startTimestamp: new Date().toISOString(),
    severity: "low",
    notes: "Test e2e",
  };
  r = await http("POST", BT, createEntryBody);
  const createdEntryId = unwrap(r.body)?.id;
  record("bitacora", {
    label: "POST /bitacora (crear entry manual)",
    method: "POST",
    path: "/bitacora",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createEntryBody,
    responseBody: r.body,
    rawText: r.rawText,
  });

  // PUT /:id/review
  const testEntryId = createdEntryId || entryId;
  if (testEntryId) {
    await sleep(200);
    r = await http("PUT", `${BT}/${testEntryId}/review`, { reviewedBy: "Operador TMS" });
    record("bitacora", {
      label: "PUT /bitacora/:id/review",
      method: "PUT",
      path: "/bitacora/:id/review",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { reviewedBy: "Operador TMS" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // PUT /:id/dismiss
    await sleep(200);
    r = await http("PUT", `${BT}/${testEntryId}/dismiss`, { reason: "test" });
    record("bitacora", {
      label: "PUT /bitacora/:id/dismiss",
      method: "PUT",
      path: "/bitacora/:id/dismiss",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { reason: "test" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // PUT /:id/notes
    await sleep(200);
    r = await http("PUT", `${BT}/${testEntryId}/notes`, { notes: "test notes" });
    record("bitacora", {
      label: "PUT /bitacora/:id/notes",
      method: "PUT",
      path: "/bitacora/:id/notes",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { notes: "test notes" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // PUT /:id/assign-order
    await sleep(200);
    r = await http("PUT", `${BT}/${testEntryId}/assign-order`, {
      orderId: "00000000-0000-0000-0000-000000000000",
    });
    record("bitacora", {
      label: "PUT /bitacora/:id/assign-order",
      method: "PUT",
      path: "/bitacora/:id/assign-order",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      requestBody: { orderId: "dummy" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // POST /:id/create-order
    await sleep(200);
    r = await http("POST", `${BT}/${testEntryId}/create-order`, {
      customerId: ctx.customer?.id,
      orderType: "delivery",
    });
    record("bitacora", {
      label: "POST /bitacora/:id/create-order",
      method: "POST",
      path: "/bitacora/:id/create-order",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: { customerId: "...", orderType: "delivery" },
      responseBody: r.body,
      rawText: r.rawText,
    });

    // PUT /:id/complete
    await sleep(200);
    r = await http("PUT", `${BT}/${testEntryId}/complete`, {
      endTimestamp: new Date().toISOString(),
    });
    record("bitacora", {
      label: "PUT /bitacora/:id/complete",
      method: "PUT",
      path: "/bitacora/:id/complete",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { endTimestamp: "ISO" },
      responseBody: r.body,
      rawText: r.rawText,
    });
  }
}

// ═════════════ MAIN ═════════════
async function main() {
  console.log(`${C.bold}${C.cyan}AUDITORIA OPERACIONES — Verificacion empirica${C.reset}`);
  console.log(`${C.dim}Backend: ${API_BASE}${C.reset}`);

  const ctx = await setup();
  console.log(
    `${C.dim}Context: customer=${ctx.customer?.id?.slice(0, 8)}, driver=${ctx.driver?.id?.slice(0, 8)}, vehicle=${ctx.vehicle?.id?.slice(0, 8)}, workflow=${ctx.workflow?.id?.slice(0, 8)}${C.reset}\n`
  );

  await testOrders(ctx);
  await testScheduling(ctx);
  await testWorkflows(ctx);
  await testBitacora(ctx);

  // Summary
  console.log("");
  console.log(`${C.bold}${C.cyan}═══════ RESUMEN ═══════${C.reset}`);
  const bySub = {};
  for (const r of RESULTS) {
    bySub[r.submodule] = bySub[r.submodule] || { ok: 0, total: 0, fails: [] };
    bySub[r.submodule].total++;
    if (r.ok) bySub[r.submodule].ok++;
    else bySub[r.submodule].fails.push(`${r.status} ${r.label}`);
  }
  for (const [sub, s] of Object.entries(bySub)) {
    const pct = Math.round((s.ok / s.total) * 100);
    console.log(`  ${C.bold}${sub.padEnd(12)}${C.reset} ${s.ok}/${s.total} (${pct}%)`);
  }

  // Save full results JSON for the doc generator
  const out = `${process.cwd()}/otros/testing/operaciones-verification-results.json`;
  fs.writeFileSync(out, JSON.stringify(RESULTS, null, 2));
  console.log(`\n${C.green}Saved JSON: ${out}${C.reset}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
