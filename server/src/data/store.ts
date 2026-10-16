/**
 * SlotShield — In-memory timetable and settings store
 * Stores generated/saved timetable versions and active schedule settings.
 */
import type {
  TimetableResult,
  ScheduleSettings,
  ScheduleSettingsPatch,
  RepairProposal,
  LunchBreakInterval,
} from '../../../shared/contracts.js';
import { getSampleTimetable, getBootstrapData } from './loader.js';
import { isValidTimeInterval } from '../scheduler/lunch.js';

const timetables = new Map<string, TimetableResult>();
const repairProposals = new Map<string, RepairProposal>();
let _settings: ScheduleSettings | null = null;

/** Initialize store with sample timetable and schedule settings */
export function initStore(): void {
  if (timetables.size === 0) {
    const sample = getSampleTimetable();
    timetables.set(sample.timetableId, sample);
  }
  if (!_settings) {
    _settings = JSON.parse(JSON.stringify(getBootstrapData().scheduleSettings));
  }
}

/** Get all stored timetable summaries */
export function listTimetables(): Array<{
  timetableId: string;
  status: string | undefined;
  generatedAt: string | undefined;
  scheduledCount: number;
  unscheduledCount: number;
  conflictCount: number;
}> {
  initStore();
  return Array.from(timetables.values()).map((tt) => ({
    timetableId: tt.timetableId,
    status: tt.status,
    generatedAt: tt.generatedAt,
    scheduledCount: tt.metrics.scheduledSessionCount,
    unscheduledCount: tt.metrics.unscheduledSessionCount,
    conflictCount: tt.metrics.hardConflictCount,
  }));
}

/** Get a single timetable by ID */
export function getTimetable(id: string): TimetableResult | undefined {
  initStore();
  return timetables.get(id);
}

/** Store a timetable */
export function saveTimetable(tt: TimetableResult): void {
  initStore();
  timetables.set(tt.timetableId, tt);
}

/** Get active schedule settings */
export function getScheduleSettings(): ScheduleSettings {
  initStore();
  return _settings!;
}

/** Update schedule settings */
export function updateScheduleSettings(patch: ScheduleSettingsPatch): ScheduleSettings {
  initStore();
  const current = _settings!;

  // Validate intervals if provided
  if (patch.semesterLunchDefaults) {
    for (const [sem, interval] of Object.entries(patch.semesterLunchDefaults)) {
      if (interval && !isValidTimeInterval(interval)) {
        throw new Error(`Invalid time interval for semester ${sem} default: "${interval?.startTime}" to "${interval?.endTime}". Start time must be before end time.`);
      }
    }
  }

  if (patch.cohortLunchOverrides) {
    for (const [cohortId, interval] of Object.entries(patch.cohortLunchOverrides)) {
      if (interval !== null && interval !== undefined) {
        if (!isValidTimeInterval(interval)) {
          throw new Error(`Invalid time interval for cohort ${cohortId} override: "${interval?.startTime}" to "${interval?.endTime}". Start time must be before end time.`);
        }
      }
    }
  }

  // Merge top-level scalar / array fields
  if (patch.days) current.days = patch.days;
  if (patch.periodsPerDay) current.periodsPerDay = patch.periodsPerDay;
  if (patch.periods) current.periods = patch.periods;
  if (patch.lunchBreak) current.lunchBreak = patch.lunchBreak;
  if (patch.cohortSize) current.cohortSize = patch.cohortSize;
  if (patch.cohorts) current.cohorts = patch.cohorts;
  if (patch.teacherMaxCourseAssignments) current.teacherMaxCourseAssignments = patch.teacherMaxCourseAssignments;
  if (patch.generationMode) current.generationMode = patch.generationMode;

  // Merge semesterLunchDefaults
  if (patch.semesterLunchDefaults) {
    current.semesterLunchDefaults = {
      ...(current.semesterLunchDefaults || {}),
      ...patch.semesterLunchDefaults,
    };
  }

  // Merge cohortLunchOverrides (allow null / undefined to clear override)
  if (patch.cohortLunchOverrides) {
    const nextOverrides: Record<string, LunchBreakInterval> = {
      ...(current.cohortLunchOverrides || {}),
    };
    for (const [cohortId, interval] of Object.entries(patch.cohortLunchOverrides)) {
      if (interval === null || interval === undefined) {
        delete nextOverrides[cohortId];
      } else {
        nextOverrides[cohortId] = interval;
      }
    }
    current.cohortLunchOverrides = nextOverrides;
  }

  _settings = current;
  return _settings;
}

/** Save a repair preview proposal */
export function saveRepairProposal(proposal: RepairProposal): void {
  repairProposals.set(proposal.changeSetId, proposal);
}

/** Retrieve a previously generated repair proposal */
export function getRepairProposal(changeSetId: string): RepairProposal | undefined {
  return repairProposals.get(changeSetId);
}

/** Apply a previously validated repair proposal to active timetables */
export function applyRepairProposal(timetableId: string, changeSetId: string): TimetableResult {
  initStore();
  const proposal = repairProposals.get(changeSetId);
  if (!proposal) {
    throw new Error(`Change set "${changeSetId}" not found or expired. Please generate a new repair preview.`);
  }

  if (proposal.timetableId !== timetableId) {
    throw new Error(`Change set "${changeSetId}" belongs to timetable "${proposal.timetableId}", not "${timetableId}".`);
  }

  // Must not apply if hard conflicts remain
  if (!proposal.validation.valid || proposal.validation.hardConflictCount > 0) {
    throw new Error(`Cannot apply repair proposal: proposal contains ${proposal.validation.hardConflictCount} hard constraint violation(s).`);
  }

  const updatedTimetable: TimetableResult = {
    timetableId,
    status: 'REPAIRED',
    generatedAt: new Date().toISOString(),
    entries: proposal.entries,
    metrics: proposal.metrics,
    validation: proposal.validation,
    warnings: proposal.warnings,
    unscheduledSessions: proposal.unscheduledSessions,
  };

  timetables.set(timetableId, updatedTimetable);
  // Clean up used proposal
  repairProposals.delete(changeSetId);

  return updatedTimetable;
}
