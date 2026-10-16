# SlotShield: six-hour hackathon implementation plan

## Product definition

**SlotShield** is a self-healing timetable planner for three Computer Engineering cohorts (Semesters I, II and III). It generates a weekly schedule from the published weekly L/T/P course hours and can propose a minimum-disruption repair after a faculty-absence or room-closure event.

### What the MVP will do
1. Load the 37 course rows derived from the uploaded SLRTCE Computer Engineering R-2025 curriculum.
2. Use 15 clearly fictional faculty demo profiles. No faculty assignments are claimed to be official.
3. Generate session requirements from L/T/P hours.
4. Create a weekly timetable for all three cohorts with shared teacher/room collision checking.
5. Simulate a faculty absence or room closure; preserve unaffected entries and attempt to reassign affected sessions.
6. Show old/new placements, movement count, unscheduled sessions and validation results.

### Explicitly out of scope for six hours
Authentication, live college data, student enrollment import, multi-section lab splitting, cloud database deployment, optimization guarantees, mobile app, notifications, and AI-generated schedule decisions. Add these only after the core demo is stable.

## Source data and known assumptions

- The course code, course name, course type and weekly lecture/tutorial/practical hours are sourced from the uploaded SLRTCE Computer Engineering Curriculum R-2025: FE Semester I, FE Semester II and SE Semester III curriculum-structure tables.
- The syllabus does not provide actual teacher-course assignments, teacher absences, room inventory, room capacity, or a published weekday/period timetable. Teacher mappings, rooms, cohort size and time slots in `data/` are synthetic demo assumptions.
- Weekly totals used as a validation check are: Semester I = 16L + 1T + 13P = 30 contact hours; Semester II = 17L + 1T + 15P = 33; Semester III = 18L + 1T + 6P = 25. Combined = 88 weekly contact hours.
- One cohort per semester is assumed: `CE-S1-A`, `CE-S2-A`, `CE-S3-A`, each with demo cohort size 30. Lab subgroup splitting is out of scope.
- The sample calendar uses Monday-Saturday, seven one-hour periods daily, with lunch from 13:00-14:00. `nextSlotId` deliberately does not bridge lunch.

## Shared source of truth: common contract

**Agree to this before anyone builds components.** Keep the files below in the root repository and do not hand-type separate copies of the demo data:

- `data/courses.json`: source of truth for course metadata, L/T/P demand, cohort and synthetic teacher assignment.
- `data/teachers.json`: teacher IDs, display labels and maximum three course assignments.
- `data/rooms.json`: room IDs, room type and capacity.
- `data/time-slots.json`: stable slot IDs and the valid next slot for multi-hour sessions.
- `data/session-requirements.json`: deterministic expansion of courses into weekly meetings, before day/time/room assignment.
- `data/sample-timetable.json`: a prebuilt, constraint-checked fixture with 72 placed sessions so the frontend can render a timetable before the scheduling engine is integrated.
- `data/bootstrap.json`: combined payload for frontend mock mode and `GET /api/v1/bootstrap`, including the sample timetable.
- JSON files are the runtime source of truth; CSV companions are review/export copies. Do not maintain two independently edited sources.

### Session expansion rule
- Each lecture hour becomes one 1-slot `LECTURE` meeting.
- Each tutorial hour becomes one 1-slot `TUTORIAL` meeting.
- Practical hours are packed into 2-slot blocks plus an optional 1-slot remainder. A 4-hour practical course becomes two 2-slot meetings, not one four-hour block.
- Each session begins with `status: "UNSCHEDULED"`. The scheduling engine creates timetable entries; it must not mutate the source course rows.

### Shared identifiers and enums
- IDs are stable strings: teacher `T01`, room `C101`, slot `MON_P1`, cohort `CE-S1-A`, course ID equals syllabus course code.
- Days: `MON`, `TUE`, `WED`, `THU`, `FRI`, `SAT`.
- Session type: `LECTURE`, `TUTORIAL`, `PRACTICAL`.
- Room types: `CLASSROOM`, `COMPUTER_LAB`, `MECHANICS_LAB`, `PHYSICS_LAB`, `GRAPHICS_LAB`, `IDEA_LAB`, `WORKSHOP`, `MULTIPURPOSE`.
- Assignment status: `UNSCHEDULED`, `SCHEDULED`, `UNSCHEDULED_CONFLICT`, `NEEDS_ADMIN_DECISION`.
- Disruption type: `FACULTY_UNAVAILABLE`, `ROOM_UNAVAILABLE`.

### Timetable entry shape
```json
{
  "entryId": "E-0001",
  "sessionId": "S1-12111101-LEC-01",
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

`durationSlots` is the total contiguous one-hour blocks occupied by the session. For a 2-hour meeting, validate every covered slot by following `nextSlotId`. Do not assume P4 is contiguous with P5 because lunch intervenes.

## Hard constraints: never violate these

1. A cohort cannot have two entries occupying any of the same periods.
2. A teacher cannot teach two sessions at the same time across *any* of the three semesters.
3. A room cannot host two sessions at the same time across any cohort.
4. The assigned room's type must match one of the session's `requiredRoomTypes`.
5. Room capacity must be at least the cohort size.
6. Every multi-slot session must use a truly contiguous chain of periods; no spanning lunch.
7. Teacher-course assignment count must never exceed three courses per teacher.
8. Validate the entire output before returning success. Return unscheduled sessions and blockers instead of pretending the timetable is clash-free.

## Soft objectives, in order of importance

1. During repair, minimize the number of existing entries moved; never move unaffected entries unless a deliberately enabled fallback says so.
2. Prefer compact student days and reduce long gaps.
3. Reduce unnecessary teacher gaps.
4. Avoid scheduling the same course multiple times on the same day where feasible.
5. Spread long practical sessions across the week where feasible.

Keep the scoring simple and deterministic for the demo. Do not use a language model to decide whether a slot is valid; normal code must enforce constraints.

## Scheduling engine interface

Create these pure functions in `server/src/scheduler/` so the API layer can call them without knowing how the algorithm works:

```ts
buildSessionRequirements(courses): SessionRequirement[]
generateTimetable(input): GenerateTimetableResult
repairTimetable(input): RepairTimetableResult
validateTimetable(entries, context): ValidationResult
```

`generateTimetable` input: `{ courses, teachers, rooms, timeSlots, sessions, settings }`.

`generateTimetable` output: `{ timetableId, entries, metrics, unscheduledSessions, warnings, validation }`.

`repairTimetable` input: `{ currentEntries, disruption, courses, teachers, rooms, timeSlots, sessions, settings }`.

`repairTimetable` output: `{ entries, changes, metrics, unscheduledSessions, warnings, validation }`.

Recommended algorithm: sort long sessions and sessions with scarce room types first; enumerate day/start-slot/compatible-room candidates; reject every candidate that breaks a hard constraint; score the remaining candidates; use bounded backtracking/retries if greedy placement gets stuck. For repair, lock all unaffected entries, free the affected sessions, and schedule them into valid openings. A one-level displacement fallback is optional. When no legal placement exists, return `NEEDS_ADMIN_DECISION` with blockers.

## API contract

All HTTP routes use the versioned `/api/v1` prefix. The route names, request shapes and UI mapping in `STITCH_API_INTEGRATION_BLUEPRINT.md` are authoritative; do not use any older unversioned route examples.

- `GET /api/v1/health` -> `{ "ok": true }`
- `GET /api/v1/bootstrap` -> `{ teachers, courses, rooms, timeSlots, sessions, sampleTimetable, scheduleSettings }`
- `POST /api/v1/timetables/generate` request -> `{ "departmentId": "CE", "semesters": [1,2,3], "settingsId": "DEMO_DEFAULT" }`; response -> `GenerateTimetableResult`.
- `GET /api/v1/timetables/:timetableId` -> saved/current timetable result.
- `POST /api/v1/timetables/:timetableId/validate` -> `ValidationResult`.
- `POST /api/v1/timetables/:timetableId/repair` request -> `{ "disruption": { "type": "FACULTY_UNAVAILABLE", "targetId": "T04", "dayCode": "WED", "slotIds": ["WED_P2"], "reason": "Faculty member unavailable" } }`; response -> `RepairTimetableResult` preview. Apply only after user confirmation via `POST /api/v1/timetables/:timetableId/repair/apply` with `{ "changeSetId": "..." }`.

Keep request/response fields camelCase. Use the same TypeScript types on the client and server (place shared types in `shared/contracts.ts`). During parallel development, the frontend should render `sampleTimetable.entries` from `bootstrap.json` in mock mode until the API becomes available.

## Three-developer work split

### Developer 1 — Frontend owner
Owns `client/` and `shared/contracts.ts` (with contract reviewed before implementation).
- Build dashboard: cohort/semester selector, Generate button, weekly grid, legend and metrics.
- Show `LECTURE`, `TUTORIAL`, and `PRACTICAL` blocks with course, teacher and room.
- Add disruption modal for faculty absence / room closure.
- Add repair diff panel: moved entries, old -> new slot, reason, unscheduled count and validation status.
- Implement a `USE_MOCK_DATA=true` mode using `data/bootstrap.json` and render `sampleTimetable.entries`; do not invent API shapes.
- Never implement scheduling rules in React.

### Developer 2 — Backend/API owner
Owns `server/src/routes/`, `server/src/data/`, persistence and validation at the API boundary.
- Set up Node + Express + TypeScript (or plain JavaScript if faster; agree once and don't mix).
- Load bootstrap JSON; validate IDs and course-teacher assignments.
- Implement the API endpoints above and a lightweight in-memory or JSON-file store for the current timetable.
- Call Developer 3's exported scheduling functions; do not duplicate algorithm logic in route handlers.
- Return consistent error objects: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] } }`.

### Developer 3 — Scheduling / implementation owner
Owns `server/src/scheduler/` and scheduler tests.
- Implement session expansion and verify 37 courses / weekly L/T/P totals.
- Implement one central `canPlace(session, day, startSlot, room, entries, context)` function.
- Implement generation, hard-constraint validator and repair routine.
- Provide unit tests for teacher clash, cohort clash, room clash, wrong room type, lunch-spanning lab and successful/impossible repair.
- Return a valid partial result with explicit warnings if the heuristic cannot place every session.

### Fourth teammate — presenter / QA
Keep this person out of core-file edits. Have them own a two-minute demo script, pitch slides, problem/impact story, synthetic data disclaimer and manual acceptance checklist. They can test the app and file issues while the three developers build.

## Six-hour execution schedule

### 0:00-0:20 — Contract freeze
- Import this pack into one shared GitHub repository.
- Agree on Node version, package manager and JSON schemas.
- Confirm IDs, session expansion rules, slot times and endpoint response shapes.
- One person owns each folder. No two people edit the same core file simultaneously.

### 0:20-1:15 — Parallel skeletons
- Frontend: dashboard and timetable grid rendered with mock JSON.
- Backend: project bootstrapped, `/api/v1/health` and `/api/v1/bootstrap` work.
- Scheduler: testable `buildSessionRequirements` and hard-constraint validator.
- Presenter: draft story, slides and seed disruption scenario.

### 1:15-2:45 — First end-to-end timetable
- Frontend renders the 72-entry sample fixture first, then connects to mock or bootstrap API and displays generated entries.
- Backend wires `POST /api/v1/timetables/generate` to the scheduler.
- Scheduler produces a valid schedule and reports unscheduled sessions instead of hiding them.
- Integrate via a single shared result type.

### 2:45-4:00 — Repair feature
- Implement faculty absence and room closure.
- Lock unaffected entries, repair only affected sessions first, show change diff.
- Validate all hard constraints after repair.

### 4:00-5:00 — Reliability pass
- Test teacher collisions across semesters, cohort collision, room collision, lab adjacency/lunch, capacity, and impossible repair.
- Verify the 15-teacher assignment cap and L/T/P totals.
- Add local persistence only if the core flow already works.

### 5:00-6:00 — Demo polish and freeze
- Fix layout problems and loading/error states.
- Rehearse a successful repair and a deliberately impossible repair.
- Presenter demonstrates problem, generated schedule, disruption, repair diff, validation and limitations.
- Stop adding new features during the final 20 minutes.

## Acceptance checklist

- [ ] All 37 syllabus course rows load.
- [ ] Semester totals validate to 30, 33 and 25 contact hours/week.
- [ ] Exactly 15 synthetic teachers load and no teacher has more than three course assignments.
- [ ] Session requirements are generated deterministically from L/T/P.
- [ ] Generated schedule has zero cohort, teacher and room overlaps among scheduled entries.
- [ ] Every room type/capacity constraint is verified.
- [ ] Two-hour sessions do not cross the lunch break.
- [ ] Faculty-absence or room-closure repair shows exactly what moved.
- [ ] Unaffected schedule entries remain fixed in the primary repair attempt.
- [ ] Impossible repairs are surfaced as unresolved; the UI does not show false success.
- [ ] UI clearly labels teacher names, room inventory and mappings as sample demo data.

## AI/tool workflow rules

Use one shared GitHub repo and one chosen coding environment (VS Code or the AI coding editor your team already knows). Google AI Studio can help brainstorm UI copy, test cases or explain algorithms, but it does not replace the deterministic constraint validator. Do not have multiple AI tools rewrite the same folder. Every prompt given to an assistant should include the relevant part of this contract and say: “Do not rename fields, IDs, endpoints or enums; return only changes within my owned files.” Commit working milestones early and keep `main` runnable.
