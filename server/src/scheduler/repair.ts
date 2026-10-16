/**
 * SlotShield — Disruption Repair Engine
 * Pure function that generates repair proposals without mutating active state.
 * Strictly enforces effective lunch breaks and clash constraints.
 */
import type {
  Disruption,
  RepairProposal,
  TimetableChange,
  TimetableEntry,
  TimetableResult,
  SessionRequirement,
  Course,
  Teacher,
  Room,
  TimeSlot,
  ScheduleSettings,
  Metrics,
  DayCode,
} from '../../../shared/contracts.js';
import { getEffectiveLunchBreak, intervalsOverlap } from './lunch.js';
import { validateTimetable } from './validator.js';

export interface RepairTimetableInput {
  currentTimetable: TimetableResult;
  disruption: Disruption;
  courses: Course[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  sessions: SessionRequirement[];
  settings: ScheduleSettings;
}

export function repairTimetable(input: RepairTimetableInput): RepairProposal {
  const {
    currentTimetable,
    disruption,
    courses,
    teachers,
    rooms,
    timeSlots,
    sessions,
    settings,
  } = input;

  const changeSetId = `CHANGESET-${Date.now()}`;
  const timeSlotsMap = new Map<string, TimeSlot>(timeSlots.map((ts) => [ts.slotId, ts]));
  const sessionsMap = new Map<string, SessionRequirement>(sessions.map((s) => [s.sessionId, s]));

  // Deep clone entries
  const proposedEntries: TimetableEntry[] = currentTimetable.entries.map((e) => ({ ...e }));
  const changes: TimetableChange[] = [];
  const warnings: string[] = [];
  const unscheduledSessions: SessionRequirement[] = [];

  // Identify affected entries
  const affectedEntryIndices: number[] = [];
  for (let i = 0; i < proposedEntries.length; i++) {
    const e = proposedEntries[i];
    if (e.dayCode !== disruption.dayCode) continue;

    const startSlot = timeSlotsMap.get(e.startSlotId);
    if (!startSlot) continue;

    // Check if slotIds in disruption include startSlotId or any subsequent multi-slot period
    const entrySlotIds = [e.startSlotId];
    if (e.durationSlots > 1 && startSlot.nextSlotId) {
      entrySlotIds.push(startSlot.nextSlotId);
    }

    const slotMatches = entrySlotIds.some((sid) => disruption.slotIds.includes(sid));
    if (!slotMatches) continue;

    if (disruption.type === 'FACULTY_UNAVAILABLE' && e.teacherId === disruption.targetId) {
      affectedEntryIndices.push(i);
    } else if (disruption.type === 'ROOM_UNAVAILABLE' && e.roomId === disruption.targetId) {
      affectedEntryIndices.push(i);
    }
  }

  // If no entries are affected, return early
  if (affectedEntryIndices.length === 0) {
    const val = validateTimetable(proposedEntries, { settings, timeSlots, rooms, teachers, courses, sessions });
    return {
      changeSetId,
      timetableId: currentTimetable.timetableId,
      disruption,
      entries: proposedEntries,
      changes: [],
      metrics: {
        scheduledSessionCount: proposedEntries.filter((e) => e.status === 'SCHEDULED').length,
        unscheduledSessionCount: 0,
        movedEntryCount: 0,
        hardConflictCount: val.hardConflictCount,
        preservedEntryPercent: 100,
      },
      unscheduledSessions: [],
      warnings: ['Disruption does not affect any active scheduled entries.'],
      validation: val,
    };
  }

  // Index unaffected entries to know locked times
  interface OccupiedSlot {
    dayCode: DayCode;
    startTime: string;
    endTime: string;
  }

  const cohortBookings = new Map<string, OccupiedSlot[]>();
  const teacherBookings = new Map<string, OccupiedSlot[]>();
  const roomBookings = new Map<string, OccupiedSlot[]>();

  function addBooking(bookings: Map<string, OccupiedSlot[]>, key: string, dayCode: DayCode, interval: { startTime: string; endTime: string }) {
    if (!bookings.has(key)) bookings.set(key, []);
    bookings.get(key)!.push({ dayCode, ...interval });
  }

  function isBooked(bookings: Map<string, OccupiedSlot[]>, key: string, dayCode: DayCode, interval: { startTime: string; endTime: string }): boolean {
    const list = bookings.get(key);
    if (!list) return false;
    return list.some((b) => b.dayCode === dayCode && intervalsOverlap(b, interval));
  }

  for (let i = 0; i < proposedEntries.length; i++) {
    if (affectedEntryIndices.includes(i)) continue; // skip affected entries for now
    const e = proposedEntries[i];
    const slot = timeSlotsMap.get(e.startSlotId);
    if (!slot) continue;

    let endSlot = slot;
    if (e.durationSlots > 1 && slot.nextSlotId) {
      const next = timeSlotsMap.get(slot.nextSlotId);
      if (next) endSlot = next;
    }
    const interval = { startTime: slot.startTime, endTime: endSlot.endTime };

    addBooking(cohortBookings, e.cohortId, e.dayCode, interval);
    if (e.teacherId) addBooking(teacherBookings, e.teacherId, e.dayCode, interval);
    addBooking(roomBookings, e.roomId, e.dayCode, interval);
  }

  // Attempt to relocate affected entries
  const validDays = settings.days && settings.days.length > 0
    ? settings.days
    : (['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayCode[]);

  for (const idx of affectedEntryIndices) {
    const entry = proposedEntries[idx];
    const session = sessionsMap.get(entry.sessionId);
    const effectiveLunch = getEffectiveLunchBreak(settings, entry.cohortId, entry.semester);

    const oldDayCode = entry.dayCode;
    const oldStartSlotId = entry.startSlotId;
    const oldRoomId = entry.roomId;

    let relocated = false;

    // Compatible rooms
    const compatibleRooms = rooms.filter((r) => {
      if (session) {
        if (!session.requiredRoomTypes.includes(r.roomType)) return false;
      }
      return r.capacity >= (settings.cohortSize || 30);
    });

    // Try finding another opening
    searchDays: for (const dayCode of validDays) {
      const daySlots = timeSlots
        .filter((ts) => ts.dayCode === dayCode)
        .sort((a, b) => a.periodIndex - b.periodIndex);

      for (const startSlot of daySlots) {
        // Must not be the exact disrupted target
        if (dayCode === disruption.dayCode) {
          if (disruption.slotIds.includes(startSlot.slotId)) {
            if (disruption.type === 'FACULTY_UNAVAILABLE' && entry.teacherId === disruption.targetId) {
              continue;
            }
          }
        }

        let interval: { startTime: string; endTime: string } | null = null;
        if (entry.durationSlots === 1) {
          interval = { startTime: startSlot.startTime, endTime: startSlot.endTime };
        } else {
          if (!startSlot.nextSlotId) continue;
          const nextSlot = timeSlotsMap.get(startSlot.nextSlotId);
          if (!nextSlot || nextSlot.dayCode !== dayCode) continue;
          interval = { startTime: startSlot.startTime, endTime: nextSlot.endTime };
        }

        // HARD CONSTRAINT: Never overlap effective lunch break!
        if (intervalsOverlap(interval, effectiveLunch)) {
          continue;
        }

        // HARD CONSTRAINT: Cohort free
        if (isBooked(cohortBookings, entry.cohortId, dayCode, interval)) {
          continue;
        }

        // HARD CONSTRAINT: Teacher free (and not disrupted)
        if (entry.teacherId) {
          if (dayCode === disruption.dayCode && disruption.type === 'FACULTY_UNAVAILABLE' && entry.teacherId === disruption.targetId && disruption.slotIds.includes(startSlot.slotId)) {
            continue;
          }
          if (isBooked(teacherBookings, entry.teacherId, dayCode, interval)) {
            continue;
          }
        }

        // Room check
        for (const room of compatibleRooms) {
          if (dayCode === disruption.dayCode && disruption.type === 'ROOM_UNAVAILABLE' && room.roomId === disruption.targetId && disruption.slotIds.includes(startSlot.slotId)) {
            continue;
          }
          if (isBooked(roomBookings, room.roomId, dayCode, interval)) {
            continue;
          }

          // Found valid replacement slot and room!
          entry.dayCode = dayCode;
          entry.startSlotId = startSlot.slotId;
          entry.roomId = room.roomId;
          entry.status = 'SCHEDULED';
          entry.changeReason = disruption.reason || `Relocated due to ${disruption.type}`;

          addBooking(cohortBookings, entry.cohortId, dayCode, interval);
          if (entry.teacherId) addBooking(teacherBookings, entry.teacherId, dayCode, interval);
          addBooking(roomBookings, room.roomId, dayCode, interval);

          changes.push({
            entryId: entry.entryId,
            sessionId: entry.sessionId,
            cohortId: entry.cohortId,
            oldDayCode,
            oldStartSlotId,
            oldRoomId,
            newDayCode: dayCode,
            newStartSlotId: startSlot.slotId,
            newRoomId: room.roomId,
            reason: entry.changeReason,
          });

          relocated = true;
          break searchDays;
        }
      }
    }

    if (!relocated) {
      entry.status = 'UNSCHEDULED_CONFLICT';
      entry.changeReason = `Cannot reschedule without violating hard constraints (disruption: ${disruption.type})`;
      if (session) unscheduledSessions.push(session);
      warnings.push(`Could not relocate entry ${entry.entryId} (${entry.sessionId}) without violating constraints.`);
    }
  }

  // Validate the proposal
  const validation = validateTimetable(proposedEntries, {
    settings,
    timeSlots,
    rooms,
    teachers,
    courses,
    sessions,
  });

  const totalEntries = proposedEntries.length;
  const movedCount = changes.length;
  const preservedPercent = totalEntries > 0
    ? Math.round(((totalEntries - movedCount) / totalEntries) * 100)
    : 100;

  const metrics: Metrics = {
    scheduledSessionCount: proposedEntries.filter((e) => e.status === 'SCHEDULED').length,
    unscheduledSessionCount: proposedEntries.filter((e) => e.status !== 'SCHEDULED').length,
    movedEntryCount: movedCount,
    hardConflictCount: validation.hardConflictCount,
    preservedEntryPercent: preservedPercent,
  };

  return {
    changeSetId,
    timetableId: currentTimetable.timetableId,
    disruption,
    entries: proposedEntries,
    changes,
    metrics,
    unscheduledSessions,
    warnings,
    validation,
  };
}
