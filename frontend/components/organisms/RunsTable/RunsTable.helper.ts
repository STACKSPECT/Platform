import type { Run } from "@/lib/supabase";
import { toRunRowView } from "../RunRow";

export function buildRows(runs: Run[], selectedIds: string[]) {
  return runs.map((r) => ({ view: toRunRowView(r, selectedIds.includes(r.id)),
                            selected: selectedIds.includes(r.id) }));
}
