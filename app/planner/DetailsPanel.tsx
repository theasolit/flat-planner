import { createPortal } from "react-dom";
import type { Dispatch, RefObject, SetStateAction } from "react";
import styles from "../page.module.css";
import type {
  EditorMode,
  FurniturePlacement,
  FurnitureTemplate,
  Room,
  WallOpening,
  WallSegment,
} from "./types";
import { getStraightRoomBoundaryEdges } from "./geometry";

type Props = {
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
    <aside className={styles.detailsPanel}>
      {(editorMode !== "flat" || selectedWall) && (
        <>
          <h2 className={styles.panelTitle}>Room details</h2>
          {selectedWall ? (
            <div className={styles.dimensionFields}>
              <p>{selectedWall.sources.length > 1 ? "Shared wall" : "Wall"}</p>
              <p>Length: {Math.round(selectedWall.length)} cm</p>
              <label className={styles.dimensionField}>
                Thickness (cm)
                <input
                  className={styles.dimensionInput}
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
            <div className={styles.dimensionFields}>
              <label className={styles.dimensionField}>
                Room name
                <input
                  className={styles.dimensionInput}
                  type="text"
                  disabled={isFlatLocked}
                  value={selectedRoom.name}
                  onChange={(event) =>
                    updateRoomName(selectedRoom.id, event.target.value)
                  }
                />
              </label>

              <section className={styles.roomDimensions}>
                <div className={styles.doorwayHeader}>
                  <h3>Dimensions</h3>
                  <button
                    className={`${styles.addDoorButton} ${styles.roomEditButton}`}
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

              <div className={styles.doorwaySection} inert={isFlatLocked}>
                <div className={styles.doorwayHeader}>
                  <h3>Doorways</h3>
                  <button
                    className={styles.addDoorButton}
                    type="button"
                    aria-label="Add door"
                    title="Add door"
                    onClick={() => addOpeningToSelectedRoom("door")}
                    disabled={
                      !getStraightRoomBoundaryEdges(selectedRoom).some((edge) =>
                        findOpeningSlot(edge.id, wallOpenings),
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <ul className={styles.doorList}>
                  {wallOpenings
                    .filter((opening) =>
                      opening.sourceId.startsWith(`${selectedRoom.id}-`) && (opening.kind ?? "door") === "door"
                    )
                    .map((opening, index) => {
                      const edges = getStraightRoomBoundaryEdges(selectedRoom);
                      const edgeIndex = edges.findIndex(
                        (edge) => edge.id === opening.sourceId,
                      );
                      const edge = edges[edgeIndex];
                      const wallLabel = edge
                        ? `Wall ${edgeIndex + 1} · ${Math.round(edge.length)} cm`
                        : "Wall";

                      return (
                        <li key={opening.id} className={styles.doorListItem}>
                          <button
                            type="button"
                            className={`${styles.doorListButton} ${selectedOpeningId === opening.id
                              ? styles.doorListButtonSelected
                              : ""
                              }`}
                            onClick={(event) => {
                              const bounds = event.currentTarget.getBoundingClientRect();
                              positionOpeningDetails(opening.id, bounds.left, bounds.top);
                              setSelectedWallId(null);
                            }}
                          >
                            Door
                          </button>

                          <button
                            type="button"
                            className={styles.deleteOpeningButton}
                            aria-label={`Remove door ${index + 1}`}
                            title="Remove door"
                            onClick={() => {
                              removeWallOpening(opening.id);

                              if (selectedOpeningId === opening.id) {
                                setSelectedOpeningId(null);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                            </svg>
                          </button>

                          {selectedOpeningId === opening.id &&
                            (opening.kind ?? "door") === "door" &&
                            openingDetailsPosition &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <div
                                className={styles.doorDetails}
                                inert={isFlatLocked}
                                ref={openingDetailsRef}
                                style={{
                                  left: `${openingDetailsPosition.left}px`,
                                  top: `${openingDetailsPosition.top}px`,
                                }}
                              >
                                <label className={styles.dimensionField}>
                                  Wall
                                  <select
                                    className={styles.dimensionInput}
                                    value={opening.sourceId}
                                    onChange={(event) =>
                                      moveOpeningToEdge(opening.id, event.target.value)
                                    }
                                  >
                                    {edges.map((candidate, candidateIndex) => (
                                      <option key={candidate.id} value={candidate.id}>
                                        Wall {candidateIndex + 1} · {Math.round(candidate.length)} cm
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className={styles.dimensionField}>
                                  Swing
                                  <select
                                    className={styles.dimensionInput}
                                    value={opening.swingSide ?? "left"}
                                    onChange={(event) =>
                                      updateOpeningSwingSide(
                                        opening.id,
                                        event.target.value === "right"
                                          ? "right"
                                          : "left",
                                      )
                                    }
                                  >
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                  </select>
                                </label>

                                <label className={styles.dimensionField}>
                                  Width (cm)
                                  <input
                                    className={styles.dimensionInput}
                                    type="number"
                                    min="1"
                                    value={opening.width}
                                    onChange={(event) =>
                                      updateWallOpening(
                                        opening.id,
                                        "width",
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>

                                <label className={styles.dimensionField}>
                                  Offset (cm)
                                  <input
                                    className={styles.dimensionInput}
                                    type="number"
                                    value={opening.offset}
                                    onChange={(event) =>
                                      updateWallOpening(
                                        opening.id,
                                        "offset",
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>

                              </div>,
                              document.body,
                            )}

                        </li>
                      );
                    })}
                </ul>
              </div>

              <div className={styles.doorwaySection} inert={isFlatLocked}>
                <div className={styles.doorwayHeader}>
                  <h3>Windows</h3>
                  <button
                    className={styles.addDoorButton}
                    type="button"
                    aria-label="Add window"
                    title="Add window"
                    onClick={() => addOpeningToSelectedRoom("window")}
                    disabled={
                      !getStraightRoomBoundaryEdges(selectedRoom).some((edge) =>
                        findOpeningSlot(edge.id, wallOpenings),
                      )
                    }
                  >
                    +
                  </button>
                </div>

                <ul className={styles.doorList}>
                  {wallOpenings
                    .filter(
                      (opening) =>
                        opening.sourceId.startsWith(`${selectedRoom.id}-`) &&
                        opening.kind === "window",
                    )
                    .map((opening, index) => {
                      const edges = getStraightRoomBoundaryEdges(selectedRoom);
                      const edgeIndex = edges.findIndex(
                        (edge) => edge.id === opening.sourceId,
                      );
                      const edge = edges[edgeIndex];
                      const wallLabel = edge
                        ? `Wall ${edgeIndex + 1} · ${Math.round(edge.length)} cm`
                        : "Wall";

                      return (
                        <li key={opening.id} className={styles.doorListItem}>
                          <button
                            type="button"
                            className={
                              `${styles.doorListButton} ${selectedOpeningId === opening.id
                                ? styles.doorListButtonSelected
                                : ""
                              }`}
                            onClick={(event) => {
                              const bounds = event.currentTarget.getBoundingClientRect();
                              positionOpeningDetails(opening.id, bounds.left, bounds.top);
                              setSelectedWallId(null);
                            }}
                          >
                            Window
                          </button>

                          <button
                            type="button"
                            className={styles.deleteOpeningButton}
                            aria-label={`Remove window ${index + 1}`}
                            title="Remove window"
                            onClick={() => {
                              removeWallOpening(opening.id);

                              if (selectedOpeningId === opening.id) {
                                setSelectedOpeningId(null);
                              }
                            }}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                            </svg>
                          </button>

                          {selectedOpeningId === opening.id && (
                            openingDetailsPosition &&
                            typeof document !== "undefined" &&
                            createPortal(
                              <div
                                className={styles.doorDetails}
                                inert={isFlatLocked}
                                ref={openingDetailsRef}
                                style={{
                                  left: `${openingDetailsPosition.left}px`,
                                  top: `${openingDetailsPosition.top}px`,
                                }}
                              >
                                <label className={styles.dimensionField}>
                                  Wall
                                  <select
                                    className={styles.dimensionInput}
                                    value={opening.sourceId}
                                    onChange={(event) =>
                                      moveOpeningToEdge(opening.id, event.target.value)
                                    }
                                  >
                                    {edges.map((candidate, candidateIndex) => (
                                      <option key={candidate.id} value={candidate.id}>
                                        Wall {candidateIndex + 1} · {Math.round(candidate.length)} cm
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <label className={styles.dimensionField}>
                                  Width (cm)
                                  <input
                                    className={styles.dimensionInput}
                                    type="number"
                                    min="1"
                                    value={opening.width}
                                    onChange={(event) =>
                                      updateWallOpening(
                                        opening.id,
                                        "width",
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>

                                <label className={styles.dimensionField}>
                                  Offset (cm)
                                  <input
                                    className={styles.dimensionInput}
                                    type="number"
                                    value={opening.offset}
                                    onChange={(event) =>
                                      updateWallOpening(
                                        opening.id,
                                        "offset",
                                        Number(event.target.value),
                                      )
                                    }
                                  />
                                </label>

                              </div>,
                              document.body,
                            )
                          )}
                        </li>
                      );
                    })}
                </ul>

              </div>

              <div className={styles.doorwaySection}>
                <div className={styles.doorwayHeader}>
                  <h3>Furniture</h3>
                </div>

                <ul className={styles.doorList}>
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
                          className={styles.doorListItem}
                        >
                          <button
                            type="button"
                            data-furniture-placement-id={placement.id}
                            className={`${styles.doorListButton} ${selectedFurnitureId === placement.id
                              ? styles.doorListButtonSelected
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
                            className={styles.deleteOpeningButton}
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
            <p className={styles.helperText}>
              Add a room, then select it to edit its dimensions.
            </p>
          )}
        </>
      )}
      {editorMode === "flat" && !selectedWall && (
        <div className={styles.flatSettings}>
          <h3 className={styles.panelTitle}>Flat settings</h3>
          <label className={styles.dimensionField}>
            Wall thickness (cm)
            <input
              className={styles.dimensionInput}
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
            className={styles.doorDetails}
            ref={furnitureDetailsRef}
            style={{
              left: `${furnitureDetailsPosition.left}px`,
              top: `${furnitureDetailsPosition.top}px`,
            }}
          >
            <h3>{selectedFurnitureTemplate.name}</h3>

            <label className={styles.dimensionField}>
              Width (cm)
              <input
                className={styles.dimensionInput}
                type="number"
                min="1"
                max={selectedRoom?.width}
                value={
                  selectedFurniturePlacement.width ??
                  selectedFurnitureTemplate.width
                }
                onChange={(event) =>
                  updateSelectedFurniture("width", Number(event.target.value))
                }
              />
            </label>

            {selectedFurnitureTemplate.shape !== "circle" && (
              <label className={styles.dimensionField}>
                Length (cm)
                <input
                  className={styles.dimensionInput}
                  type="number"
                  min="1"
                  max={selectedRoom?.length}
                  value={
                    selectedFurniturePlacement.length ??
                    selectedFurnitureTemplate.length
                  }
                  onChange={(event) =>
                    updateSelectedFurniture("length", Number(event.target.value))
                  }
                />
              </label>
            )}

            <label className={styles.dimensionField}>
              Rotation (degrees)
              <input
                className={styles.dimensionInput}
                type="number"
                min="0"
                max="359"
                value={selectedFurniturePlacement.rotation}
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
