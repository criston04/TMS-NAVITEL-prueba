#!/usr/bin/env node
/**
 * Verifica si master/operators (carriers) soporta webhook_url o similar.
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;
const C = { reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", bold: "\x1b[1m", dim: "\x1b[2m" };

let TOKEN = null;
async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, ok: res.ok, body: data };
}
const unwrap = (d) => d?.data ?? d?.items ?? d;

async function main() {
  TOKEN = unwrap((await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" })).body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login\n`);

  // 1. Listar operators existentes y ver TODOS sus campos
  console.log(`${C.bold}1. Modelo Operator (todos los campos del response):${C.reset}`);
  const list = await http("GET", `${API_URL}/master/operators?pageSize=2`);
  const ops = unwrap(list.body);
  if (ops?.[0]) {
    Object.keys(ops[0]).sort().forEach(k => {
      const isInteresting = /webhook|url|callback|endpoint|api|token|integration|notification/i.test(k);
      const c = isInteresting ? C.green : C.dim;
      console.log(`   ${c}${k.padEnd(28)}${C.reset}: ${JSON.stringify(ops[0][k])?.slice(0, 70)}`);
    });
  }

  // 2a. Primero crear con payload MINIMO basado en los campos reales del response
  console.log(`\n${C.bold}2a. Crear operator de prueba SIN webhook (baseline):${C.reset}`);
  const docNum = `20${Date.now().toString().slice(-9)}`;
  const basePayload = {
    code: `OP-T-${Date.now().toString().slice(-5)}`,
    name: "Test Carrier Base",
    document_type: "RUC",
    document_number: docNum,
    type: "carrier",
    email: `t${Date.now()}@test.com`,
    phone: "+51 999 999 999",
    address: "Av Test 123",
    city: "Lima",
    country: "PE",
    fiscal_address: "Av Test 123",
    status: "active",
  };
  const baseCreate = await http("POST", `${API_URL}/master/operators`, basePayload);
  console.log(`   Status: ${baseCreate.status}`);
  if (!baseCreate.ok) {
    console.log(`   ${C.red}Body: ${JSON.stringify(baseCreate.body)?.slice(0, 300)}${C.reset}`);
    return;
  }
  const baseOp = unwrap(baseCreate.body);
  console.log(`   ${C.green}✓${C.reset} Creado baseline: ${baseOp.id?.slice(0, 8)}`);

  // 2b. Ahora intentar AGREGAR webhook_url via PUT
  console.log(`\n${C.bold}2b. PUT con webhook_url para ver si lo persiste:${C.reset}`);
  const put = await http("PUT", `${API_URL}/master/operators/${baseOp.id}`, {
    ...baseOp,
    webhook_url: "https://example.com/orders/webhook",
    webhook_token: "secret-xyz",
  });
  console.log(`   Status: ${put.status}`);
  const fetched = unwrap((await http("GET", `${API_URL}/master/operators/${baseOp.id}`)).body);
  console.log(`\n   ${C.bold}Campos webhook en response:${C.reset}`);
  const wHKeys = Object.keys(fetched).filter(k => /webhook|url|callback|endpoint|token|integration/i.test(k));
  if (wHKeys.length === 0) {
    console.log(`     ${C.yellow}- Backend NO devuelve ningun campo webhook (no soporta o lo ignora)${C.reset}`);
  } else {
    wHKeys.forEach(k => {
      const val = fetched[k];
      const persistido = val !== null && val !== undefined && val !== "";
      console.log(`     ${persistido ? C.green + "✓" : C.red + "✗"} ${k}: ${JSON.stringify(val)}${C.reset}`);
    });
  }

  // Limpiar
  await http("DELETE", `${API_URL}/master/operators/${baseOp.id}`);

  // 3. Conclusion
  console.log(`\n${C.bold}${C.cyan}═══════════════ CONCLUSION ═══════════════${C.reset}`);
  console.log(`Si arriba aparecen webhook_url/callback persistidos: SI hay soporte.`);
  console.log(`Si todos los campos webhook salen null: el backend NO tiene esa columna y hay que pedirlo.`);
}

main().catch(e => { console.error(e); process.exit(1); });
