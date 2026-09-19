"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  configured, fetchEpisodeDetail, fetchLatestEpisode, supabase,
  type Episode, type PalletState, type Placement, type RunEvent,
} from "@/lib/supabase";
import {
  TASK_TEXT, clockTime, failureText, mm, pct, seconds, signedMm, stabilityState,
} from "@/lib/ui";
import { PalletSideView, PalletTopView } from "@/components/Pallet";
import { EventFeed } from "@/components/Episode";
import { Dot, Kpi, Meta, OracleBadge, SyntheticBadge } from "@/components/primitives";

/* Si no llega nada nuevo en este tiempo teniendo un episodio en curso, se da la
   conexión por perdida. Generoso a propósito: un aviso en falso durante la demo es
   peor que enterarse dos segundos más tarde. */
const HEARTBEAT_MS = 8000;

export default function LivePage() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [states, setStates] = useState<PalletState[]>([]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  const lastRef = useRef<number>(Date.now());

  const load = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    try {
      const ep = await fetchLatestEpisode();
      setEpisode(ep);
      if (ep) {
        const d = await fetchEpisodeDetail(ep.id);
        setPlacements(d.placements);
        setStates(d.states);
        setEvents(d.events);
      }
      lastRef.current = Date.now();
      setLastSeen(new Date());
      setStale(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /* Realtime: esta vista se alimenta de estas suscripciones y de nada más. */
  useEffect(() => {
    if (!configured || !episode) return;
    const touch = () => {
      lastRef.current = Date.now();
      setLastSeen(new Date());
      setStale(false);
    };

    const channel = supabase
      .channel(`live-${episode.id}`)
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "events",
            filter: `episode_id=eq.${episode.id}` },
          (p) => { setEvents((prev) => [...prev, p.new as RunEvent]); touch(); })
      .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "pallet_states",
            filter: `episode_id=eq.${episode.id}` },
          (p) => { setStates((prev) => [...prev, p.new as PalletState]); touch(); })
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "episodes",
            filter: `id=eq.${episode.id}` },
          () => { void load(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [episode, load]);

  /* Latido. Lo que NO se hace aquí es vaciar la pantalla: lo último recibido se queda
     congelado y visible. Quedarse en blanco delante del jurado es lo peor que puede
     hacer esta vista. */
  useEffect(() => {
    const t = setInterval(() => {
      const running = episode?.status === "running";
      setStale(Boolean(running) && Date.now() - lastRef.current > HEARTBEAT_MS);
    }, 1000);
    return () => clearInterval(t);
  }, [episode]);

  if (!configured) {
    return (
      <Notice title="Falta configurar Supabase">
        Crea <code>platform/frontend/.env.local</code> con{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
      </Notice>
    );
  }
  if (loading) return <Notice title="Cargando…">Buscando el último episodio.</Notice>;
  if (!episode) {
    return (
      <Notice title="Todavía no hay episodios">
        Lanza un benchmark con <code>--telemetry</code>, o siembra un histórico con{" "}
        <code>platform/backend/seed/palletizing.py</code>.
      </Notice>
    );
  }

  const running = episode.status === "running";
  const failed = episode.status === "failure";
  const last = states.length ? states[states.length - 1] : null;
  const margin = last?.stability_margin_m ?? episode.final_stability_m;

  return (
    <main className="live">
      <IdentityBar episode={episode} running={running} stale={stale} />

      {stale && <StaleBanner lastSeen={lastSeen} onRetry={() => void load()} />}

      <div className="live__body">
        <div className="live__stage">
          <Panel
            title="Vista cenital"
            note={running ? `en curso · ${placements.length} paquetes`
              : failed ? `instante del fallo · ${seconds(episode.duration_s)}`
              : `estado final · ${placements.length} paquetes`}
          >
            <PalletTopView placements={placements} state={last} />
          </Panel>
          <Panel
            title="Alzado"
            note={[
              episode.n_layers ? `${episode.n_layers} capas` : null,
              episode.load_height_m ? `${mm(episode.load_height_m, 0)} de carga` : null,
              last?.settle_drift_m ? `deriva ${mm(last.settle_drift_m, 0)}` : null,
            ].filter(Boolean).join(" · ")}
          >
            <PalletSideView placements={placements} state={last} />
          </Panel>
        </div>

        <div className="live__side">
          <div className="live__kpis">
            <Kpi label="Colocados" value={`${episode.n_placed} ud`}
                 note={`de ${episode.n_objects}`}
                 state={episode.n_placed === episode.n_objects ? "ok"
                   : failed ? "bad" : "warn"} />
            <Kpi label="Tiempo de ciclo" value={seconds(episode.cycle_time_s)}
                 note="s / paquete" />
            <Kpi label="Margen de estabilidad" value={signedMm(margin)}
                 note="al borde del soporte" state={stabilityState(margin)} />
            <Kpi label="Utilización"
                 value={pct(last?.fill_ratio ?? episode.final_fill_ratio)}
                 note="del envolvente" />
          </div>

          {failed && <FailureCard episode={episode} />}
          {!running && !failed && <DoneCard episode={episode} />}

          <EventFeed
            events={events}
            note={running ? "últimos 12 · t desde el inicio del episodio"
              : `episodio terminado · semilla ${episode.seed}`}
          />
        </div>
      </div>
    </main>
  );
}

/* ── barra de identidad ─────────────────────────────────────────────────── */

function IdentityBar({ episode, running, stale }: {
  episode: Episode; running: boolean; stale: boolean;
}) {
  const state = stale ? { text: "Sin datos nuevos", color: "var(--warn)" }
    : running ? { text: "En vivo", color: "var(--bad)" }
    : episode.status === "success" ? { text: "Último", color: "var(--ok)" }
    : { text: "Último", color: "var(--text-3)" };

  return (
    <div style={{
      minHeight: 64, flexShrink: 0, background: "var(--topbar)",
      borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center",
      gap: 22, padding: "10px 20px", flexWrap: "wrap",
    }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
        <Dot color={state.color} pulse={running && !stale} />
        <span className="label" style={{ color: state.color, fontSize: 12 }}>
          {state.text}
        </span>
      </span>

      <span style={{ width: 1, height: 26, background: "#2A3238" }} />

      <Meta label="Tarea" value={TASK_TEXT[episode.task] ?? episode.task} mono={false} />
      <Meta label="Nivel" value={episode.level} />
      <Meta label="Semilla" value={episode.seed} />
      <Meta label="Commit" value={episode.git_sha || "—"} />
      <Meta label="Velocidad" value={`x${episode.motion_speed}`} />

      <span style={{ flexGrow: 1 }} />

      {episode.oracle && <OracleBadge />}
      {episode.synthetic && <SyntheticBadge />}

      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 500 }}>
          {(episode.duration_s ?? 0).toFixed(1)}
        </span>
        <span className="unit" style={{ fontSize: 13 }}>s</span>
      </span>
    </div>
  );
}

/* ── estados que no son el feliz ────────────────────────────────────────── */

function StaleBanner({ lastSeen, onRetry }: {
  lastSeen: Date | null; onRetry: () => void;
}) {
  return (
    <div style={{
      flexShrink: 0, display: "flex", alignItems: "center", gap: 14,
      padding: "10px 20px", background: "rgba(232,169,58,0.10)",
      borderBottom: "1px solid var(--warn)", fontSize: 13, flexWrap: "wrap",
    }}>
      <Dot color="var(--warn)" />
      <span>Conexión perdida. Reintentando.</span>
      <span style={{ color: "var(--text-4)" }}>
        lo que se ve es el último dato recibido · {clockTime(lastSeen?.toISOString())}
      </span>
      <span style={{ flexGrow: 1 }} />
      <button onClick={onRetry} style={{ color: "var(--select)", fontSize: 13 }}>
        Reintentar ahora
      </button>
    </div>
  );
}

function FailureCard({ episode }: { episode: Episode }) {
  return (
    <div className="card" style={{
      borderColor: "var(--bad)", padding: "14px 18px", gap: 6, flexShrink: 0,
    }}>
      <span className="label" style={{ color: "var(--bad)" }}>
        {failureText(episode.failure)}
      </span>
      <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
        {episode.n_placed} de {episode.n_objects} paquetes colocados · margen final{" "}
        {signedMm(episode.final_stability_m)}
      </span>
      <Link href={`/runs/${episode.run_id}/${episode.seed}`}
            style={{ fontSize: 13, marginTop: 4 }}>
        Ver episodio →
      </Link>
    </div>
  );
}

function DoneCard({ episode }: { episode: Episode }) {
  return (
    <div className="card" style={{
      borderColor: "var(--ok)", padding: "14px 18px", gap: 6, flexShrink: 0,
    }}>
      <span className="label" style={{ color: "var(--ok)" }}>Episodio completado</span>
      <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
        {seconds(episode.duration_s)} · {episode.n_placed} de {episode.n_objects} paquetes
        · sin derrumbe
      </span>
      <Link href={`/runs/${episode.run_id}/${episode.seed}`}
            style={{ fontSize: 13, marginTop: 4 }}>
        Ver detalle →
      </Link>
    </div>
  );
}

function Panel({ title, note, children }: {
  title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ flex: 1, minHeight: 0 }}>
      <div style={{
        height: 38, flexShrink: 0, padding: "0 16px", display: "flex",
        alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--border-soft)",
      }}>
        <span className="label">{title}</span>
        {note && <span style={{ fontSize: 11.5, color: "var(--text-4)" }}>{note}</span>}
      </div>
      <div style={{
        flex: 1, minHeight: 0, display: "flex", alignItems: "center",
        justifyContent: "center", padding: 10,
      }}>
        {children}
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={{ padding: 40, maxWidth: 620 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>{title}</h1>
      <p style={{ color: "var(--text-3)", fontSize: 14, lineHeight: 1.6 }}>{children}</p>
    </main>
  );
}
