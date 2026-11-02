import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("locked flat keeps furniture editable and saves the room and placements", async ({
  page,
}) => {
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
  await expect(page.getByRole("button", { name: "Add circle" })).toBeVisible();
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
  await expect(page.getByRole("status")).toContainText(
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
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved in this browser");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  const download = await downloadPromise;
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
  await page.mouse.down();
  await page.mouse.move(
    furnitureBox.x + furnitureBox.width * 0.25 + 50,
    furnitureBox.y + furnitureBox.height * 0.75 + 30,
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
