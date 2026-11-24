# Notes (dated diary)

## 2026-11-24
- Changed: Created CLAUDE.md and NOTES.md. Repo was empty (README only).
- Requirements Q&A done. Decisions are in CLAUDE.md. Categories and due dates were dropped.
- Published the look-picker mockup: https://claude.ai/artifact/B2Ju8WzMMbiBtFo41TYNSR (10 colors × 4 backgrounds × 3 glass styles × light/dark).
- Unfinished: user picks a look. Firebase project not created yet.
- Next: get the look pick, walk the user through the Firebase setup, build v1 on this branch.

## 2026-11-24 (later)
- Look picked: #7 Silver · Moving · Frosted, plus a light/dark toggle (dark by default).
- Built v1: index.html, styles.css, app.js, logic.js, store.js, sw.js, manifest, icons, Firestore rules.
- Fixed readability: dark icons on silver buttons in dark mode.
- Tests: 5 unit tests + 17-step browser smoke test, all passing.
- Preview (device-only, no sync): https://claude.ai/artifact/CZ9owkX6o8iEceXjq1jf8V
- Unfinished: Firebase project not created yet, so sync is off (`firebase-config.js` is null). Not live.
- Next: user creates the Firebase project and pastes the config. Then wire it up, enable GitHub Pages on "go live", add tinthq101.github.io to Firebase authorized domains, and test Google sign-in from the home-screen app on iPhone (popup sign-in in home-screen apps is the main risk; fallback is Firebase Hosting).

## 2026-11-24 (evening)
- Firebase project created: `to-do-88c46`. Google sign-in enabled, Firestore created (nam5, production mode), rules pasted (user to confirm Publish went through). Analytics unlinked.
- Web app registered; config added to `firebase-config.js`.
- Smoke test now blocks Google's CDN so it runs offline. All checks pass.
- Could not test real sign-in from the dev container (its network blocks gstatic.com). Must test on the iPhone.
- Next: add `tinthq101.github.io` to Firebase authorized domains, then on "go live": merge to main, turn on GitHub Pages, test sign-in on iPhone + iPad.
