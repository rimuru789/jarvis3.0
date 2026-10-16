/**
 * SlotShield — In-memory timetable store
 * Stores generated/saved timetable versions in memory.
 * For the demo MVP, the sample timetable is pre-loaded.
 */
import type { TimetableResult } from '../../../shared/contracts.js';
import { getSampleTimetable } from './loader.js';

const timetables = new Map<string, TimetableResult>();

/** Initialize store with the sample timetable */
export function initStore(): void {
  const sample = getSampleTimetable();
  timetables.set(sample.timetableId, sample);
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
  return timetables.get(id);
}

/** Store a timetable */
export function saveTimetable(tt: TimetableResult): void {
  timetables.set(tt.timetableId, tt);
}
