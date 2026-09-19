import { Text } from "../../atoms";
import { LevelCard, type LevelCardView } from "../LevelCard";
import styles from "./TaskSection.module.css";

export type TaskSectionView = {
  task: string;
  title: string;
  /** «2 niveles · 15 ejecuciones». */
  subtitle: string;
  levels: LevelCardView[];
};

/** Una tarea y, debajo, una tarjeta por nivel: se compara un nivel consigo mismo a lo largo del
 *  tiempo, nunca un nivel con otro (el criterio de éxito es distinto). */
export function TaskSection({ view }: { view: TaskSectionView }) {
  return (
    <section className={styles.section} aria-label={view.title}>
      <div className={styles.header}>
        <h2 className={styles.title}>{view.title}</h2>
        <Text variant="caption" tone="faint">{view.subtitle}</Text>
      </div>
      <div className={styles.grid}>
        {view.levels.map((l) => <LevelCard key={l.key} view={l} />)}
      </div>
    </section>
  );
}
