import type { PalletState, Placement } from "@/lib/supabase";
import { PALLET_DEFAULT, type PalletSize } from "@/lib/pallet";
import { CogMarker, GuideLine, SceneLabel, SceneRect } from "../../atoms";
import { buildSideView } from "./PalletSideView.helper";
import styles from "./PalletSideView.module.css";

type Props = {
  placements: Placement[];
  state: PalletState | null;
  size?: PalletSize;
};

/** Las capas apiladas de perfil, con la altura del centro de gravedad. Hace visible lo
 *  que la planta no puede: un montón centrado también vuelca si es demasiado alto. */
export function PalletSideView({ placements, state,
                                size = PALLET_DEFAULT }: Props) {
  const v = buildSideView(placements, state, undefined, size);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${v.width} ${v.height}`} role="img"
         aria-label="Alzado del palé con la altura del centro de gravedad">
      <SceneRect variant="deck" {...v.deck} />
      <SceneLabel {...v.deckLabel} />

      {v.packages.map(({ key, variant, ...box }) => (
        <SceneRect key={key} variant={variant} {...box} />
      ))}

      {v.cog && (
        <>
          <GuideLine {...v.cog.line} tone={v.tone} dashed />
          <CogMarker {...v.cog.dot} tone={v.tone} variant="dot" />
          <SceneLabel {...v.cog.label} anchor="end" tone={v.tone} />
        </>
      )}

      {v.heightDim && (
        <>
          <GuideLine {...v.heightDim.line} />
          <SceneLabel {...v.heightDim.label} anchor="middle" rotate={-90} />
        </>
      )}

      <SceneLabel {...v.caption} anchor="middle" />
    </svg>
  );
}
