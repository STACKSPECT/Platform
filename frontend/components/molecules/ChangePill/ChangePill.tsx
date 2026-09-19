import { Badge, Icon, type IconName } from "../../atoms";

const ICON: Record<"up" | "down" | "flat", IconName> = {
  up: "arrowUp", down: "arrowDown", flat: "minus",
};

/** Cuánto ha cambiado algo. La FLECHA dice hacia dónde se movió el valor y el COLOR dice si
 *  eso es bueno o malo: un tiempo que baja es una flecha hacia abajo en verde. */
export function ChangePill({ direction, tone, children }: {
  direction: "up" | "down" | "flat"; tone: "ok" | "bad" | "muted"; children: string;
}) {
  return (
    <Badge tone={tone === "muted" ? "neutral" : tone}>
      <Icon name={ICON[direction]} size={12} />{children}
    </Badge>
  );
}
