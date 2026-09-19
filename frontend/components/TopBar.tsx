"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Barra global. Dos destinos y nada más: la demo y el análisis.
 *
 * El diseño tiene cuatro pantallas y aquí solo salen dos porque Run y Episodio se
 * alcanzan desde la tabla: son detalle, no secciones.
 */
export default function TopBar() {
  const path = usePathname();
  const onRuns = path?.startsWith("/runs") ?? false;

  return (
    <header
      style={{
        height: 48,
        flexShrink: 0,
        background: "var(--topbar)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "0 20px",
      }}
    >
      <span
        className="label"
        style={{ color: "var(--text)", fontSize: 13, letterSpacing: "0.1em" }}
      >
        Observabilidad de paletizado
      </span>
      <nav style={{ display: "flex", gap: 20 }}>
        <Tab href="/" active={!onRuns}>Live</Tab>
        <Tab href="/runs" active={onRuns}>Ejecuciones</Tab>
      </nav>
    </header>
  );
}

function Tab({ href, active, children }: {
  href: string; active: boolean; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: 13,
        color: active ? "var(--text)" : "var(--text-3)",
        // El azul acero solo marca selección. Aquí eso es justo lo que marca.
        borderBottom: active ? "2px solid var(--select)" : "2px solid transparent",
        paddingBottom: 2,
      }}
    >
      {children}
    </Link>
  );
}
