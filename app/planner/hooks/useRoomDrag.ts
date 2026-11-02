import { useRef, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import { snapRoomPosition } from "../geometry/roomSnapping";
import type {
  FurniturePlacement,
  PlanBounds,
  Room,
  RoomDrag,
} from "../types";

type Props = {
  rooms: Room[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setFurniturePlacements: Dispatch<SetStateAction<FurniturePlacement[]>>;
  wallThickness: number;
  wallThicknesses: Record<string, number>;
  floorPlanBounds: PlanBounds | null;
  floorPlanScale: number;
  isFlatLocked: boolean;
  roomDrag: RoomDrag | null;
  setRoomDrag: Dispatch<SetStateAction<RoomDrag | null>>;
  setDragViewBounds: Dispatch<SetStateAction<PlanBounds | null>>;
  setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
};

export function useRoomDrag({
  rooms,
  setRooms,
  setFurniturePlacements,
  wallThickness,
  wallThicknesses,
  floorPlanBounds,
  floorPlanScale,
  isFlatLocked,
  roomDrag,
  setRoomDrag,
  setDragViewBounds,
  setSelectedRoomId,
}: Props) {
  const roomWasDragged = useRef(false);

  function startRoomDrag(
    event: PointerEvent<HTMLButtonElement>,
    room: Room,
  ) {
    if (isFlatLocked) {
      return;
    }

    roomWasDragged.current = false;
    setSelectedRoomId(room.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragViewBounds(floorPlanBounds);
    setRoomDrag({
      roomId: room.id,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startRoomX: room.x,
      startRoomY: room.y,
      scale: floorPlanScale,
    });
  }

  function moveRoom(event: PointerEvent<HTMLButtonElement>) {
    if (isFlatLocked || !roomDrag || event.pointerId !== roomDrag.pointerId) {
      return;
    }

    if (
      Math.abs(event.clientX - roomDrag.startPointerX) > 4 ||
      Math.abs(event.clientY - roomDrag.startPointerY) > 4
    ) {
      roomWasDragged.current = true;
    }

    const draggedRoom = rooms.find((room) => room.id === roomDrag.roomId);

    if (!draggedRoom) {
      return;
    }

    const x =
      roomDrag.startRoomX +
      ((event.clientX - roomDrag.startPointerX) * 2) / roomDrag.scale;
    const y =
      roomDrag.startRoomY +
      ((event.clientY - roomDrag.startPointerY) * 2) / roomDrag.scale;
    const position = snapRoomPosition(
      draggedRoom,
      x,
      y,
      wallThickness,
      rooms.filter((room) => room.id !== draggedRoom.id),
      wallThicknesses,
    );

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === draggedRoom.id
          ? { ...room, x: position.x, y: position.y }
          : room,
      ),
    );

    const deltaX = position.x - draggedRoom.x;
    const deltaY = position.y - draggedRoom.y;

    setFurniturePlacements((currentPlacements) =>
      currentPlacements.map((placement) =>
        placement.roomId === draggedRoom.id
          ? {
              ...placement,
              x: placement.x + deltaX,
              y: placement.y + deltaY,
            }
          : placement,
      ),
    );
  }

  function stopRoomDrag(event: PointerEvent<HTMLButtonElement>) {
    if (roomDrag?.pointerId === event.pointerId) {
      setDragViewBounds(null);
      setRoomDrag(null);
    }
  }

  function cancelRoomDrag() {
    setDragViewBounds(null);
    setRoomDrag(null);
    roomWasDragged.current = false;
  }

  return {
    wasRoomDragged: roomWasDragged,
    startRoomDrag,
    moveRoom,
    stopRoomDrag,
    cancelRoomDrag,
  };
}
