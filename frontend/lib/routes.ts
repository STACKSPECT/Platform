/** Las rutas de la aplicación, en un solo sitio: quien enlaza no construye la URL a mano. */
export const routes = {
  live: "/",
  runs: "/runs",
  /** Detalle de una ejecución: por defecto, su último episodio. */
  run: (runId: string) => `/runs/${runId}`,
  /** Detalle de una ejecución, en el episodio de esa semilla. */
  episode: (runId: string, seed: number) => `/runs/${runId}/${seed}`,
};
