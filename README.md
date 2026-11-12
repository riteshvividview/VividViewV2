# VividViewV2

The Vivid View agency homepage built with Next.js, React, Three.js, GSAP and Lenis.

## Run

Requires Node.js 20.9 or newer. Run `npm ci`, then `npm run dev` and open http://localhost:3000. For production: `npm run build`, then `npm start`.

## Homepage

- Scroll-driven four-flap box, live glass liquid and sculpture dissolve.
- Ten real client projects in an asymmetric gallery with uncropped, naturally sized images.
- Seven service accordions, team information and verified project stories.
- Responsive layouts and reduced-motion fallbacks.
- Downloadable project brief and email-draft handoff; no backend email delivery is configured.

Edit agency copy and project links in `components/agencyContent.ts`, controls in `components/Home.tsx`, choreography in `components/journey/useJourney.ts`, and layout in `app/journey.css`.

The liquid uses procedural volumetric geometry, not a video texture or full fluid physics solver. Reference videos, archived experiments, local recovery snapshots and screenshots are excluded. Credits and licenses are in `ASSETS.md`; image provenance is in `docs/agency-asset-manifest.json`.

## Verification

Run `npm run build`, install Chromium with `npx playwright install chromium`, and start a preview with `npm start -- --port 3001`. In another terminal run:

```sh
node scripts/check-agency-integration.mjs
node scripts/check-volumetric-liquid.mjs
```

Checks cover homepage controls, responsive layout, sculpture dissolve, liquid geometry and hover recovery. Browser checks use Chromium with D3D11 on Windows.
