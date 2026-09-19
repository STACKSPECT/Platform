import { KpiCard } from "../../molecules";
import type { KpiItem } from "./KpiGrid.helper";
import styles from "./KpiGrid.module.css";

export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div className={styles.grid}>
      {items.map((k) => <KpiCard key={k.label} {...k} />)}
    </div>
  );
}
