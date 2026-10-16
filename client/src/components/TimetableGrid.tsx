/**
 * SlotShield — TimetableGrid
 * Renders a weekly timetable grid with day rows and period columns.
 * Shows session cards colored by type (Lecture/Tutorial/Practical).
 * Displays one grid per cohort when multiple semesters are selected.
 */
import type { TimetableEntry, ScheduleSettings } from '../lib/api.ts';
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

interface TimetableGridProps {
  entries: TimetableEntry[];
  timeSlots: TimeSlotInfo[];
  scheduleSettings: ScheduleSettings;
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

  // Helper to parse "HH:mm"
  const parseMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const isOverlap = (s1: string, e1: string, s2: string, e2: string) => {
    return parseMin(s1) < parseMin(e2) && parseMin(e1) > parseMin(s2);
  };

  // Helper to resolve effective lunch for a cohort
  const resolveCohortLunch = (cohortId: string, semester?: number) => {
    if (scheduleSettings.cohortLunchOverrides?.[cohortId]) {
      const o = scheduleSettings.cohortLunchOverrides[cohortId];
      if (o && o.startTime && o.endTime) {
        return { startTime: o.startTime, endTime: o.endTime, isOverride: true };
      }
    }
    let sem = semester;
    if (!sem && cohortId) {
      const m = cohortId.match(/S(\d)/i);
      if (m) sem = Number(m[1]);
    }
    if (sem && scheduleSettings.semesterLunchDefaults?.[String(sem)]) {
      const def = scheduleSettings.semesterLunchDefaults[String(sem)];
      if (def && def.startTime && def.endTime) {
        return { startTime: def.startTime, endTime: def.endTime, isOverride: false };
      }
    }
    if (scheduleSettings.lunchBreak && scheduleSettings.lunchBreak.includes('-')) {
      const [start, end] = scheduleSettings.lunchBreak.split('-').map((s) => s.trim());
      return { startTime: start, endTime: end, isOverride: false };
    }
    return { startTime: '13:00', endTime: '14:00', isOverride: false };
  };

  const sortedCohorts = Array.from(entriesByCohort.keys()).sort();

  return (
    <div>
      {sortedCohorts.map((cohortId) => {
        const cohortEntries = entriesByCohort.get(cohortId)!;
        const { slotMap, occupiedByMultiSlot } =
          buildSlotMap(cohortEntries);

        // Extract semester from cohortId: "CE-S1-A" → 1
        const semMatch = cohortId.match(/S(\d)/);
        const semNumber = semMatch ? Number(semMatch[1]) : undefined;
        const semLabel = semMatch ? `Semester ${toRoman(semNumber!)}` : cohortId;

        const effectiveLunch = resolveCohortLunch(cohortId, semNumber);
        const { startTime: lunchStart, endTime: lunchEnd, isOverride } = effectiveLunch;

        return (
          <div key={cohortId} className="timetable-section" style={{ marginBottom: '1.5rem' }}>
            <div className="timetable-section__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div className="timetable-section__title">
                📅 {semLabel} — {cohortId}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div className="timetable-section__badge">
                  {cohortEntries.length} sessions
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    background: isOverride ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isOverride ? 'var(--emerald-400)' : '#93c5fd',
                    border: `1px solid ${isOverride ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.3)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                  title={isOverride ? `Cohort override applied: ${lunchStart}–${lunchEnd}` : `Inheriting Semester ${semNumber || ''} default: ${lunchStart}–${lunchEnd}`}
                >
                  <span>🍱</span>
                  <span>Lunch: <strong>{lunchStart}–{lunchEnd}</strong></span>
                  <span style={{ opacity: 0.85, fontSize: '0.7rem' }}>({isOverride ? 'Cohort Override' : 'Semester Default'})</span>
                </div>
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
                {periods.map((p) => {
                  const isLunchBoundary = p.endTime === lunchStart;
                  const isPeriodDuringLunch = isOverlap(p.startTime, p.endTime, lunchStart, lunchEnd);

                  return (
                    <div key={p.periodId} className="grid-header">
                      <div>{p.periodId}</div>
                      <div style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                        {p.startTime}–{p.endTime}
                      </div>
                      {isLunchBoundary && (
                        <div
                          style={{
                            fontSize: '0.5rem',
                            color: 'var(--color-warning)',
                            marginTop: '1px',
                            fontWeight: 600,
                          }}
                        >
                          ↓ Lunch ({lunchStart}–{lunchEnd})
                        </div>
                      )}
                      {isPeriodDuringLunch && (
                        <div
                          style={{
                            fontSize: '0.5rem',
                            color: 'var(--emerald-400)',
                            marginTop: '1px',
                            fontWeight: 600,
                          }}
                        >
                          🍱 Lunch
                        </div>
                      )}
                    </div>
                  );
                })}

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
                    {periods.map((p) => {
                      const slotId = `${dayCode}_${p.periodId}`;
                      const isLunch = isOverlap(p.startTime, p.endTime, lunchStart, lunchEnd);
                      const entry = slotMap.get(slotId);
                      const isOccupiedByPrev =
                        occupiedByMultiSlot.has(slotId);

                      if (isOccupiedByPrev && !entry) {
                        // This slot is the second hour of a 2-slot session
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
