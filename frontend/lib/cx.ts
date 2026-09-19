/** Une nombres de clase descartando lo falso. Lo justo para CSS Modules, sin dependencia. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
