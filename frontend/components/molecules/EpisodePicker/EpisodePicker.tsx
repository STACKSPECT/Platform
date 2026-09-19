import { IconButton, Select, Text, type SelectOption } from "../../atoms";
import styles from "./EpisodePicker.module.css";

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Sin manejador, el botón queda bloqueado (primer o último episodio). */
  onPrev?: () => void;
  onNext?: () => void;
  /** «3 / 25»: dónde está el elegido dentro de la ejecución. */
  counter?: string;
};

/** Elige el episodio (la semilla) que se mira dentro de una ejecución: anterior, lista y
 *  siguiente. */
export function EpisodePicker({ options, value, onChange, onPrev, onNext, counter }: Props) {
  return (
    <div className={styles.picker}>
      <Text variant="label" tone="faint">Episodio</Text>
      <IconButton icon="chevronLeft" label="Episodio anterior" onClick={onPrev}
                  disabled={!onPrev} />
      <Select label="Elegir episodio" value={value} options={options} onChange={onChange} />
      <IconButton icon="chevronRight" label="Episodio siguiente" onClick={onNext}
                  disabled={!onNext} />
      {counter && <Text variant="mono" tone="muted">{counter}</Text>}
    </div>
  );
}
