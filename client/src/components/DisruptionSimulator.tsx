/**
 * SlotShield — DisruptionSimulator
 *
 * Stage a faculty or room disruption and request a repair proposal from
 * POST /api/v1/timetables/:id/repair. Nothing is changed until the proposal is
 * explicitly applied on the Repair Proposal screen.
 */
import { useMemo, useState } from 'react';
import type {
  BootstrapPayload,
  Disruption,
  DisruptionType,
  RepairProposal,
  TimetableResult,
} from '../lib/api.ts';
import { repairTimetable, ApiError } from '../lib/api.ts';
import {
  formatRange,
  sessionKindOf,
  sessionTimeRange,
  SESSION_TAG,
  shortTeacherName,
  toMinutes,
  type Lookups,
} from '../lib/lookups.ts';
import { IconAlert, IconArrowRight, IconCheckCircle, IconRoom, IconSliders, IconUser } from './Icon.tsx';

/** Morning window = periods starting before this time. */
const MORNING_END = '13:00';

const REASONS: Record<DisruptionType, { code: string; label: string }[]> = {
  FACULTY_UNAVAILABLE: [
    { code: 'L-MED-04', label: 'Medical Leave / Urgent Health' },
    { code: 'L-OFF-02', label: 'Official Duty / Conference' },
    { code: 'L-PER-07', label: 'Personal Leave' },
  ],
  ROOM_UNAVAILABLE: [
    { code: 'R-MNT-01', label: 'Maintenance Closure' },
    { code: 'R-EVT-03', label: 'Event Reservation' },
    { code: 'R-SAF-05', label: 'Safety Inspection' },
  ],
};

interface DisruptionSimulatorProps {
  data: BootstrapPayload;
  timetable: TimetableResult;
  lookups: Lookups;
  proposal: RepairProposal | null;
  onProposal: (proposal: RepairProposal) => void;
  onProceed: () => void;
}

export function DisruptionSimulator({
  data,
  timetable,
  lookups,
  proposal,
  onProposal,
  onProceed,
}: DisruptionSimulatorProps) {
  const days = data.scheduleSettings.days;
  const [type, setType] = useState<DisruptionType>('FACULTY_UNAVAILABLE');
  const [targetId, setTargetId] = useState<string>(data.teachers[0]?.teacherId ?? '');
  const [day, setDay] = useState<string>(days[0] ?? 'MON');
  const [windowKind, setWindowKind] = useState<'MORNING' | 'FULL'>('MORNING');
  const [reasonCode, setReasonCode] = useState<string>(REASONS.FACULTY_UNAVAILABLE[0].code);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [lastRunNote, setLastRunNote] = useState('');

  const targets = useMemo(
    () =>
      type === 'FACULTY_UNAVAILABLE'
        ? data.teachers.map((t) => ({ id: t.teacherId, label: t.displayName }))
        : data.rooms.map((r) => ({ id: r.roomId, label: r.displayName })),
    [type, data.teachers, data.rooms]
  );

  const reasonOptions = REASONS[type];

  const windowSlotIds = useMemo(
    () =>
      data.timeSlots
        .filter(
          (ts) =>
            ts.dayCode === day &&
            (windowKind === 'FULL' || toMinutes(ts.startTime) < toMinutes(MORNING_END))
        )
        .map((ts) => ts.slotId),
    [data.timeSlots, day, windowKind]
  );

  const windowSet = useMemo(() => new Set(windowSlotIds), [windowSlotIds]);

  const impacted = useMemo(() => {
    return timetable.entries
      .filter((e) => e.dayCode === day && windowSet.has(e.startSlotId))
      .map((entry) => {
        const isAffected =
          type === 'FACULTY_UNAVAILABLE' ? entry.teacherId === targetId : entry.roomId === targetId;
        const slot = lookups.slotById.get(entry.startSlotId);
        return { entry, isAffected, startMin: slot ? toMinutes(slot.startTime) : 0 };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [timetable.entries, day, windowSet, type, targetId, lookups.slotById]);

  const affectedCount = impacted.filter((i) => i.isAffected).length;

  const dayStart = useMemo(() => {
    const starts = data.timeSlots.filter((ts) => ts.dayCode === day).map((ts) => ts.startTime).sort();
    return starts[0] ?? '09:00';
  }, [data.timeSlots, day]);
  const dayEnd = useMemo(() => {
    const ends = data.timeSlots.filter((ts) => ts.dayCode === day).map((ts) => ts.endTime).sort();
    return ends[ends.length - 1] ?? '17:00';
  }, [data.timeSlots, day]);
  const windowLabel =
    windowKind === 'MORNING' ? `Morning ${dayStart} – ${MORNING_END}` : `Full day ${dayStart} – ${dayEnd}`;
  const dayLabel = day.charAt(0) + day.slice(1).toLowerCase();
  const targetLabel = targets.find((t) => t.id === targetId)?.label ?? targetId;
  const reasonLabel = reasonOptions.find((r) => r.code === reasonCode)?.label ?? reasonCode;

  const chooseType = (next: DisruptionType) => {
    setType(next);
    setTargetId(next === 'FACULTY_UNAVAILABLE' ? data.teachers[0]?.teacherId ?? '' : data.rooms[0]?.roomId ?? '');
    setReasonCode(REASONS[next][0].code);
    setError('');
    setLastRunNote('');
  };

  const simulate = async () => {
    if (windowSlotIds.length === 0 || !targetId) {
      setError('Choose a day and an affected entity first.');
      return;
    }
    const disruption: Disruption = {
      type,
      targetId,
      dayCode: day as Disruption['dayCode'],
      slotIds: windowSlotIds,
      reason: `${reasonCode}: ${reasonLabel}`,
    };
    setRunning(true);
    setError('');
    try {
      const result = await repairTimetable(timetable.timetableId, { disruption });
      onProposal(result);
      setLastRunNote(
        `${result.changes.length} relocation${result.changes.length === 1 ? '' : 's'} proposed · ${
          result.validation.valid ? 'no hard conflicts' : `${result.validation.hardConflictCount} hard conflicts remain`
        }`
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Simulation failed. Check that the API server is running.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="screen" aria-labelledby="sim-title">
      <div className="screen-header">
        <div>
          <h1 id="sim-title" className="screen-title">
            Disruption Simulator
          </h1>
          <p className="screen-subtitle">
            Stage a faculty or room disruption and preview the self-healing repair. The live timetable is not changed
            until you apply a proposal.
          </p>
        </div>
      </div>

      <div className="sim-layout">
        {/* ─── Configuration ─────────────────────────────────── */}
        <div className="panel sim-config">
          <div className="step">
            <div className="step__label">Step 1 · Disruption archetype</div>
            <div className="segmented" role="group" aria-label="Disruption archetype">
              <button
                type="button"
                className={`segmented__btn ${type === 'FACULTY_UNAVAILABLE' ? 'segmented__btn--active' : ''}`}
                aria-pressed={type === 'FACULTY_UNAVAILABLE'}
                onClick={() => chooseType('FACULTY_UNAVAILABLE')}
              >
                <IconUser /> Faculty unavailable
              </button>
              <button
                type="button"
                className={`segmented__btn ${type === 'ROOM_UNAVAILABLE' ? 'segmented__btn--active' : ''}`}
                aria-pressed={type === 'ROOM_UNAVAILABLE'}
                onClick={() => chooseType('ROOM_UNAVAILABLE')}
              >
                <IconRoom /> Room / lab closure
              </button>
            </div>
          </div>

          <div className="step">
            <div className="step__label">
              Step 2 · Affected {type === 'FACULTY_UNAVAILABLE' ? 'faculty' : 'room'}
              <span className="step__count">
                {targets.length} {type === 'FACULTY_UNAVAILABLE' ? 'faculty' : 'rooms'}
              </span>
            </div>
            <select
              className="ui-select ui-select--block"
              aria-label="Affected entity"
              value={targetId}
              onChange={(e) => {
                setTargetId(e.target.value);
                setLastRunNote('');
              }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="step">
            <div className="step__label">Step 3 · Schedule impact window</div>
            <div className="day-chips" role="group" aria-label="Day">
              {days.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`day-chip ${d === day ? 'day-chip--active' : ''}`}
                  aria-pressed={d === day}
                  onClick={() => {
                    setDay(d);
                    setLastRunNote('');
                  }}
                >
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="segmented segmented--two" role="group" aria-label="Window">
              <button
                type="button"
                className={`segmented__btn ${windowKind === 'MORNING' ? 'segmented__btn--active' : ''}`}
                aria-pressed={windowKind === 'MORNING'}
                onClick={() => setWindowKind('MORNING')}
              >
                Partial window (morning)
              </button>
              <button
                type="button"
                className={`segmented__btn ${windowKind === 'FULL' ? 'segmented__btn--active' : ''}`}
                aria-pressed={windowKind === 'FULL'}
                onClick={() => setWindowKind('FULL')}
              >
                Full operational day
              </button>
            </div>
            <div className="step__hint">Window: {windowLabel}</div>
          </div>

          <div className="step">
            <label className="step__label" htmlFor="reason-code">
              Step 4 · Disruption reason code
            </label>
            <select
              id="reason-code"
              className="ui-select ui-select--block"
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              {reasonOptions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.code}: {r.label}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="btn btn--primary btn--block" onClick={simulate} disabled={running}>
            <IconSliders />
            {running ? 'Simulating…' : 'Simulate & evaluate disruption'}
          </button>

          {error && (
            <div className="panel__error" role="alert">
              <IconAlert /> {error}
            </div>
          )}
          {lastRunNote && !error && (
            <div className="panel__success" role="status">
              <IconCheckCircle /> {lastRunNote}
            </div>
          )}
        </div>

        {/* ─── Impact list ───────────────────────────────────── */}
        <div className="panel sim-impact">
          <div className="sim-impact__head">
            <div>
              <h2 className="panel__heading">
                {dayLabel} · {windowLabel}
              </h2>
              <p className="panel__hint-line">
                {impacted.length} session{impacted.length === 1 ? '' : 's'} in window ·{' '}
                <span className={affectedCount > 0 ? 'text-danger' : 'text-ok'}>
                  {affectedCount} affected by {targetLabel}
                </span>
              </p>
            </div>
          </div>

          {impacted.length === 0 ? (
            <div className="empty-inline">No sessions are scheduled in this window.</div>
          ) : (
            <ul className="impact-list" aria-label="Sessions in impact window">
              {impacted.map(({ entry, isAffected }) => {
                const course = lookups.courseById.get(entry.courseId);
                const teacher = lookups.teacherById.get(entry.teacherId);
                const room = lookups.roomById.get(entry.roomId);
                const range = sessionTimeRange(entry.startSlotId, entry.durationSlots, lookups.slotById);
                const kind = sessionKindOf(entry);
                return (
                  <li key={entry.entryId} className={`impact-row ${isAffected ? 'impact-row--affected' : ''}`}>
                    <div className="impact-row__time">{formatRange(range)}</div>
                    <div className="impact-row__main">
                      <div className="impact-row__title">
                        <span className="impact-row__code">{course?.courseCode ?? entry.courseId}</span>
                        <span className="impact-row__name">{course?.courseName ?? entry.courseId}</span>
                        <span className="impact-row__tag">{SESSION_TAG[kind]}</span>
                      </div>
                      <div className="impact-row__meta">
                        {entry.cohortId} · {room?.displayName ?? entry.roomId} ·{' '}
                        {teacher ? shortTeacherName(teacher.displayName) : entry.teacherId}
                      </div>
                    </div>
                    <span className={`impact-status ${isAffected ? 'impact-status--affected' : 'impact-status--normal'}`}>
                      {isAffected ? 'Affected' : 'Normal'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="sim-footer">
        <div>
          <div className="sim-footer__title">Simulate disruption to stage automated repair.</div>
          <div className="sim-footer__hint">
            Self-healing repair moves affected sessions into free slots while keeping lunch and lock constraints.
          </div>
        </div>
        <button type="button" className="btn btn--outline" onClick={onProceed} disabled={!proposal}>
          Proceed to repair proposal
          <IconArrowRight />
        </button>
      </div>
      {!proposal && (
        <div className="sim-footer-note">Run a simulation to enable the repair proposal.</div>
      )}
    </section>
  );
}
