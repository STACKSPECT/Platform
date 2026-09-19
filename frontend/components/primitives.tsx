"use client";

import type { SeedPoint } from "@/lib/supabase";
import { failureColor } from "@/lib/ui";

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
