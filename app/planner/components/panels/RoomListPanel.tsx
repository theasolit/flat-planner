import type { Room } from "../../types";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomListPanel.module.css";

type Props = {
  className?: string;
  rooms: Room[];
  selectedRoomId: number | null;
  isFlatLocked: boolean;
  onToggleLock: () => void;
  onAddRoom: () => void;
  onSelectRoom: (roomId: number) => void;
  onRemoveRoom: (roomId: number) => void;
};

export default function RoomListPanel({
  className,
  rooms,
  selectedRoomId,
  isFlatLocked,
  onToggleLock,
  onAddRoom,
  onSelectRoom,
  onRemoveRoom,
}: Props) {
  return (
    <aside className={`${sharedStyles.roomPanel} ${className ?? ""}`}>
      <div className={`${sharedStyles.doorwayHeader} ${sharedStyles.roomListHeader}`}>
        <h2 className={sharedStyles.panelTitle}>Rooms</h2>
        <div className={styles.roomHeaderActions}>
          <button
            className={styles.flatLockButton}
            type="button"
            aria-label={isFlatLocked ? "Unlock flat" : "Lock flat"}
            aria-pressed={isFlatLocked}
            title={isFlatLocked ? "Unlock flat" : "Lock flat"}
            onClick={onToggleLock}
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
            className={sharedStyles.addDoorButton}
            type="button"
            aria-label="Add room"
            title="Add room"
            onClick={onAddRoom}
            disabled={isFlatLocked}
          >
            +
          </button>
        </div>
      </div>

      <ul className={styles.roomList}>
        {rooms.map((room) => (
          <li key={room.id} className={sharedStyles.doorListItem}>
            <button
              className={`${sharedStyles.doorListButton} ${sharedStyles.roomButton} ${
                selectedRoomId === room.id
                  ? sharedStyles.doorListButtonSelected
                  : ""
              }`}
              onClick={() => onSelectRoom(room.id)}
            >
              {room.name}
            </button>
            <button
              className={sharedStyles.deleteOpeningButton}
              type="button"
              disabled={isFlatLocked}
              aria-label={`Remove ${room.name}`}
              title="Remove room"
              onClick={() => onRemoveRoom(room.id)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
