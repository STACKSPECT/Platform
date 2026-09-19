import { Icon } from "../../atoms";
import styles from "./ThemeToggle.module.css";

/** Cambia entre tema claro y oscuro. Enseña el icono del tema al que llevaría. */
export function ThemeToggle({ theme, onToggle }: {
  theme: "light" | "dark"; onToggle: () => void;
}) {
  const next = theme === "dark" ? "claro" : "oscuro";
  return (
    <button type="button" className={styles.toggle} onClick={onToggle}
            aria-label={`Cambiar al tema ${next}`} title={`Tema ${next}`}>
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}
