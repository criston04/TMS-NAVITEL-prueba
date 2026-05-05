#!/usr/bin/env node
/**
 * Runner custom para .bru files con pausas entre requests + retry on 429.
 *
 * Lee archivos .bru, parsea método/url/body/auth, ejecuta cada uno con
 * un delay configurable y respeta el rate limit del backend.
 *
 * USO:
 *   node otros/testing/bruno-runner.mjs <carpeta1> [carpeta2] ...
 *
 * Ejemplo:
 *   node otros/testing/bruno-runner.mjs 01-Auth 03-Master-Customers 08-Orders
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

const BRUNO_ROOT = "otros/testing/bruno";
const ENV_FILE = join(BRUNO_ROOT, "environments/Dev.bru");
const DELAY_MS = parseInt(process.env.DELAY_MS || "2500"); // 2.5s entre requests
const RETRY_ON_429 = [5000, 12000, 25000];

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m", bold: "\x1b[1m", dim: "\x1b[2m",
};

const log = (m = "") => process.stdout.write(m + "\n");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════════
// Parser .bru muy simple — extrae lo necesario para ejecutar
// ════════════════════════════════════════════════════════════════
function parseBru(content) {
  const result = { method: null, url: null, body: null, auth: null, scriptPostResponse: null };

  // Detectar método y url. El bloque termina con `}` al inicio de línea
  // (no podemos usar [^}]+ porque {{var}} contiene }).
  const methodMatch = content.match(/^(get|post|put|patch|delete)\s*\{\n([\s\S]*?)\n\}/m);
  if (methodMatch) {
    result.method = methodMatch[1].toUpperCase();
    const block = methodMatch[2];
    const urlMatch = block.match(/^\s*url:\s*(.+)$/m);
    if (urlMatch) result.url = urlMatch[1].trim();
  }

  // Body JSON: buscar bloque body:json { ... \n}
  const bodyMatch = content.match(/^body:json\s*\{\n([\s\S]*?)\n\}\s*$/m);
  if (bodyMatch) {
    result.body = bodyMatch[1].trim();
  }

  // Auth bearer
  const authBlockMatch = content.match(/^auth:bearer\s*\{\n([\s\S]*?)\n\}/m);
  if (authBlockMatch) {
    const tokMatch = authBlockMatch[1].match(/^\s*token:\s*(.+)$/m);
    if (tokMatch) result.auth = { type: "bearer", token: tokMatch[1].trim() };
  }

  // script:post-response
  const scriptMatch = content.match(/^script:post-response\s*\{\n([\s\S]*?)\n\}\s*$/m);
  if (scriptMatch) result.scriptPostResponse = scriptMatch[1];

  return result;
}

// Resolver variables {{var}}
function resolveVars(str, vars) {
  if (!str) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? "");
}

// ════════════════════════════════════════════════════════════════
// Cargar environment Dev.bru → diccionario de variables
// ════════════════════════════════════════════════════════════════
function loadEnv() {
  const content = readFileSync(ENV_FILE, "utf-8");
  const vars = {};
  const block = content.match(/vars\s*\{([\s\S]*?)\n\}/);
  if (block) {
    for (const line of block[1].split("\n")) {
      const m = line.match(/^\s*(\w+):\s*(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  return vars;
}

// ════════════════════════════════════════════════════════════════
// Re-login: cuando recibimos 401 hacemos POST /auth/login y
// actualizamos vars.authToken in-place para los próximos requests.
// ════════════════════════════════════════════════════════════════
async function reLogin(vars) {
  const url = `${vars.rootUrl}/auth/login`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: vars.username, password: vars.password }),
    });
    if (!res.ok) return false;
    const body = await res.json();
    const payload = body?.data ?? body;
    const accessToken = payload?.accessToken || payload?.token;
    if (accessToken) {
      vars.authToken = accessToken;
      return true;
    }
  } catch {}
  return false;
}

// ════════════════════════════════════════════════════════════════
// Ejecutar HTTP con retry on 429 + auto-re-login on 401
// ════════════════════════════════════════════════════════════════
async function exec({ method, url, body, headers = {}, vars, originalAuthToken }) {
  for (let attempt = 0; attempt <= RETRY_ON_429.length; attempt++) {
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method, headers,
        body: body && method !== "GET" ? body : undefined,
      });
      const raw = await res.text();
      let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
      const result = { ok: res.ok, status: res.status, latencyMs: Date.now() - t0, data, raw };

      // 401: intentar re-login una sola vez
      if (res.status === 401 && originalAuthToken && vars && attempt === 0) {
        const ok = await reLogin(vars);
        if (ok) {
          headers.Authorization = `Bearer ${vars.authToken}`;
          await sleep(2000);
          continue;
        }
      }

      if (res.status === 429 && attempt < RETRY_ON_429.length) {
        await sleep(RETRY_ON_429[attempt]);
        continue;
      }
      return result;
    } catch (err) {
      if (attempt < RETRY_ON_429.length) {
        await sleep(RETRY_ON_429[attempt]);
        continue;
      }
      return { ok: false, status: 0, latencyMs: Date.now() - t0, error: err.message };
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Listar .bru files de una carpeta (orden alfabético = orden seq)
// ════════════════════════════════════════════════════════════════
function listBruFiles(folder) {
  const dir = join(BRUNO_ROOT, folder);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith(".bru"))
    .sort()
    .map(f => ({ folder, file: f, path: join(dir, f) }));
}

// ════════════════════════════════════════════════════════════════
// Procesar script post-response: extraer sólo bru.setEnvVar(...) calls
// ════════════════════════════════════════════════════════════════
function applyPostResponse(script, response, vars) {
  if (!script) return;
  // Buscar `bru.setEnvVar("name", expr)` y resolver expr contra response
  const setVarRegex = /bru\.setEnvVar\s*\(\s*"(\w+)"\s*,\s*([^)]+)\)/g;
  let match;
  while ((match = setVarRegex.exec(script)) !== null) {
    const varName = match[1];
    const expr = match[2].trim();
    // Soporte para los expresiones más comunes:
    //   res.body.data.accessToken
    //   res.body.accessToken
    //   res.body.data.id || res.body.id || res.body.order_id
    //   obj.id (donde obj = body?.data || body)
    let value;
    try {
      // Implementación simplificada: parseamos el valor como path en el response
      const body = response.data;
      value = evalExpr(expr, body, vars);
    } catch {
      value = undefined;
    }
    if (value !== undefined && value !== null) {
      vars[varName] = String(value);
    }
  }
}

function evalExpr(expr, body, vars) {
  // Soportar expresiones tipo `res.body.X.Y` y `obj.X || obj.Y`
  // Convertir res.body. → body.
  expr = expr.replace(/res\.body/g, "body");
  // Eliminar comentarios
  expr = expr.replace(/\/\/.*$/gm, "").trim();

  // Evaluar usando Function. Pasamos body explícitamente.
  try {
    const fn = new Function("body", "vars", `return (${expr});`);
    const obj = body?.data ?? body;
    return fn(body, vars) ?? fn.call(null, body, vars);
  } catch {
    return undefined;
  }
}

// Helper más simple: tomar body o body.data y leer un path
function readPath(obj, path) {
  if (!obj) return undefined;
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
const folders = process.argv.slice(2);
if (folders.length === 0) {
  console.error("Uso: node bruno-runner.mjs <folder1> [folder2] ...");
  process.exit(1);
}

const vars = loadEnv();
log(`${C.dim}Vars iniciales: ${Object.keys(vars).length}${C.reset}`);

const allFiles = folders.flatMap(listBruFiles);
log(`${C.bold}${C.cyan}Total requests a ejecutar: ${allFiles.length}${C.reset}`);
log(`${C.dim}Delay entre requests: ${DELAY_MS}ms (~${(allFiles.length * DELAY_MS / 1000 / 60).toFixed(1)} min mínimo)${C.reset}`);
log("");

const results = [];

for (let i = 0; i < allFiles.length; i++) {
  const { folder, file, path } = allFiles[i];
  const content = readFileSync(path, "utf-8");
  const parsed = parseBru(content);

  if (!parsed.method || !parsed.url) {
    log(`${C.gray}  [skip] ${folder}/${file} (no parseable)${C.reset}`);
    continue;
  }

  const url = resolveVars(parsed.url, vars);
  const body = resolveVars(parsed.body, vars);
  const headers = { "Content-Type": "application/json" };
  if (parsed.auth?.type === "bearer") {
    const token = resolveVars(parsed.auth.token, vars);
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Pausa entre requests (no antes del primero)
  if (i > 0) await sleep(DELAY_MS);

  const r = await exec({
    method: parsed.method, url, body, headers, vars,
    originalAuthToken: parsed.auth?.type === "bearer",
  });

  let icon, statusColor;
  if (r.ok) { icon = `${C.green}✅`; statusColor = C.green; }
  else if (r.status === 404) { icon = `${C.red}❌`; statusColor = C.red; }
  else if (r.status === 429) { icon = `${C.yellow}⏳`; statusColor = C.yellow; }
  else if (r.status >= 500) { icon = `${C.red}💥`; statusColor = C.red; }
  else { icon = `${C.red}✗`; statusColor = C.red; }

  const label = `${folder}/${file.replace(".bru", "")}`.padEnd(58);
  log(`  ${icon} ${statusColor}[${String(r.status).padStart(3)}]${C.reset} ${label} ${C.dim}${r.latencyMs}ms${C.reset}`);

  results.push({ folder, file, method: parsed.method, url, status: r.status, ok: r.ok, latencyMs: r.latencyMs });

  // Aplicar script post-response (puede actualizar vars)
  if (r.ok) applyPostResponse(parsed.scriptPostResponse, r, vars);
}

// ════════════════════════════════════════════════════════════════
// REPORTE FINAL
// ════════════════════════════════════════════════════════════════
log("");
log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
log(`${C.bold}${C.cyan}║              REPORTE BRUNO RUNNER — RESUMEN POR MÓDULO               ║${C.reset}`);
log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════════════╝${C.reset}`);
log("");

const byModule = new Map();
for (const r of results) {
  if (!byModule.has(r.folder)) byModule.set(r.folder, []);
  byModule.get(r.folder).push(r);
}

const summary = { total: 0, ok: 0, fail404: 0, fail429: 0, fail5xx: 0, failOther: 0 };
const moduleStats = [];

for (const [m, list] of [...byModule.entries()].sort()) {
  const counts = { ok: 0, "404": 0, "429": 0, "5xx": 0, other: 0 };
  for (const r of list) {
    if (r.ok) counts.ok++;
    else if (r.status === 404) counts["404"]++;
    else if (r.status === 429) counts["429"]++;
    else if (r.status >= 500) counts["5xx"]++;
    else counts.other++;
  }
  const total = list.length;
  const real = total - counts["429"];
  const pct = real > 0 ? ((counts.ok / real) * 100).toFixed(0) : "—";
  const color = pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red;

  moduleStats.push({ m, pct: parseFloat(pct), counts, total, real });
  summary.total += total;
  summary.ok += counts.ok;
  summary.fail404 += counts["404"];
  summary.fail429 += counts["429"];
  summary.fail5xx += counts["5xx"];
  summary.failOther += counts.other;

  log(`  ${color}${String(pct).padStart(3)}%${C.reset}  ${m.padEnd(28)} ${C.dim}(${counts.ok}/${real} ok | 404:${counts["404"]} 5xx:${counts["5xx"]} 429:${counts["429"]} otros:${counts.other})${C.reset}`);
}

log("");
log(`${C.bold}GLOBALES:${C.reset}`);
log(`  Total ejecutadas:           ${summary.total}`);
log(`  ${C.green}OK (2xx):                    ${summary.ok}${C.reset}`);
log(`  ${C.red}404:                         ${summary.fail404}${C.reset}`);
log(`  ${C.red}5xx:                         ${summary.fail5xx}${C.reset}`);
log(`  ${C.red}Otros (4xx no 404/429):      ${summary.failOther}${C.reset}`);
log(`  ${C.yellow}429 (excluido):              ${summary.fail429}${C.reset}`);
const realDenom = summary.total - summary.fail429;
const realPct = realDenom > 0 ? ((summary.ok / realDenom) * 100).toFixed(1) : "—";
log("");
log(`  ${C.bold}% FUNCIONAL (excl. 429):     ${C.green}${realPct}%${C.reset}`);

// Guardar JSON para análisis posterior
const outPath = process.env.OUT || "/tmp/bruno-runner-results.json";
writeFileSync(outPath, JSON.stringify({ results, summary, moduleStats, vars }, null, 2));
log("");
log(`${C.dim}Resultados completos: ${outPath}${C.reset}`);
