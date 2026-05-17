#!/usr/bin/env node
/**
 * Prueba definitiva: el backend persiste 'imei' o 'gps_device_id' al PATCH?
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

  // Crear vehiculo limpio
  const plate = `ABC-${Math.floor(100 + Math.random() * 900)}`;
  const create = await http("POST", `${API_URL}/master/vehicles`, {
    plate, vehicle_type: "truck", brand: "T", model: "X", year: 2024, status: "active",
  });
  const id = unwrap(create.body).id;
  console.log(`${C.green}✓${C.reset} Vehiculo de prueba creado: ${id.slice(0,8)} ${plate}\n`);

  // Listar campos antes del patch
  const before = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
  console.log(`${C.bold}ANTES del PATCH (todos los campos):${C.reset}`);
  Object.keys(before).sort().forEach(k => {
    console.log(`  ${k.padEnd(28)}: ${JSON.stringify(before[k])?.slice(0, 60)}`);
  });

  // PATCH con todos los nombres posibles
  console.log(`\n${C.bold}═════ TEST 1: PATCH con campo 'imei' ═════${C.reset}`);
  const patch1 = await http("PATCH", `${API_URL}/master/vehicles/${id}`, {
    imei: "865012345678901",
  });
  console.log(`Status: ${patch1.status}`);
  const after1 = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
  console.log(`Campo 'imei' persistio?: ${after1.imei ? C.green + after1.imei : C.red + "NO (null/undefined)"}${C.reset}`);
  console.log(`Campo 'gps_device_id': ${JSON.stringify(after1.gps_device_id)}`);

  await new Promise(r => setTimeout(r, 500));

  // PATCH con gps_device_id (un UUID dummy)
  console.log(`\n${C.bold}═════ TEST 2: PATCH con campo 'gps_device_id' ═════${C.reset}`);
  const dummyDeviceId = "00000000-0000-0000-0000-000000000099";
  const patch2 = await http("PATCH", `${API_URL}/master/vehicles/${id}`, {
    gps_device_id: dummyDeviceId,
  });
  console.log(`Status: ${patch2.status}`);
  const after2 = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
  console.log(`Campo 'gps_device_id' persistio?: ${after2.gps_device_id ? C.green + after2.gps_device_id : C.red + "NO"}${C.reset}`);
  if (patch2.status >= 400) {
    console.log(`Body: ${JSON.stringify(patch2.body).slice(0, 200)}`);
  }

  await new Promise(r => setTimeout(r, 500));

  // PATCH con sub-objeto gpsDevice (algunos APIs lo aceptan)
  console.log(`\n${C.bold}═════ TEST 3: PATCH con sub-objeto 'gpsDevice' (nested) ═════${C.reset}`);
  const patch3 = await http("PATCH", `${API_URL}/master/vehicles/${id}`, {
    gpsDevice: { imei: "865012345678999", sim_number: "+51999000999", provider: "navitel" },
  });
  console.log(`Status: ${patch3.status}`);
  const after3 = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
  const found3 = after3.imei || after3.gps_device_id || (Array.isArray(after3.gpsDevices) && after3.gpsDevices.length > 0);
  console.log(`Algun campo GPS persistio?: ${found3 ? C.green + "SI" : C.red + "NO"}${C.reset}`);
  console.log(`  imei: ${JSON.stringify(after3.imei)}`);
  console.log(`  gps_device_id: ${JSON.stringify(after3.gps_device_id)}`);
  console.log(`  gpsDevices: ${JSON.stringify(after3.gpsDevices)}`);

  // Limpiar
  await http("DELETE", `${API_URL}/master/vehicles/${id}`);

  console.log(`\n${C.bold}${C.cyan}═══════════════════ VEREDICTO ═══════════════════${C.reset}`);
  if (after1.imei || after2.gps_device_id || after3.imei) {
    console.log(`${C.green}✓ El backend SI acepta y persiste algun campo GPS al PATCH${C.reset}`);
  } else {
    console.log(`${C.yellow}⚠ El backend NO persiste imei ni gps_device_id en PATCH /master/vehicles/:id${C.reset}`);
    console.log(`  Hay que pedirle al equipo backend:`);
    console.log(`    a) Agregar imei como columna directa o`);
    console.log(`    b) Exponer endpoint POST /master/gps-devices y referenciarlo via FK`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
