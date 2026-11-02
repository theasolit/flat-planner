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
import { useCanvasNavigation } from "./hooks/useCanvasNavigation";
import {
  useUndoRedo,
  type PlannerHistorySnapshot,
} from "./hooks/useUndoRedo";
import {
  loadSavedFlat,
  parseFlatData,
  saveFlatFile,
  saveFlatData,
  serializeFlatData,
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
  const [mobilePanel, setMobilePanel] = useState<"canvas" | "rooms" | "details">(
    "canvas",
  );
  const [isFlatLocked, setIsFlatLocked] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [dragViewBounds, setDragViewBounds] = useState<PlanBounds | null>(null);
  const [manualFloorPlanScale, setManualFloorPlanScale] = useState<number | null>(null);
  const [manualRoomDesignerScale, setManualRoomDesignerScale] =
    useState<number | null>(null);
  const [floorPlanOffset, setFloorPlanOffset] = useState({ x: 0, y: 0 });
  const [roomDesignerOffset, setRoomDesignerOffset] = useState({ x: 0, y: 0 });

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
  const [storageHydrated, setStorageHydrated] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Loading saved plan…");
  const lastSavedDataRef = useRef<string | null>(null);
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

  const calculatedRoomDesignerScale = getFitScale(
    roomDesignerBounds,
    roomDesignerCanvasSize,
  );
  const roomDesignerScale =
    manualRoomDesignerScale ?? calculatedRoomDesignerScale;
  const floorPlanNavigation = useCanvasNavigation({
    bounds: visibleFloorPlanBounds,
    canvasSize: floorPlanCanvasSize,
    scale: floorPlanScale,
    onScaleChange: setManualFloorPlanScale,
    offset: floorPlanOffset,
    onOffsetChange: setFloorPlanOffset,
  });
  const roomDesignerNavigation = useCanvasNavigation({
    bounds: roomDesignerBounds,
    canvasSize: roomDesignerCanvasSize,
    scale: roomDesignerScale,
    onScaleChange: setManualRoomDesignerScale,
    offset: roomDesignerOffset,
    onOffsetChange: setRoomDesignerOffset,
  });
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
    setFurniturePlacementLocked,
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
    isFlatLocked,
    wallThickness,
    wallThicknesses,
    wallOpenings,
    furnitureTemplates,
    furniturePlacements,
  };
  const serializedFlatData = serializeFlatData(flatData);

  function restoreHistorySnapshot(snapshot: PlannerHistorySnapshot) {
    setRooms(snapshot.rooms);
    setWallThickness(snapshot.wallThickness);
    setWallThicknesses(snapshot.wallThicknesses);
    setWallOpenings(snapshot.wallOpenings);
    setFurnitureTemplates(snapshot.furnitureTemplates);
    setFurniturePlacements(snapshot.furniturePlacements);
    setSelectedRoomId((currentRoomId) =>
      snapshot.rooms.some((room) => room.id === currentRoomId)
        ? currentRoomId
        : null,
    );
    setSelectedFurnitureId(null);
    setSelectedOpeningId(null);
    setSelectedWallId(null);
    setFurnitureDetailsPosition(null);
    setOpeningDetailsPosition(null);

    if (
      editorMode === "room-designer" &&
      !snapshot.rooms.some((room) => room.id === selectedRoomId)
    ) {
      setEditorMode("flat");
    }
  }

  const historySnapshot: PlannerHistorySnapshot = {
    rooms,
    wallThickness,
    wallThicknesses,
    wallOpenings,
    furnitureTemplates,
    furniturePlacements,
  };
  const {
    canUndo,
    canRedo,
    undo,
    redo,
    reset: resetHistory,
    beginGroup: beginHistoryGroup,
    endGroup: endHistoryGroup,
  } = useUndoRedo({
    snapshot: historySnapshot,
    onRestore: restoreHistorySnapshot,
  });
  const historyEnabled =
    editorMode !== "room-creator" && editorMode !== "furniture-creator";

  useEffect(() => {
    try {
      const savedFlat = loadSavedFlat();

      if (!savedFlat) {
        lastSavedDataRef.current = null;
        // The saved baseline must be loaded before autosave can be enabled.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAutoSaveStatus("Autosave ready");
        setStorageHydrated(true);
        return;
      }

      const savedWallOpenings = migrateLegacyWallOpenings(
        savedFlat.rooms,
        savedFlat.wallOpenings ?? [],
      );
      const loadedFlatData: Flat = {
        rooms: savedFlat.rooms,
        selectedRoomId: savedFlat.selectedRoomId,
        isFlatLocked: savedFlat.isFlatLocked ?? false,
        wallThickness: savedFlat.wallThickness ?? 10,
        wallThicknesses: savedFlat.wallThicknesses ?? {},
        wallOpenings: savedWallOpenings,
        furnitureTemplates: savedFlat.furnitureTemplates ?? [],
        furniturePlacements: savedFlat.furniturePlacements ?? [],
      };
      lastSavedDataRef.current = serializeFlatData(loadedFlatData);

      // Browser storage is only available after hydration.
      setRooms(savedFlat.rooms);
      setIsFlatLocked(savedFlat.isFlatLocked ?? false);
      setFurnitureTemplates(savedFlat.furnitureTemplates ?? []);
      setFurniturePlacements(savedFlat.furniturePlacements ?? []);
      setSelectedRoomId(savedFlat.selectedRoomId);
      setWallThickness(savedFlat.wallThickness ?? 10);
      setWallThicknesses(savedFlat.wallThicknesses ?? {});
      setWallOpenings(savedWallOpenings);
      resetHistory({
        rooms: savedFlat.rooms,
        wallThickness: savedFlat.wallThickness ?? 10,
        wallThicknesses: savedFlat.wallThicknesses ?? {},
        wallOpenings: savedWallOpenings,
        furnitureTemplates: savedFlat.furnitureTemplates ?? [],
        furniturePlacements: savedFlat.furniturePlacements ?? [],
      });
      setAutoSaveStatus("Saved automatically");
      setStorageHydrated(true);
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      setSaveMessage(`Could not load the saved flat: ${error.message}`);
      setAutoSaveStatus(`Autosave unavailable: ${error.message}`);
    }
  }, [
    resetHistory,
    setFurniturePlacements,
    setFurnitureTemplates,
    setWallOpenings,
  ]);

  useEffect(() => {
    if (
      !storageHydrated ||
      serializedFlatData === lastSavedDataRef.current
    ) {
      return;
    }

    setAutoSaveStatus("Saving…");
    const timeoutId = window.setTimeout(() => {
      try {
        saveFlatData(parseFlatData(serializedFlatData));
        lastSavedDataRef.current = serializedFlatData;
        setAutoSaveStatus("Saved automatically");
      } catch (error) {
        if (!(error instanceof Error)) {
          throw error;
        }

        setAutoSaveStatus(`Autosave failed: ${error.message}`);
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [serializedFlatData, storageHydrated]);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      const target = event.target;

      if (
        !historyEnabled ||
        !(event.ctrlKey || event.metaKey) ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.matches("input, textarea, select")))
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "z" && event.shiftKey) {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
      } else if (key === "y") {
        if (canRedo) {
          event.preventDefault();
          redo();
        }
      } else if (key === "z" && canUndo) {
        event.preventDefault();
        undo();
      }
    }

    document.addEventListener("keydown", handleHistoryShortcut);

    return () => document.removeEventListener("keydown", handleHistoryShortcut);
  }, [canRedo, canUndo, historyEnabled, redo, undo]);

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
    try {
      saveFlatData(flatData);
      lastSavedDataRef.current = serializedFlatData;
      setStorageHydrated(true);
      setAutoSaveStatus("Saved automatically");
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      setAutoSaveStatus(`Save failed: ${error.message}`);
      setSaveMessage(`Could not save in this browser: ${error.message}`);
      return;
    }

    setSaveMessage("Saved in this browser");
  }

  async function saveFlatToFile() {
    try {
      const savedFile = await saveFlatFile(flatData);

      if (!savedFile) {
        return;
      }

      setSaveMessage(
        savedFile.destination === "chosen"
          ? `Saved ${savedFile.fileName}`
          : `Downloaded ${savedFile.fileName}; location depends on browser download settings.`,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (!(error instanceof Error)) {
        throw error;
      }

      setSaveMessage(`Could not save the flat file: ${error.message}`);
    }
  }

  async function importFlat(event: ChangeEvent<HTMLInputElement>) {
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
      const importedWallOpenings = migrateLegacyWallOpenings(
        flat.rooms,
        flat.wallOpenings ?? [],
      );
      setRooms(flat.rooms);
      setIsFlatLocked(flat.isFlatLocked ?? false);
      setSelectedRoomId(flat.selectedRoomId);
      setWallThickness(flat.wallThickness ?? 10);
      setWallThicknesses(flat.wallThicknesses ?? {});
      setWallOpenings(importedWallOpenings);
      setFurnitureTemplates(flat.furnitureTemplates ?? []);
      setFurniturePlacements(flat.furniturePlacements ?? []);
      resetHistory({
        rooms: flat.rooms,
        wallThickness: flat.wallThickness ?? 10,
        wallThicknesses: flat.wallThicknesses ?? {},
        wallOpenings: importedWallOpenings,
        furnitureTemplates: flat.furnitureTemplates ?? [],
        furniturePlacements: flat.furniturePlacements ?? [],
      });
      setSelectedFurnitureId(null);
      setSelectedOpeningId(null);
      setOpeningDetailsPosition(null);
      setSelectedWallId(null);
      cancelRoomDrag();
      resetRoomEditor();
      setManualFloorPlanScale(null);
      setManualRoomDesignerScale(null);
      setFloorPlanOffset({ x: 0, y: 0 });
      setRoomDesignerOffset({ x: 0, y: 0 });
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
    if (furniturePlacements.find((placement) => placement.id === placementId)?.locked) {
      return;
    }

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
    if (
      furniturePlacements.some(
        (placement) =>
          placement.templateId === templateId && placement.locked,
      )
    ) {
      setSaveMessage(
        "Unlock every placed piece before deleting its furniture template.",
      );
      return;
    }

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
            className={`${styles.fileButton} ${styles.historyButton}`}
            type="button"
            onClick={undo}
            disabled={!historyEnabled || !canUndo}
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            className={`${styles.fileButton} ${styles.historyButton}`}
            type="button"
            onClick={redo}
            disabled={!historyEnabled || !canRedo}
            title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
          >
            Redo
          </button>
          <button
            className={styles.fileButton}
            type="button"
            onClick={saveFlatToFile}
          >
            Save file
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
            Save now
          </button>
        </div>
        <span
          className={styles.autoSaveStatus}
          role="status"
          aria-live="polite"
          data-error={
            autoSaveStatus.includes("failed") ||
            autoSaveStatus.includes("unavailable")
          }
          title={autoSaveStatus}
        >
          {autoSaveStatus}
        </span>
      </header>

      {saveMessage && (
        <div
          className={styles.toast}
          data-testid="save-toast"
          role="status"
          aria-live="polite"
        >
          {saveMessage}
        </div>
      )}

      <div className={styles.editorLayout}>
        <RoomListPanel
          className={
            mobilePanel === "rooms"
              ? styles.mobilePanelVisible
              : styles.mobilePanelHidden
          }
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          isFlatLocked={isFlatLocked}
          onToggleLock={toggleFlatLock}
          onAddRoom={() => {
            setMobilePanel("canvas");
            startRoomCreation();
          }}
          onSelectRoom={(roomId) => {
            setSelectedRoomId(roomId);
            setManualRoomDesignerScale(null);
            setRoomDesignerOffset({ x: 0, y: 0 });
            setEditorMode("room-designer");
            setMobilePanel("canvas");
          }}
          onRemoveRoom={removeRoom}
        />

        <section
          className={`${styles.workspace} ${
            mobilePanel === "canvas"
              ? styles.mobilePanelVisible
              : styles.mobilePanelHidden
          }`}
        >
          {editorMode === "flat" ? (
            <FlatPlanView
              canvasRef={floorPlanCanvasRef}
              canvasSize={floorPlanCanvasSize}
              bounds={visibleFloorPlanBounds}
              scale={floorPlanScale}
              navigation={floorPlanNavigation}
              canFit={Boolean(floorPlanBounds)}
              canResetZoom={
                Boolean(floorPlanBounds) &&
                (manualFloorPlanScale !== null ||
                  floorPlanOffset.x !== 0 ||
                  floorPlanOffset.y !== 0)
              }
              onZoomOut={() =>
                setManualFloorPlanScale(Math.max(0.2, floorPlanScale / 1.2))
              }
              onZoomIn={() =>
                setManualFloorPlanScale(Math.min(5, floorPlanScale * 1.2))
              }
              onFitToView={() => {
                setManualFloorPlanScale(null);
                setFloorPlanOffset({ x: 0, y: 0 });
              }}
              canvasProps={{
                isFlatLocked,
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
                  setMobilePanel("details");
                },
                onOpeningPointerDown: (event, opening) => {
                  beginHistoryGroup();
                  startOpeningDrag(event, opening);
                },
                onOpeningPointerMove: moveOpening,
                onOpeningPointerUp: (event) => {
                  stopOpeningDrag(event);
                  endHistoryGroup();
                },
                onRoomClick: (room) => {
                  setSelectedRoomId(room.id);
                  setManualRoomDesignerScale(null);
                  setRoomDesignerOffset({ x: 0, y: 0 });
                  setSelectedWallId(null);

                  if (!wasRoomDragged.current) {
                    setEditorMode("room-designer");
                    setMobilePanel("canvas");
                  }
                },
                onFurnitureClick: (placement) => {
                  setSelectedRoomId(placement.roomId);
                  setManualRoomDesignerScale(null);
                  setRoomDesignerOffset({ x: 0, y: 0 });
                  setSelectedWallId(null);
                  setSelectedFurnitureId(null);
                  setSelectedOpeningId(null);
                  setFurnitureDetailsPosition(null);
                  setOpeningDetailsPosition(null);
                  setEditorMode("room-designer");
                  setMobilePanel("canvas");
                },
                onRoomPointerDown: (event, room) => {
                  beginHistoryGroup();
                  startRoomDrag(event, room);
                },
                onRoomPointerMove: moveRoom,
                onRoomPointerUp: (event) => {
                  stopRoomDrag(event);
                  endHistoryGroup();
                },
              }}
            />
          ) : (
            <>

              {editorMode === "room-designer" && (
                <RoomDesignerView
                  selectedRoom={selectedRoom}
                  navigation={roomDesignerNavigation}
                  canFit={Boolean(roomDesignerBounds)}
                  canResetZoom={
                    Boolean(roomDesignerBounds) &&
                    (manualRoomDesignerScale !== null ||
                      roomDesignerOffset.x !== 0 ||
                      roomDesignerOffset.y !== 0)
                  }
                  onZoomOut={() =>
                    setManualRoomDesignerScale(
                      Math.max(0.2, roomDesignerScale / 1.2),
                    )
                  }
                  onZoomIn={() =>
                    setManualRoomDesignerScale(
                      Math.min(5, roomDesignerScale * 1.2),
                    )
                  }
                  onFitToView={() => {
                    setManualRoomDesignerScale(null);
                    setRoomDesignerOffset({ x: 0, y: 0 });
                  }}
                  canvasProps={
                    selectedRoom
                      ? {
                          canvasRef: roomDesignerCanvasRef,
                          canvasSize: roomDesignerCanvasSize,
                          isFlatLocked,
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
                          onOpeningPointerDown: (event, opening) => {
                            beginHistoryGroup();
                            startOpeningDrag(event, opening);
                          },
                          onOpeningPointerMove: moveOpening,
                          onOpeningPointerUp: (event) => {
                            stopOpeningDrag(event);
                            endHistoryGroup();
                          },
                          onFurniturePointerDown: (event, placement) => {
                            beginHistoryGroup();
                            startFurnitureDrag(event, placement);
                          },
                          onFurniturePointerMove: moveFurniture,
                          onFurniturePointerUp: (event) => {
                            stopFurnitureDrag(event);
                            endHistoryGroup();
                          },
                        }
                      : null
                  }
                  templates={furnitureTemplates}
                  onBack={() => {
                    setManualFloorPlanScale(null);
                    setManualRoomDesignerScale(null);
                    setFloorPlanOffset({ x: 0, y: 0 });
                    setRoomDesignerOffset({ x: 0, y: 0 });
                    setSelectedFurnitureId(null);
                    setFurnitureDetailsPosition(null);
                    setEditorMode("flat");
                    setMobilePanel("canvas");
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
                  title={editingRoomId === null ? "Room Creator" : "Edit room"}
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
                  title="Furniture Creator"
                  nameLabel="Template Name"
                  previewName="New furniture"
                  saveLabel="Save"
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
          className={
            mobilePanel === "details"
              ? styles.mobilePanelVisible
              : styles.mobilePanelHidden
          }
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
          setFurniturePlacementLocked={setFurniturePlacementLocked}
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
        <nav className={styles.mobilePanelNav} aria-label="Planner panels">
          {(
            [
              ["canvas", "Plan"],
              ["rooms", "Rooms"],
              ["details", "Details"],
            ] as const
          ).map(([panel, label]) => (
            <button
              key={panel}
              type="button"
              aria-pressed={mobilePanel === panel}
              onClick={() => setMobilePanel(panel)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div >
    </main >
  );
}