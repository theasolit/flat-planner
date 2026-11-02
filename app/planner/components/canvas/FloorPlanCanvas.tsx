import type { PointerEvent, RefObject } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./FloorPlanCanvas.module.css";
import {
  CanonicalWallLayer,
  FurnitureTemplateLayer,
  RoomShapeLayer,
  WallOpeningsLayer,
} from "./RoomGeometryLayers";
import { getRoomArea } from "../../geometry/geometry";
import type {
  FurniturePlacement,
  FurnitureTemplate,
  Pair,
  PlanBounds,
  Room,
  WallOpening,
  WallSegment,
} from "../../types";

type CanvasSize = { width: number; height: number };

type Props = {
  canvasRef: RefObject<HTMLDivElement | null>;
  canvasSize: CanvasSize;
  bounds: PlanBounds | null;
  scale: number;
  isFlatLocked: boolean;
  rooms: Room[];
  selectedRoomId: number | null;
  selectedFurnitureId: string | null;
  wallSegments: WallSegment[];
  wallOpenings: WallOpening[];
  wallThickness: number;
  wallThicknesses: Record<string, number>;
  furniturePlacements: FurniturePlacement[];
  furnitureTemplates: FurnitureTemplate[];
  onBackgroundClick: () => void;
  onWallClick: (segment: WallSegment, point: Pair) => void;
  onOpeningPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    opening: WallOpening,
  ) => void;
  onOpeningPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onOpeningPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
  onRoomClick: (room: Room) => void;
  onRoomPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    room: Room,
  ) => void;
  onRoomPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onRoomPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
};

export default function FloorPlanCanvas({
  canvasRef,
  canvasSize,
  bounds,
  scale,
  isFlatLocked,
  rooms,
  selectedRoomId,
  selectedFurnitureId,
  wallSegments,
  wallOpenings,
  wallThickness,
  wallThicknesses,
  furniturePlacements,
  furnitureTemplates,
  onBackgroundClick,
  onWallClick,
  onOpeningPointerDown,
  onOpeningPointerMove,
  onOpeningPointerUp,
  onRoomClick,
  onRoomPointerDown,
  onRoomPointerMove,
  onRoomPointerUp,
}: Props) {
  return (
    <div
      ref={canvasRef}
      className={`${sharedStyles.canvas} ${styles.floorPlanCanvas}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onBackgroundClick();
        }
      }}
    >
      {rooms.length === 0 ? (
        <p className={sharedStyles.helperText}>Add a room to see it here.</p>
      ) : (
        <div
          className={styles.floorPlanContents}
          style={{
            transform: bounds
              ? `translate(${(canvasSize.width - (bounds.width / 2) * scale) / 2 -
                (bounds.minX / 2) * scale
                }px, ${(canvasSize.height - (bounds.height / 2) * scale) / 2 -
                (bounds.minY / 2) * scale
                }px) scale(${scale})`
              : undefined,
          }}
        >
          {bounds && (
            <CanonicalWallLayer
              segments={wallSegments}
              bounds={bounds}
              onSegmentClick={onWallClick}
            />
          )}

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

          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`${sharedStyles.room} ${selectedRoomId === room.id ? sharedStyles.selectedRoom : ""
                } ${isFlatLocked ? sharedStyles.lockedRoom : ""
                }`}
              style={{
                left: `${room.x / 2}px`,
                top: `${room.y / 2}px`,
                width: `${room.width / 2}px`,
                height: `${room.length / 2}px`,
              }}
              onClick={() => onRoomClick(room)}
              onPointerDown={(event) => onRoomPointerDown(event, room)}
              onPointerMove={onRoomPointerMove}
              onPointerUp={onRoomPointerUp}
              onPointerCancel={onRoomPointerUp}
              data-room-id={room.id}
            >
              <RoomShapeLayer room={room} />
            </button>
          ))}

          {furniturePlacements.map((placement) => {
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
              >
                <FurnitureTemplateLayer
                  template={template}
                  isSelected={selectedFurnitureId === placement.id}
                  showLabel={false}
                  interactive={false}
                />
              </div>
            );
          })}
          {rooms.map((room) => (
            <span
              key={`room-label-${room.id}`}
              className={sharedStyles.roomLabel}
              data-testid="room-label"
              style={{
                left: `${room.x / 2}px`,
                top: `${room.y / 2}px`,
                width: `${room.width / 2}px`,
                height: `${room.length / 2}px`,
              }}
            >
              {room.name}
              <br />
              {Number((getRoomArea(room) / 10000).toFixed(1))} m²
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
