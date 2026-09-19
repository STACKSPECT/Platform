import { configured } from "@/lib/supabase";
import { ApiError } from "./ApiError";

/** Sin variables `NEXT_PUBLIC_SUPABASE_*` el cliente apunta a http://localhost: mejor
 *  fallar aquí con un mensaje claro que con un "Failed to fetch" opaco. */
export function assertConfigured(source: string): void {
  if (!configured) {
    throw new ApiError(
      source,
      "falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}
