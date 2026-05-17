// Probes finos para descubrir el shape correcto que espera el backend
import fs from "node:fs";

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
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
  let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, body: data, latencyMs: Date.now() - t0 };
}

const login = await http("POST", `${API_BASE}/auth/login`, {
  username: "admin", password: "Admin1432!",
});
TOKEN = login.body?.data?.accessToken;
console.log("Login OK:", !!TOKEN);

// Decode JWT
const payload = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64").toString());
console.log("Role:", payload.role, " | Tenant:", payload.tenantId);
console.log();

// ── Probe 1: GET tenant para ver shape exacto del response ──
console.log("=== GET /platform/tenants/:id (shape de response) ===");
let r = await http("GET", `${API_URL}/platform/tenants/${payload.tenantId}`);
console.log("Status:", r.status);
console.log("Response:", JSON.stringify(r.body, null, 2));
console.log();

// ── Probe 2: GET un listado ─
console.log("=== GET /platform/tenants?pageSize=2 (shape) ===");
r = await http("GET", `${API_URL}/platform/tenants?pageSize=2`);
console.log("Status:", r.status);
const sample = (r.body?.data || r.body?.items || [])[0];
console.log("Sample item keys:", sample ? Object.keys(sample) : "(none)");
console.log("Total tenants:", (r.body?.data || r.body?.items || []).length);
console.log();

// ── Probe 3: POST /platform/tenants — probar distintos shapes ──
console.log("=== POST /platform/tenants — probar shapes ===");

// Shape A: snake_case
const ts = Date.now();
r = await http("POST", `${API_URL}/platform/tenants`, {
  code: `PROBE-${ts}`,
  name: `Probe ${ts}`,
  legal_name: `Probe ${ts} SAC`,
  tax_id: `${ts}`.slice(-11),
  address: "Av. Probe 123",
  city: "Lima",
  country: "PE",
  phone: "+51 999",
  email: `p${ts}@test.com`,
  plan: "professional",
  status: "active",
});
console.log("A) snake_case minimal:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape B: muy minimo, solo lo critico
r = await http("POST", `${API_URL}/platform/tenants`, {
  code: `PROBE-B-${ts}`,
  name: `Probe B ${ts}`,
});
console.log("B) minimal solo code+name:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape C: vacio
r = await http("POST", `${API_URL}/platform/tenants`, {});
console.log("C) body vacio:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

console.log();

// ── Probe 4: PUT /platform/tenants/:id — probar shapes ──
console.log("=== PUT /platform/tenants/:id ===");

// Shape A: campo unico
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}`, {
  name: "Test rename probe",
});
console.log("A) {name}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape B: snake_case
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}`, {
  internal_notes: "test snake",
});
console.log("B) {internal_notes}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape C: vacio
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}`, {});
console.log("C) {} vacio:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

console.log();

// ── Probe 5: PUT /platform/tenants/:id/modules — el backend dijo "modules array required" ──
console.log("=== PUT /platform/tenants/:id/modules — shape distinto ===");

// Shape A: array directo `modules`
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}/modules`, {
  modules: [
    { moduleCode: "scheduling", isEnabled: true },
  ],
});
console.log("A) {modules: [...]}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape B: array de codes
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}/modules`, {
  modules: ["scheduling", "monitoring"],
});
console.log("B) modules como string[]:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

// Shape C: snake_case
r = await http("PUT", `${API_URL}/platform/tenants/${payload.tenantId}/modules`, {
  modules: [
    { module_code: "scheduling", is_enabled: true },
  ],
});
console.log("C) snake_case:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

console.log();

// ── Probe 6: SUSPEND — probar shapes ──
console.log("=== POST /platform/tenants/:id/suspend ===");

r = await http("POST", `${API_URL}/platform/tenants/${payload.tenantId}/suspend`, {});
console.log("A) body vacio:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

r = await http("POST", `${API_URL}/platform/tenants/${payload.tenantId}/suspend`, {
  reason: "test reason",
});
console.log("B) {reason}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

r = await http("POST", `${API_URL}/platform/tenants/${payload.tenantId}/suspend`, {
  reason: "test", notify_master_user: false,
});
console.log("C) snake_case:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 200) : JSON.stringify(r.body).slice(0, 300));

console.log();

// ── Probe 7: GET /platform/dashboard — ver shape ──
console.log("=== GET /platform/dashboard (shape) ===");
r = await http("GET", `${API_URL}/platform/dashboard`);
console.log("Status:", r.status);
console.log("Response keys:", Object.keys(r.body?.data || r.body || {}));
console.log("Sample:", JSON.stringify(r.body, null, 2).slice(0, 800));

console.log();

// ── Probe 8: HEAD /me/license, /users (ver si responden algo distinto a 404) ──
console.log("=== Variantes de path para license + users ===");
for (const path of ["/me/license", "/license", "/users", "/users/me", "/auth/me", "/me", "/tenant/license"]) {
  r = await http("GET", `${API_URL}${path}`);
  console.log(`  ${path.padEnd(30)} → ${r.status}`);
}
