# IronLog — Implementation Plan

## Phase 1 — Project Foundation

- [x] Initialize Next.js (App Router + TypeScript)
- [x] Configure PWA setup
- [x] Setup folder architecture
- [x] Setup design system tokens
- [x] Setup global layout + navigation shell

---

## Phase 2 — Local Data Layer

- [x] Setup Dexie.js IndexedDB schema
- [x] Implement models:
  - [x] workouts
  - [x] exercises
  - [x] sets
  - [x] bodyweight entries
  - [x] PRs
  - [x] photos
- [x] Build repository layer abstraction
- [x] Add basic CRUD operations

---

## Phase 3 — Workout System (CORE)

- [x] Workout creation flow
- [x] Exercise picker (muscle group filter)
- [x] Set logging UI (fast input optimized)
- [x] Template system
- [x] Save + edit workouts
- [x] PR detection engine

---

## Phase 4 — Dashboard

- [x] Streak calculation
- [x] Bodyweight trend chart
- [x] PR highlights widget
- [x] Recent workouts widget
- [x] Latest photo preview

---

## Phase 5 — Timeline System

- [x] Unified event feed (workouts, PRs, weight, photos)
- [x] Filtering system
- [x] Infinite scroll
- [x] Detail views per event type

---

## Phase 6 — Exercise Database

- [x] Bundled exercise dataset
- [x] Muscle group categorization
- [x] Image integration (illustrations)
- [x] Custom exercise creation

---

## Phase 7 — Photo System

- [x] Camera capture (getUserMedia)
- [x] 3-2-1 countdown
- [x] Pose overlay system (ghost image)
- [x] Photo storage (WebP compression)
- [x] Comparison slider view
- [x] Gallery timeline

---


## Phase 8 — Export / Import

- [x] JSON export generator
- [x] ZIP packaging (encrypted)
- [x] Import restoration pipeline
- [x] Versioned schema support

## Export / Import System

- [ ] Backup manifest schema
- [ ] ZIP packaging system
- [ ] AES-GCM encryption pipeline
- [ ] Password-derived key generation
- [ ] File export API
- [ ] File import picker
- [ ] Backup validation
- [ ] Schema migration system
- [ ] Restore pipeline
- [ ] Derived-data regeneration

---

## Phase 9 — Security Layer

- [x] WebAuthn login (Face ID / Touch ID)
- [x] AES-GCM encryption wrapper
- [x] Key derivation system

---

## Phase 10 — Polish

- [x] Performance optimization (static export, lazy photo decode, light bundles)
- [x] Offline validation (service worker + offline fallback page)
- [x] UI consistency pass (Apple design tokens across all surfaces)
- [x] Animation refinement (subtle only — scale-down press, sheet slide)
- [x] iPhone PWA UX tuning (safe-area insets, frosted bars, one-handed reach)

---

## Phase 11 — Future Hooks (DO NOT IMPLEMENT)

> Architected and surfaced as disabled in Settings → "Coming soon". Not wired.

- [~] Cloud sync interface layer (placeholder, disabled)
- [~] Apple Health integration adapter (placeholder, disabled)

---

## Build status

- `npx tsc --noEmit` — clean
- `npx next build` — succeeds (13 routes, full static export to `out/`)

Legend: `[x]` done · `[~]` architected/disabled per spec · `[ ]` not started


use the newest version of everything, add more functions, better design like animations and apple hhealth glasmorphism and effects, new day opening register like iphone from down slide etc. add user-flows.md, export import system make it better, 
