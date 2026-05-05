#!/usr/bin/env node
/**
 * SMOKE TEST — TMS-NAVITEL Backend
 *
 * Prueba sistematica de endpoints del backend real.
 * Reporta que funciona, que devuelve 404, que devuelve 500, latencias.
 *
 * USO:
 *   node scripts/smoke-test.mjs
 *
 * VARIABLES DE ENTORNO (opcional):
 *   API_URL        — Override del base URL (default: https://api-service.gruponavitel.com/api/v1)
 *   LOGIN_EMAIL    — Email/usuario para login (default: admin)
 *   LOGIN_PASSWORD — Password para login (default: Admin1432!)
 */

const API_BASE = process.env.API_BASE || 'https://api-service.gruponavitel.com';
const API_URL = `${API_BASE}/api/v1`;
const LOGIN_URL = `${API_BASE}/auth/login`;  // IMPORTANTE: login NO usa /api/v1
const LOGIN_USER = process.env.LOGIN_USER || 'admin';
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'Admin1432!';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

const results = {
  total: 0,
  ok: 0,
  auth_errors: 0,
  not_found: 0,
  server_errors: 0,
  other_errors: 0,
  details: [],
};

/**
 * Hace request HTTP y retorna detalle
 */
async function request(method, path, { body, token, timeoutMs = 15000, absoluteUrl = null } = {}) {
  const url = absoluteUrl || `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latency = performance.now() - start;

    let bodyText = '';
    try {
      bodyText = await res.text();
    } catch {}

    return {
      status: res.status,
      ok: res.ok,
      latency: Math.round(latency),
      body: bodyText.slice(0, 300),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      status: 0,
      ok: false,
      latency: Math.round(performance.now() - start),
      body: err.message,
      network_error: true,
    };
  }
}

/**
 * Formatea resultado con color
 */
function fmtStatus(status) {
  if (status >= 200 && status < 300) return `${COLORS.green}${status}${COLORS.reset}`;
  if (status === 401 || status === 403) return `${COLORS.yellow}${status}${COLORS.reset}`;
  if (status === 404) return `${COLORS.yellow}${status}${COLORS.reset}`;
  if (status >= 500) return `${COLORS.red}${status}${COLORS.reset}`;
  if (status === 0) return `${COLORS.red}NET ERR${COLORS.reset}`;
  return `${COLORS.cyan}${status}${COLORS.reset}`;
}

function classifyResult(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401 || status === 403) return 'auth_errors';
  if (status === 404) return 'not_found';
  if (status >= 500) return 'server_errors';
  return 'other_errors';
}

async function testEndpoint(method, path, description, options = {}) {
  results.total++;
  const result = await request(method, path, options);
  const category = classifyResult(result.status);
  results[category]++;

  const status = fmtStatus(result.status);
  const latency = `${COLORS.dim}${result.latency}ms${COLORS.reset}`;
  console.log(`  ${method.padEnd(6)} ${path.padEnd(60)} ${status.padStart(15)} ${latency}`);

  results.details.push({
    method,
    path,
    description,
    status: result.status,
    latency: result.latency,
    ok: result.ok,
    category,
    body_preview: result.body,
  });

  return result;
}

// ============================================================
// TESTS
// ============================================================

const ENDPOINTS_PUBLIC = [
  // Health
  ['GET', '/health', 'Health check'],
];

const ENDPOINTS_AUTH = [
  ['POST', '/auth/login', 'Login con credentials'],
];

const ENDPOINTS_AUTHENTICATED = [
  // Dashboard
  ['GET', '/dashboard/stats', 'Dashboard KPIs'],
  ['GET', '/dashboard/vehicles/overview', 'Fleet overview'],
  ['GET', '/dashboard/shipments', 'Shipment stats'],
  ['GET', '/dashboard/vehicles/on-route', 'On-route vehicles'],

  // Master - Customers
  ['GET', '/master/customers', 'List customers'],
  ['GET', '/master/customers/stats', 'Customer stats'],
  ['GET', '/master/customers/cities', 'Customer cities'],

  // Master - Drivers
  ['GET', '/master/drivers', 'List drivers'],
  ['GET', '/master/drivers/stats', 'Driver stats'],
  ['GET', '/master/drivers/expiring-licenses', 'Expiring licenses'],

  // Master - Vehicles
  ['GET', '/master/vehicles', 'List vehicles'],
  ['GET', '/master/vehicles/stats', 'Vehicle stats'],
  ['GET', '/master/vehicles/expiring-documents', 'Expiring docs'],
  ['GET', '/master/vehicles/needing-maintenance', 'Needs maintenance'],

  // Master - Products
  ['GET', '/master/products', 'List products'],
  ['GET', '/master/products/stats', 'Product stats'],

  // Master - Operators
  ['GET', '/master/operators', 'List operators'],
  ['GET', '/master/operators/stats', 'Operator stats'],

  // Geofences (backend las tiene sin /master)
  ['GET', '/geofences', 'List geofences (root)'],
  ['GET', '/master/geofences', 'List geofences (master)'],

  // Orders
  ['GET', '/orders', 'List orders'],
  ['GET', '/orders/stats', 'Order stats'],
  ['GET', '/orders/status-counts', 'Status counts (custom)'],

  // Operations (lo que el FE espera)
  ['GET', '/operations/orders', 'List orders (FE path)'],

  // Monitoring
  ['GET', '/monitoring/tracking', 'Vehicle tracking'],
  ['GET', '/monitoring/stats', 'Monitoring stats'],
  ['GET', '/monitoring/alerts', 'Alerts'],
  ['GET', '/monitoring/alert-rules', 'Alert rules'],
  ['GET', '/monitoring/retransmission', 'Retransmission'],
  ['GET', '/monitoring/retransmission/stats', 'Retransmission stats'],
  ['GET', '/monitoring/geofence-events', 'Geofence events'],
  ['GET', '/monitoring/geofence-events/stats', 'Geofence event stats'],
  ['GET', '/monitoring/multi-window/panels', 'Multi-window panels'],

  // Finance
  ['GET', '/finance/invoices', 'List invoices'],
  ['GET', '/finance/payments', 'List payments'],
  ['GET', '/finance/costs', 'List costs'],
  ['GET', '/finance/rates', 'List rates'],
  ['GET', '/finance/stats', 'Finance stats'],
  ['GET', '/finance/aging', 'Aging'],
  ['GET', '/finance/profitability', 'Profitability'],
  ['GET', '/finance/cash-flow', 'Cash flow'],

  // Scheduling
  ['GET', '/operations/scheduling/orders', 'Schedulable orders'],
  ['GET', '/operations/scheduling/calendar', 'Calendar'],
  ['GET', '/operations/scheduling/conflicts', 'Conflicts'],
  ['GET', '/operations/scheduling/kpis', 'Scheduling KPIs'],
  ['GET', '/operations/scheduling/blocked-days', 'Blocked days'],
  ['GET', '/operations/scheduling/audit-logs', 'Audit logs'],

  // Route Planner
  ['GET', '/route-planner/routes', 'List routes'],
  ['GET', '/route-planner/depots', 'Depots'],
  ['GET', '/route-planner/vehicles', 'Available vehicles'],
  ['GET', '/route-planner/drivers', 'Available drivers'],
  ['GET', '/route-planner/route-templates', 'Route templates'],

  // Routing (lo que el FE espera)
  ['GET', '/routing/calculate', 'Routing calculate (FE path)'],
  ['GET', '/routing/geocode', 'Geocode (FE path)'],

  // Maintenance
  ['GET', '/maintenance/stats', 'Maintenance stats'],
  ['GET', '/maintenance/work-orders', 'Work orders'],
  ['GET', '/maintenance/schedules', 'Schedules'],
  ['GET', '/maintenance/breakdowns', 'Breakdowns'],
  ['GET', '/maintenance/vehicles', 'Maintenance vehicles'],
  ['GET', '/maintenance/workshops', 'Workshops'],
  ['GET', '/maintenance/parts', 'Parts'],
  ['GET', '/maintenance/inspections', 'Inspections'],
  ['GET', '/maintenance/alerts', 'Alerts'],
  ['GET', '/maintenance/metrics', 'Metrics'],

  // Reports
  ['GET', '/reports/definitions', 'Report definitions'],
  ['GET', '/reports/templates', 'Templates'],
  ['GET', '/reports/generated', 'Generated reports'],
  ['GET', '/reports/schedules', 'Schedules'],
  ['GET', '/reports/data/operational', 'Operational data'],
  ['GET', '/reports/data/financial', 'Financial data'],
  ['GET', '/reports/usage-stats', 'Usage stats'],

  // Settings
  ['GET', '/settings', 'All settings'],
  ['GET', '/settings/overview', 'Settings overview'],
  ['GET', '/settings/roles', 'Roles'],
  ['GET', '/settings/integrations', 'Integrations'],
  ['GET', '/settings/integrations/health', 'Integrations health'],
  ['GET', '/settings/audit', 'Audit log'],

  // Platform
  ['GET', '/platform/tenants', 'Platform tenants'],
  ['GET', '/platform/users', 'Platform users'],
  ['GET', '/platform/transfers', 'Vehicle transfers'],
  ['GET', '/platform/dashboard', 'Platform dashboard'],
  ['GET', '/platform/activity', 'Platform activity'],

  // Workflows
  ['GET', '/workflows', 'List workflows'],
  ['GET', '/workflows/active', 'Active workflows'],
  ['GET', '/workflows/default', 'Default workflow'],

  // Bitacora
  ['GET', '/bitacora', 'Bitacora entries'],
  ['GET', '/bitacora/stats', 'Bitacora stats'],
  ['GET', '/bitacora/summary/vehicles', 'By vehicle'],
  ['GET', '/bitacora/summary/geofences', 'By geofence'],

  // Endpoints que NO deberian existir en backend (para confirmar)
  ['GET', '/notifications', 'NOTIFICATIONS (no implementado)'],
  ['GET', '/notifications/stats', 'NOTIFICATIONS stats (no implementado)'],
  ['GET', '/master/medical-exams/stats', 'MEDICAL EXAMS (no implementado)'],
  ['GET', '/master/assignments', 'ASSIGNMENTS (no implementado)'],
  ['GET', '/master/audit', 'MASTER AUDIT (no implementado)'],
];

async function main() {
  console.log(`${COLORS.bold}${COLORS.cyan}`);
  console.log('=========================================================================');
  console.log('  TMS-NAVITEL BACKEND — SMOKE TEST');
  console.log('=========================================================================');
  console.log(`${COLORS.reset}`);
  console.log(`API URL:   ${COLORS.cyan}${API_URL}${COLORS.reset}`);
  console.log(`Login URL: ${COLORS.cyan}${LOGIN_URL}${COLORS.reset}`);
  console.log(`User:      ${COLORS.cyan}${LOGIN_USER}${COLORS.reset} / ${COLORS.dim}${'*'.repeat(LOGIN_PASSWORD.length)}${COLORS.reset}`);
  console.log('');

  // ============================================================
  // Fase 1: Endpoints publicos
  // ============================================================
  console.log(`${COLORS.bold}[1/3] ENDPOINTS PUBLICOS (sin auth)${COLORS.reset}`);
  console.log('-------------------------------------------------------------------------');
  for (const [method, path, description] of ENDPOINTS_PUBLIC) {
    await testEndpoint(method, path, description);
  }
  console.log('');

  // ============================================================
  // Fase 2: Auth (login)
  // ============================================================
  console.log(`${COLORS.bold}[2/3] AUTENTICACION${COLORS.reset}`);
  console.log('-------------------------------------------------------------------------');

  let token = null;
  const loginResult = await request('POST', null, {
    absoluteUrl: LOGIN_URL,
    body: { username: LOGIN_USER, password: LOGIN_PASSWORD },
  });

  console.log(`  POST   ${LOGIN_URL} ${fmtStatus(loginResult.status).padStart(15)} ${COLORS.dim}${loginResult.latency}ms${COLORS.reset}`);

  if (loginResult.ok) {
    try {
      const parsed = JSON.parse(loginResult.body);
      token = parsed.token || parsed.accessToken || parsed.data?.accessToken || parsed.data?.token;
      if (token) {
        console.log(`  ${COLORS.green}✓ Token obtenido${COLORS.reset} (primeros 30 chars: ${token.slice(0, 30)}...)`);
      } else {
        console.log(`  ${COLORS.yellow}⚠ Login OK pero no se encontro token en la respuesta${COLORS.reset}`);
        console.log(`  Response body:\n  ${COLORS.dim}${loginResult.body}${COLORS.reset}`);
      }
    } catch (e) {
      console.log(`  ${COLORS.red}✗ Error parseando respuesta de login${COLORS.reset}`);
    }
  } else {
    console.log(`  ${COLORS.red}✗ Login fallo${COLORS.reset}`);
    console.log(`  Response: ${COLORS.dim}${loginResult.body}${COLORS.reset}`);
    console.log('');
    console.log(`  ${COLORS.yellow}⚠ Continuando sin token (esperamos 401 en todos los endpoints)${COLORS.reset}`);
  }
  console.log('');

  // ============================================================
  // Fase 3: Endpoints autenticados
  // ============================================================
  console.log(`${COLORS.bold}[3/3] ENDPOINTS AUTENTICADOS${COLORS.reset}`);
  console.log('-------------------------------------------------------------------------');

  for (const [method, path, description] of ENDPOINTS_AUTHENTICATED) {
    await testEndpoint(method, path, description, { token });
  }
  console.log('');

  // ============================================================
  // Resumen
  // ============================================================
  console.log(`${COLORS.bold}${COLORS.cyan}`);
  console.log('=========================================================================');
  console.log('  RESUMEN');
  console.log('=========================================================================');
  console.log(`${COLORS.reset}`);
  console.log(`  Total requests:        ${results.total}`);
  console.log(`  ${COLORS.green}✓ OK (2xx):            ${results.ok}${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}⚠ Auth errors (401/403): ${results.auth_errors}${COLORS.reset}`);
  console.log(`  ${COLORS.yellow}⚠ Not found (404):     ${results.not_found}${COLORS.reset}`);
  console.log(`  ${COLORS.red}✗ Server errors (5xx): ${results.server_errors}${COLORS.reset}`);
  console.log(`  ${COLORS.cyan}? Other:               ${results.other_errors}${COLORS.reset}`);
  console.log('');

  // Endpoints NOT FOUND (importante para el backend)
  const notFound = results.details.filter((r) => r.category === 'not_found');
  if (notFound.length > 0) {
    console.log(`${COLORS.bold}${COLORS.yellow}Endpoints que devolvieron 404 (revisar si existen en backend):${COLORS.reset}`);
    for (const r of notFound) {
      console.log(`  ${COLORS.yellow}404${COLORS.reset}  ${r.method.padEnd(6)} ${r.path}`);
    }
    console.log('');
  }

  // Errores 5xx (BUGS del backend)
  const serverErrors = results.details.filter((r) => r.category === 'server_errors');
  if (serverErrors.length > 0) {
    console.log(`${COLORS.bold}${COLORS.red}Endpoints con errores 5xx (BUGS del backend):${COLORS.reset}`);
    for (const r of serverErrors) {
      console.log(`  ${COLORS.red}${r.status}${COLORS.reset}  ${r.method.padEnd(6)} ${r.path}`);
      console.log(`       ${COLORS.dim}${r.body_preview}${COLORS.reset}`);
    }
    console.log('');
  }

  // Guardar JSON con resultados completos
  const fs = await import('node:fs');
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const reportPath = `smoke-test-report-${timestamp}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`${COLORS.dim}Reporte detallado: ${reportPath}${COLORS.reset}`);
  console.log('');

  // Exit code segun resultados
  if (!token) process.exit(2);
  if (results.server_errors > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${COLORS.red}Error fatal:${COLORS.reset}`, err);
  process.exit(99);
});
