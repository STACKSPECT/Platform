import { Card, Text } from "../../atoms";
import { VerdictChip } from "../../molecules";
import { scrollToAnchor } from "./OverviewStrip.helper";
import type { TaskSectionView } from "../TaskSection";
import { anchorOf } from "../TaskSection";
import styles from "./OverviewStrip.module.css";

/** Todo el avance en una mirada: por cada tarea, un chip por nivel con su veredicto. Es lo primero
 *  que se lee; cada chip lleva a la tarjeta con las métricas y las curvas. */
export function OverviewStrip({ sections }: { sections: TaskSectionView[] }) {
  return (
    <Card className={styles.strip}>
      <Text variant="label" tone="muted">De un vistazo</Text>
      <div className={styles.rows}>
        {sections.map((t) => (
          <div key={t.task} className={styles.row}>
            <Text variant="body" size="md" className={styles.task}>{t.title}</Text>
            <div className={styles.chips}>
              {t.levels.map((l) => {
                const id = anchorOf(t.task, l.key);
                return (
                  <VerdictChip key={l.key} href={`#${id}`} label={l.title}
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
