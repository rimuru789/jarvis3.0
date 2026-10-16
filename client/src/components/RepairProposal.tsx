/**
 * SlotShield — RepairProposal
 *
 * Shows a staged repair proposal from POST /timetables/:id/repair: summary
 * metrics, then a side-by-side verification of each relocated session.
 * Applying calls POST /timetables/:id/repair/apply, the only write path.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  BootstrapPayload,
  RepairProposal as RepairProposalType,
  TimetableChange,
  TimetableResult,
} from '../lib/api.ts';
import { applyRepair, ApiError } from '../lib/api.ts';
import {
  formatRange,
  romanSemester,
  semesterOfCohort,
  sessionTimeRange,
  type Lookups,
} from '../lib/lookups.ts';
import { IconAlert, IconCheck, IconCheckCircle, IconLock, IconShield, IconSwap, IconX } from './Icon.tsx';

interface RepairProposalProps {
  data: BootstrapPayload;
  timetable: TimetableResult;
  lookups: Lookups;
  proposal: RepairProposalType | null;
  onApplied: (updated: TimetableResult) => void;
  onGoSimulate: () => void;
  onGoMaster: () => void;
}

export function RepairProposal({
  data,
  timetable,
  lookups,
  proposal,
  onApplied,
  onGoSimulate,
  onGoMaster,
}: RepairProposalProps) {
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  useEffect(() => {
    setApplyError('');
    setAppliedId(null);
  }, [proposal?.changeSetId]);

  const stats = useMemo(() => {
    if (!proposal) return null;
    const total = proposal.entries.length;
    const moved = proposal.changes.length;
    const preserved = Math.max(0, total - moved);
    const pct = total > 0 ? Math.round((preserved / total) * 1000) / 10 : 0;
    const cohorts = Array.from(new Set(proposal.changes.map((c) => c.cohortId))).sort();
    const lunchClashes = proposal.validation.conflicts.filter((c) => c.code === 'LUNCH_BREAK_OVERLAP').length;
    const hard = proposal.validation.hardConflictCount;
    return {
      total,
      moved,
      preserved,
      pct,
      cohorts,
      lunchClashes,
      hard,
      valid: proposal.validation.valid,
      compliant: proposal.validation.valid && hard === 0 && lunchClashes === 0,
    };
  }, [proposal]);

  if (!proposal || !stats) {
    return (
      <section className="screen" aria-labelledby="repair-title">
        <ScreenTitle />
        <div className="panel empty-panel">
          <IconShield />
          <h2 className="empty-panel__title">No repair proposal staged</h2>
          <p className="empty-panel__text">
            Simulate a faculty or room disruption first. The proposal shows every relocated session side by side with
            its original slot.
          </p>
          <button type="button" className="btn btn--primary" onClick={onGoSimulate}>
            Open Disruption Simulator
          </button>
        </div>
      </section>
    );
  }

  const disruption = proposal.disruption;
  const targetLabel =
    disruption.type === 'FACULTY_UNAVAILABLE'
      ? data.teachers.find((t) => t.teacherId === disruption.targetId)?.displayName ?? disruption.targetId
      : data.rooms.find((r) => r.roomId === disruption.targetId)?.displayName ?? disruption.targetId;
  const dayLabel = data.scheduleSettings.days.includes(disruption.dayCode)
    ? disruption.dayCode.charAt(0) + disruption.dayCode.slice(1).toLowerCase()
    : disruption.dayCode;
  const disruptionKind = disruption.type === 'FACULTY_UNAVAILABLE' ? 'Faculty unavailable' : 'Room unavailable';
  const applied = appliedId === proposal.changeSetId;

  const handleApply = async () => {
    setApplying(true);
    setApplyError('');
    try {
      const updated = await applyRepair(proposal.timetableId, proposal.changeSetId);
      onApplied(updated);
      setAppliedId(proposal.changeSetId);
    } catch (err) {
      setApplyError(err instanceof ApiError ? err.message : 'Could not apply the repair proposal.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="screen" aria-labelledby="repair-title">
      <ScreenTitle
        subtitle={`${disruptionKind}: ${targetLabel} · ${dayLabel} ${disruption.reason ? `· ${disruption.reason}` : ''}`}
      />

      {/* ─── Summary metrics ───────────────────────────────── */}
      <div className="kpi-grid">
        <KpiCard
          tone={stats.valid ? 'ok' : 'bad'}
          icon={<IconCheckCircle />}
          label="Validation status"
          value={stats.valid ? 'Valid' : 'Invalid'}
          tag={stats.hard === 0 ? 'Zero collisions' : `${stats.hard} collisions`}
          note="Room, staff & batch locks satisfied"
        />
        <KpiCard
          tone="ok"
          icon={<IconLock />}
          label="Sessions preserved"
          value={`${stats.preserved} / ${stats.total}`}
          tag={`${stats.pct}% unchanged`}
          note="Minimal perturbation retention"
        />
        <KpiCard
          tone="info"
          icon={<IconSwap />}
          label="Sessions relocated"
          value={`${stats.moved} ${stats.moved === 1 ? 'slot' : 'slots'}`}
          tag="Deltas staged"
          note={
            stats.cohorts.length
              ? `Affected cohorts: ${stats.cohorts.join(', ')}`
              : 'No cohorts affected'
          }
        />
        <KpiCard
          tone={stats.compliant ? 'ok' : 'bad'}
          icon={<IconShield />}
          label="Constraint compliance"
          value={stats.compliant ? '100%' : 'Blocked'}
          tag={stats.compliant ? 'Hard rules valid' : `${stats.lunchClashes} lunch clash(es)`}
          note="Protected lunch recess respected"
        />
      </div>

      {/* ─── Relocated session deltas ──────────────────────── */}
      <div className="deltas-head">
        <div>
          <h2 className="deltas-head__title">Relocated session deltas ({proposal.changes.length})</h2>
          <p className="deltas-head__hint">
            Side-by-side check of the original collision slot and the recommended solver assignment.
          </p>
        </div>
      </div>

      {proposal.changes.length === 0 ? (
        <div className="panel empty-panel">
          <IconCheck />
          <h2 className="empty-panel__title">Nothing to relocate</h2>
          <p className="empty-panel__text">No sessions were affected by this disruption. The timetable stays as it is.</p>
        </div>
      ) : (
        <div className="delta-list">
          {proposal.changes.map((change) => (
            <DeltaCard
              key={`${change.entryId}-${change.newStartSlotId}`}
              change={change}
              proposal={proposal}
              timetable={timetable}
              lookups={lookups}
              validationValid={proposal.validation.valid}
            />
          ))}
        </div>
      )}

      {proposal.warnings.length > 0 && (
        <div className="panel__error" role="alert">
          <IconAlert /> {proposal.warnings.join(' · ')}
        </div>
      )}

      {/* ─── Apply ─────────────────────────────────────────── */}
      <div className="sim-footer">
        <div>
          <div className="sim-footer__title">
            {applied ? 'Repair applied to the master timetable.' : 'Apply this proposal to the master timetable.'}
          </div>
          <div className="sim-footer__hint">
            {stats.valid
              ? 'Validated: no teacher, room, cohort, or lunch clashes in the proposed timetable.'
              : 'The proposal has hard conflicts and cannot be applied.'}
          </div>
          {applyError && (
            <div className="panel__error" role="alert">
              <IconAlert /> {applyError}
            </div>
          )}
        </div>
        <div className="sim-footer__actions">
          {applied ? (
            <button type="button" className="btn btn--outline" onClick={onGoMaster}>
              View master timetable
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleApply}
              disabled={applying || !stats.valid}
            >
              {applying ? 'Applying…' : 'Apply repair'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function ScreenTitle({ subtitle }: { subtitle?: string }) {
  return (
    <div className="screen-header">
      <div>
        <h1 id="repair-title" className="screen-title">
          Repair Proposal
        </h1>
        <p className="screen-subtitle">
          {subtitle ?? 'Review the automated repair before it touches the live timetable.'}
        </p>
      </div>
    </div>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  tag,
  note,
}: {
  tone: 'ok' | 'bad' | 'info';
  icon: ReactNode;
  label: string;
  value: string;
  tag: string;
  note: string;
}) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <span className="kpi__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="kpi__value-row">
        <span className="kpi__value">{value}</span>
        <span className={`kpi__tag kpi__tag--${tone}`}>{tag}</span>
      </div>
      <div className="kpi__note">{note}</div>
    </article>
  );
}

function DeltaCard({
  change,
  proposal,
  timetable,
  lookups,
  validationValid,
}: {
  change: TimetableChange;
  proposal: RepairProposalType;
  timetable: TimetableResult;
  lookups: Lookups;
  validationValid: boolean;
}) {
  const newEntry = proposal.entries.find((e) => e.entryId === change.entryId);
  const oldEntry = timetable.entries.find((e) => e.entryId === change.entryId);
  const course = lookups.courseById.get(newEntry?.courseId ?? oldEntry?.courseId ?? '');
  const courseCode = course?.courseCode ?? newEntry?.courseId ?? change.sessionId;
  const courseName = course?.courseName ?? change.sessionId;
  const sem = semesterOfCohort(change.cohortId);

  const oldRange = sessionTimeRange(
    change.oldStartSlotId,
    oldEntry?.durationSlots ?? 1,
    lookups.slotById
  );
  const newRange = sessionTimeRange(
    change.newStartSlotId,
    newEntry?.durationSlots ?? 1,
    lookups.slotById
  );
  const oldRoom = lookups.roomById.get(change.oldRoomId)?.displayName ?? change.oldRoomId;
  const newRoom = lookups.roomById.get(change.newRoomId)?.displayName ?? change.newRoomId;
  const oldDay = dayName(change.oldDayCode);
  const newDay = dayName(change.newDayCode);

  return (
    <article className="delta-card">
      <header className="delta-card__head">
        <div className="delta-card__titles">
          <span className="delta-card__code">{courseCode}</span>
          <h3 className="delta-card__name">{courseName}</h3>
        </div>
        <span className="delta-card__cohort">
          Cohort: {change.cohortId}
          {sem !== undefined ? ` (Semester ${romanSemester(sem)})` : ''}
        </span>
      </header>

      <div className="delta-card__panels">
        <div className="delta-panel delta-panel--original">
          <div className="delta-panel__label">
            <IconX /> Original slot (disrupted)
          </div>
          <div className="delta-panel__slot">
            {oldDay} · {formatRange(oldRange)}
          </div>
          <div className="delta-panel__room">Room: {oldRoom}</div>
          <div className="delta-panel__note">
            {proposal.disruption.type === 'FACULTY_UNAVAILABLE' ? 'Faculty' : 'Room'} unavailable on{' '}
            {oldDay} for this slot.
          </div>
        </div>

        <div className="delta-panel delta-panel--recommended">
          <div className="delta-panel__label">
            <IconCheck /> Recommended allocation
          </div>
          <div className="delta-panel__slot">
            {newDay} · {formatRange(newRange)}
          </div>
          <div className="delta-panel__room">Room: {newRoom}</div>
          <div className="delta-panel__note">
            Rationale: {newDay} {formatRange(newRange)} is free for this cohort and {newRoom}
            {validationValid ? ' with no lunch or lock clashes.' : '. Proposal has unresolved conflicts.'}
          </div>
        </div>
      </div>
    </article>
  );
}

function dayName(code: string): string {
  return ({ MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' } as Record<string, string>)[code] ?? code;
}
