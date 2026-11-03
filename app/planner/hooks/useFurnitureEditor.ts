import { useState, type Dispatch, type PointerEvent, type SetStateAction } from "react";
import type {
  EditorMode,
  FurnitureDrag,
  FurniturePlacement,
  FurnitureTemplate,
  RoomComponent,
  Room,
} from "../types";
import { createId } from "../utils/createId";

type Props = {
  rooms: Room[];
  selectedRoom: Room | undefined;
  selectedRoomId: number | null;
  editorMode: EditorMode;
  isFlatLocked: boolean;
  floorPlanScale: number;
  roomDesignerScale: number;
  setEditorMode: Dispatch<SetStateAction<EditorMode>>;
  setSelectedRoomId: Dispatch<SetStateAction<number | null>>;
  setSelectedWallId: Dispatch<SetStateAction<string | null>>;
  onSelectFurniture: (placementId: string) => void;
  onValidationMessage: (message: string) => void;
};

export function useFurnitureEditor({
  rooms,
  selectedRoom,
  selectedRoomId,
  editorMode,
  isFlatLocked,
  floorPlanScale,
  roomDesignerScale,
  setEditorMode,
  setSelectedRoomId,
  setSelectedWallId,
  onSelectFurniture,
  onValidationMessage,
}: Props) {
  const [furnitureTemplates, setFurnitureTemplates] = useState<FurnitureTemplate[]>([]);
  const [furniturePlacements, setFurniturePlacements] = useState<FurniturePlacement[]>([]);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [furnitureDrag, setFurnitureDrag] = useState<FurnitureDrag | null>(null);
  const [furnitureName, setFurnitureName] = useState("");
  const [editingFurnitureTemplateId, setEditingFurnitureTemplateId] = useState<
    string | null
  >(null);

  const selectedFurniturePlacement = furniturePlacements.find(
    (placement) =>
      placement.id === selectedFurnitureId &&
      placement.roomId === selectedRoomId,
  );
  const selectedFurnitureTemplate = selectedFurniturePlacement
    ? furnitureTemplates.find(
        (template) =>
          template.id === selectedFurniturePlacement.templateId,
      )
    : undefined;
  const editingFurnitureTemplate = furnitureTemplates.find(
    (template) => template.id === editingFurnitureTemplateId,
  );

  function editFurnitureTemplate(template: FurnitureTemplate) {
    setEditingFurnitureTemplateId(template.id);
    setFurnitureName(template.name);
    setEditorMode("furniture-creator");
  }

  function cancelFurnitureTemplateEdit() {
    setEditingFurnitureTemplateId(null);
    setFurnitureName("");
    setEditorMode("room-designer");
  }

  function saveFurnitureTemplate(
    name: string,
    width: number,
    length: number,
    components: RoomComponent[],
  ) {
    const trimmedName = name.trim();

    if (
      !trimmedName ||
      !Number.isFinite(width) ||
      !Number.isFinite(length) ||
      width <= 0 ||
      length <= 0 ||
      components.length === 0
    ) {
      return;
    }

    const editingTemplateId = editingFurnitureTemplateId;
    if (
      editingTemplateId !== null &&
      !furnitureTemplates.some((template) => template.id === editingTemplateId)
    ) {
      onValidationMessage("That furniture template is no longer available.");
      return;
    }

    const template: FurnitureTemplate = {
      id: editingTemplateId ?? createId(),
      name: trimmedName,
      shape:
        components.length === 1
          ? components[0]?.shape ?? "rectangle"
          : "rectangle",
      width,
      length,
      components,
    };

    if (editingTemplateId === null) {
      setFurnitureTemplates((current) => [...current, template]);
    } else {
      setFurnitureTemplates((current) =>
        current.map((item) => (item.id === editingTemplateId ? template : item)),
      );
    }

    setEditorMode(
      editingTemplateId === null && !isFlatLocked ? "flat" : "room-designer",
    );
    setEditingFurnitureTemplateId(null);
    setFurnitureName("");
  }

  function addFurnitureToRoom(template: FurnitureTemplate) {
    if (!selectedRoom) {
      return;
    }

    const placement: FurniturePlacement = {
      id: createId(),
      templateId: template.id,
      roomId: selectedRoom.id,
      x: selectedRoom.x + (selectedRoom.width - template.width) / 2,
      y: selectedRoom.y + (selectedRoom.length - template.length) / 2,
      rotation: 0,
    };

    setFurniturePlacements((current) => [...current, placement]);
  }

  function updateSelectedFurniture(
    field: "width" | "length" | "rotation",
    value: number,
  ) {
    const placement = selectedFurniturePlacement;
    const template = selectedFurnitureTemplate;
    const room = selectedRoom;

    if (
      !placement ||
      !template ||
      !room ||
      placement.locked ||
      !Number.isFinite(value) ||
      (field !== "rotation" && value <= 0)
    ) {
      return;
    }

    const currentWidth = placement.width ?? template.width;
    const currentLength = placement.length ?? template.length;
    const width = field === "width" ? value : currentWidth;
    const length =
      template.shape === "circle" || template.shape === "quarter-circle"
        ? currentLength * (width / currentWidth)
        : field === "length"
          ? value
          : currentLength;
    const rotation =
      field === "rotation"
        ? ((value % 360) + 360) % 360
        : placement.rotation;

    const radians = (rotation * Math.PI) / 180;
    const rotatedWidth =
      Math.abs(width * Math.cos(radians)) +
      Math.abs(length * Math.sin(radians));
    const rotatedLength =
      Math.abs(width * Math.sin(radians)) +
      Math.abs(length * Math.cos(radians));

    if (rotatedWidth > room.width || rotatedLength > room.length) {
      onValidationMessage("That furniture size or rotation does not fit in the room");
      return;
    }

    const centerX = Math.min(
      Math.max(
        placement.x + currentWidth / 2,
        room.x + rotatedWidth / 2,
      ),
      room.x + room.width - rotatedWidth / 2,
    );
    const centerY = Math.min(
      Math.max(
        placement.y + currentLength / 2,
        room.y + rotatedLength / 2,
      ),
      room.y + room.length - rotatedLength / 2,
    );

    setFurniturePlacements((current) =>
      current.map((item) =>
        item.id === placement.id
          ? {
              ...item,
              width,
              length,
              rotation,
              x: centerX - width / 2,
              y: centerY - length / 2,
            }
          : item,
      ),
    );
  }

  function startFurnitureDrag(
    event: PointerEvent<HTMLDivElement>,
    placement: FurniturePlacement,
  ) {
    event.preventDefault();
    event.stopPropagation();

    onSelectFurniture(placement.id);
    setSelectedRoomId(placement.roomId);
    setSelectedWallId(null);

    if (placement.locked) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    const scale = editorMode === "flat" ? floorPlanScale : roomDesignerScale;

    setFurnitureDrag({
      placementId: placement.id,
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startX: placement.x,
      startY: placement.y,
      scale,
    });
  }

  function moveFurniture(event: PointerEvent<HTMLDivElement>) {
    if (!furnitureDrag || event.pointerId !== furnitureDrag.pointerId) {
      return;
    }

    const placement = furniturePlacements.find(
      (item) => item.id === furnitureDrag.placementId,
    );
    const template = placement
      ? furnitureTemplates.find((item) => item.id === placement.templateId)
      : undefined;
    const room = placement
      ? rooms.find((item) => item.id === placement.roomId)
      : undefined;

    if (!placement || !template || !room) {
      return;
    }

    if (placement.locked) {
      return;
    }

    const width = placement.width ?? template.width;
    const length = placement.length ?? template.length;
    const radians = (placement.rotation * Math.PI) / 180;
    const rotatedWidth =
      Math.abs(width * Math.cos(radians)) +
      Math.abs(length * Math.sin(radians));
    const rotatedLength =
      Math.abs(width * Math.sin(radians)) +
      Math.abs(length * Math.cos(radians));

    const centerX = Math.min(
      Math.max(
        furnitureDrag.startX +
          width / 2 +
          ((event.clientX - furnitureDrag.startPointerX) * 2) /
            furnitureDrag.scale,
        room.x + rotatedWidth / 2,
      ),
      room.x + room.width - rotatedWidth / 2,
    );
    const centerY = Math.min(
      Math.max(
        furnitureDrag.startY +
          length / 2 +
          ((event.clientY - furnitureDrag.startPointerY) * 2) /
            furnitureDrag.scale,
        room.y + rotatedLength / 2,
      ),
      room.y + room.length - rotatedLength / 2,
    );
    const x = centerX - width / 2;
    const y = centerY - length / 2;

    setFurniturePlacements((current) =>
      current.map((item) =>
        item.id === furnitureDrag.placementId ? { ...item, x, y } : item,
      ),
    );
  }

  function stopFurnitureDrag(event: PointerEvent<HTMLDivElement>) {
    if (furnitureDrag?.pointerId === event.pointerId) {
      setFurnitureDrag(null);
    }
  }

  function setFurniturePlacementLocked(placementId: string, locked: boolean) {
    setFurniturePlacements((current) =>
      current.map((placement) =>
        placement.id === placementId ? { ...placement, locked } : placement,
      ),
    );

    if (locked && furnitureDrag?.placementId === placementId) {
      setFurnitureDrag(null);
    }
  }

  return {
    furnitureTemplates,
    setFurnitureTemplates,
    furniturePlacements,
    setFurniturePlacements,
    selectedFurnitureId,
    setSelectedFurnitureId,
    selectedFurniturePlacement,
    selectedFurnitureTemplate,
    editingFurnitureTemplate,
    furnitureName,
    setFurnitureName,
    editFurnitureTemplate,
    cancelFurnitureTemplateEdit,
    saveFurnitureTemplate,
    addFurnitureToRoom,
    updateSelectedFurniture,
    setFurniturePlacementLocked,
    startFurnitureDrag,
    moveFurniture,
    stopFurnitureDrag,
  };
}
