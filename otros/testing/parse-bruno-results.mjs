#!/usr/bin/env node
/**
 * Parser de resultados de Bruno CLI (formato JSON).
 *
 * USO:
 *   node otros/testing/parse-bruno-results.mjs <ruta-al-json>
 */

import { readFileSync } from "node:fs";

const C = {
  reset: "\x1b[0m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m", bold: "\x1b[1m", dim: "\x1b[2m",
};

const path = process.argv[2] || "/tmp/bruno-full.json";
let data;
try {
  data = JSON.parse(readFileSync(path, "utf-8"));
} catch (err) {
  console.error(`No se pudo leer ${path}: ${err.message}`);
  process.exit(1);
}

// El JSON de Bruno CLI 3.3 tiene shape: { "0": { iterationIndex, results: [...], summary } }
// (el array de iteraciones, normalmente solo 1)
let results = [];
if (Array.isArray(data) && data[0]?.results) {
  results = data[0].results;
} else if (data["0"]?.results) {
  results = data["0"].results;
} else if (data.results) {
  results = data.results;
}

// Agrupar por carpeta (módulo)
const byModule = new Map();
for (const r of results) {
  const filename = r.test?.filename || r.filename || "?";
  const parts = filename.split(/[/\\]/);
  const module = parts.length > 1 ? parts[0] : "(raíz)";
  const test = parts[parts.length - 1].replace(/\.bru$/, "");
  const status = r.response?.status ?? r.runtime?.status ?? r.status ?? 0;
  const ok = status >= 200 && status < 300;
  if (!byModule.has(module)) byModule.set(module, []);
  byModule.get(module).push({ test, status, ok });
}

function categorize(status) {
  if (status >= 200 && status < 300) return "ok";
  if (status === 404) return "404";
  if (status === 429) return "429";
  if (status >= 500) return "5xx";
  return "other";
}

// Reporte por módulo
console.log("");
console.log(`${C.bold}${C.cyan}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.bold}${C.cyan}║          REPORTE BRUNO E2E COMPLETO — TODOS LOS MÓDULOS              ║${C.reset}`);
console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════════════════════════╝${C.reset}`);
console.log("");

const summary = {
  total: 0, ok: 0, fail404: 0, fail429: 0, fail5xx: 0, failOther: 0,
};
const modulePcts = [];

for (const [module, tests] of [...byModule.entries()].sort()) {
  const counts = { ok: 0, "404": 0, "429": 0, "5xx": 0, other: 0 };
  for (const t of tests) counts[categorize(t.status)]++;
  const pct = ((counts.ok / tests.length) * 100).toFixed(0);
  modulePcts.push({ module, pct: parseFloat(pct), tests, counts });
  summary.total += tests.length;
  summary.ok += counts.ok;
  summary.fail404 += counts["404"];
  summary.fail429 += counts["429"];
  summary.fail5xx += counts["5xx"];
  summary.failOther += counts.other;

  const color = pct >= 80 ? C.green : pct >= 50 ? C.yellow : C.red;
  console.log(`${C.bold}${color}${module.padEnd(28)} ${String(pct).padStart(3)}%${C.reset}  ${C.dim}(${counts.ok}/${tests.length} ok, ${counts["404"]}× 404, ${counts["5xx"]}× 5xx, ${counts["429"]}× 429)${C.reset}`);

  for (const t of tests) {
    let icon, statusStr;
    const cat = categorize(t.status);
    if (cat === "ok") { icon = `${C.green}✅`; statusStr = String(t.status); }
    else if (cat === "404") { icon = `${C.red}❌`; statusStr = "404"; }
    else if (cat === "429") { icon = `${C.yellow}⏳`; statusStr = "429"; }
    else if (cat === "5xx") { icon = `${C.red}💥`; statusStr = String(t.status); }
    else { icon = `${C.red}✗`; statusStr = String(t.status); }
    console.log(`  ${icon} [${statusStr.padStart(3)}]${C.reset} ${t.test}`);
  }
  console.log("");
}

// Globales
const globalPct = ((summary.ok / summary.total) * 100).toFixed(1);
const realFails = summary.fail404 + summary.fail5xx + summary.failOther; // 429 no cuenta
const realPct = (((summary.ok) / (summary.total - summary.fail429)) * 100).toFixed(1);

console.log(`${C.bold}${C.cyan}═══════════════════════════════════════════════════════════════════════${C.reset}`);
console.log(`${C.bold}MÉTRICAS GLOBALES:${C.reset}`);
console.log(`  Total endpoints ejecutados:    ${summary.total}`);
console.log(`  ${C.green}OK (2xx):                       ${summary.ok}${C.reset}`);
console.log(`  ${C.red}404 Not Found:                  ${summary.fail404}${C.reset}`);
console.log(`  ${C.red}5xx Server Error:               ${summary.fail5xx}${C.reset}`);
console.log(`  ${C.red}Otros errores:                  ${summary.failOther}${C.reset}`);
console.log(`  ${C.yellow}429 Rate Limited (no es bug):   ${summary.fail429}${C.reset}`);
console.log("");
console.log(`${C.bold}PORCENTAJES:${C.reset}`);
console.log(`  Sobre TOTAL:                   ${C.bold}${globalPct}%${C.reset}`);
console.log(`  Excluyendo 429 (real):         ${C.bold}${C.green}${realPct}%${C.reset}`);
console.log("");
console.log(`${C.bold}RANKING POR MÓDULO:${C.reset}`);
modulePcts.sort((a, b) => b.pct - a.pct);
for (const m of modulePcts) {
  const color = m.pct >= 80 ? C.green : m.pct >= 50 ? C.yellow : C.red;
  console.log(`  ${color}${String(m.pct).padStart(3)}%${C.reset}  ${m.module}`);
}
