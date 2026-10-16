/**
 * SlotShield — Deterministic Timetable Generator
 * Schedules sessions while strictly respecting hard constraints:
 * - Cohort-specific effective lunch breaks
 * - Cohort, teacher, and room exclusivity
 * - Multi-slot continuity
 * - Room type and capacity requirements
 */
import type {
  Course,
  Teacher,
  Room,
  TimeSlot,
  SessionRequirement,
  ScheduleSettings,
  TimetableEntry,
  TimetableResult,
  Metrics,
  DayCode,
} from '../../../shared/contracts.js';
import { getEffectiveLunchBreak, intervalsOverlap, formatMinutesToTime, parseTimeToMinutes } from './lunch.js';
import { validateTimetable } from './validator.js';

export interface GenerateTimetableInput {
  semesters?: number[];
  departmentId?: string;
  courses: Course[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  sessions: SessionRequirement[];
  settings: ScheduleSettings;
}

export function generateTimetable(input: GenerateTimetableInput): TimetableResult {
  const {
    semesters = [1, 2, 3],
    courses,
    teachers,
    rooms,
    timeSlots,
    sessions,
    settings,
  } = input;

  const selectedSemSet = new Set<number>(semesters);
  const timeSlotsMap = new Map<string, TimeSlot>(timeSlots.map((ts) => [ts.slotId, ts]));
  const roomsById = new Map<string, Room>(rooms.map((r) => [r.roomId, r]));

  // Filter sessions by selected semesters
  const activeSessions = sessions.filter((s) => selectedSemSet.has(s.semester));

  // Sort sessions: Multi-slot (practicals with specific lab requirements) first, then tutorials, then lectures
  const sortedSessions = [...activeSessions].sort((a, b) => {
    if (b.durationSlots !== a.durationSlots) {
      return b.durationSlots - a.durationSlots; // 2 slots before 1 slot
    }
    if (a.sessionType === 'PRACTICAL' && b.sessionType !== 'PRACTICAL') return -1;
    if (b.sessionType === 'PRACTICAL' && a.sessionType !== 'PRACTICAL') return 1;
    return a.sessionId.localeCompare(b.sessionId);
  });

  const scheduledEntries: TimetableEntry[] = [];
  const unscheduledSessions: SessionRequirement[] = [];
  const warnings: string[] = [];

  // Tracking maps for occupied intervals on each day
  interface OccupiedSlot {
    dayCode: DayCode;
    startTime: string;
    endTime: string;
  }

  const cohortBookings = new Map<string, OccupiedSlot[]>();
  const teacherBookings = new Map<string, OccupiedSlot[]>();
  const roomBookings = new Map<string, OccupiedSlot[]>();

  function isBooked(
    bookings: Map<string, OccupiedSlot[]>,
    key: string,
    dayCode: DayCode,
    interval: { startTime: string; endTime: string }
  ): boolean {
    const list = bookings.get(key);
    if (!list) return false;
    return list.some(
      (b) => b.dayCode === dayCode && intervalsOverlap(b, interval)
    );
  }

  function addBooking(
    bookings: Map<string, OccupiedSlot[]>,
    key: string,
    dayCode: DayCode,
    interval: { startTime: string; endTime: string }
  ) {
    if (!bookings.has(key)) {
      bookings.set(key, []);
    }
    bookings.get(key)!.push({ dayCode, ...interval });
  }

  // Pre-filter candidate starting slots
  const validDays = settings.days && settings.days.length > 0
    ? settings.days
    : (['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as DayCode[]);

  let entrySequence = 1;

  for (const session of sortedSessions) {
    let placed = false;
    const effectiveLunch = getEffectiveLunchBreak(settings, session.cohortId, session.semester);

    // Compatible rooms
    const compatibleRooms = rooms.filter((r) => {
      const typeMatches = session.requiredRoomTypes.includes(r.roomType);
      const capMatches = r.capacity >= (settings.cohortSize || 30);
      return typeMatches && capMatches;
    });

    if (compatibleRooms.length === 0) {
      unscheduledSessions.push(session);
      warnings.push(`Session ${session.sessionId}: No compatible rooms matching requirements [${session.requiredRoomTypes.join(', ')}].`);
      continue;
    }

    // Try candidates across days and time slots
    dayLoop: for (const dayCode of validDays) {
      // Find candidate slots for this day
      const daySlots = timeSlots
        .filter((ts) => ts.dayCode === dayCode)
        .sort((a, b) => a.periodIndex - b.periodIndex);

      for (const startSlot of daySlots) {
        // Multi-slot chain check
        let interval: { startTime: string; endTime: string } | null = null;
        if (session.durationSlots === 1) {
          interval = { startTime: startSlot.startTime, endTime: startSlot.endTime };
        } else {
          // Duration 2: check if next slot exists and is contiguous
          if (!startSlot.nextSlotId) continue;
          const nextSlot = timeSlotsMap.get(startSlot.nextSlotId);
          if (!nextSlot || nextSlot.dayCode !== dayCode) continue;
          interval = { startTime: startSlot.startTime, endTime: nextSlot.endTime };
        }

        // HARD CONSTRAINT: Cannot overlap cohort's effective lunch break!
        if (intervalsOverlap(interval, effectiveLunch)) {
          continue;
        }

        // HARD CONSTRAINT: Cohort cannot be double-booked
        if (isBooked(cohortBookings, session.cohortId, dayCode, interval)) {
          continue;
        }

        // HARD CONSTRAINT: Teacher cannot be double-booked
        if (session.teacherId && isBooked(teacherBookings, session.teacherId, dayCode, interval)) {
          continue;
        }

        // Find available room
        for (const room of compatibleRooms) {
          if (!isBooked(roomBookings, room.roomId, dayCode, interval)) {
            // Found a valid placement!
            const entryId = `E-${entrySequence.toString().padStart(4, '0')}`;
            entrySequence++;

            const entry: TimetableEntry = {
              entryId,
              sessionId: session.sessionId,
              courseId: session.courseId,
              semester: session.semester,
              cohortId: session.cohortId,
              teacherId: session.teacherId,
              roomId: room.roomId,
              dayCode,
              startSlotId: startSlot.slotId,
              durationSlots: session.durationSlots,
              status: 'SCHEDULED',
              changeReason: null,
            };

            scheduledEntries.push(entry);
            addBooking(cohortBookings, session.cohortId, dayCode, interval);
            if (session.teacherId) {
              addBooking(teacherBookings, session.teacherId, dayCode, interval);
            }
            addBooking(roomBookings, room.roomId, dayCode, interval);

            placed = true;
            break dayLoop;
          }
        }
      }
    }

    if (!placed) {
      unscheduledSessions.push(session);
      warnings.push(`Session ${session.sessionId} (${session.cohortId}): Could not find clash-free slot respecting lunch (${effectiveLunch.startTime}-${effectiveLunch.endTime}) and room constraints.`);
    }
  }

  // Validate full generated schedule
  const validation = validateTimetable(scheduledEntries, {
    settings,
    timeSlots,
    rooms,
    teachers,
    courses,
    sessions,
  });

  const metrics: Metrics = {
    scheduledSessionCount: scheduledEntries.length,
    unscheduledSessionCount: unscheduledSessions.length,
    movedEntryCount: 0,
    hardConflictCount: validation.hardConflictCount,
    preservedEntryPercent: null,
  };

  const timetableId = `TT-GEN-${Date.now()}`;

  return {
    timetableId,
    status: validation.valid && unscheduledSessions.length === 0 ? 'VALID_COMPLETE' : 'INCOMPLETE',
    generatedAt: new Date().toISOString(),
    entries: scheduledEntries,
    metrics,
    validation,
    warnings,
    unscheduledSessions,
  };
}
