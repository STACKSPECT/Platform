import type { Episode } from "@/lib/supabase";
import type { SelectOption } from "../../atoms";

const STATUS_TEXT: Record<Episode["status"], string> = {
  success: "éxito",
  failure: "fallo",
  running: "en curso",
};

/** El episodio que se mira: el de la semilla pedida, o el último si no se pidió ninguno.
 *  `undefined` si se pidió una semilla que la ejecución no tiene. */
export function pickEpisode(episodes: Episode[], seed: number | undefined): Episode | undefined {
  return seed == null ? episodes[episodes.length - 1] : episodes.find((e) => e.seed === seed);
}

/** Las opciones del selector: la semilla y cómo acabó, para elegir sin ir probando. */
export function episodeOptions(episodes: Episode[]): SelectOption[] {
  return episodes.map((e) => ({
    value: String(e.seed),
    label: `Semilla ${e.seed} · ${STATUS_TEXT[e.status]}`,
  }));
}

/** Las semillas vecinas del episodio elegido, o `undefined` en los extremos. */
export function neighbours(episodes: Episode[], current: Episode) {
  const i = episodes.findIndex((e) => e.id === current.id);
  return {
    prev: i > 0 ? episodes[i - 1].seed : undefined,
    next: i >= 0 && i < episodes.length - 1 ? episodes[i + 1].seed : undefined,
    counter: i >= 0 ? `${i + 1} / ${episodes.length}` : undefined,
  };
}
