import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./NavTab.module.css";

export function NavTab({ href, active, children }: {
  href: string; active: boolean; children: ReactNode;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
          className={cx(styles.tab, active && styles.active)}>
      {children}
    </Link>
  );
}
