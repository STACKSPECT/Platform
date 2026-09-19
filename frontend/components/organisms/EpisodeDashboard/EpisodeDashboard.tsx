import { useState, type ReactNode } from "react";
import { Button, Text } from "../../atoms";
import { LegendItem, ResultCard, SnapshotView } from "../../molecules";
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
  /* Dibujo o captura. Arranca siempre en el dibujo: es el que tiene las cotas y el
     polígono de soporte. La foto está para comprobar que el esquema no miente. */
  const [shot, setShot] = useState(false);
  const hasShots = Boolean(view.shots.top || view.shots.side);
  const toggle = hasShots && (
    <Button onClick={() => setShot((v) => !v)}>
      {shot ? "Ver esquema" : "Ver captura"}
    </Button>
  );

  return (
    <main className={styles.screen}>
      {header}
      <IdentityBar {...view.identity} picker={picker} />
      {banner}

      <div className={styles.body}>
        <div className={styles.stage}>
          <Panel
            title="Vista cenital" padded
            aside={shot ? toggle : <>
              <LegendItem swatch="planned" label="hueco" />
              <LegendItem swatch="last" label="último" />
              <LegendItem swatch="support" label="soporte" />
              {toggle}
            </>}
          >
            {shot && view.shots.top
              ? <SnapshotView snapshot={view.shots.top} alt="Captura cenital del simulador" />
              : <PalletTopView placements={view.placements} state={view.last}
                               size={view.palletSize} />}
          </Panel>
          <Panel
            title="Alzado" padded
            aside={<Text variant="caption" tone="faint">{view.sideNote}</Text>}
          >
            {shot && view.shots.side
              ? <SnapshotView snapshot={view.shots.side} alt="Captura del alzado del simulador" />
              : <PalletSideView placements={view.placements} state={view.last}
                                size={view.palletSize} />}
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
