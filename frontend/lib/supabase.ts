/*
 * Acceso a datos. Lectura directa de Supabase con la clave `anon`, bajo RLS.
 *
 * No hay servidor intermedio a propósito: Supabase ya ES el backend (PostgREST, RLS y
 * Realtime), y meter un proceso más delante durante un hackathon es una cosa más que
 * se cae a las tres de la mañana. La clave `anon` viaja al navegador, que es su
 * función; lo que impide escribir es la política de RLS, no el secreto.
 *
 * La interfaz no agrega nada en cliente: totales, medianas y causas dominantes salen
 * ya calculados de las vistas SQL. Si un número hay que calcularlo, se calcula en la
 * vista y no aquí: dos sitios que suman lo mismo acaban discrepando.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const configured = Boolean(url && anon);

export const supabase = createClient(url || "http://localhost", anon || "anon", {
  auth: { persistSession: false },
});

/* ── tipos ──────────────────────────────────────────────────────────────── */

export type SeedPoint = {
  seed: number;
  status: "running" | "success" | "failure";
  failure: string | null;
  placed: number;
  objects: number;
  cycle_s: number | null;
  stability: number | null;
};

export type Run = {
  id: string;
  started_at: string;
  ended_at: string | null;
  task: string;
  level: number;
  git_sha: string;
  oracle: boolean;
  synthetic: boolean;
  motion_speed: number;
  label: string | null;
  description: string | null;
  config: Record<string, unknown>;
  episodes: number;
  successes: number;
  success_rate: number | null;
  objects_placed: number | null;
  objects_total: number | null;
  placement_rate: number | null;
  seed_min: number | null;
  seed_max: number | null;
  median_cycle_s: number | null;
  median_stability_m: number | null;
  median_error_xy_m: number | null;
  mean_duration_s: number | null;
  dominant_failure: string | null;
  seed_series: SeedPoint[];
};

export type Episode = {
  id: string;
  run_id: string;
  seed: number;
  task: string;
  level: number;
  status: "running" | "success" | "failure";
  duration_s: number | null;
  n_objects: number;
  n_placed: number;
  score: number | null;
  failure: string | null;
  metrics: Record<string, number>;
  git_sha: string;
  oracle: boolean;
  synthetic: boolean;
  motion_speed: number;
  config: Record<string, unknown>;
  cycle_time_s: number | null;
  final_stability_m: number | null;
  final_fill_ratio: number | null;
  final_settle_drift_m: number | null;
  mean_error_xy_m: number | null;
  n_layers: number | null;
  load_height_m: number | null;
};

export type Pose = { x: number; y: number; z: number; yaw: number };

export type Placement = {
  id: string;
  episode_id: string;
  seq: number;
  package_id: string;
  package_type: string;
  mass_kg: number | null;
  dims_m: number[] | null;
  layer: number | null;
  planned_pose: Pose | null;
  actual_pose: Pose | null;
  error_xy_m: number | null;
  error_yaw_rad: number | null;
  support_ratio: number | null;
  overhang_m: number | null;
  placed: boolean;
};

export type PalletState = {
  id: string;
  episode_id: string;
  after_seq: number;
  mass_kg: number;
  cog_x: number;
  cog_y: number;
  cog_z: number;
  stability_margin_m: number | null;
  fill_ratio: number | null;
  settle_drift_m: number | null;
};

export type RunEvent = {
  id: string;
  episode_id: string;
  ts: number;
  seq: number;
  kind: "perceive" | "plan" | "pick" | "place" | "settle" | "fail";
  package_id: string | null;
  payload: Record<string, unknown>;
};

/* ── consultas ──────────────────────────────────────────────────────────── */

export async function fetchRuns(limit = 60): Promise<Run[]> {
  const { data, error } = await supabase
    .from("v_run_summary")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Run[];
}

export async function fetchRun(id: string): Promise<Run | null> {
  const { data, error } = await supabase
    .from("v_run_summary").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Run | null;
}

export async function fetchEpisodes(runId: string): Promise<Episode[]> {
  const { data, error } = await supabase
    .from("v_episode_summary").select("*").eq("run_id", runId)
    .order("seed", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Episode[];
}

export async function fetchEpisode(runId: string, seed: number): Promise<Episode | null> {
  const { data, error } = await supabase
    .from("v_episode_summary").select("*")
    .eq("run_id", runId).eq("seed", seed).maybeSingle();
  if (error) throw error;
  return data as Episode | null;
}

/** Todo lo que necesita la pantalla de episodio. */
export async function fetchEpisodeDetail(episodeId: string) {
  const [placements, states, events] = await Promise.all([
    supabase.from("placements").select("*").eq("episode_id", episodeId)
      .order("seq", { ascending: true }),
    supabase.from("pallet_states").select("*").eq("episode_id", episodeId)
      .order("after_seq", { ascending: true }),
    supabase.from("events").select("*").eq("episode_id", episodeId)
      .order("seq", { ascending: true }),
  ]);
  return {
    placements: (placements.data ?? []) as Placement[],
    states: (states.data ?? []) as PalletState[],
    events: (events.data ?? []) as RunEvent[],
  };
}

/** Lo que enseña Live: un episodio en curso si lo hay, y si no el último terminado.
 *  La pantalla nunca se queda en blanco, que es lo peor que puede hacer en una demo. */
export async function fetchLatestEpisode(): Promise<Episode | null> {
  const { data: running } = await supabase
    .from("v_episode_summary").select("*").eq("status", "running").limit(1);
  if ((running ?? []).length) return (running as Episode[])[0];

  const { data, error } = await supabase
    .from("v_episode_summary").select("*")
    .order("started_at", { ascending: false }).limit(1);
  if (error) throw error;
  return ((data ?? []) as Episode[])[0] ?? null;
}

/* ── comparabilidad ─────────────────────────────────────────────────────── */

export type Blocker = { field: string; a: string; b: string; why: string };

/**
 * Por qué dos ejecuciones NO se pueden comparar.
 *
 * Esto no es una validación de formulario: es el corazón de la pantalla. Un delta de
 * tasa de éxito entre dos runs que no miden lo mismo es un gráfico bonito y falso, y
 * es justo el error que el jurado va a buscar. Vacío = sí se pueden comparar.
 */
export function comparability(a: Run, b: Run): Blocker[] {
  const out: Blocker[] = [];
  if (a.task !== b.task)
    out.push({ field: "TAREA", a: a.task, b: b.task, why: "tareas distintas" });
  if (a.level !== b.level)
    out.push({ field: "NIVEL", a: String(a.level), b: String(b.level),
               why: "criterios de éxito distintos" });

  if (a.seed_min !== b.seed_min || a.seed_max !== b.seed_max)
    out.push({
      field: "SEMILLAS",
      a: `${a.seed_min} – ${a.seed_max}`,
      b: `${b.seed_min} – ${b.seed_max}`,
      why: `${commonSeeds(a, b)} semillas en común de ${Math.max(a.episodes, b.episodes)}`,
    });
  if (a.oracle !== b.oracle)
    out.push({ field: "ORACLE", a: a.oracle ? "sí" : "no", b: b.oracle ? "sí" : "no",
               why: "una sustituye la percepción por poses reales" });
  if (a.synthetic !== b.synthetic)
    out.push({ field: "DATOS", a: a.synthetic ? "sembrados" : "medidos",
               b: b.synthetic ? "sembrados" : "medidos",
               why: "unos están inventados y otros medidos" });
  return out;
}

export function commonSeeds(a: Run, b: Run): number {
  const sa = new Set((a.seed_series ?? []).map((s) => s.seed));
  return (b.seed_series ?? []).filter((s) => sa.has(s.seed)).length;
}
