# AGENTS.md — read this first

Instructions for any AI coding agent (Claude Code, Codex, Cursor, Gemini, …) or developer working on this repo.
Full system detail (schemas, business rules, modules, cron pipeline) lives in [HANDOVER.md](HANDOVER.md). This file is the short operational version plus the running change log.

## What this is
PM Computers (PMC, Mirpur, Dhaka) internal shop management dashboard: daily sales ledger, product/warranty tracker, PM Brings, supplier purchases & ledgers, expenses & partner month-end settlement, invoices, price list, export, audit log.
React 18 + Vite 6 + HeroUI 2 + Tailwind 3, Firebase (compat SDK) Firestore + Auth. Project `pmc-tracker-d8b38`.
Production: https://pmcwork.github.io/ — GitHub Pages served **from the repo root of `main`**. The repo is **public**.

## Ground rules
- **Ask the owner before making changes**, and before every commit/push. The owner has little time for maintenance: prefer small, low-risk changes; don't refactor, upgrade dependencies, or restructure folders unless asked. Redeploying is fine once the owner has approved the change.
- **Never put secrets, passwords, or personal email addresses in committed files** (repo and Pages site are public). Refer to "GitHub repo secrets" / "Firestore settings" instead.
- **Update the Change log below** at the end of every session that changes anything, and update HANDOVER.md if you change schemas, business rules, build/deploy, or auth.
- Commit style: Conventional Commits (`feat(scope): …`, `fix(scope): …`, `style(…)`, `docs: …`).

## Build & deploy (important — non-standard)
```bash
npm install
npm run dev      # http://localhost:5173/ (dev middleware serves index.template.html at / and /v2)
npm run build    # builds to dist/ AND overwrites root index.html + root assets/
```
- **Source HTML is `index.template.html`. Root `index.html` and root `assets/` are generated build output — never edit them by hand.** The custom `root-deploy-handler` plugin in `vite.config.js` copies them out of `dist/` after each build.
- Deploying = run `npm run build`, commit source **and** the regenerated `index.html` + `assets/`, push `main`. If you change anything under `src/` and don't rebuild, production won't change.
- **Static files under `public/` are NOT auto-copied to the repo root.** Production serves root `icons/` (favicons). If you change `public/icons/*`, copy the same files to root `icons/` too. (`public/branding`, `public/logo`, root `branding/` are brand-kit copies; root `branding/` is the source kit.)
- `dist/` and `node_modules/` are gitignored. `firebase.json` hosting config exists but production is GitHub Pages.
- No test suite or linter. Verify by `npm run build` succeeding and checking the page in a browser (`npm run dev`).

## Pushing on this machine
A bare `git push` opens the Windows credential-manager GUI and hangs non-interactive shells. Use the PowerShell token-header method in HANDOVER.md §11 ("Non-Interactive Git Push Rules"), and only push when the owner says so.

## Code map
- `src/main.jsx` → providers: `HeroUIProvider > AuthProvider > DataProvider > DialogProvider > App`.
- `src/App.jsx` — shell, view switching, theme + adaptive favicon.
- `src/context/` — `AuthContext` (Google + PIN login), `DataContext` (live Firestore listeners, global data), `DialogContext` (`appConfirm`/`appPrompt`, also on `window`).
- `src/services/` — `firebase.js` (config, offline persistence), `auth.js` (email-hash whitelist, PIN login, `logAudit`), `emailNotifications.js` (EmailJS).
- `src/components/<module>/` — one folder per sidebar view; `src/constants/navigation.js` lists views.
- `src/utils/` — pure helpers (calculations/Dhaka time, expenses & settlement math, invoice numbering, purchase ledgers, shop-name aliasing, backup/restore, CSV export, dropdown typeahead).
- `scripts/` — nightly 11 PM summary email: Cloudflare Worker → GitHub Actions (`.github/workflows/daily_report.yml`) → `send_daily_summary.js` (firebase-admin + EmailJS). Secrets are GitHub repo secrets.
- `v2/index.html` — redirect to `/` for old bookmarks. Keep.- Local-only, gitignored: `junk/` (old exports), `index.legacy.html` (old vanilla-JS app), `entry-designs.html`, `README.md` (stale, describes the legacy app — trust this file and HANDOVER.md instead).

## Gotchas
- All dates are Asia/Dhaka (UTC+6); use helpers in `src/utils/calculations.js`, not raw `new Date()` math.
- Thursdays are the weekly off-day; empty Thursdays are not "missing sales". Marked off-days live in `settings/store_off_days`.
- Compare shop names with `shopMatchesFilter()` / canonicalization in `src/utils/productHelpers.js`, never `===`.
- Every create/update/delete should call `logAudit(...)` (audit log is a feature users rely on).
- Invoice numbers `PMCINV-YY###` are only burned on save (`invoiceHelpers.js`).
- Firestore security rules are **not** in this repo; they're managed in the Firebase console. Adding a new authorized login means updating both `AUTHORIZED_EMAIL_HASHES` in `src/services/auth.js` and the console rules.

## Known issues (not fixed — owner chose not to spend time on them yet)
- The PIN quick-login signs into a shared Firebase account whose password is hard-coded in `src/services/auth.js`, so it ships in the public bundle. PINs are checked client-side only.
- `scripts/cloudflare_cron_trigger.js`: the worker's `fetch` handler triggers the email workflow for any request to `/` or `/trigger` (anyone with the worker URL can send the nightly email), and the token lookup falls back to `Object.values(env)[0]`.
- `scripts/` has no lockfile, so the workflow's `npm ci` always falls back to `npm install`.

## Change log
Newest first. One entry per session: date, agent, what changed, anything left half-done.

- **2026-11-13 — Claude Code (Opus 5.5):** Onboarding/handover pass, no app behaviour changes. Added `AGENTS.md` (this file) and `CLAUDE.md` (pointer). Corrected `HANDOVER.md` (file tree, root `icons/` sync step, deploy checklist, known issues; removed plaintext password and personal emails). Checked that the committed root `index.html` + `assets/` exactly matched a fresh `npm run build` of `main` @ 7d40c8a (the build is deterministic). Then deleted the unused `src/components/Part1Showcase.jsx` (never imported), rebuilt, and redeployed. The only bundle change is ~1 kB less CSS from Tailwind classes that file alone used.
- **≤ 2026-10-28 — previous agent:** Built the v2 React/HeroUI app, moved it to the root domain, applied the PMC Brand Kit, and added the rest of the features. See `git log` (84 commits) for detail.
