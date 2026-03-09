/**
 * generate-word-all.mjs
 * ─────────────────────
 * Script unificado: lee cualquier *_QUICK_REFERENCE.md, renderiza diagramas
 * Mermaid a PNG (alta res) y genera un Word (.docx) profesional.
 *
 * Reemplaza los 3 scripts anteriores (generate-word.mjs, generate-word-scheduling.mjs,
 * generate-word-route-planner.mjs) con auto-discovery y auto-extract.
 *
 * Uso:
 *   node scripts/generate-word-all.mjs ORDERS          # genera ORDERS_QUICK_REFERENCE.docx
 *   node scripts/generate-word-all.mjs MONITORING       # genera MONITORING_QUICK_REFERENCE.docx
 *   node scripts/generate-word-all.mjs --all            # genera TODOS los .docx
 *   node scripts/generate-word-all.mjs --list           # lista modulos disponibles
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle,
  ImageRun, PageBreak, Header, Footer,
  PageNumber, ShadingType,
  convertInchesToTwip,
} from "docx";

// ── Config ──────────────────────────────────────────────────────────────────
const ROOT = path.resolve(import.meta.dirname, "..");
const MMDC = path.join(ROOT, "node_modules", ".bin", "mmdc");

// Color palette
const NAVY       = "1B2A4A";
const BLUE       = "2563EB";
const HEADER_BG  = "1E3A5F";
const WHITE      = "FFFFFF";
const GRAY       = "6B7280";
const LIGHT_GRAY = "F3F4F6";
const BORDER_CLR = "D1D5DB";

// ── Auto-discovery ──────────────────────────────────────────────────────────

/**
 * Escanea la raiz del proyecto buscando *_QUICK_REFERENCE.md
 * Retorna Map<MODULE_KEY, filepath>
 *   Ej: "ORDERS" => "C:/.../ORDERS_QUICK_REFERENCE.md"
 */
function discoverModules() {
  const files = fs.readdirSync(ROOT).filter(f => f.endsWith("_QUICK_REFERENCE.md"));
  const map = new Map();
  for (const f of files) {
    const key = f.replace("_QUICK_REFERENCE.md", "");
    map.set(key, path.join(ROOT, f));
  }
  return map;
}

// ── Auto-extract metadata from markdown ─────────────────────────────────────

/**
 * Extrae del markdown:
 *  - moduleName:  Nombre legible del modulo (de la primera linea que diga "Modulo X" o del H1)
 *  - tocEntries:  Entradas para el indice (de los headings # N. ...)
 *  - sourceNote:  Nota "Basado en:" (de la primera linea que tenga "Basado en" o default)
 */
function extractMetadata(mdText, moduleKey) {
  const lines = mdText.split("\n");

  // 1) Module name — buscar patron "# ... Quick Reference — Modulo de X"
  //    o "# ... Quick Reference — Modulo X"
  //    Fallback: usar el key humanizado
  let moduleName = moduleKey.charAt(0) + moduleKey.slice(1).toLowerCase();
  for (const line of lines.slice(0, 20)) {
    // Patron: "# ... Modulo de Ordenes" o "Modulo Planificador de Rutas"
    const match = line.match(/Quick\s+Reference\s*(?:--|—|:)\s*(.+)/i);
    if (match) {
      moduleName = match[1].trim();
      break;
    }
  }

  // 2) TOC entries — headings de nivel 1 con patron "# N. Titulo"
  const tocEntries = [];
  for (const line of lines) {
    const tocMatch = line.match(/^#\s+(\d+\.\s+.+)/);
    if (tocMatch) {
      tocEntries.push(tocMatch[1].replace(/\*\*/g, "").trim());
    }
  }

  // 3) Source note — buscar "Basado en:" en el texto
  let sourceNote = `Basado en: ${moduleKey}_QUICK_REFERENCE.md`;
  for (const line of lines.slice(0, 30)) {
    if (line.includes("Basado en:") || line.includes("Basado en :")) {
      const srcMatch = line.match(/Basado en\s*:\s*(.+)/i);
      if (srcMatch) {
        sourceNote = `Basado en: ${srcMatch[1].trim()}`;
        break;
      }
    }
  }

  return { moduleName, tocEntries, sourceNote };
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function renderMermaid(code, outPng) {
  const tmpMmd = outPng.replace(/\.png$/, ".mmd");
  fs.writeFileSync(tmpMmd, code, "utf-8");
  try {
    execSync(
      `"${MMDC}" -i "${tmpMmd}" -o "${outPng}" -w 1600 -b transparent --scale 2 -t default`,
      { stdio: "pipe", timeout: 60_000 }
    );
  } catch {
    try {
      execSync(
        `"${MMDC}" -i "${tmpMmd}" -o "${outPng}" -w 1600 -b white --scale 2 -t neutral`,
        { stdio: "pipe", timeout: 60_000 }
      );
    } catch {
      console.warn(`  ! Could not render ${path.basename(outPng)}, skipping image`);
      fs.unlinkSync(tmpMmd);
      return null;
    }
  }
  fs.unlinkSync(tmpMmd);
  return outPng;
}

// ── Parse markdown ──────────────────────────────────────────────────────────
function parseMd(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  let diagramIdx = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Mermaid code block
    if (line.trim().startsWith("```mermaid")) {
      let code = "";
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      i++;
      blocks.push({ type: "mermaid", code: code.trim(), diagramIndex: diagramIdx++ });
      continue;
    }

    // SQL code block
    if (line.trim().startsWith("```sql")) {
      let code = "";
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code += lines[i] + "\n";
        i++;
      }
      i++;
      blocks.push({ type: "code", code: code.trim(), lang: "sql" });
      continue;
    }

    // Other code blocks (skip)
    if (line.trim().startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) i++;
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && line.trim().startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s\-:|]+\|$/))
        .map(l => l.split("|").slice(1, -1).map(c => c.trim()));
      if (rows.length > 0) {
        blocks.push({ type: "table", rows });
      }
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].replace(/\*\*/g, "").trim();
      blocks.push({ type: "heading", level, content: text });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      let quoteText = "";
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteText += lines[i].replace(/^>\s?/, "") + "\n";
        i++;
      }
      blocks.push({ type: "blockquote", content: quoteText.trim() });
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      let para = line;
      i++;
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith("#") &&
        !lines[i].trim().startsWith("|") &&
        !lines[i].trim().startsWith(">") &&
        !lines[i].trim().startsWith("```") &&
        !lines[i].trim().startsWith("---")
      ) {
        para += " " + lines[i].trim();
        i++;
      }
      blocks.push({ type: "paragraph", content: para.trim() });
      continue;
    }

    i++;
  }

  return { blocks, totalDiagrams: diagramIdx };
}

// ── Build docx elements ─────────────────────────────────────────────────────

function richText(text, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({
        text: part.slice(2, -2),
        bold: true,
        font: opts.font || "Segoe UI",
        size: opts.size || 20,
        color: opts.color || "000000",
      }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(new TextRun({
        text: part.slice(1, -1),
        font: "Consolas",
        size: opts.size ? opts.size - 2 : 18,
        color: BLUE,
        shading: { type: ShadingType.CLEAR, fill: LIGHT_GRAY },
      }));
    } else {
      runs.push(new TextRun({
        text: part,
        font: opts.font || "Segoe UI",
        size: opts.size || 20,
        color: opts.color || "333333",
        ...(opts.bold ? { bold: true } : {}),
        ...(opts.italics ? { italics: true } : {}),
      }));
    }
  }
  return runs;
}

function makeTableCell(text, isHeader = false, opts = {}) {
  const shading = isHeader
    ? { type: ShadingType.CLEAR, fill: HEADER_BG, color: WHITE }
    : opts.shading || undefined;

  return new TableCell({
    children: [
      new Paragraph({
        children: richText(text, {
          size: isHeader ? 18 : 17,
          bold: isHeader,
          color: isHeader ? WHITE : "333333",
          font: "Segoe UI",
        }),
        spacing: { before: 40, after: 40 },
        alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
      }),
    ],
    shading,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
      left:   { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
      right:  { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
    },
  });
}

function makeTable(rows) {
  if (!rows || rows.length === 0) return null;

  const numCols = Math.max(...rows.map(r => r.length));
  const tableRows = rows.map((row, ri) => {
    const cells = [];
    for (let c = 0; c < numCols; c++) {
      const text = row[c] || "";
      const isHeader = ri === 0;
      const altRow = !isHeader && ri % 2 === 0;
      cells.push(makeTableCell(text, isHeader, {
        shading: altRow ? { type: ShadingType.CLEAR, fill: "F8FAFC" } : undefined,
      }));
    }
    return new TableRow({ children: cells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function makeImage(pngPath, caption) {
  if (!pngPath || !fs.existsSync(pngPath)) return [];
  const imgBuf = fs.readFileSync(pngPath);

  let widthPx = 1600, heightPx = 900;
  if (imgBuf.length > 24 && imgBuf[0] === 0x89 && imgBuf[1] === 0x50) {
    widthPx = imgBuf.readUInt32BE(16);
    heightPx = imgBuf.readUInt32BE(20);
  }

  const maxWidthInches = 6.3;
  const maxHeightInches = 7.5;
  const dpi = 150;
  let w = widthPx / dpi;
  let h = heightPx / dpi;

  if (w > maxWidthInches) {
    const ratio = maxWidthInches / w;
    w = maxWidthInches;
    h = h * ratio;
  }
  if (h > maxHeightInches) {
    const ratio = maxHeightInches / h;
    h = maxHeightInches;
    w = w * ratio;
  }

  const elements = [];
  elements.push(
    new Paragraph({
      children: [
        new ImageRun({
          data: imgBuf,
          transformation: {
            width: Math.round(w * 96),
            height: Math.round(h * 96),
          },
          type: "png",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    })
  );

  if (caption) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: caption,
            font: "Segoe UI",
            size: 16,
            color: GRAY,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  return elements;
}

/**
 * Auto-genera captions para diagramas Mermaid basandose en el heading
 * inmediatamente anterior a cada bloque mermaid en el markdown.
 */
function extractDiagramCaptions(mdText, totalDiagrams) {
  const lines = mdText.split("\n");
  const captions = [];
  let figNum = 0;
  let lastHeading = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track last heading
    const hMatch = line.match(/^#{1,4}\s+(.+)/);
    if (hMatch) {
      lastHeading = hMatch[1].replace(/\*\*/g, "").trim();
    }

    // When we find a mermaid block, use the last heading as caption context
    if (line.trim().startsWith("```mermaid")) {
      figNum++;
      captions.push(`Fig ${figNum}. ${lastHeading}`);
      // Skip past the mermaid block
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) i++;
    }
  }

  // Pad if we somehow missed some
  while (captions.length < totalDiagrams) {
    captions.push(`Fig ${captions.length + 1}. Diagrama ${captions.length + 1}`);
  }

  return captions;
}

// ── Generate document for a single module ───────────────────────────────────

async function generateModule(moduleKey, mdFilePath) {
  const outFile  = mdFilePath.replace(".md", ".docx");
  const imgDir   = path.join(ROOT, `temp_mermaid_imgs_${moduleKey.toLowerCase()}`);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Generando: ${moduleKey}_QUICK_REFERENCE.docx`);
  console.log(`${"=".repeat(60)}`);

  // Read markdown
  console.log(`  Leyendo ${path.basename(mdFilePath)}...`);
  const mdText = fs.readFileSync(mdFilePath, "utf-8");
  const { blocks, totalDiagrams } = parseMd(mdText);

  // Extract metadata
  const { moduleName, tocEntries, sourceNote } = extractMetadata(mdText, moduleKey);
  console.log(`  Modulo: ${moduleName}`);
  console.log(`  TOC entries: ${tocEntries.length}`);
  console.log(`  Diagramas Mermaid: ${totalDiagrams}`);

  // Auto-extract diagram captions
  const diagramCaptions = extractDiagramCaptions(mdText, totalDiagrams);

  // Render Mermaid diagrams
  ensureDir(imgDir);
  console.log(`  Renderizando ${totalDiagrams} diagramas a PNG...`);

  const pngPaths = {};
  const mermaidBlocks = blocks.filter(b => b.type === "mermaid");
  for (const blk of mermaidBlocks) {
    const idx = blk.diagramIndex;
    const outPng = path.join(imgDir, `diagram_${String(idx).padStart(2, "0")}.png`);
    process.stdout.write(`    Diagrama ${idx + 1}/${totalDiagrams}... `);
    const result = renderMermaid(blk.code, outPng);
    if (result) {
      pngPaths[idx] = result;
      console.log("OK");
    } else {
      console.log("SKIP");
    }
  }

  // Build document children
  console.log("  Construyendo documento Word...");
  const docChildren = [];
  let sectionNum = 0;

  // ── Title page ──────────────────────────────────────────────────────────
  docChildren.push(
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({
      children: [new TextRun({
        text: "REFERENCIA RAPIDA",
        font: "Segoe UI",
        size: 56,
        bold: true,
        color: NAVY,
      })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({
        text: moduleName,
        font: "Segoe UI",
        size: 44,
        color: BLUE,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "\u2501".repeat(34),
        font: "Segoe UI",
        size: 24,
        color: BORDER_CLR,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 300 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "TMS Navitel \u00B7 Cheat Sheet para Desarrollo",
        font: "Segoe UI",
        size: 28,
        color: GRAY,
      })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({
        text: sourceNote,
        font: "Segoe UI",
        size: 22,
        color: GRAY,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "Febrero 2026",
        font: "Segoe UI",
        size: 22,
        color: GRAY,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: "Proposito: Consulta rapida para desarrolladores frontend y backend.",
        font: "Segoe UI",
        size: 20,
        color: GRAY,
        italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  // ── Table of Contents ─────────────────────────────────────────────────
  docChildren.push(
    new Paragraph({
      children: [new TextRun({
        text: "INDICE DE CONTENIDO",
        font: "Segoe UI",
        size: 32,
        bold: true,
        color: NAVY,
      })],
      spacing: { before: 200, after: 400 },
    })
  );

  for (const entry of tocEntries) {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: entry,
            font: "Segoe UI",
            size: 22,
            color: "333333",
          }),
        ],
        spacing: { before: 80, after: 80 },
        indent: { left: convertInchesToTwip(0.3) },
      })
    );
  }

  docChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // ── Process blocks ────────────────────────────────────────────────────
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        const isMainSection = block.level === 1 && /^\d+\.?\s/.test(block.content);
        if (isMainSection) {
          sectionNum++;
          if (sectionNum > 1) {
            docChildren.push(new Paragraph({ children: [new PageBreak()] }));
          }
        }

        const levelMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
        };
        const sizeMap = { 1: 32, 2: 28, 3: 24, 4: 22 };
        const colorMap = { 1: NAVY, 2: NAVY, 3: BLUE, 4: GRAY };

        docChildren.push(
          new Paragraph({
            children: [new TextRun({
              text: block.content,
              font: "Segoe UI",
              size: sizeMap[block.level] || 22,
              bold: true,
              color: colorMap[block.level] || "333333",
            })],
            heading: levelMap[block.level] || HeadingLevel.HEADING_4,
            spacing: { before: 200, after: 120 },
          })
        );
        break;
      }

      case "paragraph": {
        docChildren.push(
          new Paragraph({
            children: richText(block.content),
            spacing: { before: 60, after: 60 },
          })
        );
        break;
      }

      case "blockquote": {
        docChildren.push(
          new Paragraph({
            children: richText(block.content, {
              size: 19,
              color: "555555",
              italics: true,
            }),
            indent: { left: convertInchesToTwip(0.3) },
            spacing: { before: 80, after: 80 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 8 },
            },
          })
        );
        break;
      }

      case "table": {
        const tbl = makeTable(block.rows);
        if (tbl) {
          docChildren.push(
            new Paragraph({ spacing: { before: 80 } }),
            tbl,
            new Paragraph({ spacing: { after: 80 } })
          );
        }
        break;
      }

      case "mermaid": {
        const idx = block.diagramIndex;
        const pngPath = pngPaths[idx];
        const caption = diagramCaptions[idx] || `Diagrama ${idx + 1}`;
        const imgElements = makeImage(pngPath, caption);
        docChildren.push(...imgElements);
        break;
      }

      case "code": {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({
              text: block.code,
              font: "Consolas",
              size: 16,
              color: "2D3748",
            })],
            shading: { type: ShadingType.CLEAR, fill: "F7FAFC" },
            spacing: { before: 80, after: 80 },
            indent: { left: convertInchesToTwip(0.2) },
          })
        );
        break;
      }

      case "hr": {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: "" })],
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
            },
            spacing: { before: 100, after: 100 },
          })
        );
        break;
      }
    }
  }

  // ── Footer note ─────────────────────────────────────────────────────────
  docChildren.push(
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: richText(
        `**Nota:** Este documento es una referencia operativa para desarrollo frontend y backend. Para detalles completos, consultar ${moduleKey}_QUICK_REFERENCE.md.`,
        { size: 18, color: GRAY }
      ),
      spacing: { before: 100, after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR, space: 8 },
      },
    })
  );

  // ── Create document ─────────────────────────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Segoe UI", size: 20 },
        },
        heading1: {
          run: { font: "Segoe UI", size: 32, bold: true, color: NAVY },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        heading2: {
          run: { font: "Segoe UI", size: 28, bold: true, color: NAVY },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
        heading3: {
          run: { font: "Segoe UI", size: 24, bold: true, color: BLUE },
          paragraph: { spacing: { before: 160, after: 80 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `TMS Navitel \u2014 Referencia Rapida: ${moduleName}`,
                    font: "Segoe UI",
                    size: 16,
                    color: GRAY,
                    italics: true,
                  }),
                ],
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
                },
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Febrero 2026 \u00B7 v4.0",
                    font: "Segoe UI",
                    size: 16,
                    color: GRAY,
                  }),
                  new TextRun({ text: "          " }),
                  new TextRun({
                    children: ["Pagina ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES],
                    font: "Segoe UI",
                    size: 16,
                    color: GRAY,
                  }),
                ],
                alignment: AlignmentType.CENTER,
                border: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_CLR },
                },
              }),
            ],
          }),
        },
        children: docChildren,
      },
    ],
  });

  // ── Write file ──────────────────────────────────────────────────────────
  console.log("  Generando archivo .docx...");
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buf);

  // ── Cleanup ─────────────────────────────────────────────────────────────
  console.log("  Limpiando archivos temporales...");
  if (fs.existsSync(imgDir)) {
    fs.rmSync(imgDir, { recursive: true, force: true });
  }

  const sizeKB = (buf.length / 1024).toFixed(0);
  console.log(`  OK -> ${path.basename(outFile)} (${sizeKB} KB)`);
  return { file: outFile, size: sizeKB };
}

// ── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
  generate-word-all.mjs — Generador unificado de Word para TMS Navitel

  Uso:
    node scripts/generate-word-all.mjs <MODULO>     Genera un solo .docx
    node scripts/generate-word-all.mjs --all         Genera TODOS los .docx
    node scripts/generate-word-all.mjs --list        Lista modulos disponibles

  Ejemplos:
    node scripts/generate-word-all.mjs ORDERS
    node scripts/generate-word-all.mjs MONITORING
    node scripts/generate-word-all.mjs --all
`);
    process.exit(0);
  }

  const modules = discoverModules();

  // --list
  if (args.includes("--list")) {
    console.log(`\n  Modulos disponibles (${modules.size}):\n`);
    for (const [key, filePath] of modules) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(0);
      const hasDocx = fs.existsSync(filePath.replace(".md", ".docx"));
      console.log(`    ${key.padEnd(20)} ${sizeKB.padStart(5)} KB   ${hasDocx ? "[.docx existe]" : "[sin .docx]"}`);
    }
    console.log();
    process.exit(0);
  }

  // --all
  if (args.includes("--all")) {
    console.log(`\n  Generando ${modules.size} documentos Word...\n`);
    const results = [];
    for (const [key, filePath] of modules) {
      try {
        const result = await generateModule(key, filePath);
        results.push({ key, ...result, status: "OK" });
      } catch (err) {
        console.error(`  ERROR en ${key}: ${err.message}`);
        results.push({ key, status: "ERROR", error: err.message });
      }
    }

    // Summary
    console.log(`\n${"=".repeat(60)}`);
    console.log("  RESUMEN DE GENERACION");
    console.log(`${"=".repeat(60)}`);
    for (const r of results) {
      const icon = r.status === "OK" ? "OK" : "!!";
      console.log(`  [${icon}] ${r.key.padEnd(20)} ${r.status === "OK" ? `${r.size} KB` : r.error}`);
    }
    const ok = results.filter(r => r.status === "OK").length;
    const fail = results.filter(r => r.status !== "OK").length;
    console.log(`\n  Total: ${ok} exitosos, ${fail} fallidos de ${results.length}\n`);
    process.exit(fail > 0 ? 1 : 0);
  }

  // Single module
  const moduleKey = args[0].toUpperCase();
  if (!modules.has(moduleKey)) {
    console.error(`\n  Error: Modulo "${moduleKey}" no encontrado.`);
    console.error(`  Disponibles: ${[...modules.keys()].join(", ")}`);
    console.error(`  Usa --list para ver todos.\n`);
    process.exit(1);
  }

  try {
    await generateModule(moduleKey, modules.get(moduleKey));
    console.log("\n  Completado.\n");
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
