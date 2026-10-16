/**
 * SlotShield — TimetableGrid (Master Timetable)
 *
 * Weekly grid: time rows × day columns, one grid per cohort section.
 * Built as a real CSS grid so multi-period sessions span rows, the protected
 * lunch recess gets its own band, and every card sits inside its own track
 * (course code, room and faculty never overlap each other).
 */
import { useMemo } from 'react';
import type {
  LunchBreakInterval,
  PeriodDefinition,
  ScheduleSettings,
  TimetableEntry,
} from '../lib/api.ts';
import {
  effectiveLunchFor,
  formatRange,
  intervalsOverlap,
  romanSemester,
  semesterOfCohort,
  sessionKindOf,
  sessionTimeRange,
  SESSION_TAG,
  shortTeacherName,
  toMinutes,
  type Lookups,
  type SessionKind,
} from '../lib/lookups.ts';

interface TimetableGridProps {
  entries: TimetableEntry[];
  scheduleSettings: ScheduleSettings;
  lookups: Lookups;
}

type GridRow =
  | { kind: 'period'; key: string; periodId: string; start: string; end: string }
  | { kind: 'lunch'; key: string; start: string; end: string };

const DAY_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

/**
 * Period rows in time order. If the lunch interval does not coincide with any
 * period, a dedicated lunch row is inserted at its position so the protected
 * recess is visible rather than silently skipped.
 */
function buildRows(periods: PeriodDefinition[], lunch: LunchBreakInterval): GridRow[] {
  const sorted = [...periods].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const lunchS = toMinutes(lunch.startTime);
  const lunchE = toMinutes(lunch.endTime);
  const lunchRow: GridRow = { kind: 'lunch', key: 'lunch', start: lunch.startTime, end: lunch.endTime };
  const lunchOverlapsPeriod = sorted.some((p) =>
    intervalsOverlap(toMinutes(p.startTime), toMinutes(p.endTime), lunchS, lunchE)
  );

  const rows: GridRow[] = [];
  let lunchPlaced = lunchOverlapsPeriod;
  for (const p of sorted) {
    if (!lunchPlaced && toMinutes(p.startTime) >= lunchE) {
      rows.push(lunchRow);
      lunchPlaced = true;
    }
    rows.push({ kind: 'period', key: p.periodId, periodId: p.periodId, start: p.startTime, end: p.endTime });
  }
  if (!lunchPlaced) rows.push(lunchRow);
  return rows;
}

const TIME_COL_PX = 92;
const DAY_COL_MIN_PX = 176;
const ROW_HEIGHT_PX = 124;
const HEADER_HEIGHT_PX = 52;

export function TimetableGrid({ entries, scheduleSettings, lookups }: TimetableGridProps) {
  const days = scheduleSettings.days;

  const entriesByCohort = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.cohortId) || [];
      list.push(entry);
      map.set(entry.cohortId, list);
    }
    return map;
  }, [entries]);

  const sortedCohorts = Array.from(entriesByCohort.keys()).sort();

  return (
    <div className="tt-sections">
      {sortedCohorts.map((cohortId) => (
        <CohortSection
          key={cohortId}
          cohortId={cohortId}
          entries={entriesByCohort.get(cohortId) || []}
          days={days}
          periods={scheduleSettings.periods}
          lunch={effectiveLunchFor(scheduleSettings, cohortId)}
          lookups={lookups}
        />
      ))}

      <div className="legend" aria-label="Legend">
        <div className="legend__item">
          <span className="legend__swatch legend__swatch--lecture" />
          <span>Lecture (LEC)</span>
        </div>
        <div className="legend__item">
          <span className="legend__swatch legend__swatch--tutorial" />
          <span>Tutorial (TUT)</span>
        </div>
        <div className="legend__item">
          <span className="legend__swatch legend__swatch--practical" />
          <span>Lab / Practical (LAB)</span>
        </div>
        <div className="legend__item">
          <span className="legend__swatch legend__swatch--lunch" />
          <span>Protected lunch recess</span>
        </div>
      </div>
    </div>
  );
}

function CohortSection({
  cohortId,
  entries,
  days,
  periods,
  lunch,
  lookups,
}: {
  cohortId: string;
  entries: TimetableEntry[];
  days: string[];
  periods: PeriodDefinition[];
  lunch: LunchBreakInterval & { isOverride: boolean };
  lookups: Lookups;
}) {
  const semNumber = semesterOfCohort(cohortId);
  const semLabel = semNumber !== undefined ? `Semester ${romanSemester(semNumber)}` : cohortId;
  const rows = useMemo(() => buildRows(periods, lunch), [periods, lunch]);

  const rowIndexByPeriod = new Map<string, number>();
  rows.forEach((r, i) => {
    if (r.kind === 'period') rowIndexByPeriod.set(r.periodId, i);
  });
  const lunchRowIndex = rows.findIndex((r) => r.kind === 'lunch');
  const lunchS = toMinutes(lunch.startTime);
  const lunchE = toMinutes(lunch.endTime);

  const placed: { entry: TimetableEntry; row: number; col: number; span: number }[] = [];
  let skipped = 0;
  for (const entry of entries) {
    const slot = lookups.slotById.get(entry.startSlotId);
    const row = slot ? rowIndexByPeriod.get(slot.periodId) : undefined;
    const dayIdx = days.indexOf(entry.dayCode);
    if (row === undefined || dayIdx < 0) {
      skipped += 1;
      continue;
    }
    placed.push({ entry, row, col: dayIdx + 2, span: Math.max(1, entry.durationSlots) });
  }

  const gridTemplateColumns = `${TIME_COL_PX}px repeat(${days.length}, minmax(${DAY_COL_MIN_PX}px, 1fr))`;
  const gridTemplateRows = `${HEADER_HEIGHT_PX}px repeat(${rows.length}, ${ROW_HEIGHT_PX}px)`;

  return (
    <section className="timetable-section" aria-label={`${semLabel} ${cohortId} timetable`}>
      <header className="timetable-section__header">
        <div className="timetable-section__title">
          {semLabel} <span className="timetable-section__cohort">· {cohortId}</span>
        </div>
        <div className="timetable-section__meta">
          <span className="timetable-section__badge">{entries.length} sessions</span>
          <span
            className={`lunch-chip ${lunch.isOverride ? 'lunch-chip--override' : 'lunch-chip--default'}`}
            title={lunch.isOverride ? 'Cohort override applied' : 'Inheriting semester default'}
          >
            Lunch {lunch.startTime}–{lunch.endTime}
            <span className="lunch-chip__source">{lunch.isOverride ? 'Cohort override' : 'Semester default'}</span>
          </span>
        </div>
      </header>

      <div className="timetable-scroll">
        <div className="tt-grid" style={{ gridTemplateColumns, gridTemplateRows }}>
          {/* Corner + day headers */}
          <div className="tt-corner" style={{ gridColumn: 1, gridRow: 1 }}>
            Time
          </div>
          {days.map((dayCode, i) => (
            <div key={`h-${dayCode}`} className="tt-day" style={{ gridColumn: i + 2, gridRow: 1 }}>
              <span className="tt-day__short">{dayCode}</span>
              <span className="tt-day__long">{DAY_NAMES[dayCode] || dayCode}</span>
            </div>
          ))}

          {/* Time labels */}
          {rows.map((r, i) => (
            <div
              key={`t-${r.key}`}
              className={`tt-time ${r.kind === 'lunch' ? 'tt-time--lunch' : ''}`}
              style={{ gridColumn: 1, gridRow: i + 2 }}
            >
              {r.kind === 'period' ? (
                <>
                  <span className="tt-time__id">{r.periodId}</span>
                  <span className="tt-time__range">{r.start}</span>
                  <span className="tt-time__range">{r.end}</span>
                </>
              ) : (
                <span className="tt-time__id">Lunch</span>
              )}
            </div>
          ))}

          {/* Background cells (lunch-shaded where the recess overlaps a period) */}
          {rows.map((r, i) =>
            r.kind === 'lunch'
              ? null
              : days.map((dayCode, d) => {
                  const pLunch = intervalsOverlap(toMinutes(r.start), toMinutes(r.end), lunchS, lunchE);
                  return (
                    <div
                      key={`c-${dayCode}-${r.key}`}
                      className={`tt-cell ${pLunch ? 'tt-cell--lunch' : ''}`}
                      style={{ gridColumn: d + 2, gridRow: i + 2 }}
                      aria-hidden="true"
                    />
                  );
                })
          )}

          {/* Protected lunch band spanning all day columns */}
          {lunchRowIndex >= 0 && (
            <div
              className="tt-lunch-band"
              style={{ gridColumn: `2 / ${days.length + 2}`, gridRow: lunchRowIndex + 2 }}
            >
              <span className="tt-lunch-band__label">Protected lunch recess</span>
              <span className="tt-lunch-band__time">
                {lunch.startTime} – {lunch.endTime} · no session may overlap
              </span>
            </div>
          )}

          {/* Session cards */}
          {placed.map(({ entry, row, col, span }) => {
            const course = lookups.courseById.get(entry.courseId);
            const teacher = lookups.teacherById.get(entry.teacherId);
            const room = lookups.roomById.get(entry.roomId);
            const kind: SessionKind = sessionKindOf(entry);
            const range = sessionTimeRange(entry.startSlotId, entry.durationSlots, lookups.slotById);
            const courseName = course?.courseName ?? entry.courseId;
            const courseCode = course?.courseCode ?? entry.courseId;
            const teacherFull = teacher?.displayName ?? entry.teacherId;
            const roomName = room?.displayName ?? entry.roomId;
            return (
              <article
                key={entry.entryId}
                className={`session-card session-card--${kind.toLowerCase()}`}
                style={{ gridColumn: col, gridRow: `${row + 2} / span ${span}` }}
                title={`${courseName} (${courseCode})\n${formatRange(range)} · ${entry.dayCode}\n${roomName}\n${teacherFull}`}
              >
                <div className="session-card__top">
                  <span className="session-card__code">{courseCode}</span>
                  <span className="session-card__type">{SESSION_TAG[kind]}</span>
                </div>
                <h4 className="session-card__course">{courseName}</h4>
                <div className="session-card__room">{roomName}</div>
                <div className="session-card__faculty">{shortTeacherName(teacherFull)}</div>
              </article>
            );
          })}
        </div>
      </div>

      {skipped > 0 && (
        <div className="tt-warning" role="status">
          {skipped} session(s) fall outside the configured periods and are not shown in the grid.
        </div>
      )}
    </section>
  );
}
