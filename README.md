# Flat Planner

A browser-based floor-plan editor built with Next.js, React, and TypeScript.

## Development

Install dependencies with pnpm, then run:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `app/` contains the Next.js routes, root layout, and global styles.
- `app/planner/` contains the planner feature:
  - `FlatPlanner.tsx` composes the editor and coordinates its state.
  - `components/` groups UI by role: `canvas/`, `forms/`, `panels/`, and `views/`.
    Component-owned styles live beside their components as CSS Modules; shared planner and cross-component styles remain in `FlatPlanner.module.css`.
  - `hooks/` contains editor interaction and state hooks grouped by responsibility.
  - `geometry/` contains geometry, snapping, and viewport calculations, with their tests in `geometry/__tests__/`.
  - `persistence/` contains planner data validation, serialization, storage, and export helpers, with tests in `persistence/__tests__/`.
  - `types.ts` defines planner-wide data types; `FlatPlanner.module.css` contains shared planner styles.
- `public/` contains static assets.

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

The browser tests start the Next.js development server on port 3100 and use an
isolated browser context.

## Deployment

The GitHub Actions workflow deploys a static export to GitHub Pages whenever
changes are pushed to `main`. In the repository settings, set **Pages >
Build and deployment > Source** to **GitHub Actions**. After the first
successful workflow run, the app is available at
<https://theasolit.github.io/flat-planner/>.

The export is configured only in GitHub Actions; local development and
production builds retain the normal Next.js behavior. Planner data is stored in
the browser's local storage and is not synchronized between browsers.
