#!/usr/bin/env node
/** Captura el body EXACTO de los 400 para diagnostico backend */
const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

const login = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "Admin1432!" }),
});
const TOKEN = (await login.json()).data?.accessToken;

const customers = await (await fetch(`${API_URL}/master/customers?pageSize=1`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const drivers = await (await fetch(`${API_URL}/master/drivers?pageSize=1`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const vehicles = await (await fetch(`${API_URL}/master/vehicles?pageSize=1`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
const orders = await (await fetch(`${API_URL}/orders?pageSize=1`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();

const unwrap = (d) => Array.isArray(d) ? d : (d.data ?? d.items ?? d);
const customerId = unwrap(customers)[0]?.id;
const driverId = unwrap(drivers)[0]?.id;
const vehicleId = unwrap(vehicles)[0]?.id;
const orderId = unwrap(orders)[0]?.id;

console.log("IDs:", { customerId, driverId, vehicleId, orderId });

const SC = `${API_URL}/operations/scheduling`;

async function probe(label, method, url, body) {
  console.log(`\n══ ${label} ══`);
  console.log(`${method} ${url}`);
  console.log(`Body:`, JSON.stringify(body, null, 2));
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  console.log(`Status: ${r.status}`);
  console.log(`Response:`, text.slice(0, 500));
}

await probe("validate-hos", "POST", `${SC}/validate-hos`, {
  driverId,
  scheduledStart: "2026-05-07T08:00:00Z",
  scheduledEnd: "2026-05-07T18:00:00Z",
  estimatedDurationMinutes: 360,
});

await probe("detect-conflicts", "POST", `${SC}/detect-conflicts`, {
  orders: [{ orderId, vehicleId, driverId, scheduledStart: "2026-05-07T08:00:00Z", scheduledEnd: "2026-05-07T18:00:00Z" }],
  drivers: [{ id: driverId, status: "active" }],
  vehicles: [{ id: vehicleId, status: "active" }],
});

await probe("assign", "POST", `${SC}/assign`, {
  orderId, driverId, vehicleId,
  scheduledStart: "2026-05-07T08:00:00Z",
  scheduledEnd: "2026-05-07T18:00:00Z",
});

await probe("block-day", "POST", `${SC}/block-day`, {
  date: "2026-12-25",
  reason: "Navidad",
  type: "holiday",
});
