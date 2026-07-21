# Projection Map Preview

Single-page Vite + React Three Fiber app for testing image or video content on a projection-mapped GLB room model.

## Features

- Client-only image or video media selection for projection textures.
- Fixed `240_west_37th_projection.glb` room model served from `public/`.
- R3F `OrbitControls` for orbit, pan, and zoom.
- Light mode for white walls/floors and dark mode for a moody reflective room.
- UV offset, repeat, rotation, and brightness controls.
- Built-in demo 360 room with segmented projection planes.
- Furniture and plant toggles with quick layout presets.
- SCSS styles using BEM-style blocks: `projection-app`, `projection-controls`, and `projection-status`.

## Model Naming

Export projection meshes from Blender with names that include words like `projection`, `screen`, `plane`, `surface`, `video`, `mapped`, `canvas`, or `display` so the app can automatically apply the video material to them.

Furniture and plant visibility is inferred from mesh names containing common terms like `sofa`, `chair`, `table`, `bench`, `plant`, `tree`, or `foliage`.

## Development

```bash
npm install
npm run dev
```

The local dev server defaults to `http://127.0.0.1:5173/`, or the next available Vite port.

## Verification

```bash
npm run build
npm run verify:render -- http://127.0.0.1:5176/
```

The render check samples desktop and mobile canvases, tests OrbitControls movement, checks light/dark rendering, and confirms there is no page-level scroll.

## GitHub Pages

The GitHub Pages workflow is in `.github/workflows/deploy.yml`. It builds `dist/` with Vite and deploys via GitHub Pages when changes are pushed to `main`, or manually through `workflow_dispatch`.
