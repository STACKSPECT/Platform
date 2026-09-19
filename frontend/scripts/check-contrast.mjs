/*
 * Comprueba el contraste (WCAG 2.x) de los pares de color que llevan texto, en los dos
 * temas de styles/colors.css. Un gris que «se ve bien» en el portátil de quien lo eligió
 * puede no leerse en la pantalla de la sala.
 *
 *   node scripts/check-contrast.mjs        (también corre con `npm run lint`)
 *
 * Texto: 4.5:1. Elementos gráficos con significado (estado, selección): 3:1.
 */

import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles/colors.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

/** Variables de un bloque, sin resolver `var()` (los valores de la capa base son #hex). */
function block(selectorStart) {
  const i = css.indexOf(selectorStart);
  const body = css.slice(css.indexOf("{", i) + 1, css.indexOf("\n}", i));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b/g)]
    .map((m) => [m[1], m[2]]));
}

const themes = {
  claro: block(":root,\n:root[data-theme=\"light\"]"),
  oscuro: block(":root[data-theme=\"dark\"]"),
};

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = ["--text", "--text-2", "--text-3", "--text-4", "--link", "--ok", "--warn", "--bad",
  "--oracle", "--synthetic"];
const GRAPHIC = ["--select", "--control-border"];
const failures = [];
let checked = 0;

for (const [name, t] of Object.entries(themes)) {
  const check = (fg, bg, min) => {
    checked++;
    const r = ratio(t[fg], t[bg]);
    if (r < min) failures.push(`${name}: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (mínimo ${min})`);
  };
  for (const fg of TEXT) for (const bg of ["--bg", "--surface"]) check(fg, bg, 4.5);
  for (const fg of GRAPHIC) for (const bg of ["--bg", "--surface"]) check(fg, bg, 3);
  check("--on-select", "--select", 4.5);
}

if (failures.length) {
  console.error(`Contraste insuficiente (${failures.length}):\n`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log(`contraste: ok (${checked} pares, 2 temas)`);
