import type { RunEvent } from "@/lib/supabase";
import { Text } from "../../atoms";
import { EventRow, toEventRowProps } from "../../molecules";
import { Panel } from "../Panel";
import { latestEvents } from "./EventFeed.helper";
import styles from "./EventFeed.module.css";

type Props = {
  events: RunEvent[];
  limit?: number;
  note?: string;
};

export function EventFeed({ events, limit = 12, note }: Props) {
  const rows = latestEvents(events, limit);

  return (
    <Panel
      title="Eventos"
      aside={<Text variant="caption" tone="faint">
        {note ?? `últimos ${limit} · t desde el inicio del episodio`}
      </Text>}
      className={styles.feed}
    >
      {rows.length ? (
        <ul className={styles.list}>
          {rows.map((e, i) => (
            <EventRow key={e.id ?? e.seq} highlighted={i === 0} {...toEventRowProps(e)} />
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>Todavía no hay eventos de este episodio.</p>
      )}
    </Panel>
  );
}
