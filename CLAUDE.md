# To-do — app facts

## What it is
A very simple to-do web app, added to the iPhone/iPad home screen (PWA). Built for someone with ADHD: fast capture, very visual.

## Decided features (v1)
- One scrollable list, newest on top. No categories, no due dates (deadlines live in the work CRM).
- Every task on the list counts as "do now".
- Add a task with the floating glass bar at the bottom. Voice input uses the iPhone keyboard's dictation mic.
- Tap a task to edit its title and its optional note. Swipe left to delete, with a 5-second Undo.
- Finishing a task: check animation, then it moves to a collapsible "Done today" section.
- Progress bar = done today ÷ (open + done today). Resets each morning.
- Empty list: confetti and a "You're clear." message.
- Syncs between iPhone and iPad via Google sign-in (Firebase). Hosted on GitHub Pages.
- Home-screen name: "To-Do".
- Liquid-glass iOS look. The user picks the final style from the mockup.

## Rules
- Keep features few and simple.
- Never go live until the owner says "go live". Work on a branch until then.
- Run all checks before calling anything done.

## How it's built
Plan: static web app (PWA) on GitHub Pages + Firebase Auth (Google) + Firestore for sync. Not built yet.
Look mockup: https://claude.ai/artifact/B2Ju8WzMMbiBtFo41TYNSR
