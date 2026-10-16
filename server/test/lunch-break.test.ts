import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type {
  ScheduleSettings,
  TimeSlot,
  TimetableEntry,
  RepairProposal,
} from '../../shared/contracts.js';
import {
  parseTimeToMinutes,
  isValidTimeInterval,
  intervalsOverlap,
  getEffectiveLunchBreak,
  isCohortOverrideActive,
  checkEntryLunchConflict,
} from '../src/scheduler/lunch.js';
import { validateTimetable } from '../src/scheduler/validator.js';
import {
  initStore,
  updateScheduleSettings,
  getScheduleSettings,
  saveRepairProposal,
  applyRepairProposal,
} from '../src/data/store.js';

// Mock schedule settings
function createMockSettings(): ScheduleSettings {
  return {
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    periodsPerDay: 7,
    periods: [
      { periodId: 'P1', startTime: '09:00', endTime: '10:00' },
      { periodId: 'P2', startTime: '10:00', endTime: '11:00' },
      { periodId: 'P3', startTime: '11:00', endTime: '12:00' },
      { periodId: 'P4', startTime: '12:00', endTime: '13:00' },
      { periodId: 'P5', startTime: '14:00', endTime: '15:00' },
      { periodId: 'P6', startTime: '15:00', endTime: '16:00' },
      { periodId: 'P7', startTime: '16:00', endTime: '17:00' },
    ],
    lunchBreak: '13:00-14:00',
    semesterLunchDefaults: {
      '1': { startTime: '13:00', endTime: '14:00' },
      '2': { startTime: '13:00', endTime: '14:00' },
      '3': { startTime: '13:00', endTime: '14:00' },
    },
    cohortLunchOverrides: {},
    cohortSize: 30,
    cohorts: ['CE-S1-A', 'CE-S2-A', 'CE-S3-A'],
    teacherMaxCourseAssignments: 3,
    generationMode: 'HEURISTIC_WITH_HARD_CONSTRAINT_VALIDATION',
  };
}

// Mock time slots for Monday
const mockTimeSlots: TimeSlot[] = [
  { slotId: 'MON_P1', dayCode: 'MON', dayName: 'Monday', periodId: 'P1', periodIndex: 1, startTime: '09:00', endTime: '10:00', nextSlotId: 'MON_P2' },
  { slotId: 'MON_P2', dayCode: 'MON', dayName: 'Monday', periodId: 'P2', periodIndex: 2, startTime: '10:00', endTime: '11:00', nextSlotId: 'MON_P3' },
  { slotId: 'MON_P3', dayCode: 'MON', dayName: 'Monday', periodId: 'P3', periodIndex: 3, startTime: '11:00', endTime: '12:00', nextSlotId: 'MON_P4' },
  { slotId: 'MON_P4', dayCode: 'MON', dayName: 'Monday', periodId: 'P4', periodIndex: 4, startTime: '12:00', endTime: '13:00', nextSlotId: null },
  { slotId: 'MON_P5', dayCode: 'MON', dayName: 'Monday', periodId: 'P5', periodIndex: 5, startTime: '14:00', endTime: '15:00', nextSlotId: 'MON_P6' },
  { slotId: 'MON_P6', dayCode: 'MON', dayName: 'Monday', periodId: 'P6', periodIndex: 6, startTime: '15:00', endTime: '16:00', nextSlotId: 'MON_P7' },
  { slotId: 'MON_P7', dayCode: 'MON', dayName: 'Monday', periodId: 'P7', periodIndex: 7, startTime: '16:00', endTime: '17:00', nextSlotId: null },
];

const mockTimeSlotsMap = new Map(mockTimeSlots.map((ts) => [ts.slotId, ts]));

describe('SlotShield Lunch Break Constraints', () => {
  it('A session entirely before lunch is allowed', () => {
    const settings = createMockSettings();
    const entry: TimetableEntry = {
      entryId: 'E-001',
      sessionId: 'S-12111101-LEC-01',
      courseId: '12111101',
      semester: 1,
      cohortId: 'CE-S1-A',
      teacherId: 'T01',
      roomId: 'C101',
      dayCode: 'MON',
      startSlotId: 'MON_P4', // 12:00-13:00, lunch is 13:00-14:00
      durationSlots: 1,
      status: 'SCHEDULED',
      changeReason: null,
    };

    const conflictCheck = checkEntryLunchConflict(entry, settings, mockTimeSlotsMap);
    assert.strictEqual(conflictCheck.hasConflict, false);

    const val = validateTimetable([entry], { settings, timeSlots: mockTimeSlots });
    assert.strictEqual(val.valid, true);
    assert.strictEqual(val.hardConflictCount, 0);
  });

  it('A session entirely after lunch is allowed', () => {
    const settings = createMockSettings();
    const entry: TimetableEntry = {
      entryId: 'E-002',
      sessionId: 'S-12111101-LEC-02',
      courseId: '12111101',
      semester: 1,
      cohortId: 'CE-S1-A',
      teacherId: 'T01',
      roomId: 'C101',
      dayCode: 'MON',
      startSlotId: 'MON_P5', // 14:00-15:00, lunch is 13:00-14:00
      durationSlots: 1,
      status: 'SCHEDULED',
      changeReason: null,
    };

    const conflictCheck = checkEntryLunchConflict(entry, settings, mockTimeSlotsMap);
    assert.strictEqual(conflictCheck.hasConflict, false);

    const val = validateTimetable([entry], { settings, timeSlots: mockTimeSlots });
    assert.strictEqual(val.valid, true);
    assert.strictEqual(val.hardConflictCount, 0);
  });

  it('A session overlapping lunch is rejected', () => {
    const settings = createMockSettings();
    // Suppose Cohort CE-S2-A has an early lunch override 12:00-13:00
    settings.cohortLunchOverrides = {
      'CE-S2-A': { startTime: '12:00', endTime: '13:00' },
    };

    // A session placed at MON_P4 (12:00-13:00) overlaps this cohort's lunch!
    const entry: TimetableEntry = {
      entryId: 'E-003',
      sessionId: 'S-22111101-LEC-01',
      courseId: '22111101',
      semester: 2,
      cohortId: 'CE-S2-A',
      teacherId: 'T02',
      roomId: 'C102',
      dayCode: 'MON',
      startSlotId: 'MON_P4', // 12:00-13:00
      durationSlots: 1,
      status: 'SCHEDULED',
      changeReason: null,
    };

    const conflictCheck = checkEntryLunchConflict(entry, settings, mockTimeSlotsMap);
    assert.strictEqual(conflictCheck.hasConflict, true);
    assert.ok(conflictCheck.reason?.includes('overlaps effective lunch interval'));

    const val = validateTimetable([entry], { settings, timeSlots: mockTimeSlots });
    assert.strictEqual(val.valid, false);
    assert.strictEqual(val.hardConflictCount, 1);
    assert.strictEqual(val.conflicts[0].code, 'LUNCH_BREAK_OVERLAP');
    assert.strictEqual(val.conflicts[0].cohortId, 'CE-S2-A');
  });

  it('A multi-slot session crossing lunch is rejected', () => {
    const settings = createMockSettings();
    // Entry at MON_P4 with duration 2 slots (nextSlotId is null because lunch intervenes)
    const entry: TimetableEntry = {
      entryId: 'E-004',
      sessionId: 'S-12111101-PRA-01',
      courseId: '12111101',
      semester: 1,
      cohortId: 'CE-S1-A',
      teacherId: 'T01',
      roomId: 'C101',
      dayCode: 'MON',
      startSlotId: 'MON_P4', // 12:00-13:00, duration 2 would cross into 13:00-14:00 lunch
      durationSlots: 2,
      status: 'SCHEDULED',
      changeReason: null,
    };

    const val = validateTimetable([entry], { settings, timeSlots: mockTimeSlots });
    assert.strictEqual(val.valid, false);
    // Should flag multi-slot discontinuous and lunch break overlap
    const conflictCodes = val.conflicts.map((c) => c.code);
    assert.ok(conflictCodes.includes('MULTI_SLOT_DISCONTINUOUS') || conflictCodes.includes('LUNCH_BREAK_OVERLAP'));
  });

  it('A cohort override takes precedence over its semester default', () => {
    const settings = createMockSettings();
    settings.semesterLunchDefaults = {
      '1': { startTime: '13:00', endTime: '14:00' },
    };
    settings.cohortLunchOverrides = {
      'CE-S1-A': { startTime: '12:30', endTime: '13:30' },
    };

    const resolved = getEffectiveLunchBreak(settings, 'CE-S1-A', 1);
    assert.strictEqual(resolved.startTime, '12:30');
    assert.strictEqual(resolved.endTime, '13:30');
    assert.strictEqual(isCohortOverrideActive(settings, 'CE-S1-A'), true);
  });

  it('A cohort without an override inherits its semester default', () => {
    const settings = createMockSettings();
    settings.semesterLunchDefaults = {
      '1': { startTime: '12:00', endTime: '13:00' },
      '2': { startTime: '13:00', endTime: '14:00' },
    };
    settings.cohortLunchOverrides = {};

    const resolvedSem1 = getEffectiveLunchBreak(settings, 'CE-S1-A', 1);
    assert.strictEqual(resolvedSem1.startTime, '12:00');
    assert.strictEqual(resolvedSem1.endTime, '13:00');
    assert.strictEqual(isCohortOverrideActive(settings, 'CE-S1-A'), false);

    const resolvedSem2 = getEffectiveLunchBreak(settings, 'CE-S2-A', 2);
    assert.strictEqual(resolvedSem2.startTime, '13:00');
    assert.strictEqual(resolvedSem2.endTime, '14:00');
    assert.strictEqual(isCohortOverrideActive(settings, 'CE-S2-A'), false);
  });

  it('Different cohorts can have different lunch intervals', () => {
    const settings = createMockSettings();
    settings.semesterLunchDefaults = {
      '1': { startTime: '12:00', endTime: '13:00' },
      '2': { startTime: '13:00', endTime: '14:00' },
      '3': { startTime: '13:30', endTime: '14:30' },
    };
    settings.cohortLunchOverrides = {
      'CE-S1-B': { startTime: '11:30', endTime: '12:30' },
    };

    const lunchS1A = getEffectiveLunchBreak(settings, 'CE-S1-A', 1);
    const lunchS1B = getEffectiveLunchBreak(settings, 'CE-S1-B', 1);
    const lunchS2A = getEffectiveLunchBreak(settings, 'CE-S2-A', 2);
    const lunchS3A = getEffectiveLunchBreak(settings, 'CE-S3-A', 3);

    assert.deepStrictEqual(lunchS1A, { startTime: '12:00', endTime: '13:00' });
    assert.deepStrictEqual(lunchS1B, { startTime: '11:30', endTime: '12:30' });
    assert.deepStrictEqual(lunchS2A, { startTime: '13:00', endTime: '14:00' });
    assert.deepStrictEqual(lunchS3A, { startTime: '13:30', endTime: '14:30' });
  });

  it('Repair cannot apply a timetable with a lunch violation', () => {
    initStore();
    const settings = getScheduleSettings();

    // Create an invalid proposal that has a lunch violation
    const invalidProposal: RepairProposal = {
      changeSetId: 'CHANGESET-TEST-INVALID-LUNCH',
      timetableId: 'DEMO-TIMETABLE-001',
      disruption: {
        type: 'FACULTY_UNAVAILABLE',
        targetId: 'T01',
        dayCode: 'MON',
        slotIds: ['MON_P1'],
      },
      entries: [
        {
          entryId: 'E-TEST-01',
          sessionId: 'S-TEST',
          courseId: '12111101',
          semester: 1,
          cohortId: 'CE-S1-A',
          teacherId: 'T01',
          roomId: 'C101',
          dayCode: 'MON',
          startSlotId: 'MON_P4',
          durationSlots: 2, // Crosses lunch
          status: 'SCHEDULED',
          changeReason: 'Relocated during repair',
        },
      ],
      changes: [],
      metrics: {
        scheduledSessionCount: 1,
        unscheduledSessionCount: 0,
        movedEntryCount: 1,
        hardConflictCount: 1,
        preservedEntryPercent: 90,
      },
      unscheduledSessions: [],
      warnings: [],
      validation: {
        valid: false,
        hardConflictCount: 1,
        conflicts: [
          {
            code: 'LUNCH_BREAK_OVERLAP',
            message: 'Session overlaps lunch break',
            entryIds: ['E-TEST-01'],
          },
        ],
      },
    };

    saveRepairProposal(invalidProposal);

    assert.throws(() => {
      applyRepairProposal('DEMO-TIMETABLE-001', 'CHANGESET-TEST-INVALID-LUNCH');
    }, /Cannot apply repair proposal: proposal contains \d+ hard constraint violation/);
  });

  it('Invalid time ranges are rejected', () => {
    // 1. End before start
    assert.strictEqual(isValidTimeInterval({ startTime: '14:00', endTime: '13:00' }), false);
    // 2. Equal times (zero duration)
    assert.strictEqual(isValidTimeInterval({ startTime: '13:00', endTime: '13:00' }), false);
    // 3. Malformed time strings
    assert.strictEqual(isValidTimeInterval({ startTime: '25:00', endTime: '26:00' }), false);
    assert.strictEqual(isValidTimeInterval({ startTime: 'invalid', endTime: '14:00' }), false);
    assert.strictEqual(isValidTimeInterval({ startTime: '', endTime: '' }), false);

    // 4. Updating store with invalid range throws
    initStore();
    assert.throws(() => {
      updateScheduleSettings({
        semesterLunchDefaults: {
          '1': { startTime: '14:00', endTime: '13:00' }, // invalid: end before start
        },
      });
    }, /Invalid time interval/);
  });
});
