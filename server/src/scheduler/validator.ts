/**
 * SlotShield — Central Timetable Validator
 * Validates hard constraints:
 * 1. Effective lunch break violations (cohort override or semester default)
 * 2. Multi-slot continuity (cannot span lunch or disconnected periods)
 * 3. Cohort collisions (overlapping sessions in the same cohort)
 * 4. Teacher collisions across all semesters
 * 5. Room collisions across all cohorts
 * 6. Room type compatibility
 * 7. Room capacity
 */
import type {
  TimetableEntry,
  ValidationResult,
  ConflictDetail,
  ScheduleSettings,
  TimeSlot,
  Room,
  Teacher,
  Course,
  SessionRequirement,
} from '../../../shared/contracts.js';
import { checkEntryLunchConflict, getSessionTimeRange, intervalsOverlap } from './lunch.js';

export interface ValidationContext {
  settings: ScheduleSettings;
  timeSlots: TimeSlot[];
  rooms?: Room[];
  teachers?: Teacher[];
  courses?: Course[];
  sessions?: SessionRequirement[];
}

export function validateTimetable(
  entries: TimetableEntry[],
  context: ValidationContext
): ValidationResult {
  const conflicts: ConflictDetail[] = [];
  const { settings, timeSlots } = context;

  const timeSlotsMap = new Map<string, TimeSlot>(timeSlots.map((ts) => [ts.slotId, ts]));
  const roomsMap = context.rooms ? new Map<string, Room>(context.rooms.map((r) => [r.roomId, r])) : null;
  const sessionsMap = context.sessions
    ? new Map<string, SessionRequirement>(context.sessions.map((s) => [s.sessionId, s]))
    : null;

  // Pre-calculate session intervals and slot chains for all entries
  interface EntryRuntime {
    entry: TimetableEntry;
    interval: { startTime: string; endTime: string } | null;
    slotIds: string[];
  }

  const runtimes: EntryRuntime[] = [];

  for (const entry of entries) {
    const startSlot = timeSlotsMap.get(entry.startSlotId);
    if (!startSlot) {
      conflicts.push({
        code: 'INVALID_SLOT',
        message: `Entry "${entry.entryId}" references non-existent slotId "${entry.startSlotId}".`,
        entryIds: [entry.entryId],
        cohortId: entry.cohortId,
        sessionId: entry.sessionId,
        dayCode: entry.dayCode,
        constraint: 'INVALID_SLOT',
      });
      continue;
    }

    const interval = getSessionTimeRange(entry, timeSlotsMap);
    const slotIds: string[] = [entry.startSlotId];

    // Check multi-slot continuity
    if (entry.durationSlots > 1) {
      let curr = startSlot;
      for (let i = 1; i < entry.durationSlots; i++) {
        if (!curr.nextSlotId) {
          conflicts.push({
            code: 'MULTI_SLOT_DISCONTINUOUS',
            message: `Multi-slot entry "${entry.entryId}" (${entry.sessionId}) starting at ${entry.startSlotId} has no contiguous following period (nextSlotId is null, e.g. crosses lunch break).`,
            entryIds: [entry.entryId],
            cohortId: entry.cohortId,
            sessionId: entry.sessionId,
            dayCode: entry.dayCode,
            constraint: 'MULTI_SLOT_DISCONTINUOUS',
          });
          break;
        }
        const next = timeSlotsMap.get(curr.nextSlotId);
        if (!next) {
          conflicts.push({
            code: 'MULTI_SLOT_DISCONTINUOUS',
            message: `Multi-slot entry "${entry.entryId}" references missing following slot "${curr.nextSlotId}".`,
            entryIds: [entry.entryId],
            cohortId: entry.cohortId,
            sessionId: entry.sessionId,
            dayCode: entry.dayCode,
            constraint: 'MULTI_SLOT_DISCONTINUOUS',
          });
          break;
        }
        slotIds.push(next.slotId);
        curr = next;
      }
    }

    // 1. Mandatory Hard Constraint: Effective Lunch Break Check
    const lunchCheck = checkEntryLunchConflict(entry, settings, timeSlotsMap);
    if (lunchCheck.hasConflict) {
      conflicts.push({
        code: 'LUNCH_BREAK_OVERLAP',
        message: lunchCheck.reason || `Session ${entry.sessionId} overlaps effective lunch break.`,
        entryIds: [entry.entryId],
        cohortId: entry.cohortId,
        sessionId: entry.sessionId,
        dayCode: entry.dayCode,
        time: interval ? `${interval.startTime}-${interval.endTime}` : undefined,
        constraint: 'LUNCH_BREAK_OVERLAP',
      });
    }

    // Room requirements check
    if (roomsMap && sessionsMap) {
      const room = roomsMap.get(entry.roomId);
      const session = sessionsMap.get(entry.sessionId);
      if (room && session) {
        if (!session.requiredRoomTypes.includes(room.roomType)) {
          conflicts.push({
            code: 'ROOM_TYPE_MISMATCH',
            message: `Entry "${entry.entryId}" placed in room "${entry.roomId}" (${room.roomType}) which does not match required room types [${session.requiredRoomTypes.join(', ')}].`,
            entryIds: [entry.entryId],
            cohortId: entry.cohortId,
            sessionId: entry.sessionId,
            dayCode: entry.dayCode,
            constraint: 'ROOM_TYPE_MISMATCH',
          });
        }
        const cohortSize = settings.cohortSize || 30;
        if (room.capacity < cohortSize) {
          conflicts.push({
            code: 'ROOM_CAPACITY_EXCEEDED',
            message: `Room "${entry.roomId}" capacity (${room.capacity}) is below cohort size (${cohortSize}).`,
            entryIds: [entry.entryId],
            cohortId: entry.cohortId,
            sessionId: entry.sessionId,
            dayCode: entry.dayCode,
            constraint: 'ROOM_CAPACITY_EXCEEDED',
          });
        }
      }
    }

    runtimes.push({ entry, interval, slotIds });
  }

  // Cross-entry collisions (Pairwise comparison on same day)
  for (let i = 0; i < runtimes.length; i++) {
    for (let j = i + 1; j < runtimes.length; j++) {
      const a = runtimes[i];
      const b = runtimes[j];

      // Must be on the same day to clash
      if (a.entry.dayCode !== b.entry.dayCode) continue;
      if (!a.interval || !b.interval) continue;

      // Check if intervals overlap
      const overlaps = intervalsOverlap(a.interval, b.interval);
      if (!overlaps) continue;

      // 1. Cohort clash
      if (a.entry.cohortId === b.entry.cohortId) {
        conflicts.push({
          code: 'COHORT_CLASH',
          message: `Cohort "${a.entry.cohortId}" double-booked on ${a.entry.dayCode} between ${a.interval.startTime} and ${a.interval.endTime}.`,
          entryIds: [a.entry.entryId, b.entry.entryId],
          cohortId: a.entry.cohortId,
          dayCode: a.entry.dayCode,
          time: `${a.interval.startTime}-${a.interval.endTime}`,
          constraint: 'COHORT_CLASH',
        });
      }

      // 2. Teacher clash (across ALL semesters!)
      if (a.entry.teacherId && a.entry.teacherId === b.entry.teacherId) {
        conflicts.push({
          code: 'TEACHER_CLASH',
          message: `Teacher "${a.entry.teacherId}" double-booked on ${a.entry.dayCode} between ${a.interval.startTime} and ${a.interval.endTime} (Sem ${a.entry.semester} vs Sem ${b.entry.semester}).`,
          entryIds: [a.entry.entryId, b.entry.entryId],
          dayCode: a.entry.dayCode,
          time: `${a.interval.startTime}-${a.interval.endTime}`,
          constraint: 'TEACHER_CLASH',
        });
      }

      // 3. Room clash
      if (a.entry.roomId && a.entry.roomId === b.entry.roomId) {
        conflicts.push({
          code: 'ROOM_CLASH',
          message: `Room "${a.entry.roomId}" double-booked on ${a.entry.dayCode} between ${a.interval.startTime} and ${a.interval.endTime}.`,
          entryIds: [a.entry.entryId, b.entry.entryId],
          dayCode: a.entry.dayCode,
          time: `${a.interval.startTime}-${a.interval.endTime}`,
          constraint: 'ROOM_CLASH',
        });
      }
    }
  }

  return {
    valid: conflicts.length === 0,
    hardConflictCount: conflicts.length,
    conflicts,
  };
}
