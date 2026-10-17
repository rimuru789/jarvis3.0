/**
 * SlotShield — Frontend API wrapper
 * All frontend network calls live here.
 * Components must not call fetch() directly.
 *
 * Uses Vite dev server proxy → backend at /api/v1.
 */
import type {
  BootstrapPayload,
  TimetableEntry,
  TimetableResult,
  ValidationResult,
  ConflictDetail,
  Metrics,
  Disruption,
  DisruptionType,
  DayCode,
  SessionType,
  RoomType,
  SemesterSummary,
  TimetableChange,
  RepairProposal,
  ScheduleSettings,
  ScheduleSettingsPatch,
  LunchBreakInterval,
  PeriodDefinition,
  Course,
  Teacher,
  Room,
  TimeSlot,
  SessionRequirement,
} from './contracts.js';

export type {
  BootstrapPayload,
  TimetableEntry,
  TimetableResult,
  ValidationResult,
  ConflictDetail,
  Metrics,
  Disruption,
  DisruptionType,
  DayCode,
  SessionType,
  RoomType,
  SemesterSummary,
  TimetableChange,
  RepairProposal,
  ScheduleSettings,
  ScheduleSettingsPatch,
  LunchBreakInterval,
  PeriodDefinition,
  Course,
  Teacher,
  Room,
  TimeSlot,
  SessionRequirement,
};

const API_BASE = '/api/v1';

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
      errorBody = (await res.json()) as ApiErrorResponse;
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

export async function getScheduleSettings(): Promise<ScheduleSettings> {
  return apiFetch('/schedule-settings');
}

export async function updateScheduleSettings(
  patch: ScheduleSettingsPatch
): Promise<ScheduleSettings> {
  return apiFetch('/schedule-settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function getTimetables(): Promise<{ timetables: TimetableListItem[] }> {
  return apiFetch('/timetables');
}

export async function getTimetable(timetableId: string): Promise<TimetableResult> {
  return apiFetch(`/timetables/${encodeURIComponent(timetableId)}`);
}

export async function generateTimetable(input?: {
  semesters?: number[];
  departmentId?: string;
}): Promise<TimetableResult> {
  return apiFetch('/timetables/generate', {
    method: 'POST',
    body: JSON.stringify(input || {}),
  });
}

export async function validateTimetable(
  timetableId: string,
  entries?: TimetableEntry[]
): Promise<ValidationResult> {
  return apiFetch(`/timetables/${encodeURIComponent(timetableId)}/validate`, {
    method: 'POST',
    body: JSON.stringify({ entries }),
  });
}

export async function repairTimetable(
  timetableId: string,
  input: { disruption: Disruption }
): Promise<RepairProposal> {
  return apiFetch(`/timetables/${encodeURIComponent(timetableId)}/repair`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function applyRepair(
  timetableId: string,
  changeSetId: string
): Promise<TimetableResult> {
  return apiFetch(`/timetables/${encodeURIComponent(timetableId)}/repair/apply`, {
    method: 'POST',
    body: JSON.stringify({ changeSetId }),
  });
}
