/**
 * SlotShield — Lunch Break Resolution and Overlap Logic
 * Pure functions for cohort-specific lunch breaks and hard constraint validation.
 */
import type {
  ScheduleSettings,
  LunchBreakInterval,
  TimeSlot,
  TimetableEntry,
} from '../../../shared/contracts.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Parses "HH:mm" to minutes since midnight (0-1439).
 * Returns NaN if string is invalid.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !TIME_REGEX.test(timeStr.trim())) {
    return NaN;
  }
  const [h, m] = timeStr.trim().split(':').map(Number);
  return h * 60 + m;
}

/**
 * Formats minutes since midnight to "HH:mm".
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Validates whether an interval has valid HH:mm formatting and startTime < endTime.
 */
export function isValidTimeInterval(interval: { startTime: string; endTime: string }): boolean {
  if (!interval || typeof interval !== 'object') return false;
  const start = parseTimeToMinutes(interval.startTime);
  const end = parseTimeToMinutes(interval.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start < end;
}

/**
 * Returns true if two time intervals [startA, endA] and [startB, endB] overlap.
 * Touching boundaries (e.g. endA === startB) is NOT an overlap.
 */
export function intervalsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  const startA = parseTimeToMinutes(a.startTime);
  const endA = parseTimeToMinutes(a.endTime);
  const startB = parseTimeToMinutes(b.startTime);
  const endB = parseTimeToMinutes(b.endTime);

  if (Number.isNaN(startA) || Number.isNaN(endA) || Number.isNaN(startB) || Number.isNaN(endB)) {
    return false;
  }

  return startA < endB && endA > startB;
}

/**
 * Checks whether a cohort has an active override configured in settings.
 */
export function isCohortOverrideActive(settings: ScheduleSettings, cohortId: string): boolean {
  if (!settings.cohortLunchOverrides) return false;
  const override = settings.cohortLunchOverrides[cohortId];
  return Boolean(override && isValidTimeInterval(override));
}

/**
 * Resolves the effective lunch interval for a given cohort and optional semester.
 * Precedence:
 * 1. Cohort-level override (if valid)
 * 2. Semester-level default (if valid)
 * 3. Schedule-level lunchBreak string (e.g. "13:00-14:00")
 * 4. Default fallback: 13:00-14:00
 */
export function getEffectiveLunchBreak(
  settings: ScheduleSettings,
  cohortId: string,
  semester?: number
): LunchBreakInterval {
  // 1. Cohort override
  if (settings.cohortLunchOverrides && settings.cohortLunchOverrides[cohortId]) {
    const override = settings.cohortLunchOverrides[cohortId];
    if (isValidTimeInterval(override)) {
      return { startTime: override.startTime, endTime: override.endTime };
    }
  }

  // Determine semester number: explicit or inferred from cohortId (e.g. "CE-S1-A" -> 1)
  let sem = semester;
  if (!sem && cohortId) {
    const match = cohortId.match(/S(\d)/i);
    if (match) {
      sem = parseInt(match[1], 10);
    }
  }

  // 2. Semester default
  if (sem && settings.semesterLunchDefaults) {
    const semKey = String(sem);
    const semDefault = settings.semesterLunchDefaults[semKey];
    if (semDefault && isValidTimeInterval(semDefault)) {
      return { startTime: semDefault.startTime, endTime: semDefault.endTime };
    }
  }

  // 3. Global lunchBreak string if present (e.g. "13:00-14:00")
  if (settings.lunchBreak && typeof settings.lunchBreak === 'string' && settings.lunchBreak.includes('-')) {
    const [start, end] = settings.lunchBreak.split('-').map((s) => s.trim());
    if (start && end && isValidTimeInterval({ startTime: start, endTime: end })) {
      return { startTime: start, endTime: end };
    }
  }

  // 4. Canonical fallback
  return { startTime: '13:00', endTime: '14:00' };
}

/**
 * Resolves the total clock time range for a session given its start slot and duration.
 */
export function getSessionTimeRange(
  entry: { startSlotId: string; durationSlots: number },
  timeSlotsMap: Map<string, TimeSlot>
): { startTime: string; endTime: string } | null {
  const startSlot = timeSlotsMap.get(entry.startSlotId);
  if (!startSlot) return null;

  if (entry.durationSlots === 1) {
    return { startTime: startSlot.startTime, endTime: startSlot.endTime };
  }

  // Multi-slot: resolve following contiguous slots
  let currentSlot: TimeSlot | undefined = startSlot;
  for (let i = 1; i < entry.durationSlots; i++) {
    if (!currentSlot.nextSlotId) {
      // Slot does not have a contiguous successor in data
      // Approximate endTime using duration hours
      const startMin = parseTimeToMinutes(startSlot.startTime);
      if (!Number.isNaN(startMin)) {
        return {
          startTime: startSlot.startTime,
          endTime: formatMinutesToTime(startMin + entry.durationSlots * 60),
        };
      }
      return { startTime: startSlot.startTime, endTime: currentSlot.endTime };
    }
    currentSlot = timeSlotsMap.get(currentSlot.nextSlotId);
    if (!currentSlot) {
      return { startTime: startSlot.startTime, endTime: startSlot.endTime };
    }
  }

  return { startTime: startSlot.startTime, endTime: currentSlot.endTime };
}

/**
 * Validates a single timetable entry against the effective lunch break for its cohort.
 */
export function checkEntryLunchConflict(
  entry: TimetableEntry,
  settings: ScheduleSettings,
  timeSlotsMap: Map<string, TimeSlot>
): {
  hasConflict: boolean;
  effectiveLunch: LunchBreakInterval;
  sessionInterval: { startTime: string; endTime: string } | null;
  reason?: string;
} {
  const effectiveLunch = getEffectiveLunchBreak(settings, entry.cohortId, entry.semester);
  const sessionInterval = getSessionTimeRange(entry, timeSlotsMap);

  if (!sessionInterval) {
    return {
      hasConflict: true,
      effectiveLunch,
      sessionInterval: null,
      reason: `Slot "${entry.startSlotId}" not found in calendar time slots.`,
    };
  }

  const overlaps = intervalsOverlap(sessionInterval, effectiveLunch);
  if (overlaps) {
    const isOverride = isCohortOverrideActive(settings, entry.cohortId);
    const sourceLabel = isOverride ? 'cohort override' : 'semester default';
    return {
      hasConflict: true,
      effectiveLunch,
      sessionInterval,
      reason: `Cohort ${entry.cohortId} session ${entry.sessionId} (${entry.dayCode} ${sessionInterval.startTime}–${sessionInterval.endTime}) overlaps effective lunch interval (${effectiveLunch.startTime}–${effectiveLunch.endTime}, via ${sourceLabel}).`,
    };
  }

  return {
    hasConflict: false,
    effectiveLunch,
    sessionInterval,
  };
}
