const API = "https://api-service.gruponavitel.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const r = await fetch(`${API}/auth/login`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:"admin",password:"Admin1432!"})});
const tok = (await r.json()).data.accessToken;
const H = {Authorization:`Bearer ${tok}`,"Content-Type":"application/json"};

const list = await fetch(`${API}/api/v1/master/customers?pageSize=1`, {headers:H});
const c = (await list.json()).items?.[0];
const ID = c?.id;
console.log(`Customer real: ${ID}\n`);
await sleep(1500);

async function probe(label, method, path) {
  const res = await fetch(`${API}${path}`, { method, headers: H });
  const txt = await res.text();
  const isNF9 = txt === "Not Found" && txt.length === 9;
  console.log(`[${label}]`.padEnd(28), method, path.padEnd(70), `→ ${res.status}`, isNF9 ? "(404 backend)" : `(${txt.length}b)`);
  if (!isNF9 && txt.length < 200) console.log("    body:", JSON.stringify(txt.slice(0,200)));
  await sleep(1500);
}

await probe("inv:operational-stats",   "GET", `/api/v1/master/customers/${ID}/operational-stats`);
await probe("inv:orders-by-customer",  "GET", `/api/v1/master/customers/${ID}/orders`);
await probe("inv:refresh-stats",       "POST",`/api/v1/master/customers/${ID}/refresh-stats`);
await probe("alt:orders?customerId",   "GET", `/api/v1/orders?customerId=${ID}`);
await probe("Excel:patch-status",      "PATCH",`/api/v1/master/customers/${ID}/status`);
await probe("Excel:toggle-status",     "POST",`/api/v1/master/customers/${ID}/toggle-status`);
