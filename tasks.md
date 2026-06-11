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

## Phase 12 — Leaderboard & Social System

### 12.1 — Supabase Project Setup
- [x] Create Supabase project and obtain URL + anon key
- [x] Add Supabase env vars to `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [x] Install `@supabase/supabase-js`
- [x] Create `src/lib/supabase.ts` — typed Supabase client singleton

### 12.2 — Database Schema (Supabase / Postgres)
- [x] Create `profiles` table with RLS
- [x] Create `friendships` table with RLS
- [x] Friend code embedded as column in `profiles`, auto-generated via trigger
- [x] Create `leaderboard_snapshots` table with RLS
- [x] Create `synced_prs` table with RLS
- [x] Create `synced_workouts` table with RLS
- [x] Create `synced_bodyweight` table with RLS
- [x] Row Level Security policies on all tables
- [x] Postgres trigger for auto friend code generation
- [ ] Run `supabase/migration.sql` in Supabase SQL editor (manual step — needs your Supabase project)

### 12.3 — Authentication
- [ ] Enable Email/Password auth in Supabase dashboard (manual)
- [ ] Enable Google OAuth provider in Supabase dashboard (manual)
- [x] Create `src/app/auth/register/page.tsx` — email, password, username, gym location
- [x] Create `src/app/auth/login/page.tsx` — email/password + Google button
- [x] Create `src/app/auth/callback/page.tsx` — PKCE OAuth code exchange
- [x] Create `src/context/AuthContext.tsx` — global auth state provider
- [x] Wrap layout in `AuthProvider`
- [x] Create `src/lib/auth.ts` — `signIn`, `signUp`, `signOut`, `getProfile`, `uploadAvatar`

### 12.4 — User Profile
- [x] Create `src/app/profile/page.tsx` — avatar, username, gym location, XP stats, visibility toggle
- [x] Avatar picker — 16 preset emojis + photo upload to Supabase Storage
- [x] Profile edit sheet — username, display name, gym location
- [x] Leaderboard visibility toggle (opt-in, default off)
- [x] Friend code display with copy button
- [x] Auto-generate friend code via Postgres trigger on profile insert

### 12.5 — Data Sync Engine
- [x] Create `src/lib/sync.ts` — `syncAll()` orchestrator
- [x] `syncWorkouts()` — upserts completed workouts with volume
- [x] `syncPRs()` — upserts all PRs
- [x] `syncBodyweight()` — upserts bodyweight entries
- [x] `recalculateSnapshot()` — computes XP + recomp + PR highlights client-side, upserts snapshot
- [x] "Sync now" button on profile page with last-sync timestamp
- [ ] Auto-sync after workout save (wire up in active workout page — next iteration)

### 12.6 — XP Engine
- [x] XP formula: +10/workout, +50/PR, +25/7-day streak, +100/30-day streak, +recomp pts
- [x] Recomp score: bodyweight delta × 10 (capped 200) + PR improvement bonus (capped 100)
- [x] Computed client-side in `sync.ts` and stored in `leaderboard_snapshots`

### 12.7 — Leaderboard Page
- [x] Create `src/app/leaderboard/page.tsx` — Global / Friends tab switcher
- [x] Category chips: XP Score | Top PRs | Recomp
- [x] `LeaderboardRow` — rank medal, avatar, username, gym location, metric value
- [x] Highlights current user's row in primary tint
- [x] Sticky "your rank" bar when outside top 100 (global tab)
- [x] Opt-in banner → links to profile for users who haven't gone public
- [x] "Join leaderboard" gate for logged-out users with register/login CTAs
- [x] Empty states for both tabs
- [x] "Rank" tab added to TabBar with trophy icon

### 12.8 — Friends System
- [x] Create `src/app/friends/page.tsx`
- [x] Search by username + send request
- [x] Add by 8-char friend code
- [x] Accept / reject incoming requests
- [x] Remove existing friend
- [x] Pending requests section
- [x] Friends list with avatar, username, gym location

### 12.9 — UI Polish & Integration
- [x] "Rank" tab in TabBar (trophy icon), matches auth/profile/friends routes
- [x] "Join Leaderboard" CTA on leaderboard page for logged-out users
- [x] XP stats grid on profile page (XP, workouts, streak, recomp)
- [x] Leaderboard rows animate on load (enter-up)
- [x] Loading spinner states on all async views
- [x] All new pages follow Apple design token system
- [x] Toggle switch, avatar grid, opt-in banner — all new CSS added to globals.css
- [ ] Add "Join Leaderboard" CTA widget to main dashboard (next iteration)

### 12.10 — Testing & Validation
- [x] Build passes: `npx next build` — 19 routes, all static, zero TS errors
- [ ] Test registration + Google OAuth flow end to end (needs live Supabase project)
- [ ] Test sync: log workout → sync → verify in Supabase
- [ ] Test RLS: user A cannot read user B's private data
- [ ] Test friend request flow end to end
- [ ] Test opt-in toggle hides user from leaderboard

---

## Build status

- `npx tsc --noEmit` — clean
- `npx next build` — succeeds (13 routes, full static export to `out/`)

Legend: `[x]` done · `[~]` architected/disabled per spec · `[ ]` not started


An Aura GYM verkaufen: website full umbranden zu aura gym tracker und nacher das vorschlagen gehen, neue funktionen zulassen wie standort festlegen etc. für bestimmte standorte bestimme geräte haben und welche nicht.

zu aura gym hingehen manager holen fragen ob er app kurz anschauen könnte und nacher sagen dass ichs gratis mache weil ich bei aura gym traniere oder für 3-12 monate gratis abo.
