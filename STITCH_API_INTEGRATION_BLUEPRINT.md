# SlotShield — Stitch → API Wiring → Antigravity Build Blueprint

This document is the operational handoff for the six-hour hackathon build. Keep it in the root of the shared `jarvis3.0` repository so every teammate and coding agent sees the same source of truth.

## 0. Project and source assumptions

- Working repo shown in the screenshot: `rimuru789/jarvis3.0` (private and currently empty in the screenshot). Use this as the one source of truth unless the team intentionally creates a renamed repository.
- Product name in the UI: **SlotShield**. Repository name and UI product name do not need to match.
- Uploaded curriculum: SLRTCE Computer Engineering R-2025 syllabus, Semesters I, II and III. Course codes, names, course type, and L/T/P hours are curriculum-derived.
- The uploaded current timetable screenshot is useful as a visual/layout reference: a master timetable, class/division rows, a day/time grid, colored session blocks, and course/teacher/room text inside the blocks. Its small screenshot does not reliably establish every label or exact time boundary. Do not silently OCR or invent official course/faculty assignments from it.
- The screenshot header appears to say Academic Year 2026–2027, effective 6 July 2026, dated 04/07/2026. Treat this as metadata shown on the screenshot, not as independently verified live data.
- Teacher-course assignments, room inventory, availability, cohort sizes and sample timetable placements in the starter pack remain synthetic demo data.
- Initial hackathon scope: one cohort per semester (S1, S2, S3), 15 demo faculty, a configurable weekly calendar. The data model supports adding section/cohort IDs later, such as A/B/C, without changing the API design.

## 1. The non-negotiable order of work

1. Put this document and the starter-pack `data/` files into the shared GitHub repository.
2. Freeze the API paths and TypeScript data shapes in Sections 3–5 before generating all UI screens.
3. Generate the UI in Stitch in two batches (Sections 6–7). Use the same design system and navigation in both batches.
4. Keep one codebase and one Git branch as the source of truth. Do not let Stitch, AI Studio and Antigravity each become a separate unsynced version of the app.
5. Render the sample timetable before the scheduler is finished. Connect the backend to the UI behind a single `api.ts` client.
6. Implement the scheduling/repair algorithm in ordinary deterministic code. The LLM can help write code or explain a result, but it must not be the authority that decides whether a slot is conflict-free.

## 2. Recommended architecture

- UI: React + Vite + TypeScript + Tailwind (or the CSS approach produced by Stitch; do not spend hackathon time rewriting a functioning UI framework).
- API: Node.js + Express + TypeScript, with `API_BASE_URL=/api/v1`.
- Data for demo: JSON files from this starter pack. Use an in-memory/JSON snapshot store for timetable versions; a database is not required for the six-hour MVP.
- Scheduling: pure functions in `server/src/scheduler/`; no React/Express imports in the scheduler.
- Fetch integration: all frontend network calls live in `client/src/lib/api.ts`. Components must not call `fetch()` directly.
- Animation: Anime.js for presentation only; no animation function may alter schedule validity or data.

Suggested folder ownership:

```text
client/src/pages/                 # Stitch page imports and route pages
client/src/components/             # timetable grid, cards, filters, modals
client/src/lib/api.ts              # only frontend API caller
client/src/lib/contracts.ts        # UI-facing shared types
server/src/routes/                 # Express route definitions
server/src/controllers/             # input validation and orchestration
server/src/scheduler/               # generator, validator, repair algorithm
server/src/data/                    # read seed JSON; keep starter files canonical
shared/contracts.ts                 # canonical cross-layer types, if using a shared folder
data/                               # courses, faculty, rooms, time slots, sessions
```

If your repo already has a folder structure, adapt names once and record them here. Do not create duplicate copies of the same contract under different names.

## 3. Canonical hierarchy and entities

Use this relationship consistently across the UI, API and seed data:

```text
Department
  └── Semester
       └── Cohort / Section (e.g. CE-S1-A; optional extension for A/B/C divisions)
            └── Subject / Course
                 ├── weeklyHours: lecture, tutorial, practical
                 └── SessionRequirement (generated meetings)
                      └── TimetableEntry (actual day, time, room)
```

### Canonical entities

- `departmentId`: stable string, e.g. `CE`.
- `semester`: integer `1`, `2` or `3`, matching the existing starter-pack `courses.json`; display labels (Semester I/II/III) belong in the UI/bootstrap metadata. This is deliberate to avoid a risky schema migration during a six-hour hackathon.
- `cohortId`: stable string, e.g. `CE-S1-A`; a cohort represents a group of students that cannot be double-booked. For the demo, use one cohort per semester. The timetable screenshot's A/B/C class rows suggest this should remain configurable.
- `courseId`: the syllabus course code stored as a string, never a number (preserve any leading zeros). In the UI call this item a “subject”; in API payloads keep the existing starter-pack property `courseId`. A course includes `courseCode`, `courseName`, `courseType`, numeric `semester`, `weeklyHours`, `assignedTeacherId`, `roomRequirements`, `source`, and `teacherAssignmentStatus`.
- `subjectKind`: `THEORY | LAB | MIXED | OTHER`. This is a display/grouping field, not a replacement for L/T/P hours.
- `sessionType`: `LECTURE | TUTORIAL | PRACTICAL`. The UI can label `PRACTICAL` as “Lab” while keeping the API enum stable.
- `teacherId`: demo teacher identifier such as `T01`; a teacher may be assigned to at most 3 distinct subjects across the whole dataset, and conflicts are checked across all semesters.
- `roomId`: stable room identifier; validate room type and capacity.
- `slotId`: stable ID from `time-slots.json`. Keep all clock boundaries in data/config, never hard-code them in React. Verify the actual timetable's irregular-looking time labels against an authoritative source before claiming that the seed matches college timings.

### Seed-data rule

`courses.json` remains the source of truth for subject metadata and weekly L/T/P demand. `session-requirements.json` is a deterministic generated snapshot and must be reproducible. `sample-timetable.json` is a UI demo fixture only. All teacher assignments and room choices must remain labelled synthetic unless independently provided by the college.

## 4. Exact API names — freeze these before connecting UI pages

Base URL: `VITE_API_BASE_URL` plus `/api/v1`. Use the exact HTTP methods and paths below; do not let a model silently rename or pluralize them.

### P0 — must work for the demo

| Method | Exact path | Purpose |
|---|---|---|
| `GET` | `/api/v1/health` | API alive check |
| `GET` | `/api/v1/bootstrap` | One request returns departments, semesters, cohorts, subjects, faculty, rooms, timeSlots, sessionRequirements, sampleTimetable and scheduleSettings |
| `GET` | `/api/v1/timetables` | List timetable versions |
| `POST` | `/api/v1/timetables/generate` | Generate a timetable from selected semester IDs |
| `GET` | `/api/v1/timetables/:timetableId` | Get one timetable and metrics |
| `POST` | `/api/v1/timetables/:timetableId/validate` | Recheck every hard constraint |
| `POST` | `/api/v1/timetables/:timetableId/repair` | Produce a repair proposal for a disruption; do not silently apply it |
| `POST` | `/api/v1/timetables/:timetableId/repair/apply` | Apply a previously previewed `changeSetId` after user confirmation |

### P1 — hierarchy and detail pages

| Method | Exact path | Purpose |
|---|---|---|
| `GET` | `/api/v1/departments` | Department selector/list |
| `GET` | `/api/v1/semesters?departmentId=CE` | Semesters for a department |
| `GET` | `/api/v1/cohorts?semester=1` | Cohorts/sections for a semester |
| `GET` | `/api/v1/subjects?departmentId=CE&semester=1` | Subject catalogue filtered by department/semester |
| `GET` | `/api/v1/subjects/:courseId` | Subject detail including weekly L/T/P and teacher assignment |
| `GET` | `/api/v1/faculty` | Faculty list and course loads |
| `GET` | `/api/v1/faculty/:teacherId` | Faculty profile and assigned subjects |
| `GET` | `/api/v1/rooms` | Rooms/labs with room type and capacity |
| `GET` | `/api/v1/time-slots` | Calendar slot definitions and next-slot links |
| `GET` | `/api/v1/session-requirements?semesters=1,2,3` | Meetings required by weekly L/T/P totals |
| `POST` | `/api/v1/session-requirements/build` | Regenerate session requirements from canonical subjects |
| `GET` | `/api/v1/analytics/summary` | Dashboard counts: scheduled, unscheduled, conflicts, moves, preservation metric |
| `GET` | `/api/v1/schedule-settings` | Read working days, time slots, breaks and constraint settings |
| `PATCH` | `/api/v1/schedule-settings` | Update demo schedule configuration, if time allows |
| `GET` | `/api/v1/timetables/:timetableId/changes` | Change history/diff for a timetable |

### Error response contract

Use HTTP status codes meaningfully. Every error body must use this exact structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The selected room is not available for the requested slot.",
    "details": []
  }
}
```

Do not return HTTP 200 with `valid: true` if any hard conflict remains.

## 5. Exact request/response shapes for the most important actions

### `POST /api/v1/timetables/generate`

Request:

```json
{
  "departmentId": "CE",
  "semesters": [1, 2, 3],
  "settingsId": "DEMO_DEFAULT"
}
```

Response shape (illustrative; IDs/values vary):

```json
{
  "timetableId": "TT-DEMO-001",
  "entries": [],
  "metrics": {
    "scheduledSessionCount": 0,
    "unscheduledSessionCount": 0,
    "movedEntryCount": 0,
    "hardConflictCount": 0,
    "preservedEntryPercent": null
  },
  "unscheduledSessions": [],
  "warnings": [],
  "validation": { "valid": true, "hardConflictCount": 0, "conflicts": [] }
}
```

### `POST /api/v1/timetables/:timetableId/validate`

Request:

```json
{ "entries": [] }
```

If no `entries` are supplied, validate the stored timetable identified by `:timetableId`. Response: `ValidationResult` with `valid`, `hardConflictCount` and `conflicts`.

### `POST /api/v1/timetables/:timetableId/repair`

Request:

```json
{
  "disruption": {
    "type": "FACULTY_UNAVAILABLE",
    "targetId": "T04",
    "dayCode": "WED",
    "slotIds": ["WED_P2"],
    "reason": "Faculty member unavailable"
  }
}
```

Allowed disruption types for MVP: `FACULTY_UNAVAILABLE` and `ROOM_UNAVAILABLE`. Response must include `changeSetId`, proposed `entries`, `changes` with old/new placement and reason, `metrics`, `unscheduledSessions`, `warnings`, and `validation`. This call previews; it does not modify the current timetable.

### `POST /api/v1/timetables/:timetableId/repair/apply`

Request:

```json
{ "changeSetId": "CHANGESET-DEMO-001" }
```

Apply only the proposal that was previewed and validated. Response returns the saved timetable and final validation. If validation fails, reject the apply operation.

### Stable timetable entry shape

```json
{
  "entryId": "E-0001",
  "sessionId": "S-12111101-LEC-01",
  "courseId": "12111101",
  "semester": 1,
  "cohortId": "CE-S1-A",
  "teacherId": "T01",
  "roomId": "C101",
  "dayCode": "MON",
  "startSlotId": "MON_P1",
  "durationSlots": 1,
  "status": "SCHEDULED",
  "changeReason": null
}
```

Keep the starter pack’s existing `courseId` and numeric `semester` fields across all JSON, API responses and scheduler types. In the UI, the navigation may say Department → Semester → Subject → Lecture/Lab, but the API property remains `courseId`. Do not introduce `subjectId` or `semesterId` in one component and use `courseId`/`semester` in another.

## 6. Stitch export Batch A — core application (6 screens)

Generate and export these six screens together. Keep one consistent sidebar, header, typography, spacing, button style and color tokens.

1. **Dashboard** — quick metrics, active timetable version, semester selector, `Generate Timetable` primary action, `Simulate Disruption` secondary action, recent changes.
2. **Master Timetable** — weekly grid with day/time columns and cohort/section rows. Session cards show subject code/name, faculty, room and lecture/lab tag. Filters by department, semester, cohort and session type. Use color as an aid, not the only source of meaning.
3. **Semester Timetable** — same grid filtered to a single semester/cohort; preserve a clear distinction between lecture, tutorial and practical blocks.
4. **Subject Catalogue** — hierarchy/filters for department → semester → subject; show course code, course type, weekly L/T/P hours, assigned demo faculty and synthetic-data indicator.
5. **Faculty & Workload** — 15 demo faculty, specialties, assigned subjects, count of distinct subjects (max 3) and availability indicator.
6. **Rooms & Labs** — room type/capacity cards, lab tags, availability/conflict indicator.

## 7. Stitch export Batch B — scheduling and repair (5 screens)

Generate/export these as a second batch, referencing Batch A as the style source. Stay under the tool's per-download screen limit.

7. **Generate Timetable Wizard** — choose department/semesters/cohorts, show hours/session summary, confirm constraints, generate action and progress state.
8. **Disruption Simulator** — toggle faculty absence / room closure, choose target, date/day and affected slots, include a prominent “Preview Repair” action.
9. **Repair Proposal / Before–After Diff** — moved cards, old vs new day/time/room, explanation per move, preserved-entry percentage, apply/reject buttons.
10. **Validation & Conflict Report** — zero-conflict success state, conflict table grouped by teacher/cohort/room, unscheduled sessions and an honest impossible-repair state.
11. **Schedule Settings & Activity History** — working days, time-slot template, break periods, hard/soft constraints and recent generation/repair records. If short on time, Settings can be a drawer/modal rather than a full route.

Do not produce multiple design variants of each screen before exporting. Use one strong visual direction and get the functionality connected first.

## 8. Exact UI-to-API binding map

| UI screen/action | API call(s) |
|---|---|
| App startup / initial loading | `GET /api/v1/bootstrap`; optionally check `GET /api/v1/health` first |
| Dashboard metrics | `GET /api/v1/analytics/summary` (or derive from bootstrap/current timetable if P1 not implemented) |
| Department → semester filters | `GET /api/v1/departments`, `GET /api/v1/semesters?departmentId=CE` |
| Cohort/subject filtering | `GET /api/v1/cohorts?semester=1`, `GET /api/v1/subjects?departmentId=CE&semester=1` |
| Faculty screen | `GET /api/v1/faculty`, optionally `GET /api/v1/faculty/:facultyId` |
| Rooms/labs screen | `GET /api/v1/rooms` |
| Session requirement preview | `GET /api/v1/session-requirements?semesters=1,2,3` |
| Generate button | `POST /api/v1/timetables/generate` |
| Open timetable | `GET /api/v1/timetables/:timetableId` |
| Validate button / pre-repair check | `POST /api/v1/timetables/:timetableId/validate` |
| Preview repair | `POST /api/v1/timetables/:timetableId/repair` |
| Apply repair | `POST /api/v1/timetables/:timetableId/repair/apply` |
| Changes/history drawer | `GET /api/v1/timetables/:timetableId/changes` |
| Settings save | `PATCH /api/v1/schedule-settings` |

### Frontend API wrapper names (exact JavaScript/TypeScript function names)

Keep one file `client/src/lib/api.ts` with these exported wrapper names:

```ts
getBootstrap()
getDepartments()
getSemesters(departmentId: string)
getCohorts(semester: number)
getSubjects(departmentId: string, semester: number)
getSubject(courseId: string)
getFaculty()
getFacultyMember(facultyId: string)
getRooms()
getTimeSlots()
getSessionRequirements(semesters: number[])
buildSessionRequirements()
getTimetables()
generateTimetable(input: GenerateTimetableInput)
getTimetable(timetableId: string)
validateTimetable(timetableId: string)
repairTimetable(timetableId: string, input: RepairTimetableInput)
applyRepair(timetableId: string, changeSetId: string)
getTimetableChanges(timetableId: string)
getAnalyticsSummary()
getScheduleSettings()
updateScheduleSettings(input: ScheduleSettingsPatch)
```

Never let UI components import `fetch` directly. The API wrapper should check `response.ok` because browser `fetch()` does not treat HTTP 4xx/5xx responses as network promise rejections.

## 9. AI Studio connection prompt — paste after Batch A/B UI exists

```text
You are integrating SlotShield's existing Stitch-generated React UI. Do not redesign the UI, rename routes, invent new fields, or change the API contract. Use the attached STITCH_API_INTEGRATION_BLUEPRINT.md and shared TypeScript types as the source of truth.

Create a single client/src/lib/api.ts using VITE_API_BASE_URL and the exact wrapper function names and REST paths listed in Section 8. All components must call these wrappers; no direct fetch() calls inside components. Preserve the existing component structure and styling.

On app startup call GET /api/v1/bootstrap. While the API is unavailable, use data/bootstrap.json as an explicit mock adapter behind the same wrapper interface. Show a small “Demo data” label whenever mock data is active. Do not pretend mock responses came from a real backend.

Wire the Generate action to POST /api/v1/timetables/generate. Wire Preview Repair to POST /api/v1/timetables/:timetableId/repair and Apply to POST /api/v1/timetables/:timetableId/repair/apply. The repair preview must show old/new placements and must not change the active timetable until Apply succeeds.

Handle loading, empty, successful, and error states. Use the exact error envelope { error: { code, message, details } }. Do not implement scheduling logic in React. Do not mark a schedule valid unless the API validator returns valid=true and hardConflictCount=0. Add no authentication, external database, or paid third-party dependency unless asked. Make a small diff and explain any file changes.
```

## 10. Antigravity implementation prompt — use after importing the single shared repo

```text
Work in the existing SlotShield repository. First inspect README.md, IMPLEMENTATION_PLAN.md, STITCH_API_INTEGRATION_BLUEPRINT.md, contracts/SHARED_CONTRACT.md and data/*.json. Before editing, write a short implementation plan and identify contract mismatches. Do not regenerate the UI from scratch.

Use the exact API paths in STITCH_API_INTEGRATION_BLUEPRINT.md. Implement the Express API and the deterministic scheduling functions. Keep all placement and validation rules in server/src/scheduler, not in route handlers or React components. Use the sample timetable first so the UI can render while generation is being implemented.

Hard constraints: no cohort overlap, no faculty overlap across any semesters, no room overlap, correct room type/capacity, no blocked/unavailable time, and no multi-slot session crossing a break. Teacher assignment count must remain <= 3 distinct subjects. Validate the final whole timetable. If a session cannot be placed, return it as unscheduled and explain the blocking constraints; never claim success with hard conflicts.

For repair, lock unaffected entries first, create a preview change set, validate it, and require explicit Apply to change the saved timetable. Add tests for teacher, cohort and room clashes, room type/capacity, break-crossing, successful repair and impossible repair. Preserve the imported Stitch visual design and use Anime.js only for visual feedback after API results arrive.

After implementing, run the tests and app, inspect the browser UI, report any remaining failures, and list the exact files changed. Do not claim tests pass unless you ran them.
```

## 11. Anime.js — impressive but safe

Use motion to explain the algorithm, not distract from it:

1. **Generate:** short staggered entrance of schedule cards after the API has returned a valid result; animate metric counters.
2. **Repair preview:** dim unchanged sessions, pulse the disrupted session, then animate the proposed changed cards into their destination cells. Display the API-provided reason beside each move.
3. **Conflict resolution:** animate a conflict badge from “Checking” to “Resolved” only after `validation.valid === true` and `hardConflictCount === 0`.
4. **Impossible case:** use a calm warning state and list blocked constraints; don't animate success.
5. Honour `prefers-reduced-motion`. Keep animation durations short (roughly 180–450 ms for small interactions) and never delay access to Apply/Reject controls for a decorative animation.

The initial six-hour version can use CSS transitions for hover/fade and Anime.js for the repair sequence/counters only. Add complex moving paths or animated graph lines only after real rescheduling works.

## 12. Six-hour execution plan

- **00:00–00:20 — Contract freeze:** add files to GitHub, confirm the frozen `courseId`/numeric `semester` fields, API paths and folder ownership.
- **00:20–01:15 — Parallel skeletons:** frontend renders `sample-timetable.json`; API serves health/bootstrap; scheduler builds session requirements and validates conflicts; presenter prepares pitch/test script.
- **01:15–02:45 — End-to-end generation:** connect Generate button to API and render generated entries.
- **02:45–04:00 — Repair:** disruption form → preview proposal → before/after diff → apply/reject.
- **04:00–05:00 — QA:** verify faculty/room/cohort conflicts, capacity/type, break crossing and impossible repair.
- **05:00–06:00 — Polish:** Anime.js repair sequence, responsiveness, demo script, commit freeze.

## 13. Definition of done

- App starts and displays the supplied demo timetable before the scheduler is finished.
- The dashboard filters Department → Semester → Cohort/Section → Subject/session type.
- Generate creates a schedule and reports any unplaced sessions honestly.
- Faculty conflict checks work across all selected semesters, not just one semester at a time.
- Repair produces a preview and applies changes only after explicit confirmation.
- Validation reports zero hard conflicts before showing success.
- Course/faculty/room records marked synthetic are visually labelled as demo data.
- All team members work from the same GitHub repository and the same frozen contract.
