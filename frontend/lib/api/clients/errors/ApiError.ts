/*
 * Error único de la capa `api/`. Los clientes capturan lo que sea que lance
 * supabase-js (un PostgrestError, un fallo de red, un TypeError) y lo relanzan con
 * esta forma, para que los hooks y las pantallas trabajen con un solo tipo.
 */

export class ApiError extends Error {
  /** Qué cliente falló, p. ej. "getRun". */
  readonly source: string;
  /** Código de PostgREST (`PGRST116`, `42501`…) si lo hubo. */
  readonly code: string | null;
  readonly details: string | null;

  constructor(source: string, message: string,
              opts: { code?: string | null; details?: string | null; cause?: unknown } = {}) {
    super(`${source}: ${message}`, { cause: opts.cause });
    this.name = "ApiError";
    this.source = source;
    this.code = opts.code ?? null;
    this.details = opts.details ?? null;
  }
}
