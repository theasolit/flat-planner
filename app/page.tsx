"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import styles from "./page.module.css";
import {
  FurnitureTemplatePicker,
  ShapeCompositionForm,
} from "./planner/EditorForms";
import FloorPlanCanvas from "./planner/FloorPlanCanvas";
import {
  getAdjacentRoomIds,
  getCanonicalWallSegments,
  getComponentRing,
  getRoomWallBounds,
  migrateLegacyWallOpenings,
  snapRoomPosition,
} from "./planner/geometry";
import RoomDesignerCanvas from "./planner/RoomDesignerCanvas";
import DetailsPanel from "./planner/DetailsPanel";
import { useFurnitureEditor } from "./planner/useFurnitureEditor";
import { useWallOpeningEditor } from "./planner/useWallOpeningEditor";
import { parseFlatData } from "./planner/persistence";
import type {
  EditorMode,
  Flat,
  Pair,
  PlanBounds,
  Room,
  RoomComponent,
  RoomDrag,
} from "./planner/types";

export default function Home() {
  const [editorMode, setEditorMode] = useState<EditorMode>("flat");
  const [isFlatLocked, setIsFlatLocked] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const floorPlanCanvasRef = useRef<HTMLDivElement>(null);
  const [floorPlanCanvasSize, setFloorPlanCanvasSize] = useState({ width: 0, height: 0, });
  const roomDesignerCanvasRef = useRef<HTMLDivElement>(null);
  const [roomDesignerCanvasSize, setRoomDesignerCanvasSize] = useState({
    width: 0,
    height: 0,
  });
  const [dragViewBounds, setDragViewBounds] = useState<PlanBounds | null>(null);
  const [manualFloorPlanScale, setManualFloorPlanScale] = useState<number | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [roomDrag, setRoomDrag] = useState<RoomDrag | null>(null);
  const roomWasDragged = useRef(false);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  const [saveMessage, setSaveMessage] = useState("");
  const furnitureDetailsRef = useRef<HTMLDivElement>(null);
  const [furnitureDetailsPosition, setFurnitureDetailsPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const [wallThickness, setWallThickness] = useState(10);
  const [wallThicknesses, setWallThicknesses] = useState<Record<string, number>>({});
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const canonicalWallSegments = getCanonicalWallSegments(
    rooms,
    wallThickness,
    wallThicknesses,
  );
  const floorPlanBounds: PlanBounds | null =
    canonicalWallSegments.length === 0
      ? null
      : (() => {
        const minX = Math.min(
          ...canonicalWallSegments.flatMap((segment) => [
            segment.start[0] - segment.thickness,
            segment.end[0] - segment.thickness,
          ]),
        );
        const minY = Math.min(
          ...canonicalWallSegments.flatMap((segment) => [
            segment.start[1] - segment.thickness,
            segment.end[1] - segment.thickness,
          ]),
        );
        const maxX = Math.max(
          ...canonicalWallSegments.flatMap((segment) => [
            segment.start[0] + segment.thickness,
            segment.end[0] + segment.thickness,
          ]),
        );
        const maxY = Math.max(
          ...canonicalWallSegments.flatMap((segment) => [
            segment.start[1] + segment.thickness,
            segment.end[1] + segment.thickness,
          ]),
        );

        return {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX,
          height: maxY - minY,
        };
      })();

  const visibleFloorPlanBounds = dragViewBounds ?? floorPlanBounds;
  const calculatedFloorPlanScale =
    visibleFloorPlanBounds &&
      floorPlanCanvasSize.width > 0 &&
      floorPlanCanvasSize.height > 0
      ? Math.min(
        Math.max(floorPlanCanvasSize.width - 64, 1) /
        (visibleFloorPlanBounds.width / 2),
        Math.max(floorPlanCanvasSize.height - 64, 1) /
        (visibleFloorPlanBounds.height / 2),
      )
      : 1;
  const floorPlanScale =
    roomDrag?.scale ?? manualFloorPlanScale ?? calculatedFloorPlanScale;
  const roomDesignerBounds = selectedRoom
    ? getRoomWallBounds(selectedRoom, wallThickness, wallThicknesses)
    : null;

  const roomDesignerScale =
    roomDesignerBounds &&
      roomDesignerCanvasSize.width > 0 &&
      roomDesignerCanvasSize.height > 0
      ? Math.min(
        Math.max(roomDesignerCanvasSize.width - 64, 1) /
        ((roomDesignerBounds.maxX - roomDesignerBounds.minX) / 2),
        Math.max(roomDesignerCanvasSize.height - 64, 1) /
        ((roomDesignerBounds.maxY - roomDesignerBounds.minY) / 2),
      )
      : 1;
  const furnitureEditor = useFurnitureEditor({
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
    onSelectFurniture: (placementId) => {
      setSelectedFurnitureId(placementId);
      setFurnitureDetailsPosition(null);
    },
    onValidationMessage: setSaveMessage,
  });
  const {
    furnitureTemplates,
    setFurnitureTemplates,
    furniturePlacements,
    setFurniturePlacements,
    selectedFurnitureId,
    setSelectedFurnitureId,
    selectedFurniturePlacement,
    selectedFurnitureTemplate,
    furnitureName,
    setFurnitureName,
    addFurnitureTemplate,
    addFurnitureToRoom,
    updateSelectedFurniture,
    startFurnitureDrag,
    moveFurniture,
    stopFurnitureDrag,
  } = furnitureEditor;
  const selectedWall = canonicalWallSegments.find(
    (segment) => segment.id === selectedWallId,
  );
  const wallOpeningEditor = useWallOpeningEditor({
    rooms,
    selectedRoom,
    isFlatLocked,
    setSelectedRoomId,
    setSelectedWallId,
  });
  const {
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
    moveOpeningToEdge,
    removeWallOpening,
    findOpeningSlot,
    positionOpeningDetails,
  } = wallOpeningEditor;

  const [roomDraftName, setRoomDraftName] = useState("New room");

  useEffect(() => {
    const savedData = localStorage.getItem("flat-planner-v2");

    if (savedData) {
      try {
        const savedFlat = parseFlatData(savedData);
        // Browser storage is only available after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRooms(savedFlat.rooms);
        setFurnitureTemplates(savedFlat.furnitureTemplates ?? []);
        setFurniturePlacements(savedFlat.furniturePlacements ?? []);
        setSelectedRoomId(savedFlat.selectedRoomId);
        setWallThickness(savedFlat.wallThickness ?? 10);
        setWallThicknesses(savedFlat.wallThicknesses ?? {});
        setWallOpenings(
          migrateLegacyWallOpenings(
            savedFlat.rooms,
            savedFlat.wallOpenings ?? [],
          ),
        );
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        setSaveMessage(`Could not load the saved flat: ${error.message}`);
      }
    }
  }, [setFurniturePlacements, setFurnitureTemplates, setWallOpenings]);

  useEffect(() => {
    if (!saveMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveMessage("");
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [saveMessage]);

  useEffect(() => {
    function handlePointerDown(event: Event) {
      const target = event.target;

      if (
        target instanceof Node &&
        !openingDetailsRef.current?.contains(target)
      ) {
        setSelectedOpeningId(null);
        setOpeningDetailsPosition(null);
      }

      if (
        target instanceof Node &&
        !furnitureDetailsRef.current?.contains(target) &&
        !(
          target instanceof Element &&
          target.closest("[data-furniture-placement-id]")
        )
      ) {
        setSelectedFurnitureId(null);
        setFurnitureDetailsPosition(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    openingDetailsRef,
    setOpeningDetailsPosition,
    setSelectedOpeningId,
    setSelectedFurnitureId,
  ]);

  useEffect(() => {
    if (editorMode !== "flat") {
      return;
    }

    const canvas = floorPlanCanvasRef.current;

    if (!canvas) {
      return;
    }

    const updateCanvasSize = (width: number, height: number) => {
      setFloorPlanCanvasSize((currentSize) => {
        if (currentSize.width === width && currentSize.height === height) {
          return currentSize;
        }

        return { width, height };
      });
    };

    const bounds = canvas.getBoundingClientRect();
    updateCanvasSize(bounds.width, bounds.height);

    const observer = new ResizeObserver(([entry]) => {
      updateCanvasSize(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [editorMode]);

  useEffect(() => {
    if (editorMode !== "room-designer") {
      return;
    }

    const canvas = roomDesignerCanvasRef.current;

    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;

      setRoomDesignerCanvasSize((currentSize) => {
        if (currentSize.width === width && currentSize.height === height) {
          return currentSize;
        }

        return { width, height };
      });
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [editorMode, selectedRoomId]);

  function saveFlat() {
    const flatToSave: Flat = {
      rooms,
      selectedRoomId,
      wallThickness,
      wallThicknesses,
      wallOpenings,
      furnitureTemplates,
      furniturePlacements,
    };
    localStorage.setItem("flat-planner-v2", JSON.stringify(flatToSave));
    setSaveMessage("Saved in this browser");
  }

  function exportFlat() {
    const flatToExport: Flat = {
      rooms,
      selectedRoomId,
      wallThickness,
      wallThicknesses,
      wallOpenings,
      furnitureTemplates,
      furniturePlacements,
    };
    const file = new Blob([JSON.stringify(flatToExport, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "flat-planner.json";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
    setSaveMessage("Flat exported to flat-planner.json");
  }

  async   function importFlat(event: ChangeEvent<HTMLInputElement>) {
    if (isFlatLocked) {
      return;
    }
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) {
      return;
    }

    try {
      const flat = parseFlatData(await file.text());
      setRooms(flat.rooms);
      setSelectedRoomId(flat.selectedRoomId);
      setWallThickness(flat.wallThickness ?? 10);
      setWallThicknesses(flat.wallThicknesses ?? {});
      setWallOpenings(
        migrateLegacyWallOpenings(flat.rooms, flat.wallOpenings ?? []),
      );
      setFurnitureTemplates(flat.furnitureTemplates ?? []);
      setFurniturePlacements(flat.furniturePlacements ?? []);
      setSelectedFurnitureId(null);
      setSelectedOpeningId(null);
      setOpeningDetailsPosition(null);
      setSelectedWallId(null);
      setEditingRoomId(null);
      setRoomDrag(null);
      setDragViewBounds(null);
      setRoomDraftName("New room");
      setManualFloorPlanScale(null);
      setEditorMode("flat");
      setSaveMessage(`Imported ${file.name}`);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      setSaveMessage(`Could not import ${file.name}: ${error.message}`);
    }
  }

  function addRoom(
    name: string,
    width: number,
    length: number,
    components: RoomComponent[],
  ) {
    if (isFlatLocked) {
      return;
    }

    const id = Math.max(0, ...rooms.map((room) => room.id)) + 1;

    const x = rooms.reduce(
      (rightmost, room) => Math.max(rightmost, room.x + room.width + 40),
      40,
    );

    const room: Room = {
      id,
      name: name.trim() || `Room ${id}`,
      width,
      length,
      x,
      y: 40,
      components,
    };

    setRooms((currentRooms) => [...currentRooms, room]);
    setSelectedRoomId(id);
  }

  function removeRoom(roomId: number) {
    if (isFlatLocked) {
      return;
    }

    setRooms((current) => current.filter((room) => room.id !== roomId));
    setFurniturePlacements((current) =>
      current.filter((placement) => placement.roomId !== roomId),
    );
    setWallOpenings((current) =>
      current.filter((opening) => !opening.sourceId.startsWith(`${roomId}-`)),
    );
    setWallThicknesses((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([sourceId]) => !sourceId.startsWith(`${roomId}-`),
        ),
      ),
    );

    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
      setSelectedFurnitureId(null);
      setSelectedOpeningId(null);
      setOpeningDetailsPosition(null);
      setSelectedWallId(null);
      setEditorMode("flat");
    }
  }

  function removeFurniturePlacement(placementId: string) {
    setFurniturePlacements((current) =>
      current.filter((placement) => placement.id !== placementId),
    );

    if (selectedFurnitureId === placementId) {
      setSelectedFurnitureId(null);
      setFurnitureDetailsPosition(null);
    }
  }

  function positionFurnitureDetails(
    placementId: string,
    x: number,
    y: number,
  ) {
    setSelectedFurnitureId(placementId);
    setFurnitureDetailsPosition({
      left: Math.max(8, Math.min(x - 236, window.innerWidth - 228)),
      top: Math.max(8, Math.min(y, window.innerHeight - 320)),
    });
  }

  function removeFurnitureTemplate(templateId: string) {
    setFurnitureTemplates((current) =>
      current.filter((template) => template.id !== templateId),
    );
    setFurniturePlacements((current) =>
      current.filter((placement) => placement.templateId !== templateId),
    );

    if (
      selectedFurniturePlacement?.templateId === templateId ||
      furniturePlacements.some(
        (placement) =>
          placement.id === selectedFurnitureId &&
          placement.templateId === templateId,
      )
    ) {
      setSelectedFurnitureId(null);
      setFurnitureDetailsPosition(null);
    }
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

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Flat planner</h1>
        <div className={styles.fileActions}>
          <button
            className={styles.fileButton}
            type="button"
            onClick={exportFlat}
          >
            Export
          </button>
          <button
            className={styles.fileButton}
            type="button"
            onClick={() => importFileRef.current?.click()}
            disabled={isFlatLocked}
          >
            Import
          </button>
          <input
            ref={importFileRef}
            className={styles.fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Import flat from JSON file"
            onChange={importFlat}
          />
          <button className={styles.saveButton} onClick={saveFlat}>
            Save
          </button>
        </div>
      </header>

      {saveMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          {saveMessage}
        </div>
      )}

      <div className={styles.editorLayout}>
        <aside className={styles.roomPanel}>
          <div className={`${styles.doorwayHeader} ${styles.roomListHeader}`}>
            <h2 className={styles.panelTitle}>Rooms</h2>
            <div className={styles.roomHeaderActions}>
              <button
                className={styles.flatLockButton}
                type="button"
                aria-label={isFlatLocked ? "Unlock flat" : "Lock flat"}
                aria-pressed={isFlatLocked}
                title={isFlatLocked ? "Unlock flat" : "Lock flat"}
                onClick={() => {
                  const shouldLock = !isFlatLocked;
                  setIsFlatLocked(shouldLock);

                  if (shouldLock) {
                    if (editorMode === "room-creator") {
                      setEditorMode("flat");
                      setEditingRoomId(null);
                    }
                    setRoomDrag(null);
                    setDragViewBounds(null);
                  }
                }}
              >
                {isFlatLocked ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10V7a5 5 0 0 1 9.8-1.3M5 10h14v11H5zM12 14v3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 14v3" />
                  </svg>
                )}
              </button>
              <button
                className={styles.addDoorButton}
                type="button"
                aria-label="Add room"
                title="Add room"
                onClick={() => setEditorMode("room-creator")}
                disabled={isFlatLocked}
              >
                +
              </button>
            </div>
          </div>

          <ul className={styles.roomList}>
            {rooms.map((room) => (
              <li key={room.id} className={styles.doorListItem}>
                <button
                  className={`${styles.doorListButton} ${styles.roomButton} ${
                    selectedRoomId === room.id ? styles.doorListButtonSelected : ""
                  }`}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setEditorMode("room-designer");
                  }}
                >
                  {room.name}
                </button>
                <button
                  className={styles.deleteOpeningButton}
                  type="button"
                  disabled={isFlatLocked}
                  aria-label={`Remove ${room.name}`}
                  title="Remove room"
                  onClick={() => removeRoom(room.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>

        </aside>

        <section className={styles.workspace}>
          {editorMode === "flat" ? (
            <>
              <div className={styles.floorPlanToolbar}>
                <h2 className={styles.workspaceTitle}>Floor plan</h2>

                <div className={styles.zoomControls}>
                  <button
                    className={styles.zoomButton}
                    type="button"
                    onClick={() =>
                      setManualFloorPlanScale(
                        Math.max(0.2, floorPlanScale / 1.2),
                      )
                    }
                    disabled={!floorPlanBounds}
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    −
                  </button>

                  <button
                    className={styles.zoomButton}
                    type="button"
                    onClick={() =>
                      setManualFloorPlanScale(
                        Math.min(5, floorPlanScale * 1.2),
                      )
                    }
                    disabled={!floorPlanBounds}
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    +
                  </button>

                  <button
                    className={styles.zoomButton}
                    type="button"
                    onClick={() => setManualFloorPlanScale(null)}
                    disabled={!floorPlanBounds || manualFloorPlanScale === null}
                  >
                    Fit to view
                  </button>
                </div>
              </div>
              <FloorPlanCanvas
                canvasRef={floorPlanCanvasRef}
                canvasSize={floorPlanCanvasSize}
                bounds={visibleFloorPlanBounds}
                scale={floorPlanScale}
                rooms={rooms}
                selectedRoomId={selectedRoomId}
                selectedFurnitureId={selectedFurnitureId}
                wallSegments={canonicalWallSegments}
                wallOpenings={wallOpenings}
                wallThickness={wallThickness}
                wallThicknesses={wallThicknesses}
                furniturePlacements={furniturePlacements}
                furnitureTemplates={furnitureTemplates}
                onBackgroundClick={() => {
                  setSelectedRoomId(null);
                  setSelectedWallId(null);
                  setSelectedFurnitureId(null);
                }}
                onWallClick={(segment, point) => {
                  const midpoint: Pair = [
                    (segment.start[0] + segment.end[0]) / 2,
                    (segment.start[1] + segment.end[1]) / 2,
                  ];
                  const selectedSource = segment.sources.reduce(
                    (best, source) => {
                      const score =
                        (point[0] - midpoint[0]) * source.outwardNormal[0] +
                        (point[1] - midpoint[1]) * source.outwardNormal[1];
                      const bestScore =
                        (point[0] - midpoint[0]) * best.outwardNormal[0] +
                        (point[1] - midpoint[1]) * best.outwardNormal[1];

                      return score > bestScore ? source : best;
                    },
                  );

                  setSelectedWallId(segment.id);
                  setSelectedRoomId(selectedSource.roomId);
                  setSelectedFurnitureId(null);
                }}
                onOpeningPointerDown={startOpeningDrag}
                onOpeningPointerMove={moveOpening}
                onOpeningPointerUp={stopOpeningDrag}
                onRoomClick={(room) => {
                  setSelectedRoomId(room.id);
                  setSelectedWallId(null);

                  if (!roomWasDragged.current) {
                    setEditorMode("room-designer");
                  }
                }}
                onRoomPointerDown={startRoomDrag}
                onRoomPointerMove={moveRoom}
                onRoomPointerUp={stopRoomDrag}
                onFurniturePointerDown={startFurnitureDrag}
                onFurniturePointerMove={moveFurniture}
                onFurniturePointerUp={stopFurnitureDrag}
              />
            </>
          ) : (
            <>

              {editorMode === "room-designer" && (
                <div className={styles.roomDesigner}>
                  <h2 className={styles.workspaceTitle}>
                    {selectedRoom?.name ?? "Room Designer"}
                  </h2>

                  {selectedRoom ? (
                    <div className={styles.roomDesignerContent}>
                      <RoomDesignerCanvas
                        canvasRef={roomDesignerCanvasRef}
                        canvasSize={roomDesignerCanvasSize}
                        selectedRoom={selectedRoom}
                        rooms={rooms}
                        bounds={roomDesignerBounds}
                        scale={roomDesignerScale}
                        wallSegments={canonicalWallSegments}
                        wallOpenings={wallOpenings}
                        wallThickness={wallThickness}
                        wallThicknesses={wallThicknesses}
                        furniturePlacements={furniturePlacements}
                        furnitureTemplates={furnitureTemplates}
                        selectedFurnitureId={selectedFurnitureId}
                        onCanvasClick={(target) => {
                          if (
                            target instanceof Element &&
                            target.closest(`.${styles.furnitureItem}, .${styles.wallOpening}`)
                          ) {
                            return;
                          }

                          setSelectedFurnitureId(null);
                        }}
                        onBack={() => {
                          setManualFloorPlanScale(null);
                          setEditorMode("flat");
                        }}
                        onOpeningPointerDown={startOpeningDrag}
                        onOpeningPointerMove={moveOpening}
                        onOpeningPointerUp={stopOpeningDrag}
                        onFurniturePointerDown={startFurnitureDrag}
                        onFurniturePointerMove={moveFurniture}
                        onFurniturePointerUp={stopFurnitureDrag}
                      />

                      <FurnitureTemplatePicker
                        room={selectedRoom}
                        templates={furnitureTemplates}
                        onAddFurniture={addFurnitureToRoom}
                        onCreateTemplate={() =>
                          setEditorMode("furniture-creator")
                        }
                        onDeleteTemplate={(template) =>
                          removeFurnitureTemplate(template.id)
                        }
                      />
                    </div>
                  ) : (
                    <p className={styles.helperText}>
                      Select a room from the flat layout first.
                    </p>
                  )}
                </div>
              )}

              {editorMode === "room-creator" && (
                <ShapeCompositionForm
                  key={editingRoomId ?? "new-room"}
                  name={roomDraftName}
                  title={editingRoomId === null ? "Create a room" : "Edit room"}
                  initialComponents={
                    editingRoomId === null
                      ? undefined
                      : rooms.find((room) => room.id === editingRoomId)?.components
                  }
                  isEditing={editingRoomId !== null}
                  onBack={() => {
                    if (isFlatLocked) {
                      return;
                    }

                    setEditingRoomId(null);
                    setEditorMode(
                      editingRoomId === null ? "flat" : "room-designer",
                    );
                  }}
                  onNameChange={setRoomDraftName}
                  onSave={(name, width, length, components) => {
                    const points = components.flatMap(getComponentRing);
                    const minX = Math.min(...points.map(([x]) => x));
                    const minY = Math.min(...points.map(([, y]) => y));
                    const maxX = Math.max(...points.map(([x]) => x));
                    const maxY = Math.max(...points.map(([, y]) => y));

                    const roomWidth = maxX - minX || width;
                    const roomLength = maxY - minY || length;

                    if (editingRoomId === null) {
                      addRoom(name, roomWidth, roomLength, components);
                      setEditorMode("flat");
                    } else {
                      setRooms((current) =>
                        current.map((room) =>
                          room.id === editingRoomId
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
                      setSelectedRoomId(editingRoomId);
                      setEditorMode("room-designer");
                    }

                    setEditingRoomId(null);
                  }}
                />
              )}

              {editorMode === "furniture-creator" && (
                <ShapeCompositionForm
                  key="new-furniture"
                  name={furnitureName}
                  title="Create furniture template"
                  nameLabel="Furniture name"
                  previewName="New furniture"
                  saveLabel="Save furniture template"
                  newShapeWidth={100}
                  newShapeLength={60}
                  initialComponents={[
                    {
                      id: "furniture-draft-base",
                      shape: "rectangle",
                      x: 0,
                      y: 0,
                      width: 100,
                      length: 60,
                      rotation: 0,
                    },
                  ]}
                  onBack={() => setEditorMode("room-designer")}
                  onNameChange={setFurnitureName}
                  onSave={(name, width, length, components) =>
                    addFurnitureTemplate(name, width, length, components)
                  }
                />
              )}
            </>
          )}
        </section>

        <DetailsPanel
          editorMode={editorMode}
          isFlatLocked={isFlatLocked}
          furniturePlacements={furniturePlacements}
          furnitureTemplates={furnitureTemplates}
          selectedFurnitureId={selectedFurnitureId}
          selectedFurniturePlacement={selectedFurniturePlacement}
          selectedFurnitureTemplate={selectedFurnitureTemplate}
          furnitureDetailsPosition={furnitureDetailsPosition}
          furnitureDetailsRef={furnitureDetailsRef}
          selectedRoom={selectedRoom}
          selectedWall={selectedWall}
          wallOpenings={wallOpenings}
          wallThickness={wallThickness}
          selectedOpeningId={selectedOpeningId}
          openingDetailsPosition={openingDetailsPosition}
          openingDetailsRef={openingDetailsRef}
          setWallThickness={setWallThickness}
          setSelectedOpeningId={setSelectedOpeningId}
          positionFurnitureDetails={positionFurnitureDetails}
          setSelectedWallId={setSelectedWallId}
          updateSelectedFurniture={updateSelectedFurniture}
          removeFurniturePlacement={removeFurniturePlacement}
          updateSelectedWallThickness={updateSelectedWallThickness}
          updateRoomName={updateRoomName}
          onEditRoom={editSelectedRoom}
          addOpeningToSelectedRoom={addOpeningToSelectedRoom}
          findOpeningSlot={findOpeningSlot}
          positionOpeningDetails={positionOpeningDetails}
          removeWallOpening={removeWallOpening}
          moveOpeningToEdge={moveOpeningToEdge}
          updateWallOpening={updateWallOpening}
          updateOpeningSwingSide={updateOpeningSwingSide}
        />
      </div >
    </main >
  );
}