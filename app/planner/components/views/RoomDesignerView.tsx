import type { ComponentProps } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomDesignerView.module.css";
import { FurnitureTemplatePicker } from "../forms/FurnitureTemplatePicker";
import RoomDesignerCanvas from "../canvas/RoomDesignerCanvas";
import type {
  FurnitureTemplate,
  Room,
} from "../../types";

type CanvasProps = Omit<
  ComponentProps<typeof RoomDesignerCanvas>,
  "selectedRoom" | "onCanvasClick" | "onBack"
>;

type Props = {
  selectedRoom: Room | undefined;
  canvasProps: CanvasProps | null;
  templates: FurnitureTemplate[];
  onBack: () => void;
  onAddFurniture: ComponentProps<typeof FurnitureTemplatePicker>["onAddFurniture"];
  onCreateTemplate: () => void;
  onDeleteTemplate: (template: FurnitureTemplate) => void;
  onCanvasClick: (target: EventTarget | null) => void;
};

export default function RoomDesignerView({
  selectedRoom,
  canvasProps,
  templates,
  onBack,
  onAddFurniture,
  onCreateTemplate,
  onDeleteTemplate,
  onCanvasClick,
}: Props) {
  return (
    <div className={styles.roomDesigner}>
      <h2 className={sharedStyles.workspaceTitle}>
        {selectedRoom?.name ?? "Room Designer"}
      </h2>

      {selectedRoom && canvasProps ? (
        <div className={styles.roomDesignerContent}>
          <RoomDesignerCanvas
            {...canvasProps}
            selectedRoom={selectedRoom}
            onCanvasClick={onCanvasClick}
            onBack={onBack}
          />
          <FurnitureTemplatePicker
            room={selectedRoom}
            templates={templates}
            onAddFurniture={onAddFurniture}
            onCreateTemplate={onCreateTemplate}
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
