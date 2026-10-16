/**
 * SlotShield — Frontend API wrapper
 * All frontend network calls live here.
 * Components must not call fetch() directly.
 * 
 * Uses Vite dev server proxy → backend at /api/v1.
 */

const API_BASE = '/api/v1';

// ─── Shared types ───────────────────────────────────────────────────

export interface BootstrapPayload {
  projectName: string;
  dataStatus: string;
  curriculumSource: string;
  scheduleSettings: {
    days: string[];
    periodsPerDay: number;
    periods: Array<{ periodId: string; startTime: string; endTime: string }>;
    lunchBreak: string;
    cohortSize: number;
    cohorts: string[];
    teacherMaxCourseAssignments: number;
    generationMode: string;
  };
  summary: Record<string, {
    courseCount: number;
    weeklyHours: { lecture: number; tutorial: number; practical: number; total: number };
  }>;
  teachers: Array<{
    teacherId: string;
    displayName: string;
    specialty: string;
    maxCourseAssignments: number;
    availability: string;
    isSyntheticDemoData: boolean;
  }>;
  courses: Array<{
    courseId: string;
    courseCode: string;
    courseType: string;
    courseName: string;
    semester: 1 | 2 | 3;
    cohortId: string;
    assignedTeacherId: string;
    weeklyHours: { lecture: number; tutorial: number; practical: number };
    roomRequirements: Record<string, string[]>;
    source: string;
    teacherAssignmentStatus: string;
  }>;
  rooms: Array<{
    roomId: string;
    displayName: string;
    roomType: string;
    capacity: number;
  }>;
  timeSlots: Array<{
    slotId: string;
    dayCode: string;
    dayName: string;
    periodId: string;
    periodIndex: number;
    startTime: string;
    endTime: string;
    nextSlotId: string | null;
  }>;
  sessions: Array<{
    sessionId: string;
    courseId: string;
    semester: 1 | 2 | 3;
    cohortId: string;
    teacherId: string;
    sessionType: string;
    durationSlots: number;
    requiredRoomTypes: string[];
    weeklyOccurrence: number;
    status: string;
  }>;
  sampleTimetable: TimetableResult;
}

export interface TimetableEntry {
  entryId: string;
  sessionId: string;
  courseId: string;
  semester: 1 | 2 | 3;
  cohortId: string;
  teacherId: string;
  roomId: string;
  dayCode: string;
  startSlotId: string;
  durationSlots: number;
  status: string;
  changeReason: string | null;
}

export interface TimetableResult {
  timetableId: string;
  status?: string;
  generatedAt?: string;
  entries: TimetableEntry[];
  metrics: {
    scheduledSessionCount: number;
    unscheduledSessionCount: number;
    movedEntryCount: number;
    hardConflictCount: number;
    preservedEntryPercent: number | null;
  };
  validation: {
    valid: boolean;
    hardConflictCount: number;
    conflicts: Array<{ code: string; message: string; entryIds: string[] }>;
  };
  warnings: string[];
}

export interface TimetableListItem {
  timetableId: string;
  status: string | undefined;
  generatedAt: string | undefined;
  scheduledCount: number;
  unscheduledCount: number;
  conflictCount: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

// ─── Error class ────────────────────────────────────────────────────

export class ApiError extends Error {
  code: string;
  details: unknown[];

  constructor(code: string, message: string, details: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// ─── Fetch wrapper ──────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorBody: ApiErrorResponse | null = null;
    try {
      errorBody = await res.json() as ApiErrorResponse;
    } catch {
      // response body not JSON
    }
    if (errorBody?.error) {
      throw new ApiError(
        errorBody.error.code,
        errorBody.error.message,
        errorBody.error.details
      );
    }
    throw new ApiError(
      'HTTP_ERROR',
      `Request failed: ${res.status} ${res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

// ─── API wrapper functions (names from STITCH_API_INTEGRATION_BLUEPRINT) ──

export async function getHealthCheck(): Promise<{ ok: boolean }> {
  return apiFetch('/health');
}

export async function getBootstrap(): Promise<BootstrapPayload> {
  return apiFetch('/bootstrap');
}

export async function getTimetables(): Promise<{ timetables: TimetableListItem[] }> {
  return apiFetch('/timetables');
}

export async function getTimetable(timetableId: string): Promise<TimetableResult> {
  return apiFetch(`/timetables/${encodeURIComponent(timetableId)}`);
}
