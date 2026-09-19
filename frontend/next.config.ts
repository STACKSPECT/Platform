import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/*
 * Las credenciales viven en UN solo sitio: el `.env` de la raíz del repo, el mismo que
 * lee `load_env()` del lado Python. Tener además un `frontend/.env.local` con los
 * mismos valores es una copia que se desincroniza sola, y eso ya pasó: el de la raíz
 * estaba puesto y el del front vacío, así que la interfaz no hablaba con Supabase.
 *
 * Next solo carga ficheros de env de su propia carpeta, así que aquí se lee el de
 * arriba y se traducen los dos nombres que el navegador necesita.
 *
 * LISTA BLANCA, y es lo importante de este fichero: `.env` contiene también
 * SUPABASE_SERVICE_KEY, que se salta RLS. Todo lo que lleve el prefijo NEXT_PUBLIC_ se
 * empaqueta en el JavaScript que descarga cualquiera, así que aquí se nombran una a una
 * las claves públicas y no se recorre el fichero entero jamás.
 */
const PUBLICAS: Record<string, string> = {
  SUPABASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
  SUPABASE_ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
};

/** Nunca, bajo ningún nombre, puede acabar esto en el navegador. */
const PROHIBIDAS = ["SERVICE_KEY", "SERVICE_ROLE", "SECRET", "PASSWORD"];

function cargarEnvDeLaRaiz(): void {
  let texto: string;
  try {
    texto = readFileSync(resolve(process.cwd(), "..", ".env"), "utf8");
  } catch {
    return; // Sin .env no pasa nada: puede venir del entorno, como en CI.
  }

  for (const linea of texto.split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const corte = limpia.indexOf("=");
    if (corte < 0) continue;

    const clave = limpia.slice(0, corte).trim();
    const publica = PUBLICAS[clave];
    if (!publica) continue;

    const valor = limpia.slice(corte + 1).trim().replace(/^['"]|['"]$/g, "");
    // Lo ya exportado gana, para que CI y un `export` puntual manden sobre el fichero.
    if (valor && !process.env[publica]) process.env[publica] = valor;
  }
}

cargarEnvDeLaRaiz();

// Cinturón: si alguien añade una clave secreta a la lista blanca por descuido, que el
// build se caiga aquí y no en producción con la service_role dentro del bundle.
for (const [nombre, valor] of Object.entries(process.env)) {
  if (!nombre.startsWith("NEXT_PUBLIC_") || !valor) continue;
  if (PROHIBIDAS.some((p) => nombre.toUpperCase().includes(p))) {
    throw new Error(
      `${nombre} es pública y su nombre huele a secreto. Todo lo que lleva ` +
      `NEXT_PUBLIC_ acaba en el navegador: sácala de ahí.`,
    );
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
