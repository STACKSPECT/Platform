import type { PalletState, Placement } from "@/lib/supabase";
import { PALLET_DEFAULT, type PalletSize } from "@/lib/pallet";
import { CogMarker, SceneLabel, SceneRect } from "../../atoms";
import { buildTopView } from "./PalletTopView.helper";
import styles from "./PalletTopView.module.css";

type Props = {
  placements: Placement[];
  state: PalletState | null;
  size?: PalletSize;
};

/** El palé visto desde arriba, con la cruz del centro de gravedad sobre lo que lo
 *  sostiene. Si el jurado entiende una sola cosa sin explicación, tiene que ser ésta. */
export function PalletTopView({ placements, state,
                                size = PALLET_DEFAULT }: Props) {
  const v = buildTopView(placements, state, undefined, size);

  return (
    <svg className={styles.svg} viewBox={`0 0 ${v.width} ${v.height}`} role="img"
         aria-label="Vista cenital del palé con el centro de gravedad">
      <SceneRect variant="frame" {...v.frame} />
      {v.planned && <SceneRect variant="planned" {...v.planned} />}

      {v.packages.map(({ key, label, variant, ...box }) => (
        <g key={key}>
          <SceneRect variant={variant} {...box} />
          {label && (
            <SceneLabel x={box.x + 8} y={box.y + box.height / 2 + 4} text={label} tone="muted" />
          )}
        </g>
      ))}

      {v.support && <SceneRect variant="support" tone={v.tone} {...v.support} />}
      {v.cog && <CogMarker x={v.cog.x} y={v.cog.y} tone={v.tone} />}
      {v.margin && <SceneLabel {...v.margin} tone={v.tone} />}

      <SceneLabel {...v.widthLabel} anchor="middle" />
      <SceneLabel {...v.depthLabel} anchor="middle" rotate={-90} />
      {v.caption && <SceneLabel {...v.caption} anchor="middle" />}
    </svg>
  );
}
