import { useState, type Dispatch, type SetStateAction } from "react";
import { getComponentsBounds } from "../geometry/geometry";
import type {
  EditorMode,
  Room,
  RoomComponent,
} from "../types";

type Props = {
  rooms: Room[];
  selectedRoom: Room | undefined;
  isFlatLocked: boolean;
  setRooms: Dispatch<SetStateAction<Room[]>>;
  setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
  setEditorMode: Dispatch<SetStateAction<EditorMode>>;
  setSelectedFurnitureId: Dispatch<SetStateAction<string | null>>;
  setSelectedWallId: Dispatch<SetStateAction<string | null>>;
  setSelectedOpeningId: Dispatch<SetStateAction<string | null>>;
  setOpeningDetailsPosition: Dispatch<
    SetStateAction<{ left: number; top: number } | null>
  >;
};

export function useRoomEditor({
  rooms,
  selectedRoom,
  isFlatLocked,
  setRooms,
  setSelectedRoomId,
  setEditorMode,
  setSelectedFurnitureId,
  setSelectedWallId,
  setSelectedOpeningId,
  setOpeningDetailsPosition,
}: Props) {
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomDraftName, setRoomDraftName] = useState("New room");

  function startRoomCreation() {
    setEditingRoomId(null);
    setRoomDraftName("New room");
    setEditorMode("room-creator");
  }

  function editSelectedRoom() {
    if (isFlatLocked || !selectedRoom) {
      return;
    }

    setRoomDraftName(selectedRoom.name);
    setEditingRoomId(selectedRoom.id);
    setSelectedFurnitureId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setOpeningDetailsPosition(null);
    setEditorMode("room-creator");
  }

  function cancelRoomEditing() {
    if (isFlatLocked) {
      return;
    }

    const wasEditing = editingRoomId !== null;
    setEditingRoomId(null);
    setEditorMode(wasEditing ? "room-designer" : "flat");
  }

  function resetRoomEditor() {
    setEditingRoomId(null);
    setRoomDraftName("New room");
  }

  function updateRoomName(roomId: number, name: string) {
    if (isFlatLocked) {
      return;
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId ? { ...room, name } : room,
      ),
    );
  }

  function saveRoom(
    name: string,
    width: number,
    length: number,
    components: RoomComponent[],
  ) {
    if (isFlatLocked) {
      return;
    }

    const bounds = getComponentsBounds(components);
    const calculatedWidth = bounds ? bounds.maxX - bounds.minX : 0;
    const calculatedLength = bounds ? bounds.maxY - bounds.minY : 0;
    const roomWidth = calculatedWidth || width;
    const roomLength = calculatedLength || length;

    if (editingRoomId === null) {
      const id = Math.max(0, ...rooms.map((room) => room.id)) + 1;
      const x = rooms.reduce(
        (rightmost, room) => Math.max(rightmost, room.x + room.width + 40),
        40,
      );
      const room: Room = {
        id,
        name: name.trim() || `Room ${id}`,
        width: roomWidth,
        length: roomLength,
        x,
        y: 40,
        components,
      };

      setRooms((currentRooms) => [...currentRooms, room]);
      setSelectedRoomId(id);
      setEditorMode("flat");
    } else {
      const roomId = editingRoomId;
      setRooms((current) =>
        current.map((room) =>
          room.id === roomId
            ? {
                ...room,
                name: name.trim() || room.name,
                width: roomWidth,
                length: roomLength,
                components,
              }
            : room,
        ),
      );
      setSelectedRoomId(roomId);
      setEditorMode("room-designer");
    }

    setEditingRoomId(null);
  }

  return {
    editingRoomId,
    roomDraftName,
    setRoomDraftName,
    startRoomCreation,
    editSelectedRoom,
    cancelRoomEditing,
    resetRoomEditor,
    updateRoomName,
    saveRoom,
  };
}
