// Analiza endpoints documentados en cada QUICK_REFERENCE.txt
// y los compara con lo que el frontend del repo usa.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, join } from "node:path";

const DOCS_DIR = resolve("./");
const REPO_DIR = resolve("../../");

// ─── Paso 1: extraer endpoints documentados de cada .txt ─────
const txtFiles = readdirSync(DOCS_DIR).filter(f => f.endsWith(".txt"));

const docEndpoints = {};

for (const file of txtFiles) {
  const moduleName = file.replace("_QUICK_REFERENCE.txt", "");
  const content = readFileSync(join(DOCS_DIR, file), "utf8");
  const lines = content.split("\n");

  const endpoints = new Set();
  // Patron: linea con metodo HTTP, siguiente con path
  const methods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (methods.has(line)) {
      const next = lines[i + 1].trim();
      if (next.startsWith("/")) {
        endpoints.add(`${line} ${next}`);
      }
    }
  }
  docEndpoints[moduleName] = [...endpoints].sort();
}

// ─── Paso 2: extraer endpoints que el frontend USA del repo ─────
// Buscamos llamadas a apiClient.[get|post|put|patch|delete] y al http() helper
function grep(pattern, paths) {
  try {
    const result = execSync(
      `grep -rEn "${pattern}" ${paths} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
      { cwd: REPO_DIR, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 }
    );
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

const apiClientCalls = grep(
  `apiClient\\.(get|post|put|patch|delete|getOptional)<`,
  "src"
);

// extraer paths de las llamadas
const frontendEndpoints = new Map(); // path -> array de metodos
for (const line of apiClientCalls) {
  const match = line.match(/apiClient\.(get|post|put|patch|delete|getOptional)<[^>]*>\(([^,)]+)/);
  if (!match) continue;
  const method = match[1].toUpperCase().replace("GETOPTIONAL", "GET");
  const pathExpr = match[2].trim();
  // Normalizar: ${X} -> :X, comillas, etc.
  const path = pathExpr
    .replace(/`/g, "")
    .replace(/"/g, "")
    .replace(/'/g, "")
    .replace(/\$\{[^}]+\}/g, ":id")
    .trim();
  if (!frontendEndpoints.has(path)) frontendEndpoints.set(path, new Set());
  frontendEndpoints.get(path).add(method);
}

// ─── Paso 3: emitir reporte ─────
let output = "# REPORTE: Documentación QUICK_REFERENCE vs Frontend real\n\n";
output += `Generado: ${new Date().toISOString()}\n\n`;
output += "Este reporte compara los endpoints documentados en los .docx (QUICK_REFERENCE) ";
output += "con los endpoints que realmente llama el código del frontend.\n\n";

for (const moduleName of Object.keys(docEndpoints).sort()) {
  output += `\n---\n\n## ${moduleName}\n\n`;
  output += `### Endpoints documentados en QUICK_REFERENCE.docx (${docEndpoints[moduleName].length})\n\n`;
  for (const ep of docEndpoints[moduleName]) {
    output += `- \`${ep}\`\n`;
  }
}

// Frontend endpoints (todos)
output += `\n---\n\n## Frontend — endpoints que usa apiClient (deduplicados)\n\n`;
output += `Total: ${frontendEndpoints.size} paths únicos\n\n`;
const sortedPaths = [...frontendEndpoints.keys()].sort();
for (const path of sortedPaths) {
  const methods = [...frontendEndpoints.get(path)].sort().join(", ");
  output += `- \`${methods} ${path}\`\n`;
}

writeFileSync(join(DOCS_DIR, "REPORTE_DOCS_VS_FRONTEND.md"), output, "utf8");
console.log(`✓ Reporte generado: REPORTE_DOCS_VS_FRONTEND.md`);
console.log(`  - Módulos analizados: ${Object.keys(docEndpoints).length}`);
console.log(`  - Endpoints en frontend: ${frontendEndpoints.size}`);
