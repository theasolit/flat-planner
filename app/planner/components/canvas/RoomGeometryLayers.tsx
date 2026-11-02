import sharedStyles from "../../FlatPlanner.module.css";
import styles from "./RoomGeometryLayers.module.css";
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
}: {
  template: FurnitureTemplate;
}) {
  const components =
    template.components ??
    [
      {
        id: "legacy-template-shape",
        shape: template.shape,
        x: 0,
        y: 0,
        width: template.width,
        length: template.length,
        rotation: 0,
      } satisfies RoomComponent,
    ];

  return (
    <svg
      className={styles.furnitureCompositionLayer}
      viewBox={`0 0 ${template.width} ${template.length}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {components.map((component) => (
        <path
          key={component.id}
          className={sharedStyles.furnitureCompositionShape}
          d={`${getComponentRing(component)
            .map(([x, y], index) =>
              `${index === 0 ? "M" : "L"} ${x} ${y}`,
            )
            .join(" ")} Z`}
        />
      ))}
    </svg>
  );
}

export function WallOpeningsLayer({
  rooms,
  openings,
  wallThickness,
  wallThicknesses,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  rooms: Room[];
  openings: WallOpening[];
  wallThickness: number;
  wallThicknesses: Record<string, number>;
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
