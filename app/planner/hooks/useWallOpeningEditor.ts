import { useRef, useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import {
  getStraightRoomBoundaryEdges,
} from "../geometry/geometry";
import {
  findOpeningOffset,
  findOpeningSlot as findAvailableOpeningSlot,
} from "../geometry/openingGeometry";
import type { Room, WallOpening } from "../types";

type Props = {
  rooms: Room[];
  selectedRoom: Room | undefined;
  isFlatLocked: boolean;
  setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
  setSelectedWallId: Dispatch<SetStateAction<string | null>>;
};

export function useWallOpeningEditor({
  rooms,
  selectedRoom,
  isFlatLocked,
  setSelectedRoomId,
  setSelectedWallId,
}: Props) {
  const [wallOpenings, setWallOpenings] = useState<WallOpening[]>([]);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const openingDetailsRef = useRef<HTMLDivElement>(null);
  const [openingDetailsPosition, setOpeningDetailsPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [openingDrag, setOpeningDrag] = useState<{
    openingId: string;
    pointerId: number;
    roomId: number;
  } | null>(null);

  function getOpeningEdge(room: Room, sourceId: string) {
    return getStraightRoomBoundaryEdges(room).find(
      (edge) => edge.id === sourceId,
    );
  }

  function getOpeningEdgeLength(sourceId: string): number | undefined {
    const edge = rooms
      .map((room) => getOpeningEdge(room, sourceId))
      .find((candidate) => candidate !== undefined);

    return edge?.length;
  }

  function getRoomOpeningEdges(room: Room) {
    return getStraightRoomBoundaryEdges(room);
  }

  function findOpeningSlot(
    sourceId: string,
    openings: WallOpening[],
  ): { offset: number; width: number } | undefined {
    const edgeLength = getOpeningEdgeLength(sourceId);

    if (edgeLength === undefined) {
      return undefined;
    }

    return findAvailableOpeningSlot(sourceId, openings, edgeLength);
  }

  function positionOpeningDetails(openingId: string, x: number, y: number) {
    setSelectedOpeningId(openingId);
    setOpeningDetailsPosition({
      left: Math.max(8, Math.min(x - 236, window.innerWidth - 228)),
      top: Math.max(8, Math.min(y, window.innerHeight - 320)),
    });
  }

  function addOpeningToSelectedRoom(kind: "door" | "window") {
    if (isFlatLocked || !selectedRoom) {
      return;
    }

    const slot = getRoomOpeningEdges(selectedRoom)
      .map((edge) => ({
        sourceId: edge.id,
        slot: findOpeningSlot(edge.id, wallOpenings),
      }))
      .find((item) => item.slot !== undefined);

    if (!slot?.slot) {
      return;
    }

    const opening = {
      id: crypto.randomUUID(),
      sourceId: slot.sourceId,
      offset: slot.slot.offset,
      width: slot.slot.width,
      kind,
    };

    setWallOpenings((current) => [...current, opening]);
    setSelectedOpeningId(opening.id);
  }

  function updateWallOpening(
    openingId: string,
    field: "width" | "offset",
    value: number,
  ) {
    if (isFlatLocked || !Number.isFinite(value)) {
      return;
    }

    setWallOpenings((currentOpenings) =>
      currentOpenings.map((opening) => {
        if (opening.id !== openingId) {
          return opening;
        }

        const edgeLength = getOpeningEdgeLength(opening.sourceId);

        if (edgeLength === undefined) {
          return opening;
        }

        const neighbors = currentOpenings
          .filter(
            (other) =>
              other.id !== opening.id && other.sourceId === opening.sourceId,
          )
          .sort((a, b) => a.offset - b.offset);

        const previous = neighbors
          .filter((other) => other.offset + other.width <= opening.offset)
          .at(-1);
        const next = neighbors.find(
          (other) => other.offset >= opening.offset + opening.width,
        );

        const minimumOffset = previous
          ? previous.offset + previous.width
          : 0;
        const maximumOffset = next ? next.offset : edgeLength;
        const width =
          field === "width"
            ? Math.max(1, Math.min(value, maximumOffset - opening.offset))
            : opening.width;
        const offset =
          field === "offset"
            ? Math.min(Math.max(value, minimumOffset), maximumOffset - width)
            : opening.offset;

        return { ...opening, width, offset };
      }),
    );
  }

  function updateOpeningSwingSide(
    openingId: string,
    swingSide: "left" | "right",
  ) {
    if (isFlatLocked) {
      return;
    }

    setWallOpenings((currentOpenings) =>
      currentOpenings.map((opening) =>
        opening.id === openingId ? { ...opening, swingSide } : opening,
      ),
    );
  }

  function moveOpeningToPosition(
    openingId: string,
    sourceId: string,
    requestedOffset: number,
  ) {
    if (isFlatLocked) {
      return;
    }

    setWallOpenings((currentOpenings) => {
      const opening = currentOpenings.find((item) => item.id === openingId);
      const edgeLength = getOpeningEdgeLength(sourceId);

      if (!opening || edgeLength === undefined || opening.width > edgeLength) {
        return currentOpenings;
      }

      const openingWidth = opening.width;
      const neighbors = currentOpenings
        .filter(
          (item) => item.id !== openingId && item.sourceId === sourceId,
        )
        .sort((a, b) => a.offset - b.offset);

      const bestOffset = findOpeningOffset(
        requestedOffset,
        openingWidth,
        edgeLength,
        neighbors,
      );

      if (bestOffset === undefined) {
        return currentOpenings;
      }

      const openingOffset = bestOffset;

      return currentOpenings.map((item) =>
        item.id === openingId
          ? { ...item, sourceId, offset: openingOffset }
          : item,
      );
    });
  }

  function startOpeningDrag(
    event: PointerEvent<HTMLButtonElement>,
    opening: WallOpening,
  ) {
    if (isFlatLocked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    const roomId = Number(opening.sourceId.split("-")[0]);
    setSelectedRoomId(roomId);
    positionOpeningDetails(opening.id, event.clientX, event.clientY);
    setSelectedWallId(null);

    setOpeningDrag({
      openingId: opening.id,
      pointerId: event.pointerId,
      roomId,
    });
  }

  function moveOpening(event: PointerEvent<HTMLButtonElement>) {
    if (
      isFlatLocked ||
      !openingDrag ||
      event.pointerId !== openingDrag.pointerId
    ) {
      return;
    }

    const roomElement = document.querySelector<HTMLElement>(
      `[data-room-id="${openingDrag.roomId}"]`,
    );

    if (!roomElement) {
      return;
    }

    const bounds = roomElement.getBoundingClientRect();

    if (bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const opening = wallOpenings.find(
      (item) => item.id === openingDrag.openingId,
    );

    if (!opening) {
      return;
    }

    const room = rooms.find((item) => item.id === openingDrag.roomId);

    if (!room || bounds.width === 0 || bounds.height === 0) {
      return;
    }

    const point: [number, number] = [
      room.x + ((event.clientX - bounds.left) / bounds.width) * room.width,
      room.y + ((event.clientY - bounds.top) / bounds.height) * room.length,
    ];
    const edge = getRoomOpeningEdges(room)
      .map((candidate) => {
        const dx = candidate.end[0] - candidate.start[0];
        const dy = candidate.end[1] - candidate.start[1];
        const ratio = Math.min(
          1,
          Math.max(
            0,
            ((point[0] - candidate.start[0]) * dx +
              (point[1] - candidate.start[1]) * dy) /
              (candidate.length * candidate.length),
          ),
        );
        const nearest: [number, number] = [
          candidate.start[0] + ratio * dx,
          candidate.start[1] + ratio * dy,
        ];

        return {
          edge: candidate,
          ratio,
          distance: Math.hypot(point[0] - nearest[0], point[1] - nearest[1]),
        };
      })
      .sort((first, second) => first.distance - second.distance)[0];

    if (!edge) {
      return;
    }

    moveOpeningToPosition(
      opening.id,
      edge.edge.id,
      edge.ratio * edge.edge.length - opening.width / 2,
    );
  }

  function stopOpeningDrag(event: PointerEvent<HTMLButtonElement>) {
    if (openingDrag?.pointerId === event.pointerId) {
      setOpeningDrag(null);
    }
  }

  function moveOpeningToEdge(openingId: string, sourceId: string) {
    if (
      isFlatLocked ||
      !selectedRoom ||
      !getOpeningEdge(selectedRoom, sourceId)
    ) {
      return;
    }

    moveOpeningToPosition(openingId, sourceId, 0);
  }

  function removeWallOpening(openingId: string) {
    if (isFlatLocked) {
      return;
    }

    setWallOpenings((currentOpenings) =>
      currentOpenings.filter((opening) => opening.id !== openingId),
    );
  }

  return {
    wallOpenings,
    setWallOpenings,
    selectedOpeningId,
    setSelectedOpeningId,
    openingDetailsRef,
    openingDetailsPosition,
    setOpeningDetailsPosition,
    addOpeningToSelectedRoom,
    updateWallOpening,
    updateOpeningSwingSide,
    startOpeningDrag,
    moveOpening,
    stopOpeningDrag,
    removeWallOpening,
    findOpeningSlot,
    positionOpeningDetails,
    moveOpeningToEdge,
  };
}
