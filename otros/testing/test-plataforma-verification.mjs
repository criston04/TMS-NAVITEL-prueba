#!/usr/bin/env node
/**
 * AUDITORIA COMPLETA E2E — Modulo PLATAFORMA + USUARIOS + LICENCIAS
 *
 * Cubre TODOS los endpoints que el frontend invoca:
 *  - Platform tenants CRUD (7 endpoints)
 *  - Platform tenant modules (3 endpoints)
 *  - Platform master users (2 endpoints)
 *  - Platform vehicle transfers (5 endpoints)
 *  - Platform dashboard + activity (2 endpoints)
 *  - Platform fleet groups (2 endpoints)
 *  - Tenant users CRUD (9 endpoints)
 *  - License (1 endpoint: /me/license)
 *
 * Total: 31 endpoints. Salida: maestro-plataforma-results.json
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
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return {
      status: res.status,
      ok: res.ok,
      latencyMs: Date.now() - t0,
      body: data,
      rawText: raw.slice(0, 600),
    };
  } catch (err) {
    return { status: 0, ok: false, latencyMs: Date.now() - t0, body: err.message, rawText: err.message };
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
  console.log(`${C.green}OK Login (latencia ${r.latencyMs}ms)${C.reset}`);

  // Decode JWT to inspect tier/role/claims
  try {
    const payload = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64").toString());
    console.log(`${C.dim}JWT claims:${C.reset}`);
    console.log("  username:", payload.username);
    console.log("  tenantId:", payload.tenantId);
    console.log("  role:", payload.role);
    console.log("  tier:", payload.tier ?? "(no claim — backend no lo expone)");
    console.log("  permissions:", payload.permissions ? "(presente)" : "(no claim)");
    console.log("  enabledModules:", payload.enabledModules ? "(presente)" : "(no claim)");
    console.log("  exp:", new Date(payload.exp * 1000).toISOString());
  } catch (e) {
    console.log(`${C.yellow}No se pudo decodificar JWT${C.reset}`);
  }
}

// ═════════════ PLATFORM — TENANTS ═════════════
async function testPlatformTenants() {
  header("PLATAFORMA — TENANTS (CRUD)");
  let tenantId = null;

  // 1. GET /platform/tenants
  let r = await http("GET", `${API_URL}/platform/tenants?page=1&pageSize=10`);
  record("platform.tenants", {
    method: "GET", path: "/platform/tenants",
    label: "GET /platform/tenants (listar)",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. POST /platform/tenants (crear)
  const ts = Date.now();
  const createBody = {
    code: `VERIF-${ts}`,
    name: `Tenant Verif ${ts}`,
    legalName: `Tenant Verif ${ts} SAC`,
    taxId: `${ts}`.slice(-11),
    address: "Av. Test 123",
    city: "Lima",
    country: "PE",
    phone: "+51 999000111",
    email: `verif${ts}@test.com`,
    plan: "professional",
    subscriptionMonths: 12,
    enableTrial: false,
    maxUsers: 25,
    maxVehicles: 100,
    enabledModules: ["orders", "customers", "drivers", "vehicles", "notifications"],
    timezone: "America/Lima",
    defaultCurrency: "PEN",
    defaultLanguage: "es",
  };
  r = await http("POST", `${API_URL}/platform/tenants`, createBody);
  tenantId = unwrap(r.body)?.id;
  record("platform.tenants", {
    method: "POST", path: "/platform/tenants",
    label: "POST /platform/tenants (crear)",
    status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
    requestBody: createBody, responseBody: r.body,
  });
  await sleep(150);

  // 3. GET /platform/tenants/:id  — usar id del primero del listado si no creamos uno
  if (!tenantId) {
    const listResp = await http("GET", `${API_URL}/platform/tenants?pageSize=1`);
    tenantId = unwrap(listResp.body)?.[0]?.id;
  }

  if (tenantId) {
    r = await http("GET", `${API_URL}/platform/tenants/${tenantId}`);
    record("platform.tenants", {
      method: "GET", path: "/platform/tenants/:id",
      label: "GET /platform/tenants/:id (detalle)",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
    });
    await sleep(150);

    // 4. PUT /platform/tenants/:id
    r = await http("PUT", `${API_URL}/platform/tenants/${tenantId}`, {
      internalNotes: "Test e2e 2026-05-06",
    });
    record("platform.tenants", {
      method: "PUT", path: "/platform/tenants/:id",
      label: "PUT /platform/tenants/:id (editar)",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { internalNotes: "..." }, responseBody: r.body,
    });
    await sleep(150);

    // 5. POST /platform/tenants/:id/suspend
    r = await http("POST", `${API_URL}/platform/tenants/${tenantId}/suspend`, {
      reason: "Test suspend",
      notifyMasterUser: false,
    });
    record("platform.tenants", {
      method: "POST", path: "/platform/tenants/:id/suspend",
      label: "POST /platform/tenants/:id/suspend",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { reason: "..." }, responseBody: r.body,
    });
    await sleep(150);

    // 6. POST /platform/tenants/:id/reactivate
    r = await http("POST", `${API_URL}/platform/tenants/${tenantId}/reactivate`);
    record("platform.tenants", {
      method: "POST", path: "/platform/tenants/:id/reactivate",
      label: "POST /platform/tenants/:id/reactivate",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
    });
    await sleep(150);

    // 6.5. POST /platform/tenants/:id/renew (NUEVO 2026-05-08)
    r = await http("POST", `${API_URL}/platform/tenants/${tenantId}/renew`, {
      mode: "extend",
      months: 1,
      notifyMasterUser: false,
    });
    record("platform.tenants", {
      method: "POST", path: "/platform/tenants/:id/renew",
      label: "POST /platform/tenants/:id/renew (NUEVO)",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { mode: "extend", months: 1 }, responseBody: r.body,
    });
    await sleep(150);
  }

  return tenantId;
}

// ═════════════ PLATFORM — TENANT MODULES ═════════════
async function testPlatformModules(tenantId) {
  header("PLATAFORMA — TENANT MODULES");
  if (!tenantId) {
    console.log(`${C.yellow}skip — no hay tenantId${C.reset}`);
    return;
  }

  // 1. GET /platform/tenants/:id/modules
  let r = await http("GET", `${API_URL}/platform/tenants/${tenantId}/modules`);
  record("platform.modules", {
    method: "GET", path: "/platform/tenants/:id/modules",
    label: "GET /platform/tenants/:id/modules",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. PUT /platform/tenants/:id/modules
  r = await http("PUT", `${API_URL}/platform/tenants/${tenantId}/modules`, {
    enableModules: ["scheduling"],
    disableModules: [],
  });
  record("platform.modules", {
    method: "PUT", path: "/platform/tenants/:id/modules",
    label: "PUT /platform/tenants/:id/modules",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
    requestBody: { enableModules: ["scheduling"], disableModules: [] }, responseBody: r.body,
  });
  await sleep(150);

  // 3. GET /platform/tenants/:id/modules/:code/status
  r = await http("GET", `${API_URL}/platform/tenants/${tenantId}/modules/orders/status`);
  record("platform.modules", {
    method: "GET", path: "/platform/tenants/:id/modules/:code/status",
    label: "GET /platform/tenants/:id/modules/orders/status",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);
}

// ═════════════ PLATFORM — MASTER USERS ═════════════
async function testPlatformMasterUsers(tenantId) {
  header("PLATAFORMA — MASTER USERS + FORCE RESET");
  if (!tenantId) {
    console.log(`${C.yellow}skip — no hay tenantId${C.reset}`);
    return;
  }

  const ts = Date.now();

  // 1. POST /platform/tenants/:id/master-users
  const masterBody = {
    tenantId,
    name: `Master Verif ${ts}`,
    email: `master${ts}@test.com`,
    password: "TempPass1234!",
    forcePasswordChange: true,
  };
  let r = await http("POST", `${API_URL}/platform/tenants/${tenantId}/master-users`, masterBody);
  const masterUserId = unwrap(r.body)?.id;
  record("platform.master", {
    method: "POST", path: "/platform/tenants/:id/master-users",
    label: "POST /platform/tenants/:id/master-users",
    status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
    requestBody: masterBody, responseBody: r.body,
  });
  await sleep(150);

  // 2. POST /platform/users/:userId/force-reset
  if (masterUserId) {
    r = await http("POST", `${API_URL}/platform/users/${masterUserId}/force-reset`, {
      userId: masterUserId,
      tenantId,
      sendByEmail: false,
      forceChangeOnLogin: true,
    });
    record("platform.master", {
      method: "POST", path: "/platform/users/:userId/force-reset",
      label: "POST /platform/users/:userId/force-reset",
      status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  } else {
    // probar con un userId dummy para ver que dice
    r = await http("POST", `${API_URL}/platform/users/00000000-0000-0000-0000-000000000000/force-reset`, {
      userId: "00000000-0000-0000-0000-000000000000",
      tenantId,
      sendByEmail: false,
      forceChangeOnLogin: true,
    });
    record("platform.master", {
      method: "POST", path: "/platform/users/:userId/force-reset",
      label: "POST /platform/users/:userId/force-reset (dummy)",
      status: r.status, ok: r.status === 404, latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ PLATFORM — TRANSFERS ═════════════
async function testPlatformTransfers(tenantId) {
  header("PLATAFORMA — VEHICLE TRANSFERS");

  // 1. GET /platform/transfers
  let r = await http("GET", `${API_URL}/platform/transfers`);
  record("platform.transfers", {
    method: "GET", path: "/platform/transfers",
    label: "GET /platform/transfers",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. POST /platform/transfers (con datos dummy — se espera 404 o 400 o 422)
  if (tenantId) {
    r = await http("POST", `${API_URL}/platform/transfers`, {
      vehicleIds: ["00000000-0000-0000-0000-000000000000"],
      fromTenantId: tenantId,
      toTenantId: "00000000-0000-0000-0000-000000000001",
      reason: "Test e2e",
      transferGpsHistory: false,
      transferMaintenanceHistory: false,
    });
    record("platform.transfers", {
      method: "POST", path: "/platform/transfers",
      label: "POST /platform/transfers (dummy)",
      status: r.status, ok: r.status === 200 || r.status === 201 || r.status === 404 || r.status === 400 || r.status === 422,
      latencyMs: r.latencyMs, responseBody: r.body,
    });
    await sleep(150);
  }

  // 3-5. Tests sobre transferId dummy
  const dummyId = "00000000-0000-0000-0000-000000000000";
  for (const action of ["approve", "execute", "reject"]) {
    r = await http("POST", `${API_URL}/platform/transfers/${dummyId}/${action}`,
      action === "reject" ? { reason: "Test" } : null);
    record("platform.transfers", {
      method: "POST", path: `/platform/transfers/:id/${action}`,
      label: `POST /platform/transfers/:id/${action} (dummy)`,
      status: r.status, ok: r.status === 404, latencyMs: r.latencyMs, responseBody: r.body,
    });
    await sleep(150);
  }
}

// ═════════════ PLATFORM — DASHBOARD + ACTIVITY ═════════════
async function testPlatformDashboard() {
  header("PLATAFORMA — DASHBOARD + ACTIVITY");

  // 1. GET /platform/dashboard
  let r = await http("GET", `${API_URL}/platform/dashboard`);
  record("platform.dashboard", {
    method: "GET", path: "/platform/dashboard",
    label: "GET /platform/dashboard",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. GET /platform/activity
  r = await http("GET", `${API_URL}/platform/activity?page=1&pageSize=10`);
  record("platform.dashboard", {
    method: "GET", path: "/platform/activity",
    label: "GET /platform/activity (log)",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);
}

// ═════════════ PLATFORM — FLEET GROUPS ═════════════
async function testPlatformFleetGroups(tenantId) {
  header("PLATAFORMA — FLEET GROUPS");
  if (!tenantId) {
    console.log(`${C.yellow}skip — no hay tenantId${C.reset}`);
    return;
  }

  // 1. GET /platform/tenants/:id/fleet-groups
  let r = await http("GET", `${API_URL}/platform/tenants/${tenantId}/fleet-groups`);
  record("platform.fleet", {
    method: "GET", path: "/platform/tenants/:id/fleet-groups",
    label: "GET /platform/tenants/:id/fleet-groups",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. POST /platform/tenants/:id/fleet-groups
  r = await http("POST", `${API_URL}/platform/tenants/${tenantId}/fleet-groups`, {
    name: "Grupo Verif",
    description: "Test e2e",
    vehicleIds: [],
    color: "#10b981",
  });
  record("platform.fleet", {
    method: "POST", path: "/platform/tenants/:id/fleet-groups",
    label: "POST /platform/tenants/:id/fleet-groups",
    status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
    requestBody: { name: "Grupo Verif" }, responseBody: r.body,
  });
  await sleep(150);
}

// ═════════════ TENANT — USERS ═════════════
async function testTenantUsers() {
  header("TENANT — USERS CRUD (Nivel 2 → crea Nivel 3)");

  // 1. GET /users
  let r = await http("GET", `${API_URL}/users?page=1&pageSize=10`);
  record("users", {
    method: "GET", path: "/users",
    label: "GET /users (listar usuarios del tenant)",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);

  // 2. POST /users (crear subusuario)
  const ts = Date.now();
  const createBody = {
    name: `Subusuario ${ts}`,
    email: `sub${ts}@test.com`,
    password: "TempPass1234!",
    role: "despachador",
    forcePasswordChange: true,
  };
  r = await http("POST", `${API_URL}/users`, createBody);
  const createdUserId = unwrap(r.body)?.id;
  record("users", {
    method: "POST", path: "/users",
    label: "POST /users (crear subusuario)",
    status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
    requestBody: createBody, responseBody: r.body,
  });
  await sleep(150);

  if (createdUserId) {
    // 3. GET /users/:id
    r = await http("GET", `${API_URL}/users/${createdUserId}`);
    record("users", {
      method: "GET", path: "/users/:id",
      label: "GET /users/:id (detalle)",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
    });
    await sleep(150);

    // 4. PUT /users/:id
    r = await http("PUT", `${API_URL}/users/${createdUserId}`, { phone: "999000888" });
    record("users", {
      method: "PUT", path: "/users/:id",
      label: "PUT /users/:id (actualizar)",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { phone: "..." }, responseBody: r.body,
    });
    await sleep(150);

    // 5. PATCH /users/:id/permissions
    r = await http("PATCH", `${API_URL}/users/${createdUserId}/permissions`, {
      customPermissions: [{ resource: "orders", actions: ["read"] }],
    });
    record("users", {
      method: "PATCH", path: "/users/:id/permissions",
      label: "PATCH /users/:id/permissions",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { customPermissions: "..." }, responseBody: r.body,
    });
    await sleep(150);

    // 6. PATCH /users/:id/scope
    r = await http("PATCH", `${API_URL}/users/${createdUserId}/scope`, {
      scope: { type: "all" },
    });
    record("users", {
      method: "PATCH", path: "/users/:id/scope",
      label: "PATCH /users/:id/scope",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { scope: { type: "all" } }, responseBody: r.body,
    });
    await sleep(150);

    // 7. POST /users/:id/reset-password
    r = await http("POST", `${API_URL}/users/${createdUserId}/reset-password`, {
      sendByEmail: false,
      forceChangeOnLogin: true,
    });
    record("users", {
      method: "POST", path: "/users/:id/reset-password",
      label: "POST /users/:id/reset-password",
      status: r.status, ok: r.status === 200 || r.status === 201, latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);

    // 8. PATCH /users/:id/status
    r = await http("PATCH", `${API_URL}/users/${createdUserId}/status`, { isActive: false });
    record("users", {
      method: "PATCH", path: "/users/:id/status",
      label: "PATCH /users/:id/status",
      status: r.status, ok: r.status === 200, latencyMs: r.latencyMs,
      requestBody: { isActive: false }, responseBody: r.body,
    });
    await sleep(150);

    // 9. DELETE /users/:id
    r = await http("DELETE", `${API_URL}/users/${createdUserId}`);
    record("users", {
      method: "DELETE", path: "/users/:id",
      label: "DELETE /users/:id (limpieza)",
      status: r.status, ok: r.status === 200 || r.status === 204, latencyMs: r.latencyMs,
      responseBody: r.body,
    });
    await sleep(150);
  } else {
    // Si no se pudo crear, probar con UUIDs dummy para detectar 404 vs not-implemented
    const dummy = "00000000-0000-0000-0000-000000000000";
    r = await http("GET", `${API_URL}/users/${dummy}`);
    record("users", {
      method: "GET", path: "/users/:id",
      label: "GET /users/:id (dummy — para detectar implementacion)",
      status: r.status, ok: r.status === 404, latencyMs: r.latencyMs, responseBody: r.body,
    });
  }
}

// ═════════════ ME — LICENSE ═════════════
async function testLicense() {
  header("ME — LICENSE");

  // GET /me/license
  const r = await http("GET", `${API_URL}/me/license`);
  record("license", {
    method: "GET", path: "/me/license",
    label: "GET /me/license (estado de licencia del tenant)",
    status: r.status, ok: r.status === 200, latencyMs: r.latencyMs, responseBody: r.body,
  });
  await sleep(150);
}

// ═════════════ MAIN ═════════════
async function main() {
  console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║ AUDITORIA E2E — PLATAFORMA + USUARIOS + LICENCIAS         ║`);
  console.log(`║ Backend: ${API_BASE.padEnd(48)}║`);
  console.log(`║ Fecha:   ${new Date().toISOString().slice(0, 10).padEnd(48)}║`);
  console.log(`╚══════════════════════════════════════════════════════════╝${C.reset}`);

  await setup();

  const tenantId = await testPlatformTenants();
  await testPlatformModules(tenantId);
  await testPlatformMasterUsers(tenantId);
  await testPlatformTransfers(tenantId);
  await testPlatformDashboard();
  await testPlatformFleetGroups(tenantId);
  await testTenantUsers();
  await testLicense();

  // ═════════════ RESUMEN ═════════════
  header("RESUMEN");
  const total = RESULTS.length;
  const ok = RESULTS.filter(r => r.ok).length;
  const fail = total - ok;
  const status404 = RESULTS.filter(r => r.status === 404).length;
  const status500 = RESULTS.filter(r => r.status >= 500).length;

  const bySubmodule = {};
  RESULTS.forEach(r => {
    if (!bySubmodule[r.submodule]) bySubmodule[r.submodule] = { total: 0, ok: 0, fail: 0 };
    bySubmodule[r.submodule].total++;
    if (r.ok) bySubmodule[r.submodule].ok++;
    else bySubmodule[r.submodule].fail++;
  });

  console.log(`Total: ${total}  OK: ${C.green}${ok}${C.reset}  FAIL: ${C.red}${fail}${C.reset}`);
  console.log(`  404 (no implementado): ${C.yellow}${status404}${C.reset}`);
  console.log(`  500 (bug backend):     ${C.red}${status500}${C.reset}`);
  console.log("");
  for (const [k, v] of Object.entries(bySubmodule)) {
    const pct = ((v.ok / v.total) * 100).toFixed(0);
    console.log(`  ${k.padEnd(20)} ${v.ok}/${v.total} (${pct}%)`);
  }

  // ═════════════ EXPORT ═════════════
  const out = {
    auditDate: new Date().toISOString(),
    backend: API_BASE,
    total, ok, fail, status404, status500,
    bySubmodule,
    results: RESULTS,
  };
  const outPath = "otros/testing/plataforma-verification-results.json";
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\n${C.green}Resultados guardados en ${outPath}${C.reset}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
