"use client";

import { useState } from "react";
import type { Placement, PalletState, RunEvent } from "@/lib/supabase";
import {
  EVENT_TEXT, deg, kg, mm, pct, seconds, signedMm, stabilityState,
} from "@/lib/ui";

/* Color de cada tipo de evento, para la leyenda de la línea de tiempo. */
const EVENT_COLOR: Record<string, string> = {
  perceive: "var(--text-4)",
  plan: "var(--select)",
  pick: "var(--text-3)",
  place: "var(--ok)",
  settle: "var(--text-3)",
  fail: "var(--bad)",
};

/* ── traza del centro de gravedad ───────────────────────────────────────── */

/**
 * Margen de estabilidad paquete a paquete, con la banda de tolerancia de fondo.
 *
 * Es el gráfico que gana puntos: en un episodio que acaba en derrumbe se ve venir el
 * fallo varias colocaciones antes, porque la curva ya venía bajando. Un número final
 * no enseña eso.
 */
export function CogTrace({ states, height = 220, cursor }: {
  states: PalletState[]; height?: number; cursor?: number;
}) {
  const w = 520;
  const padL = 46, padR = 14, padT = 16, padB = 26;
  if (!states.length) return null;

  const margins = states.map((s) => (s.stability_margin_m ?? 0) * 1000);
  const hi = Math.max(60, ...margins) * 1.1;
  const lo = Math.min(-30, ...margins) * 1.1;

  const X = (i: number) =>
    padL + (states.length === 1 ? 0 : (i / (states.length - 1)) * (w - padL - padR));
  const Y = (v: number) => padT + ((hi - v) / (hi - lo)) * (height - padT - padB);

  const line = margins.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height}`} role="img"
         aria-label="Margen de estabilidad tras cada paquete colocado">
      {/* por debajo del cero el montón se cae */}
      <rect x={padL} y={Y(0)} width={w - padL - padR}
            height={Math.max(0, height - padB - Y(0))}
            fill="var(--bad)" opacity={0.08} />
      {/* margen estrecho: un paquete más en ese lado y se va */}
      <rect x={padL} y={Y(15)} width={w - padL - padR} height={Math.max(0, Y(0) - Y(15))}
            fill="var(--warn)" opacity={0.07} />

      <line x1={padL} y1={Y(0)} x2={w - padR} y2={Y(0)}
            stroke="var(--bad)" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />

      {[hi, 0, lo].map((v) => (
        <text key={v} x={padL - 8} y={Y(v) + 3.5} textAnchor="end" fontSize={9.5}
              fill="var(--text-5)" fontFamily="var(--font-plex-mono), monospace">
          {v > 0 ? "+" : ""}{v.toFixed(0)}
        </text>
      ))}
      <text x={padL - 8} y={padT - 4} textAnchor="end" fontSize={9}
            fill="var(--text-5)" fontFamily="var(--font-plex-mono), monospace">mm</text>

      <path d={line} fill="none" stroke="var(--select)" strokeWidth={1.8} />

      {margins.map((v, i) => (
        <circle key={i} cx={X(i)} cy={Y(v)} r={cursor === i ? 5 : 3}
                fill={`var(--${stabilityState(v / 1000)})`} />
      ))}

      <text x={padL} y={height - 7} fontSize={9.5} fill="var(--text-5)"
            fontFamily="var(--font-plex-mono), monospace">
        paquete 1
      </text>
      <text x={w - padR} y={height - 7} textAnchor="end" fontSize={9.5}
            fill="var(--text-5)" fontFamily="var(--font-plex-mono), monospace">
        paquete {states.length}
      </text>
    </svg>
  );
}

/* ── línea de tiempo ────────────────────────────────────────────────────── */

/** Scrubber sobre los eventos del episodio. Da el efecto de reproducción sin vídeo. */
export function Timeline({ events, value, onChange }: {
  events: RunEvent[]; value: number; onChange: (v: number) => void;
}) {
  const total = events.length ? events[events.length - 1].ts : 0;

  return (
    <div className="card" style={{ padding: "14px 18px", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="num" style={{ fontSize: 26, fontWeight: 500 }}>
          {value.toFixed(1)}
        </span>
        <span className="unit" style={{ fontSize: 13 }}>s</span>
        <span style={{ fontSize: 12, color: "var(--text-4)" }}>de {seconds(total)}</span>
      </div>
      <input
        id="scrubber"
        type="range"
        min={0}
        max={total || 1}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--select)" }}
        aria-label="Instante del episodio"
      />
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {Object.entries(EVENT_TEXT).map(([k, text]) => (
          <span key={k} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11.5, color: "var(--text-4)",
          }}>
            <span style={{ width: 7, height: 7, background: EVENT_COLOR[k] }} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── tabla de colocaciones ──────────────────────────────────────────────── */

type SortKey = "seq" | "error_xy_m" | "support_ratio";

/** Una fila por paquete. Es la tabla desde la que se decide qué arreglar mañana, así
 *  que ordena por error descendente de partida: lo peor, arriba. */
export function PlacementTable({ placements, states }: {
  placements: Placement[]; states: PalletState[];
}) {
  const [sort, setSort] = useState<SortKey>("error_xy_m");
  const marginBySeq = new Map(states.map((s) => [s.after_seq, s.stability_margin_m]));

  const rows = [...placements].sort((a, b) =>
    sort === "seq" ? a.seq - b.seq : (b[sort] ?? 0) - (a[sort] ?? 0));

  const th: React.CSSProperties = {
    textAlign: "left", padding: "9px 12px", whiteSpace: "nowrap",
    borderBottom: "1px solid var(--border)", position: "sticky", top: 0,
    background: "var(--surface)",
  };
  const td: React.CSSProperties = {
    padding: "8px 12px", borderBottom: "1px solid var(--border-soft)", whiteSpace: "nowrap",
  };

  return (
    <div className="card" style={{ minHeight: 0 }}>
      <div style={{
        height: 42, flexShrink: 0, padding: "0 16px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--border-soft)",
      }}>
        <span className="label">Colocaciones</span>
        <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>
          ordenado por {sort === "seq" ? "orden de colocación"
            : sort === "error_xy_m" ? "error descendente" : "soporte descendente"}
        </span>
      </div>
      <div style={{ overflow: "auto", minHeight: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr className="label">
              <th style={th}><SortBtn k="seq" sort={sort} set={setSort}>Nº</SortBtn></th>
              <th style={th}>Tipo</th>
              <th style={th}>Masa</th>
              <th style={th}>Capa</th>
              <th style={th}>
                <SortBtn k="error_xy_m" sort={sort} set={setSort}>Error xy</SortBtn>
              </th>
              <th style={th}>Yaw</th>
              <th style={th}>
                <SortBtn k="support_ratio" sort={sort} set={setSort}>Soporte</SortBtn>
              </th>
              <th style={th}>Margen</th>
              <th style={th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const margin = marginBySeq.get(p.seq) ?? null;
              const over = (p.overhang_m ?? 0) > 0;
              return (
                <tr key={p.id ?? p.seq}
                    style={{ background: i % 2 ? "var(--row-alt)" : "transparent" }}>
                  <td className="num" style={td}>{p.seq + 1}</td>
                  <td style={td}>{p.package_type}</td>
                  <td className="num" style={td}>{kg(p.mass_kg)}</td>
                  <td className="num" style={td}>{p.layer ?? "—"}</td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>
                    {mm(p.error_xy_m)}
                  </td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>
                    {deg(p.error_yaw_rad)}
                  </td>
                  <td className="num" style={{ ...td, textAlign: "right" }}>
                    {pct(p.support_ratio)}
                  </td>
                  <td className="num" style={{
                    ...td, textAlign: "right", color: `var(--${stabilityState(margin)})`,
                  }}>
                    {signedMm(margin)}
                  </td>
                  <td style={{ ...td, color: p.placed ? "var(--text-2)" : "var(--bad)" }}>
                    {over ? `fuera del palé ${mm(p.overhang_m, 0)}`
                      : p.placed ? "dentro de tolerancia" : "fuera de tolerancia"}
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

function SortBtn({ k, sort, set, children }: {
  k: SortKey; sort: SortKey; set: (k: SortKey) => void; children: React.ReactNode;
}) {
  return (
    <button onClick={() => set(k)}
            style={{ color: sort === k ? "var(--select)" : "inherit", font: "inherit" }}>
      {children}{sort === k ? " ↓" : ""}
    </button>
  );
}
