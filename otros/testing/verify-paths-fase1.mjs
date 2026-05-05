// Verifica contra produccion los paths candidatos antes de cambiarlos en el frontend
const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = {Authorization:`Bearer ${tok}`,"Content-Type":"application/json"};

async function probe(label, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  const isNotFound9 = txt === "Not Found" && txt.length === 9;
  console.log(`[${label}]`.padEnd(20), method.padEnd(6), path.padEnd(60), `→ ${res.status}`, isNotFound9 ? "(404 backend)" : `(${txt.length}b)`);
  if (!isNotFound9 && txt.length < 200) console.log("    body:", JSON.stringify(txt.slice(0,150)));
  await sleep(1500);
  return { status: res.status, body: txt };
}

console.log("\n═══ FASE 1.2 — Reports generate vs generated ═══\n");
await probe("Excel:generate", "POST", "/api/v1/reports/generate", {templateId:"test",parameters:{},format:"pdf"});
await probe("Frontend:generated", "POST", "/api/v1/reports/generated", {templateId:"test",parameters:{},format:"pdf"});

console.log("\n═══ FASE 1.3 — Orders export ═══\n");
await probe("GET /export", "GET", "/api/v1/orders/export");
await probe("POST /export/prepare", "POST", "/api/v1/orders/export/prepare", {filters:{}});
await probe("POST /export/excel", "POST", "/api/v1/orders/export/excel", {filters:{}});

console.log("\n═══ FASE 1.4 — Customers export ═══\n");
await probe("Excel:export/csv", "GET", "/api/v1/master/customers/export/csv");
await probe("alt:export", "GET", "/api/v1/master/customers/export");

console.log("\n═══ FASE 1.5 — Monitoring milestones ═══\n");
await probe("frontend:milestones", "GET", "/api/v1/orders/00000000-0000-0000-0000-000000000001/milestones");
await probe("frontend:workflow-progress", "GET", "/api/v1/orders/00000000-0000-0000-0000-000000000001/workflow-progress");

console.log("\nLISTO — usar resultados para decidir qué path usar en el frontend\n");
