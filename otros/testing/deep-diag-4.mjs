// Investigacion 4: probar a fondo PATCH /:id/status y /master/assignments
// para entender si las funcionalidades existen con otro shape
const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };

// Conseguir driver real
const list = await fetch(`${API}/api/v1/master/drivers?pageSize=1`, { headers: H });
const driver = (await list.json()).items[0];
const driverId = driver.id;
console.log(`Driver real: ${driverId} (${driver.first_name} ${driver.last_name})\n`);
await sleep(1500);

// Conseguir vehicle real
const vList = await fetch(`${API}/api/v1/master/vehicles?pageSize=1`, { headers: H });
const vehicle = (await vList.json()).items[0];
const vehicleId = vehicle.id;
console.log(`Vehicle real: ${vehicleId} (${vehicle.plate})\n`);
await sleep(1500);

async function probe(label, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  const isNF9 = txt === "Not Found" && txt.length === 9;
  console.log(`[${label}] ${method} ${path}`);
  console.log(`  → ${res.status} ${isNF9 ? "(Backend 404 default)" : `ct=${res.headers.get("content-type")} bytes=${txt.length}`}`);
  if (!isNF9) console.log(`  body: ${JSON.stringify(txt.slice(0, 250))}`);
  console.log();
  return { status: res.status, body: txt };
}

// === BLOQUE 1: PATCH status drivers ===
console.log("═════ PATCH /master/drivers/:id/status (el Excel lo lista) ═════\n");
await probe("PS-1", "PATCH", `/api/v1/master/drivers/${driverId}/status`, { status: "active" });
await sleep(1500);
await probe("PS-2", "PATCH", `/api/v1/master/drivers/${driverId}/status`, { status: "inactive" });
await sleep(1500);
await probe("PS-3", "PATCH", `/api/v1/master/drivers/${driverId}/status`, { status: "blocked" });
await sleep(1500);
// quizas el shape espera otro campo
await probe("PS-4", "PATCH", `/api/v1/master/drivers/${driverId}/status`, { is_active: true });
await sleep(1500);
await probe("PS-5", "PATCH", `/api/v1/master/drivers/${driverId}/status`, {});

await sleep(1500);

// === BLOQUE 2: variantes para customers que SI sabemos que estan en Excel ===
console.log("\n═════ PATCH /master/customers/:id/status (Customers — comparativa) ═════\n");
const cList = await fetch(`${API}/api/v1/master/customers?pageSize=1`, { headers: H });
const customer = (await cList.json()).items[0];
const customerId = customer?.id;
console.log(`Customer real: ${customerId}`);
await sleep(1500);
await probe("PC-1", "PATCH", `/api/v1/master/customers/${customerId}/status`, { status: "active" });
await sleep(1500);
// El Excel tambien menciona /:id/toggle-status para customers
await probe("PC-2", "POST", `/api/v1/master/customers/${customerId}/toggle-status`);

await sleep(1500);

// === BLOQUE 3: /master/assignments ===
console.log("\n═════ /master/assignments (existe pero da 500) ═════\n");
await probe("A-1", "GET", `/api/v1/master/assignments`);
await sleep(1500);
await probe("A-2", "POST", `/api/v1/master/assignments`, { driver_id: driverId, vehicle_id: vehicleId });
await sleep(1500);
await probe("A-3", "POST", `/api/v1/master/assignments`, { driverId: driverId, vehicleId: vehicleId });
await sleep(1500);
await probe("A-4", "POST", `/api/v1/master/assignments`, {
  driver_id: driverId, vehicle_id: vehicleId,
  start_date: "2026-05-04", end_date: "2026-05-31"
});

await sleep(1500);

// === BLOQUE 4: ¿quizas usar GET /api/v1/master/drivers con UUID en path pero con prefix raro? ===
console.log("\n═════ Probando otros prefijos para detalle ═════\n");
await probe("X-1", "GET", `/api/v1/master/drivers/show?id=${driverId}`);
await sleep(1500);
await probe("X-2", "GET", `/master/drivers/${driverId}`);  // sin /api/v1
await sleep(1500);

console.log("\n═════ FIN ═════");
