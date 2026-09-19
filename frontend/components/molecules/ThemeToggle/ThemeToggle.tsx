import { IconButton } from "../../atoms";

/** Cambia entre tema claro y oscuro. Enseña el icono del tema al que llevaría. */
export function ThemeToggle({ theme, onToggle }: {
  theme: "light" | "dark"; onToggle: () => void;
}) {
  const next = theme === "dark" ? "claro" : "oscuro";
  return (
    <IconButton icon={theme === "dark" ? "sun" : "moon"} label={`Cambiar al tema ${next}`}
                onClick={onToggle} />
  );
}
