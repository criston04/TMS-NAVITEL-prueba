#!/usr/bin/env node
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

  console.log(`${C.bold}${C.cyan}TEST DEFINITIVO: POST + PUT con campo imei/gps_device_id${C.reset}\n`);

  // ════ 1. POST con imei en el body ════
  console.log(`${C.bold}═══ POST /master/vehicles con imei + gps_device_id en body ═══${C.reset}`);
  const plate1 = `ABC-${Math.floor(100 + Math.random() * 900)}`;
  const post = await http("POST", `${API_URL}/master/vehicles`, {
    plate: plate1,
    vehicle_type: "truck",
    brand: "Test", model: "X", year: 2024, status: "active",
    imei: "865555555555555",                 // ← test 1
    gps_device_id: "10000000-0000-0000-0000-000000000001",  // ← test 2
    sim_number: "+51999000001",              // ← test 3
  });
  console.log(`Status: ${post.status}`);
  if (post.ok) {
    const created = unwrap(post.body);
    const id = created.id;
    console.log(`${C.green}✓${C.reset} Creado ${id.slice(0,8)}`);
    console.log(`  imei en response inmediata: ${JSON.stringify(created.imei)}`);
    console.log(`  gps_device_id: ${JSON.stringify(created.gps_device_id)}`);
    console.log(`  gpsDevices: ${JSON.stringify(created.gpsDevices)}`);

    // GET para confirmar
    const fetched = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
    console.log(`\n  Tras GET fresh:`);
    console.log(`  imei: ${JSON.stringify(fetched.imei)}`);
    console.log(`  gps_device_id: ${JSON.stringify(fetched.gps_device_id)}`);

    // ════ 2. PUT del mismo vehiculo con imei ════
    console.log(`\n${C.bold}═══ PUT /master/vehicles/:id con imei + gps_device_id ═══${C.reset}`);
    const put = await http("PUT", `${API_URL}/master/vehicles/${id}`, {
      ...fetched,
      imei: "865777777777777",
      gps_device_id: "20000000-0000-0000-0000-000000000002",
    });
    console.log(`Status: ${put.status}`);
    if (put.ok) {
      const after = unwrap((await http("GET", `${API_URL}/master/vehicles/${id}`)).body);
      console.log(`  imei tras PUT: ${JSON.stringify(after.imei)}`);
      console.log(`  gps_device_id tras PUT: ${JSON.stringify(after.gps_device_id)}`);

      const imeiPersisted = !!after.imei;
      const fkPersisted = !!after.gps_device_id;

      console.log(`\n${C.bold}${C.cyan}═══════════════════ RESULTADO ═══════════════════${C.reset}`);
      if (imeiPersisted) {
        console.log(`${C.green}✓ El backend persiste 'imei' directo via PUT${C.reset}`);
        console.log(`  → Solo agregar campo 'imei' al form de Vehicles del frontend`);
      } else if (fkPersisted) {
        console.log(`${C.yellow}⚠ El backend persiste 'gps_device_id' (FK) pero ignora 'imei'${C.reset}`);
        console.log(`  → Necesitamos endpoint /master/gps-devices para crear devices`);
        console.log(`  → Mientras tanto, el form del front no puede asignar GPS`);
      } else {
        console.log(`${C.red}✗ El backend ignora ambos campos${C.reset}`);
        console.log(`  → Bloqueado, hay que pedirle al backend implementar el modulo GPS`);
      }
    } else {
      console.log(`${C.red}PUT fallo: ${JSON.stringify(put.body)}${C.reset}`);
    }

    // Limpiar
    await http("DELETE", `${API_URL}/master/vehicles/${id}`);
  } else {
    console.log(`${C.red}POST fallo: ${JSON.stringify(post.body)}${C.reset}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
