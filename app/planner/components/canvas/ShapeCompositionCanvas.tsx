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
  onCanvasPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
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
  onCanvasPointerDown,
  onComponentPointerDown,
}: Props) {
  return (
    <div
      className={sharedStyles.canvas}
      data-testid="shape-composition-canvas"
    >
      <svg
        className={styles.roomCompositionPreview}
        data-testid="shape-composition-preview"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerDown={onCanvasPointerDown}
      >
        {components.map((component) => (
          <path
            key={component.id}
            data-testid="shape-component"
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
