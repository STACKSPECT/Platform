import type { DotTone } from "../../atoms";
import type { TextTone } from "../../atoms";

/** El texto lleva el color de su punto, salvo el "light" (en vivo), que va en blanco. */
const TEXT_TONE: Record<DotTone, TextTone> = {
  light: "default",
  ok: "ok",
  warn: "warn",
  bad: "bad",
  muted: "faint",
};

export function textToneFor(tone: DotTone): TextTone {
  return TEXT_TONE[tone];
}
