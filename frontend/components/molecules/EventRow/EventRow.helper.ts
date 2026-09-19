import type { RunEvent } from "@/lib/supabase";
import { EVENT_TEXT, deg, failureText, kg, mm, seconds } from "@/lib/ui";
import type { IconName, TextTone } from "../../atoms";

/** Lo que pinta una fila del feed, ya formateado. EventRow no sabe qué es un RunEvent. */
export type EventRowProps = {
  time: string;
  icon: IconName;
  iconTone: TextTone;
  label: string;
  target: string;
  detail: string;
  failed: boolean;
};

const ICON: Record<RunEvent["kind"], IconName> = {
  perceive: "circleDot", plan: "crosshair", pick: "arrowDown",
  place: "check", settle: "wave", fail: "x",
};

const TONE: Record<RunEvent["kind"], TextTone> = {
  perceive: "muted", plan: "muted", pick: "muted",
  place: "ok", settle: "muted", fail: "bad",
};

const join = (parts: Array<string | null>) => parts.filter(Boolean).join(" · ");

/* Los payloads son jsonb libre: `mm`/`deg` del payload vienen ya en milímetros y grados,
   así que se devuelven a SI para que pase por los formateadores de lib/ui, que son el
   único sitio que decide unidades. */
const mmOf = (v: unknown) => mm(Number(v) / 1000);
const degOf = (v: unknown) => deg((Number(v) * Math.PI) / 180);

/** Qué va en la columna «qué» y en la de «detalle» de cada tipo de evento. */
function describe(e: RunEvent): { target: string; detail: string } {
  const p = (e.payload ?? {}) as Record<string, unknown>;
  const pkg = e.package_id ?? "";
  switch (e.kind) {
    case "perceive":
      return {
        target: p.seen != null ? `${p.seen} paquete${p.seen === 1 ? "" : "s"}` : "",
        detail: p.confidence != null ? `confianza ${p.confidence}` : "",
      };
    case "plan":
      return {
        target: join([p.layer != null ? `capa ${p.layer}` : null,
                      p.slot ? `hueco ${p.slot}` : null]),
        detail: "",
      };
    case "pick":
      return { target: pkg, detail: p.mass_kg != null ? kg(Number(p.mass_kg)) : "" };
    case "place":
      return {
        target: pkg,
        detail: join([
          p.error_xy_mm != null ? `error ${mmOf(p.error_xy_mm)}` : null,
          p.error_yaw_deg != null ? degOf(p.error_yaw_deg) : null,
          Number(p.overhang_mm) > 0 ? `fuera del palé ${mmOf(p.overhang_mm)}` : null,
        ]),
      };
    case "settle":
      return {
        target: p.layer != null ? `capa ${p.layer}` : "",
        detail: p.drift_mm != null ? `deriva ${mmOf(p.drift_mm)}` : "",
      };
    case "fail":
      return { target: pkg, detail: failureText(String(p.cause ?? "")) };
    default:
      return { target: pkg, detail: "" };
  }
}

export function toEventRowProps(e: RunEvent): EventRowProps {
  return {
    time: seconds(e.ts),
    icon: ICON[e.kind] ?? "circleDot",
    iconTone: TONE[e.kind] ?? "muted",
    label: EVENT_TEXT[e.kind] ?? e.kind,
    failed: e.kind === "fail",
    ...describe(e),
  };
}
