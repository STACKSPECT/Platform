import type { Blocker, Run } from "@/lib/supabase";
import { commonSeeds, comparability } from "@/lib/supabase";
import type { FailureBreakdownRow } from "@/api/types";
import {
  TASK_TEXT, changeTone, failureColor, failureText, pct, seconds, signedNumber,
} from "@/lib/ui";

export type ComparePair = {
  runs: [Run, Run];
  /** Causas de fallo por id de run; `undefined` mientras la consulta no ha vuelto. */
  failures: Record<string, FailureBreakdownRow[] | undefined>;
};

type Header = { newer: string; base: string };

export type DeltaView = {
  label: string; value: string; unit: string; detail: string; tone: "ok" | "bad" | "muted";
};
export type BarView = {
  label: string;
  segments: Array<{ key: string; n: number; color: string; title: string }>;
};
export type LegendView = { key: string; label: string; color: string };

export type ComparisonView =
  | { kind: "empty" }
  | { kind: "blocked"; header: Header; blockers: Blocker[] }
  | {
      kind: "valid"; header: Header; descriptor: string; note: string;
      deltas: DeltaView[]; failuresTitle: string; bars: BarView[]; legend: LegendView[];
    };

/** Lo que dice la regla, para que quien ve el bloqueo entienda que no es un fallo de la
 *  pantalla sino una garantía. */
export const BLOCK_RULES = [
  "la tarea o el nivel no coinciden: el criterio de éxito es otro",
  "el rango de semillas no coincide: se compara suerte, no código",
  "una de las dos lleva oracle: esos números no son los de verdad",
  "una de las dos está sembrada: esos números no se midieron",
];

/** Un run se nombra por su commit; si no lo tiene, por su etiqueta. */
function runName(r: Run): string {
  return r.git_sha || r.label || "sin commit";
}

/** El reciente primero: «8c5cbf4 vs 6f0f534» se lee «lo nuevo contra la base». */
function newerFirst([x, y]: [Run, Run]): [Run, Run] {
  return Date.parse(x.started_at) >= Date.parse(y.started_at) ? [x, y] : [y, x];
}

/** Resta de dos valores que ya calculó la vista, no una agregación. Si falta uno, se dice. */
function delta(input: {
  label: string; newer: number | null; base: number | null; scale: number; digits: number;
  unit: string; lowerIsBetter: boolean; format: (n: number | null) => string;
}): DeltaView {
  const { label, newer, base, scale, digits, unit, lowerIsBetter, format } = input;
  const detail = `${format(base)} → ${format(newer)}`;
  if (newer == null || base == null) return { label, value: "—", unit, detail, tone: "muted" };
  const diff = (newer - base) * scale;
  return {
    label, value: signedNumber(diff, digits), unit, detail,
    tone: changeTone(diff, digits, lowerIsBetter),
  };
}

function barOf(run: Run, rows: FailureBreakdownRow[] | undefined): BarView {
  return {
    label: runName(run),
    segments: (rows ?? []).map((r) => ({
      key: r.failure, n: r.n, color: failureColor(r.failure), title: failureText(r.failure),
    })),
  };
}

/** `comparability()` devuelve la tarea como identificador; en pantalla va en castellano. */
function translate(b: Blocker): Blocker {
  // El campo llega en versal («TAREA»): en pantalla va en minúscula normal, como el resto.
  const field = b.field.charAt(0) + b.field.slice(1).toLowerCase();
  return b.field === "TAREA"
    ? { ...b, field, a: TASK_TEXT[b.a] ?? b.a, b: TASK_TEXT[b.b] ?? b.b }
    : { ...b, field };
}

export function buildComparison(pair: ComparePair | null): ComparisonView {
  if (!pair) return { kind: "empty" };
  const [newer, base] = newerFirst(pair.runs);
  const header = { newer: runName(newer), base: runName(base) };

  const blockers = comparability(newer, base);
  if (blockers.length) return { kind: "blocked", header, blockers: blockers.map(translate) };

  const bars = [barOf(newer, pair.failures[newer.id]), barOf(base, pair.failures[base.id])];
  const seen = new Set<string>();
  const legend = bars.flatMap((b) => b.segments)
    .filter((s) => !seen.has(s.key) && seen.add(s.key))
    .map((s) => ({ key: s.key, label: s.title, color: s.color }));

  return {
    kind: "valid",
    header,
    descriptor: [
      TASK_TEXT[newer.task] ?? newer.task,
      `nivel ${newer.level}`,
      `semillas ${newer.seed_min}-${newer.seed_max}`,
      `x${newer.motion_speed}`,
      newer.oracle ? "con oracle" : "sin oracle",
      newer.synthetic ? "datos sembrados" : null,
    ].filter(Boolean).join(" · "),
    note: `mismas ${commonSeeds(newer, base)} semillas en ambas`,
    deltas: [
      delta({ label: "Tasa de éxito", newer: newer.success_rate, base: base.success_rate,
              scale: 100, digits: 0, unit: "puntos", lowerIsBetter: false, format: (n) => pct(n) }),
      delta({ label: "Tiempo de ciclo", newer: newer.median_cycle_s, base: base.median_cycle_s,
              scale: 1, digits: 1, unit: "s / paquete", lowerIsBetter: true,
              format: (n) => seconds(n) }),
    ],
    failuresTitle:
      `Causas de fallo · ${newer.episodes - newer.successes} vs ${base.episodes - base.successes} episodios fallidos`,
    bars,
    legend,
  };
}
