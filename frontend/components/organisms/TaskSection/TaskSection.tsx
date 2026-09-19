import { Text } from "../../atoms";
import { LevelCard, type LevelCardView } from "../LevelCard";
import styles from "./TaskSection.module.css";

/** El id que lleva a la tarjeta de un nivel de una tarea. */
export function anchorOf(task: string, levelKey: string): string {
  return `${task}-nivel-${levelKey}`;
}

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
        {view.levels.map((l, i) => (
          <div key={l.key} id={anchorOf(view.task, l.key)} className={styles.anchor}>
            {/* El primero abierto: la pantalla entra enseñando métricas, no una lista de
                cabeceras, y los demás quedan a un clic. */}
            <LevelCard view={l} defaultOpen={i === 0} />
          </div>
        ))}
      </div>
    </section>
  );
}
