import { useState } from "react";
import {
  useEpisodeDetail, useEpisodeRealtime, useEpisodes, useLatestEpisode,
} from "@/api/hooks";
import { configured } from "@/lib/supabase";
import { useNow } from "@/hooks/useNow";
import { buildEpisodeView } from "../../organisms/EpisodeDashboard";
import { LATEST_POLL_MS, isStale, staleDetail } from "./LiveScreen.helper";

/** Une los datos de Live en un solo modelo para la pantalla. Aquí no se dibuja nada. */
export function useLiveScreen() {
  const latest = useLatestEpisode({ refetchInterval: LATEST_POLL_MS });
  const episode = latest.data ?? null;
  const detail = useEpisodeDetail(episode?.id);
  const runEpisodes = useEpisodes(episode?.run_id);
  const { lastReceivedAt } = useEpisodeRealtime(episode?.id);

  const running = episode?.status === "running";
  const now = useNow(running ? 1000 : null);
  // Hasta que llegue algo por Realtime, la referencia es la de cuando se montó la pantalla.
  const [mountedAt] = useState(() => Date.now());
  const lastSignalAt = lastReceivedAt ?? mountedAt;

  const retry = () => { void latest.refetch(); };

  if (!configured) return { state: "unconfigured" as const, retry, view: null };
  if (latest.isPending) return { state: "loading" as const, retry, view: null };
  if (!episode) {
    return { state: latest.isError ? "error" as const : "empty" as const, retry, view: null,
             error: latest.error?.message };
  }

  // Un fallo de red con datos ya en pantalla no vacía nada: se congela y se avisa.
  const stale = isStale({
    running: Boolean(running), fetchFailed: latest.isError || detail.isError,
    lastSignalAt, now,
  });

  return {
    state: "ready" as const,
    retry,
    stale,
    staleDetail: staleDetail(lastSignalAt),
    view: buildEpisodeView({
      episode,
      placements: detail.placements.data ?? [],
      states: detail.states.data ?? [],
      events: detail.events.data ?? [],
      runEpisodes: runEpisodes.data ?? [],
      stale, mode: "live",
    }),
  };
}
