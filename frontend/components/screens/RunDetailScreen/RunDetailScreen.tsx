"use client";

import Link from "next/link";
import { routes } from "@/lib/routes";
import { Button } from "../../atoms";
import { Banner, EpisodePicker, Notice } from "../../molecules";
import { EpisodeDashboard, RunHeader } from "../../organisms";
import { useRunDetailScreen } from "./useRunDetailScreen";

/** Detalle de una ejecución: el mismo cuadro que Live, pero con un episodio concreto de
 *  esa ejecución (por defecto el último) y un selector para recorrer los demás. */
export function RunDetailScreen({ runId, seed }: { runId: string; seed?: number }) {
  const s = useRunDetailScreen(runId, seed);
  const back = <Link href={routes.runs}>Volver a Ejecuciones</Link>;

  if (s.state === "unconfigured") {
    return (
      <Notice title="Falta configurar Supabase">
        Rellena <code>.env</code> en la raíz del repo con <code>SUPABASE_URL</code> y{" "}
        <code>SUPABASE_ANON_KEY</code>.
      </Notice>
    );
  }
  if (s.state === "loading") return <Notice title="Cargando…">Buscando la ejecución.</Notice>;
  if (s.state === "error") {
    return (
      <Notice title="No se pudo cargar la ejecución">
        {s.error} <Button onClick={s.retry}>Reintentar</Button>
      </Notice>
    );
  }
  if (s.state === "notFound") {
    return <Notice title="No existe esa ejecución">{back}</Notice>;
  }
  if (s.state === "empty") {
    return (
      <Notice title="Esta ejecución todavía no tiene episodios">
        Cuando escriba el primero aparecerá aquí. {back}
      </Notice>
    );
  }
  if (s.state === "noSeed") {
    return (
      <Notice title={`Esta ejecución no tiene la semilla ${s.seed}`}>
        <Link href={routes.run(runId)}>Ver su último episodio</Link> · {back}
      </Notice>
    );
  }

  return (
    <EpisodeDashboard
      view={s.view}
      header={<RunHeader backHref={routes.runs} backLabel="Ejecuciones" {...s.header} />}
      banner={s.detailFailed && (
        <Banner message="No se pudo cargar el detalle del episodio."
                actionLabel="Reintentar" onAction={s.retry} />
      )}
      picker={<EpisodePicker {...s.picker} />}
    />
  );
}
