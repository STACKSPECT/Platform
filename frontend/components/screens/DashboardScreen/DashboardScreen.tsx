"use client";

import { Button, Text } from "../../atoms";
import {
  ChangeLegend, EmptyState, InfoMessage, Notice, SegmentedControl,
} from "../../molecules";
import { KIND_TEXT, OverviewStrip, TaskSection } from "../../organisms";
import { routes } from "@/lib/routes";
import { KIND_NOTE } from "./DashboardScreen.helper";
import styles from "./DashboardScreen.module.css";
import { useDashboardScreen } from "./useDashboardScreen";

/** Resumen de cómo ha ido evolucionando cada tarea, nivel por nivel: es la pantalla principal.
 *  Cada tarjeta responde a «¿vamos mejor?» de un vistazo: un veredicto y, por métrica, dónde
 *  estamos, cuánto ha cambiado desde el principio y cómo ha ido. */
export function DashboardScreen() {
  const s = useDashboardScreen();

  if (s.state === "unconfigured") {
    return (
      <Notice title="Falta configurar Supabase">
        Rellena <code>.env</code> en la raíz del repo con <code>SUPABASE_URL</code> y{" "}
        <code>SUPABASE_ANON_KEY</code>.
      </Notice>
    );
  }
  if (s.state === "loading") return <Notice title="Cargando…">Buscando las ejecuciones.</Notice>;
  if (s.state === "error") {
    return (
      <Notice title="No se pudieron cargar las ejecuciones">
        {s.error} <Button onClick={s.retry}>Reintentar</Button>
      </Notice>
    );
  }
  if (s.state === "empty") {
    return (
      <EmptyState title="Todavía no hay ejecuciones" actionHref={routes.live}
                  actionLabel="Ir a Live">
        Lanza un benchmark con <code>--telemetry</code>, o siembra un histórico con{" "}
        <code>backend/seed/palletizing.py</code>.
      </EmptyState>
    );
  }

  const note = KIND_NOTE[s.kind];

  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <h1 className={styles.title}>Evolución</h1>
          <Text tone="muted" size="md">
            Cómo ha ido cambiando cada tarea, ejecución a ejecución, nivel por nivel.
          </Text>
        </div>
        <SegmentedControl
          name="clase-de-datos" label="Clase de datos"
          value={s.kind} onChange={s.onKind}
          options={s.options.map(({ k, count }) => ({
            value: k, label: KIND_TEXT[k], count,
          }))}
        />
      </header>

      {s.sections.length > 0 && <OverviewStrip sections={s.sections} />}

      <div className={styles.guide}>
        <ChangeLegend />
        {note && <Text variant="caption" tone="warn">{note}</Text>}
      </div>

      {s.sections.length === 0 ? (
        <InfoMessage title={`No hay ejecuciones de la clase «${KIND_TEXT[s.kind]}»`}>
          Elige otra clase arriba para ver las que sí hay.
        </InfoMessage>
      ) : (
        s.sections.map((t) => <TaskSection key={t.task} view={t} />)
      )}
    </main>
  );
}
