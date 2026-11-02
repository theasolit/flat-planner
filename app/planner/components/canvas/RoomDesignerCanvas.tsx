import type { PointerEvent, RefObject } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomDesignerCanvas.module.css";
import {
  CanonicalWallLayer,
  FurnitureTemplateLayer,
  RoomShapeLayer,
  WallOpeningsLayer,
} from "./RoomGeometryLayers";
import type {
  FurniturePlacement,
  FurnitureTemplate,
  PlanBounds,
  Room,
  WallOpening,
  WallSegment,
} from "../../types";

type CanvasSize = { width: number; height: number };

type Props = {
  canvasRef: RefObject<HTMLDivElement | null>;
  canvasSize: CanvasSize;
  selectedRoom: Room;
  isFlatLocked: boolean;
  rooms: Room[];
  bounds: PlanBounds | null;
  scale: number;
  wallSegments: WallSegment[];
  wallOpenings: WallOpening[];
  wallThickness: number;
  wallThicknesses: Record<string, number>;
  furniturePlacements: FurniturePlacement[];
  furnitureTemplates: FurnitureTemplate[];
  selectedFurnitureId: string | null;
  onCanvasClick: (target: EventTarget | null) => void;
  onBack: () => void;
  onOpeningPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    opening: WallOpening,
  ) => void;
  onOpeningPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onOpeningPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onFurniturePointerDown: (
    event: PointerEvent<HTMLDivElement>,
    placement: FurniturePlacement,
  ) => void;
  onFurniturePointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onFurniturePointerUp: (event: PointerEvent<HTMLDivElement>) => void;
};

export default function RoomDesignerCanvas({
  canvasRef,
  canvasSize,
  selectedRoom,
  isFlatLocked,
  rooms,
  bounds,
  scale,
  wallSegments,
  wallOpenings,
  wallThickness,
  wallThicknesses,
  furniturePlacements,
  furnitureTemplates,
  selectedFurnitureId,
  onCanvasClick,
  onBack,
  onOpeningPointerDown,
  onOpeningPointerMove,
  onOpeningPointerUp,
  onFurniturePointerDown,
  onFurniturePointerMove,
  onFurniturePointerUp,
}: Props) {
  return (
    <div
      ref={canvasRef}
      className={`${sharedStyles.canvas} ${styles.roomDesignerCanvas}`}
      onClick={(event) => onCanvasClick(event.target)}
    >
      <button
        className={styles.canvasBackButton}
        type="button"
        aria-label="Back to flat layout"
        title="Back to flat layout"
        onClick={onBack}
      >
        &lt;
      </button>
      <div
        className={styles.roomDesignerContents}
        style={{
          transform: bounds
            ? `translate(${canvasSize.width / 2 -
              ((bounds.minX + bounds.maxX) / 4) * scale
              }px, ${canvasSize.height / 2 -
              ((bounds.minY + bounds.maxY) / 4) * scale
              }px) scale(${scale})`
            : undefined,
        }}
      >
        {bounds && <CanonicalWallLayer segments={wallSegments} bounds={bounds} />}

        {rooms.map((room) => (
          <div
            key={`designer-room-${room.id}`}
            className={`${sharedStyles.room} ${room.id === selectedRoom.id ? sharedStyles.selectedRoom : ""
              }`}
            style={{
              left: `${room.x / 2}px`,
              top: `${room.y / 2}px`,
              width: `${room.width / 2}px`,
              height: `${room.length / 2}px`,
              pointerEvents: "none",
            }}
            data-room-id={room.id}
          >
            <RoomShapeLayer room={room} />
          </div>
        ))}

        <WallOpeningsLayer
          rooms={rooms}
          openings={wallOpenings}
          wallThickness={wallThickness}
          wallThicknesses={wallThicknesses}
          isLocked={isFlatLocked}
          onPointerDown={onOpeningPointerDown}
          onPointerMove={onOpeningPointerMove}
          onPointerUp={onOpeningPointerUp}
        />

        {furniturePlacements
          .filter((placement) => placement.roomId === selectedRoom.id)
          .map((placement) => {
            const template = furnitureTemplates.find(
              (item) => item.id === placement.templateId,
            );

            if (!template) {
              return null;
            }

            const width = placement.width ?? template.width;
            const length = placement.length ?? template.length;

            return (
              <div
                key={placement.id}
                data-furniture-placement-id={placement.id}
                className={`${sharedStyles.furnitureItem} ${sharedStyles.furnitureComposition} ${
                  selectedFurnitureId === placement.id
                    ? sharedStyles.selectedFurniture
                    : ""
                }`}
                style={{
                  left: `${placement.x / 2}px`,
                  top: `${placement.y / 2}px`,
                  width: `${width / 2}px`,
                  height: `${length / 2}px`,
                  transform: `rotate(${placement.rotation}deg)`,
                }}
                onPointerDown={(event) =>
                  onFurniturePointerDown(event, placement)
                }
                onPointerMove={onFurniturePointerMove}
                onPointerUp={onFurniturePointerUp}
                onPointerCancel={onFurniturePointerUp}
              >
                <FurnitureTemplateLayer
                  template={template}
                  isSelected={selectedFurnitureId === placement.id}
                  isLocked={placement.locked}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
