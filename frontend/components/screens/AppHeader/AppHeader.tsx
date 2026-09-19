"use client";

import { usePathname } from "next/navigation";
import { useRunsTotals } from "@/lib/api/hooks";
import { useTheme } from "@/hooks/useTheme";
import { ThemeToggle } from "../../molecules";
import { RunsTotals, TopBar } from "../../organisms";
import { activeTab } from "./AppHeader.helper";

/** La barra global con sus datos. Los totales solo se piden (y solo se enseñan) en Ejecuciones. */
export function AppHeader() {
  const active = activeTab(usePathname());
  const totals = useRunsTotals(active === "runs");
  const { theme, toggle } = useTheme();

  return (
    <TopBar active={active}>
      {active === "runs" && (
        <RunsTotals runs={totals.runs.data} episodes={totals.episodes.data} />
      )}
      <ThemeToggle theme={theme} onToggle={toggle} />
    </TopBar>
  );
}
