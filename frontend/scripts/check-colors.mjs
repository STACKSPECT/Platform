/*
 * Comprueba que no hay colores literales fuera de styles/colors.css.
 *
 * Los colores se definen en un solo archivo y el resto los consume con `var(--…)`. Sin
 * esto, la regla se rompe sola: alguien pega un #hex «solo por esta vez» y el siguiente
 * cambio de paleta deja una esquina del diseño con el color viejo.
 *
 *   node scripts/check-colors.mjs        (también corre con `npm run lint`)
 *
 * Detecta #hex, rgb()/rgba()/hsl()/hsla()/hwb()/lab()/lch()/oklab()/oklch() y colores con
 * nombre usados como valor. `transparent`, `currentColor` e `inherit` están permitidos:
 * no son un color concreto.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIRS = ["app", "components", "lib", "api", "hooks", "styles"];
const EXT = new Set([".css", ".ts", ".tsx"]);
const ALLOWED = join("styles", "colors.css");

const NAMED = "white|black|red|green|blue|yellow|orange|purple|pink|gray|grey|cyan|magenta|" +
  "silver|gold|brown|navy|teal|lime|maroon|olive|aqua|fuchsia";

const RULES = [
  { name: "#hex", re: /(?<![\w&#])#[0-9a-fA-F]{3,8}(?![\w-])/g },
  { name: "función de color", re: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g },
  // `color: red`, `fill: white`, `border-color: black`…
  { name: "color con nombre", re: new RegExp(
      `\\b(?:color|background(?:-color)?|fill|stroke|border(?:-[a-z]+)?|outline(?:-color)?)` +
      `\\s*:\\s*(?:${NAMED})\\b`, "g") },
  // `{ fill: "white" }` en un objeto de estilo de TS
  { name: "color con nombre", re: new RegExp(
      `\\b(?:color|background|backgroundColor|fill|stroke|borderColor)\\s*:\\s*["'](?:${NAMED})["']`, "g") },
  // `fill="red"`, `stroke="white"`
  { name: "color con nombre", re: new RegExp(`\\b(?:fill|stroke|color)=["'](?:${NAMED})["']`, "g") },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (EXT.has(extname(path))) out.push(path);
  }
  return out;
}

/** Quita los comentarios conservando los saltos de línea, para que los números de línea
 *  que se informan sigan siendo los del archivo. */
function stripComments(source) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\])\/\/.*$/gm, (m, pre) => pre + " ".repeat(m.length - pre.length));
}

const problems = [];
for (const dir of DIRS) {
  let files = [];
  try { files = walk(join(ROOT, dir)); } catch { continue; }
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (rel === ALLOWED) continue;
    const lines = stripComments(readFileSync(file, "utf8")).split("\n");
    lines.forEach((line, i) => {
      for (const { name, re } of RULES) {
        for (const m of line.matchAll(re)) {
          problems.push(`${rel.split(sep).join("/")}:${i + 1}  ${name}: ${m[0].trim()}`);
        }
      }
    });
  }
}

if (problems.length) {
  console.error(`Colores literales fuera de styles/colors.css (${problems.length}):\n`);
  for (const p of problems) console.error("  " + p);
  console.error("\nDefine el color como variable en styles/colors.css y usa `var(--nombre)`.");
  process.exit(1);
}
console.log("colores: ok (todo sale de styles/colors.css)");
