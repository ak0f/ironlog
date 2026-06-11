# IronLog — User Flows

## Entry point

`localhost:3000` / `gym.slideagentur.ch` → `/` (root)

The root page checks two things before rendering the dashboard:
1. Is `authReady` true? (Supabase session resolved)
2. Is `localStorage["ironlog:welcomed"]` set?

If the user is **not logged in AND has never seen the wizard**, they are immediately redirected to `/welcome`.

---

## Flow A — First-time visitor (no account)

```
Open app (/)
  └─ authReady && !user && no "ironlog:welcomed" flag
       └─ redirect → /welcome [splash]
            ├─ "Get started" → [choose]
            │    ├─ "Create account" → [register] → [avatar] → [done] → /leaderboard
            │    └─ "Continue with Google" → OAuth → /auth/callback → /leaderboard
            ├─ "I already have an account" → [login] → /leaderboard
            └─ "Skip for now" → sets flag, → / (dashboard, no account)
```

The `ironlog:welcomed` flag in `localStorage` is set when:
- Login succeeds (email/password)
- Google OAuth redirect begins
- Avatar step completes (registration done)
- "Skip for now" is tapped

---

## Flow B — Returning visitor (no account, skipped before)

```
Open app (/)
  └─ authReady && !user && "ironlog:welcomed" IS set
       └─ render dashboard normally (local-first, no auth needed)
```

---

## Flow C — Returning user (logged in)

```
Open app (/)
  └─ authReady && user present
       └─ render dashboard (wizard never shown)
```

Visiting `/welcome` while logged in immediately redirects back to `/`.

---

## Flow D — OAuth callback

```
Google OAuth completes
  └─ redirect to /auth/callback?code=...
       └─ exchangeCodeForSession(code)
            ├─ success → router.replace("/leaderboard")
            └─ error   → router.replace("/auth/login")
```

Registered redirect URL (must match exactly in Supabase dashboard):
- Development: `http://localhost:3000/auth/callback`
- Production:  `https://gym.slideagentur.ch/auth/callback`

No trailing slash.

---

## Flow E — PWA install prompt

Triggered automatically on the `/welcome` splash step:
- **iOS Safari**: detected via UA (`/iPad|iPhone|iPod/` + not standalone + Safari UA). Shows a manual 3-step sheet (Share → Add to Home Screen → Add).
- **Chrome / Android**: detected via `beforeinstallprompt` event. Shows a one-tap "Install IronLog" button.
- The prompt does not block the wizard flow — users can dismiss it and continue.

---

## Tab bar visibility

The `TabBar` is always mounted in the root layout but hides itself when the current path is `/welcome` or `/auth/*`, so the wizard always renders full-screen without the nav bar underneath.

---

## Auth routes

| Route | Purpose |
|---|---|
| `/welcome` | Onboarding wizard (splash → choose → register/login → avatar → done) |
| `/auth/callback` | PKCE OAuth code exchange (Supabase redirects here after Google) |
| `/auth/login` | Fallback login page (linked from other parts of the app) |
