// Probe: descubrir el shape EXACTO de POST /platform/tenants (que da 500)
// Estrategia: ir agregando campos hasta encontrar cual hace que el handler trune
import fs from "node:fs";

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
let TOKEN = null;

async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, body: data };
}

const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
TOKEN = login.body?.data?.accessToken;
console.log("Login:", !!TOKEN, "\n");

let createdId = null;

const probe = async (label, body) => {
  const r = await http("POST", `${API_URL}/platform/tenants`, body);
  const msg = typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200);
  console.log(`${label.padEnd(35)} ${r.status} — ${msg}`);
  if (r.status === 201 || r.status === 200) {
    createdId = r.body?.data?.id || r.body?.id;
    console.log("  ✅ CREATED ID:", createdId);
  }
  return r;
};

const ts = Date.now();

// Probes iterativas — agregar 1 campo a la vez
await probe("1. solo {}", {});
await probe("2. code+name", { code: `T-${ts}`, name: `Test ${ts}` });
await probe("3. + ruc", { code: `T${ts}`, name: `Test ${ts}`, ruc: `${ts}`.slice(-11) });
await probe("4. + company_name", { code: `T${ts}A`, name: `T ${ts}`, ruc: `${ts}A`.slice(-11), company_name: `Comp ${ts}` });
await probe("5. + email", { code: `T${ts}B`, name: `T ${ts}`, ruc: `${ts}B`.slice(-11), company_name: `C ${ts}`, email: "t@t.com" });
await probe("6. + plan", { code: `T${ts}C`, name: `T ${ts}`, ruc: `${ts}C`.slice(-11), company_name: `C ${ts}`, email: "t@t.com", plan: "starter" });

// Probes con shape "completo" pero con nombres que el GET nos mostro:
// El GET muestra: ruc, company_name, trade_name, tax_id (null), plan, status, country, max_users, etc.
console.log("\n=== Tentativa basada en shape REAL del GET ===");
await probe("7. shape inferido del GET", {
  code: `REAL-${ts}`,
  ruc: `${ts}REAL`.slice(-11),
  company_name: `Empresa Real ${ts}`,
  trade_name: `RealCorp`,
  status: "active",
  country: "PE",
  plan: "starter",
  max_users: 5,
  max_vehicles: 10,
  timezone: "America/Lima",
  default_currency: "PEN",
  default_language: "es",
});

console.log("\n=== Tentativa con `name` mas `ruc` ===");
await probe("8. name+ruc (sin code)", {
  name: `Empresa ${ts}X`,
  ruc: `${ts}X`.slice(-11),
});

await probe("9. name+code+ruc snake", {
  name: `Empresa ${ts}Y`,
  code: `Y-${ts}`,
  ruc: `${ts}Y`.slice(-11),
});

// Si conseguimos crear, intentar PUT y suspend sobre ese
if (createdId) {
  console.log(`\n=== Probes sobre tenant CREADO (${createdId}) ===`);

  let r = await http("PUT", `${API_URL}/platform/tenants/${createdId}`, {
    name: "Renamed",
  });
  console.log("PUT /:id {name}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200));

  r = await http("PUT", `${API_URL}/platform/tenants/${createdId}`, {
    company_name: "Renamed Co",
  });
  console.log("PUT /:id {company_name}:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200));

  r = await http("POST", `${API_URL}/platform/tenants/${createdId}/suspend`, { reason: "test" });
  console.log("POST /:id/suspend:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200));

  r = await http("POST", `${API_URL}/platform/tenants/${createdId}/reactivate`);
  console.log("POST /:id/reactivate:", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200));

  r = await http("DELETE", `${API_URL}/platform/tenants/${createdId}`);
  console.log("DELETE /:id (cleanup):", r.status, "—", typeof r.body === "string" ? r.body.slice(0, 150) : JSON.stringify(r.body).slice(0, 200));
}

console.log("\n=== Sample del GET despues de los probes ===");
const list = await http("GET", `${API_URL}/platform/tenants?pageSize=10`);
const items = list.body?.data || list.body?.items || [];
console.log(`Tenants en BD: ${items.length}`);
items.forEach(t => console.log(`  - ${t.id}: code=${t.code ?? "(no code)"} ruc=${t.ruc} name=${t.name ?? t.company_name} status=${t.status}`));
