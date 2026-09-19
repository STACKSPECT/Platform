/** Traza de duración, solo en desarrollo. Va en el `finally` de cada cliente. */
export function trace(source: string, startedAt: number): void {
  if (process.env.NODE_ENV === "development") {
    console.debug(`[api] ${source} ${(performance.now() - startedAt).toFixed(0)} ms`);
  }
}
