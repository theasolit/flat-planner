import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomGeometryLayers.module.css";
import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type {
  Pair,
  PlanBounds,
  Room,
  RoomComponent,
  FurnitureTemplate,
  WallOpening,
  WallSegment,
} from "../../types";
import {
  getFurnitureTemplateComponents,
  getFurnitureTemplateLabelPlacement,
  getFurnitureTemplateOutline,
  getComponentRing,
  getRoomBoundaryEdges,
  getRoomEdgeSide,
  getRoomOutline,
} from "../../geometry/geometry";

export function CanonicalWallLayer({
  segments,
  bounds,
  onSegmentClick,
}: {
  segments: WallSegment[];
  bounds: PlanBounds;
  onSegmentClick?: (segment: WallSegment, point: Pair) => void;
}) {
  return (
    <svg
      className={styles.canonicalWallLayer}
      viewBox={`${bounds.minX} ${bounds.minY} ${Math.max(bounds.width, 1)} ${Math.max(bounds.height, 1)}`}
      preserveAspectRatio="none"
      aria-hidden={!onSegmentClick}
      style={{
        left: `${bounds.minX / 2}px`,
        top: `${bounds.minY / 2}px`,
        width: `${bounds.width / 2}px`,
        height: `${bounds.height / 2}px`,
        pointerEvents: onSegmentClick ? "auto" : "none",
      }}
    >
      {segments.map((segment) => (
        <g key={segment.id}>
          <line
            className={styles.canonicalWallStroke}
            x1={segment.start[0]}
            y1={segment.start[1]}
            x2={segment.end[0]}
            y2={segment.end[1]}
            strokeWidth={segment.thickness * 2}
            strokeLinecap="square"
          />
          {onSegmentClick && (
            <line
              x1={segment.start[0]}
              y1={segment.start[1]}
              x2={segment.end[0]}
              y2={segment.end[1]}
              stroke="transparent"
              strokeWidth={Math.max(segment.thickness * 2, 12)}
              strokeLinecap="square"
              pointerEvents="stroke"
              role="button"
              tabIndex={0}
              aria-label={`Select ${segment.sources.length > 1 ? "shared wall" : "wall"}, ${Math.round(segment.length)} cm long`}
              onClick={(event) => {
                const svgBounds =
                  event.currentTarget.ownerSVGElement?.getBoundingClientRect();

                if (!svgBounds || svgBounds.width === 0 || svgBounds.height === 0) {
                  return;
                }

                onSegmentClick(segment, [
                  bounds.minX +
                    ((event.clientX - svgBounds.left) / svgBounds.width) *
                      bounds.width,
                  bounds.minY +
                    ((event.clientY - svgBounds.top) / svgBounds.height) *
                      bounds.height,
                ]);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSegmentClick(segment, [
                    (segment.start[0] + segment.end[0]) / 2,
                    (segment.start[1] + segment.end[1]) / 2,
                  ]);
                }
              }}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

export function RoomShapeLayer({ room }: { room: Room }) {
  const outline = getRoomOutline(room);

  return (
    <svg
      className={styles.roomShapeLayer}
      viewBox={`0 0 ${Math.max(room.width, 1)} ${Math.max(room.length, 1)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {outline.map((polygon, polygonIndex) => (
        <path
          key={polygonIndex}
          className={styles.roomShape}
          fillRule="evenodd"
          d={polygon
            .map((ring) =>
              ring
                .map(([x, y], pointIndex) =>
                  `${pointIndex === 0 ? "M" : "L"} ${x - room.x} ${y - room.y}`,
                )
                .join(" ") + " Z",
            )
            .join(" ")}
        />
      ))}
    </svg>
  );
}

export function FurnitureTemplateLayer({
  template,
  isSelected = false,
  showLabel = true,
  interactive = true,
  isLocked = false,
}: {
  template: FurnitureTemplate;
  isSelected?: boolean;
  showLabel?: boolean;
  interactive?: boolean;
  isLocked?: boolean;
}) {
  const components = getFurnitureTemplateComponents(template);
  const outline = getFurnitureTemplateOutline(template);
  const { center, clearance } = getFurnitureTemplateLabelPlacement(template);
  const centerX = center[0];
  const centerY = center[1];
  const labelRef = useRef<SVGTextElement>(null);
  const [labelScale, setLabelScale] = useState(1);
  const componentPath = (component: RoomComponent) =>
    `${getComponentRing(component)
      .map(([x, y], index) =>
        `${index === 0 ? "M" : "L"} ${x} ${y}`,
      )
      .join(" ")} Z`;

  useLayoutEffect(() => {
    const text = labelRef.current;

    if (!text || clearance <= 0) {
      setLabelScale(1);
      return;
    }

    const bounds = text.getBBox();
    const corners: Pair[] = [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x, bounds.y + bounds.height],
      [bounds.x + bounds.width, bounds.y + bounds.height],
    ];
    const furthestCorner = Math.max(
      ...corners.map(([x, y]) =>
        Math.hypot(x - centerX, y - centerY),
      ),
    );

    setLabelScale(
      furthestCorner > 0
        ? Math.min(1, clearance / furthestCorner)
        : 1,
    );
  }, [centerX, centerY, clearance, template.name]);

  return (
    <svg
      className={styles.furnitureCompositionLayer}
      viewBox={`0 0 ${template.width} ${template.length}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={template.name}
    >
      {components.map((component) => (
        <path
          key={component.id}
          className={`${styles.furnitureCompositionHitTarget} ${
            isLocked ? styles.furnitureCompositionHitTargetLocked : ""
          }`}
          data-testid="furniture-component-hit-target"
          pointerEvents={interactive ? "visiblePainted" : "none"}
          d={componentPath(component)}
        />
      ))}
      <path
        className={`${styles.furnitureCompositionOutline} ${
          isSelected ? styles.furnitureCompositionOutlineSelected : ""
        }`}
        data-testid="furniture-union-shape"
        fillRule="evenodd"
        d={outline
          .map((polygon) =>
            polygon
              .map((ring) =>
                ring
                  .map(
                    ([x, y], index) =>
                      `${index === 0 ? "M" : "L"} ${x} ${y}`,
                  )
                  .join(" ") + " Z",
              )
              .join(" "),
          )
          .join(" ")}
        pointerEvents={interactive ? "none" : "visiblePainted"}
      />
      {showLabel && (
        <text
          ref={labelRef}
          className={`${styles.furnitureCompositionLabel} ${
            isSelected ? styles.furnitureCompositionLabelSelected : ""
          }`}
          x={centerX}
          y={centerY}
          transform={`translate(${centerX} ${centerY}) scale(${labelScale}) translate(${-centerX} ${-centerY})`}
          data-label-scale={labelScale}
          textAnchor="middle"
          dominantBaseline="central"
          pointerEvents="none"
        >
          {template.name}
        </text>
      )}
    </svg>
  );
}

export function WallOpeningsLayer({
  rooms,
  openings,
  wallThickness,
  wallThicknesses,
  isLocked = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  rooms: Room[];
  openings: WallOpening[];
  wallThickness: number;
  wallThicknesses: Record<string, number>;
  isLocked?: boolean;
  onPointerDown: (
    event: PointerEvent<HTMLButtonElement>,
    opening: WallOpening,
  ) => void;
  onPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  const edges = rooms.flatMap((room) =>
    getRoomBoundaryEdges(room).map((edge) => ({ room, edge })),
  );

  return openings.map((opening) => {
    const boundary = edges.find((item) => item.edge.id === opening.sourceId);

    if (
      !boundary ||
      opening.offset + opening.width > boundary.edge.length
    ) {
      return null;
    }

    const { edge, room } = boundary;
    const side = getRoomEdgeSide(room, edge);
    const legacyThickness = side
      ? wallThicknesses[`${room.id}-${side}`]
      : undefined;
    const thickness =
      wallThicknesses[opening.sourceId] ?? legacyThickness ?? wallThickness;
    const ratio = (opening.offset + opening.width / 2) / edge.length;
    const centerX =
      edge.start[0] +
      (edge.end[0] - edge.start[0]) * ratio +
      edge.outwardNormal[0] * thickness / 2;
    const centerY =
      edge.start[1] +
      (edge.end[1] - edge.start[1]) * ratio +
      edge.outwardNormal[1] * thickness / 2;
    const angle =
      (Math.atan2(
        edge.end[1] - edge.start[1],
        edge.end[0] - edge.start[0],
      ) *
        180) /
      Math.PI;
    const left = (centerX - opening.width / 2) / 2;
    const top = (centerY - thickness / 2) / 2;

    const showSwing =
      opening.kind !== "window";

    return (
      <button
        key={opening.id}
        type="button"
        aria-label={`Drag ${opening.kind === "window" ? "window" : "doorway"}`}
        className={sharedStyles.wallOpening}
        disabled={isLocked}
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${opening.width / 2}px`,
          height: `${thickness / 2}px`,
          transform: `rotate(${angle}deg)`,
        }}
        onPointerDown={(event) => onPointerDown(event, opening)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {showSwing && (
          <svg
            className={styles.doorSwing}
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <g
              transform={
                opening.swingSide === "right"
                  ? "translate(100 0) scale(-1 1)"
                  : undefined
              }
            >
              <path d="M 100 0 A 100 100 0 0 1 0 100" />
              <path d="M 0 0 L 0 100" />
            </g>
          </svg>
        )}
        {opening.kind === "window" && (
          <svg
            className={styles.windowFrame}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M 0 25 H 100" />
            <path d="M 0 75 H 100" />
          </svg>
        )}
      </button>
    );
  });
}
