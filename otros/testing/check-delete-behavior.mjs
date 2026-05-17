#!/usr/bin/env node
/**
 * Verifica si DELETE /orders/:id hace HARD-delete o SOFT-delete,
 * y si GET /orders devuelve las soft-deleted.
 */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

let TOKEN = null;
async function http(method, url, body = null) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: res.status, ok: res.ok, body: data };
}

async function main() {
  // 1. Login
  const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = (login.body?.data ?? login.body)?.accessToken;
  console.log(`Login: ${login.status}`);

  // 2. Buscar una orden en draft
  const cust = await http("GET", `${API_URL}/master/customers?pageSize=5`);
  const customerId = (cust.body?.data ?? cust.body)?.[0]?.id;

  // 3. Crear una orden de test (en draft)
  const orderNum = `TEST-DEL-${Date.now()}`;
  const create = await http("POST", `${API_URL}/orders`, {
    order_number: orderNum,
    customer_id: customerId,
    type: "delivery",
    priority: "low",
    origin_address: "Test origen DEL",
    destination_address: "Test destino DEL",
  });
  const created = create.body?.data ?? create.body;
  console.log(`\n[1] Crear orden: status=${create.status}, id=${created?.id?.slice(0,8)}, status_orden=${created?.status}, deleted_at=${created?.deleted_at}`);

  if (!created?.id) {
    console.log("No se pudo crear orden de test, abortando.");
    return;
  }
  const id = created.id;

  // 4. Listar y verificar que aparece
  const list1 = await http("GET", `${API_URL}/orders?pageSize=200`);
  const items1 = list1.body?.data ?? list1.body?.items ?? [];
  const totalArr = Array.isArray(items1) ? items1 : (items1.items ?? items1.orders ?? []);
  const found1 = totalArr.find(o => o.id === id);
  console.log(`[2] GET /orders ANTES del delete: total=${totalArr.length}, encuentra orden de test? ${!!found1}, deleted_at=${found1?.deleted_at}`);

  // 5. DELETE
  const del = await http("DELETE", `${API_URL}/orders/${id}`);
  console.log(`[3] DELETE /orders/:id: status=${del.status}, body=${JSON.stringify(del.body)?.slice(0,200)}`);

  // 6. GET por id directo (a ver si responde 404 o trae la orden con deleted_at)
  const getOne = await http("GET", `${API_URL}/orders/${id}`);
  const one = getOne.body?.data ?? getOne.body;
  console.log(`[4] GET /orders/:id DESPUES del delete: status=${getOne.status}, deleted_at=${one?.deleted_at}`);

  // 7. Listar y ver si aparece
  const list2 = await http("GET", `${API_URL}/orders?pageSize=200`);
  const items2 = list2.body?.data ?? list2.body?.items ?? [];
  const totalArr2 = Array.isArray(items2) ? items2 : (items2.items ?? items2.orders ?? []);
  const found2 = totalArr2.find(o => o.id === id);
  console.log(`[5] GET /orders DESPUES del delete: total=${totalArr2.length}, sigue apareciendo? ${!!found2}, deleted_at=${found2?.deleted_at}`);

  // VEREDICTO
  console.log(`\n══ VEREDICTO ══`);
  if (!found2) {
    console.log("✓ HARD-DELETE: la orden ya NO aparece en GET /orders.");
  } else if (found2.deleted_at) {
    console.log("⚠ SOFT-DELETE: la orden tiene deleted_at='${found2.deleted_at}' pero AUN aparece en GET /orders.");
    console.log("  El backend NO filtra deleted_at en la query. El front debe filtrarla del lado cliente.");
  } else {
    console.log("✗ DELETE NO TUVO EFECTO: la orden sigue ahi sin deleted_at. El handler del backend posiblemente esta roto.");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
