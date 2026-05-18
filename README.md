# Crowd Cannon Clash

A mobile-first hypercasual crowd-cannon/multiplier-gate game built for Vite + TypeScript with Three.js rendering, GSAP UI/game-feel animation, lightweight Cannon physics hooks, WebAudio sound effects, local persistence, monetization stubs, analytics events, pooled VFX, and PWA metadata.

## Gameplay

- Aimable cannon combat with smooth swipe/mouse steering.
- Multiplier, rapid-fire, giant-mob, and bonus gates transform individual mobs in real time.
- Gate passes trigger frame punches, camera shake, reward toasts, sounds, and pooled particles.
- Enemy mobs, destructible blocks, and a rival base create the battle/destruction/reward beat.
- Coins persist in `localStorage` and feed cannon upgrade progression.

## Architecture

The source follows a production-oriented manager layout:

- `src/game` - scene and game-loop orchestration.
- `src/managers` - save, input, camera, ads, analytics, and object pooling.
- `src/ui` - HTML/CSS overlay state and GSAP transitions.
- `src/audio` - lazy WebAudio sound synthesis.
- `src/levels` - procedural hybrid level generation.
- `src/effects` - pooled particle bursts.
- `src/entities` - player entity and realtime transformations.

## Performance notes

- Dynamic DPR caps for mobile clarity without excessive fill cost.
- No post-processing; lighting uses hemisphere + directional lights.
- Reused primitive geometries/materials and pooled particles.
- Delta-time loop with capped steps to avoid large-frame jumps.
- Cannon-es is initialized for lightweight physics hooks while crowd combat uses deterministic low-GC distance checks for mobile stability.

## Commands

```bash
npm install
npm run dev
npm run build
```

> In restricted CI/agent environments, package installation may fail if registry access is blocked. The project is otherwise configured for a normal Vite workflow.
