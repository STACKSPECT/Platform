/** Las rutas de la aplicación, en un solo sitio: quien enlaza no construye la URL a mano. */
export const routes = {
  live: "/",
  runs: "/runs",
  /** Detalle de una ejecución: por defecto, su último episodio. */
  run: (runId: string) => `/runs/${runId}`,
  /** Detalle de una ejecución, en el episodio de esa semilla. */
  episode: (runId: string, seed: number) => `/runs/${runId}/${seed}`,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un id de ejecución es un UUID. Sin esta comprobación, `/runs/abc` llega a la base, que
 *  responde con un error de sintaxis que no le dice nada a quien escribió mal la URL. */
export const isUuid = (value: string): boolean => UUID.test(value);
