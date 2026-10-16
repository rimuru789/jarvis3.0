/**
 * SlotShield — GenerateScreen (Generate Timetable)
 *
 * Replaces the former modal. Controls, in order:
 *   1. Semester scope (which semesters the solver runs for)
 *   2. Scheduling parameters (working days; read-only display of solver settings)
 *   3. Mandatory hard constraint: semester lunch defaults and cohort overrides.
 *      Edits are saved through PATCH /schedule-settings and enforced by the solver.
 *   4. Solver pipeline status and the generate action.
 */
import { useMemo, useState, useEffect } from 'react';
import { IconBolt, IconCpu, IconFork } from './Icon.tsx';
import type {
  LunchBreakInterval,
  ScheduleSettings,
  ScheduleSettingsPatch,
  SemesterSummary,
  SessionRequirement,
  TimetableResult,
} from '../lib/api.ts';
import { generateTimetable, updateScheduleSettings, ApiError } from '../lib/api.ts';
import {
  lunchPresets,
  romanSemester,
  sectionLabel,
  semesterOfCohort,
  toMinutes,
} from '../lib/lookups.ts';

interface GenerateScreenProps {
  settings: ScheduleSettings;
  summary: Record<string, SemesterSummary>;
  sessions: SessionRequirement[];
  timetable: TimetableResult;
  onSettingsUpdated: (updated: ScheduleSettings) => void;
  onTimetableGenerated: (result: TimetableResult) => void;
  onClose: () => void;
}

type PipelineState = 'standby' | 'running' | 'complete' | 'failed';

const SEMESTERS = [1, 2, 3] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_SHORT: Record<string, string> = {
  MON: 'Mon',
  TUE: 'Tue',
  WED: 'Wed',
  THU: 'Thu',
  FRI: 'Fri',
  SAT: 'Sat',
};

function validateInterval(start: string, end: string): string | null {
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) return 'Use HH:mm times.';
  if (toMinutes(start) >= toMinutes(end)) return 'Start must be before end.';
  return null;
}

export function GenerateScreen({
  settings,
  summary,
  sessions,
  timetable,
  onSettingsUpdated,
  onTimetableGenerated,
  onClose,
}: GenerateScreenProps) {
  const [selectedSemesters, setSelectedSemesters] = useState<Set<number>>(new Set([1, 2, 3]));
  const [pipeline, setPipeline] = useState<PipelineState>('standby');
  const [genError, setGenError] = useState('');
  const [result, setResult] = useState<TimetableResult | null>(null);
  const [lunchSaving, setLunchSaving] = useState(false);
  const [lunchError, setLunchError] = useState('');

  const presets = useMemo(() => lunchPresets(settings.periods), [settings.periods]);

  const cohortsBySem = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const sem of SEMESTERS) map.set(sem, []);
    for (const cid of settings.cohorts) {
      const sem = semesterOfCohort(cid);
      if (sem !== undefined && map.has(sem)) map.get(sem)!.push(cid);
    }
    return map;
  }, [settings.cohorts]);

  const sessionsBySem = useMemo(() => {
    const counts = new Map<number, number>();
    for (const s of sessions) counts.set(s.semester, (counts.get(s.semester) || 0) + 1);
    return counts;
  }, [sessions]);

  const selectedCourseCount = SEMESTERS.filter((s) => selectedSemesters.has(s)).reduce(
    (acc, s) => acc + (summary[String(s)]?.courseCount ?? 0),
    0
  );
  const totalCourseCount = SEMESTERS.reduce((acc, s) => acc + (summary[String(s)]?.courseCount ?? 0), 0);

  const lunchClashCount = timetable.validation.conflicts.filter(
    (c) => c.code === 'LUNCH_BREAK_OVERLAP'
  ).length;

  const dayRange = settings.days.length
    ? `${DAY_SHORT[settings.days[0]] ?? settings.days[0]} – ${DAY_SHORT[settings.days[settings.days.length - 1]] ?? ''} (${settings.days.length} Days)`
    : 'None';

  const toggleSemester = (sem: number) => {
    setSelectedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(sem)) {
        if (next.size > 1) next.delete(sem);
      } else {
        next.add(sem);
      }
      return next;
    });
  };

  const saveLunch = async (patch: ScheduleSettingsPatch) => {
    setLunchSaving(true);
    setLunchError('');
    try {
      const updated = await updateScheduleSettings(patch);
      onSettingsUpdated(updated);
    } catch (err) {
      setLunchError(err instanceof Error ? err.message : 'Could not save lunch setting.');
    } finally {
      setLunchSaving(false);
    }
  };

  const defaultFor = (sem: number): LunchBreakInterval =>
    settings.semesterLunchDefaults?.[String(sem)] ?? { startTime: '13:00', endTime: '14:00' };

  const handleGenerate = async () => {
    setPipeline('running');
    setGenError('');
    setResult(null);
    try {
      const res = await generateTimetable({
        semesters: Array.from(selectedSemesters).sort((a, b) => a - b),
      });
      setResult(res);
      onTimetableGenerated(res);
      setPipeline('complete');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Generation failed';
      setGenError(msg);
      setPipeline('failed');
    }
  };

  const pipelinePct = pipeline === 'complete' ? 100 : pipeline === 'running' ? 60 : 0;
  const pipelineLabel =
    pipeline === 'complete'
      ? 'Complete • 100%'
      : pipeline === 'running'
        ? 'Solving… • 60%'
        : pipeline === 'failed'
          ? 'Failed • 0%'
          : 'Standby • 0%';

  return (
    <section className="screen" aria-labelledby="generate-title">
      <div className="screen-header">
        <div>
          <h1 id="generate-title" className="screen-title">
            Generate Timetable
          </h1>
          <p className="screen-subtitle">
            Deterministic heuristic solver with hard-constraint validation across the selected semesters.
          </p>
        </div>
      </div>

      {/* 1. Semester scope */}
      <div className="panel">
        <h2 className="panel__heading">
          <span className="panel__step" aria-hidden="true" />
          1. Curricular scope
        </h2>
        <div className="sem-cards">
          {SEMESTERS.map((sem) => {
            const data = summary[String(sem)];
            const cohorts = cohortsBySem.get(sem) ?? [];
            const active = selectedSemesters.has(sem);
            const sessionCount = sessionsBySem.get(sem) ?? 0;
            return (
              <article key={sem} className={`sem-card ${active ? 'sem-card--active' : 'sem-card--off'}`}>
                <div className="sem-card__head">
                  <h3 className="sem-card__title">Semester {romanSemester(sem)}</h3>
                  <label className="check sem-card__toggle">
                    <input type="checkbox" checked={active} onChange={() => toggleSemester(sem)} />
                    <span className="sr-only">Include Semester {romanSemester(sem)}</span>
                  </label>
                </div>
                <dl className="kv">
                  <div className="kv__row">
                    <dt>Curricular load</dt>
                    <dd>
                      {data?.courseCount ?? 0} courses ({data?.weeklyHours.total ?? 0}h)
                    </dd>
                  </div>
                  <div className="kv__row">
                    <dt>Cohort partition</dt>
                    <dd>{cohorts.map(sectionLabel).join(' & ') || 'None'}</dd>
                  </div>
                  <div className="kv__row">
                    <dt>Headcount</dt>
                    <dd>{cohorts.length * settings.cohortSize} students</dd>
                  </div>
                  <div className="kv__row">
                    <dt>Weekly sessions</dt>
                    <dd>
                      {sessionCount}{' '}
                      <span className={`status-tag ${sessionCount > 0 ? 'status-tag--ok' : 'status-tag--warn'}`}>
                        {sessionCount > 0 ? 'Ready' : 'None'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>

      {/* 2. Scheduling parameters */}
      <div className="panel">
        <h2 className="panel__heading">
          <span className="panel__step" aria-hidden="true" />
          2. Scheduling parameters &amp; structural constraints
        </h2>
        <div className="param-grid">
          <div className="param">
            <div className="param__label">Working days cycle</div>
            <div className="param__hint">Weekly instructional days</div>
            <div className="param__value">{dayRange}</div>
          </div>
          <div className="param">
            <div className="param__label">Max consecutive teaching hours</div>
            <div className="param__hint">Ceiling for instructor fatigue protection</div>
            <select className="ui-select" value="3" disabled aria-describedby="max-hours-note">
              <option value="3">3 Hours (Default)</option>
            </select>
            <div id="max-hours-note" className="param__note">
              Shown for reference. The solver does not enforce this limit yet.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Mandatory lunch constraint */}
      <div className="panel panel--hard">
        <div className="panel__head-row">
          <div>
            <h2 className="panel__heading">
              <span className="panel__icon">
                <IconFork />
              </span>
              3. Mandatory hard constraint: semester lunch breaks &amp; cohort overrides
            </h2>
            <p className="panel__hint-line">
              Protected interval. No lecture, lab, or tutorial may overlap an effective lunch break.
            </p>
          </div>
          <span
            className={`boundary-chip ${lunchClashCount === 0 ? 'boundary-chip--ok' : 'boundary-chip--bad'}`}
          >
            Hard boundary ({lunchClashCount} clash{lunchClashCount === 1 ? '' : 'es'})
          </span>
        </div>

        <div className="lunch-grid">
          {SEMESTERS.map((sem) => {
            const cohorts = cohortsBySem.get(sem) ?? [];
            const def = defaultFor(sem);
            return (
              <div key={sem} className="lunch-col">
                <div className="lunch-col__head">
                  <span className="lunch-col__title">Semester {romanSemester(sem)} default</span>
                  <span className="lunch-col__sections">{cohorts.map(sectionLabel).join(' & ') || '—'}</span>
                </div>
                <LunchTimingControl
                  label={`Semester ${romanSemester(sem)} default timing`}
                  value={def}
                  presets={presets}
                  disabled={lunchSaving}
                  onCommit={(v) => saveLunch({ semesterLunchDefaults: { [String(sem)]: v } })}
                />

                {cohorts.map((cid) => {
                  const override = settings.cohortLunchOverrides?.[cid];
                  return (
                    <div key={cid} className="lunch-override">
                      <div className="lunch-override__head">
                        <span className="lunch-override__name">{sectionLabel(cid)} division override</span>
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={Boolean(override)}
                            disabled={lunchSaving}
                            onChange={(e) =>
                              saveLunch({
                                cohortLunchOverrides: { [cid]: e.target.checked ? { ...def } : null },
                              })
                            }
                          />
                          <span>Override</span>
                        </label>
                      </div>
                      {override ? (
                        <LunchTimingControl
                          label={`${cid} override timing`}
                          value={override}
                          presets={presets}
                          disabled={lunchSaving}
                          onCommit={(v) => saveLunch({ cohortLunchOverrides: { [cid]: v } })}
                        />
                      ) : (
                        <div className="lunch-override__inherit">
                          Inheriting default ({def.startTime} – {def.endTime})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        {lunchSaving && <div className="panel__status" role="status">Saving lunch setting…</div>}
        {lunchError && <div className="panel__error" role="alert">{lunchError}</div>}
      </div>

      {/* 4. Solver pipeline */}
      <div className="panel">
        <div className="panel__head-row">
          <h2 className="panel__heading">
            <span className="panel__icon">
              <IconCpu />
            </span>
            Solver execution pipeline
          </h2>
          <span className={`pipeline-state pipeline-state--${pipeline}`}>{pipelineLabel}</span>
        </div>
        <div className="progress" aria-hidden="true">
          <div className="progress__bar" style={{ width: `${pipelinePct}%` }} />
        </div>
        <ul className="pipeline-steps">
          <li>
            <span>
              Curriculum syllabi &amp; weekly contact targets ({selectedCourseCount} of {totalCourseCount} courses)
            </span>
            <span className="status-tag status-tag--ok">Ready</span>
          </li>
          <li>
            <span>Teacher assignment cap (max {settings.teacherMaxCourseAssignments}) &amp; room capacity matching</span>
            <span className="status-tag status-tag--ok">Ready</span>
          </li>
          <li>
            <span>Cohort lunch recess non-overlap hard constraints</span>
            <span className="status-tag status-tag--ok">Enforced</span>
          </li>
        </ul>

        {genError && (
          <div className="panel__error" role="alert">
            {genError}
          </div>
        )}

        {result && <GenerationSummary result={result} />}

        <div className="panel__footer">
          <span className="panel__footnote">
            Checked on every run: teacher and cohort clashes, room conflicts, and lunch-break breaches.
          </span>
          <div className="panel__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleGenerate}
              disabled={pipeline === 'running' || selectedSemesters.size === 0}
            >
              <IconBolt />
              {pipeline === 'running' ? 'Generating…' : 'Generate Timetable'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function GenerationSummary({ result }: { result: TimetableResult }) {
  const valid = result.validation.valid;
  const conflicts = result.validation.conflicts;
  return (
    <div className={`gen-result ${valid ? 'gen-result--ok' : 'gen-result--bad'}`} role="status">
      <div className="gen-result__title">
        {valid ? 'Schedule generated & validated' : 'Generation produced conflicts'}
      </div>
      <div className="gen-result__stats">
        Scheduled <strong>{result.metrics.scheduledSessionCount}</strong> · Unscheduled{' '}
        <strong>{result.metrics.unscheduledSessionCount}</strong> · Hard conflicts{' '}
        <strong>{result.metrics.hardConflictCount}</strong>
      </div>
      {conflicts.length > 0 && (
        <ul className="gen-result__list">
          {conflicts.slice(0, 8).map((c, i) => (
            <li key={`${c.code}-${i}`}>
              <strong>[{c.code}]</strong> {c.message}
            </li>
          ))}
          {conflicts.length > 8 && <li>…and {conflicts.length - 8} more</li>}
        </ul>
      )}
    </div>
  );
}

/**
 * Timing selector: hourly presets derived from the configured periods, plus a
 * custom start/end entry so arbitrary lunch windows remain possible.
 */
function LunchTimingControl({
  label,
  value,
  presets,
  disabled,
  onCommit,
}: {
  label: string;
  value: LunchBreakInterval;
  presets: { key: string; start: string; end: string }[];
  disabled: boolean;
  onCommit: (v: LunchBreakInterval) => void;
}) {
  const key = `${value.startTime}-${value.endTime}`;
  const isPreset = presets.some((p) => p.key === key);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [draftStart, setDraftStart] = useState(value.startTime);
  const [draftEnd, setDraftEnd] = useState(value.endTime);
  const [draftError, setDraftError] = useState('');

  useEffect(() => {
    setDraftStart(value.startTime);
    setDraftEnd(value.endTime);
    setDraftError('');
  }, [value.startTime, value.endTime]);

  const selectValue = customOpen ? 'custom' : key;

  return (
    <div className="lunch-timing">
      <select
        className="ui-select"
        aria-label={label}
        value={selectValue}
        disabled={disabled}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setCustomOpen(true);
            return;
          }
          const preset = presets.find((p) => p.key === e.target.value);
          if (preset) {
            setCustomOpen(false);
            onCommit({ startTime: preset.start, endTime: preset.end });
          }
        }}
      >
        {presets.map((p) => (
          <option key={p.key} value={p.key}>
            Timing: {p.start} – {p.end}
          </option>
        ))}
        {!isPreset && !customOpen && (
          <option value={key}>
            Timing: {value.startTime} – {value.endTime}
          </option>
        )}
        <option value="custom">Custom interval…</option>
      </select>

      {customOpen && (
        <div className="lunch-custom">
          <input
            type="time"
            className="ui-input"
            aria-label={`${label} start`}
            value={draftStart}
            disabled={disabled}
            onChange={(e) => setDraftStart(e.target.value)}
          />
          <span className="lunch-custom__to">to</span>
          <input
            type="time"
            className="ui-input"
            aria-label={`${label} end`}
            value={draftEnd}
            disabled={disabled}
            onChange={(e) => setDraftEnd(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--small"
            disabled={disabled}
            onClick={() => {
              const err = validateInterval(draftStart, draftEnd);
              if (err) {
                setDraftError(err);
                return;
              }
              setDraftError('');
              onCommit({ startTime: draftStart, endTime: draftEnd });
            }}
          >
            Apply
          </button>
          {draftError && <div className="lunch-custom__error" role="alert">{draftError}</div>}
        </div>
      )}
    </div>
  );
}
