# AGENTS.md

## Cursor Cloud specific instructions

SignFlow ASL is a **frontend-only** npm-workspaces monorepo (React 19 + Vite + TypeScript). There is **no backend, database, or containerized service** — all state is persisted client-side in the browser (IndexedDB via Dexie). The only local service is the Vite dev server. Standard commands live in `README.md` and the root `package.json` scripts (`dev`, `build`, `lint`, `typecheck`).

Non-obvious notes for developing here:

- The dev server (`npm run dev`) serves the app under the subpath `http://localhost:5173/ASLTutor/`. The base path `/ASLTutor/` is hard-coded in `apps/web/vite.config.ts`, so the bare root `http://localhost:5173/` returns 404 in dev — always use the `/ASLTutor/` URL.
- `apps/web` imports the `@asl/sign-schema` workspace package via its built `dist/` output (see `packages/sign-schema/package.json` `main`/`types`). A standalone `npm run typecheck` (or `npm run build`) at the repo root fails with `Cannot find module '@asl/sign-schema'` until that package has been built at least once. The root `npm run build` builds `sign-schema` first and fixes this; if you only want to typecheck, run `npm run build -w @asl/sign-schema` first (or just `npm run build`).
- The **Camera Practice** page (MediaPipe Hand Landmarker) downloads WASM/model assets from third-party CDNs (jsDelivr, Google Cloud Storage) and needs a webcam. Without network access to those CDNs or a camera it surfaces a `ModuleFactory not set.` error. This feature is optional; the rest of the app (3D hands, dictionary, lessons, spaced-repetition progress) works fully offline/locally.
