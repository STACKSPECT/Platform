import Link from "next/link";
import { Notice } from "@/components/molecules";
import { routes } from "@/lib/routes";

/** Cualquier URL que no existe, con la interfaz de la app en vez de la página por defecto. */
export default function NotFound() {
  return (
    <Notice title="Esa página no existe">
      Revisa la dirección, o <Link href={routes.runs}>vuelve a Ejecuciones</Link>.
    </Notice>
  );
}
