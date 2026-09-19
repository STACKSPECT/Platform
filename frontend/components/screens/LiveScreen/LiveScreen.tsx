"use client";

import { Button } from "../../atoms";
import { Banner, Notice } from "../../molecules";
import { EpisodeDashboard } from "../../organisms";
import { useLiveScreen } from "./useLiveScreen";

/** Live: el cuadro de un episodio con el último que haya. Nunca se queda en blanco: sin
 *  ejecución enseña el último terminado y, si se pierde la conexión, congela lo último
 *  recibido y lo dice. */
export function LiveScreen() {
  const s = useLiveScreen();

  if (s.state === "unconfigured") {
    return (
      <Notice title="Falta configurar Supabase">
        Rellena <code>.env</code> en la raíz del repo con <code>SUPABASE_URL</code> y{" "}
        <code>SUPABASE_ANON_KEY</code>.
      </Notice>
    );
  }
  if (s.state === "loading") return <Notice title="Cargando…">Buscando el último episodio.</Notice>;
  if (s.state === "error") {
    return (
      <Notice title="No se pudo cargar">
        {s.error} <Button onClick={s.retry}>Reintentar</Button>
      </Notice>
    );
  }
  if (s.state === "empty" || !s.view) {
    return (
      <Notice title="Todavía no hay episodios">
        Lanza un benchmark con <code>--telemetry</code>, o siembra un histórico con{" "}
        <code>backend/seed/palletizing.py</code>.
      </Notice>
    );
  }

  return (
    <EpisodeDashboard
      view={s.view}
      banner={s.stale && (
        <Banner message="Conexión perdida. Reintentando." detail={s.staleDetail}
                actionLabel="Reintentar ahora" onAction={s.retry} />
      )}
    />
  );
}
