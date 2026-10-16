/**
 * SlotShield — TimetableGrid
 * Renders a weekly timetable grid with day rows and period columns.
 * Shows session cards colored by type (Lecture/Tutorial/Practical).
 * Displays one grid per cohort when multiple semesters are selected.
 */
import type { TimetableEntry } from '../lib/api.ts';
import { useMemo } from 'react';

interface TimeSlotInfo {
  slotId: string;
  dayCode: string;
  dayName: string;
  periodId: string;
  periodIndex: number;
  startTime: string;
  endTime: string;
  nextSlotId: string | null;
}

interface ScheduleSettingsInfo {
  days: string[];
  periodsPerDay: number;
  periods: Array<{ periodId: string; startTime: string; endTime: string }>;
  lunchBreak: string;
}

interface TimetableGridProps {
  entries: TimetableEntry[];
  timeSlots: TimeSlotInfo[];
  scheduleSettings: ScheduleSettingsInfo;
  courseNameMap: Record<string, string>;
  courseCodeMap: Record<string, string>;
  teacherNameMap: Record<string, string>;
  roomNameMap: Record<string, string>;
  getSessionType: (entry: TimetableEntry) => string;
}

const DAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const DAY_SHORT: Record<string, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

export function TimetableGrid({
  entries,
  timeSlots,
  scheduleSettings,
  courseNameMap,
  courseCodeMap,
  teacherNameMap,
  roomNameMap,
  getSessionType,
}: TimetableGridProps) {
  const days = scheduleSettings.days;
  const periods = scheduleSettings.periods;

  // Group entries by cohortId
  const entriesByCohort = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.cohortId) || [];
      list.push(entry);
      map.set(entry.cohortId, list);
    }
    return map;
  }, [entries]);

  // Build a lookup: slotId → entry for each cohort
  // For 2-slot sessions, the entry appears in both slots
  const buildSlotMap = (cohortEntries: TimetableEntry[]) => {
    const slotMap = new Map<string, TimetableEntry>();
    const occupiedByMultiSlot = new Set<string>(); // second slots of 2-slot entries

    for (const entry of cohortEntries) {
      slotMap.set(entry.startSlotId, entry);

      if (entry.durationSlots === 2) {
        // Find the next slot from timeSlots data
        const startSlot = timeSlots.find(
          (ts) => ts.slotId === entry.startSlotId
        );
        if (startSlot?.nextSlotId) {
          occupiedByMultiSlot.add(startSlot.nextSlotId);
        }
      }
    }

    return { slotMap, occupiedByMultiSlot };
  };

  // Determine lunch period (P4 → 12:00-13:00 is the last before lunch)
  const lunchPeriodIndex = periods.findIndex(
    (p) => p.endTime === '13:00'
  );

  const sortedCohorts = Array.from(entriesByCohort.keys()).sort();

  return (
    <div>
      {sortedCohorts.map((cohortId) => {
        const cohortEntries = entriesByCohort.get(cohortId)!;
        const { slotMap, occupiedByMultiSlot } =
          buildSlotMap(cohortEntries);

        // Extract semester from cohortId: "CE-S1-A" → 1
        const semMatch = cohortId.match(/S(\d)/);
        const semLabel = semMatch ? `Semester ${toRoman(Number(semMatch[1]))}` : cohortId;

        return (
          <div key={cohortId} className="timetable-section" style={{ marginBottom: '1.5rem' }}>
            <div className="timetable-section__header">
              <div className="timetable-section__title">
                📅 {semLabel} — {cohortId}
              </div>
              <div className="timetable-section__badge">
                {cohortEntries.length} sessions
              </div>
            </div>

            <div className="timetable-grid-wrapper">
              <div
                className="timetable-grid timetable-grid--cols-8"
                style={{
                  gridTemplateColumns: `90px repeat(${periods.length}, 1fr)`,
                }}
              >
                {/* ─── Header row: corner + periods ──── */}
                <div className="grid-header" />
                {periods.map((p, i) => (
                  <div key={p.periodId} className="grid-header">
                    <div>{p.periodId}</div>
                    <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                      {p.startTime}–{p.endTime}
                    </div>
                    {i === lunchPeriodIndex && (
                      <div
                        style={{
                          fontSize: '0.5rem',
                          color: 'var(--color-warning)',
                          marginTop: '1px',
                        }}
                      >
                        ↓ Lunch
                      </div>
                    )}
                  </div>
                ))}

                {/* ─── Day rows ──── */}
                {days.map((dayCode) => (
                  <>
                    {/* Day label */}
                    <div key={`${dayCode}-label`} className="grid-header grid-header--day">
                      <span className="grid-header__day-name">
                        {DAY_SHORT[dayCode] || dayCode}
                      </span>
                      <span className="grid-header__day-short">
                        {DAY_NAMES[dayCode] || dayCode}
                      </span>
                    </div>

                    {/* Period cells */}
                    {periods.map((p, _pIdx) => {
                      const slotId = `${dayCode}_${p.periodId}`;
                      const isLunch = p.endTime === '13:00';
                      const entry = slotMap.get(slotId);
                      const isOccupiedByPrev =
                        occupiedByMultiSlot.has(slotId);

                      if (isOccupiedByPrev && !entry) {
                        // This slot is the second hour of a 2-slot session
                        // Don't render a separate card — handled by the first slot spanning
                        return (
                          <div
                            key={slotId}
                            className={`grid-cell ${
                              isLunch ? 'grid-cell--lunch' : ''
                            }`}
                          />
                        );
                      }

                      return (
                        <div
                          key={slotId}
                          className={`grid-cell ${
                            isLunch ? 'grid-cell--lunch' : ''
                          }`}
                        >
                          {entry && (
                            <SessionCard
                              entry={entry}
                              sessionType={getSessionType(entry)}
                              courseName={
                                courseNameMap[entry.courseId] || entry.courseId
                              }
                              courseCode={
                                courseCodeMap[entry.courseId] || entry.courseId
                              }
                              teacherName={
                                teacherNameMap[entry.teacherId] ||
                                entry.teacherId
                              }
                              roomName={
                                roomNameMap[entry.roomId] || entry.roomId
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="legend">
              <div className="legend__item">
                <div className="legend__swatch legend__swatch--lecture" />
                <span>Lecture</span>
              </div>
              <div className="legend__item">
                <div className="legend__swatch legend__swatch--tutorial" />
                <span>Tutorial</span>
              </div>
              <div className="legend__item">
                <div className="legend__swatch legend__swatch--practical" />
                <span>Practical</span>
              </div>
              <div className="legend__item">
                <div className="legend__swatch legend__swatch--lunch" />
                <span>Lunch Break</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Session Card ───────────────────────────────────────────────────

function SessionCard({
  entry,
  sessionType,
  courseName,
  courseCode,
  teacherName,
  roomName,
}: {
  entry: TimetableEntry;
  sessionType: string;
  courseName: string;
  courseCode: string;
  teacherName: string;
  roomName: string;
}) {
  const typeClass =
    sessionType === 'LECTURE'
      ? 'session-card--lecture'
      : sessionType === 'TUTORIAL'
        ? 'session-card--tutorial'
        : 'session-card--practical';

  const typeLabel =
    sessionType === 'LECTURE'
      ? 'LEC'
      : sessionType === 'TUTORIAL'
        ? 'TUT'
        : 'LAB';

  // Truncate course name for small cells
  const shortName =
    courseName.length > 28 ? courseName.slice(0, 26) + '…' : courseName;

  return (
    <div
      className={`session-card ${typeClass}`}
      title={`${courseName} (${courseCode})\n${teacherName}\n${roomName}\n${entry.durationSlots} slot(s)`}
    >
      <span className="session-card__type-tag">{typeLabel}</span>
      <span className="session-card__course">{shortName}</span>
      <span className="session-card__detail">
        {teacherName} · {roomName}
      </span>
      {entry.durationSlots > 1 && (
        <span className="session-card__detail" style={{ opacity: 0.7 }}>
          {entry.durationSlots}h block
        </span>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function toRoman(n: number): string {
  const map: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };
  return map[n] || String(n);
}
