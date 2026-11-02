import { createPortal } from "react-dom";
import type { RefObject } from "react";
import styles from "../../FlatPlanner.module.css";
import { getStraightRoomBoundaryEdges } from "../../geometry/geometry";
import type { Room, WallOpening } from "../../types";

type Props = {
  room: Room;
  kind: "door" | "window";
  openings: WallOpening[];
  selectedOpeningId: string | null;
  openingDetailsPosition: { left: number; top: number } | null;
  openingDetailsRef: RefObject<HTMLDivElement | null>;
  isFlatLocked: boolean;
  findOpeningSlot: (
    sourceId: string,
    openings: WallOpening[],
  ) => { offset: number; width: number } | undefined;
  setSelectedOpeningId: (id: string | null) => void;
  setSelectedWallId: (id: string | null) => void;
  positionOpeningDetails: (openingId: string, x: number, y: number) => void;
  addOpeningToRoom: (kind: "door" | "window") => void;
  removeWallOpening: (openingId: string) => void;
  moveOpeningToEdge: (openingId: string, edgeId: string) => void;
  updateWallOpening: (
    openingId: string,
    field: "width" | "offset",
    value: number,
  ) => void;
  updateOpeningSwingSide: (
    openingId: string,
    swingSide: "left" | "right",
  ) => void;
};

export default function RoomOpeningsSection({
  room,
  kind,
  openings,
  selectedOpeningId,
  openingDetailsPosition,
  openingDetailsRef,
  isFlatLocked,
  findOpeningSlot,
  setSelectedOpeningId,
  setSelectedWallId,
  positionOpeningDetails,
  addOpeningToRoom,
  removeWallOpening,
  moveOpeningToEdge,
  updateWallOpening,
  updateOpeningSwingSide,
}: Props) {
  const edges = getStraightRoomBoundaryEdges(room);
  const roomOpenings = openings.filter(
    (opening) =>
      opening.sourceId.startsWith(`${room.id}-`) &&
      (opening.kind ?? "door") === kind,
  );
  const canAddOpening = edges.some((edge) => findOpeningSlot(edge.id, openings));
  const label = kind === "door" ? "Doorways" : "Windows";
  const singularLabel = kind === "door" ? "door" : "window";

  return (
    <div className={styles.doorwaySection} inert={isFlatLocked}>
      <div className={styles.doorwayHeader}>
        <h3>{label}</h3>
        <button
          className={styles.addDoorButton}
          type="button"
          aria-label={`Add ${singularLabel}`}
          title={`Add ${singularLabel}`}
          onClick={() => addOpeningToRoom(kind)}
          disabled={isFlatLocked || !canAddOpening}
        >
          +
        </button>
      </div>

      <ul className={styles.doorList}>
        {roomOpenings.map((opening, index) => (
          <li key={opening.id} className={styles.doorListItem}>
            <button
              type="button"
              className={`${styles.doorListButton} ${
                selectedOpeningId === opening.id
                  ? styles.doorListButtonSelected
                  : ""
              }`}
              disabled={isFlatLocked}
              onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                positionOpeningDetails(opening.id, bounds.left, bounds.top);
                setSelectedWallId(null);
              }}
            >
              {kind === "door" ? "Door" : "Window"}
            </button>

            <button
              type="button"
              className={styles.deleteOpeningButton}
              disabled={isFlatLocked}
              aria-label={`Remove ${singularLabel} ${index + 1}`}
              title={`Remove ${singularLabel}`}
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
                      disabled={isFlatLocked}
                      onChange={(event) =>
                        moveOpeningToEdge(opening.id, event.target.value)
                      }
                    >
                      {edges.map((edge, edgeIndex) => (
                        <option key={edge.id} value={edge.id}>
                          Wall {edgeIndex + 1} · {Math.round(edge.length)} cm
                        </option>
                      ))}
                    </select>
                  </label>

                  {kind === "door" && (
                    <label className={styles.dimensionField}>
                      Swing
                      <select
                        className={styles.dimensionInput}
                        value={opening.swingSide ?? "left"}
                        disabled={isFlatLocked}
                        onChange={(event) =>
                          updateOpeningSwingSide(
                            opening.id,
                            event.target.value === "right" ? "right" : "left",
                          )
                        }
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  )}

                  <label className={styles.dimensionField}>
                    Width (cm)
                    <input
                      className={styles.dimensionInput}
                      type="text"
                      inputMode="decimal"
                      disabled={isFlatLocked}
                      value={opening.width}
                      onFocus={(event) => event.currentTarget.select()}
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
                      type="text"
                      inputMode="decimal"
                      disabled={isFlatLocked}
                      value={opening.offset}
                      onFocus={(event) => event.currentTarget.select()}
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
        ))}
      </ul>
    </div>
  );
}
