// Compara endpoints del docx (mandado por dev) vs Excel oficial vs lo que probamos
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";

const DOCS_DIR = resolve("./");

// ─── Paso 1: extraer endpoints de cada QUICK_REFERENCE ─────
const txtFiles = readdirSync(DOCS_DIR).filter(f => f.endsWith("_QUICK_REFERENCE.txt"));

const docEndpoints = {};

for (const file of txtFiles) {
  const moduleName = file.replace("_QUICK_REFERENCE.txt", "");
  const content = readFileSync(join(DOCS_DIR, file), "utf8");
  const lines = content.split("\n");

  const endpoints = [];
  const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

  // Patron: numero de endpoint (E-XX), luego metodo, luego path, luego descripcion
  for (let i = 0; i < lines.length - 2; i++) {
    const line = lines[i].trim();
    const next = lines[i + 1].trim();

    // E-XX seguido de metodo HTTP
    if (/^E-\d+$/.test(line) && methods.has(next)) {
      const path = lines[i + 2].trim();
      if (path.startsWith("/")) {
        endpoints.push({
          code: line,
          method: next,
          path: path,
          desc: lines[i + 3]?.trim() ?? "",
        });
      }
    }
  }
  docEndpoints[moduleName] = endpoints;
}

// ─── Paso 2: emitir reporte por modulo ─────
let output = "# Endpoints documentados en QUICK_REFERENCE (otros docs)\n\n";
output += `Generado: ${new Date().toISOString()}\n\n`;

const totals = { totalDocs: 0, totalEndpoints: 0 };

for (const moduleName of Object.keys(docEndpoints).sort()) {
  const eps = docEndpoints[moduleName];
  totals.totalDocs += 1;
  totals.totalEndpoints += eps.length;
  output += `\n## ${moduleName} — ${eps.length} endpoints\n\n`;
  output += "| # | Método | Path | Descripción |\n|---|---|---|---|\n";
  for (const ep of eps) {
    output += `| ${ep.code} | ${ep.method} | \`${ep.path}\` | ${ep.desc} |\n`;
  }
}

output += `\n\n---\n\n## Totales\n\n`;
output += `- ${totals.totalDocs} docs analizados\n`;
output += `- ${totals.totalEndpoints} endpoints documentados (cross-doc)\n`;

writeFileSync(join(DOCS_DIR, "ENDPOINTS_DOCUMENTADOS.md"), output, "utf8");
console.log(`✓ Generado: ENDPOINTS_DOCUMENTADOS.md`);
console.log(`  Total endpoints documentados: ${totals.totalEndpoints}`);

// Tambien lista solo de paths para grep rapido
let paths = "";
for (const moduleName of Object.keys(docEndpoints).sort()) {
  for (const ep of docEndpoints[moduleName]) {
    paths += `${moduleName}\t${ep.method}\t${ep.path}\t${ep.code}\n`;
  }
}
writeFileSync(join(DOCS_DIR, "endpoints.tsv"), paths, "utf8");
