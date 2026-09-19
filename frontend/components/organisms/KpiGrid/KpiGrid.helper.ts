import type { Episode, PalletState } from "@/lib/supabase";
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
export function buildKpis(episode: Episode, last: PalletState | null): KpiItem[] {
  const margin = last?.stability_margin_m ?? episode.final_stability_m;
  const fill = last?.fill_ratio ?? episode.final_fill_ratio;

  return [
    {
      label: "Colocados",
      value: String(episode.n_placed),
      unit: `/ ${episode.n_objects} ud`,
      state: placedState(episode),
    },
    {
      label: "Tiempo de ciclo",
      value: splitQuantity(seconds(episode.cycle_time_s)).value,
      unit: episode.cycle_time_s == null ? "" : "s / paquete",
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
