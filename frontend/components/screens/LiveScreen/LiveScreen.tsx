"use client";

import { routes } from "@/lib/routes";
import { Button } from "../../atoms";
import { Banner, EmptyState, Notice } from "../../molecules";
import { EpisodeDashboard } from "../../organisms";
import { useLiveScreen } from "./useLiveScreen";

/** Live: el cuadro del episodio que está corriendo ahora. Al terminar se queda unos segundos
 *  con su resultado, y si arranca otro pasa a él sin vaciarse. Sin ejecución en directo lo
 *  dice con un mensaje (nunca se queda en blanco ni enseña lo último terminado como si fuera
 *  actual) y, si se pierde la conexión con un episodio en pantalla, congela lo último
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
  if (s.state === "loading") return <Notice title="Cargando…">Buscando una ejecución en directo.</Notice>;
  if (s.state === "error") {
    return (
      <Notice title="No se pudo comprobar si hay una ejecución en directo">
        {s.error} <Button onClick={s.retry}>Reintentar</Button>
      </Notice>
    );
  }
  if (s.state === "idle") {
    return (
      <EmptyState title="No hay ninguna ejecución en directo" actionHref={routes.runs}
                  actionLabel="Ver ejecuciones anteriores">
        Cuando una ejecución arranque, aparecerá aquí en cuanto empiece a escribir datos.
      </EmptyState>
    );
  }

  return (
    <EpisodeDashboard
      view={s.view}
      banner={s.stale ? (
        s.silent ? (
          <Banner message="El episodio no envía datos desde hace un rato."
                  detail={s.staleDetail ? `${s.staleDetail} · la conexión va bien; puede que el proceso se haya interrumpido` : undefined} />
        ) : (
          <Banner message="Conexión perdida. Reintentando." detail={s.staleDetail}
                  actionLabel="Reintentar ahora" onAction={s.retry} />
        )
      ) : s.finished ? (
        <Banner tone="info" message="El episodio ha terminado."
                detail="Se retira en unos segundos, o pasa al siguiente si arranca." />
      ) : null}
    />
  );
}
