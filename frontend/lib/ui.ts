/*
 * Unidades, vocabulario y estados. Un solo sitio, a propósito.
 *
 * La regla del diseño es "unidad siempre visible": 4.1 mm, nunca 4.1. Se rompe sola en
 * cuanto cada componente formatea por su cuenta, así que aquí no se devuelven números
 * sino cadenas ya con su unidad. Media interfaz de este proyecto son magnitudes
 * físicas, y confundir milímetros con centímetros es el error que se cuela en la demo.
 *
 * La base de datos guarda SI (metros, radianes, segundos). La pantalla enseña
 * milímetros y grados, que es como se habla de precisión en una planta. La conversión
 * vive aquí y en ningún otro sitio.
 */

export type Failure =
  | "no_detection" | "ik_unreachable" | "collision" | "grasp_slip"
  | "wrong_placement" | "timeout" | "stack_collapse" | "overhang_violation"
  | "place_inaccurate";

/* La interfaz NUNCA muestra el identificador crudo. */
export const FAILURE_TEXT: Record<Failure, string> = {
  no_detection: "no vio ningún paquete",
  ik_unreachable: "no alcanza la posición",
  collision: "chocó",
  grasp_slip: "se le escapó de la pinza",
  wrong_placement: "lo dejó fuera de tolerancia",
  timeout: "se quedó sin tiempo",
  stack_collapse: "el montón se derrumbó",
  overhang_violation: "lo dejó fuera del palé",
  // Histórico: lo midió una versión anterior y ya no se emite. Se traduce igual,
  // porque sigue apareciendo en 60 episodios reales.
  place_inaccurate: "lo dejó impreciso en su hueco",
};

export function failureText(f: string | null | undefined): string {
  if (!f) return "";
  return FAILURE_TEXT[f as Failure] ?? f;
}

export function failureColor(f: string | null | undefined): string {
  return f ? `var(--f-${f})` : "var(--text-5)";
}

/* ── unidades ───────────────────────────────────────────────────────────── */

const NBSP = " ";

/** Metros → milímetros, con unidad. Un dato que falta se dice; no se finge con un 0. */
export function mm(metres: number | null | undefined, digits = 1): string {
  if (metres == null) return "—";
  return `${(metres * 1000).toFixed(digits)}${NBSP}mm`;
}

/** Con signo explícito: un margen de estabilidad negativo significa que vuelca, y ese
 *  signo es toda la diferencia entre "va bien" y "se cae". Nunca se omite. */
export function signedMm(metres: number | null | undefined, digits = 0): string {
  if (metres == null) return "—";
  const v = metres * 1000;
  return `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}${NBSP}mm`;
}

export function deg(radians: number | null | undefined, digits = 1): string {
  if (radians == null) return "—";
  return `${((radians * 180) / Math.PI).toFixed(digits)}°`;
}

export function pct(ratio: number | null | undefined, digits = 0): string {
  if (ratio == null) return "—";
  return `${(ratio * 100).toFixed(digits)}${NBSP}%`;
}

export function seconds(s: number | null | undefined, digits = 1): string {
  if (s == null) return "—";
  return `${s.toFixed(digits)}${NBSP}s`;
}

export function kg(v: number | null | undefined, digits = 1): string {
  if (v == null) return "—";
  return `${v.toFixed(digits)}${NBSP}kg`;
}

/** Un número con signo explícito y el «−» tipográfico. Un cero redondeado no lleva signo:
 *  «−0» no significa nada. La unidad la pone quien lo use. */
export function signedNumber(n: number, digits = 0): string {
  const rounded = Number(Math.abs(n).toFixed(digits));
  const sign = rounded === 0 ? "" : n < 0 ? "−" : "+";
  return `${sign}${rounded.toFixed(digits)}`;
}

/** Parte una cantidad ya formateada ("31 mm") en número y unidad, para pintarlas con
 *  tamaños distintos. No convierte nada: solo trocea lo que devuelven mm/pct/seconds. */
export function splitQuantity(formatted: string): { value: string; unit: string } {
  const [value, ...rest] = formatted.split(/\s/);
  return { value, unit: rest.join(" ") };
}

/* ── estados ────────────────────────────────────────────────────────────── */

export type State = "ok" | "warn" | "bad";

/**
 * Los tres estados del margen de estabilidad, y solo tres.
 *
 * Negativo vuelca. Por debajo de 15 mm está en el margen: un paquete más en ese lado y
 * se va. El umbral sale del tablero de los tres estados, donde +6 mm ya es ámbar.
 */
export function stabilityState(marginMetres: number | null | undefined): State {
  if (marginMetres == null) return "warn";
  if (marginMetres < 0) return "bad";
  return marginMetres < 0.015 ? "warn" : "ok";
}

export function stateColor(s: State): string {
  return `var(--${s})`;
}

export function episodeState(status: string): State {
  return status === "success" ? "ok" : status === "running" ? "warn" : "bad";
}

/* ── tiempo ─────────────────────────────────────────────────────────────── */

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const delta = (Date.now() - new Date(iso).getTime()) / 1000;
  if (delta < 60) return `hace ${Math.round(delta)} s`;
  if (delta < 3600) return `hace ${Math.round(delta / 60)} min`;
  if (delta < 86400) return `hace ${Math.round(delta / 3600)} h`;
  const days = Math.round(delta / 86400);
  return days === 1 ? "ayer" : `hace ${days} d`;
}

export function clockTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export const TASK_TEXT: Record<string, string> = {
  induction: "inducción",
  palletizing: "paletizado",
  "paletizado-guionizado": "paletizado guionizado",
};

export const EVENT_TEXT: Record<string, string> = {
  perceive: "visto",
  plan: "planificado",
  pick: "cogido",
  place: "depositado",
  settle: "asentado",
  fail: "fallo",
};

/* Tamaño real del palé, en metros.
 *
 * El palé puede ser una maqueta a escala: la pinza del Panda abre 80 mm y un europeo es
 * inagarrable. Dibujarlo siempre a 1200x800 deja todas las cotas mal por el mismo
 * factor, y el diseño exige que se pinte a escala real con sus medidas.
 *
 * Se mira primero `runs.config`, que es su sitio, y después `episodes.metrics`, donde
 * la simulación lo metió mientras la columna no se podía escribir. El europeo es el
 * último recurso. */
export function palletSize(
  fuente: { config?: Record<string, unknown>; metrics?: Record<string, unknown> } | null,
): readonly [number, number] {
  for (const bolsa of [fuente?.config, fuente?.metrics]) {
    const v = bolsa?.["pallet_size_m"];
    if (Array.isArray(v) && v.length >= 2
        && typeof v[0] === "number" && typeof v[1] === "number"
        && v[0] > 0 && v[1] > 0) {
      return [v[0], v[1]];
    }
  }
  return [1.2, 0.8];
}
