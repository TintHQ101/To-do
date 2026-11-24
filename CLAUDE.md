# To-Do — app facts

## What it is
A very simple to-do web app for iPhone/iPad, added to the home screen (PWA). Built for someone with ADHD: fast capture, very visual, no clutter.

## Features (v1)
- One scrollable list, newest on top. No categories, no due dates (deadlines live in the work CRM).
- Every task on the list counts as "do now".
- Add a task with the floating glass bar at the bottom. Voice input = the iPhone keyboard's dictation mic.
- Tap a task to edit its title and its optional note. Swipe left (or Delete in the edit sheet) to delete, with a 5-second Undo.
- Tap the circle to finish a task: pop animation + mini confetti, then it moves to a collapsible "Done today" section. Tap again to un-finish.
- Progress bar = done today ÷ (open + done today). Done tasks from earlier days are hidden, so the bar resets each morning. Done tasks older than 7 days are deleted automatically.
- Everything done: big confetti and a "You're clear." message.
- Light/dark toggle (sun/moon button). Starts in dark mode and remembers your choice.
- Sync between iPhone and iPad: Google sign-in (Firebase Auth) + Firestore. Without sign-in, tasks are saved on the device only.

## Look
Liquid-glass iOS style. Chosen theme: **#7 Silver · Moving background · Frosted glass**, dark by default.
In Silver Dark, icons on the silver buttons are dark (`--on-accent`) so they stay readable.

## How it's built
- Plain HTML/CSS/JS, no build step. Hosted on GitHub Pages (from `main`, only after the owner says "go live").
- Firebase SDK is loaded from Google's CDN only when `firebase-config.js` has a config.
- Firestore data: `users/{uid}/tasks/{taskId}` with `title, note, done, doneAt, createdAt, updatedAt` (times in ms). Rules in `firestore.rules`: each user can only touch their own tasks.
- Offline: service worker (`sw.js`, network-first) + Firestore offline cache.

## Code map
- `index.html` — page structure, home-screen meta tags.
- `styles.css` — theme tokens (dark on `:root`, light on `[data-theme="light"]`), glass, layout.
- `app.js` — UI: render, add, complete, swipe/tap, edit sheet, undo, theme toggle, sync sheet, confetti.
- `logic.js` — pure logic: what's shown today, progress math, cleanup. Unit-tested.
- `store.js` — `LocalStore` (localStorage) and Firebase/`CloudStore` (Firestore). Same API: subscribe, put, remove.
- `firebase-config.js` — Firebase web config (public values). `null` = no sync.
- `sw.js`, `manifest.webmanifest`, `icons/` — home-screen app support.
- `tests/logic.test.js` (unit), `tests/smoke.cjs` (real-browser end-to-end at iPhone size).

## Checks
- `npm test` — unit tests.
- `npm run check` — syntax check + browser smoke test (uses the preinstalled Playwright).

## Rules
- Keep features few and simple.
- Never go live until the owner says "go live". Work on a branch until then.
- Run all checks before calling anything done.
- Never invent data.
