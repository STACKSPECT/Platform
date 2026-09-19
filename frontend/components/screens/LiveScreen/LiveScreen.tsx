"use client";

import { Button, Text } from "../../atoms";
import { Banner, LegendItem, Notice, ResultCard } from "../../molecules";
import {
  EventFeed, IdentityBar, KpiGrid, PalletSideView, PalletTopView, Panel,
} from "../../organisms";
import { useLiveScreen } from "./useLiveScreen";
import styles from "./LiveScreen.module.css";

/** Composición de Live: cada pieza viene hecha, aquí solo se colocan. Live nunca se queda
 *  en blanco: sin ejecución enseña el último episodio y, si se pierde la conexión, congela
 *  lo último recibido y lo dice. */
export function LiveScreen() {
  const { state, view, retry, error } = useLiveScreen();

  if (state === "unconfigured") {
    return (
      <Notice title="Falta configurar Supabase">
        Rellena <code>.env</code> en la raíz del repo con <code>SUPABASE_URL</code> y{" "}
        <code>SUPABASE_ANON_KEY</code>.
      </Notice>
    );
  }
  if (state === "loading") return <Notice title="Cargando…">Buscando el último episodio.</Notice>;
  if (state === "error") {
    return (
      <Notice title="No se pudo cargar">
        {error} <Button onClick={retry}>Reintentar</Button>
      </Notice>
    );
  }
  if (state === "empty" || !view) {
    return (
      <Notice title="Todavía no hay episodios">
        Lanza un benchmark con <code>--telemetry</code>, o siembra un histórico con{" "}
        <code>backend/seed/palletizing.py</code>.
      </Notice>
    );
  }

  return (
    <main className={styles.screen}>
      <IdentityBar {...view.identity} />
      {view.stale && (
        <Banner message="Conexión perdida. Reintentando." detail={view.staleDetail}
                actionLabel="Reintentar ahora" onAction={retry} />
      )}

      <div className={styles.body}>
        <div className={styles.stage}>
          <Panel
            title="Vista cenital" padded
            aside={<>
              <LegendItem swatch="planned" label="hueco" />
              <LegendItem swatch="last" label="último" />
              <LegendItem swatch="support" label="soporte" />
            </>}
          >
            <PalletTopView placements={view.placements} state={view.last}
                           size={view.palletSize} />
          </Panel>
          <Panel
            title="Alzado" padded
            aside={<Text variant="caption" tone="faint">{view.sideNote}</Text>}
          >
            <PalletSideView placements={view.placements} state={view.last}
                            size={view.palletSize} />
          </Panel>
        </div>

        <div className={styles.side}>
          <KpiGrid items={view.kpis} />
          {view.result && <ResultCard {...view.result} />}
          <EventFeed events={view.events} note={view.feedNote} />
        </div>
      </div>
    </main>
  );
}
