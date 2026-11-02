export type Pair = [number, number];

export type EditorMode =
  | "flat"
  | "room-creator"
  | "furniture-creator"
  | "room-designer";

export type PlanBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export type ComponentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type Flat = {
  rooms: Room[];
  selectedRoomId: number | null;
  wallThickness?: number;
  wallThicknesses?: Record<string, number>;
  wallOpenings?: WallOpening[];
  furnitureTemplates?: FurnitureTemplate[];
  furniturePlacements?: FurniturePlacement[];
};

export type RoomComponent = {
  id: string;
  shape: "rectangle" | "right-triangle" | "circle";
  x: number;
  y: number;
  width: number;
  length: number;
  rotation: number;
};

export type Room = {
  id: number;
  name: string;
  width: number;
  length: number;
  x: number;
  y: number;
  components: RoomComponent[];
};

export type RoomBoundaryEdge = {
  id: string;
  roomId: number;
  start: Pair;
  end: Pair;
  length: number;
  outwardNormal: Pair;
};

export type ComponentWall = {
  id: string;
  roomId: number;
  sourceId: string;
  start: Pair;
  end: Pair;
  outwardNormal: Pair;
  length: number;
  thickness: number;
};

export type WallSource = {
  roomId: number;
  sourceId: string;
  outwardNormal: Pair;
};

export type WallSegment = {
  id: string;
  start: Pair;
  end: Pair;
  outwardNormal: Pair;
  length: number;
  thickness: number;
  sources: WallSource[];
};

export type WallOpening = {
  id: string;
  sourceId: string;
  offset: number;
  width: number;
  kind?: "door" | "window";
  swingSide?: "left" | "right";
};

export type RoomDrag = {
  roomId: number;
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startRoomX: number;
  startRoomY: number;
  scale: number;
};

export type OpeningDrag = {
  openingId: string;
  pointerId: number;
  roomId: number;
};

export type FurnitureTemplate = {
  id: string;
  name: string;
  shape: RoomComponent["shape"];
  width: number;
  length: number;
  components?: RoomComponent[];
};

export type FurniturePlacement = {
  id: string;
  templateId: string;
  roomId: number;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  length?: number;
};

export type FurnitureDrag = {
  placementId: string;
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startX: number;
  startY: number;
  scale: number;
};
