// Verifica contra produccion los endpoints que el frontend de Vehicles usa
const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = {Authorization:`Bearer ${tok}`,"Content-Type":"application/json"};

// Conseguir vehicle real
const list = await fetch(`${API}/api/v1/master/vehicles?pageSize=1`, {headers:H});
const v = (await list.json()).items?.[0];
const ID = v?.id;
const PLATE = v?.plate ?? "ABC-100";
console.log(`Vehicle real: id=${ID}, plate=${PLATE}\n`);
await sleep(1500);

async function probe(label, method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  const isNF9 = txt === "Not Found" && txt.length === 9;
  console.log(`[${label}]`.padEnd(25), method.padEnd(6), path.padEnd(60), `→ ${res.status}`, isNF9 ? "(404 backend)" : `(${txt.length}b)`);
  if (!isNF9 && txt.length < 200) console.log("    body:", JSON.stringify(txt.slice(0,200)));
  await sleep(1500);
  return { status: res.status, body: txt };
}

console.log("\n═══ Vehicles — endpoints inventados que el frontend usa ═══\n");
await probe("Excel:status",       "PATCH", `/api/v1/master/vehicles/${ID}/status`, {status:"active"});
await probe("Excel:status block", "PATCH", `/api/v1/master/vehicles/${ID}/status`, {status:"blocked", reason:"test"});
await probe("inv:enable",         "POST",  `/api/v1/master/vehicles/${ID}/enable`);
await probe("inv:block",          "POST",  `/api/v1/master/vehicles/${ID}/block`, {reason:"test"});
await probe("inv:checklist",      "GET",   `/api/v1/master/vehicles/${ID}/checklist`);
await probe("inv:by-plate",       "GET",   `/api/v1/master/vehicles/by-plate/${PLATE}`);
await probe("inv:assign-driver",  "POST",  `/api/v1/master/vehicles/${ID}/assign-driver`, {driverId:"test"});
await probe("inv:unassign-driver","POST",  `/api/v1/master/vehicles/${ID}/unassign-driver`);
await probe("Excel:breakdowns",   "POST",  `/api/v1/master/vehicles/${ID}/breakdowns`, {description:"test"});
await probe("Excel:expiring-doc", "GET",   `/api/v1/master/vehicles/expiring-documents?days=30`);
await probe("Excel:needs-maint",  "GET",   `/api/v1/master/vehicles/needing-maintenance`);

console.log("\nLISTO\n");
