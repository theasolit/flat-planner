import type { ComponentProps, RefObject } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./FlatPlanView.module.css";
import FloorPlanCanvas from "../canvas/FloorPlanCanvas";
import type { PlanBounds } from "../../types";

type CanvasProps = Omit<
  ComponentProps<typeof FloorPlanCanvas>,
  "canvasRef" | "canvasSize" | "bounds" | "scale"
>;

type Props = {
  canvasRef: RefObject<HTMLDivElement | null>;
  canvasSize: { width: number; height: number };
  bounds: PlanBounds | null;
  scale: number;
  canFit: boolean;
  canResetZoom: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToView: () => void;
  canvasProps: CanvasProps;
};

export default function FlatPlanView({
  canvasRef,
  canvasSize,
  bounds,
  scale,
  canFit,
  canResetZoom,
  onZoomOut,
  onZoomIn,
  onFitToView,
  canvasProps,
}: Props) {
  return (
    <>
      <div className={styles.floorPlanToolbar}>
        <h2 className={`${sharedStyles.workspaceTitle} ${styles.floorPlanTitle}`}>
          Floor plan
        </h2>
        <div className={styles.zoomControls}>
          <button
            className={styles.zoomButton}
            type="button"
            onClick={onZoomOut}
            disabled={!canFit}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            className={styles.zoomButton}
            type="button"
            onClick={onZoomIn}
            disabled={!canFit}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            className={styles.zoomButton}
            type="button"
            onClick={onFitToView}
            disabled={!canResetZoom}
          >
            Fit to view
          </button>
        </div>
      </div>
      <FloorPlanCanvas
        canvasRef={canvasRef}
        canvasSize={canvasSize}
        bounds={bounds}
        scale={scale}
        {...canvasProps}
      />
    </>
  );
}
