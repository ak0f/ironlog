# IronLog — User Flows & Product Experience

## Product Philosophy

The app should feel:
- calm
- premium
- private
- focused
- motivating
- emotionally rewarding without gamification overload

The UI should feel invisible.
The user's progress is the product.

---

# 1. First Launch Experience

## Goal
Make the app feel:
- personal
- secure
- premium
- intentional

NOT like a generic SaaS onboarding.

---

## Flow

### Step 1 — Welcome Screen

Fullscreen Apple-style hero.

Content:
- app logo
- short statement:
  "Track strength. See progress. Own your data."
- minimal illustration
- single CTA:
  "Continue"

No clutter.

---

### Step 2 — Privacy Promise

Explain:
- everything stored locally
- no accounts
- no cloud dependency
- no tracking

Visual:
simple lock/privacy illustration.

CTA:
"Your data stays on your iPhone"

---

### Step 3 — Face ID Setup

Prompt:
"Protect your gym history with Face ID"

Options:
- Enable Face ID
- Maybe Later

Use WebAuthn / biometric auth.

---

### Step 4 — Fitness Profile Setup

Collect:
- name or nickname
- bodyweight
- training goal:
  - bulk
  - maintain
  - cut
- unit preference:
  - kg/lbs

---

### Step 5 — Workout Structure Setup

Allow selecting:
- Push Pull Legs
- Bro Split
- Upper Lower
- Custom

Generate starter templates automatically.

---

### Step 6 — Progress Photos Intro

Explain:
- optional
- fully local
- compare progress over time

Show ghost overlay preview.

---

### Step 7 — Permissions

Ask for:
- camera access
- local storage
- notifications (optional later)

Request permissions contextually only.

---

### Step 8 — Dashboard Reveal

Animate into main app.

Show:
- empty dashboard
- subtle onboarding tips
- CTA:
  "Start First Workout"

---

# 2. Authentication Flow

## Locked State

On app reopen:
- minimal lock screen
- blurred dashboard background
- Face ID prompt
- fallback PIN

No login screens.
No email/password.

---

# 3. Workout Flow

## Start Workout

Entry points:
- Dashboard CTA
- Templates tab
- Timeline quick action

---

## During Workout

Goals:
- minimal taps
- one-handed use
- large touch targets
- extremely fast set logging

Features:
- autofill previous weights
- swipe to complete set
- automatic rest timer (optional)

---

## Workout Complete

Celebrate subtly:
- PR cards
- streak update
- workout summary
- option to add progress photo

No excessive gamification.

---

# 4. Photo Capture Flow

## Capture Experience

- fullscreen camera
- body ghost overlay
- alignment guides
- 3-2-1 countdown
- shutter animation

After capture:
- compare with previous
- save to timeline

---

# 5. Dashboard Experience

Dashboard should answer:
- Am I progressing?
- Did I train consistently?
- What improved recently?

Widgets:
- streak
- bodyweight trend
- PR highlights
- workout frequency
- recent workouts

---

# 6. Timeline Experience

Timeline behaves like:
- Apple Health
- personal gym journal
- progress archive

Includes:
- workouts
- photos
- PRs
- bodyweight entries

Chronological and filterable.

---

# 7. Empty States

Empty states must feel motivating.

Examples:

"No workouts yet"
→ "Your first workout starts your timeline."

"No progress photos"
→ "Track changes you don't notice day to day."

"No PRs yet"
→ "Progress appears one workout at a time."

---

# 8. Motion Principles

Animations:
- subtle
- smooth
- premium
- never playful

Use:
- fade
- blur
- scale
- slide

Avoid:
- bounce
- spring exaggeration
- flashy effects

---

# 9. Haptics

Where supported:
- workout completion
- PR achieved
- photo captured
- Face ID success

Subtle only.

---

# 10. Future Features (Architectural Hooks Only)

Possible future additions:
- Apple Health sync
- iCloud encrypted sync
- friend sharing
- wearable integration
- smart progression suggestions
- widgets
- lock screen live activities

Do not implement yet.