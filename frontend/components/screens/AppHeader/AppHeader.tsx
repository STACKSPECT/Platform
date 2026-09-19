"use client";

import { usePathname } from "next/navigation";
import { useRunsTotals } from "@/api/hooks";
import { RunsTotals, TopBar } from "../../organisms";
import { activeTab } from "./AppHeader.helper";

/** La barra global con sus datos. Los totales solo se piden (y solo se enseñan) en Ejecuciones. */
export function AppHeader() {
  const active = activeTab(usePathname());
  const totals = useRunsTotals(active === "runs");

  return (
    <TopBar active={active}>
      {active === "runs" && (
        <RunsTotals runs={totals.runs.data} episodes={totals.episodes.data} />
      )}
    </TopBar>
  );
}
