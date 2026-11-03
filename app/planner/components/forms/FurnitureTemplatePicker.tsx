"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./FurnitureTemplatePicker.module.css";
import type {
  FurnitureCategory,
  FurnitureTemplate,
  Room,
} from "../../types";

const SHOW_ALL_ROOMS_STORAGE_KEY = "flat-planner-show-all-rooms";
const SHOW_ALL_ROOMS_CHANGE_EVENT = "flat-planner-show-all-rooms-change";
const GROUPING_STORAGE_KEY = "flat-planner-furniture-grouping";
const GROUPING_CHANGE_EVENT = "flat-planner-furniture-grouping-change";
const COLLAPSED_GROUPS_STORAGE_KEY = "flat-planner-collapsed-furniture-groups";
const COLLAPSED_GROUPS_CHANGE_EVENT =
  "flat-planner-collapsed-furniture-groups-change";

function subscribeToShowAllRooms(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener(SHOW_ALL_ROOMS_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SHOW_ALL_ROOMS_CHANGE_EVENT, listener);
  };
}

function getShowAllRoomsSnapshot() {
  return localStorage.getItem(SHOW_ALL_ROOMS_STORAGE_KEY) !== "false";
}

function getServerShowAllRoomsSnapshot() {
  return true;
}

function saveShowAllRoomsPreference(showAllRooms: boolean) {
  localStorage.setItem(SHOW_ALL_ROOMS_STORAGE_KEY, String(showAllRooms));
  window.dispatchEvent(new Event(SHOW_ALL_ROOMS_CHANGE_EVENT));
}

function subscribeToGrouping(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener(GROUPING_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(GROUPING_CHANGE_EVENT, listener);
  };
}

function getGroupingSnapshot(): "room" | "category" {
  return localStorage.getItem(GROUPING_STORAGE_KEY) === "category"
    ? "category"
    : "room";
}

function getServerGroupingSnapshot(): "room" {
  return "room";
}

function saveGroupingPreference(grouping: "room" | "category") {
  localStorage.setItem(GROUPING_STORAGE_KEY, grouping);
  window.dispatchEvent(new Event(GROUPING_CHANGE_EVENT));
}

function subscribeToCollapsedGroups(callback: () => void) {
  const listener = () => callback();
  window.addEventListener("storage", listener);
  window.addEventListener(COLLAPSED_GROUPS_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(COLLAPSED_GROUPS_CHANGE_EVENT, listener);
  };
}

function getCollapsedGroupsSnapshot() {
  return localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY) ?? "[]";
}

function getServerCollapsedGroupsSnapshot() {
  return "[]";
}

function parseCollapsedGroupIds(snapshot: string): Set<string> {
  const value: unknown = JSON.parse(snapshot);
  return Array.isArray(value) && value.every((id) => typeof id === "string")
    ? new Set(value)
    : new Set();
}

function saveGroupCollapsedState(groupId: string, isCollapsed: boolean) {
  const collapsedGroupIds = parseCollapsedGroupIds(
    getCollapsedGroupsSnapshot(),
  );
  if (isCollapsed) {
    collapsedGroupIds.add(groupId);
  } else {
    collapsedGroupIds.delete(groupId);
  }
  localStorage.setItem(
    COLLAPSED_GROUPS_STORAGE_KEY,
    JSON.stringify([...collapsedGroupIds]),
  );
  window.dispatchEvent(new Event(COLLAPSED_GROUPS_CHANGE_EVENT));
}

type Props = {
  room: Room;
  rooms: Room[];
  categories: FurnitureCategory[];
  templates: FurnitureTemplate[];
  onAddFurniture: (template: FurnitureTemplate) => void;
  onCreateTemplate: () => void;
  onEditTemplate: (template: FurnitureTemplate) => void;
  onDeleteTemplate: (template: FurnitureTemplate) => void;
  onCreateCategory: (name: string) => void;
  onDeleteCategory: (categoryId: string) => void;
};

export function FurnitureTemplatePicker({
  room,
  rooms,
  categories,
  templates,
  onAddFurniture,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onCreateCategory,
  onDeleteCategory,
}: Props) {
  const grouping = useSyncExternalStore(
    subscribeToGrouping,
    getGroupingSnapshot,
    getServerGroupingSnapshot,
  );
  const showAllRooms = useSyncExternalStore(
    subscribeToShowAllRooms,
    getShowAllRoomsSnapshot,
    getServerShowAllRoomsSnapshot,
  );
  const collapsedGroupsSnapshot = useSyncExternalStore(
    subscribeToCollapsedGroups,
    getCollapsedGroupsSnapshot,
    getServerCollapsedGroupsSnapshot,
  );
  const collapsedGroupIds = parseCollapsedGroupIds(collapsedGroupsSnapshot);
  const [newCategoryName, setNewCategoryName] = useState("");
  const categoryDialogRef = useRef<HTMLDialogElement>(null);

  const canCreateCategory =
    newCategoryName.trim().length > 0 &&
    !categories.some(
      (category) =>
        category.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
    );

  function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateCategory) {
      return;
    }

    onCreateCategory(newCategoryName);
    setNewCategoryName("");
  }

  const groups =
    grouping === "room"
      ? [
          ...(showAllRooms ? rooms : [room])
            .map((assignedRoom) => ({
              id: `room-${assignedRoom.id}`,
              title: assignedRoom.name,
              templates: templates.filter((template) =>
                template.roomIds?.includes(assignedRoom.id),
              ),
            }))
            .filter((group) => group.templates.length > 0),
          {
            id: "room-unassigned",
            title: "Unassigned",
            templates: templates.filter(
              (template) => !template.roomIds?.length,
            ),
          },
        ].filter((group) => group.templates.length > 0)
      : [
          ...categories
            .map((category) => ({
              id: `category-${category.id}`,
              title: category.name,
              templates: templates.filter((template) =>
                template.categoryIds?.includes(category.id),
              ),
            }))
            .filter((group) => group.templates.length > 0),
          {
            id: "category-unassigned",
            title: "Uncategorized",
            templates: templates.filter(
              (template) => !template.categoryIds?.length,
            ),
          },
        ].filter((group) => group.templates.length > 0);

  return (
    <div className={styles.templatePicker}>
      <div
        className={`${sharedStyles.doorwayHeader} ${sharedStyles.roomListHeader} ${styles.pickerHeader}`}
      >
        <h3 className={sharedStyles.panelTitle}>Furniture</h3>
        <div className={styles.headerActions}>
          <button
            className={styles.categoryManagerButton}
            type="button"
            aria-label="Edit categories"
            title="Manage categories"
            onClick={() => categoryDialogRef.current?.showModal()}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m3 17.25 0 3.75h3.75L19.81 7.94a2.12 2.12 0 0 0-3-3L3 17.25ZM14.5 7.5l2 2" />
            </svg>
          </button>
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
      </div>

      <div className={styles.catalogControls}>
        <label>
          Group by
          <select
            aria-label="Group furniture by"
            value={grouping}
            onChange={(event) =>
              saveGroupingPreference(
                event.target.value === "category" ? "category" : "room",
              )
            }
          >
            <option value="room">Room</option>
            <option value="category">Category</option>
          </select>
        </label>
        {grouping === "room" && (
          <label className={styles.allRoomsToggle}>
            <input
              type="checkbox"
              aria-label="Show furniture from all rooms"
              checked={showAllRooms}
              onChange={(event) =>
                saveShowAllRoomsPreference(event.target.checked)
              }
            />
            Show all rooms
          </label>
        )}
      </div>

      {groups.length === 0 ? (
        <p className={sharedStyles.helperText}>
          {templates.length === 0
            ? "Create a template to add furniture to this room."
            : "No furniture templates match this view."}
        </p>
      ) : (
        groups.map((group) => (
          <details
            key={group.id}
            className={styles.templateGroup}
            open={!collapsedGroupIds.has(group.id)}
            onToggle={(event) =>
              saveGroupCollapsedState(
                group.id,
                !event.currentTarget.open,
              )
            }
          >
            <summary className={styles.groupSummary}>
              <h4 className={styles.groupTitle}>{group.title}</h4>
            </summary>
            <ul className={`${sharedStyles.doorList} ${styles.templateList}`}>
              {group.templates.map((template) => {
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
          </details>
        ))
      )}

      <dialog
        ref={categoryDialogRef}
        className={styles.categoryDialog}
        aria-labelledby="furniture-category-dialog-title"
      >
        <div className={styles.categoryDialogHeader}>
          <h3 id="furniture-category-dialog-title">Manage categories</h3>
          <button
            className={styles.closeCategoryDialogButton}
            type="button"
            aria-label="Close category manager"
            onClick={() => categoryDialogRef.current?.close()}
          >
            ×
          </button>
        </div>
        <form className={styles.categoryForm} onSubmit={createCategory}>
          <input
            aria-label="New category name"
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <button type="submit" disabled={!canCreateCategory}>
            Add category
          </button>
        </form>
        {categories.length > 0 ? (
          <ul className={styles.categoryList}>
            {categories.map((category) => (
              <li key={category.id}>
                <span>{category.name}</span>
                <button
                  type="button"
                  aria-label={`Delete category ${category.name}`}
                  title={`Delete ${category.name} category and unassign it from templates`}
                  onClick={() => onDeleteCategory(category.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={sharedStyles.helperText}>No categories yet.</p>
        )}
      </dialog>
    </div>
  );
}
