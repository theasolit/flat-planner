import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("locked flat keeps furniture editable and saves the room and placements", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: undefined,
    });
  });
  page.on("dialog", (dialog) => dialog.accept("custom-layout"));
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("heading", { name: "Room Creator" })).toBeVisible();
  await page.getByLabel("Room name").fill("Living room");
  await expect(page.getByText("Add a shape", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Width (cm)")).toHaveValue("400");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("300");
  await expect(
    page
      .getByTestId("shape-composition-creator")
      .getByRole("button", { name: "Save" }),
  ).toHaveClass(/saveButton/);
  await page.getByLabel("Width (cm)").fill("420");
  await page.getByLabel("Length (cm)").fill("310");
  await expect(page.getByLabel("Width (cm)")).toHaveValue("420");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("310");
  const roomWorkArea = await page
    .getByTestId("shape-composition-work-area")
    .boundingBox();
  const roomCanvas = await page
    .getByTestId("shape-composition-canvas")
    .boundingBox();
  const roomCreator = await page
    .getByTestId("shape-composition-creator")
    .boundingBox();
  const roomSaveButton = await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .boundingBox();
  const roomActions = await page.getByTestId("shape-actions").boundingBox();
  expect(roomWorkArea).not.toBeNull();
  expect(roomCanvas).not.toBeNull();
  expect(roomCreator).not.toBeNull();
  expect(roomSaveButton).not.toBeNull();
  expect(roomActions).not.toBeNull();
  if (
    !roomWorkArea ||
    !roomCanvas ||
    !roomCreator ||
    !roomSaveButton ||
    !roomActions
  ) {
    throw new Error("The room creator or its canvas is not visible.");
  }
  expect(roomCanvas.width).toBeGreaterThan(roomActions.width * 2);
  expect(roomCanvas.height).toBeCloseTo(roomCreator.height, 0);
  expect(Math.abs(roomCanvas.y - roomCreator.y)).toBeLessThan(2);
  expect(roomSaveButton.x + roomSaveButton.width).toBeLessThan(roomCanvas.x);
  const roomActionButtons = await page
    .getByTestId("shape-actions")
    .getByRole("button")
    .all();
  const roomActionBounds = await Promise.all(
    roomActionButtons.map((button) => button.boundingBox()),
  );
  expect(roomActionBounds).toHaveLength(5);
  for (const bounds of roomActionBounds) {
    expect(bounds).not.toBeNull();
    if (bounds) {
      expect(bounds.width).toBeGreaterThan(40);
    }
  }
  await expect(
    page.getByRole("button", { name: "Add rectangle" }),
  ).toHaveAttribute("title", "Add rectangle");
  await expect(
    page.getByRole("button", { name: "Add right triangle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add circle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add quarter circle" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Template Name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rotate selected shape clockwise" }),
  ).toBeDisabled();
  await page.getByTestId("shape-component").first().click();
  await expect(page.getByLabel("Width (cm)")).toHaveValue("400");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("300");
  const roomMirrorHorizontalButton = page.getByRole("button", {
    name: "Mirror selected shape across horizontal axis",
  });
  const roomMirrorVerticalButton = page.getByRole("button", {
    name: "Mirror selected shape across vertical axis",
  });
  const roomShapePath = page.getByTestId("shape-component").first();
  await expect(roomShapePath).toHaveAttribute(
    "d",
    "M 0 0 L 400 0 L 400 300 L 0 300 Z",
  );
  await roomMirrorHorizontalButton.click();
  await expect(roomShapePath).toHaveAttribute(
    "d",
    "M 0 300 L 400 300 L 400 0 L 0 0 Z",
  );
  await expect(roomMirrorHorizontalButton).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(roomMirrorVerticalButton).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await roomMirrorHorizontalButton.click();
  await expect(roomShapePath).toHaveAttribute(
    "d",
    "M 0 0 L 400 0 L 400 300 L 0 300 Z",
  );
  await roomMirrorVerticalButton.click();
  await expect(roomShapePath).toHaveAttribute(
    "d",
    "M 400 0 L 0 0 L 0 300 L 400 300 Z",
  );
  await expect(roomMirrorHorizontalButton).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(roomMirrorVerticalButton).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await roomMirrorHorizontalButton.click();
  await expect(roomMirrorHorizontalButton).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(roomMirrorVerticalButton).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Rotate selected shape clockwise" })
    .click();
  await page
    .getByRole("button", { name: "Rotate selected shape counterclockwise" })
    .click();
  await expect(page.getByRole("button", { name: "Add shape" })).toHaveCount(0);
  await page.getByRole("button", { name: "Add right triangle" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(2);
  await page.getByRole("button", { name: "Remove selected shape" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(1);
  await page.getByRole("button", { name: "Add circle" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(2);
  await expect(page.getByLabel("Radius (cm)")).toHaveValue("420");
  const includedAngleInput = page.getByLabel("Included angle (degrees)");
  await expect(includedAngleInput).toHaveValue("90");
  await expect(includedAngleInput).toHaveAttribute("min", "1");
  await expect(includedAngleInput).toHaveAttribute("max", "360");
  const initialSectorPath = await page
    .getByTestId("shape-component")
    .last()
    .getAttribute("d");
  await includedAngleInput.fill("180");
  await expect(includedAngleInput).toHaveValue("180");
  await expect(page.getByTestId("shape-component").last()).not.toHaveAttribute(
    "d",
    initialSectorPath ?? "",
  );
  await includedAngleInput.fill("361");
  await expect(includedAngleInput).toHaveValue("180");
  await page.getByLabel("Radius (cm)").fill("200");
  await expect(page.getByLabel("Radius (cm)")).toHaveValue("200");
  await expect(includedAngleInput).toHaveValue("180");
  await page.getByRole("button", { name: "Remove selected shape" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(1);
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page
    .getByRole("button", { name: "Living room", exact: true })
    .click();

  await page.getByRole("button", { name: "Add door" }).click();
  await page.getByRole("button", { name: "Add window" }).click();
  const lockButton = page.getByRole("button", { name: "Lock flat" });
  await lockButton.click();
  await expect(page.getByRole("button", { name: "Unlock flat" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: "Add room" })).toBeDisabled();
  const disabledAddRoomButton = page.getByRole("button", { name: "Add room" });
  await expect(disabledAddRoomButton).toHaveCSS("cursor", "not-allowed");
  await expect(disabledAddRoomButton).toHaveCSS(
    "background-color",
    "rgb(52, 72, 74)",
  );
  await expect(disabledAddRoomButton).toHaveCSS(
    "color",
    "rgb(132, 168, 173)",
  );
  const disabledAddRoomBackground = await disabledAddRoomButton.evaluate(
    (button) => getComputedStyle(button).backgroundColor,
  );
  await disabledAddRoomButton.hover();
  await expect(disabledAddRoomButton).toHaveCSS(
    "background-color",
    disabledAddRoomBackground,
  );
  await expect(
    page.getByRole("button", { name: "Remove Living room" }),
  ).toBeDisabled();
  await expect(page.getByLabel("Room name")).toBeDisabled();
  await expect(page.getByLabel("Room name")).toHaveCSS("cursor", "default");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toBeDisabled();
  const lockedDoorway = page.getByRole("button", { name: "Drag doorway" });
  await expect(lockedDoorway).toHaveCSS("cursor", "default");
  await expect(lockedDoorway).toHaveCSS(
    "background-color",
    "rgb(92, 139, 106)",
  );
  await expect(page.getByRole("button", { name: "Drag window" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Drag window" })).toHaveCSS(
    "cursor",
    "default",
  );

  await page.getByRole("button", { name: "Create furniture template" }).click();
  await expect(
    page.getByRole("heading", { name: "Furniture Creator" }),
  ).toBeVisible();
  await page.getByLabel("Template Name").fill("Sofa");
  await expect(page.getByLabel("Width (cm)")).toHaveValue("100");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("60");
  const furnitureWorkArea = await page
    .getByTestId("shape-composition-work-area")
    .boundingBox();
  const furnitureCanvas = await page
    .getByTestId("shape-composition-canvas")
    .boundingBox();
  const furnitureCreator = await page
    .getByTestId("shape-composition-creator")
    .boundingBox();
  const furnitureSaveButton = await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .boundingBox();
  const furnitureActions = await page.getByTestId("shape-actions").boundingBox();
  expect(furnitureWorkArea).not.toBeNull();
  expect(furnitureCanvas).not.toBeNull();
  expect(furnitureCreator).not.toBeNull();
  expect(furnitureSaveButton).not.toBeNull();
  expect(furnitureActions).not.toBeNull();
  if (
    !furnitureWorkArea ||
    !furnitureCanvas ||
    !furnitureCreator ||
    !furnitureSaveButton ||
    !furnitureActions
  ) {
    throw new Error("The furniture creator or its canvas is not visible.");
  }
  expect(furnitureCanvas.width).toBeGreaterThan(furnitureActions.width * 2);
  expect(furnitureCanvas.height).toBeCloseTo(furnitureCreator.height, 0);
  expect(Math.abs(furnitureCanvas.y - furnitureCreator.y)).toBeLessThan(2);
  expect(furnitureSaveButton.x + furnitureSaveButton.width).toBeLessThan(
    furnitureCanvas.x,
  );
  await expect(page.getByLabel("Template Name")).toHaveValue("Sofa");
  await expect(
    page
      .getByTestId("shape-composition-creator")
      .getByRole("button", { name: "Save" }),
  ).toHaveClass(/saveButton/);
  await page.getByLabel("Width (cm)").fill("110");
  await page.getByLabel("Length (cm)").fill("70");
  await page.getByTestId("shape-component").first().click();
  await expect(page.getByLabel("Width (cm)")).toHaveValue("100");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("60");
  await page.getByLabel("Width (cm)").fill("120");
  await expect(page.getByLabel("Width (cm)")).toHaveValue("120");
  await page.getByLabel("Width (cm)").fill("100");
  await page.getByLabel("Length (cm)").fill("70");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("70");
  await page.getByLabel("Length (cm)").fill("60");
  const mirrorHorizontalButton = page.getByRole("button", {
    name: "Mirror selected shape across horizontal axis",
  });
  const mirrorVerticalButton = page.getByRole("button", {
    name: "Mirror selected shape across vertical axis",
  });
  await mirrorHorizontalButton.click();
  await mirrorVerticalButton.click();
  await expect(mirrorHorizontalButton).toHaveAttribute("aria-pressed", "true");
  await expect(mirrorVerticalButton).toHaveAttribute("aria-pressed", "true");
  const compositionPreview = page.getByTestId("shape-composition-preview");
  await compositionPreview.click({ position: { x: 4, y: 4 } });
  await expect(page.getByLabel("Width (cm)")).toHaveValue("100");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("60");
  await expect(mirrorHorizontalButton).toBeDisabled();
  await page.getByTestId("shape-component").first().click();
  await expect(page.getByLabel("Width (cm)")).toHaveValue("100");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();

  const sofaTemplate = page.getByRole("button", {
    name: "Sofa — 100 × 60 cm",
  });
  await sofaTemplate.click();
  await sofaTemplate.click();

  const furnitureCanvasItems = page.locator("div[data-furniture-placement-id]");
  await expect(furnitureCanvasItems).toHaveCount(2);
  const firstItem = furnitureCanvasItems.first();
  const initialFirstLeft = await firstItem.evaluate((element) =>
    (element as HTMLElement).style.left,
  );
  const movableItem = furnitureCanvasItems.last();
  const initialMovableLeft = await movableItem.evaluate((element) =>
    (element as HTMLElement).style.left,
  );
  const box = await movableItem.boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    throw new Error("The placed sofa is not visible on the room canvas.");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 70,
    box.y + box.height / 2 + 20,
    { steps: 6 },
  );
  await page.mouse.up();

  await expect
    .poll(() =>
      movableItem.evaluate((element) => (element as HTMLElement).style.left),
    )
    .not.toBe(initialMovableLeft);
  await expect(
    page.getByRole("heading", { name: "Sofa", exact: true }),
  ).toHaveCount(0);

  const lockPieceButton = page.getByRole("button", {
    name: "Lock Sofa 1",
    exact: true,
  });
  await lockPieceButton.click();
  await expect(
    page.getByRole("button", { name: "Unlock Sofa 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");

  const lockedBox = await firstItem.boundingBox();
  expect(lockedBox).not.toBeNull();

  if (!lockedBox) {
    throw new Error("The locked sofa is not visible on the room canvas.");
  }

  await page.mouse.move(
    lockedBox.x + lockedBox.width / 2,
    lockedBox.y + lockedBox.height / 2,
  );
  const lockedFurnitureCursor = await page.evaluate(
    ({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return target ? getComputedStyle(target).cursor : null;
    },
    {
      x: lockedBox.x + lockedBox.width / 2,
      y: lockedBox.y + lockedBox.height / 2,
    },
  );
  expect(lockedFurnitureCursor).toBe("default");

  await page.mouse.move(
    lockedBox.x + lockedBox.width / 2,
    lockedBox.y + lockedBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    lockedBox.x + lockedBox.width / 2 + 50,
    lockedBox.y + lockedBox.height / 2 + 20,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(firstItem).toHaveCSS("left", initialFirstLeft);

  await page.getByRole("button", { name: "Sofa 1", exact: true }).click();
  await expect(page.getByLabel("Width (cm)")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove Sofa 1" })).toBeDisabled();

  await page
    .getByRole("button", { name: "Delete furniture template Sofa" })
    .click();
  await expect(page.getByTestId("save-toast")).toContainText(
    "Unlock every placed piece before deleting its furniture template.",
  );
  await expect(sofaTemplate).toBeVisible();

  await page.getByRole("button", { name: "Remove Sofa 2" }).click();
  await expect(furnitureCanvasItems).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Sofa 2" })).toHaveCount(0);

  await page.getByRole("button", { name: "Sofa 1", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sofa", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save now", exact: true }).click();
  await expect(page.getByTestId("save-toast")).toContainText("Saved in this browser");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save file" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("custom-layout.json");
  await expect(page.getByTestId("save-toast")).toContainText(
    "Downloaded custom-layout.json",
  );
  const exportPath = await download.path();
  expect(exportPath).not.toBeNull();

  if (!exportPath) {
    throw new Error("The exported flat was not saved to a temporary file.");
  }

  const exportedFlat = JSON.parse(await readFile(exportPath, "utf8"));
  expect(exportedFlat.furnitureTemplates[0].components[0]).toMatchObject({
    mirrorHorizontal: true,
    mirrorVertical: true,
  });

  expect(exportedFlat.rooms[0].components[0]).toMatchObject({
    mirrorHorizontal: true,
    mirrorVertical: true,
  });

  await page.reload();
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Unlock flat" }),
  ).toHaveAttribute("aria-pressed", "true");
  const lockedRoom = page.locator("[data-room-id]").first();
  const lockedRoomBox = await lockedRoom.boundingBox();
  expect(lockedRoomBox).not.toBeNull();
  if (!lockedRoomBox) {
    throw new Error("The locked room is not visible in the flat view.");
  }
  await page.mouse.move(
    lockedRoomBox.x + lockedRoomBox.width / 2,
    lockedRoomBox.y + lockedRoomBox.height / 2,
  );
  await expect(lockedRoom).toHaveCSS("cursor", "default");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCSS(
    "background-color",
    "rgb(92, 139, 106)",
  );
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCSS(
    "cursor",
    "default",
  );
  await expect(page.getByRole("button", { name: "Drag window" })).toHaveCSS(
    "cursor",
    "default",
  );
  await page
    .getByRole("button", { name: "Living room", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unlock Sofa 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Sofa 2" })).toHaveCount(0);
  await expect(furnitureCanvasItems).toHaveCount(1);
  await expect
    .poll(() =>
      furnitureCanvasItems.first().evaluate((element) =>
        (element as HTMLElement).style.left,
      ),
    )
    .toBe(initialFirstLeft);

  await page.getByRole("button", { name: "Unlock flat" }).click();
  await page.getByLabel("Import flat from JSON file").setInputFiles(exportPath);
  await expect(
    page.getByRole("button", { name: "Unlock flat" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Redo" })).toBeDisabled();
  await page
    .getByRole("button", { name: "Living room", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Unlock Sofa 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(furnitureCanvasItems).toHaveCount(1);
  await expect
    .poll(() =>
      furnitureCanvasItems.first().evaluate((element) =>
        (element as HTMLElement).style.left,
      ),
    )
    .toBe(initialFirstLeft);
});

test("undo and redo restore planner edits and support keyboard shortcuts", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const undoButton = page.getByRole("button", { name: "Undo" });
  const redoButton = page.getByRole("button", { name: "Redo" });
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await page.getByRole("button", { name: "Add room" }).click();
  await expect(undoButton).toBeDisabled();
  await page.getByLabel("Room name").fill("History room");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await expect(
    page.getByRole("button", { name: "History room", exact: true }),
  ).toBeVisible();
  await expect(undoButton).toBeEnabled();

  await undoButton.click();
  await expect(
    page.getByRole("button", { name: "History room", exact: true }),
  ).toHaveCount(0);
  await expect(redoButton).toBeEnabled();
  await redoButton.click();
  await expect(
    page.getByRole("button", { name: "History room", exact: true }),
  ).toBeVisible();

  const roomShape = page.locator("[data-room-id]").first();
  const initialRoomLeft = await roomShape.evaluate(
    (element) => (element as HTMLElement).style.left,
  );
  const roomBounds = await roomShape.boundingBox();
  expect(roomBounds).not.toBeNull();
  if (!roomBounds) {
    throw new Error("The history room is not visible on the floor plan.");
  }
  const dragStartX = roomBounds.x + roomBounds.width / 2;
  const dragStartY = roomBounds.y + roomBounds.height / 2;
  await page.mouse.move(dragStartX, dragStartY);
  await page.mouse.down();
  await page.mouse.move(dragStartX + 16, dragStartY + 10, { steps: 3 });
  await page.waitForTimeout(500);
  await page.mouse.move(dragStartX + 40, dragStartY + 24, { steps: 3 });
  await page.mouse.up();
  const draggedRoomLeft = await roomShape.evaluate(
    (element) => (element as HTMLElement).style.left,
  );
  expect(draggedRoomLeft).not.toBe(initialRoomLeft);
  await undoButton.click();
  await expect(roomShape).toHaveCSS("left", initialRoomLeft);
  await redoButton.click();
  await expect(roomShape).toHaveCSS("left", draggedRoomLeft);

  await page.getByRole("button", { name: "History room", exact: true }).click();
  await page.getByRole("button", { name: "Add door" }).click();
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCount(0);
  await expect(redoButton).toBeEnabled();
  await page.keyboard.press("Control+Shift+z");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCount(1);
  await page.keyboard.press("Control+z");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCount(0);

  await page.getByRole("button", { name: "Add window" }).click();
  await expect(page.getByRole("button", { name: "Drag window" })).toHaveCount(1);
  await expect(redoButton).toBeDisabled();
  await page.keyboard.press("Control+y");
  await expect(page.getByRole("button", { name: "Drag doorway" })).toHaveCount(0);
});

test("autosave stores edits and restores them after reload", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByLabel("Room name").fill("Autosaved room");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();

  await expect(page.getByRole("status")).toContainText("Saved automatically");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = localStorage.getItem("flat-planner-v2");
        return saved ? JSON.parse(saved).rooms[0]?.name : null;
      }),
    )
    .toBe("Autosaved room");

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Autosaved room", exact: true }),
  ).toBeVisible();
});

test("file save picker writes the flat under the selected filename", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const windowWithSavePicker = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: { description: string; accept: Record<string, string[]> }[];
      }) => Promise<{
        name: string;
        createWritable: () => Promise<{
          write: (data: string) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
      savedFile?: { options: unknown; contents: string; closed: boolean };
    };

    windowWithSavePicker.showSaveFilePicker = async (options) => {
      const savedFile = { options, contents: "", closed: false };
      windowWithSavePicker.savedFile = savedFile;

      return {
        name: "my-layout.json",
        createWritable: async () => ({
          write: async (contents) => {
            savedFile.contents = contents;
          },
          close: async () => {
            savedFile.closed = true;
          },
        }),
      };
    };
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Save file" }).click();
  await expect(page.getByTestId("save-toast")).toContainText("Saved my-layout.json");
  const savedFile = await page.evaluate(() => {
    const windowWithSavedFile = window as Window & {
      savedFile?: { options: unknown; contents: string; closed: boolean };
    };
    return windowWithSavedFile.savedFile;
  });
  expect(savedFile?.closed).toBe(true);
  expect(JSON.parse(savedFile?.contents ?? "")).toMatchObject({
    rooms: [],
    selectedRoomId: null,
  });
  expect(savedFile?.options).toMatchObject({
    suggestedName: "flat-planner.json",
    types: [
      {
        description: "Flat Planner file",
        accept: { "application/json": [".json"] },
      },
    ],
  });
});

test("editing a furniture template updates its existing placements", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByLabel("Room name").fill("Studio");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();

  await page.getByRole("button", { name: "Create furniture template" }).click();
  await page.getByLabel("Template Name").fill("Work table");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();

  const templateButton = page.getByRole("button", {
    name: "Work table — 100 × 60 cm",
  });
  await templateButton.click();
  await templateButton.click();

  const furniturePlacements = page
    .getByTestId("room-designer-canvas")
    .locator("[data-furniture-placement-id]");
  await expect(furniturePlacements).toHaveCount(2);
  const originalPositions = await Promise.all(
    (await furniturePlacements.all()).map((placement) =>
      placement.evaluate((element) => {
        const { left, top } = (element as HTMLElement).style;
        return { left, top };
      }),
    ),
  );

  await page
    .getByRole("button", { name: "Edit furniture template Work table" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit furniture template" }),
  ).toBeVisible();
  await expect(page.getByLabel("Template Name")).toHaveValue("Work table");
  await page.getByTestId("shape-component").first().click();
  await expect(page.getByLabel("Width (cm)")).toHaveValue("100");
  await expect(page.getByLabel("Length (cm)")).toHaveValue("60");
  await page.getByLabel("Template Name").fill("Updated table");
  await page.getByLabel("Width (cm)").fill("140");
  await page.getByLabel("Length (cm)").fill("80");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save changes" })
    .click();

  await expect(
    page.getByRole("button", { name: "Updated table — 140 × 80 cm" }),
  ).toBeVisible();
  await expect(furniturePlacements).toHaveCount(2);
  for (const [index, placement] of (await furniturePlacements.all()).entries()) {
    await expect(placement.locator('svg[role="img"]')).toHaveAttribute(
      "aria-label",
      "Updated table",
    );
    await expect
      .poll(() =>
        placement.evaluate((element) => {
          const { left, top } = (element as HTMLElement).style;
          return { left, top };
        }),
      )
      .toEqual(originalPositions[index]);
  }
});

test("furniture catalog groups by room or category and filters room assignments", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  async function createRoom(name: string) {
    await page.getByRole("button", { name: "Add room" }).click();
    await page
      .getByTestId("shape-composition-work-area")
      .getByLabel("Room name")
      .fill(name);
    await page
      .getByTestId("shape-composition-creator")
      .getByRole("button", { name: "Save" })
      .click();
  }

  await createRoom("Studio");
  await createRoom("Guest room");
  await page.getByRole("button", { name: "Studio", exact: true }).click();

  const editCategories = page.getByRole("button", { name: "Edit categories" });
  const addTemplate = page.getByRole("button", {
    name: "Create furniture template",
  });
  const editButtonBounds = await editCategories.boundingBox();
  const addButtonBounds = await addTemplate.boundingBox();
  expect(editButtonBounds).not.toBeNull();
  expect(addButtonBounds).not.toBeNull();
  if (!editButtonBounds || !addButtonBounds) {
    throw new Error("The catalog header actions are not visible.");
  }
  expect(editButtonBounds.x).toBeLessThan(addButtonBounds.x);
  expect(editButtonBounds.x - addButtonBounds.x).toBeLessThan(42);

  await editCategories.click();
  const categoryDialog = page.getByRole("dialog", {
    name: "Manage categories",
  });
  await expect(categoryDialog).toBeVisible();
  await expect(categoryDialog).toHaveAttribute("open", "");
  await page.getByLabel("New category name").fill("Work");
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByLabel("New category name").fill("Storage");
  await page.getByRole("button", { name: "Add category" }).click();
  await page.getByRole("button", { name: "Close category manager" }).click();
  await expect(categoryDialog).not.toBeVisible();

  await page.getByRole("button", { name: "Create furniture template" }).click();
  await page.getByLabel("Template Name").fill("Desk");
  const furnitureEditor = page.getByTestId("shape-composition-creator");
  const roomsAssignment = furnitureEditor.getByRole("button", {
    name: "Select rooms",
  });
  const categoriesAssignment = furnitureEditor.getByRole("button", {
    name: "Select categories",
  });
  await expect(roomsAssignment).toHaveAttribute("aria-expanded", "false");
  const categoriesBoundsBeforeOpen = await categoriesAssignment.boundingBox();
  await roomsAssignment.click();
  await expect(roomsAssignment).toHaveAttribute("aria-expanded", "true");
  expect(await categoriesAssignment.boundingBox()).toEqual(
    categoriesBoundsBeforeOpen,
  );
  const roomOptions = furnitureEditor.getByRole("group", { name: "Rooms" });
  const studioCheckbox = roomOptions.getByLabel("Studio", { exact: true });
  await expect(studioCheckbox).toBeVisible();
  await expect(studioCheckbox).toHaveCSS("appearance", "none");
  await expect(studioCheckbox).toHaveCSS("width", "16px");
  await studioCheckbox.uncheck();
  await studioCheckbox.hover();
  await expect(studioCheckbox).toHaveCSS(
    "background-color",
    "rgb(77, 110, 115)",
  );
  await page.mouse.move(0, 0);
  await studioCheckbox.check();
  await page.mouse.move(0, 0);
  await expect(studioCheckbox).toHaveCSS(
    "background-color",
    "rgb(152, 200, 167)",
  );
  await studioCheckbox.hover();
  await expect(studioCheckbox).toHaveCSS(
    "background-color",
    "rgb(163, 236, 185)",
  );
  await roomOptions.getByLabel("Guest room", { exact: true }).check();
  await roomsAssignment.click();
  await expect(roomsAssignment).toHaveAttribute("aria-expanded", "false");
  await categoriesAssignment.click();
  await expect(roomsAssignment).toHaveAttribute("aria-expanded", "false");
  await expect(categoriesAssignment).toHaveAttribute("aria-expanded", "true");
  const categoryOptions = furnitureEditor.getByRole("group", {
    name: "Categories",
  });
  await expect(
    categoryOptions.getByLabel("Work", { exact: true }),
  ).toBeVisible();
  await categoryOptions.getByLabel("Work", { exact: true }).check();
  await categoryOptions.getByLabel("Storage", { exact: true }).check();
  await expect(roomsAssignment).toContainText("Studio, Guest room");
  await expect(categoriesAssignment).toContainText("Work, Storage");
  await categoriesAssignment.click();
  await expect(categoriesAssignment).toHaveAttribute("aria-expanded", "false");
  await roomsAssignment.click();
  await furnitureEditor.getByLabel("Template Name").click();
  await expect(roomsAssignment).toHaveAttribute("aria-expanded", "false");
  await expect(roomOptions).not.toBeVisible();
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();

  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await page.getByRole("button", { name: "Create furniture template" }).click();
  await page.getByLabel("Template Name").fill("Universal lamp");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Studio", exact: true }).click();

  const desk = page.getByRole("button", {
    name: "Desk — 100 × 60 cm",
  });
  const universalLamp = page.getByRole("button", {
    name: "Universal lamp — 100 × 60 cm",
  });
  await expect(
    page.getByRole("heading", { name: "Studio", exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Guest room", exact: true })).toBeVisible();
  await expect(desk).toHaveCount(2);
  await expect(universalLamp).toHaveCount(1);

  const allRoomsToggle = page.getByRole("checkbox", {
    name: "Show furniture from all rooms",
  });
  await expect(allRoomsToggle).toHaveCSS("appearance", "none");
  await expect(allRoomsToggle).toHaveCSS("width", "16px");
  await allRoomsToggle.uncheck();
  await page.mouse.move(0, 0);
  await expect(allRoomsToggle).toHaveCSS(
    "background-color",
    "rgb(52, 72, 74)",
  );
  await allRoomsToggle.hover();
  await expect(allRoomsToggle).toHaveCSS(
    "background-color",
    "rgb(77, 110, 115)",
  );
  await allRoomsToggle.check();
  const checkmarkStyle = await allRoomsToggle.evaluate((checkbox) => {
    const style = getComputedStyle(checkbox, "::after");
    return {
      width: style.width,
      height: style.height,
      borderLeftWidth: style.borderLeftWidth,
      borderBottomWidth: style.borderBottomWidth,
    };
  });
  expect(checkmarkStyle).toEqual({
    width: "12px",
    height: "10px",
    borderLeftWidth: "0px",
    borderBottomWidth: "0px",
  });
  await page.mouse.move(0, 0);
  await expect(allRoomsToggle).toHaveCSS(
    "background-color",
    "rgb(152, 200, 167)",
  );
  await allRoomsToggle.hover();
  await expect(allRoomsToggle).toHaveCSS(
    "background-color",
    "rgb(163, 236, 185)",
  );
  await allRoomsToggle.uncheck();
  await expect(desk).toHaveCount(1);
  await expect(universalLamp).toHaveCount(1);

  await page.getByLabel("Group furniture by").selectOption("category");
  await expect(page.getByRole("heading", { name: "Work", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Storage", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Uncategorized", exact: true })).toBeVisible();
  await expect(desk).toHaveCount(2);
  await expect(universalLamp).toHaveCount(1);

  const workGroup = page
    .locator("details")
    .filter({ has: page.getByRole("heading", { name: "Work", exact: true }) });
  await workGroup.locator("summary").click();
  await expect(workGroup).not.toHaveAttribute("open", "");
  await expect(desk).toHaveCount(1);
  await workGroup.locator("summary").click();
  await expect(workGroup).toHaveAttribute("open", "");
  await expect(desk).toHaveCount(2);

  const uncategorizedGroup = page
    .locator("details")
    .filter({
      has: page.getByRole("heading", { name: "Uncategorized", exact: true }),
    });
  await uncategorizedGroup.locator("summary").click();
  await expect(universalLamp).toHaveCount(0);
  await uncategorizedGroup.locator("summary").click();
  await expect(universalLamp).toHaveCount(1);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = JSON.parse(
          localStorage.getItem("flat-planner-v2") ?? "null",
        );
        return data?.furnitureCategories?.map(
          (category: { name: string }) => category.name,
        );
      }),
    )
    .toEqual(["Work", "Storage"]);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = JSON.parse(
          localStorage.getItem("flat-planner-v2") ?? "null",
        );
        const template = data?.furnitureTemplates?.find(
          (item: { name: string }) => item.name === "Desk",
        );
        return (
          template?.roomIds?.length === 2 &&
          template?.categoryIds?.length === 2
        );
      }),
    )
    .toBe(true);

  const savedOrganization = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem("flat-planner-v2") ?? "null");
    const template = data?.furnitureTemplates?.find(
      (item: { name: string }) => item.name === "Desk",
    );
    return {
      categories: data?.furnitureCategories?.map(
        (category: { name: string }) => category.name,
      ),
      roomIds: template?.roomIds,
      categoryIds: template?.categoryIds,
    };
  });
  expect(savedOrganization.categories).toEqual(["Work", "Storage"]);
  expect(savedOrganization.roomIds).toHaveLength(2);
  expect(savedOrganization.categoryIds).toHaveLength(2);

  await page.reload();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await expect(page.getByLabel("Group furniture by")).toHaveValue("category");
  await expect(
    page.getByRole("heading", { name: "Work", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Show furniture from all rooms" }),
  ).toHaveCount(0);

  await page.getByLabel("Group furniture by").selectOption("room");
  await expect(
    page.getByRole("checkbox", { name: "Show furniture from all rooms" }),
  ).not.toBeChecked();
  const studioGroup = page
    .locator("details")
    .filter({ has: page.getByRole("heading", { name: "Studio", exact: true }) });
  await studioGroup.locator("summary").click();
  await expect(studioGroup).not.toHaveAttribute("open", "");
  await page.reload();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  const reloadedStudioGroup = page
    .locator("details")
    .filter({ has: page.getByRole("heading", { name: "Studio", exact: true }) });
  await expect(page.getByLabel("Group furniture by")).toHaveValue("room");
  await expect(reloadedStudioGroup).not.toHaveAttribute("open", "");
  await expect(desk).toHaveCount(0);
  await expect(universalLamp).toHaveCount(1);
});

test("furniture hit targets and labels follow the rendered shape", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByLabel("Room name").fill("Test room");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Test room", exact: true }).click();
  await page.getByRole("button", { name: "Create furniture template" }).click();
  await page.getByLabel("Template Name").fill("Triangle");
  await page.getByRole("button", { name: "Add right triangle" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(2);
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Test room", exact: true }).click();
  await page.getByRole("button", { name: "Triangle — 200 × 60 cm" }).click();

  const furnitureItem = page.locator("[data-furniture-placement-id]").first();
  await expect(furnitureItem.locator("svg text")).toHaveText("Triangle");
  await expect(
    furnitureItem.getByTestId("furniture-union-shape"),
  ).toHaveCount(1);
  await expect(
    furnitureItem.getByTestId("furniture-component-hit-target"),
  ).toHaveCount(2);
  await expect(page.getByTestId("room-label")).toHaveCount(0);

  async function inspectFurniturePoint(xRatio: number, yRatio: number) {
    const box = await furnitureItem.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      throw new Error("The triangle placement is not visible.");
    }

    return page.evaluate(
      ({ x, y }) => {
        const target = document.elementFromPoint(x, y);

        return {
          cursor: target ? getComputedStyle(target).cursor : null,
          targetTestId:
            target instanceof Element
              ? target.getAttribute("data-testid")
              : null,
          placementId:
            target
              ?.closest("[data-furniture-placement-id]")
              ?.getAttribute("data-furniture-placement-id") ?? null,
        };
      },
      {
        x: box.x + box.width * xRatio,
        y: box.y + box.height * yRatio,
      },
    );
  }

  async function expectFurnitureLabelOnShape() {
    const labelIsOnShape = await furnitureItem.evaluate((element) => {
      const label = element.querySelector<SVGTextElement>("svg text");
      const paths = Array.from(
        element.querySelectorAll<SVGPathElement>("svg path"),
      ).filter((path) => path.hasAttribute("d"));

      if (!paths.length || !label) {
        throw new Error("The furniture shape or label is missing.");
      }

      const labelBounds = label.getBoundingClientRect();
      const screenX = (labelBounds.left + labelBounds.right) / 2;
      const screenY = (labelBounds.top + labelBounds.bottom) / 2;

      return {
        clipped: label.hasAttribute("clip-path"),
        centeredOnShape: paths.some((path) => {
        const svg = path.ownerSVGElement;
        const matrix = svg?.getScreenCTM();

        if (!svg || !matrix) {
          return false;
        }

        const point = svg.createSVGPoint();
        point.x = screenX;
        point.y = screenY;

        return path.isPointInFill(point.matrixTransform(matrix.inverse()));
        }),
      };
    });

    expect(labelIsOnShape.clipped).toBe(false);
    expect(labelIsOnShape.centeredOnShape).toBe(true);
  }

  const filledRoomPoint = await inspectFurniturePoint(0.25, 0.75);
  expect(filledRoomPoint.cursor).toBe("grab");
  expect(filledRoomPoint.placementId).not.toBeNull();
  await expectFurnitureLabelOnShape();

  const emptyRoomPoint = await inspectFurniturePoint(0.75, 0.25);
  expect(emptyRoomPoint.cursor).not.toBe("grab");
  expect(emptyRoomPoint.placementId).toBeNull();
  const emptyRoomBox = await furnitureItem.boundingBox();
  expect(emptyRoomBox).not.toBeNull();
  if (!emptyRoomBox) {
    throw new Error("The triangle placement is not visible.");
  }
  await page.mouse.click(
    emptyRoomBox.x + emptyRoomBox.width * 0.75,
    emptyRoomBox.y + emptyRoomBox.height * 0.25,
  );
  await expect(furnitureItem).not.toHaveClass(/selectedFurniture/);
  const box = await furnitureItem.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    throw new Error("The triangle placement is not visible.");
  }
  await page.mouse.click(
    box.x + box.width * 0.25,
    box.y + box.height * 0.75,
  );
  await expect(furnitureItem).toHaveClass(/selectedFurniture/);

  await page.getByRole("button", { name: "Back to flat layout" }).click();
  await expect(furnitureItem).toBeVisible();
  await expect(furnitureItem).not.toHaveClass(/selectedFurniture/);
  await expect(furnitureItem.locator("svg text")).toHaveCount(0);
  const roomLabel = page.getByTestId("room-label");
  await expect(roomLabel).toHaveCount(1);
  await expect(roomLabel).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(roomLabel).toHaveCSS("-webkit-text-stroke-color", "rgb(0, 0, 0)");
  await expect(roomLabel).toHaveCSS("-webkit-text-stroke-width", "2px");
  await expect(roomLabel).toHaveCSS("z-index", "5");
  const filledFlatPoint = await inspectFurniturePoint(0.25, 0.75);
  expect(filledFlatPoint.cursor).not.toBe("grab");
  expect(filledFlatPoint.targetTestId).toBe("furniture-union-shape");
  const initialFlatLeft = await furnitureItem.evaluate((element) =>
    (element as HTMLElement).style.left,
  );
  const initialFlatTop = await furnitureItem.evaluate((element) =>
    (element as HTMLElement).style.top,
  );
  const furnitureBox = await furnitureItem.boundingBox();
  expect(furnitureBox).not.toBeNull();
  if (!furnitureBox) {
    throw new Error("The triangle placement is not visible in the flat view.");
  }
  await page.mouse.move(
    furnitureBox.x + furnitureBox.width * 0.25,
    furnitureBox.y + furnitureBox.height * 0.75,
  );
  await page.mouse.click(
    furnitureBox.x + furnitureBox.width * 0.25,
    furnitureBox.y + furnitureBox.height * 0.75,
  );
  await expect(page.getByTestId("room-designer-canvas")).toBeVisible();
  await expect(page.getByLabel("Room name")).toHaveValue("Test room");
  await page.getByRole("button", { name: "Back to flat layout" }).click();
  await expect(furnitureItem).toBeVisible();
  await expect(furnitureItem).not.toHaveClass(/selectedFurniture/);
  const flatFurnitureBounds = await furnitureItem.boundingBox();
  expect(flatFurnitureBounds).not.toBeNull();
  if (!flatFurnitureBounds) {
    throw new Error("The triangle placement is not visible in the flat view.");
  }
  await page.mouse.move(
    flatFurnitureBounds.x + flatFurnitureBounds.width * 0.25,
    flatFurnitureBounds.y + flatFurnitureBounds.height * 0.75,
  );
  await page.mouse.down();
  await page.mouse.move(
    flatFurnitureBounds.x + flatFurnitureBounds.width * 0.25 + 50,
    flatFurnitureBounds.y + flatFurnitureBounds.height * 0.75 + 30,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect(furnitureItem).toHaveCSS("left", initialFlatLeft);
  await expect(furnitureItem).toHaveCSS("top", initialFlatTop);
  await expect(furnitureItem).not.toHaveClass(/selectedFurniture/);
  const emptyFlatPoint = await inspectFurniturePoint(0.75, 0.25);
  expect(emptyFlatPoint.placementId).toBeNull();

  await page.getByRole("button", { name: "Test room", exact: true }).click();
  await page.getByRole("button", { name: "Create furniture template" }).click();
  await page.getByLabel("Template Name").fill("Long rectangle furniture name");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Test room", exact: true }).click();
  await page
    .getByRole("button", { name: "Long rectangle furniture name — 100 × 60 cm" })
    .click();

  const rectanglePlacement = page
    .locator("div[data-furniture-placement-id]")
    .last();
  const rectangleLabelBounds = await rectanglePlacement.evaluate((element) => {
    const text = element.querySelector<SVGTextElement>("svg text");
    const path = element.querySelector<SVGPathElement>("svg > path[d]");

    if (!text || !path) {
      throw new Error(
        `The rectangle shape or its label is missing (text: ${Boolean(text)}, path: ${Boolean(path)}).`,
      );
    }

    const textBounds = text.getBoundingClientRect();
    const shapeBounds = path.getBoundingClientRect();

    return {
      labelLeft: textBounds.left,
      labelRight: textBounds.right,
      labelTop: textBounds.top,
      labelBottom: textBounds.bottom,
      shapeLeft: shapeBounds.left,
      shapeRight: shapeBounds.right,
      shapeTop: shapeBounds.top,
      shapeBottom: shapeBounds.bottom,
      clipPath: text.getAttribute("clip-path"),
      textLength: text.getAttribute("textLength"),
      lengthAdjust: text.getAttribute("lengthAdjust"),
      fontSize: getComputedStyle(text).fontSize,
      scale: text.getAttribute("data-label-scale"),
      transform: text.getAttribute("transform"),
    };
  });

  expect(rectangleLabelBounds.clipPath).toBeNull();
  expect(rectangleLabelBounds.textLength).toBeNull();
  expect(rectangleLabelBounds.lengthAdjust).toBeNull();
  expect(rectangleLabelBounds.fontSize).toBe("24px");
  const labelScale = Number(rectangleLabelBounds.scale);
  expect(labelScale).toBeGreaterThan(0);
  expect(labelScale).toBeLessThan(1);
  expect(rectangleLabelBounds.transform).toContain(
    `scale(${labelScale})`,
  );
});

test("phone layout exposes planner panels and supports canvas gestures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const panelNavigation = page.getByRole("navigation", {
    name: "Planner panels",
  });
  await expect(panelNavigation).toBeVisible();
  await expect(page.locator("main")).toHaveCSS("display", "flex");
  await expect(panelNavigation).toHaveCSS("display", "grid");
  await page.getByRole("button", { name: "Rooms", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rooms" })).toBeVisible();
  await page.getByRole("button", { name: "Add room" }).click();
  await expect(page.getByRole("heading", { name: "Room Creator" })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.getByLabel("Room name").fill("Phone room");
  for (const label of ["Width (cm)", "Length (cm)"]) {
    const dimension = page.getByLabel(label);
    await dimension.focus();
    await expect
      .poll(() =>
        dimension.evaluate(
          (element) => {
            const input = element as HTMLInputElement;
            return (
              input.selectionStart === 0 &&
              input.selectionEnd === input.value.length
            );
          },
        ),
      )
      .toBe(true);
  }
  await page.getByRole("button", { name: "Add right triangle" }).click();
  await expect(page.getByTestId("shape-component")).toHaveCount(2);
  const creatorFields = page
    .getByTestId("shape-composition-work-area")
    .locator("> div")
    .first();
  const shapeActions = page.getByTestId("shape-actions");
  const creatorCanvas = page.getByTestId("shape-composition-canvas");
  await creatorFields.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const fieldBounds = await creatorFields.boundingBox();
  const actionBounds = await shapeActions.boundingBox();
  const creatorCanvasBounds = await creatorCanvas.boundingBox();
  expect(fieldBounds).not.toBeNull();
  expect(actionBounds).not.toBeNull();
  expect(creatorCanvasBounds).not.toBeNull();
  if (!fieldBounds || !actionBounds || !creatorCanvasBounds) {
    throw new Error("The mobile creator controls or preview are not visible.");
  }
  expect(actionBounds.y).toBeGreaterThanOrEqual(fieldBounds.y);
  expect(actionBounds.y + actionBounds.height).toBeLessThanOrEqual(
    fieldBounds.y + fieldBounds.height,
  );
  expect(creatorCanvasBounds.y).toBeGreaterThanOrEqual(
    fieldBounds.y + fieldBounds.height,
  );
  await page
    .getByRole("button", { name: "Rotate selected shape clockwise" })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();

  const hasHorizontalOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(await hasHorizontalOverflow()).toBe(false);
  await expect(page.getByTestId("floor-plan-canvas")).toBeVisible();

  const floorPlanCanvas = page.getByTestId("floor-plan-canvas");
  const floorPlanContents = page.getByTestId("floor-plan-contents");
  const transformBeforePan = await floorPlanContents.evaluate(
    (element) => element.style.transform,
  );
  await floorPlanCanvas.evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dispatch = (type: string, clientX: number, clientY: number) => {
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 1,
          pointerType: "touch",
          clientX,
          clientY,
          isPrimary: true,
        }),
      );
    };

    dispatch("pointerdown", rect.left + 20, rect.top + 20);
    dispatch("pointermove", rect.left + 50, rect.top + 35);
    dispatch("pointerup", rect.left + 50, rect.top + 35);
  });
  const transformAfterPan = await floorPlanContents.evaluate(
    (element) => element.style.transform,
  );
  expect(transformAfterPan).not.toBe(transformBeforePan);

  const scaleBeforePinch = await page
    .getByTestId("floor-plan-contents")
    .evaluate((element) => {
      const match = element.style.transform.match(/scale\(([^)]+)\)/);
      return match ? Number(match[1]) : 0;
    });

  await floorPlanCanvas.evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dispatch = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) => {
      canvas.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: "touch",
          clientX,
          clientY,
          isPrimary: pointerId === 1,
        }),
      );
    };

    dispatch("pointerdown", 1, rect.left + 20, rect.top + 20);
    dispatch("pointermove", 1, rect.left + 50, rect.top + 35);
    dispatch("pointerup", 1, rect.left + 50, rect.top + 35);
    dispatch("pointerdown", 2, rect.left + 20, rect.top + 20);
    dispatch("pointerdown", 3, rect.left + 70, rect.top + 20);
    dispatch("pointermove", 3, rect.left + 120, rect.top + 20);
    dispatch("pointerup", 3, rect.left + 120, rect.top + 20);
    dispatch("pointerup", 2, rect.left + 20, rect.top + 20);
  });

  const scaleAfterPinch = await page
    .getByTestId("floor-plan-contents")
    .evaluate((element) => {
      const match = element.style.transform.match(/scale\(([^)]+)\)/);
      return match ? Number(match[1]) : 0;
    });
  expect(scaleAfterPinch).toBeGreaterThan(scaleBeforePinch);

  await page.getByRole("button", { name: "Rooms", exact: true }).click();
  await page.getByRole("button", { name: "Phone room", exact: true }).click();
  await expect(page.getByTestId("room-designer-canvas")).toBeVisible();
  expect(await hasHorizontalOverflow()).toBe(false);
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await page.getByRole("button", { name: "Add door" }).click();
  await page.getByRole("button", { name: "Door", exact: true }).click();
  for (const label of ["Width (cm)", "Offset (cm)"]) {
    const dimension = page.getByLabel(label).last();
    await dimension.focus();
    await expect
      .poll(() =>
        dimension.evaluate((element) => {
          const input = element as HTMLInputElement;
          return (
            input.selectionStart === 0 &&
            input.selectionEnd === input.value.length
          );
        }),
      )
      .toBe(true);
  }
  await page.getByRole("button", { name: "Add window" }).click();
  await page.getByRole("button", { name: "Window", exact: true }).click();
  const windowWidth = page.getByLabel("Width (cm)").last();
  await windowWidth.focus();
  await expect
    .poll(() =>
      windowWidth.evaluate((element) => {
        const input = element as HTMLInputElement;
        return input.selectionStart === 0 && input.selectionEnd === input.value.length;
      }),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await page.getByRole("button", { name: "Create furniture template" }).click();
  await expect(
    page.getByRole("heading", { name: "Furniture Creator" }),
  ).toBeVisible();
  expect(await hasHorizontalOverflow()).toBe(false);

  await page.getByLabel("Template Name").fill("Phone chair");
  await page
    .getByTestId("shape-composition-creator")
    .getByRole("button", { name: "Save" })
    .click();
  await page.getByRole("button", { name: "Rooms", exact: true }).click();
  await page.getByRole("button", { name: "Phone room", exact: true }).click();
  await page.getByRole("button", {
    name: "Phone chair — 100 × 60 cm",
  }).click();

  await page.getByRole("button", { name: "Details", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Room details" })).toBeVisible();
  await page
    .getByRole("button", { name: "Phone chair 1", exact: true })
    .click();
  for (const label of ["Width (cm)", "Length (cm)", "Rotation (degrees)"]) {
    const dimension = page.getByLabel(label).last();
    await dimension.focus();
    await expect
      .poll(() =>
        dimension.evaluate((element) => {
          const input = element as HTMLInputElement;
          return (
            input.selectionStart === 0 &&
            input.selectionEnd === input.value.length
          );
        }),
      )
      .toBe(true);
  }
});
