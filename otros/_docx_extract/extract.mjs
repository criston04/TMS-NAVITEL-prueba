// Extrae texto de los .docx ya descomprimidos
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const baseDir = resolve("./");
const folders = readdirSync(baseDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const folder of folders) {
  const xmlPath = join(baseDir, folder, "word", "document.xml");
  let xml;
  try {
    xml = readFileSync(xmlPath, "utf8");
  } catch {
    console.log(`SKIP ${folder} (no document.xml)`);
    continue;
  }

  // Reemplazar fin de párrafo y salto manual con \n
  const xmlWithBreaks = xml
    .replace(/<\/w:p>/g, "</w:p>\n")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<w:tab\/>/g, "\t");

  const lines = xmlWithBreaks.split("\n").map(line => {
    const matches = line.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    return matches
      .map(t => t.replace(/<[^>]+>/g, ""))
      .join("")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  });

  const text = lines.filter(l => l.trim() !== "").join("\n");
  writeFileSync(join(baseDir, `${folder}.txt`), text, "utf8");
  console.log(`✓ ${folder} → ${folder}.txt (${lines.filter(l => l.trim()).length} lines)`);
}
