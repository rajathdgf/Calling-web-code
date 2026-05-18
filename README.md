# Turbo Forge Run

A mobile-first hypercasual runner/collector/modifier game built for Vite + TypeScript with Three.js rendering, GSAP UI/game-feel animation, lightweight Cannon physics hooks, WebAudio sound effects, local persistence, monetization stubs, analytics events, pooled VFX, and PWA metadata.

## Gameplay

- Auto-forward runner with smooth swipe/mouse lateral control.
- Modifier gates update Speed, Power, Size, and Multiplier in real time.
- Gate passes trigger color flashes, scale punches, camera shake, number toasts, sounds, and pooled particles.
- Obstacles and finish vault blocks create a destruction/reward beat.
- Coins persist in `localStorage` and feed the upgrade loop.

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
- Physics is initialized but intentionally kept lightweight; collisions are simple distance checks for mobile stability.

## Commands

```bash
npm install
npm run dev
npm run build
```

> In restricted CI/agent environments, package installation may fail if registry access is blocked. The project is otherwise configured for a normal Vite workflow.
