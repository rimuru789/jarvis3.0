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

export interface ValidationResult {
  valid: boolean;
  hardConflictCount: number;
  conflicts: Array<{ code: string; message: string; entryIds: string[] }>;
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

// ─── Schedule Settings ──────────────────────────────────────────────

export interface PeriodDefinition {
  periodId: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleSettings {
  days: DayCode[];
  periodsPerDay: number;
  periods: PeriodDefinition[];
  lunchBreak: string;
  cohortSize: number;
  cohorts: string[];
  teacherMaxCourseAssignments: number;
  generationMode: string;
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
