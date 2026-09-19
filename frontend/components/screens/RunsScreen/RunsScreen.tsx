"use client";

import { Button } from "../../atoms";
import { Notice } from "../../molecules";
import { ComparePanel, FilterBar, RunsTable } from "../../organisms";
import styles from "./RunsScreen.module.css";
import { useRunsScreen } from "./useRunsScreen";

/** Composición de Ejecuciones: filtros, lista y comparativa. */
export function RunsScreen() {
  const s = useRunsScreen();

  if (s.state === "unconfigured") {
    return (
      <Notice title="Falta configurar Supabase">
        Crea <code>frontend/.env.local</code> con <code>NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
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
      <Notice title="Todavía no hay ejecuciones">
        Lanza un benchmark con <code>--telemetry</code>, o siembra un histórico con{" "}
        <code>backend/seed/palletizing.py</code>.
      </Notice>
    );
  }

  return (
    <main className={styles.screen}>
      <div className={styles.filters}>
        <FilterBar filters={s.filters} options={s.options} selectedCount={s.selectedIds.length}
                   onChange={s.onFilter} onClear={s.onClear} />
      </div>
      <div className={styles.table}>
        <RunsTable runs={s.visibleRuns} selectedIds={s.selectedIds}
                   selectionFull={s.selectionFull} onToggle={s.onToggle} />
      </div>
      <div className={styles.compare}>
        <ComparePanel pair={s.comparePair} />
      </div>
    </main>
  );
}
