"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import styles from "./FlatPlanner.module.css";
import { ShapeCompositionForm } from "./components/forms/ShapeCompositionForm";
import FlatPlanView from "./components/views/FlatPlanView";
import RoomListPanel from "./components/panels/RoomListPanel";
import {
  getCanonicalWallSegments,
  getRoomWallBounds,
  migrateLegacyWallOpenings,
} from "./geometry/geometry";
import RoomDesignerView from "./components/views/RoomDesignerView";
import DetailsPanel from "./components/panels/DetailsPanel";
import { useFurnitureEditor } from "./hooks/useFurnitureEditor";
import { useCanvasSize } from "./hooks/useCanvasSize";
import { useRoomEditor } from "./hooks/useRoomEditor";
import { useRoomDrag } from "./hooks/useRoomDrag";
import { useWallThicknessEditor } from "./hooks/useWallThicknessEditor";
import { useWallOpeningEditor } from "./hooks/useWallOpeningEditor";
import {
  downloadFlatData,
  loadSavedFlat,
  parseFlatData,
  saveFlatData,
} from "./persistence/persistence";
import { getFitScale, getFloorPlanBounds } from "./geometry/viewport";
import type {
  EditorMode,
  Flat,
  Pair,
  PlanBounds,
  Room,
  RoomDrag,
} from "./types";

export default function FlatPlanner() {
  const [editorMode, setEditorMode] = useState<EditorMode>("flat");
  const [isFlatLocked, setIsFlatLocked] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [dragViewBounds, setDragViewBounds] = useState<PlanBounds | null>(null);
  const [manualFloorPlanScale, setManualFloorPlanScale] = useState<number | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [roomDrag, setRoomDrag] = useState<RoomDrag | null>(null);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const {
    floorPlanCanvasRef,
    floorPlanCanvasSize,
    roomDesignerCanvasRef,
    roomDesignerCanvasSize,
  } = useCanvasSize(editorMode, selectedRoomId);

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
  const floorPlanBounds = getFloorPlanBounds(canonicalWallSegments);

  const visibleFloorPlanBounds = dragViewBounds ?? floorPlanBounds;
  const calculatedFloorPlanScale = getFitScale(
    visibleFloorPlanBounds,
    floorPlanCanvasSize,
  );
  const floorPlanScale =
    roomDrag?.scale ?? manualFloorPlanScale ?? calculatedFloorPlanScale;
  const roomDesignerBounds = selectedRoom
    ? getRoomWallBounds(selectedRoom, wallThickness, wallThicknesses)
    : null;

  const roomDesignerScale = getFitScale(
    roomDesignerBounds,
    roomDesignerCanvasSize,
  );
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
  const roomDragEditor = useRoomDrag({
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
  });
  const {
    wasRoomDragged,
    startRoomDrag,
    moveRoom,
    stopRoomDrag,
    cancelRoomDrag,
  } = roomDragEditor;
  const selectedWall = canonicalWallSegments.find(
    (segment) => segment.id === selectedWallId,
  );
  const { updateSelectedWallThickness } = useWallThicknessEditor({
    rooms,
    selectedRoomId,
    selectedWall,
    wallThickness,
    wallThicknesses,
    isFlatLocked,
    setRooms,
    setWallThicknesses,
  });
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
  const roomEditor = useRoomEditor({
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
  });
  const {
    editingRoomId,
    roomDraftName,
    setRoomDraftName,
    startRoomCreation,
    editSelectedRoom,
    cancelRoomEditing,
    resetRoomEditor,
    updateRoomName,
    saveRoom,
  } = roomEditor;

  const flatData: Flat = {
    rooms,
    selectedRoomId,
    wallThickness,
    wallThicknesses,
    wallOpenings,
    furnitureTemplates,
    furniturePlacements,
  };

  useEffect(() => {
    try {
      const savedFlat = loadSavedFlat();

      if (!savedFlat) {
        return;
      }

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

  function saveFlat() {
    saveFlatData(flatData);
    setSaveMessage("Saved in this browser");
  }

  function exportFlat() {
    downloadFlatData(flatData);
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
      cancelRoomDrag();
      resetRoomEditor();
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

  function toggleFlatLock() {
    const shouldLock = !isFlatLocked;
    setIsFlatLocked(shouldLock);

    if (shouldLock) {
      if (editorMode === "room-creator") {
        setEditorMode("flat");
        resetRoomEditor();
      }
      cancelRoomDrag();
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
        <RoomListPanel
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          isFlatLocked={isFlatLocked}
          onToggleLock={toggleFlatLock}
          onAddRoom={startRoomCreation}
          onSelectRoom={(roomId) => {
            setSelectedRoomId(roomId);
            setEditorMode("room-designer");
          }}
          onRemoveRoom={removeRoom}
        />

        <section className={styles.workspace}>
          {editorMode === "flat" ? (
            <FlatPlanView
              canvasRef={floorPlanCanvasRef}
              canvasSize={floorPlanCanvasSize}
              bounds={visibleFloorPlanBounds}
              scale={floorPlanScale}
              canFit={Boolean(floorPlanBounds)}
              canResetZoom={
                Boolean(floorPlanBounds) && manualFloorPlanScale !== null
              }
              onZoomOut={() =>
                setManualFloorPlanScale(Math.max(0.2, floorPlanScale / 1.2))
              }
              onZoomIn={() =>
                setManualFloorPlanScale(Math.min(5, floorPlanScale * 1.2))
              }
              onFitToView={() => setManualFloorPlanScale(null)}
              canvasProps={{
                rooms,
                selectedRoomId,
                selectedFurnitureId,
                wallSegments: canonicalWallSegments,
                wallOpenings,
                wallThickness,
                wallThicknesses,
                furniturePlacements,
                furnitureTemplates,
                onBackgroundClick: () => {
                  setSelectedRoomId(null);
                  setSelectedWallId(null);
                  setSelectedFurnitureId(null);
                },
                onWallClick: (segment, point) => {
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
                },
                onOpeningPointerDown: startOpeningDrag,
                onOpeningPointerMove: moveOpening,
                onOpeningPointerUp: stopOpeningDrag,
                onRoomClick: (room) => {
                  setSelectedRoomId(room.id);
                  setSelectedWallId(null);

                  if (!wasRoomDragged.current) {
                    setEditorMode("room-designer");
                  }
                },
                onRoomPointerDown: startRoomDrag,
                onRoomPointerMove: moveRoom,
                onRoomPointerUp: stopRoomDrag,
                onFurniturePointerDown: startFurnitureDrag,
                onFurniturePointerMove: moveFurniture,
                onFurniturePointerUp: stopFurnitureDrag,
              }}
            />
          ) : (
            <>

              {editorMode === "room-designer" && (
                <RoomDesignerView
                  selectedRoom={selectedRoom}
                  canvasProps={
                    selectedRoom
                      ? {
                          canvasRef: roomDesignerCanvasRef,
                          canvasSize: roomDesignerCanvasSize,
                          rooms,
                          bounds: roomDesignerBounds,
                          scale: roomDesignerScale,
                          wallSegments: canonicalWallSegments,
                          wallOpenings,
                          wallThickness,
                          wallThicknesses,
                          furniturePlacements,
                          furnitureTemplates,
                          selectedFurnitureId,
                          onOpeningPointerDown: startOpeningDrag,
                          onOpeningPointerMove: moveOpening,
                          onOpeningPointerUp: stopOpeningDrag,
                          onFurniturePointerDown: startFurnitureDrag,
                          onFurniturePointerMove: moveFurniture,
                          onFurniturePointerUp: stopFurnitureDrag,
                        }
                      : null
                  }
                  templates={furnitureTemplates}
                  onBack={() => {
                    setManualFloorPlanScale(null);
                    setEditorMode("flat");
                  }}
                  onAddFurniture={addFurnitureToRoom}
                  onCreateTemplate={() =>
                    setEditorMode("furniture-creator")
                  }
                  onDeleteTemplate={(template) =>
                    removeFurnitureTemplate(template.id)
                  }
                  onCanvasClick={(target) => {
                    if (
                      target instanceof Element &&
                      target.closest(
                        `.${styles.furnitureItem}, .${styles.wallOpening}`,
                      )
                    ) {
                      return;
                    }

                    setSelectedFurnitureId(null);
                  }}
                />
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
                  onBack={cancelRoomEditing}
                  onNameChange={setRoomDraftName}
                  onSave={saveRoom}
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