import { useState, type PointerEvent } from "react";
import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./ShapeCompositionForm.module.css";
import {
  getComponentBounds,
  getComponentsArea,
} from "../../geometry/geometry";
import { snapShapePosition, type ShapeBounds } from "../../geometry/shapeSnapping";
import ShapeCompositionCanvas from "../canvas/ShapeCompositionCanvas";
import type { Pair, RoomComponent } from "../../types";

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
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
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

  const componentBounds = components.map((component) => ({
    component,
    ...getComponentBounds(component),
  }));
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

  function addShape(componentShape: RoomComponent["shape"]) {
    const widthToAdd = selectedComponent?.width ?? shapeWidth;
    const lengthToAdd = selectedComponent?.length ?? shapeLength;

    if (
      !Number.isFinite(widthToAdd) ||
      !Number.isFinite(lengthToAdd) ||
      widthToAdd <= 0 ||
      lengthToAdd <= 0
    ) {
      return;
    }

    const nextComponent: RoomComponent = {
      id: crypto.randomUUID(),
      shape: componentShape,
      x: maxX,
      y: minY,
      width: widthToAdd,
      length: componentShape === "circle" ? widthToAdd : lengthToAdd,
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

  function updateShapeDimension(field: "width" | "length", value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    if (selectedComponent?.shape === "circle") {
      setShapeWidth(value);
      setShapeLength(value);
    } else if (field === "width") {
      setShapeWidth(value);
    } else {
      setShapeLength(value);
    }

    updateSelectedComponentSize(field, value);
  }

  function toggleSelectedComponentMirror(
    direction: "mirrorHorizontal" | "mirrorVertical",
  ) {
    if (!selectedComponent) {
      return;
    }

    setComponents((current) =>
      current.map((component) =>
        component.id === selectedComponent.id
          ? { ...component, [direction]: !component[direction] }
          : component,
      ),
    );
  }

  function rotateSelectedComponent(direction: 1 | -1) {
    if (!selectedComponent) {
      return;
    }

    setComponents((current) =>
      current.map((component) =>
        component.id === selectedComponent.id
          ? {
              ...component,
              rotation: (component.rotation + direction * 90 + 360) % 360,
            }
          : component,
      ),
    );
  }

  function deselectOnCanvasPointerDown(
    event: PointerEvent<SVGSVGElement>,
  ) {
    if (event.target === event.currentTarget) {
      setSelectedComponentId(null);
    }
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
    const movedBounds: ShapeBounds = getComponentBounds(moved);
    const others = componentBounds
      .filter((bounds) => bounds.component.id !== dragged.id)
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

  function startComponentDrag(
    component: RoomComponent,
    event: PointerEvent<SVGPathElement>,
  ) {
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
    <div className={styles.roomCreator} data-testid="shape-composition-creator">
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
        <h2 className={`${sharedStyles.workspaceTitle} ${styles.creatorTitle}`}>
          {title ?? (isEditing ? "Edit room" : "Create a room")}
        </h2>
        <button
          className={sharedStyles.saveButton}
          type="button"
          disabled={!name.trim() || components.length === 0}
          onClick={saveComposition}
        >
          {saveLabel ?? "Save"}
        </button>
      </div>

      <div
        className={sharedStyles.roomCreatorContent}
        data-testid="shape-composition-work-area"
      >
        <div
          className={`${sharedStyles.dimensionFields} ${styles.creatorFields}`}
        >
          <label
            className={`${sharedStyles.dimensionField} ${styles.stableField}`}
          >
            {nameLabel}
            <input
              className={sharedStyles.dimensionInput}
              type="text"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </label>

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
                className={styles.shapePickerButton}
                type="button"
                aria-label={`Add ${label.toLowerCase()}`}
                title={`Add ${label.toLowerCase()}`}
                disabled={
                  !Number.isFinite(selectedComponent?.width ?? shapeWidth) ||
                  !Number.isFinite(selectedComponent?.length ?? shapeLength) ||
                  (selectedComponent?.width ?? shapeWidth) <= 0 ||
                  (selectedComponent?.length ?? shapeLength) <= 0
                }
                onClick={() => {
                  addShape(value);
                }}
              >
                {value === "rectangle" && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 5h14v14H5zM12 9v6M9 12h6" />
                  </svg>
                )}
                {value === "right-triangle" && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 19V5l14 14H5zM12 12l2 2" />
                  </svg>
                )}
                {value === "circle" && (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 9v6M9 12h6" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <label
            className={`${sharedStyles.dimensionField} ${styles.stableField}`}
          >
            Width (cm)
            <input
              className={sharedStyles.dimensionInput}
              type="number"
              min="1"
              value={selectedComponent?.width ?? shapeWidth}
              onChange={(event) =>
                updateShapeDimension("width", Number(event.target.value))
              }
            />
          </label>

          <label
            className={`${sharedStyles.dimensionField} ${styles.stableField}`}
          >
            Length (cm)
            <input
              className={sharedStyles.dimensionInput}
              type="number"
              min="1"
              value={selectedComponent?.length ?? shapeLength}
              onChange={(event) =>
                updateShapeDimension("length", Number(event.target.value))
              }
            />
          </label>

          <div
            className={styles.shapeActions}
            role="group"
            aria-label="Shape actions"
            data-testid="shape-actions"
          >
            <button
              className={styles.shapeActionButton}
              type="button"
              aria-label="Rotate selected shape clockwise"
              title="Rotate selected shape clockwise"
              disabled={!selectedComponent}
              onClick={() => rotateSelectedComponent(-1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 11a8 8 0 0 0-14-5L4 8M4 3v5h5" />
                <path d="M12 8v4l3 2" />
              </svg>
            </button>

            <button
              className={styles.shapeActionButton}
              type="button"
              aria-label="Rotate selected shape counterclockwise"
              title="Rotate selected shape counterclockwise"
              disabled={!selectedComponent}
              onClick={() => rotateSelectedComponent(1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11a8 8 0 0 1 14-5l2 2M20 3v5h-5" />
                <path d="M12 8v4l-3 2" />
              </svg>
            </button>

            <button
              className={styles.shapeActionButton}
              type="button"
              aria-label="Mirror selected shape across horizontal axis"
              title="Mirror selected shape top/bottom"
              aria-pressed={selectedComponent?.mirrorHorizontal ?? false}
              disabled={!selectedComponent}
              onClick={() => toggleSelectedComponentMirror("mirrorHorizontal")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h16M8 5l4 4 4-4M8 19l4-4 4 4" />
              </svg>
            </button>

            <button
              className={styles.shapeActionButton}
              type="button"
              aria-label="Mirror selected shape across vertical axis"
              title="Mirror selected shape left/right"
              aria-pressed={selectedComponent?.mirrorVertical ?? false}
              disabled={!selectedComponent}
              onClick={() => toggleSelectedComponentMirror("mirrorVertical")}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16M5 8l4 4-4 4M19 8l-4 4 4 4" />
              </svg>
            </button>

            <button
              className={styles.shapeActionButton}
              type="button"
              aria-label="Remove selected shape"
              title="Remove selected shape"
              disabled={components.length <= 1 || !selectedComponent}
              onClick={() => {
                if (!selectedComponent) {
                  return;
                }

                setComponents((current) =>
                  current.filter(
                    (component) => component.id !== selectedComponent.id,
                  ),
                );
                setSelectedComponentId(null);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
              </svg>
            </button>
          </div>

          <p className={sharedStyles.helperText}>
            Drag shapes in the preview to attach them. Nearby edges snap
            together.
          </p>

        </div>

        <ShapeCompositionCanvas
          components={components}
          selectedComponentId={selectedComponentId}
          viewBox={
            componentDrag
              ? `${componentDrag.viewBox.x} ${componentDrag.viewBox.y} ${componentDrag.viewBox.width} ${componentDrag.viewBox.height}`
              : `${minX - 60} ${minY - 60} ${Math.max(width + 120, 1)} ${Math.max(length + 120, 1)}`
          }
          label={`${name || previewName} — ${Math.round(width)} × ${Math.round(length)} cm · ${Number((getComponentsArea(components) / 10000).toFixed(1))} m²`}
          onPointerMove={moveComponent}
          onPointerUp={finishComponentDrag}
          onCanvasPointerDown={deselectOnCanvasPointerDown}
          onComponentPointerDown={startComponentDrag}
        />
      </div>
    </div>
  );
}
