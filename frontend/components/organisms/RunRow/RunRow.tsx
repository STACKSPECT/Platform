import Link from "next/link";
import { Checkbox, Sparkline, Td, Text, Tr } from "../../atoms";
import { FailureCell, RunFlag } from "../../molecules";
import type { RunRowView } from "./RunRow.helper";
import styles from "./RunRow.module.css";

type Props = {
  view: RunRowView;
  selected: boolean;
  /** No se puede marcar: ya hay dos y esta no es una de ellas. */
  selectionBlocked?: boolean;
  onToggle: (id: string) => void;
  /** El commit pasa a enlace al detalle (es lo que alcanza el teclado). */
  href?: string;
  /** Y la fila entera pulsable con el ratón. La casilla y el enlace cortan la propagación
   *  para no disparar esto además de lo suyo. */
  onOpen?: () => void;
};

export function RunRow({ view: v, selected, selectionBlocked, onToggle, href, onOpen }: Props) {
  return (
    <Tr state={v.state} onClick={onOpen}>
      <Td align="center">
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onChange={() => onToggle(v.id)}
                    disabled={selectionBlocked}
                    title={selectionBlocked ? "Ya hay dos seleccionadas: desmarca una" : undefined}
                    label={`Seleccionar ${v.commit} para comparar`} />
        </span>
      </Td>
      <Td>
        <span className={styles.commit}>
          <Text variant="num" size="lg">
            {href ? <Link href={href} onClick={(e) => e.stopPropagation()}>{v.commit}</Link> : v.commit}
          </Text>
          {v.flag && <RunFlag kind={v.flag} />}
        </span>
      </Td>
      <Td><Text size="md">{v.task}</Text></Td>
      <Td><Text variant="num" size="md">{v.level}</Text></Td>
      <Td><Text variant="num" size="md">{v.speed}</Text></Td>
      <Td align="right"><Text variant="num" size="md">{v.episodes}</Text></Td>
      <Td align="right"><Text variant="num" size="lg" tone={v.success.tone}>{v.success.text}</Text></Td>
      <Td>
        <span className={styles.spark}>
          <Sparkline ratios={v.spark.ratios} tone={v.spark.tone} label={v.spark.label} />
          {v.fewLabel && <Text variant="mono" tone="faint">{v.fewLabel}</Text>}
        </span>
      </Td>
      <Td align="right"><Text variant="num" size="md">{v.cycle}</Text></Td>
      <Td><FailureCell failure={v.failure} /></Td>
      <Td align="right"><Text variant="mono" tone="faint" size="md">{v.when}</Text></Td>
    </Tr>
  );
}
