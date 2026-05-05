// Investigacion 3: ¿el backend tiene las rutas con OTRO shape?
// Probamos variantes de cada operacion bloqueada
const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };

// Conseguir un ID real de la lista
const list = await fetch(`${API}/api/v1/master/drivers?pageSize=1`, { headers: H });
const ID = (await list.json()).items[0].id;
console.log(`Usando driver real: ${ID}\n`);

await sleep(1500);

async function probe(label, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  const isNotFound9 = txt === "Not Found" && txt.length === 9;
  console.log(`[${label.padEnd(8)}] ${method.padEnd(5)} ${path.padEnd(70)} → ${res.status} ${isNotFound9 ? "(NotFound9)" : `(${txt.length}b)`} ${!isNotFound9 ? JSON.stringify(txt.slice(0,80)) : ""}`);
  return res.status;
}

console.log("=== Variantes para obtener detalle de driver ===");
await probe("V-DET-1", "GET", `/api/v1/master/drivers/${ID}`);
await sleep(1000);
await probe("V-DET-2", "GET", `/api/v1/master/drivers?id=${ID}`);
await sleep(1000);
await probe("V-DET-3", "GET", `/api/v1/master/drivers/detail/${ID}`);
await sleep(1000);
await probe("V-DET-4", "GET", `/api/v1/master/drivers/get/${ID}`);
await sleep(1000);
await probe("V-DET-5", "GET", `/api/v1/master/drivers/show/${ID}`);
await sleep(1000);
await probe("V-DET-6", "POST", `/api/v1/master/drivers/get`, { id: ID });
await sleep(1000);
await probe("V-DET-7", "POST", `/api/v1/master/drivers/find`, { id: ID });

console.log("\n=== Variantes para update ===");
await sleep(1000);
await probe("V-UPD-1", "PUT", `/api/v1/master/drivers/${ID}`, { phone: "+51 999" });
await sleep(1000);
await probe("V-UPD-2", "PATCH", `/api/v1/master/drivers/${ID}`, { phone: "+51 999" });
await sleep(1000);
await probe("V-UPD-3", "POST", `/api/v1/master/drivers/${ID}/update`, { phone: "+51 999" });
await sleep(1000);
await probe("V-UPD-4", "POST", `/api/v1/master/drivers/update`, { id: ID, phone: "+51 999" });

console.log("\n=== Variantes para enable ===");
await sleep(1000);
await probe("V-ENA-1", "POST", `/api/v1/master/drivers/${ID}/enable`);
await sleep(1000);
await probe("V-ENA-2", "PATCH", `/api/v1/master/drivers/${ID}/enable`);
await sleep(1000);
await probe("V-ENA-3", "POST", `/api/v1/master/drivers/enable`, { id: ID });
await sleep(1000);
await probe("V-ENA-4", "POST", `/api/v1/master/drivers/${ID}/activate`);

console.log("\n=== Variantes para checklist ===");
await sleep(1000);
await probe("V-CHK-1", "GET", `/api/v1/master/drivers/${ID}/checklist`);
await sleep(1000);
await probe("V-CHK-2", "GET", `/api/v1/master/drivers/checklist/${ID}`);
await sleep(1000);
await probe("V-CHK-3", "GET", `/api/v1/master/drivers/checklist?driverId=${ID}`);
await sleep(1000);
await probe("V-CHK-4", "GET", `/api/v1/master/drivers/${ID}/validation`);

console.log("\n=== Variantes para assign-vehicle ===");
await sleep(1000);
await probe("V-ASN-1", "POST", `/api/v1/master/drivers/${ID}/assign-vehicle`, { vehicle_id: "test" });
await sleep(1000);
await probe("V-ASN-2", "POST", `/api/v1/master/drivers/assign-vehicle`, { driver_id: ID, vehicle_id: "test" });
await sleep(1000);
await probe("V-ASN-3", "POST", `/api/v1/master/drivers/${ID}/vehicles`, { vehicle_id: "test" });
await sleep(1000);
await probe("V-ASN-4", "POST", `/api/v1/master/assignments`, { driver_id: ID, vehicle_id: "test" });

console.log("\n=== Si TODO sigue dando NotFound9, confirma que el backend no tiene esas rutas ===");
