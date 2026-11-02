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
