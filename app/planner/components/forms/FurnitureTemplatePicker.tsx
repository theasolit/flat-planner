import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./FurnitureTemplatePicker.module.css";
import type { FurnitureTemplate, Room } from "../../types";

type Props = {
  room: Room;
  templates: FurnitureTemplate[];
  onAddFurniture: (template: FurnitureTemplate) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: FurnitureTemplate) => void;
  onDeleteTemplate: (template: FurnitureTemplate) => void;
};

export function FurnitureTemplatePicker({
  room,
  templates,
  onAddFurniture,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: Props) {
  return (
    <div className={styles.templatePicker}>
      <div className={`${sharedStyles.doorwayHeader} ${sharedStyles.roomListHeader}`}>
        <h3 className={sharedStyles.panelTitle}>Furniture</h3>
        <button
          className={sharedStyles.addDoorButton}
          type="button"
          aria-label="Create furniture template"
          title="Create furniture template"
          onClick={onCreateTemplate}
        >
          +
        </button>
      </div>

      {templates.length === 0 ? (
        <p className={sharedStyles.helperText}>
          Create a template to add furniture to this room.
        </p>
      ) : (
        <ul className={`${sharedStyles.doorList} ${styles.templateList}`}>
          {templates.map((template) => {
            const tooLarge =
              template.width > room.width || template.length > room.length;

            return (
              <li key={template.id} className={sharedStyles.doorListItem}>
                <button
                  className={`${sharedStyles.doorListButton} ${sharedStyles.roomButton}`}
                  type="button"
                  onClick={() => onAddFurniture(template)}
                  disabled={tooLarge}
                  title={
                    tooLarge
                      ? "This template is larger than the room"
                      : "Add to this room"
                  }
                >
                  {template.name} — {template.width} × {template.length} cm
                </button>
                <button
                  className={sharedStyles.deleteOpeningButton}
                  type="button"
                  aria-label={`Edit furniture template ${template.name}`}
                  title={`Edit ${template.name} template`}
                  onClick={() => onEditTemplate(template)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m3 17.25 0 3.75h3.75L19.81 7.94a2.12 2.12 0 0 0-3-3L3 17.25ZM14.5 7.5l2 2" />
                  </svg>
                </button>
                <button
                  className={sharedStyles.deleteOpeningButton}
                  type="button"
                  aria-label={`Delete furniture template ${template.name}`}
                  title={`Delete ${template.name} template and placed instances`}
                  onClick={() => onDeleteTemplate(template)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
