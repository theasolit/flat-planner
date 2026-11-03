# Flat Planner

Flat Planner is a browser-based tool for sketching a flat layout, designing rooms, and trying out furniture arrangements. Measurements are entered in centimetres, and your plan can be saved in the browser or exported as a JSON file.

Open the app at [the Flat Planner website](https://theasolit.github.io/flat-planner/).

## Using the planner

1. **Create rooms.** Use **Add room**, give the room a name and dimensions, then build its outline from rectangles, right triangles, and circular sectors. Set each sector's radius and included angle. Shapes can be rotated, mirrored, and removed while editing.
2. **Arrange the floor plan.** Select a room to edit its details and position it in the overall plan. Add doors and windows to room walls, adjust wall thickness, and use the zoom controls or **Fit to view** to navigate the plan.
3. **Try furniture layouts.** In a room, create furniture templates, assign them to one or more rooms and custom categories, and add them to the plan. Use the catalog controls to group templates by room or category; unassigned templates stay available in every room. Manage the shared category list from the catalog. Changes to a template also update its existing placements. Arrange placements in the room and lock individual pieces when you want to keep them in place.
4. **Save or transfer your plan.** Your plan is automatically saved in this browser as you work. Use **Save now** to save immediately, **Save file** to choose a filename and save location for a JSON copy, or **Import** to load a previously saved plan.

Use **Undo** and **Redo** in the header to recover recent layout edits, or use **Ctrl+Z** / **Ctrl+Y** (on Mac, **Command+Z** / **Command+Y**). Consecutive edits and drags are grouped into a single history step. History is kept in memory and resets when you import a plan or reload the page.

You can lock the flat to protect its room layout while continuing to work with furniture. Unlock it when you need to make structural edits again.

On a phone, use the **Plan**, **Rooms**, and **Details** tabs to switch between the canvas and its controls. Drag an empty part of the canvas to pan, pinch to zoom, or use the on-screen zoom controls. Room, furniture, and opening elements remain directly draggable.

## Data and storage

Plans are automatically stored in the browser's local storage after edits. Autosave runs shortly after changes settle and its status is shown in the header. Plans are not synchronized between browsers or devices. Use **Save file** to create a portable JSON backup or move a plan to another browser. Browsers without a native save-file picker download the file using the chosen name to their configured downloads location.

## Run locally

Install dependencies with pnpm, then start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
pnpm test
pnpm lint
pnpm build
```

## Browser tests

Install Playwright's Chromium browser once, then run the end-to-end tests:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The browser tests start the Next.js development server on port 3100 and use an isolated browser context.

## Deployment

The GitHub Actions workflow deploys a static export to GitHub Pages whenever changes are pushed to `main`. In the repository settings, set **Pages > Build and deployment > Source** to **GitHub Actions**. After the first successful workflow run, the app is available at <https://theasolit.github.io/flat-planner/>.

The export is configured only in GitHub Actions; local development and production builds retain the normal Next.js behavior.
