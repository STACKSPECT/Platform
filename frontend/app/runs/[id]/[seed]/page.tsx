import { notFound } from "next/navigation";
import { RunDetailScreen } from "@/components/screens/RunDetailScreen";
import { isUuid } from "@/lib/routes";

/** Detalle de una ejecución, en el episodio de una semilla. */
export default async function Page({ params }: PageProps<"/runs/[id]/[seed]">) {
  const { id, seed } = await params;
  const n = Number(seed);
  // Un id es un UUID y una semilla, un entero: si no, es una URL que no existe.
  if (!isUuid(id) || !Number.isInteger(n)) notFound();
  return <RunDetailScreen runId={id} seed={n} />;
}
