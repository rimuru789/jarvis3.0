/**
 * SlotShield — Client-side shared types
 * Re-exports from the shared contracts for use in React components.
 */

// Re-export all types from shared contracts
export type {
  DayCode,
  SessionType,
  RoomType,
  DisruptionType,
  EntryStatus,
  SessionStatus,
  WeeklyHours,
  Course,
  Teacher,
  Room,
  TimeSlot,
  SessionRequirement,
  TimetableEntry,
  ConflictDetail,
  ValidationResult,
  Metrics,
  TimetableResult,
  Disruption,
  TimetableChange,
  RepairProposal,
  PeriodDefinition,
  LunchBreakInterval,
  ScheduleSettings,
  ScheduleSettingsPatch,
  SemesterSummary,
  BootstrapPayload,
  ApiError,
} from '../../../shared/contracts.js';
