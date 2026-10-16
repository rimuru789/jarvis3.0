# SOLO_START_HERE — SlotShield (six-hour hackathon)

You said you may have to handle the whole build yourself. Treat this as a solo-developer plan; do not attempt to build every planned screen before the core works.

## First 15 minutes

1. Open the extracted folder and locate `slotshield_pack`. Open it.
2. Clone your private repository `https://github.com/rimuru789/jarvis3.0.git` with VS Code: press `Ctrl+Shift+P` → `Git: Clone` → paste the URL → choose a local folder → open the cloned repo. If Git is not configured, use GitHub Desktop instead.
3. Copy the *contents inside* `slotshield_pack` into the cloned `jarvis3.0` folder. The repo root should show `README.md`, `IMPLEMENTATION_PLAN.md`, `STITCH_API_INTEGRATION_BLUEPRINT.md`, `SOLO_START_HERE.md`, `contracts/`, and `data/`. Do not place all these inside another nested `slotshield_pack/` folder.
4. In VS Code, open Terminal → New Terminal. Run `git status` and check that the new files appear.
5. Commit the starter pack before AI tools edit anything. In VS Code Source Control, enter message `Add SlotShield starter data and contracts`, click Commit, then Sync/Push. If Git prompts for identity or authentication, follow its setup prompts.

## Important consistency rule

Use the exact API names in `STITCH_API_INTEGRATION_BLUEPRINT.md`, all under `/api/v1`. The route examples in `IMPLEMENTATION_PLAN.md` have been aligned to that prefix. Do not let Stitch/AI Studio invent or rename routes, IDs, or JSON field names.

## The actual solo build order

### Phase A — make something run before styling (first 60–90 minutes)

1. Start with one React/Vite frontend and one Express backend in the same repo. Keep TypeScript if comfortable; if not, use JavaScript consistently rather than mixing languages.
2. Make `GET /api/v1/health` respond `{ "ok": true }`.
3. Make `GET /api/v1/bootstrap` return `data/bootstrap.json`.
4. Build one page only: Dashboard + master timetable grid. Render `data/sample-timetable.json` with a visible `DEMO DATA` label. This proves the repo, UI and data work together.

### Phase B — implement the core behavior (next 2 hours)

1. Implement a central validator for cohort conflicts, teacher conflicts across all three semesters, room conflicts, room type/capacity, and multi-slot sessions crossing lunch.
2. Implement `POST /api/v1/timetables/generate` and show the returned schedule. It is acceptable to show unscheduled sessions and warnings; it is not acceptable to claim a conflict-free timetable when hard conflicts remain.
3. Add the disruption preview endpoint for one scenario (faculty absence is easiest). Lock unaffected sessions, try to place only affected sessions, return a change list and validation result.
4. Add apply/reject only after preview works.

### Phase C — Stitch and motion (next 60–90 minutes)

Use Stitch for no more than four distinct views initially:

1. Dashboard/master timetable (combine these into one screen with tabs/filters).
2. Generate/configuration drawer.
3. Disruption simulator.
4. Repair comparison panel with old/new slots, conflict status and Apply/Reject.

Do not build separate faculty, rooms, subjects, analytics and settings pages unless the core workflow is already working. Use drawers, tabs and modals to present these details. Add Anime.js only after real API results drive the movement; never animate a success state before validation returns.

### Phase D — final hour

1. Test one successful faculty-absence repair and one impossible repair.
2. Confirm there are no teacher overlaps across semesters.
3. Add one polished Anime.js timeline for the repair preview, respecting reduced-motion preferences.
4. Rehearse the demo; stop adding features in the final 20 minutes.

## What to ask others to do if available

If teammates cannot code, delegate tangible non-code tasks:
- Presenter: make the slides and rehearse the pitch.
- QA helper: test against the acceptance checklist, report bugs with screenshots, check every screen on a laptop viewport.
- Data helper: verify subject names/codes against the supplied syllabus and label every teacher/room assignment as synthetic.

You remain the single owner of code integration. Do not wait for them to finish their tasks before continuing.

## Hard scope cuts

Skip login/auth, real database deployment, role management, live college data integration, AI scheduling, notifications, and dozens of settings. Use local JSON/in-memory storage if required. A reliable end-to-end generate → disrupt → preview → validate → apply flow is the MVP.
