/**
 * SlotShield — Shared contracts
 * Canonical cross-layer TypeScript types.
 * Source of truth: contracts/SHARED_CONTRACT.md
 */

// ─── Enums / Literal Unions ─────────────────────────────────────────

export type DayCode = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
export type SessionType = 'LECTURE' | 'TUTORIAL' | 'PRACTICAL';
export type RoomType =
  | 'CLASSROOM'
  | 'COMPUTER_LAB'
  | 'MECHANICS_LAB'
  | 'PHYSICS_LAB'
  | 'GRAPHICS_LAB'
  | 'IDEA_LAB'
  | 'WORKSHOP'
  | 'MULTIPURPOSE';
export type DisruptionType = 'FACULTY_UNAVAILABLE' | 'ROOM_UNAVAILABLE';
export type EntryStatus = 'SCHEDULED' | 'UNSCHEDULED_CONFLICT' | 'NEEDS_ADMIN_DECISION';
export type SessionStatus = 'UNSCHEDULED';

// ─── Core Entities ──────────────────────────────────────────────────

export interface WeeklyHours {
  lecture: number;
  tutorial: number;
  practical: number;
}

export interface Course {
  courseId: string;
  courseCode: string;
  courseType: string;
  courseName: string;
  semester: 1 | 2 | 3;
  cohortId: string;
  assignedTeacherId: string;
  weeklyHours: WeeklyHours;
  roomRequirements: Record<SessionType, RoomType[]>;
  source: string;
  teacherAssignmentStatus: 'SYNTHETIC_DEMO_ASSIGNMENT';
}

export interface Teacher {
  teacherId: string;
  displayName: string;
  specialty: string;
  maxCourseAssignments: 3;
  availability: string;
  isSyntheticDemoData: true;
}

export interface Room {
  roomId: string;
  displayName: string;
  roomType: RoomType;
  capacity: number;
}

export interface TimeSlot {
  slotId: string;
  dayCode: DayCode;
  dayName: string;
  periodId: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  nextSlotId: string | null;
}

export interface SessionRequirement {
  sessionId: string;
  courseId: string;
  semester: 1 | 2 | 3;
  cohortId: string;
  teacherId: string;
  sessionType: SessionType;
  durationSlots: 1 | 2;
  requiredRoomTypes: RoomType[];
  weeklyOccurrence: number;
  status: 'UNSCHEDULED';
}

export interface TimetableEntry {
  entryId: string;
  sessionId: string;
  courseId: string;
  semester: 1 | 2 | 3;
  cohortId: string;
  teacherId: string;
  roomId: string;
  dayCode: DayCode;
  startSlotId: string;
  durationSlots: 1 | 2;
  status: EntryStatus;
  changeReason: string | null;
}

// ─── Results ────────────────────────────────────────────────────────

export interface ConflictDetail {
  code: string;
  message: string;
  entryIds: string[];
  cohortId?: string;
  sessionId?: string;
  dayCode?: string;
  time?: string;
  constraint?: string;
}

export interface ValidationResult {
  valid: boolean;
  hardConflictCount: number;
  conflicts: ConflictDetail[];
}

export interface Metrics {
  scheduledSessionCount: number;
  unscheduledSessionCount: number;
  movedEntryCount: number;
  hardConflictCount: number;
  preservedEntryPercent: number | null;
}

export interface TimetableResult {
  timetableId: string;
  status?: string;
  generatedAt?: string;
  entries: TimetableEntry[];
  metrics: Metrics;
  validation: ValidationResult;
  warnings: string[];
  unscheduledSessions?: SessionRequirement[];
}

// ─── Disruption & Repair ────────────────────────────────────────────

export interface Disruption {
  type: DisruptionType;
  targetId: string;
  dayCode: DayCode;
  slotIds: string[];
  reason?: string;
}

export interface TimetableChange {
  entryId: string;
  sessionId: string;
  cohortId: string;
  oldDayCode: DayCode;
  oldStartSlotId: string;
  oldRoomId: string;
  newDayCode: DayCode;
  newStartSlotId: string;
  newRoomId: string;
  reason: string;
}

export interface RepairProposal {
  changeSetId: string;
  timetableId: string;
  disruption: Disruption;
  entries: TimetableEntry[];
  changes: TimetableChange[];
  metrics: Metrics;
  unscheduledSessions: SessionRequirement[];
  warnings: string[];
  validation: ValidationResult;
}

// ─── Schedule Settings ──────────────────────────────────────────────

export interface PeriodDefinition {
  periodId: string;
  startTime: string;
  endTime: string;
}

export interface LunchBreakInterval {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface ScheduleSettings {
  days: DayCode[];
  periodsPerDay: number;
  periods: PeriodDefinition[];
  lunchBreak: string;
  semesterLunchDefaults?: Record<string, LunchBreakInterval>;
  cohortLunchOverrides?: Record<string, LunchBreakInterval>;
  cohortSize: number;
  cohorts: string[];
  teacherMaxCourseAssignments: number;
  generationMode: string;
}

export interface ScheduleSettingsPatch {
  days?: DayCode[];
  periodsPerDay?: number;
  periods?: PeriodDefinition[];
  lunchBreak?: string;
  semesterLunchDefaults?: Record<string, LunchBreakInterval>;
  cohortLunchOverrides?: Record<string, LunchBreakInterval | null>;
  cohortSize?: number;
  cohorts?: string[];
  teacherMaxCourseAssignments?: number;
  generationMode?: string;
}

export interface SemesterSummary {
  courseCount: number;
  weeklyHours: {
    lecture: number;
    tutorial: number;
    practical: number;
    total: number;
  };
}

// ─── Bootstrap ──────────────────────────────────────────────────────

export interface BootstrapPayload {
  projectName: string;
  dataStatus: string;
  curriculumSource: string;
  scheduleSettings: ScheduleSettings;
  summary: Record<string, SemesterSummary>;
  teachers: Teacher[];
  courses: Course[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  sessions: SessionRequirement[];
  sampleTimetable: TimetableResult;
}

// ─── API Error ──────────────────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}
