# IronLog — Complete Agent Briefing

This file is the single source of truth for any Claude agent working on this repo.
Read this instead of reading the source files cold. Kept current as of 2026-06-11.

---

## What is IronLog?

A **local-first PWA gym tracker** with social/competitive features.
Users log workouts offline (IndexedDB via Dexie); an optional Supabase account
syncs stats to the cloud for the leaderboard and friend system.
No account is required to use the core workout tracking.

**Live URL:** `https://gym.slideagentur.ch`
**Dev URL:** `http://localhost:3000`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1.6, App Router, `"use client"` throughout |
| Language | TypeScript (strict) |
| Styling | Single global CSS file (`src/app/globals.css`) — no CSS modules, no Tailwind |
| Local DB | Dexie (IndexedDB wrapper) |
| Remote DB / Auth | Supabase (PKCE flow) |
| State | React context (`AuthContext`, `AppProvider`) + Dexie live queries |
| Package manager | npm |
| Platform | Windows 11, PowerShell |

---

## Directory Structure

```
ironlog/
├── src/
│   ├── app/
│   │   ├── page.tsx                  ← Dashboard (root "/")
│   │   ├── layout.tsx                ← Root layout: AuthProvider > AppProvider > LockGate > TabBar
│   │   ├── globals.css               ← ALL styles (design system + page styles)
│   │   ├── welcome/page.tsx          ← Onboarding wizard (first thing unauthenticated users see)
│   │   ├── auth/
│   │   │   ├── callback/page.tsx     ← OAuth PKCE code exchange
│   │   │   └── login/page.tsx        ← Fallback login page
│   │   ├── workout/
│   │   │   ├── page.tsx              ← Workout list + template picker
│   │   │   ├── active/page.tsx       ← Live workout tracker
│   │   │   └── view/page.tsx         ← Completed workout detail
│   │   ├── timeline/page.tsx
│   │   ├── body/page.tsx             ← Bodyweight log + chart
│   │   ├── photos/page.tsx           ← Progress photos
│   │   ├── leaderboard/page.tsx      ← Global / friends leaderboard
│   │   ├── friends/page.tsx          ← Friend requests + list
│   │   ├── profile/page.tsx          ← User profile + avatar + sync
│   │   └── settings/page.tsx
│   ├── components/
│   │   ├── AppProvider.tsx           ← Settings, theme, toast, DB seed
│   │   ├── AuthContext.tsx           ← user, profile, authReady, refreshProfile
│   │   ├── LockGate.tsx              ← Biometric lock screen (WebAuthn)
│   │   ├── TabBar.tsx                ← Bottom nav (hidden on /welcome and /auth/*)
│   │   ├── TopBar.tsx                ← Page header with optional back/right
│   │   ├── Icons.tsx                 ← All SVG icons (SF-style, 24px, currentColor)
│   │   ├── Sheet.tsx                 ← Bottom sheet modal
│   │   ├── ActivityRing.tsx          ← Single SVG ring (used on dashboard)
│   │   ├── AnimatedNumber.tsx        ← Counting number animation
│   │   ├── LineChart.tsx             ← Bodyweight trend chart
│   │   ├── ExercisePicker.tsx        ← Exercise search sheet
│   │   ├── MuscleIllustration.tsx    ← Muscle group badge
│   │   ├── Camera.tsx                ← Photo capture
│   │   └── ServiceWorker.tsx         ← PWA SW registration
│   ├── context/
│   │   └── AuthContext.tsx           ← Same as components/AuthContext.tsx (one file)
│   ├── lib/
│   │   ├── supabase.ts               ← Supabase client + TypeScript interfaces
│   │   ├── auth.ts                   ← Auth helpers (signIn, signUp, Google, uploadAvatar)
│   │   ├── sync.ts                   ← Push local data → Supabase, recalculate XP snapshot
│   │   ├── db.ts                     ← Dexie schema
│   │   ├── repo.ts                   ← All local DB operations
│   │   ├── utils.ts                  ← Formatters, unit conversion, uid()
│   │   └── webauthn.ts               ← Biometric credential helpers
│   ├── data/
│   │   └── exercises.ts              ← Bundled exercise list (seeded on first run)
│   └── types/
│       └── index.ts                  ← Workout, Exercise, WorkoutSet, Settings, etc.
├── public/
│   ├── manifest.json                 ← PWA manifest
│   └── sw.js                         ← Service worker
├── supabase/                         ← Supabase migrations / schema SQL
├── DESIGN.md                         ← Apple design reference doc
├── user-flows.md                     ← All user flows documented
└── CLAUDE.md                         ← This file
```

---

## Design System

### Philosophy
Apple Health aesthetic: **black canvas, white text, single blue accent `#0a84ff` (dark) / `#0066cc` (light), triple activity rings (red/green/cyan), SF Pro fonts, spring animations**.

### CSS Variables (globals.css :root)

Light mode defaults — dark mode overrides via `@media (prefers-color-scheme: dark)`.
Forced overrides via `[data-theme="light"]` / `[data-theme="dark"]` on `<html>`.

```css
/* Accent */
--primary: #0066cc (light) / #0a84ff (dark)
--primary-tint: rgba(0,102,204,0.1) / rgba(10,132,255,0.18)
--primary-focus: #0071e3 / #409cff

/* Surfaces */
--canvas: #f2f2f7 / #000000        /* page background */
--canvas-2: #ffffff / #1c1c1e
--surface-elevated: #ffffff / #1c1c1e   /* cards */
--surface-raised: #ffffff / #2c2c2e
--surface-chip: rgba(120,120,128,0.12) / rgba(120,120,128,0.24)

/* Text */
--ink: #1c1c1e / #ffffff
--ink-muted-48: #8a8a8e / #98989f    /* secondaryLabel */
--ink-muted-30: #c4c4c8 / #5b5b60   /* tertiaryLabel */

/* Ring colors (Apple Health) */
--ring-move: #ff375f     /* red — Move */
--ring-exercise: #a6ff00 /* lime — Exercise */
--ring-stand: #00e5ff    /* cyan — Stand */

/* Motion */
--spring: cubic-bezier(0.32, 0.72, 0, 1)
--ease-out: cubic-bezier(0.22, 1, 0.36, 1)

/* Radii */
--r-sm: 9px  --r-md: 12px  --r-lg: 20px  --r-xl: 26px  --r-pill: 9999px

/* Spacing (8px system) */
--xs: 8px  --sm: 12px  --md: 16px  --lg: 22px  --xl: 32px
```

### Typography Classes

```
.t-hero          34px 700 -0.9px   (dashboard greeting)
.t-display       28px 700 -0.6px   (wizard headings)
.t-title         22px 700 -0.5px
.t-headline      17px 600 -0.43px  (list row titles)
.t-body          17px 400 -0.4px
.t-caption       14px 400          (muted)
.t-caption-strong 13px 600 uppercase (section headers)
.tnum / .t-mono-num   tabular-nums
.muted           color: var(--ink-muted-48)
.stat-value      large bold number display
```

### Button Classes

```
.btn                   base (inline-flex, spring transition)
.btn-primary           solid blue, white text
.btn-secondary         surface-elevated bg
.btn-ghost             subtle bg, border
.btn-text              no bg, uses --primary color
.btn-danger            red variant
.btn-block             width: 100%
```

### Layout Classes

```
.page              centered column, max-width 720px, padding: 0 var(--md)
.app-scroll        full-height scroll container (has tabbar bottom padding)
.card              white/elevated surface, --r-lg radius, shadow
.card-tap          adds hover/active states to card
.list-group        grouped iOS-style list container
.list-row          flex row inside list-group
.list-row-tap      tappable list row
.row               display:flex align-items:center
.col               display:flex flex-direction:column
.grow              flex:1
.gap-xs/sm/md/lg   gap shortcuts
.row-between       flex row justify-content:space-between
.segmented         iOS segmented control
.chip / .chip-active  filter chip
.input             styled text input
.toggle / .toggle-on  iOS-style toggle switch
.spinner / .spinner-sm  loading indicator
```

---

## Welcome Wizard (`src/app/welcome/page.tsx`)

### Entry Point Behavior

The root `/` page redirects to `/welcome` when:
- `authReady === true`
- `user === null`
- `localStorage["ironlog:welcomed"]` is NOT set

After the wizard is completed, skipped, or login succeeds, `localStorage.setItem("ironlog:welcomed", "1")` is stamped so the redirect never fires again for that browser.

### Steps

```
"splash" → "choose" → "register" → "avatar" → "done"
                    → Google OAuth (leaves app)
         → "login"
```

### Components Inside welcome/page.tsx

- `TripleRings` — Apple Health SVG rings, animated via stroke-dashoffset. Prop: `complete?: boolean` (all rings show tiny fill on done step).
- `ShareArrow` — iOS share icon SVG for install instructions.
- `GoogleIcon` — Google G logo SVG (multicolor paths).
- `WizBack` — Chevron back button, blue color.
- `WizDots` — Progress dot indicator (for steps: choose, register, avatar).
- `WizFeature({ icon, iconBg, text, sub })` — Feature row with colored icon bubble.

### Key State

```ts
type Step = "splash" | "choose" | "login" | "register" | "avatar" | "done"
type InstallPlatform = "ios" | "chrome" | null

// Colors for avatar selection
const COLOR_PRESETS = [
  "#FF375F","#FF6830","#FFD60A","#30D158",
  "#00C7BE","#0A84FF","#5E5CE6","#BF5AF2",
  "#FF2D55","#8E8E93","#A6FF00","#FF9F0A"
]
```

### Google OAuth (critical — do not break)

```ts
const redirectTo = `${window.location.origin}/auth/callback`  // NO trailing slash
signInWithGoogle(redirectTo)
```
The redirect URL must be registered EXACTLY in Supabase dashboard:
- Dev:  `http://localhost:3000/auth/callback`
- Prod: `https://gym.slideagentur.ch/auth/callback`

No trailing slash. A trailing slash silently breaks OAuth.

### PWA Install Detection

```ts
// iOS Safari: UA + not standalone + no CriOS/FxiOS
const isIos = /iPad|iPhone|iPod/.test(ua)
const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS/.test(ua)
// → setInstallPlatform("ios")

// Chrome/Android: beforeinstallprompt event
window.addEventListener("beforeinstallprompt", ...)
// → setInstallPlatform("chrome")
```

iOS shows manual 3-step sheet (Share → Add to Home Screen → Add).
Chrome shows a one-tap install button using the deferred prompt.

### CSS for Wizard (in globals.css)

All wizard styles live in the `.wiz-shell` section (~line 1185).

`.wiz-shell` is **always dark** regardless of system theme — it sets its own CSS variable
overrides locally (not on `:root`). This prevents any black-on-black flash from theme transitions.

```css
.wiz-shell {
  --canvas: #000000;
  --ink: #ffffff;
  --primary: #0a84ff;
  /* ... full dark token set ... */
  position: fixed; inset: 0; z-index: 100;
  background: var(--canvas);
  /* NO transition: background-color — causes black-on-black flash if added */
}
```

Key wizard CSS classes:
```
.wiz-step          full-height flex column, centered
.wiz-enter-forward / .wiz-enter-back   slide animations
.wiz-dots          progress indicator (fixed top)
.wiz-hero          centered heading block
.wiz-splash-top    rings + brand name
.wiz-headline      44px 800 brand name
.wiz-sub           subtitle text
.wiz-rings-wrap / .wiz-rings-svg   triple rings container
.wiz-features      feature list
.wiz-feature       glass feature row (rgba white bg + border)
.wiz-feature-icon  36x36 icon container
.wiz-actions       CTA button stack
.wiz-back          blue chevron back button
.wiz-choice-card   glass card (rgba bg + 0.5px border) — used for Create/Google options
.wiz-choice-badge  44x44 icon badge inside choice card
.wiz-choice-badge-blue   solid --primary bg
.wiz-choice-badge-white  rgba(255,255,255,0.14) bg
.wiz-input-group   label + input pair
.wiz-label         dim label above input
.wiz-error         red error message
.wiz-avatar-preview  circular avatar preview
.wiz-step-done     done step centering
.wiz-done-rings-wrap + .wiz-done-check   rings + checkmark overlay
```

---

## Auth System

### Files

- `src/lib/supabase.ts` — creates the Supabase client with PKCE flow:
  ```ts
  createClient(url, key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" } })
  ```
- `src/lib/auth.ts` — exports:
  - `getCurrentUser()` — `supabase.auth.getUser()`
  - `getProfile(userId)` — fetch from `profiles` table
  - `upsertProfile(userId, values)` — create/update profile row
  - `signInWithEmail(email, password)`
  - `signUpWithEmail(email, password, username, gymLocation?)` — creates auth user + profile row
  - `signInWithGoogle(redirectTo)` — OAuth, redirectTo must have NO trailing slash
  - `signOut()`
  - `uploadAvatar(userId, file)` — uploads to `avatars` Supabase storage bucket, returns public URL
- `src/context/AuthContext.tsx` — React context:
  ```ts
  interface AuthContextValue {
    user: User | null      // Supabase user
    profile: Profile | null // profiles table row
    authReady: boolean     // false until getSession() resolves
    refreshProfile: () => Promise<void>
  }
  ```
- `src/app/auth/callback/page.tsx` — PKCE exchange:
  1. Gets `?code=` from URL
  2. Calls `supabase.auth.exchangeCodeForSession(code)`
  3. If new Google user (no profile row): creates profile, redirects `/profile`
  4. Otherwise: redirects `/leaderboard`
  5. On error: redirects `/auth/login`

### Supabase Tables

```
profiles            id, username, display_name, gym_location, avatar_url, is_public, friend_code
leaderboard_snapshots  user_id, xp_total, pr_bench_kg, pr_squat_kg, pr_deadlift_kg, pr_ohp_kg,
                        recomp_score, workout_count, current_streak, updated_at
synced_workouts     user_id, local_id, date, title, duration_sec, total_volume_kg
synced_prs          user_id, local_id, exercise_name, type, value, weight_kg, reps, date
synced_bodyweight   user_id, local_id, date, weight_kg
friendships         id, requester_id, addressee_id, status("pending"|"accepted"|"rejected"), created_at
```

Supabase Storage bucket: `avatars` (public)

---

## Avatar System

Avatars are stored in `profiles.avatar_url` with a prefix convention:

| Value | Meaning |
|---|---|
| `color:#FF375F` | Colored circle with user's first initial |
| `https://...` | Actual image URL (uploaded to Supabase storage) |
| `emoji:🔥` | Legacy (deprecated, renders as blue circle + initial) |
| `null` | Default blue circle + initial |

### Rendering Pattern (used in leaderboard, friends, profile, wizard)

```tsx
const url = profile.avatar_url ?? null;
const isColor = url?.startsWith("color:");
const isImg = url && !isColor && !url.startsWith("emoji:");
const bg = isColor ? url!.slice(6) : "var(--primary)";
const initial = (profile.display_name ?? profile.username ?? "?")[0].toUpperCase();

// Render:
{isImg
  ? <img src={url!} className="lb-avatar-img" />
  : <div className="color-avatar" style={{ background: bg, fontSize: 15 }}>{initial}</div>
}
```

### CSS Classes

```css
.color-avatar      /* circular div with white initial text */
.color-swatch-grid /* 4-column grid of color swatches */
.color-swatch-btn  /* individual swatch circle */
.color-swatch-active /* selected state: white ring */
```

### Color Presets (same in welcome/page.tsx and profile/page.tsx)

```ts
const COLOR_PRESETS = [
  "#FF375F","#FF6830","#FFD60A","#30D158",
  "#00C7BE","#0A84FF","#5E5CE6","#BF5AF2",
  "#FF2D55","#8E8E93","#A6FF00","#FF9F0A",
]
```

---

## Local Data (Dexie / IndexedDB)

All workout data lives locally in IndexedDB. No login needed to use core features.

### Key Types (`src/types/index.ts`)

```ts
interface Workout {
  id: string; date: number; title: string;
  exercises: WorkoutExercise[];
  durationSec?: number; inProgress?: boolean; createdAt: number;
}
interface WorkoutExercise {
  id: string; exerciseId: string; exerciseName: string;
  muscleGroup: string; sets: WorkoutSet[];
}
interface WorkoutSet { id: string; weight: number; reps: number; done: boolean; }
interface Settings {
  units: "kg" | "lb"; theme: "system" | "light" | "dark";
  biometricLockEnabled?: boolean; webauthnCredentialId?: string;
  bodyweightGoal?: number;
}
```

### Repos (`src/lib/repo.ts`)

```
workoutRepo     .all() .recent(n) .save(workout, finalize) .remove(id) .lastForExercise(exId, excludeId)
prRepo          .recent(n)
bodyweightRepo  .all()
photoRepo       .latest() .objectUrl(id)
exerciseRepo    .seed(list)
settingsRepo    .get() .update(patch)
templateRepo    .save() .fromWorkout()
computeStreak() → number
weeklyFrequency() → number[]
```

---

## Sync System (`src/lib/sync.ts`)

`syncAll(userId)` pushes local Dexie data to Supabase, then recalculates the leaderboard snapshot.

### XP Formula

```
xpTotal = workoutCount * 10 + prCount * 50 + streakBonus + round(recompScore)
streakBonus = floor(streak/30)*100 + floor((streak%30)/7)*25
```

### Recomp Score

Measures body composition change over time:
- Body score: `abs(lastWeight - firstWeight) * 10`, capped at 200
- PR bonus: sum of `(latestPR - earliestPR) * 0.5` per exercise, capped at 100

---

## Tab Bar (`src/components/TabBar.tsx`)

6 tabs: Home `/` · Workout `/workout` · Timeline `/timeline` · Body `/body` · Photos `/photos` · Rank `/leaderboard`

**Hidden automatically on `/welcome` and `/auth/*`** — wizard and auth pages are full-screen.

```ts
const HIDDEN_PATHS = ["/welcome", "/auth"];
if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
```

---

## Root Layout (`src/app/layout.tsx`)

```
AuthProvider
  AppProvider (settings, theme, toast, DB seed)
    LockGate (biometric, only blocks if enabled)
      <main className="app-scroll">{children}</main>
      <TabBar />
    ServiceWorker
```

---

## User Flows

### First-time visitor (no account, never opened app)

```
Open / → authReady && !user && no localStorage["ironlog:welcomed"]
  → redirect /welcome → wizard
      splash: Get started | I already have an account | Skip for now
      choose: Create account | Continue with Google
      register: username + email + password
      avatar: pick color swatch
      done: auto-redirect /leaderboard after 2.4s
```

### Returning visitor (skipped, no account)

```
Open / → authReady && !user && localStorage["ironlog:welcomed"] = "1"
  → dashboard renders normally (local-first, no auth needed)
```

### Returning user (logged in)

```
Open / → authReady && user exists → dashboard (wizard never shown)
Visiting /welcome while logged in → auto-redirect /
```

### Google OAuth

```
Click "Continue with Google"
  → signInWithGoogle(`${origin}/auth/callback`)  ← NO trailing slash
  → Google consent screen
  → /auth/callback?code=...
  → exchangeCodeForSession(code)
  → new user? → create profile row → /profile
  → existing user? → /leaderboard
  → error? → /auth/login
```

### `ironlog:welcomed` flag

Set in `localStorage` when ANY of these happen:
- Email login succeeds
- Google OAuth redirect fires (before redirect, in case page reloads)
- Avatar step completes (registration done)
- "Skip for now" tapped

---

## Icons (`src/components/Icons.tsx`)

All icons are SVG, `fill="none" stroke="currentColor" strokeWidth=1.7`, 24px viewBox.
Pass `style={{ width, height, color }}` to size and colorize.

Available exports:
`IconDashboard` `IconDumbbell` `IconTimeline` `IconCamera` `IconScale`
`IconPlus` `IconChevron` `IconChevronDown` `IconClose` `IconCheck`
`IconTrash` `IconEdit` `IconCopy` `IconSearch` `IconGear` `IconTrophy`
`IconFlame` `IconUsers` `IconUser` `IconFaceId`

**No emojis anywhere in the codebase.** Every icon is SVG.

---

## PWA Setup

- `public/manifest.json` — app name, icons, `display: "standalone"`, theme colors
- `public/sw.js` — service worker (registered by `ServiceWorker` component)
- `src/app/layout.tsx` metadata — `appleWebApp: { capable: true, statusBarStyle: "black-translucent" }`
- Viewport: `viewportFit: "cover"`, uses `env(safe-area-inset-*)` CSS vars throughout

---

## Known Issues Fixed (do not revert)

### 1. Black-on-black contrast in wizard
**Root cause:** `transition: background-color 0.5s` on `.wiz-shell` + conditional `wiz-shell-splash` class.
When leaving splash, text color snapped to dark instantly while bg was still fading from black.
**Fix:** `.wiz-shell` is always dark with its own CSS token overrides. No `transition` property. No conditional class.

### 2. Google OAuth "login failed"
**Root cause:** `redirectTo` had a trailing slash: `/auth/callback/`
Supabase/Google require exact URL match with what's registered.
**Fix:** `${window.location.origin}/auth/callback` — no trailing slash.

### 3. Welcome wizard not showing on app open
**Root cause:** Root `/` went straight to dashboard for all users.
**Fix:** `page.tsx` checks `authReady && !user && !localStorage["ironlog:welcomed"]` → redirects to `/welcome`.

### 4. Emoji removal
All emojis replaced with SVG icons throughout the entire app.
Avatar system migrated from `emoji:X` prefix to `color:#HEX` prefix.

---

## Dev Commands

```powershell
# From C:\Users\yayla\Desktop\Business\GYM\ironlog
npm run dev      # starts on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

Kill running Node processes:
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

---

## Environment Variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## Supabase Dashboard Checklist

If auth is broken, verify these settings at supabase.com → project → Authentication:

1. **URL Configuration → Site URL:** `https://gym.slideagentur.ch`
2. **URL Configuration → Redirect URLs:** must include BOTH:
   - `http://localhost:3000/auth/callback`  (no trailing slash)
   - `https://gym.slideagentur.ch/auth/callback`  (no trailing slash)
3. **Providers → Google:** enabled, with OAuth client ID + secret from Google Cloud Console

---

## Style Rules for this Codebase

- No emojis anywhere (SVG icons only)
- No CSS modules — all styles in `globals.css`
- No Tailwind — use CSS classes defined in `globals.css`
- No comments in CSS/TSX unless explaining a non-obvious constraint
- No new dependencies without a strong reason
- Buttons use `<button>` not `<div onClick>`
- All SVG icons use `currentColor` — colorize with `color:` CSS property, not `fill:`
- Avatar display always uses the rendering pattern above (handle color/img/legacy emoji)
- Wizard CSS variables are scoped to `.wiz-shell` — don't put wizard dark tokens on `:root`
