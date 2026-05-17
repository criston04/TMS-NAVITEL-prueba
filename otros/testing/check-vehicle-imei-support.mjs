#!/usr/bin/env node
/**
 * Verifica si el backend acepta el campo `imei` (y otros datos GPS) al
 * crear/actualizar un vehiculo, y si los persiste correctamente.
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
  console.log(`${C.bold}${C.cyan}VERIFICACION: el backend soporta IMEI en vehiculos?${C.reset}\n`);

  const login = await http("POST", `${API_BASE}/auth/login`, { username: "admin", password: "Admin1432!" });
  TOKEN = unwrap(login.body)?.accessToken;
  console.log(`${C.green}✓${C.reset} Login OK\n`);

  // 1. Listar vehiculos existentes y ver si alguno trae imei
  const list = await http("GET", `${API_URL}/master/vehicles?pageSize=20`);
  const vehicles = unwrap(list.body);
  console.log(`${C.bold}1. Vehiculos existentes en BD:${C.reset} ${vehicles.length}`);
  const withImei = vehicles.filter(v => v.imei || v.vehicle_imei);
  console.log(`   Vehiculos con campo imei poblado: ${withImei.length}`);
  if (vehicles.length > 0) {
    console.log(`   ${C.dim}Campos del primer vehiculo (busca imei, sim_number, gps_*):${C.reset}`);
    const v = vehicles[0];
    const gpsKeys = Object.keys(v).filter(k => /imei|sim|gps|device|tracker/i.test(k));
    if (gpsKeys.length > 0) {
      gpsKeys.forEach(k => console.log(`     ${C.green}${k}${C.reset}: ${JSON.stringify(v[k])}`));
    } else {
      console.log(`     ${C.yellow}- No hay campos relacionados a GPS en la response del backend${C.reset}`);
      console.log(`     ${C.dim}Keys disponibles: ${Object.keys(v).slice(0, 15).join(", ")}...${C.reset}`);
    }
  }

  // 2. Crear un vehiculo NUEVO con campo imei en el body
  console.log(`\n${C.bold}2. Crear vehiculo de prueba CON campo imei:${C.reset}`);
  const plate = `TST-${Date.now().toString().slice(-5)}`;
  const createPayload = {
    plate,
    vehicle_type: "truck",
    brand: "Test Brand",
    model: "Test Model",
    year: 2024,
    status: "active",
    imei: "865000000000001",          // ← campo que probamos
    sim_number: "+51999000001",       // ← otros campos GPS
    gps_provider: "navitel",
  };
  console.log(`   ${C.dim}Payload:${C.reset}`);
  console.log(`   ${JSON.stringify(createPayload, null, 4).split("\n").join("\n   ")}`);
  const create = await http("POST", `${API_URL}/master/vehicles`, createPayload);
  const created = unwrap(create.body);
  console.log(`   Status: ${create.ok ? C.green : C.red}${create.status}${C.reset}`);
  if (create.ok && created?.id) {
    console.log(`   ${C.green}✓${C.reset} Vehiculo creado: id=${created.id.slice(0,8)} plate=${created.plate}`);

    // 3. Verificar que los campos imei/sim_number/gps_provider se persistieron
    console.log(`\n${C.bold}3. Verificar campos persistidos (GET /master/vehicles/:id):${C.reset}`);
    const get = await http("GET", `${API_URL}/master/vehicles/${created.id}`);
    const fetched = unwrap(get.body);
    const checkField = (name) => {
      const value = fetched[name];
      const present = value !== null && value !== undefined && value !== "";
      console.log(`   ${present ? C.green + "✓" : C.red + "✗"} ${name.padEnd(15)}: ${present ? C.green : C.red}${JSON.stringify(value)}${C.reset}`);
      return present;
    };
    const imeiOk = checkField("imei");
    const simOk = checkField("sim_number");
    const providerOk = checkField("gps_provider");

    // 4. Limpiar
    await http("DELETE", `${API_URL}/master/vehicles/${created.id}`);

    // VEREDICTO
    console.log(`\n${C.bold}${C.cyan}${"═".repeat(60)}${C.reset}`);
    console.log(`${C.bold}VEREDICTO:${C.reset}`);
    if (imeiOk && simOk && providerOk) {
      console.log(`  ${C.green}✓ El backend soporta TODOS los campos GPS (imei, sim_number, gps_provider)${C.reset}`);
      console.log(`  Es seguro agregar estos campos al form del frontend.`);
    } else if (imeiOk) {
      console.log(`  ${C.yellow}⚠ Soporta imei pero no todos los campos GPS extra${C.reset}`);
      console.log(`  Recomendacion: agregar solo imei al form en esta iteracion.`);
    } else {
      console.log(`  ${C.red}✗ El backend NO persiste imei/sim_number/gps_provider${C.reset}`);
      console.log(`  Pedir al backend que agregue las columnas o usar /master/gps-devices si existe.`);
    }
  } else {
    console.log(`   ${C.red}Body: ${JSON.stringify(create.body).slice(0, 300)}${C.reset}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
