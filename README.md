# SignFlow ASL

Learn American Sign Language with interactive 3D hands, structured lessons, camera practice, and spaced repetition.

## Features

- **3D Hand Models** — Orbit, zoom, and scrub through signs; inspect handshape and palm orientation from any angle
- **Fingerspelling** — All 26 letters (A–Z) and numbers 0–9 with anatomically structured hand rigs
- **Dictionary** — 50+ signs searchable by English, category, and handshape
- **Lessons** — 3 structured modules (Alphabet, Greetings, Numbers) with receptive quizzes and expressive practice
- **Camera Practice** — MediaPipe hand tracking with conservative pose feedback
- **Spaced Repetition** — Per-sign mastery tracking and review queue (IndexedDB)
- **PWA** — Offline-capable after first load

## Tech Stack

- React 19 + TypeScript + Vite
- React Three Fiber + drei + Three.js
- MediaPipe Hand Landmarker (Web Worker)
- Dexie (IndexedDB)
- Tailwind CSS 4
- Zustand + TanStack Query

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
apps/web/           # React application
packages/sign-schema/  # Shared Zod schemas & types
content/            # Content authoring (future Blender exports)
```

## License

Educational demo. Hand models are procedurally generated for this project.

## Deploy to Entangleit.com/ASLTutor

The app is configured for subpath hosting at **`/ASLTutor/`**.

```bash
# Verify build
./scripts/verify-subpath-build.sh

# Merge into your Entangleit.com Cloudflare Pages publish directory
./scripts/prepare-entangleit-deploy.sh /path/to/entangleit-site/public

# Deploy (requires Cloudflare API token)
npx wrangler pages deploy /path/to/entangleit-site/public --project-name=entangleit
```

See [deploy/CLOUDFLARE.md](deploy/CLOUDFLARE.md) for full instructions.
