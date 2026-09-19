import type { ReactNode } from "react";
import { Text } from "../../atoms";
import { LegendItem, ResultCard } from "../../molecules";
import { EventFeed } from "../EventFeed";
import { IdentityBar } from "../IdentityBar";
import { KpiGrid } from "../KpiGrid";
import { PalletSideView } from "../PalletSideView";
import { PalletTopView } from "../PalletTopView";
import { Panel } from "../Panel";
import type { EpisodeView } from "./EpisodeDashboard.helper";
import styles from "./EpisodeDashboard.module.css";

type Props = {
  view: EpisodeView;
  /** Encima de la identidad del episodio: en el detalle, el «← Ejecuciones» y el nombre. */
  header?: ReactNode;
  /** Debajo de la identidad: un aviso a todo el ancho (conexión perdida). */
  banner?: ReactNode;
  /** Sustituye al «3 / 25» de la identidad (el selector de episodio del detalle). */
  picker?: ReactNode;
};

/** El cuadro de un episodio: identidad, vista cenital, alzado, indicadores y feed de
 *  eventos. Es la pantalla de Live y también la del detalle de una ejecución; cambia de
 *  dónde salen los datos, no cómo se ven. */
export function EpisodeDashboard({ view, header, banner, picker }: Props) {
  return (
    <main className={styles.screen}>
      {header}
      <IdentityBar {...view.identity} picker={picker} />
      {banner}

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
