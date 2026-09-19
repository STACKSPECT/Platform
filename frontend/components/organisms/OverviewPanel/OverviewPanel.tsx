import { Card, Text } from "../../atoms";
import { VerdictRow } from "../../molecules";
import type { TaskSectionView } from "../TaskSection";
import { anchorOf } from "../TaskSection";
import { scrollToAnchor } from "./OverviewPanel.helper";
import styles from "./OverviewPanel.module.css";

/** Todo el avance en una mirada: por cada tarea, una fila por nivel con su veredicto. Va en la
 *  columna lateral y se queda a la vista mientras se baja; cada fila lleva a la tarjeta con las
 *  métricas y las curvas. */
export function OverviewPanel({ sections }: { sections: TaskSectionView[] }) {
  return (
    <Card className={styles.panel}>
      <Text variant="body" size="lg" className={styles.title}>De un vistazo</Text>
      <div className={styles.tasks}>
        {sections.map((t) => (
          <div key={t.task} className={styles.task}>
            <Text variant="label" tone="faint">{t.title}</Text>
            <div className={styles.rows}>
              {t.levels.map((l) => {
                const id = anchorOf(t.task, l.key);
                return (
                  <VerdictRow key={l.key} href={`#${id}`} label={l.title}
                              verdict={l.verdict.label} tone={l.verdict.tone}
                              detail={l.verdict.detail} onSelect={() => scrollToAnchor(id)} />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
