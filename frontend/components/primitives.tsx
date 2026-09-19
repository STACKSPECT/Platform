"use client";

import type { SeedPoint } from "@/lib/supabase";
import { failureColor, failureText, type State } from "@/lib/ui";

/* ── indicador grande ───────────────────────────────────────────────────── */

/**
 * Un KPI de la tira de Live. Número enorme monoespaciado, unidad más pequeña al lado
 * y etiqueta arriba. Pensado para leerse a tres metros, de pie y sin explicación.
 *
 * `value` llega ya formateado con su unidad desde lib/ui: aquí solo se parte el número
 * del sufijo para darles tamaños distintos. Este componente nunca decide una unidad.
 */
export function Kpi({ label, value, note, state }: {
  label: string;
  value: string;
  note?: string;
  state?: State;
}) {
  // El formateador une número y unidad con un espacio duro; ese es el punto de corte.
  const [num, ...rest] = value.split(" ");
  const unit = rest.join(" ");
  const color = state ? `var(--${state})` : "var(--text)";

  return (
    <div className="card" style={{ padding: "14px 18px", justifyContent: "space-between" }}>
      <span className="label">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span className="num" style={{ fontSize: 40, fontWeight: 500, lineHeight: 1, color }}>
          {num}
        </span>
        {unit && <span className="unit" style={{ fontSize: 15 }}>{unit}</span>}
      </div>
      {note && (
        <span style={{ fontSize: 12, color: "var(--text-4)", marginTop: 6 }}>{note}</span>
      )}
    </div>
  );
}

/* ── distintivos ────────────────────────────────────────────────────────── */

export function Badge({ text, color, striped }: {
  text: string; color: string; striped?: string;
}) {
  return (
    <span
      className={striped ?? ""}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "3px 9px",
        border: `1px solid ${color}`,
        color,
        fontFamily: "var(--font-plex-condensed), sans-serif",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/** Molesta a la vista a propósito: esos números no son los de verdad. */
export function OracleBadge() {
  return <Badge text="Oracle" color="var(--oracle)" striped="striped" />;
}

/** Misma idea para los datos sembrados: generados, no medidos. */
export function SyntheticBadge() {
  return <Badge text="Sembrado" color="var(--synthetic)" striped="striped-synthetic" />;
}

/* ── par etiqueta / valor de la barra de identidad ──────────────────────── */

export function Meta({ label, value, mono = true }: {
  label: string; value: React.ReactNode; mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="label" style={{ fontSize: 9.5, letterSpacing: "0.14em" }}>
        {label}
      </span>
      <span className={mono ? "num" : ""} style={{ fontSize: 13, color: "var(--text)" }}>
        {value}
      </span>
    </div>
  );
}

/* ── sparkline ──────────────────────────────────────────────────────────── */

/**
 * Éxito por episodio, en orden de semilla.
 *
 * La altura es la fracción de paquetes colocados y el color, el resultado del episodio.
 * Sirve para lo que ninguna media sirve: ver si un 64 % es estable o es suerte de un
 * tramo de semillas, que es una distinción que ya nos ha mordido antes.
 */
export function Sparkline({ series, width = 96, height = 22 }: {
  series: SeedPoint[]; width?: number; height?: number;
}) {
  if (!series?.length) {
    return <span style={{ color: "var(--text-5)", fontSize: 12 }}>—</span>;
  }
  const gap = 1;
  const barW = Math.max(1, (width - gap * (series.length - 1)) / series.length);

  return (
    <svg width={width} height={height} role="img"
         aria-label={`Resultado de ${series.length} episodios en orden de semilla`}>
      {series.map((p, i) => {
        const ratio = p.objects ? p.placed / p.objects : 0;
        // Suelo visible: un episodio que no colocó nada tiene que verse, no borrarse.
        const h = Math.max(2, ratio * height);
        const color = p.status === "success" ? "var(--ok)" : failureColor(p.failure);
        return (
          <rect key={p.seed} x={i * (barW + gap)} y={height - h}
                width={barW} height={h} fill={color}
                opacity={p.status === "success" ? 1 : 0.85} />
        );
      })}
    </svg>
  );
}

/* ── varios ─────────────────────────────────────────────────────────────── */

export function Dot({ color, size = 8, pulse }: {
  color: string; size?: number; pulse?: boolean;
}) {
  return (
    <span
      style={{
        width: size, height: size, borderRadius: "50%", background: color,
        display: "inline-block", flexShrink: 0,
        boxShadow: pulse
          ? `0 0 0 3px color-mix(in srgb, ${color} 25%, transparent)`
          : undefined,
      }}
    />
  );
}

export function FailureChip({ failure }: { failure: string | null }) {
  if (!failure) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, background: failureColor(failure), flexShrink: 0 }} />
      <span style={{ fontSize: 13 }}>{failureText(failure)}</span>
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 40, textAlign: "center", color: "var(--text-4)", fontSize: 13 }}>
      {children}
    </div>
  );
}
