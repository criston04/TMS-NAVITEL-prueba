#!/usr/bin/env node
/**
 * AUDITORIA COMPLETA E2E — Modulo MAESTRO
 *
 * Cubre TODOS los endpoints que el frontend invoca:
 *  - Customers  (customers.service.ts)
 *  - Drivers    (drivers.service.ts)
 *  - Vehicles   (vehicles.service.ts)
 *  - Operators  (operators.service.ts)
 *  - Products   (products.service.ts)
 *  - Geofences  (geofences.service.ts — ROOT, sin /api/v1)
 *
 * Cada endpoint se invoca una sola vez (no en bucle) y registra:
 *  status real, latencia, request body, response body.
 *
 * Salida: JSON con resultados detallados que el doc generador consume.
 */

import fs from "node:fs";

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const ROOT_URL = API_BASE; // para Geofences (sin /api/v1)

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
      rawText: raw.slice(0, 800),
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
const RESULTS = [];

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
    `  ${icon} ${String(endpoint.status).padEnd(3)} ${C.reset}${endpoint.label.padEnd(75)} ${C.dim}${endpoint.latencyMs}ms${C.reset}`
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
  console.log(`${C.green}OK Login (latencia ${r.latencyMs}ms)${C.reset}\n`);
}

// ═════════════ CUSTOMERS ═════════════
async function testCustomers() {
  header("MAESTRO CUSTOMERS");
  let createdId = null;

  // 1. GET /master/customers (listar)
  let r = await http("GET", `${API_URL}/master/customers?page=1&pageSize=5`);
  record("customers", {
    method: "GET",
    path: "/master/customers",
    label: "GET /master/customers (listar paginado)",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    requestBody: null,
    responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /master/customers/stats
  r = await http("GET", `${API_URL}/master/customers/stats`);
  record("customers", {
    method: "GET",
    path: "/master/customers/stats",
    label: "GET /master/customers/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 3. GET /master/customers/cities
  r = await http("GET", `${API_URL}/master/customers/cities`);
  record("customers", {
    method: "GET",
    path: "/master/customers/cities",
    label: "GET /master/customers/cities",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 4. POST /master/customers (crear)
  const ts = Date.now();
  const createBody = {
    code: `CLI-VER-${ts}`,
    name: `Cliente Verif ${ts}`,
    type: "company",
    document_type: "RUC",
    document_number: `${ts}`.slice(-11),
    email: `verif${ts}@test.com`,
    phone: "999888777",
    address: "Av. Test 123 — Lima",
    status: "active",
    category: "standard",
  };
  r = await http("POST", `${API_URL}/master/customers`, createBody);
  createdId = unwrap(r.body)?.id;
  record("customers", {
    method: "POST",
    path: "/master/customers",
    label: "POST /master/customers (crear cliente)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // 5. GET /master/customers/:id
    r = await http("GET", `${API_URL}/master/customers/${createdId}`);
    record("customers", {
      method: "GET",
      path: "/master/customers/:id",
      label: "GET /master/customers/:id (detalle)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 6. PUT /master/customers/:id
    r = await http("PUT", `${API_URL}/master/customers/${createdId}`, {
      address: "Av. Test 999 — Editado",
    });
    record("customers", {
      method: "PUT",
      path: "/master/customers/:id",
      label: "PUT /master/customers/:id (actualizar)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { address: "Av. Test 999 — Editado" },
      responseBody: r.body,
    });
    await sleep(150);

    // 7. POST /master/customers/:id/toggle-status
    r = await http("POST", `${API_URL}/master/customers/${createdId}/toggle-status`);
    record("customers", {
      method: "POST",
      path: "/master/customers/:id/toggle-status",
      label: "POST /master/customers/:id/toggle-status",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }

  // 8. GET /master/customers/find-by-document?documentNumber=
  r = await http("GET", `${API_URL}/master/customers/find-by-document?documentNumber=${createBody.document_number}`);
  record("customers", {
    method: "GET",
    path: "/master/customers/find-by-document",
    label: "GET /master/customers/find-by-document?documentNumber=",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 9. POST /master/customers/import (con array minimo)
  const importBody = [{
    code: `CLI-IMP-${Date.now()}`,
    name: "Cliente Import Test",
    type: "company",
    document_type: "RUC",
    document_number: `${Date.now()}`.slice(-11),
    email: `imp${Date.now()}@test.com`,
    phone: "999000111",
    address: "Av. Import 1",
    status: "active",
    category: "standard",
  }];
  r = await http("POST", `${API_URL}/master/customers/import`, importBody);
  record("customers", {
    method: "POST",
    path: "/master/customers/import",
    label: "POST /master/customers/import (1 item)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: importBody,
    responseBody: r.body,
  });
  await sleep(150);

  // 10. GET /master/customers/export/csv
  r = await http("GET", `${API_URL}/master/customers/export/csv`);
  record("customers", {
    method: "GET",
    path: "/master/customers/export/csv",
    label: "GET /master/customers/export/csv",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 11. POST /master/customers/bulk-delete (verificacion 2026-05-06: backend espera POST, no DELETE)
  r = await http("POST", `${API_URL}/master/customers/bulk-delete`, {
    ids: ["00000000-0000-0000-0000-000000000000"],
  });
  record("customers", {
    method: "POST",
    path: "/master/customers/bulk-delete",
    label: "POST /master/customers/bulk-delete (id dummy)",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    requestBody: { ids: ["dummy"] },
    responseBody: r.body,
  });
  await sleep(150);

  // 12. DELETE /master/customers/:id (limpieza)
  if (createdId) {
    r = await http("DELETE", `${API_URL}/master/customers/${createdId}`);
    record("customers", {
      method: "DELETE",
      path: "/master/customers/:id",
      label: "DELETE /master/customers/:id (eliminar)",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ DRIVERS ═════════════
async function testDrivers() {
  header("MAESTRO DRIVERS");
  let createdId = null;

  // 1. GET /master/drivers
  let r = await http("GET", `${API_URL}/master/drivers?page=1&pageSize=5`);
  record("drivers", {
    method: "GET",
    path: "/master/drivers",
    label: "GET /master/drivers (listar)",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /master/drivers/stats
  r = await http("GET", `${API_URL}/master/drivers/stats`);
  record("drivers", {
    method: "GET",
    path: "/master/drivers/stats",
    label: "GET /master/drivers/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 3. POST /master/drivers (crear)
  const ts = Date.now();
  const createBody = {
    code: `DRV-VER-${ts}`,
    document_type: "DNI",
    document_number: `${ts}`.slice(-8),
    first_name: "Conductor",
    last_name: `Verif ${ts}`.slice(-12),
    birth_date: "1990-01-01",
    email: `driver${ts}@test.com`,
    phone: "999111222",
    address: "Av. Driver 123",
    hire_date: "2024-01-01",
    blood_type: "O+",
    status: "active",
    availability: "available",
  };
  r = await http("POST", `${API_URL}/master/drivers`, createBody);
  createdId = unwrap(r.body)?.id;
  record("drivers", {
    method: "POST",
    path: "/master/drivers",
    label: "POST /master/drivers (crear conductor)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // 4. GET /master/drivers/:id
    r = await http("GET", `${API_URL}/master/drivers/${createdId}`);
    record("drivers", {
      method: "GET",
      path: "/master/drivers/:id",
      label: "GET /master/drivers/:id (detalle)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 5. PUT /master/drivers/:id
    r = await http("PUT", `${API_URL}/master/drivers/${createdId}`, {
      phone: "888777666",
    });
    record("drivers", {
      method: "PUT",
      path: "/master/drivers/:id",
      label: "PUT /master/drivers/:id (actualizar)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { phone: "888777666" },
      responseBody: r.body,
    });
    await sleep(150);

    // 6. PATCH /master/drivers/:id/status (active → blocked)
    r = await http("PATCH", `${API_URL}/master/drivers/${createdId}/status`, {
      status: "blocked",
      reason: "test e2e",
    });
    record("drivers", {
      method: "PATCH",
      path: "/master/drivers/:id/status",
      label: "PATCH /master/drivers/:id/status (block)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "blocked", reason: "test e2e" },
      responseBody: r.body,
    });
    await sleep(150);

    // 7. POST /master/drivers/:id/assign-vehicle (con vehicleId dummy)
    r = await http("POST", `${API_URL}/master/drivers/${createdId}/assign-vehicle`, {
      vehicle_id: "00000000-0000-0000-0000-000000000000",
    });
    record("drivers", {
      method: "POST",
      path: "/master/drivers/:id/assign-vehicle",
      label: "POST /master/drivers/:id/assign-vehicle (vid dummy)",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      requestBody: { vehicle_id: "dummy" },
      responseBody: r.body,
    });
    await sleep(150);

    // 8. POST /master/drivers/:id/unassign-vehicle
    r = await http("POST", `${API_URL}/master/drivers/${createdId}/unassign-vehicle`);
    record("drivers", {
      method: "POST",
      path: "/master/drivers/:id/unassign-vehicle",
      label: "POST /master/drivers/:id/unassign-vehicle",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }

  // 9. GET /master/drivers/by-document/:doc
  r = await http("GET", `${API_URL}/master/drivers/by-document/${createBody.document_number}`);
  record("drivers", {
    method: "GET",
    path: "/master/drivers/by-document/:doc",
    label: "GET /master/drivers/by-document/:doc",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 10. DELETE /master/drivers/:id (limpieza)
  if (createdId) {
    r = await http("DELETE", `${API_URL}/master/drivers/${createdId}`);
    record("drivers", {
      method: "DELETE",
      path: "/master/drivers/:id",
      label: "DELETE /master/drivers/:id (limpieza)",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ VEHICLES ═════════════
async function testVehicles() {
  header("MAESTRO VEHICLES");
  let createdId = null;

  // 1. GET /master/vehicles
  let r = await http("GET", `${API_URL}/master/vehicles?page=1&pageSize=5`);
  record("vehicles", {
    method: "GET",
    path: "/master/vehicles",
    label: "GET /master/vehicles (listar)",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /master/vehicles/stats
  r = await http("GET", `${API_URL}/master/vehicles/stats`);
  record("vehicles", {
    method: "GET",
    path: "/master/vehicles/stats",
    label: "GET /master/vehicles/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 3. GET /master/vehicles/expiring-documents?days=30
  r = await http("GET", `${API_URL}/master/vehicles/expiring-documents?days=30`);
  record("vehicles", {
    method: "GET",
    path: "/master/vehicles/expiring-documents",
    label: "GET /master/vehicles/expiring-documents",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 4. GET /master/vehicles/needing-maintenance
  r = await http("GET", `${API_URL}/master/vehicles/needing-maintenance`);
  record("vehicles", {
    method: "GET",
    path: "/master/vehicles/needing-maintenance",
    label: "GET /master/vehicles/needing-maintenance",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 5. POST /master/vehicles (crear) — type="camion" segun el backend
  const ts = Date.now();
  const createBody = {
    code: `VEH-VER-${ts}`,
    plate: `VER-${`${ts}`.slice(-3)}`,
    type: "camion",
    body_type: "furgon",
    brand: "Test Brand",
    model: "Test Model",
    year: 2024,
    fuel_type: "diesel",
    operational_status: "available",
    status: "active",
  };
  r = await http("POST", `${API_URL}/master/vehicles`, createBody);
  createdId = unwrap(r.body)?.id;
  record("vehicles", {
    method: "POST",
    path: "/master/vehicles",
    label: "POST /master/vehicles (crear vehiculo)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // 6. GET /master/vehicles/:id
    r = await http("GET", `${API_URL}/master/vehicles/${createdId}`);
    record("vehicles", {
      method: "GET",
      path: "/master/vehicles/:id",
      label: "GET /master/vehicles/:id (detalle)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 7. PUT /master/vehicles/:id
    r = await http("PUT", `${API_URL}/master/vehicles/${createdId}`, {
      capacity_kg: 6000,
    });
    record("vehicles", {
      method: "PUT",
      path: "/master/vehicles/:id",
      label: "PUT /master/vehicles/:id (actualizar)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { capacity_kg: 6000 },
      responseBody: r.body,
    });
    await sleep(150);

    // 8. PATCH /master/vehicles/:id/status (active → inactive)
    r = await http("PATCH", `${API_URL}/master/vehicles/${createdId}/status`, {
      status: "inactive",
      reason: "test e2e",
    });
    record("vehicles", {
      method: "PATCH",
      path: "/master/vehicles/:id/status",
      label: "PATCH /master/vehicles/:id/status (block)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "inactive", reason: "test e2e" },
      responseBody: r.body,
    });
    await sleep(150);

    // 9. POST /master/vehicles/:id/breakdowns
    r = await http("POST", `${API_URL}/master/vehicles/${createdId}/breakdowns`, {
      description: "Test averia e2e",
      severity: "low",
    });
    record("vehicles", {
      method: "POST",
      path: "/master/vehicles/:id/breakdowns",
      label: "POST /master/vehicles/:id/breakdowns",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: { description: "Test averia e2e", severity: "low" },
      responseBody: r.body,
    });
    await sleep(150);

    // 10. POST /master/vehicles/:id/assign-driver (driverId dummy)
    r = await http("POST", `${API_URL}/master/vehicles/${createdId}/assign-driver`, {
      driverId: "00000000-0000-0000-0000-000000000000",
    });
    record("vehicles", {
      method: "POST",
      path: "/master/vehicles/:id/assign-driver",
      label: "POST /master/vehicles/:id/assign-driver (did dummy)",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      requestBody: { driverId: "dummy" },
      responseBody: r.body,
    });
    await sleep(150);

    // 11. POST /master/vehicles/:id/unassign-driver
    r = await http("POST", `${API_URL}/master/vehicles/${createdId}/unassign-driver`);
    record("vehicles", {
      method: "POST",
      path: "/master/vehicles/:id/unassign-driver",
      label: "POST /master/vehicles/:id/unassign-driver",
      status: r.status,
      ok: r.status === 200 || r.status === 404,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }

  // 12. GET /master/vehicles/by-plate/:plate
  r = await http("GET", `${API_URL}/master/vehicles/by-plate/${createBody.plate}`);
  record("vehicles", {
    method: "GET",
    path: "/master/vehicles/by-plate/:plate",
    label: "GET /master/vehicles/by-plate/:plate",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 13. DELETE /master/vehicles/:id (limpieza)
  if (createdId) {
    r = await http("DELETE", `${API_URL}/master/vehicles/${createdId}`);
    record("vehicles", {
      method: "DELETE",
      path: "/master/vehicles/:id",
      label: "DELETE /master/vehicles/:id (limpieza)",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ OPERATORS ═════════════
async function testOperators() {
  header("MAESTRO OPERATORS");
  let createdId = null;

  // 1. GET /master/operators
  let r = await http("GET", `${API_URL}/master/operators?page=1&pageSize=5`);
  record("operators", {
    method: "GET",
    path: "/master/operators",
    label: "GET /master/operators (listar)",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /master/operators/stats
  r = await http("GET", `${API_URL}/master/operators/stats`);
  record("operators", {
    method: "GET",
    path: "/master/operators/stats",
    label: "GET /master/operators/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 3. POST /master/operators (crear)
  const ts = Date.now();
  const createBody = {
    code: `OPL-VER-${ts}`,
    name: `Operator Verif ${ts}`,
    trade_name: "OpVerif",
    type: "carrier",
    document_type: "RUC",
    document_number: `${ts}`.slice(-11),
    email: `op${ts}@test.com`,
    phone: "999444555",
    address: "Av. Op 123",
    status: "active",
  };
  r = await http("POST", `${API_URL}/master/operators`, createBody);
  createdId = unwrap(r.body)?.id;
  record("operators", {
    method: "POST",
    path: "/master/operators",
    label: "POST /master/operators (crear)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // 4. GET /master/operators/:id
    r = await http("GET", `${API_URL}/master/operators/${createdId}`);
    record("operators", {
      method: "GET",
      path: "/master/operators/:id",
      label: "GET /master/operators/:id (detalle)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 5. PUT /master/operators/:id
    r = await http("PUT", `${API_URL}/master/operators/${createdId}`, {
      contact_phone: "888333444",
    });
    record("operators", {
      method: "PUT",
      path: "/master/operators/:id",
      label: "PUT /master/operators/:id (actualizar)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { contact_phone: "888333444" },
      responseBody: r.body,
    });
    await sleep(150);
  }

  // 6. GET /master/operators/by-code/:code
  r = await http("GET", `${API_URL}/master/operators/by-code/${createBody.code}`);
  record("operators", {
    method: "GET",
    path: "/master/operators/by-code/:code",
    label: "GET /master/operators/by-code/:code",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 7. GET /master/operators/by-ruc/:ruc
  r = await http("GET", `${API_URL}/master/operators/by-ruc/${createBody.document_number}`);
  record("operators", {
    method: "GET",
    path: "/master/operators/by-ruc/:ruc",
    label: "GET /master/operators/by-ruc/:ruc",
    status: r.status,
    ok: r.status === 200 || r.status === 404,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 8. DELETE /master/operators/:id (limpieza)
  if (createdId) {
    r = await http("DELETE", `${API_URL}/master/operators/${createdId}`);
    record("operators", {
      method: "DELETE",
      path: "/master/operators/:id",
      label: "DELETE /master/operators/:id (limpieza)",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ PRODUCTS ═════════════
async function testProducts() {
  header("MAESTRO PRODUCTS");
  let createdId = null;

  // 1. GET /master/products
  let r = await http("GET", `${API_URL}/master/products?page=1&pageSize=5`);
  record("products", {
    method: "GET",
    path: "/master/products",
    label: "GET /master/products (listar)",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /master/products/stats
  r = await http("GET", `${API_URL}/master/products/stats`);
  record("products", {
    method: "GET",
    path: "/master/products/stats",
    label: "GET /master/products/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // 3. POST /master/products (crear)
  const ts = Date.now();
  const createBody = {
    sku: `SKU-VER-${ts}`,
    name: `Producto Verif ${ts}`,
    category: "general",
    unit: "kg",
    weight_kg: 1.5,
    status: "active",
  };
  r = await http("POST", `${API_URL}/master/products`, createBody);
  createdId = unwrap(r.body)?.id;
  record("products", {
    method: "POST",
    path: "/master/products",
    label: "POST /master/products (crear)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // 4. GET /master/products/:id
    r = await http("GET", `${API_URL}/master/products/${createdId}`);
    record("products", {
      method: "GET",
      path: "/master/products/:id",
      label: "GET /master/products/:id (detalle)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 5. PUT /master/products/:id
    r = await http("PUT", `${API_URL}/master/products/${createdId}`, {
      weight_kg: 2.0,
    });
    record("products", {
      method: "PUT",
      path: "/master/products/:id",
      label: "PUT /master/products/:id (actualizar)",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { weight_kg: 2.0 },
      responseBody: r.body,
    });
    await sleep(150);

    // 6. PATCH /master/products/:id/status
    r = await http("PATCH", `${API_URL}/master/products/${createdId}/status`, {
      status: "inactive",
    });
    record("products", {
      method: "PATCH",
      path: "/master/products/:id/status",
      label: "PATCH /master/products/:id/status",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { status: "inactive" },
      responseBody: r.body,
    });
    await sleep(150);

    // 7. POST /master/products/:id/duplicate
    let dupId = null;
    r = await http("POST", `${API_URL}/master/products/${createdId}/duplicate`);
    dupId = unwrap(r.body)?.id;
    record("products", {
      method: "POST",
      path: "/master/products/:id/duplicate",
      label: "POST /master/products/:id/duplicate",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    if (dupId) {
      r = await http("DELETE", `${API_URL}/master/products/${dupId}`);
      record("products", {
        method: "DELETE",
        path: "/master/products/:id",
        label: "DELETE /master/products/:id (cleanup duplicate)",
        status: r.status,
        ok: r.status === 200 || r.status === 204,
        latencyMs: r.latencyMs,
        responseBody: r.body,
      });
      await sleep(150);
    }

    // 8. DELETE /master/products/:id
    r = await http("DELETE", `${API_URL}/master/products/${createdId}`);
    record("products", {
      method: "DELETE",
      path: "/master/products/:id",
      label: "DELETE /master/products/:id (eliminar original)",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ GEOFENCES ═════════════
async function testGeofences() {
  header("MAESTRO GEOFENCES");
  let createdId = null;

  // El frontend prueba estos paths en orden: /api/v1/geofences, /api/v1/master/geofences, /geofences (root)
  const candidates = [
    `${API_URL}/geofences`,
    `${API_URL}/master/geofences`,
    `${ROOT_URL}/geofences`,
  ];

  for (const c of candidates) {
    const r = await http("GET", `${c}?page=1&pageSize=5`);
    const tag = c.replace(API_BASE, "");
    record("geofences", {
      method: "GET",
      path: tag,
      label: `GET ${tag} (probe canonical path)`,
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    if (r.status === 200) break;
    await sleep(150);
  }
  await sleep(150);

  const BASE = `${API_URL}/geofences`; // canonical detected path

  // GET /geofences/stats
  let r = await http("GET", `${BASE}/stats`);
  record("geofences", {
    method: "GET",
    path: "/api/v1/geofences/stats",
    label: "GET /api/v1/geofences/stats",
    status: r.status,
    ok: r.status === 200,
    latencyMs: r.latencyMs,
    responseBody: r.body,
  });
  await sleep(150);

  // POST /geofences (crear) — backend valida 'lat', 'lng', 'radius' (no 'radius_m'), customer_id requerido
  const ts = Date.now();
  const createBody = {
    name: `Geo Verif ${ts}`,
    code: `GEO-${ts}`,
    type: "CIRCLE",
    category: "warehouse",
    color: "#10b981",
    lat: -12.046,
    lng: -77.042,
    radius: 100,
    customer_id: "00000000-0000-0000-0000-000000000001", // tenant default
    is_active: true,
  };
  r = await http("POST", BASE, createBody);
  // Backend devuelve {Geofenceid|geofenceid|id} con shape distinto al GET
  const rawCreate = Array.isArray(r.body) ? r.body[0] : (r.body?.data ?? r.body);
  createdId = rawCreate?.Geofenceid ?? rawCreate?.geofenceid ?? rawCreate?.id;
  record("geofences", {
    method: "POST",
    path: "/api/v1/geofences",
    label: "POST /api/v1/geofences (crear circular)",
    status: r.status,
    ok: r.status === 200 || r.status === 201,
    latencyMs: r.latencyMs,
    requestBody: createBody,
    responseBody: r.body,
  });
  await sleep(150);

  if (createdId) {
    // GET /geofences/:id
    r = await http("GET", `${BASE}/${createdId}`);
    record("geofences", {
      method: "GET",
      path: "/api/v1/geofences/:id",
      label: "GET /api/v1/geofences/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // PUT /geofences/:id
    r = await http("PUT", `${BASE}/${createdId}`, {
      color: "#ff0000",
    });
    record("geofences", {
      method: "PUT",
      path: "/api/v1/geofences/:id",
      label: "PUT /api/v1/geofences/:id",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { color: "#ff0000" },
      responseBody: r.body,
    });
    await sleep(150);

    // POST /geofences/toggle-estatus-batch
    r = await http("POST", `${BASE}/toggle-estatus-batch`, {
      ids: [createdId],
    });
    record("geofences", {
      method: "POST",
      path: "/api/v1/geofences/toggle-estatus-batch",
      label: "POST /api/v1/geofences/toggle-estatus-batch",
      status: r.status,
      ok: r.status === 200 || r.status === 201,
      latencyMs: r.latencyMs,
      requestBody: { ids: [createdId] },
      responseBody: r.body,
    });
    await sleep(150);

    // PATCH /geofences/batch-category
    r = await http("PATCH", `${BASE}/batch-category`, {
      ids: [createdId],
      category: "customer",
    });
    record("geofences", {
      method: "PATCH",
      path: "/api/v1/geofences/batch-category",
      label: "PATCH /api/v1/geofences/batch-category",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { ids: [createdId], category: "customer" },
      responseBody: r.body,
    });
    await sleep(150);

    // PATCH /geofences/batch-color
    r = await http("PATCH", `${BASE}/batch-color`, {
      ids: [createdId],
      color: "#0000ff",
    });
    record("geofences", {
      method: "PATCH",
      path: "/api/v1/geofences/batch-color",
      label: "PATCH /api/v1/geofences/batch-color",
      status: r.status,
      ok: r.status === 200,
      latencyMs: r.latencyMs,
      requestBody: { ids: [createdId], color: "#0000ff" },
      responseBody: r.body,
    });
    await sleep(150);

    // DELETE /geofences/:id (probable 404 regresion conocida)
    r = await http("DELETE", `${BASE}/${createdId}`);
    record("geofences", {
      method: "DELETE",
      path: "/api/v1/geofences/:id",
      label: "DELETE /api/v1/geofences/:id",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // POST /geofences/bulk-delete (limpieza si DELETE /:id es 404)
    r = await http("POST", `${BASE}/bulk-delete`, {
      ids: [createdId],
    });
    record("geofences", {
      method: "POST",
      path: "/api/v1/geofences/bulk-delete",
      label: "POST /api/v1/geofences/bulk-delete",
      status: r.status,
      ok: r.status === 200 || r.status === 204,
      latencyMs: r.latencyMs,
      requestBody: { ids: [createdId] },
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ MAIN ═════════════
async function main() {
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ AUDITORIA E2E — MODULO MAESTRO (${new Date().toISOString().slice(0, 10)})           ║`);
  console.log(`║ Backend: ${API_BASE.padEnd(48)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝${C.reset}`);

  await setup();

  await testCustomers();
  await testDrivers();
  await testVehicles();
  await testOperators();
  await testProducts();
  await testGeofences();

  // ═════════════ RESUMEN ═════════════
  header("RESUMEN");
  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = total - ok;
  const bySubmodule = {};
  RESULTS.forEach(r => {
    if (!bySubmodule[r.submodule]) bySubmodule[r.submodule] = { total: 0, ok: 0, fail: 0 };
    bySubmodule[r.submodule].total++;
    if (r.ok) bySubmodule[r.submodule].ok++;
    else bySubmodule[r.submodule].fail++;
  });

  console.log(`Total: ${total}  OK: ${C.green}${ok}${C.reset}  FAIL: ${C.red}${fail}${C.reset}`);
  for (const [k, v] of Object.entries(bySubmodule)) {
    const pct = ((v.ok / v.total) * 100).toFixed(0);
    console.log(`  ${k.padEnd(12)} ${v.ok}/${v.total} (${pct}%)`);
  }

  // ═════════════ EXPORT ═════════════
  const out = {
    auditDate: new Date().toISOString(),
    backend: API_BASE,
    total,
    ok,
    fail,
    bySubmodule,
    results: RESULTS,
  };
  const outPath = "otros/testing/maestro-verification-results.json";
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n${C.green}Resultados guardados en ${outPath}${C.reset}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
