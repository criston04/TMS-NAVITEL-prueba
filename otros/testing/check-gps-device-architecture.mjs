#!/usr/bin/env node
/**
 * Investiga la arquitectura GPS en el backend:
 *  - Existe tabla/endpoint /master/gps-devices?
 *  - Como se asocia un imei a un vehiculo?
 *  - Que campos acepta el modelo Vehicle del backend?
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
  console.log(`${C.bold}${C.cyan}INVESTIGACION: arquitectura GPS en el backend${C.reset}\n`);

  TOKEN = unwrap((await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" })).body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login OK\n`);

  // 1. Ver TODOS los campos de un vehiculo existente
  console.log(`${C.bold}1. Todos los campos del modelo Vehicle (response del backend):${C.reset}`);
  const list = await http("GET", `${API_URL}/master/vehicles?pageSize=1`);
  const v = unwrap(list.body)[0];
  if (v) {
    Object.keys(v).sort().forEach(k => {
      const val = v[k];
      const isGpsRelated = /imei|sim|gps|device|tracker|navitel|operator/i.test(k);
      const color = isGpsRelated ? C.green : C.dim;
      console.log(`   ${color}${k.padEnd(28)}${C.reset}: ${JSON.stringify(val)?.slice(0, 60)}`);
    });
  }

  // 2. Probar endpoints potenciales para GPS devices
  console.log(`\n${C.bold}2. Probar endpoints potenciales para gestionar GPS devices:${C.reset}`);
  const endpoints = [
    "/master/gps-devices",
    "/master/devices",
    "/master/gps",
    "/gps-devices",
    "/devices",
    "/master/vehicles/imei",
    `/master/vehicles/${v.id}/gps-device`,
    `/master/vehicles/${v.id}/device`,
    "/master/operators/gps-devices",
  ];
  for (const ep of endpoints) {
    const r = await http("GET", `${API_URL}${ep}`);
    const status = r.status;
    const icon = status === 200 ? `${C.green}✓` : status === 404 ? `${C.dim}✗` : `${C.yellow}?`;
    console.log(`   ${icon} GET ${ep.padEnd(40)} → ${status}${C.reset}`);
    if (status === 200) {
      console.log(`     ${C.dim}${JSON.stringify(r.body).slice(0, 200)}${C.reset}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // 3. Crear vehiculo con placa formato valido y probar diferentes nombres de campo IMEI
  console.log(`\n${C.bold}3. Crear vehiculo con formato placa valido y probar campos GPS:${C.reset}`);
  const plate = `ABC-${Math.floor(100 + Math.random() * 900)}`;
  const createPayload = {
    plate,
    vehicle_type: "truck",
    brand: "Test",
    model: "X",
    year: 2024,
    status: "active",
    // Probar varios nombres
    imei: "865000000000001",
    vehicle_imei: "865000000000001",  // tal vez con prefijo
    sim_number: "+51999000001",
    gps_device_id: null,
    gps_provider: "navitel",
  };
  console.log(`   ${C.dim}Payload:${C.reset} plate=${plate} + 5 campos GPS distintos`);
  const create = await http("POST", `${API_URL}/master/vehicles`, createPayload);
  console.log(`   Status: ${create.ok ? C.green : C.red}${create.status}${C.reset}`);
  if (create.ok) {
    const created = unwrap(create.body);
    const id = created.id;
    console.log(`   ${C.green}✓${C.reset} Vehiculo creado: ${id.slice(0,8)}`);

    // Re-leer el vehiculo y ver que se persistio
    const get = await http("GET", `${API_URL}/master/vehicles/${id}`);
    const fetched = unwrap(get.body);
    console.log(`\n   ${C.bold}Campos relacionados a GPS en el response:${C.reset}`);
    const gpsKeys = Object.keys(fetched).filter(k => /imei|sim|gps|device|tracker/i.test(k));
    if (gpsKeys.length === 0) {
      console.log(`     ${C.yellow}- Ningun campo GPS en la response${C.reset}`);
    } else {
      gpsKeys.forEach(k => {
        const val = fetched[k];
        const present = val !== null && val !== undefined && val !== "";
        const icon = present ? `${C.green}✓` : `${C.dim}✗`;
        console.log(`     ${icon} ${k.padEnd(20)}: ${JSON.stringify(val)}${C.reset}`);
      });
    }

    // Limpiar
    await http("DELETE", `${API_URL}/master/vehicles/${id}`);
  } else {
    console.log(`   ${C.red}Body: ${JSON.stringify(create.body)}${C.reset}`);
  }

  // 4. Conclusion
  console.log(`\n${C.bold}${C.cyan}${"═".repeat(60)}${C.reset}`);
  console.log(`${C.bold}CONCLUSION:${C.reset}`);
  console.log(`  El modelo Vehicle del backend tiene 'gps_device_id' (FK).`);
  console.log(`  No tiene 'imei' como columna directa en vehicles.`);
  console.log(`  Esto sugiere que el GPS device vive en otra tabla/recurso.`);
  console.log(`  Si no encontramos el endpoint /master/gps-devices,`);
  console.log(`  hay 2 opciones:`);
  console.log(`    A) Pedir al backend que exponga GET/POST /master/gps-devices`);
  console.log(`    B) El backend acepta crear el device inline al crear vehicle`);
  console.log(`       (algunos APIs lo hacen via objeto anidado)`);
}

main().catch(e => { console.error(e); process.exit(1); });
