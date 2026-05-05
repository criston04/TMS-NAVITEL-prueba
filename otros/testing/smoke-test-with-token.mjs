#!/usr/bin/env node
/**
 * Smoke test usando un token ya obtenido (evita rate limiting del login).
 *
 * USO:
 *   TOKEN="eyJ..." node scripts/smoke-test-with-token.mjs
 */

const API_URL = 'https://api-service.gruponavitel.com/api/v1';
const TOKEN = process.env.TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwidGVuYW50SWQiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJyb2xlIjoib3duZXIiLCJleHAiOjE3NzY0MjI4MDUsImlhdCI6MTc3NjQwMTIwNSwianRpIjoiQm9HTzREMmR3In0.YMyTAFUWa0WKQuhY0if4HL4fuQ5ODCqsdIbIzKOgAJs';

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const counters = {
  total: 0,
  ok: 0,
  auth: 0,
  notFound: 0,
  serverError: 0,
  other: 0,
};

const bugs = [];
const missing = [];
const working = [];

async function test(method, path, module) {
  counters.total++;
  const url = `${API_URL}${path}`;
  const start = performance.now();
  let status = 0;
  let body = '';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    status = res.status;
    body = (await res.text()).slice(0, 150);
  } catch (err) {
    status = 0;
    body = err.message;
  }

  const latency = Math.round(performance.now() - start);
  let color, label, category;

  if (status >= 200 && status < 300) {
    color = C.green; label = 'OK'; category = 'ok';
    working.push({ method, path, module, status, latency });
  } else if (status === 401 || status === 403) {
    color = C.yellow; label = 'AUTH'; category = 'auth';
  } else if (status === 404) {
    color = C.red; label = '404'; category = 'notFound';
    missing.push({ method, path, module, body });
  } else if (status >= 500) {
    color = C.red; label = `${status}`; category = 'serverError';
    bugs.push({ method, path, module, status, body });
  } else {
    color = C.cyan; label = `${status}`; category = 'other';
  }

  counters[category]++;

  console.log(`  ${method.padEnd(6)} ${path.padEnd(60)} ${color}${status.toString().padStart(3)} ${label.padEnd(5)}${C.reset} ${C.dim}${latency}ms${C.reset}`);
  return { status, body };
}

const ENDPOINTS = [
  // Dashboard
  ['Dashboard', 'GET', '/dashboard/stats'],
  ['Dashboard', 'GET', '/dashboard/vehicles/overview'],
  ['Dashboard', 'GET', '/dashboard/shipments'],
  ['Dashboard', 'GET', '/dashboard/vehicles/on-route'],

  // Master - Customers
  ['Master/Customers', 'GET', '/master/customers'],
  ['Master/Customers', 'GET', '/master/customers/stats'],
  ['Master/Customers', 'GET', '/master/customers/cities'],

  // Master - Drivers
  ['Master/Drivers', 'GET', '/master/drivers'],
  ['Master/Drivers', 'GET', '/master/drivers/stats'],
  ['Master/Drivers', 'GET', '/master/drivers/expiring-licenses'],

  // Master - Vehicles
  ['Master/Vehicles', 'GET', '/master/vehicles'],
  ['Master/Vehicles', 'GET', '/master/vehicles/stats'],
  ['Master/Vehicles', 'GET', '/master/vehicles/expiring-documents'],
  ['Master/Vehicles', 'GET', '/master/vehicles/needing-maintenance'],

  // Master - Products/Operators
  ['Master/Products', 'GET', '/master/products'],
  ['Master/Products', 'GET', '/master/products/stats'],
  ['Master/Operators', 'GET', '/master/operators'],
  ['Master/Operators', 'GET', '/master/operators/stats'],

  // Geofences (doble verificacion)
  ['Geofences/FE-path', 'GET', '/master/geofences'],
  ['Geofences/BE-path', 'GET', '/geofences'],
  ['Geofences/BE-alt', 'GET', '/geofences/stats'],

  // Orders — BE path
  ['Orders/BE-path', 'GET', '/orders'],
  ['Orders/BE-path', 'GET', '/orders/stats'],
  ['Orders/BE-path', 'GET', '/orders/status-counts'],
  // Orders — FE path
  ['Orders/FE-path', 'GET', '/operations/orders'],

  // Monitoring
  ['Monitoring', 'GET', '/monitoring/tracking'],
  ['Monitoring', 'GET', '/monitoring/stats'],
  ['Monitoring', 'GET', '/monitoring/alerts'],
  ['Monitoring', 'GET', '/monitoring/alert-rules'],
  ['Monitoring', 'GET', '/monitoring/retransmission'],
  ['Monitoring', 'GET', '/monitoring/retransmission/stats'],
  ['Monitoring', 'GET', '/monitoring/geofence-events'],
  ['Monitoring', 'GET', '/monitoring/geofence-events/stats'],
  ['Monitoring', 'GET', '/monitoring/multi-window/panels'],

  // Finance
  ['Finance', 'GET', '/finance/invoices'],
  ['Finance', 'GET', '/finance/payments'],
  ['Finance', 'GET', '/finance/costs'],
  ['Finance', 'GET', '/finance/rates'],
  ['Finance', 'GET', '/finance/stats'],
  ['Finance', 'GET', '/finance/aging'],
  ['Finance', 'GET', '/finance/profitability'],
  ['Finance', 'GET', '/finance/cash-flow'],

  // Scheduling
  ['Scheduling', 'GET', '/operations/scheduling/orders'],
  ['Scheduling', 'GET', '/operations/scheduling/calendar'],
  ['Scheduling', 'GET', '/operations/scheduling/conflicts'],
  ['Scheduling', 'GET', '/operations/scheduling/kpis'],
  ['Scheduling', 'GET', '/operations/scheduling/blocked-days'],
  ['Scheduling', 'GET', '/operations/scheduling/audit-logs'],

  // Route Planner
  ['Route Planner', 'GET', '/route-planner/routes'],
  ['Route Planner', 'GET', '/route-planner/depots'],
  ['Route Planner', 'GET', '/route-planner/vehicles'],
  ['Route Planner', 'GET', '/route-planner/drivers'],
  ['Route Planner', 'GET', '/route-planner/route-templates'],

  // Routing (FE)
  ['Routing/FE', 'GET', '/routing/calculate'],
  ['Routing/FE', 'GET', '/routing/geocode'],

  // Maintenance
  ['Maintenance', 'GET', '/maintenance/stats'],
  ['Maintenance', 'GET', '/maintenance/work-orders'],
  ['Maintenance', 'GET', '/maintenance/schedules'],
  ['Maintenance', 'GET', '/maintenance/breakdowns'],
  ['Maintenance', 'GET', '/maintenance/vehicles'],
  ['Maintenance', 'GET', '/maintenance/workshops'],
  ['Maintenance', 'GET', '/maintenance/parts'],
  ['Maintenance', 'GET', '/maintenance/inspections'],
  ['Maintenance', 'GET', '/maintenance/alerts'],
  ['Maintenance', 'GET', '/maintenance/metrics'],

  // Reports
  ['Reports', 'GET', '/reports/definitions'],
  ['Reports', 'GET', '/reports/templates'],
  ['Reports', 'GET', '/reports/generated'],
  ['Reports', 'GET', '/reports/schedules'],
  ['Reports', 'GET', '/reports/data/operational'],
  ['Reports', 'GET', '/reports/data/financial'],
  ['Reports', 'GET', '/reports/usage-stats'],

  // Settings
  ['Settings', 'GET', '/settings'],
  ['Settings', 'GET', '/settings/overview'],
  ['Settings', 'GET', '/settings/roles'],
  ['Settings', 'GET', '/settings/integrations'],
  ['Settings', 'GET', '/settings/integrations/health'],
  ['Settings', 'GET', '/settings/audit'],

  // Platform
  ['Platform', 'GET', '/platform/tenants'],
  ['Platform', 'GET', '/platform/users'],
  ['Platform', 'GET', '/platform/transfers'],
  ['Platform', 'GET', '/platform/dashboard'],
  ['Platform', 'GET', '/platform/activity'],

  // Workflows
  ['Workflows', 'GET', '/workflows'],
  ['Workflows', 'GET', '/workflows/active'],
  ['Workflows', 'GET', '/workflows/default'],

  // Bitacora
  ['Bitacora', 'GET', '/bitacora'],
  ['Bitacora', 'GET', '/bitacora/stats'],
  ['Bitacora', 'GET', '/bitacora/summary/vehicles'],
  ['Bitacora', 'GET', '/bitacora/summary/geofences'],

  // Endpoints FE que backend probablemente no tiene
  ['*Notifications', 'GET', '/notifications'],
  ['*Notifications', 'GET', '/notifications/stats'],
  ['*MedicalExams', 'GET', '/master/medical-exams/stats'],
  ['*MedicalExams', 'GET', '/master/medical-exams/expiring'],
  ['*Assignments', 'GET', '/master/assignments'],
  ['*Assignments', 'GET', '/master/assignments/stats'],
  ['*MasterAudit', 'GET', '/master/audit'],
  ['*MasterAudit', 'GET', '/master/audit/stats'],

  // Endpoints custom FE que el backend probablemente no tiene
  ['*Custom Orders FE', 'GET', '/operations/orders/status-counts'],
  ['*Custom Orders FE', 'GET', '/operations/orders/by-number/ORD-TEST'],
  ['*Custom Customers FE', 'GET', '/master/customers/by-document/12345678'],
  ['*Custom Drivers FE', 'GET', '/master/drivers/by-document/12345678'],
  ['*Custom Vehicles FE', 'GET', '/master/vehicles/by-plate/ABC-123'],
];

async function main() {
  console.log(`${C.bold}${C.cyan}`);
  console.log('========================================================================');
  console.log('  TMS-NAVITEL BACKEND — SMOKE TEST (con token)');
  console.log('========================================================================');
  console.log(`${C.reset}`);
  console.log(`Token: ${C.dim}${TOKEN.slice(0, 50)}...${C.reset}`);
  console.log('');

  let lastModule = '';
  for (const [module, method, path] of ENDPOINTS) {
    if (module !== lastModule) {
      console.log(`${C.bold}[${module}]${C.reset}`);
      lastModule = module;
    }
    await test(method, path, module);
  }

  console.log('');
  console.log(`${C.bold}${C.cyan}`);
  console.log('========================================================================');
  console.log('  RESUMEN');
  console.log('========================================================================');
  console.log(`${C.reset}`);
  console.log(`  Total:                     ${counters.total}`);
  console.log(`  ${C.green}✓ OK (2xx):               ${counters.ok}${C.reset}`);
  console.log(`  ${C.yellow}⚠ Auth (401/403):         ${counters.auth}${C.reset}`);
  console.log(`  ${C.red}✗ Not Found (404):        ${counters.notFound}${C.reset}`);
  console.log(`  ${C.red}✗ Server Error (5xx):     ${counters.serverError}${C.reset}`);
  console.log(`  ${C.cyan}? Otros:                  ${counters.other}${C.reset}`);
  console.log('');

  if (missing.length > 0) {
    console.log(`${C.bold}${C.red}ENDPOINTS 404 (NO EXISTEN EN BACKEND):${C.reset}`);
    for (const m of missing) {
      console.log(`  ${C.red}404${C.reset}  ${m.method.padEnd(6)} ${m.path}`);
    }
    console.log('');
  }

  if (bugs.length > 0) {
    console.log(`${C.bold}${C.red}BUGS BACKEND (5xx):${C.reset}`);
    for (const b of bugs) {
      console.log(`  ${C.red}${b.status}${C.reset}  ${b.method.padEnd(6)} ${b.path}`);
      console.log(`       ${C.dim}${b.body}${C.reset}`);
    }
    console.log('');
  }

  if (working.length > 0) {
    console.log(`${C.bold}${C.green}ENDPOINTS QUE FUNCIONAN (${working.length}):${C.reset}`);
    const byModule = {};
    for (const w of working) {
      byModule[w.module] = (byModule[w.module] || 0) + 1;
    }
    for (const [mod, count] of Object.entries(byModule)) {
      console.log(`  ${C.green}✓${C.reset} ${mod.padEnd(30)} ${count} endpoints`);
    }
    console.log('');
  }

  // Guardar reporte
  const fs = await import('node:fs');
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const report = {
    timestamp,
    counters,
    working,
    missing,
    bugs,
  };
  fs.writeFileSync(`smoke-test-report-${timestamp}.json`, JSON.stringify(report, null, 2));
  console.log(`${C.dim}Reporte guardado: smoke-test-report-${timestamp}.json${C.reset}`);
}

main();
