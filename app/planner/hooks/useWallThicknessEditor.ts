import type { Dispatch, SetStateAction } from "react";
import { getAdjacentRoomIds } from "../geometry/geometry";
import type { Room, WallSegment } from "../types";

type Props = {
  rooms: Room[];
  selectedRoomId: number | null;
  selectedWall: WallSegment | undefined;
  wallThickness: number;
  wallThicknesses: Record<string, number>;
  isFlatLocked: boolean;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setWallThicknesses: Dispatch<SetStateAction<Record<string, number>>>;
};

export function useWallThicknessEditor({
  rooms,
  selectedRoomId,
  selectedWall,
  wallThickness,
  wallThicknesses,
  isFlatLocked,
  setRooms,
  setWallThicknesses,
}: Props) {
  function updateSelectedWallThickness(value: number) {
    if (isFlatLocked || !selectedWall || !selectedRoomId || value <= 0) {
      return;
    }

    const anchorSource = selectedWall.sources.find(
      (source) => source.roomId === selectedRoomId,
    );

    if (!anchorSource) {
      return;
    }

    const oldThickness =
      wallThicknesses[anchorSource.sourceId] ?? wallThickness;
    const change = value - oldThickness;
    const neighborRoomIds = selectedWall.sources
      .filter(
        (source) =>
          source.roomId !== selectedRoomId &&
          source.outwardNormal[0] * anchorSource.outwardNormal[0] +
            source.outwardNormal[1] * anchorSource.outwardNormal[1] <
            -0.999,
      )
      .map((source) => source.roomId);

    const roomsToMove = new Set<number>([selectedRoomId]);
    const queue = [...neighborRoomIds];

    while (queue.length > 0) {
      const roomId = queue.shift();

      if (roomId === undefined || roomsToMove.has(roomId)) {
        continue;
      }

      roomsToMove.add(roomId);

      const room = rooms.find((item) => item.id === roomId);

      if (!room) {
        continue;
      }

      for (const adjacentId of getAdjacentRoomIds(
        room,
        rooms,
        wallThickness,
        wallThicknesses,
      )) {
        if (!roomsToMove.has(adjacentId)) {
          queue.push(adjacentId);
        }
      }
    }

    setWallThicknesses((current) => {
      const updated = { ...current };

      for (const source of selectedWall.sources) {
        updated[source.sourceId] = value;
      }

      return updated;
    });

    if (change !== 0 && neighborRoomIds.length > 0) {
      setRooms((currentRooms) =>
        currentRooms.map((room) => {
          if (room.id === selectedRoomId || !roomsToMove.has(room.id)) {
            return room;
          }

          return {
            ...room,
            x: room.x + change * anchorSource.outwardNormal[0],
            y: room.y + change * anchorSource.outwardNormal[1],
          };
        }),
      );
    }
  }

  return { updateSelectedWallThickness };
}
