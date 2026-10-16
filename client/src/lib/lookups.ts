/**
 * SlotShield — shared lookups and formatting helpers for the UI screens.
 * Pure functions only: no network calls, no state.
 */
import type {
  BootstrapPayload,
  Course,
  LunchBreakInterval,
  PeriodDefinition,
  Room,
  ScheduleSettings,
  Teacher,
  TimeSlot,
  TimetableEntry,
} from './api.ts';

export type SessionKind = 'LECTURE' | 'TUTORIAL' | 'PRACTICAL';

export interface Lookups {
  courseById: Map<string, Course>;
  teacherById: Map<string, Teacher>;
  roomById: Map<string, Room>;
  slotById: Map<string, TimeSlot>;
}

export function buildLookups(data: BootstrapPayload): Lookups {
  return {
    courseById: new Map(data.courses.map((c) => [c.courseId, c])),
    teacherById: new Map(data.teachers.map((t) => [t.teacherId, t])),
    roomById: new Map(data.rooms.map((r) => [r.roomId, r])),
    slotById: new Map(data.timeSlots.map((s) => [s.slotId, s])),
  };
}

/** Session kind is encoded in the session id, e.g. "S1-12122110-PRA-01". */
export function sessionKindOf(entry: TimetableEntry): SessionKind {
  const sid = entry.sessionId;
  if (sid.includes('-TUT-')) return 'TUTORIAL';
  if (sid.includes('-PRA-')) return 'PRACTICAL';
  return 'LECTURE';
}

export const SESSION_TAG: Record<SessionKind, string> = {
  LECTURE: 'LEC',
  TUTORIAL: 'TUT',
  PRACTICAL: 'LAB',
};

/** "Demo Faculty 10 — Data structures" -> "Demo Faculty 10" */
export function shortTeacherName(displayName: string): string {
  return displayName.split('—')[0].trim();
}

/** "CE-S2-A" -> 2 */
export function semesterOfCohort(cohortId: string): number | undefined {
  const m = cohortId.match(/S(\d)/i);
  return m ? Number(m[1]) : undefined;
}

/** "CE-S2-A" -> "Sec A" */
export function sectionLabel(cohortId: string): string {
  const m = cohortId.match(/-([A-Z])$/);
  return m ? `Sec ${m[1]}` : cohortId;
}

const ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };
export function romanSemester(n: number | undefined): string {
  return n === undefined ? '' : ROMAN[n] ?? String(n);
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function toHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function intervalsOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && e1 > s2;
}

/** Start/end time of a session that begins at `startSlotId` and spans `durationSlots` periods. */
export function sessionTimeRange(
  startSlotId: string,
  durationSlots: number,
  slotById: Map<string, TimeSlot>
): { start: string; end: string } | null {
  const first = slotById.get(startSlotId);
  if (!first) return null;
  let last: TimeSlot = first;
  for (let i = 1; i < durationSlots && last.nextSlotId; i++) {
    const next = slotById.get(last.nextSlotId);
    if (!next) break;
    last = next;
  }
  return { start: first.startTime, end: last.endTime };
}

export function formatRange(range: { start: string; end: string } | null): string {
  return range ? `${range.start} – ${range.end}` : 'Unknown time';
}

/** Lunch interval that applies to a cohort, honouring overrides then semester defaults. */
export function effectiveLunchFor(
  settings: ScheduleSettings,
  cohortId: string
): LunchBreakInterval & { isOverride: boolean } {
  const override = settings.cohortLunchOverrides?.[cohortId];
  if (override && override.startTime && override.endTime) {
    return { ...override, isOverride: true };
  }
  const sem = semesterOfCohort(cohortId);
  const def = sem !== undefined ? settings.semesterLunchDefaults?.[String(sem)] : undefined;
  if (def && def.startTime && def.endTime) {
    return { ...def, isOverride: false };
  }
  if (settings.lunchBreak && settings.lunchBreak.includes('-')) {
    const [startTime, endTime] = settings.lunchBreak.split('-').map((s) => s.trim());
    return { startTime, endTime, isOverride: false };
  }
  return { startTime: '13:00', endTime: '14:00', isOverride: false };
}

/** Hourly lunch-window presets spanning the configured periods. */
export function lunchPresets(periods: PeriodDefinition[]): { key: string; start: string; end: string }[] {
  if (periods.length === 0) return [];
  const minStart = Math.min(...periods.map((p) => toMinutes(p.startTime)));
  const maxEnd = Math.max(...periods.map((p) => toMinutes(p.endTime)));
  const out: { key: string; start: string; end: string }[] = [];
  for (let t = Math.floor(minStart / 60) * 60; t + 60 <= maxEnd; t += 60) {
    const start = toHHMM(t);
    const end = toHHMM(t + 60);
    out.push({ key: `${start}-${end}`, start, end });
  }
  return out;
}
