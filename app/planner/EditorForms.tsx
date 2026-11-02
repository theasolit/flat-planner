import { useState, type PointerEvent } from "react";
import styles from "../page.module.css";
import { getComponentRing, getComponentsArea } from "./geometry";
import { snapShapePosition, type ShapeBounds } from "./shapeSnapping";
import type { FurnitureTemplate, Pair, Room, RoomComponent } from "./types";

export function FurnitureTemplatePicker({
  room,
  templates,
  onAddFurniture,
  onCreateTemplate,
  onDeleteTemplate,
}: {
  room: Room;
  templates: FurnitureTemplate[];
  onAddFurniture: (template: FurnitureTemplate) => void;
  onCreateTemplate: () => void;
  onDeleteTemplate: (template: FurnitureTemplate) => void;
}) {
  return (
    <div className={styles.templatePicker}>
      <div className={`${styles.doorwayHeader} ${styles.roomListHeader}`}>
        <h3 className={styles.panelTitle}>Furniture</h3>
        <button
          className={styles.addDoorButton}
          type="button"
          aria-label="Create furniture template"
          title="Create furniture template"
          onClick={onCreateTemplate}
        >
          +
        </button>
      </div>

      {templates.length === 0 ? (
        <p className={styles.helperText}>
          Create a template to add furniture to this room.
        </p>
      ) : (
        <ul className={styles.doorList}>
          {templates.map((template) => {
            const tooLarge =
              template.width > room.width || template.length > room.length;

            return (
              <li key={template.id} className={styles.doorListItem}>
                <button
                  className={`${styles.doorListButton} ${styles.roomButton}`}
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
                  className={styles.deleteOpeningButton}
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

export function ShapeCompositionForm({
  name,
  initialComponents,
  isEditing = false,
  title,
  nameLabel = "Room name",
  previewName = "New room",
  saveLabel,
  newShapeWidth = 400,
  newShapeLength = 300,
  onBack,
  onNameChange,
  onSave,
}: {
  name: string;
  initialComponents?: RoomComponent[];
  isEditing?: boolean;
  title?: string;
  nameLabel?: string;
  previewName?: string;
  saveLabel?: string;
  newShapeWidth?: number;
  newShapeLength?: number;
  onBack: () => void;
  onNameChange: (value: string) => void;
  onSave: (
    name: string,
    width: number,
    length: number,
    components: RoomComponent[],
  ) => void;
}) {
  const [shape, setShape] = useState<RoomComponent["shape"]>("rectangle");
  const [shapeWidth, setShapeWidth] = useState(newShapeWidth);
  const [shapeLength, setShapeLength] = useState(newShapeLength);
  const [components, setComponents] = useState<RoomComponent[]>(
    () =>
      initialComponents ?? [
        {
          id: "draft-base",
          shape: "rectangle",
          x: 0,
          y: 0,
          width: 400,
          length: 300,
          rotation: 0,
        },
      ],
  );
  const [selectedComponentId, setSelectedComponentId] =
    useState<string | null>(
      () => initialComponents?.[0]?.id ?? "draft-base",
    );
  const [componentDrag, setComponentDrag] = useState<{
    id: string;
    pointerId: number;
    startSvgX: number;
    startSvgY: number;
    startX: number;
    startY: number;
    viewBox: { x: number; y: number; width: number; height: number };
  } | null>(null);

  const componentBounds = components.map((component) => {
    const points = getComponentRing(component);

    return {
      component,
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  });
  const minX = Math.min(...componentBounds.map((bounds) => bounds.minX));
  const minY = Math.min(...componentBounds.map((bounds) => bounds.minY));
  const maxX = Math.max(...componentBounds.map((bounds) => bounds.maxX));
  const maxY = Math.max(...componentBounds.map((bounds) => bounds.maxY));
  const width = maxX - minX;
  const length = maxY - minY;
  const selectedComponent = components.find(
    (component) => component.id === selectedComponentId,
  );

  function getSvgCoordinates(
    svg: SVGSVGElement,
    clientX: number,
    clientY: number,
  ): Pair | null {
    const matrix = svg.getScreenCTM();

    if (!matrix) {
      return null;
    }

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const coordinates = point.matrixTransform(matrix.inverse());

    return [coordinates.x, coordinates.y];
  }

  function addShape() {
    if (
      !Number.isFinite(shapeWidth) ||
      !Number.isFinite(shapeLength) ||
      shapeWidth <= 0 ||
      shapeLength <= 0
    ) {
      return;
    }

    const nextComponent: RoomComponent = {
      id: crypto.randomUUID(),
      shape,
      x: maxX,
      y: minY,
      width: shapeWidth,
      length: shape === "circle" ? shapeWidth : shapeLength,
      rotation: 0,
    };

    setComponents((current) => [...current, nextComponent]);
    setSelectedComponentId(nextComponent.id);
  }

  function updateSelectedComponentSize(
    field: "width" | "length",
    value: number,
  ) {
    if (!selectedComponent || !Number.isFinite(value) || value <= 0) {
      return;
    }

    setComponents((current) =>
      current.map((component) =>
        component.id === selectedComponent.id
          ? component.shape === "circle"
            ? { ...component, width: value, length: value }
            : { ...component, [field]: value }
          : component,
      ),
    );
  }

  function moveComponent(event: PointerEvent<SVGSVGElement>) {
    if (!componentDrag || event.pointerId !== componentDrag.pointerId) {
      return;
    }

    const point = getSvgCoordinates(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );

    if (!point) {
      return;
    }

    const requestedX =
      componentDrag.startX + point[0] - componentDrag.startSvgX;
    const requestedY =
      componentDrag.startY + point[1] - componentDrag.startSvgY;
    const dragged = components.find(
      (component) => component.id === componentDrag.id,
    );

    if (!dragged) {
      return;
    }

    const moved = {
      ...dragged,
      x: requestedX,
      y: requestedY,
    };
    const movedPoints = getComponentRing(moved);
    const movedBounds: ShapeBounds = {
      minX: Math.min(...movedPoints.map(([x]) => x)),
      minY: Math.min(...movedPoints.map(([, y]) => y)),
      maxX: Math.max(...movedPoints.map(([x]) => x)),
      maxY: Math.max(...movedPoints.map(([, y]) => y)),
    };
    const others = componentBounds
      .filter(
      (bounds) => bounds.component.id !== dragged.id,
      )
      .map(({ minX, minY, maxX, maxY }) => ({
        minX,
        minY,
        maxX,
        maxY,
      }));
    const snapDistance = 20;
    const snappedPosition = snapShapePosition(
      movedBounds,
      others,
      requestedX,
      requestedY,
      snapDistance,
    );

    setComponents((current) =>
      current.map((component) =>
        component.id === dragged.id
          ? {
              ...component,
              x: snappedPosition.x,
              y: snappedPosition.y,
            }
          : component,
      ),
    );
  }

  function finishComponentDrag(event: PointerEvent<SVGSVGElement>) {
    if (componentDrag?.pointerId === event.pointerId) {
      setComponentDrag(null);
    }
  }

  function saveComposition() {
    const normalizedComponents = components.map((component) => ({
      ...component,
      x: component.x - minX,
      y: component.y - minY,
    }));

    onSave(name, width, length, normalizedComponents);
  }

  return (
    <div className={styles.roomCreator}>
      <div className={styles.creatorHeader}>
        <button
          className={styles.creatorBackButton}
          type="button"
          aria-label="Return to previous view"
          title="Return to previous view"
          onClick={onBack}
        >
          &lt;
        </button>
        <h2 className={styles.workspaceTitle}>
          {title ?? (isEditing ? "Edit room" : "Create a room")}
        </h2>
      </div>

      <div className={styles.roomCreatorContent}>
        <div className={styles.dimensionFields}>
          <label className={styles.dimensionField}>
            {nameLabel}
            <input
              className={styles.dimensionInput}
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>

          <span className={styles.dimensionField}>Add a shape</span>
          <div className={styles.shapePicker}>
            {(
              [
                ["rectangle", "Rectangle"],
                ["right-triangle", "Right triangle"],
                ["circle", "Circle"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={styles.roomButton}
                type="button"
                aria-pressed={shape === value}
                onClick={() => setShape(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedComponent && (
            <>
              <label className={styles.dimensionField}>
                Selected shape width (cm)
                <input
                  className={styles.dimensionInput}
                  type="number"
                  min="1"
                  value={selectedComponent.width}
                  onChange={(event) =>
                    updateSelectedComponentSize(
                      "width",
                      Number(event.target.value),
                    )
                  }
                />
              </label>

              {selectedComponent.shape !== "circle" && (
                <label className={styles.dimensionField}>
                  Selected shape length (cm)
                  <input
                    className={styles.dimensionInput}
                    type="number"
                    min="1"
                    value={selectedComponent.length}
                    onChange={(event) =>
                      updateSelectedComponentSize(
                        "length",
                        Number(event.target.value),
                      )
                    }
                  />
                </label>
              )}
            </>
          )}

          <label className={styles.dimensionField}>
            New shape width (cm)
            <input
              className={styles.dimensionInput}
              type="number"
              min="1"
              value={shapeWidth}
              onChange={(event) => setShapeWidth(Number(event.target.value))}
            />
          </label>

          {shape !== "circle" && (
            <label className={styles.dimensionField}>
              New shape length (cm)
              <input
                className={styles.dimensionInput}
                type="number"
                min="1"
                value={shapeLength}
                onChange={(event) => setShapeLength(Number(event.target.value))}
              />
            </label>
          )}

          <button
            className={styles.addRoomButton}
            type="button"
            disabled={
              !Number.isFinite(shapeWidth) ||
              !Number.isFinite(shapeLength) ||
              shapeWidth <= 0 ||
              shapeLength <= 0
            }
            onClick={addShape}
          >
            Add shape (snaps to the right)
          </button>

          <button
            className={styles.addRoomButton}
            type="button"
            disabled={!selectedComponentId}
            onClick={() => {
              const selected = components.find(
                (component) => component.id === selectedComponentId,
              );

              if (!selected) {
                return;
              }

              setComponents((current) =>
                current.map((component) =>
                  component.id === selected.id
                    ? {
                      ...component,
                      rotation: (component.rotation + 90) % 360,
                    }
                    : component,
                ),
              );
            }}
          >
            Rotate selected shape 90°
          </button>

          <button
            className={styles.addRoomButton}
            type="button"
            disabled={components.length <= 1 || !selectedComponentId}
            onClick={() => {
              setComponents((current) =>
                current.filter(
                  (component) => component.id !== selectedComponentId,
                ),
              );
              setSelectedComponentId(null);
            }}
          >
            Remove selected shape
          </button>

          <p className={styles.helperText}>
            Drag shapes in the preview to attach them. Nearby edges snap
            together.
          </p>

          <button
            className={styles.addRoomButton}
            type="button"
            disabled={!name.trim() || components.length === 0}
            onClick={saveComposition}
          >
            {saveLabel ?? (isEditing ? "Save room" : "Add room to flat")}
          </button>
        </div>

        <div className={styles.canvas}>
          <svg
            className={styles.roomCompositionPreview}
            viewBox={
              componentDrag
                ? `${componentDrag.viewBox.x} ${componentDrag.viewBox.y} ${componentDrag.viewBox.width} ${componentDrag.viewBox.height}`
                : `${minX - 60} ${minY - 60} ${Math.max(width + 120, 1)} ${Math.max(length + 120, 1)}`
            }
            preserveAspectRatio="xMidYMid meet"
            onPointerMove={moveComponent}
            onPointerUp={finishComponentDrag}
            onPointerCancel={finishComponentDrag}
          >
            {components.map((component) => (
              <path
                key={component.id}
                className={`${styles.roomCompositionShape} ${selectedComponentId === component.id
                    ? styles.roomCompositionShapeSelected
                    : ""
                  }`}
                d={`${getComponentRing(component)
                  .map(([x, y], index) =>
                    `${index === 0 ? "M" : "L"} ${x} ${y}`,
                  )
                  .join(" ")} Z`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const svg = event.currentTarget.ownerSVGElement;
                  const point = svg
                    ? getSvgCoordinates(svg, event.clientX, event.clientY)
                    : null;

                  if (!point) {
                    return;
                  }

                  setSelectedComponentId(component.id);
                  setComponentDrag({
                    id: component.id,
                    pointerId: event.pointerId,
                    startSvgX: point[0],
                    startSvgY: point[1],
                    startX: component.x,
                    startY: component.y,
                    viewBox: {
                      x: minX - 60,
                      y: minY - 60,
                      width: Math.max(width + 120, 1),
                      height: Math.max(length + 120, 1),
                    },
                  });
                  svg?.setPointerCapture(event.pointerId);
                }}
              />
            ))}
          </svg>
          <div className={styles.roomCompositionLabel}>
            {name || previewName} — {Math.round(width)} × {Math.round(length)} cm ·{" "}
            {Number((getComponentsArea(components) / 10000).toFixed(1))} m²
          </div>
        </div>
      </div>
    </div>
  );
}
