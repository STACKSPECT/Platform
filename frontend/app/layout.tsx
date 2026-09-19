import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/colors.css";
import "./globals.css";
import { AppHeader } from "@/components/screens/AppHeader";
import { Providers } from "./providers";

/* Dos voces, cada una con su trabajo:
   Plus Jakarta Sans para el texto de interfaz —redondeada y amable, sin perder seriedad—
   y Geist Mono para TODA magnitud física, commit y semilla. */
const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "STACKSPECT · Observabilidad de paletizado",
  description:
    "Monitorización de ejecuciones del brazo paletizador: centro de gravedad, " +
    "estabilidad y curva de mejora entre commits.",
};

/* Fija el tema ANTES del primer pintado, para que no parpadee: el que eligió el usuario y,
   si no eligió, el del sistema. Va como script en la cabecera y no como efecto de React,
   que llegaría tarde. */
const THEME_SCRIPT = `(function () {
  var theme;
  try { theme = localStorage.getItem("theme"); } catch (e) {}
  if (theme !== "light" && theme !== "dark") {
    theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
