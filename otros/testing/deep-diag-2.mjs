// Investigacion 2: validar la hipotesis "no es NGINX, es el router del backend"
const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;

async function probe(label, headers, method, path) {
  const res = await fetch(`${API}${path}`, { method, headers });
  const txt = await res.text();
  console.log(`[${label}] ${method} ${path}`);
  console.log(`  status:${res.status} ct:"${res.headers.get("content-type")}" bytes:${txt.length}`);
  console.log(`  body: ${JSON.stringify(txt.slice(0,150))}`);
  return { status: res.status, ct: res.headers.get("content-type"), body: txt };
}

// === PRUEBA CRITICA ===
// Si NGINX bloquea: SIN auth tambien deberia dar 404 plain text (NGINX no se entera de auth)
// Si backend procesa: SIN auth deberia dar 401 JSON (middleware rechaza)

console.log("\n=== PRUEBA CRITICA: ¿NGINX o backend? ===\n");

// CASO 1: URL que sabemos que SI funciona, SIN auth
console.log("[1] Sin auth a endpoint que SI existe:");
await probe("1a", {}, "GET", "/api/v1/master/drivers");
await sleep(1500);

// CASO 2: URL :id que da 404 con auth, probamos SIN auth
console.log("\n[2] Sin auth a /api/v1/master/drivers/:id (la que falla con auth):");
await probe("2a", {}, "GET", "/api/v1/master/drivers/00000000-0000-0000-0000-000000000001");
await sleep(1500);

// CASO 3: URL totalmente inventada SIN auth (deberia dar 404 NGINX puro)
console.log("\n[3] Sin auth a path inventado totalmente (esperamos NGINX 404 default):");
await probe("3a", {}, "GET", "/random-path-xyz123");
await sleep(1500);

// CASO 4: URL con prefix incorrecto (sin /api/v1) sin auth
console.log("\n[4] Sin auth a /master/drivers (sin /api/v1 — fuera del routing del backend):");
await probe("4a", {}, "GET", "/master/drivers");
await sleep(1500);

// CASO 5: URL con prefix incorrecto sin auth
console.log("\n[5] Sin auth a /api/master/drivers (sin /v1):");
await probe("5a", {}, "GET", "/api/master/drivers");
await sleep(1500);

// CASO 6: con auth, endpoint que existe (lista)
console.log("\n[6] CON auth a endpoint OK:");
await probe("6a", { Authorization: `Bearer ${tok}` }, "GET", "/api/v1/master/drivers?pageSize=1");
await sleep(1500);

// CASO 7: con auth, /:id (deberia dar 404)
console.log("\n[7] CON auth a /:id (la que falla):");
await probe("7a", { Authorization: `Bearer ${tok}` }, "GET", "/api/v1/master/drivers/00000000-0000-0000-0000-000000000001");
await sleep(1500);

// CASO 8: con auth, paths totalmente inventados pero bajo /api/v1/
console.log("\n[8] CON auth a paths inventados bajo /api/v1/:");
await probe("8a", { Authorization: `Bearer ${tok}` }, "GET", "/api/v1/totalmente-inventado");
await sleep(1500);
await probe("8b", { Authorization: `Bearer ${tok}` }, "GET", "/api/v1/master/no-existe");
await sleep(1500);

// === ANALISIS ===
console.log("\n\n=== INTERPRETACION ===");
console.log("Si caso 2 (sin auth a /:id) da 401 JSON  → NGINX proxea, backend rechaza por auth → no es NGINX el problema");
console.log("Si caso 2 (sin auth a /:id) da 404 plain → NGINX rechaza antes → ES NGINX el problema");
console.log("Si caso 4 (sin auth a path no-prefijado) da 401 JSON → NGINX redirige todo");
console.log("Si caso 4 (sin auth a path no-prefijado) da 404 plain → NGINX solo proxea /api/v1/");
