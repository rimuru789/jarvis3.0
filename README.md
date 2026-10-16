# SlotShield six-hour hackathon starter pack

This pack contains a source-based Computer Engineering course catalogue for Semesters I, II and III, plus clearly synthetic teacher/room/time-slot data for a hackathon MVP.

## Fast start
1. Read `SOLO_START_HERE.md` if one person is doing most/all of the coding.
2. Copy the contents of this folder (not the enclosing folder itself) into the root of the cloned GitHub repo.
3. Read `IMPLEMENTATION_PLAN.md`, `contracts/SHARED_CONTRACT.md`, and `STITCH_API_INTEGRATION_BLUEPRINT.md`. The versioned `/api/v1` paths in the blueprint are authoritative.
4. Treat JSON in `data/*.json` as runtime source data; CSVs are review/export copies, not a second source of truth.
5. Build the MVP in order: render fixture, generate, validate, simulate one disruption, preview/apply repair, then polish.

## Contents
- `data/courses.json` and `courses.csv`: 37 syllabus course records and weekly L/T/P values.
- `data/teachers.json` and `teachers.csv`: 15 synthetic demo faculty members, with a maximum of 3 assigned courses each.
- `data/rooms.json` and `rooms.csv`: synthetic room inventory.
- `data/time-slots.json` and `time-slots.csv`: Monday-Saturday, 7 periods per day, lunch 13:00-14:00.
- `data/session-requirements.json` and `session-requirements.csv`: expanded weekly sessions before placement.
- `data/sample-timetable.json`: a generated, validator-checked sample schedule for the UI mock mode.
- `data/bootstrap.json`: one payload for local mock mode and `GET /api/bootstrap`, including the sample timetable.
- `contracts/SHARED_CONTRACT.md`: types and rules that all 3 developers should follow.

## Validation summary
{
  "1": {
    "courseCount": 14,
    "weeklyHours": {
      "lecture": 16,
      "tutorial": 1,
      "practical": 13,
      "total": 30
    }
  },
  "2": {
    "courseCount": 13,
    "weeklyHours": {
      "lecture": 17,
      "tutorial": 1,
      "practical": 15,
      "total": 33
    }
  },
  "3": {
    "courseCount": 10,
    "weeklyHours": {
      "lecture": 18,
      "tutorial": 1,
      "practical": 6,
      "total": 25
    }
  }
}

Course rows: 37  
Demo teachers: 15  
Rooms: 15  
Weekly session requirements (after practical-hour chunking): 72  
Max assigned courses to any demo teacher: 3

## Important data note
Actual faculty allocations, room inventory, section sizes and official timetable availability were not present in the supplied curriculum PDF. They are placeholders for demonstration only. Do not describe them as official SLRTCE data.

## UI generation and API integration

Use `STITCH_API_INTEGRATION_BLUEPRINT.md` as the current source of truth for the exact `/api/v1` paths, the Stitch screen batches, and the AI Studio/Antigravity prompts. Its versioned API path list supersedes the earlier unversioned API examples in `IMPLEMENTATION_PLAN.md` once the team adopts it. Before parallel coding, make one explicit choice whether the cross-layer course identifier is `courseId` or `subjectId`; do not mix both in API payloads.
