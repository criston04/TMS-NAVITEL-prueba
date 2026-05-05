// Investigacion rigurosa del 404 en :id de Drivers
// Hipotesis a probar:
// H1: Es realmente NGINX (firma plain text 9 bytes "Not Found")
// H2: Es route equivocado en frontend
// H3: Es metodo HTTP equivocado
// H4: Es prefix incorrecto (/api/v1 vs /v1 vs nada)
// H5: Es header de auth o CORS
// H6: El backend simplemente no implementa esa ruta (no es NGINX)

const API = "https://api-service.gruponavitel.com";
const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" };

const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log("=== PASO 1: Crear driver con UUID conocido ===");
const create = await fetch(`${API}/api/v1/master/drivers`, { method:"POST", headers: H, body: JSON.stringify({
  code: `DRV-DIAG-${Date.now()}`, document_type:"DNI", document_number: String(Date.now()).slice(-8),
  first_name:"Diag", last_name:"Test", email:`diag-${Date.now()}@x.pe`, phone:"+51999111222"
})});
const created = (await create.json()).data;
const ID = created.id;
const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ID);
console.log("ID:", ID, "| UUID v4 valido:", isUUID);

await sleep(1500);

async function probe(label, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  console.log(`\n[${label}] ${method} ${path}`);
  console.log(`  status: ${res.status}`);
  console.log(`  server: ${res.headers.get("server")}`);
  console.log(`  ct: ${res.headers.get("content-type")}`);
  console.log(`  body bytes: ${txt.length}`);
  console.log(`  body: ${JSON.stringify(txt.slice(0, 200))}`);
  return { status: res.status, server: res.headers.get("server"), ct: res.headers.get("content-type"), body: txt };
}

// === H1: Firma exacta del 404 con UUID real ===
console.log("\n\n=== H1: Firma del 404 con UUID REAL ===");
const t1 = await probe("A1", "GET", `/api/v1/master/drivers/${ID}`);

await sleep(1500);

// === H2: Comparar con 404 de path totalmente inventado ===
console.log("\n=== H2: 404 de path inventado (deberia ser misma firma si es NGINX default) ===");
const t2 = await probe("A2", "GET", `/api/v1/master/drivers/totalmente-no-existe-12345`);

await sleep(1500);

// === H3: Path random TOTAL ===
console.log("\n=== H3: 404 de root totalmente desconocido ===");
const t3 = await probe("A3", "GET", `/totalmente-no-existe-xyz123`);

await sleep(1500);

// === H4: Endpoint que SI funciona (para comparar firmas) ===
console.log("\n=== H4: Endpoint que SI funciona (firma de respuesta del backend real) ===");
const t4 = await probe("B1", "GET", `/api/v1/master/drivers?pageSize=1`);

await sleep(1500);

// === H5: Variantes de path ===
console.log("\n=== H5: Variantes de path ===");
await probe("V1", "GET", `/api/v1/drivers/${ID}`);            // sin /master
await sleep(1500);
await probe("V2", "GET", `/master/drivers/${ID}`);            // sin /api/v1
await sleep(1500);
await probe("V3", "GET", `/v1/master/drivers/${ID}`);         // /v1 sin /api
await sleep(1500);
await probe("V4", "GET", `/api/master/drivers/${ID}`);        // sin v1
await sleep(1500);
await probe("V5", "GET", `/api/v1/master/drivers/${ID}/`);    // con trailing slash

await sleep(1500);

// === H6: Variantes de metodo (POST/HEAD/OPTIONS) en mismo path ===
console.log("\n=== H6: Diferentes metodos HTTP en /:id ===");
await probe("M1", "HEAD", `/api/v1/master/drivers/${ID}`);
await sleep(1500);
await probe("M2", "OPTIONS", `/api/v1/master/drivers/${ID}`);
await sleep(1500);
await probe("M3", "GET", `/api/v1/master/drivers/${ID}`, null);  // de nuevo, validar consistente

await sleep(1500);

// === H7: UUID con guiones quitados ===
console.log("\n=== H7: Diferentes formatos de ID ===");
const idNoHyphens = ID.replace(/-/g, "");
await probe("F1", "GET", `/api/v1/master/drivers/${idNoHyphens}`);  // sin guiones
await sleep(1500);
await probe("F2", "GET", `/api/v1/master/drivers/${ID.toUpperCase()}`);  // mayusculas
await sleep(1500);

// === H8: Sin auth header ===
console.log("\n=== H8: Sin token de auth (para ver si pasa por NGINX o no) ===");
const noAuthRes = await fetch(`${API}/api/v1/master/drivers/${ID}`);
console.log(`  status: ${noAuthRes.status}, body: ${JSON.stringify((await noAuthRes.text()).slice(0,200))}`);

await sleep(1500);

// === H9: Con auth pero invalido ===
const badAuthRes = await fetch(`${API}/api/v1/master/drivers/${ID}`, { headers: { Authorization: "Bearer invalid-token-xxx" } });
console.log(`\n[Auth invalida] status: ${badAuthRes.status}, body: ${JSON.stringify((await badAuthRes.text()).slice(0,200))}`);

await sleep(1500);

// === H10: Ver headers del backend cuando responde OK ===
console.log("\n\n=== ANALISIS DE FIRMAS ===");
console.log(`Endpoint OK (lista):     status=${t4.status} server="${t4.server}" ct="${t4.ct}"`);
console.log(`/:id con UUID real:      status=${t1.status} server="${t1.server}" ct="${t1.ct}" bytes=${t1.body.length} body=${JSON.stringify(t1.body)}`);
console.log(`/:id con UUID inventado: status=${t2.status} server="${t2.server}" ct="${t2.ct}" bytes=${t2.body.length} body=${JSON.stringify(t2.body)}`);
console.log(`Path random root:        status=${t3.status} server="${t3.server}" ct="${t3.ct}" bytes=${t3.body.length} body=${JSON.stringify(t3.body)}`);

console.log(`\n[CLEANUP] Driver ${ID} queda en BD (no se puede borrar mientras DELETE /:id falle)`);
