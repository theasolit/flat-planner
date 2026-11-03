import type { ComponentProps } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomDesignerView.module.css";
import { FurnitureTemplatePicker } from "../forms/FurnitureTemplatePicker";
import RoomDesignerCanvas from "../canvas/RoomDesignerCanvas";
import type { CanvasNavigation } from "../../hooks/useCanvasNavigation";
import type {
  FurnitureTemplate,
  Room,
} from "../../types";

type CanvasProps = Omit<
  ComponentProps<typeof RoomDesignerCanvas>,
  "selectedRoom" | "onCanvasClick" | "onBack" | "navigation"
>;

type Props = {
  selectedRoom: Room | undefined;
  canvasProps: CanvasProps | null;
  navigation: CanvasNavigation;
  canFit: boolean;
  canResetZoom: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitToView: () => void;
  templates: FurnitureTemplate[];
  onBack: () => void;
  onAddFurniture: ComponentProps<typeof FurnitureTemplatePicker>["onAddFurniture"];
  onCreateTemplate: () => void;
  onEditTemplate: (template: FurnitureTemplate) => void;
  onDeleteTemplate: (template: FurnitureTemplate) => void;
  onCanvasClick: (target: EventTarget | null) => void;
};

export default function RoomDesignerView({
  selectedRoom,
  canvasProps,
  navigation,
  canFit,
  canResetZoom,
  onZoomOut,
  onZoomIn,
  onFitToView,
  templates,
  onBack,
  onAddFurniture,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCanvasClick,
}: Props) {
  return (
    <div className={styles.roomDesigner}>
      <div className={styles.roomDesignerToolbar}>
        <h2 className={`${sharedStyles.workspaceTitle} ${styles.roomDesignerTitle}`}>
          {selectedRoom?.name ?? "Room Designer"}
        </h2>
        <div className={sharedStyles.zoomControls}>
          <button
            className={sharedStyles.zoomButton}
            type="button"
            onClick={onZoomOut}
            disabled={!canFit}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
          <button
            className={sharedStyles.zoomButton}
            type="button"
            onClick={onZoomIn}
            disabled={!canFit}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            className={sharedStyles.zoomButton}
            type="button"
            onClick={onFitToView}
            disabled={!canResetZoom}
          >
            Fit to view
          </button>
        </div>
      </div>

      {selectedRoom && canvasProps ? (
        <div className={styles.roomDesignerContent}>
          <RoomDesignerCanvas
            {...canvasProps}
            navigation={navigation}
            selectedRoom={selectedRoom}
            onCanvasClick={onCanvasClick}
            onBack={onBack}
          />
          <FurnitureTemplatePicker
            room={selectedRoom}
            templates={templates}
            onAddFurniture={onAddFurniture}
            onCreateTemplate={onCreateTemplate}
            onEditTemplate={onEditTemplate}
            onDeleteTemplate={onDeleteTemplate}
          />
        </div>
      ) : (
        <p className={sharedStyles.helperText}>
          Select a room from the flat layout first.
        </p>
      )}
    </div>
  );
}
