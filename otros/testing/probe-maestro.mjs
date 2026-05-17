// Quick probe to find correct payload shapes for maestro endpoints
import fs from "node:fs";

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
let TOKEN = null;

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
    let data;
    try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
    return { status: res.status, body: data, latencyMs: Date.now() - t0 };
  } catch (err) {
    return { status: 0, body: err.message, latencyMs: Date.now() - t0 };
  }
}

const login = await http("POST", `${API_BASE}/auth/login`, {
  username: "admin",
  password: "Admin1432!",
});
TOKEN = login.body?.data?.accessToken || login.body?.accessToken;
console.log("Logged in:", !!TOKEN);

// Probe 1: Customer create with fewer fields
console.log("\n=== Customer create (minimal) ===");
let r = await http("POST", `${API_URL}/master/customers`, {
  code: `CLI-PROBE-${Date.now()}`,
  name: "Probe Cliente",
  type: "company",
  document_type: "RUC",
  document_number: `${Date.now()}`.slice(-11),
  email: "probe@test.com",
  phone: "999000000",
  address: "Av. Probe 123",
  status: "active",
  category: "standard",
});
console.log(r.status, JSON.stringify(r.body).slice(0, 400));
const customerId = r.body?.data?.id;

// Probe 2: bulk-delete via POST
console.log("\n=== Customer bulk-delete (POST) ===");
r = await http("POST", `${API_URL}/master/customers/bulk-delete`, {
  ids: ["00000000-0000-0000-0000-000000000000"],
});
console.log(r.status, JSON.stringify(r.body).slice(0, 300));

// Probe 3: customer import shape
console.log("\n=== Customer import (with shape) ===");
r = await http("POST", `${API_URL}/master/customers/import`, {
  customers: [],
});
console.log(r.status, JSON.stringify(r.body).slice(0, 300));

// Probe 4: Driver create
console.log("\n=== Driver create ===");
r = await http("POST", `${API_URL}/master/drivers`, {
  code: `DRV-PROBE-${Date.now()}`,
  document_type: "DNI",
  document_number: `${Date.now()}`.slice(-8),
  first_name: "Probe",
  last_name: "Driver",
  birth_date: "1990-01-01",
  email: `drv${Date.now()}@test.com`,
  phone: "999111222",
  address: "Av. Driver 123",
  hire_date: "2024-01-01",
  blood_type: "O+",
  status: "active",
  availability: "available",
});
console.log(r.status, JSON.stringify(r.body).slice(0, 400));
const driverId = r.body?.data?.id;

// Probe 5: Operator create
console.log("\n=== Operator create ===");
r = await http("POST", `${API_URL}/master/operators`, {
  code: `OPL-PROBE-${Date.now()}`,
  name: `Operator Probe ${Date.now()}`,
  trade_name: "Probe Op",
  type: "carrier",
  document_type: "RUC",
  document_number: `${Date.now()}`.slice(-11),
  email: `op${Date.now()}@test.com`,
  phone: "999444555",
  address: "Av. Op 123",
  status: "active",
});
console.log(r.status, JSON.stringify(r.body).slice(0, 400));
const operatorId = r.body?.data?.id;

// Probe 6: Vehicle status valid values
console.log("\n=== Vehicle list raw status values ===");
r = await http("GET", `${API_URL}/master/vehicles?pageSize=20`);
const vehicles = r.body?.data || r.body?.items || [];
const statuses = new Set();
vehicles.forEach(v => statuses.add(v.status));
console.log("Vehicle statuses found:", [...statuses]);

// Probe 7: Geofence create with lat/lng
console.log("\n=== Geofence create (with lat/lng) ===");
r = await http("POST", `${API_URL}/geofences`, {
  name: `Geo Probe ${Date.now()}`,
  short_name: `GEO-P-${Date.now()}`,
  type: "CIRCLE",
  category: "warehouse",
  color: "#10b981",
  lat: -12.046,
  lng: -77.042,
  radius_m: 100,
  is_active: true,
});
console.log(r.status, JSON.stringify(r.body).slice(0, 400));
const geoId = r.body?.data?.id;

// Cleanup
if (customerId) {
  console.log("\n=== Cleanup customer ===");
  r = await http("DELETE", `${API_URL}/master/customers/${customerId}`);
  console.log(r.status);
}
if (driverId) {
  console.log("\n=== Cleanup driver ===");
  r = await http("DELETE", `${API_URL}/master/drivers/${driverId}`);
  console.log(r.status);
}
if (operatorId) {
  console.log("\n=== Cleanup operator ===");
  r = await http("DELETE", `${API_URL}/master/operators/${operatorId}`);
  console.log(r.status);
}
if (geoId) {
  console.log("\n=== Cleanup geofence ===");
  r = await http("DELETE", `${API_URL}/geofences/${geoId}`);
  console.log(r.status);
}
