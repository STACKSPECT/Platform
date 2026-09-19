"use client";

import Link from "next/link";
import { comparability, commonSeeds, type Run, type SeedPoint } from "@/lib/supabase";
import {
  TASK_TEXT, failureColor, failureText, pct, relativeTime, seconds, signedMm,
  stabilityState,
} from "@/lib/ui";
import { Sparkline } from "@/components/primitives";

/* ── tabla de ejecuciones ───────────────────────────────────────────────── */

export function RunTable({ runs, selected, onToggle }: {
  runs: Run[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const th: React.CSSProperties = {
    textAlign: "left", padding: "10px 12px", whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)", position: "sticky", top: 0,
    background: "var(--surface)", zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: "9px 12px", borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap",
  };

  return (
    <div className="card" style={{ minHeight: 0 }}>
      <div style={{ overflow: "auto", minHeight: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr className="label">
              <th style={{ ...th, width: 34 }} />
              <th style={th}>Commit</th>
              <th style={th}>Tarea</th>
              <th style={th}>Nivel</th>
              <th style={th}>Vel</th>
              <th style={th}>Episodios</th>
              <th style={th}>Éxito</th>
              <th style={th}>Éxito por episodio</th>
              <th style={th}>Ciclo</th>
              <th style={th}>Causa dominante</th>
              <th style={th}>Cuándo</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => {
              const on = selected.includes(r.id);
              return (
                <tr key={r.id}
                    style={{
                      background: on ? "rgba(91,157,217,0.10)"
                        : i % 2 ? "var(--row-alt)" : "transparent",
                      // El azul acero solo marca selección. Es justo su trabajo aquí.
                      boxShadow: on ? "inset 3px 0 0 var(--select)" : undefined,
                    }}>
                  <td style={{ ...td, textAlign: "center" }}>
                    <input
                      id={`cmp-${r.id}`}
                      type="checkbox"
                      checked={on}
                      onChange={() => onToggle(r.id)}
                      aria-label={`Seleccionar ${r.git_sha} para comparar`}
                      style={{ accentColor: "var(--select)" }}
                    />
                  </td>
                  <td className="num" style={td}>
                    <Link href={`/runs/${r.id}`}>{r.git_sha || "—"}</Link>
                    {r.oracle && <Flag color="var(--oracle)" title="oracle" />}
                    {r.synthetic && <Flag color="var(--synthetic)" title="sembrado" />}
                  </td>
                  <td style={td}>{TASK_TEXT[r.task] ?? r.task}</td>
                  <td className="num" style={td}>{r.level}</td>
                  <td className="num" style={td}>x{r.motion_speed}</td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>{r.episodes}</td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>
                    {pct(r.success_rate)}
                  </td>
                  <td style={td}><Sparkline series={r.seed_series ?? []} /></td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>
                    {seconds(r.median_cycle_s)}
                  </td>
                  <td style={{ ...td, color: "var(--text-2)" }}>
                    {r.dominant_failure ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 10, height: 10, flexShrink: 0,
                          background: failureColor(r.dominant_failure),
                        }} />
                        {failureText(r.dominant_failure)}
                      </span>
                    ) : <span style={{ color: "var(--text-5)" }}>sin fallos</span>}
                  </td>
                  <td style={{ ...td, color: "var(--text-4)" }}>
                    {relativeTime(r.started_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Flag({ color, title }: { color: string; title: string }) {
  return (
    <span title={title}
          style={{
            display: "inline-block", width: 7, height: 7, marginLeft: 7,
            background: color, verticalAlign: "middle",
          }} />
  );
}

/* ── comparador ─────────────────────────────────────────────────────────── */

/**
 * El delta entre dos ejecuciones, o el motivo por el que no se puede calcular.
 *
 * Bloquear la comparación no es una validación de formulario: es la pieza que impide
 * enseñar un gráfico bonito y falso. Comparar dos runs que no miden lo mismo da un
 * número que parece una mejora y no lo es, y ése es justo el error que el jurado va a
 * buscar.
 */
export function ComparePanel({ a, b, onClear }: {
  a: Run; b: Run; onClear: () => void;
}) {
  const blockers = comparability(a, b);
  const valid = blockers.length === 0;

  return (
    <div className="card" style={{ flexShrink: 0 }}>
      <div style={{
        minHeight: 46, padding: "8px 16px", display: "flex", alignItems: "center",
        gap: 14, borderBottom: "1px solid var(--border-soft)", flexWrap: "wrap",
      }}>
        <span className="label">Comparativa</span>
        <span className="num" style={{ fontSize: 14 }}>{a.git_sha}</span>
        <span style={{ color: "var(--text-4)", fontSize: 12 }}>vs</span>
        <span className="num" style={{ fontSize: 14 }}>{b.git_sha}</span>
        <span style={{ flexGrow: 1 }} />
        <span className="label" style={{
          color: valid ? "var(--ok)" : "var(--bad)",
          border: `1px solid ${valid ? "var(--ok)" : "var(--bad)"}`,
          padding: "3px 9px",
        }}>
          {valid ? "Comparación válida" : "No comparable"}
        </span>
        <button onClick={onClear} style={{ color: "var(--select)", fontSize: 13 }}>
          {valid ? "Limpiar" : "Cambiar selección"}
        </button>
      </div>

      {valid ? (
        <div style={{ padding: 18, display: "flex", gap: 42, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--text-3)", width: "100%" }}>
            {TASK_TEXT[a.task] ?? a.task} · nivel {a.level} · semillas {a.seed_min}–{a.seed_max}
            {" "}· x{a.motion_speed} · sin oracle ·{" "}
            <span style={{ color: "var(--ok)" }}>
              mismas {commonSeeds(a, b)} semillas en ambas
            </span>
          </span>
          <Delta label="Tasa de éxito"
                 value={((b.success_rate ?? 0) - (a.success_rate ?? 0)) * 100}
                 unit="puntos" digits={0}
                 detail={`${pct(a.success_rate)} → ${pct(b.success_rate)}`} />
          <Delta label="Tiempo de ciclo"
                 value={(b.median_cycle_s ?? 0) - (a.median_cycle_s ?? 0)}
                 unit="s / paquete" digits={1} lowerIsBetter
                 detail={`${seconds(a.median_cycle_s)} → ${seconds(b.median_cycle_s)}`} />
          <Delta label="Margen mediano"
                 value={((b.median_stability_m ?? 0) - (a.median_stability_m ?? 0)) * 1000}
                 unit="mm" digits={0}
                 detail={`${signedMm(a.median_stability_m)} → ${signedMm(b.median_stability_m)}`} />
        </div>
      ) : (
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={{ fontSize: 14 }}>Estas dos ejecuciones no miden lo mismo</span>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {blockers.map((x) => (
                  <tr key={x.field}>
                    <td className="label" style={{ padding: "6px 16px 6px 0" }}>{x.field}</td>
                    <td className="num" style={{ padding: "6px 16px 6px 0" }}>{x.a}</td>
                    <td className="num" style={{ padding: "6px 16px 6px 0" }}>{x.b}</td>
                    <td style={{ padding: "6px 0", color: "var(--text-3)" }}>{x.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{
            borderTop: "1px solid var(--border-soft)", paddingTop: 12,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <span className="label">La comparación se bloquea cuando</span>
            {[
              "la tarea o el nivel no coinciden: el criterio de éxito es otro",
              "el rango de semillas no coincide: se compara suerte, no código",
              "una de las dos lleva oracle: esos números no son los de verdad",
              "una de las dos está sembrada: esos números no se midieron",
            ].map((t) => (
              <span key={t} style={{ fontSize: 12.5, color: "var(--text-3)" }}>— {t}</span>
            ))}
            <span style={{ fontSize: 12.5, color: "var(--text-4)", marginTop: 4 }}>
              Con las semillas en común se puede ver el subconjunto, nunca el delta agregado.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Delta({ label, value, unit, digits, detail, lowerIsBetter }: {
  label: string; value: number; unit: string; digits: number;
  detail: string; lowerIsBetter?: boolean;
}) {
  const better = lowerIsBetter ? value < 0 : value > 0;
  const color = Math.abs(value) < 1e-9 ? "var(--text-3)"
    : better ? "var(--ok)" : "var(--bad)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span className="label">{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span className="num" style={{ fontSize: 30, fontWeight: 500, color }}>
          {value >= 0 ? "+" : "−"}{Math.abs(value).toFixed(digits)}
        </span>
        <span className="unit" style={{ fontSize: 13 }}>{unit}</span>
      </span>
      <span className="num" style={{ fontSize: 12, color: "var(--text-4)" }}>{detail}</span>
    </div>
  );
}

/* ── rejilla de semillas ────────────────────────────────────────────────── */

/** Una celda por semilla. Enseña de un vistazo si el fallo se concentra o está
 *  repartido, que es lo que decide si el problema es el código o el rango. */
export function SeedGrid({ series, runId }: { series: SeedPoint[]; runId: string }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
      gap: 6, padding: 16,
    }}>
      {series.map((s) => {
        const color = s.status === "success"
          ? `var(--${stabilityState(s.stability)})` : failureColor(s.failure);
        return (
          <Link key={s.seed} href={`/runs/${runId}/${s.seed}`}
                style={{
                  border: "1px solid var(--border)", padding: "7px 9px",
                  display: "flex", flexDirection: "column", gap: 3,
                  boxShadow: `inset 3px 0 0 ${color}`, color: "inherit",
                }}>
            <span className="num" style={{ fontSize: 11, color: "var(--text-4)" }}>
              s{s.seed}
            </span>
            <span className="num" style={{ fontSize: 13, color }}>
              {signedMm(s.stability)}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-4)" }}>
              {s.status === "success" ? seconds(s.cycle_s) : failureText(s.failure)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ── desglose de causas ─────────────────────────────────────────────────── */

export function FailureBars({ series, total }: { series: SeedPoint[]; total: number }) {
  const counts = new Map<string, number>();
  for (const s of series) {
    if (s.failure) counts.set(s.failure, (counts.get(s.failure) ?? 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) {
    return (
      <div style={{ padding: 16, fontSize: 13, color: "var(--ok)" }}>
        Ningún episodio falló.
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => r[1]));

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 9 }}>
      <span className="label">
        Causas de fallo · {rows.reduce((n, r) => n + r[1], 0)} de {total}
      </span>
      {rows.map(([failure, n]) => (
        <div key={failure} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 190, fontSize: 13, flexShrink: 0 }}>
            {failureText(failure)}
          </span>
          <div style={{ flex: 1, height: 14, background: "var(--row-alt)", minWidth: 60 }}>
            <div style={{
              width: `${(n / max) * 100}%`, height: "100%",
              background: failureColor(failure),
            }} />
          </div>
          <span className="num" style={{ width: 26, textAlign: "right", fontSize: 13 }}>
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}
