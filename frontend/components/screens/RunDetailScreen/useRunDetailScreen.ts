import { useRouter } from "next/navigation";
import {
  useEpisodeDetail, useEpisodes, useRun, useSnapshots,
} from "@/api/hooks";
import { configured } from "@/lib/supabase";
import { routes } from "@/lib/routes";
import { buildEpisodeView } from "../../organisms/EpisodeDashboard";
import { buildRunHeader } from "../../organisms/RunHeader";
import { episodeOptions, neighbours, pickEpisode } from "./RunDetailScreen.helper";

/** Une los datos del detalle de una ejecución y la navegación entre sus episodios en un
 *  solo modelo. Aquí no se dibuja nada. */
export function useRunDetailScreen(runId: string, seed: number | undefined) {
  const router = useRouter();
  const run = useRun(runId);
  const episodes = useEpisodes(runId);
  const list = episodes.data ?? [];
  const episode = pickEpisode(list, seed);
  const detail = useEpisodeDetail(episode?.id);
  const snapshots = useSnapshots(episode?.id);

  const retry = () => {
    void run.refetch();
    void episodes.refetch();
    void detail.placements.refetch();
    void detail.states.refetch();
    void detail.events.refetch();
  };

  if (!configured) return { state: "unconfigured" as const, retry };
  if (run.isPending || episodes.isPending) return { state: "loading" as const, retry };
  if (run.isError || episodes.isError) {
    return { state: "error" as const, retry,
             error: (run.error ?? episodes.error)?.message };
  }
  if (!run.data) return { state: "notFound" as const, retry };
  if (!list.length) return { state: "empty" as const, retry, header: buildRunHeader(run.data) };
  if (!episode) return { state: "noSeed" as const, retry, seed, header: buildRunHeader(run.data) };

  const near = neighbours(list, episode);
  const go = (s: number) => router.push(routes.episode(runId, s));

  return {
    state: "ready" as const,
    retry,
    header: buildRunHeader(run.data),
    view: buildEpisodeView({
      episode,
      placements: detail.placements.data ?? [],
      states: detail.states.data ?? [],
      events: detail.events.data ?? [],
      runEpisodes: list,
      snapshots: snapshots.data ?? [],
      stale: false,
      mode: "run",
    }),
    detailFailed: detail.isError,
    picker: {
      options: episodeOptions(list),
      value: String(episode.seed),
      counter: near.counter,
      onChange: (value: string) => go(Number(value)),
      onPrev: near.prev == null ? undefined : () => go(near.prev as number),
      onNext: near.next == null ? undefined : () => go(near.next as number),
    },
  };
}
