import type {
  Flat,
  FurniturePlacement,
  FurnitureTemplate,
  Room,
  RoomComponent,
  WallOpening,
} from "../types";

const STORAGE_KEY = "flat-planner-v2";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRoomComponent(value: unknown): value is RoomComponent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.shape === "rectangle" ||
      value.shape === "right-triangle" ||
      value.shape === "circle" ||
      value.shape === "quarter-circle") &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.length) &&
    value.length > 0 &&
    isFiniteNumber(value.rotation) &&
    (value.includedAngle === undefined ||
      (isFiniteNumber(value.includedAngle) &&
        value.includedAngle > 0 &&
        value.includedAngle <= 360)) &&
    (value.mirrorHorizontal === undefined ||
      typeof value.mirrorHorizontal === "boolean") &&
    (value.mirrorVertical === undefined ||
      typeof value.mirrorVertical === "boolean")
  );
}

function isRoom(value: unknown): value is Room {
  return (
    isRecord(value) &&
    Number.isInteger(value.id) &&
    typeof value.name === "string" &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.length) &&
    value.length > 0 &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    Array.isArray(value.components) &&
    value.components.length > 0 &&
    value.components.every(isRoomComponent)
  );
}

function isFurnitureTemplate(value: unknown): value is FurnitureTemplate {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.shape === "rectangle" ||
      value.shape === "right-triangle" ||
      value.shape === "circle" ||
      value.shape === "quarter-circle") &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.length) &&
    value.length > 0 &&
    (value.components === undefined ||
      (Array.isArray(value.components) &&
        value.components.length > 0 &&
        value.components.every(isRoomComponent)))
  );
}

function isFurniturePlacement(value: unknown): value is FurniturePlacement {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.templateId === "string" &&
    Number.isInteger(value.roomId) &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.rotation) &&
    (value.locked === undefined || typeof value.locked === "boolean") &&
    (value.width === undefined ||
      (isFiniteNumber(value.width) && value.width > 0)) &&
    (value.length === undefined ||
      (isFiniteNumber(value.length) && value.length > 0))
  );
}

function isWallOpening(value: unknown): value is WallOpening {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.sourceId === "string" &&
    isFiniteNumber(value.offset) &&
    value.offset >= 0 &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    (value.kind === undefined ||
      value.kind === "door" ||
      value.kind === "window") &&
    (value.swingSide === undefined ||
      value.swingSide === "left" ||
      value.swingSide === "right")
  );
}

function isNumericRecord(value: unknown): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (entry) => isFiniteNumber(entry) && entry > 0,
    )
  );
}

function isFlat(value: unknown): value is Flat {
  return (
    isRecord(value) &&
    Array.isArray(value.rooms) &&
    value.rooms.every(isRoom) &&
    (value.selectedRoomId === null ||
      (Number.isInteger(value.selectedRoomId) &&
        value.rooms.some((room) => room.id === value.selectedRoomId))) &&
    (value.isFlatLocked === undefined ||
      typeof value.isFlatLocked === "boolean") &&
    (value.wallThickness === undefined ||
      (isFiniteNumber(value.wallThickness) && value.wallThickness > 0)) &&
    (value.wallThicknesses === undefined ||
      isNumericRecord(value.wallThicknesses)) &&
    (value.wallOpenings === undefined ||
      (Array.isArray(value.wallOpenings) &&
        value.wallOpenings.every(isWallOpening))) &&
    (value.furnitureTemplates === undefined ||
      (Array.isArray(value.furnitureTemplates) &&
        value.furnitureTemplates.every(isFurnitureTemplate))) &&
    (value.furniturePlacements === undefined ||
      (Array.isArray(value.furniturePlacements) &&
        value.furniturePlacements.every(isFurniturePlacement)))
  );
}

export function parseFlatData(serialized: string): Flat {
  let value: unknown;

  try {
    value = JSON.parse(serialized);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The file is not valid JSON.");
    }

    throw error;
  }

  if (!isFlat(value)) {
    throw new Error("The file does not contain a valid flat planner layout.");
  }

  return value;
}

export function serializeFlatData(flat: Flat, pretty = false): string {
  return JSON.stringify(flat, null, pretty ? 2 : undefined);
}

export function loadSavedFlat(): Flat | null {
  const serialized = localStorage.getItem(STORAGE_KEY);

  return serialized ? parseFlatData(serialized) : null;
}

export function saveFlatData(flat: Flat): void {
  localStorage.setItem(STORAGE_KEY, serializeFlatData(flat));
}

type SaveFilePickerOptions = {
  suggestedName: string;
  types: {
    description: string;
    accept: Record<string, string[]>;
  }[];
};

type WritableFile = {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
};

type SaveFileHandle = {
  name: string;
  createWritable: () => Promise<WritableFile>;
};

type SaveFilePicker = (
  options: SaveFilePickerOptions,
) => Promise<SaveFileHandle>;

export async function saveFlatFile(
  flat: Flat,
): Promise<{ fileName: string; destination: "chosen" | "downloads" } | null> {
  const picker = (
    window as Window & { showSaveFilePicker?: SaveFilePicker }
  ).showSaveFilePicker;

  if (picker) {
    const fileHandle = await picker({
      suggestedName: "flat-planner.json",
      types: [
        {
          description: "Flat Planner file",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await fileHandle.createWritable();

    await writable.write(serializeFlatData(flat, true));
    await writable.close();

    return { fileName: fileHandle.name, destination: "chosen" };
  }

  const requestedName = window.prompt(
    "File name",
    "flat-planner.json",
  );

  if (requestedName === null) {
    return null;
  }

  const trimmedName = requestedName.trim();
  const fileName = trimmedName
    ? /\.json$/i.test(trimmedName)
      ? trimmedName
      : `${trimmedName}.json`
    : "flat-planner.json";

  downloadFlatData(flat, fileName);
  return { fileName, destination: "downloads" };
}

export function downloadFlatData(
  flat: Flat,
  fileName = "flat-planner.json",
): void {
  const file = new Blob([serializeFlatData(flat, true)], {
    type: "application/json",
  });
  const downloadUrl = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}
