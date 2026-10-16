# SlotShield Shared Contract (freeze before parallel coding)

## Canonical types

```ts
export type DayCode = 'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT';
export type SessionType = 'LECTURE'|'TUTORIAL'|'PRACTICAL';
export type RoomType = 'CLASSROOM'|'COMPUTER_LAB'|'MECHANICS_LAB'|'PHYSICS_LAB'|'GRAPHICS_LAB'|'IDEA_LAB'|'WORKSHOP'|'MULTIPURPOSE';
export type DisruptionType = 'FACULTY_UNAVAILABLE'|'ROOM_UNAVAILABLE';

export interface WeeklyHours { lecture:number; tutorial:number; practical:number }
export interface Course {
  courseId:string; courseCode:string; courseType:string; courseName:string;
  semester:1|2|3; cohortId:string; assignedTeacherId:string;
  weeklyHours:WeeklyHours;
  roomRequirements:Record<SessionType, RoomType[]>;
  source:string; teacherAssignmentStatus:'SYNTHETIC_DEMO_ASSIGNMENT';
}
export interface Teacher { teacherId:string; displayName:string; specialty:string; maxCourseAssignments:3; availability:string; isSyntheticDemoData:true }
export interface Room { roomId:string; displayName:string; roomType:RoomType; capacity:number }
export interface TimeSlot { slotId:string; dayCode:DayCode; dayName:string; periodId:string; periodIndex:number; startTime:string; endTime:string; nextSlotId:string|null }
export interface SessionRequirement {
  sessionId:string; courseId:string; semester:1|2|3; cohortId:string; teacherId:string;
  sessionType:SessionType; durationSlots:1|2; requiredRoomTypes:RoomType[];
  weeklyOccurrence:number; status:'UNSCHEDULED';
}
export interface TimetableEntry {
  entryId:string; sessionId:string; courseId:string; semester:1|2|3; cohortId:string;
  teacherId:string; roomId:string; dayCode:DayCode; startSlotId:string;
  durationSlots:1|2; status:'SCHEDULED'|'UNSCHEDULED_CONFLICT'|'NEEDS_ADMIN_DECISION';
  changeReason:string|null;
}
export interface ValidationResult { valid:boolean; hardConflictCount:number; conflicts:Array<{code:string;message:string;entryIds:string[]}> }
export interface Metrics { scheduledSessionCount:number; unscheduledSessionCount:number; movedEntryCount:number; hardConflictCount:number; preservedEntryPercent:number|null }
```

## Non-negotiable implementation boundaries

- Frontend calls API/mock adapter only; no schedule validity logic in components.
- Express routes validate input and call scheduler exports; routes must not contain placement loops.
- Scheduler is pure/testable and operates on explicit arrays; no React or Express imports.
- `courses.json` is source of truth for teaching loads and assigned teacher. `session-requirements.json` is a generated seed snapshot for mock UI; scheduler tests must be able to regenerate it from courses and compare equivalence.
- All IDs are strings. Do not convert course codes to numbers (leading zeros may matter in future data).
- Never mark `valid: true` if any hard conflict remains.

## UI/API integration source of truth

For the exact versioned HTTP methods/paths, UI-to-endpoint map, Stitch screen batches and AI Studio/Antigravity prompts, see [`../STITCH_API_INTEGRATION_BLUEPRINT.md`](../STITCH_API_INTEGRATION_BLUEPRINT.md). Adopt its `/api/v1` route names; it supersedes the earlier unversioned API examples in `IMPLEMENTATION_PLAN.md`. The API intentionally retains the starter pack's `courseId` and numeric `semester` properties across the demo.
