import { Text } from "../../atoms";
import { totalsText } from "./RunsTotals.helper";

export function RunsTotals({ runs, episodes }: { runs?: number; episodes?: number }) {
  const text = totalsText(runs, episodes);
  if (!text) return null;
  return <Text variant="mono" tone="muted" size="md">{text}</Text>;
}
