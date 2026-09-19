import type { Episode, PalletState, Placement } from "@/lib/supabase";
import { pct, seconds, signedMm, splitQuantity, stabilityState } from "@/lib/ui";

export type KpiItem = {
  label: string;
  value: string;
  unit: string;
  state?: "ok" | "warn" | "bad";
};

/** Solo hay estado cuando el episodio ya acabó: en curso, «7 de 10» no es ni bueno ni
 *  malo todavía. */
function placedState(episode: Episode): KpiItem["state"] {
  if (episode.status === "success") return "ok";
  if (episode.status === "failure") return "bad";
  return undefined;
}

/** Los cuatro indicadores de Live. El estado del palé es el último recibido; si aún no
 *  hay ninguno, manda el resumen del episodio. */
export function buildKpis(episode: Episode, last: PalletState | null,
                          placements: Placement[] = []): KpiItem[] {
  const margin = last?.stability_margin_m ?? episode.final_stability_m;
  const fill = last?.fill_ratio ?? episode.final_fill_ratio;

  /* Mientras el episodio corre, `episodes.n_placed` vale 0: lo deja así `begin()` y solo
     lo actualiza `end()`. Contarlo de las colocaciones recibidas evita que estos dos
     indicadores se queden clavados en cero justo mientras el palé se monta, que es
     cuando el jurado está mirando. */
  const running = episode.status === "running";
  const placed = running
    ? placements.filter((p) => p.placed).length
    : episode.n_placed;
  const elapsed = episode.duration_s ?? 0;
  const cycle = running
    ? (placed ? elapsed / placed : null)
    : episode.cycle_time_s;

  return [
    {
      label: "Colocados",
      value: String(placed),
      unit: `/ ${episode.n_objects} ud`,
      state: placedState(episode),
    },
    {
      label: "Tiempo de ciclo",
      value: splitQuantity(seconds(cycle)).value,
      unit: cycle == null ? "" : "s / paquete",
    },
    {
      label: "Margen de estabilidad",
      value: splitQuantity(signedMm(margin)).value,
      unit: margin == null ? "" : "mm",
      state: stabilityState(margin),
    },
    {
      label: "Utilización",
      value: splitQuantity(pct(fill)).value,
      unit: fill == null ? "" : "% del envolvente",
    },
  ];
}
