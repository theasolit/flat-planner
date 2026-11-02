import { createPortal } from "react-dom";
import type { Dispatch, RefObject, SetStateAction } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./DetailsPanel.module.css";
import type {
  EditorMode,
  FurniturePlacement,
  FurnitureTemplate,
  Room,
  WallOpening,
  WallSegment,
} from "../../types";
import RoomOpeningsSection from "./RoomOpeningsSection";

type Props = {
  className?: string;
  editorMode: EditorMode;
  isFlatLocked: boolean;
  furniturePlacements: FurniturePlacement[];
  furnitureTemplates: FurnitureTemplate[];
  selectedFurnitureId: string | null;
  selectedFurniturePlacement: FurniturePlacement | undefined;
  selectedFurnitureTemplate: FurnitureTemplate | undefined;
  furnitureDetailsPosition: { left: number; top: number } | null;
  furnitureDetailsRef: RefObject<HTMLDivElement | null>;
  selectedRoom: Room | undefined;
  selectedWall: WallSegment | undefined;
  wallOpenings: WallOpening[];
  wallThickness: number;
  selectedOpeningId: string | null;
  openingDetailsPosition: { left: number; top: number } | null;
  openingDetailsRef: RefObject<HTMLDivElement | null>;
  setWallThickness: Dispatch<SetStateAction<number>>;
  setSelectedOpeningId: (id: string | null) => void;
  positionFurnitureDetails: (
    placementId: string,
    x: number,
    y: number,
  ) => void;
  setSelectedWallId: (id: string | null) => void;
  updateSelectedFurniture: (field: "width" | "length" | "rotation", value: number) => void;
  setFurniturePlacementLocked: (
    placementId: string,
    locked: boolean,
  ) => void;
  removeFurniturePlacement: (placementId: string) => void;
  updateSelectedWallThickness: (value: number) => void;
  updateRoomName: (roomId: number, name: string) => void;
  onEditRoom: () => void;
  addOpeningToSelectedRoom: (kind: "door" | "window") => void;
  findOpeningSlot: (sourceId: string, openings: WallOpening[]) => { offset: number; width: number } | undefined;
  positionOpeningDetails: (openingId: string, x: number, y: number) => void;
  removeWallOpening: (openingId: string) => void;
  moveOpeningToEdge: (openingId: string, edgeId: string) => void;
  updateWallOpening: (openingId: string, field: "width" | "offset", value: number) => void;
  updateOpeningSwingSide: (
    openingId: string,
    swingSide: "left" | "right",
  ) => void;
};

export default function DetailsPanel({
  className,
  editorMode,
  isFlatLocked,
  furniturePlacements,
  furnitureTemplates,
  selectedFurnitureId,
  selectedFurniturePlacement,
  selectedFurnitureTemplate,
  furnitureDetailsPosition,
  furnitureDetailsRef,
  selectedRoom,
  selectedWall,
  wallOpenings,
  wallThickness,
  selectedOpeningId,
  openingDetailsPosition,
  openingDetailsRef,
  setWallThickness,
  setSelectedOpeningId,
  positionFurnitureDetails,
  setSelectedWallId,
  updateSelectedFurniture,
  setFurniturePlacementLocked,
  removeFurniturePlacement,
  updateSelectedWallThickness,
  updateRoomName,
  onEditRoom,
  addOpeningToSelectedRoom,
  findOpeningSlot,
  positionOpeningDetails,
  removeWallOpening,
  moveOpeningToEdge,
  updateWallOpening,
  updateOpeningSwingSide,
}: Props) {
  return (
    <>
    <aside className={`${sharedStyles.detailsPanel} ${className ?? ""}`}>
      {(editorMode !== "flat" || selectedWall) && (
        <>
          <h2 className={sharedStyles.panelTitle}>Room details</h2>
          {selectedWall ? (
            <div className={sharedStyles.dimensionFields}>
              <p>{selectedWall.sources.length > 1 ? "Shared wall" : "Wall"}</p>
              <p>Length: {Math.round(selectedWall.length)} cm</p>
              <label className={sharedStyles.dimensionField}>
                Thickness (cm)
                <input
                  className={sharedStyles.dimensionInput}
                  type="number"
                  min="1"
                  disabled={isFlatLocked}
                  value={selectedWall.thickness}
                  onChange={(event) =>
                    updateSelectedWallThickness(Number(event.target.value))
                  }
                />
              </label>
            </div>
          ) : selectedRoom ? (
            <div className={sharedStyles.dimensionFields}>
              <label className={sharedStyles.dimensionField}>
                Room name
                <input
                  className={sharedStyles.dimensionInput}
                  type="text"
                  disabled={isFlatLocked}
                  value={selectedRoom.name}
                  onChange={(event) =>
                    updateRoomName(selectedRoom.id, event.target.value)
                  }
                />
              </label>

              <section className={styles.roomDimensions}>
                <div className={sharedStyles.doorwayHeader}>
                  <h3>Dimensions</h3>
                  <button
                    className={`${sharedStyles.addDoorButton} ${styles.roomEditButton}`}
                    type="button"
                    disabled={isFlatLocked}
                    aria-label={`Edit ${selectedRoom.name} layout`}
                    title="Edit room layout"
                    onClick={onEditRoom}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.49.42L9.18 5.32a7.3 7.3 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L2.63 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.07.62-.07.94s.02.63.07.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.04.24.25.42.49.42h3.84c.25 0 .46-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.01-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
                    </svg>
                  </button>
                </div>
                <dl className={styles.roomDimensionList}>
                  <div>
                    <dt>Width</dt>
                    <dd>{Math.round(selectedRoom.width)} cm</dd>
                  </div>
                  <div>
                    <dt>Length</dt>
                    <dd>{Math.round(selectedRoom.length)} cm</dd>
                  </div>
                </dl>
              </section>

              <RoomOpeningsSection
                room={selectedRoom}
                kind="door"
                openings={wallOpenings}
                selectedOpeningId={selectedOpeningId}
                openingDetailsPosition={openingDetailsPosition}
                openingDetailsRef={openingDetailsRef}
                isFlatLocked={isFlatLocked}
                findOpeningSlot={findOpeningSlot}
                setSelectedOpeningId={setSelectedOpeningId}
                setSelectedWallId={setSelectedWallId}
                positionOpeningDetails={positionOpeningDetails}
                addOpeningToRoom={addOpeningToSelectedRoom}
                removeWallOpening={removeWallOpening}
                moveOpeningToEdge={moveOpeningToEdge}
                updateWallOpening={updateWallOpening}
                updateOpeningSwingSide={updateOpeningSwingSide}
              />
              <RoomOpeningsSection
                room={selectedRoom}
                kind="window"
                openings={wallOpenings}
                selectedOpeningId={selectedOpeningId}
                openingDetailsPosition={openingDetailsPosition}
                openingDetailsRef={openingDetailsRef}
                isFlatLocked={isFlatLocked}
                findOpeningSlot={findOpeningSlot}
                setSelectedOpeningId={setSelectedOpeningId}
                setSelectedWallId={setSelectedWallId}
                positionOpeningDetails={positionOpeningDetails}
                addOpeningToRoom={addOpeningToSelectedRoom}
                removeWallOpening={removeWallOpening}
                moveOpeningToEdge={moveOpeningToEdge}
                updateWallOpening={updateWallOpening}
                updateOpeningSwingSide={updateOpeningSwingSide}
              />

              <div className={sharedStyles.doorwaySection}>
                <div className={sharedStyles.doorwayHeader}>
                  <h3>Furniture</h3>
                </div>

                <ul className={sharedStyles.doorList}>
                  {furniturePlacements
                    .filter(
                      (placement) => placement.roomId === selectedRoom.id,
                    )
                    .map((placement, index) => {
                      const template = furnitureTemplates.find(
                        (item) => item.id === placement.templateId,
                      );

                      return (
                        <li
                          key={placement.id}
                          className={sharedStyles.doorListItem}
                        >
                          <button
                            type="button"
                            data-furniture-placement-id={placement.id}
                            className={`${sharedStyles.doorListButton} ${selectedFurnitureId === placement.id
                              ? sharedStyles.doorListButtonSelected
                              : ""
                              }`}
                            onClick={(event) => {
                              const bounds =
                                event.currentTarget.getBoundingClientRect();
                              positionFurnitureDetails(
                                placement.id,
                                bounds.left,
                                bounds.top,
                              );
                              setSelectedOpeningId(null);
                              setSelectedWallId(null);
                            }}
                          >
                            {template?.name ?? "Furniture"} {index + 1}
                          </button>

                          <button
                            type="button"
                            className={`${sharedStyles.deleteOpeningButton} ${styles.furnitureLockButton}`}
                            aria-label={`${placement.locked ? "Unlock" : "Lock"} ${template?.name ?? "furniture"} ${index + 1}`}
                            aria-pressed={placement.locked ?? false}
                            title={`${placement.locked ? "Unlock" : "Lock"} furniture`}
                            onClick={() =>
                              setFurniturePlacementLocked(
                                placement.id,
                                !placement.locked,
                              )
                            }
                          >
                            {placement.locked ? (
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
                            type="button"
                            className={sharedStyles.deleteOpeningButton}
                            disabled={placement.locked}
                            aria-label={`Remove ${template?.name ?? "furniture"} ${index + 1}`}
                            title="Remove furniture"
                            onClick={() =>
                              removeFurniturePlacement(placement.id)
                            }
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                            </svg>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          ) : (
            <p className={sharedStyles.helperText}>
              Add a room, then select it to edit its dimensions.
            </p>
          )}
        </>
      )}
      {editorMode === "flat" && !selectedWall && (
        <div className={styles.flatSettings}>
          <h3 className={sharedStyles.panelTitle}>Flat settings</h3>
          <label className={sharedStyles.dimensionField}>
            Wall thickness (cm)
            <input
              className={sharedStyles.dimensionInput}
              type="number"
              min="1"
              disabled={isFlatLocked}
              value={wallThickness}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value > 0) setWallThickness(value);
              }}
            />
          </label>
        </div>
      )}
    </aside>
      {selectedFurniturePlacement &&
        selectedFurnitureTemplate &&
        furnitureDetailsPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={sharedStyles.doorDetails}
            ref={furnitureDetailsRef}
            style={{
              left: `${furnitureDetailsPosition.left}px`,
              top: `${furnitureDetailsPosition.top}px`,
            }}
          >
            <h3>{selectedFurnitureTemplate.name}</h3>

            <label className={sharedStyles.dimensionField}>
              Width (cm)
              <input
                className={sharedStyles.dimensionInput}
                type="text"
                inputMode="decimal"
                disabled={selectedFurniturePlacement.locked}
                value={
                  selectedFurniturePlacement.width ??
                  selectedFurnitureTemplate.width
                }
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) =>
                  updateSelectedFurniture("width", Number(event.target.value))
                }
              />
            </label>

            {selectedFurnitureTemplate.shape !== "circle" &&
              selectedFurnitureTemplate.shape !== "quarter-circle" && (
              <label className={sharedStyles.dimensionField}>
                Length (cm)
                <input
                  className={sharedStyles.dimensionInput}
                  type="text"
                  inputMode="decimal"
                  disabled={selectedFurniturePlacement.locked}
                  value={
                    selectedFurniturePlacement.length ??
                    selectedFurnitureTemplate.length
                  }
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) =>
                    updateSelectedFurniture("length", Number(event.target.value))
                  }
                />
              </label>
            )}

            <label className={sharedStyles.dimensionField}>
              Rotation (degrees)
              <input
                className={sharedStyles.dimensionInput}
                type="text"
                inputMode="decimal"
                disabled={selectedFurniturePlacement.locked}
                value={selectedFurniturePlacement.rotation}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) =>
                  updateSelectedFurniture("rotation", Number(event.target.value))
                }
              />
            </label>
          </div>,
          document.body,
        )}
    </>
  );
}
