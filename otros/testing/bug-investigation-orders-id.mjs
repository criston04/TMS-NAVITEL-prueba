#!/usr/bin/env node
/**
 * INVESTIGACIÓN TÉCNICA — Bug routing :id en Orders
 *
 * Objetivo: entender exactamente qué hace el backend cuando recibe
 * /orders/:id, comparando contra rutas que SÍ funcionan, para que
 * el equipo backend pueda diagnosticar el bug.
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

let TOKEN = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function http(method, url, { body, token = TOKEN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

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

    // Capturar headers relevantes
    const headersOut = {};
    for (const [k, v] of res.headers.entries()) {
      if (["server", "x-powered-by", "content-type", "content-length",
           "x-request-id", "x-route-matched"].includes(k.toLowerCase())) {
        headersOut[k] = v;
      }
    }

    return {
      status: res.status,
      latencyMs: Date.now() - t0,
      headers: headersOut,
      data,
      raw,
    };
  } catch (err) {
    return { status: 0, latencyMs: Date.now() - t0, error: err.message };
  }
}

function dump(label, r) {
  console.log("");
  console.log("─".repeat(80));
  console.log(`TEST: ${label}`);
  console.log("─".repeat(80));
  console.log(`  Status:   ${r.status}`);
  console.log(`  Latency:  ${r.latencyMs}ms`);
  console.log(`  Headers:  ${JSON.stringify(r.headers, null, 2).split("\n").join("\n            ")}`);
  console.log(`  Body:     ${typeof r.data === "string" ? `"${r.data}"` : JSON.stringify(r.data).slice(0, 300)}`);
}

// ═══════════════════════════════════════════════════════════════════
async function main() {
  console.log("INVESTIGACIÓN TÉCNICA — Bug routing :id en /orders");
  console.log("════════════════════════════════════════════════════════════════════");

  // 1. Login
  const login = await http("POST", `${API_BASE}/auth/login`, {
    body: { username: "admin", password: "Admin1432!" },
    token: null,
  });
  TOKEN = login.data?.data?.accessToken;
  console.log(`Login: ${login.status === 200 ? "OK" : "FAIL"}`);
  if (!TOKEN) { console.error("Sin token, abortando"); process.exit(1); }

  // 2. Crear una orden para tener un UUID real
  await sleep(2000);
  const customers = await http("GET", `${API_URL}/master/customers?pageSize=1`);
  const customerId = customers.data?.items?.[0]?.id;

  await sleep(2000);
  const created = await http("POST", `${API_URL}/orders`, {
    body: {
      type: "delivery",
      priority: "high",
      customer_id: customerId,
      origin_address: "Test origin",
      origin_lat: -12.046,
      origin_lng: -77.042,
      destination_address: "Test dest",
      destination_lat: -12.054,
      destination_lng: -77.123,
      scheduled_pickup_at: new Date(Date.now() + 86400000).toISOString(),
      scheduled_delivery_at: new Date(Date.now() + 86400000 + 21600000).toISOString(),
    },
  });

  if (created.status !== 201) {
    console.error("No se pudo crear orden de prueba");
    process.exit(1);
  }

  const orderId = created.data?.data?.id;
  const orderNumber = created.data?.data?.order_number;
  console.log(`\nOrden de prueba creada:`);
  console.log(`  id:           ${orderId}`);
  console.log(`  order_number: ${orderNumber}`);

  // 3. Probar TODAS las variantes para entender el patrón
  console.log("\n\n═══ BATERÍA DE TESTS ═══");

  // Test A: GET en lista (SÍ funciona) — referencia
  await sleep(2000);
  let r = await http("GET", `${API_URL}/orders?pageSize=5`);
  dump("A) GET /api/v1/orders?pageSize=5  (lista — referencia OK)", r);

  // Test B: GET por ID (FALLA)
  await sleep(2000);
  r = await http("GET", `${API_URL}/orders/${orderId}`);
  dump(`B) GET /api/v1/orders/${orderId}  (UUID válido recién creado)`, r);

  // Test C: GET por ID con UUID que NO existe
  await sleep(2000);
  r = await http("GET", `${API_URL}/orders/00000000-0000-0000-0000-000000000000`);
  dump(`C) GET /api/v1/orders/00000000-0000-0000-0000-000000000000  (UUID inexistente, formato válido)`, r);

  // Test D: GET por ID con string aleatorio
  await sleep(2000);
  r = await http("GET", `${API_URL}/orders/not-a-uuid`);
  dump(`D) GET /api/v1/orders/not-a-uuid  (string sin formato UUID)`, r);

  // Test E: GET por order_number (debería funcionar según Rev2/Rev3)
  await sleep(2000);
  r = await http("GET", `${API_URL}/operations/orders/by-number/${orderNumber}`);
  dump(`E) GET /api/v1/operations/orders/by-number/${orderNumber}  (CON path param NO UUID)`, r);

  // Test F: GET status-counts (sin path param dinámico)
  await sleep(2000);
  r = await http("GET", `${API_URL}/operations/orders/status-counts`);
  dump("F) GET /api/v1/operations/orders/status-counts  (sin :id)", r);

  // Test G: GET con trailing slash
  await sleep(2000);
  r = await http("GET", `${API_URL}/orders/${orderId}/`);
  dump(`G) GET /api/v1/orders/${orderId}/  (CON trailing slash)`, r);

  // Test H: GET con UUID en otro endpoint que SÍ tiene path param UUID en otro módulo (customers)
  await sleep(2000);
  r = await http("GET", `${API_URL}/master/customers/${customerId}`);
  dump(`H) GET /api/v1/master/customers/${customerId}  (UUID en otro módulo — comparativo)`, r);

  // Test I: HEAD method para ver si responde con allowed methods
  await sleep(2000);
  r = await http("HEAD", `${API_URL}/orders/${orderId}`);
  dump(`I) HEAD /api/v1/orders/${orderId}  (HEAD para ver allowed methods)`, r);

  // Test J: OPTIONS preflight
  await sleep(2000);
  r = await http("OPTIONS", `${API_URL}/orders/${orderId}`);
  dump(`J) OPTIONS /api/v1/orders/${orderId}  (CORS preflight)`, r);

  // Test K: PATCH con body para ver si responde diferente
  await sleep(2000);
  r = await http("PATCH", `${API_URL}/orders/${orderId}`, { body: { priority: "urgent" } });
  dump(`K) PATCH /api/v1/orders/${orderId}  (body simple)`, r);

  // Test L: GET con UUID con uppercase
  await sleep(2000);
  r = await http("GET", `${API_URL}/orders/${orderId.toUpperCase()}`);
  dump(`L) GET /api/v1/orders/${orderId.toUpperCase()}  (UUID en MAYÚSCULAS)`, r);

  console.log("\n\n═══ ANÁLISIS ═══");
  console.log(`
HIPÓTESIS A VERIFICAR EN BACKEND:

1. ¿El handler GET /orders/:id está REGISTRADO en el router?
   Revisar archivo del router de Orders. Posibles causas:
   - El handler no está montado
   - El path está mal escrito (ej. /order/:id en vez de /orders/:id)
   - Está bajo otro namespace (/api/v1/operations/orders/:id?)

2. ¿Hay un middleware que filtra antes de llegar al handler?
   - RLS (Row Level Security) que rechaza por tenant_id
   - Auth middleware que rechaza el token (pero login funciona)
   - Validación UUID que rechaza el formato

3. ¿El controller existe pero falla en el query SQL?
   - El SELECT podría tener WHERE tenant_id = ? con tenant_id incorrecto
   - El SELECT podría usar otro campo que no es id (ej. order_id)
   - Soft-delete: WHERE deleted_at IS NULL pero la orden tiene timestamp

4. ¿Otros módulos tienen el mismo bug?
   Test H probará si /master/customers/:id sufre el mismo problema.
   Si SÍ → bug global de routing
   Si NO → bug específico del módulo /orders

5. ¿Express/Fastify confunde rutas?
   Si /orders/stats está antes de /orders/:id en el router,
   stats matchea correctamente. Pero si /orders/:id no responde,
   significa que NO hay handler registrado para esa ruta.
  `);

  console.log("\n═══ FIN ═══");
}

main().catch(err => { console.error(err); process.exit(1); });
