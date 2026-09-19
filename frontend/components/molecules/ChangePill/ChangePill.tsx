import { Badge, Icon, type IconName } from "../../atoms";

const ICON: Record<"up" | "down" | "flat", IconName> = {
  up: "arrowUp", down: "arrowDown", flat: "minus",
};

/** Cuánto ha cambiado algo. La FLECHA dice si fue a mejor (arriba) o a peor (abajo), y el color lo
 *  refuerza; hacia dónde se movió el número lo dice el signo del texto. Un tiempo que baja
 *  es «−0.4 s» con flecha arriba y en verde. */
export function ChangePill({ direction, tone, children }: {
  direction: "up" | "down" | "flat"; tone: "ok" | "bad" | "muted"; children: string;
}) {
  return (
    <Badge tone={tone === "muted" ? "neutral" : tone}>
      <Icon name={ICON[direction]} size={12} />{children}
    </Badge>
  );
}
