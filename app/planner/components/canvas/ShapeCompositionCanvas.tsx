import type { PointerEvent } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./ShapeCompositionCanvas.module.css";
import { getComponentRing } from "../../geometry/geometry";
import type { RoomComponent } from "../../types";

type Props = {
  components: RoomComponent[];
  selectedComponentId: string | null;
  viewBox: string;
  label: string;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGSVGElement>) => void;
  onComponentPointerDown: (
    component: RoomComponent,
    event: PointerEvent<SVGPathElement>,
  ) => void;
};

export default function ShapeCompositionCanvas({
  components,
  selectedComponentId,
  viewBox,
  label,
  onPointerMove,
  onPointerUp,
  onComponentPointerDown,
}: Props) {
  return (
    <div className={sharedStyles.canvas}>
      <svg
        className={styles.roomCompositionPreview}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {components.map((component) => (
          <path
            key={component.id}
            className={`${styles.roomCompositionShape} ${
              selectedComponentId === component.id
                ? styles.roomCompositionShapeSelected
                : ""
            }`}
            d={`${getComponentRing(component)
              .map(
                ([x, y], index) =>
                  `${index === 0 ? "M" : "L"} ${x} ${y}`,
              )
              .join(" ")} Z`}
            onPointerDown={(event) => onComponentPointerDown(component, event)}
          />
        ))}
      </svg>
      <div className={styles.roomCompositionLabel}>{label}</div>
    </div>
  );
}
