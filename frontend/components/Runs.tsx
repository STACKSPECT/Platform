"use client";

import Link from "next/link";
import type { SeedPoint } from "@/lib/supabase";
import { failureColor, failureText, seconds, signedMm, stabilityState } from "@/lib/ui";

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
