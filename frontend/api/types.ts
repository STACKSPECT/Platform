/* Tipos que no viven ya en `lib/supabase.ts` (Run, Episode, Placement, PalletState,
   RunEvent). Se reexportan aquí para que la capa `api/` tenga un solo punto de
   importación. */

export type {
  Run, SeedPoint, Episode, Pose, Placement, PalletState, RunEvent,
} from "@/lib/supabase";

/** Fila de `v_failure_breakdown`: cuántos episodios de un run cayeron por cada causa.
 *  `failure` es el identificador crudo: se traduce con `failureText()` (lib/ui.ts). */
export type FailureBreakdownRow = {
  run_id: string;
  failure: string;
  n: number;
};
