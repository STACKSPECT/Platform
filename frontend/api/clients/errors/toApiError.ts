import { ApiError } from "./ApiError";

export function toApiError(err: unknown, source: string): ApiError {
  if (err instanceof ApiError) return err;
  if (typeof err === "object" && err !== null && "message" in err) {
    const e = err as { message: string; code?: string; details?: string };
    return new ApiError(source, e.message, {
      code: e.code ?? null, details: e.details ?? null, cause: err,
    });
  }
  return new ApiError(source, String(err), { cause: err });
}
