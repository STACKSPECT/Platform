import { notFound } from "next/navigation";
import { RunDetailScreen } from "@/components/screens/RunDetailScreen";
import { isUuid } from "@/lib/routes";

/** Detalle de una ejecución, en su último episodio. */
export default async function Page({ params }: PageProps<"/runs/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  return <RunDetailScreen runId={id} />;
}
