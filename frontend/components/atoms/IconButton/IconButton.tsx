import { Icon, type IconName } from "../Icon";
import styles from "./IconButton.module.css";

type Props = {
  icon: IconName;
  /** Lo que hace: es el nombre accesible y el aviso al pasar el ratón. Un botón sin texto
   *  visible no puede quedarse sin él. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

/** Botón redondo con solo un icono. */
export function IconButton({ icon, label, onClick, disabled }: Props) {
  return (
    <button type="button" className={styles.button} onClick={onClick} disabled={disabled}
            aria-label={label} title={label}>
      <Icon name={icon} size={18} />
    </button>
  );
}
