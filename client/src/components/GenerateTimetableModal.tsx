/**
 * SlotShield — GenerateTimetableModal
 * Dialog to trigger deterministic schedule generation.
 * Prominently presents effective lunch intervals for each cohort prior to generation,
 * and reports unscheduled sessions / blocking constraints honestly.
 */
import { useState } from 'react';
import type { ScheduleSettings, TimetableResult } from '../lib/api.ts';
import { generateTimetable, ApiError } from '../lib/api.ts';

interface GenerateTimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScheduleSettings;
  onTimetableGenerated: (result: TimetableResult) => void;
}

export function GenerateTimetableModal({
  isOpen,
  onClose,
  settings,
  onTimetableGenerated,
}: GenerateTimetableModalProps) {
  if (!isOpen) return null;

  const [selectedSemesters, setSelectedSemesters] = useState<Set<number>>(new Set([1, 2, 3]));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<TimetableResult | null>(null);

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

  // Resolve effective lunch for each cohort
  const cohorts = settings.cohorts || ['CE-S1-A', 'CE-S2-A', 'CE-S3-A'];
  const cohortLunchInfo = cohorts.map((cid) => {
    const semMatch = cid.match(/S(\d)/);
    const sem = semMatch ? Number(semMatch[1]) : 1;

    let startTime = '13:00';
    let endTime = '14:00';
    let isOverride = false;

    if (settings.cohortLunchOverrides?.[cid]) {
      const o = settings.cohortLunchOverrides[cid];
      if (o && o.startTime && o.endTime) {
        startTime = o.startTime;
        endTime = o.endTime;
        isOverride = true;
      }
    } else if (settings.semesterLunchDefaults?.[String(sem)]) {
      const def = settings.semesterLunchDefaults[String(sem)];
      if (def && def.startTime && def.endTime) {
        startTime = def.startTime;
        endTime = def.endTime;
      }
    } else if (settings.lunchBreak && settings.lunchBreak.includes('-')) {
      const [s, e] = settings.lunchBreak.split('-').map((x) => x.trim());
      startTime = s;
      endTime = e;
    }

    return {
      cohortId: cid,
      semester: sem,
      startTime,
      endTime,
      isOverride,
      isSelected: selectedSemesters.has(sem),
    };
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const res = await generateTimetable({
        semesters: Array.from(selectedSemesters).sort(),
      });
      setResult(res);
      onTimetableGenerated(res);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Generation failed';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 11, 20, 0.82)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--navy-900, #0f1e36)',
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: 'var(--radius-lg, 12px)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary, #f1f5f9)',
          padding: '1.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚡</span> Generate Timetable
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Deterministic heuristic solver with hard constraint validation across all selected semesters.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #94a3b8)',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
              borderRadius: 'var(--radius-sm, 4px)',
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Semester Selection */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', display: 'block', marginBottom: '0.5rem' }}>
            Target Semesters
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3].map((sem) => {
              const active = selectedSemesters.has(sem);
              return (
                <button
                  key={`sem-btn-${sem}`}
                  type="button"
                  onClick={() => toggleSemester(sem)}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: 'var(--radius-md, 8px)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    background: active ? 'var(--emerald-500, #10b981)' : 'var(--navy-950, #0a1322)',
                    color: active ? 'var(--navy-950, #050b14)' : 'var(--text-secondary, #94a3b8)',
                    border: `1px solid ${active ? 'var(--emerald-500, #10b981)' : 'rgba(148, 163, 184, 0.2)'}`,
                  }}
                >
                  Semester {sem === 1 ? 'I' : sem === 2 ? 'II' : 'III'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Effective Lunch Intervals Section */}
        <div style={{ marginBottom: '1.5rem', background: 'var(--navy-950, #0a1322)', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: 'var(--radius-md, 8px)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--emerald-400, #34d399)' }}>
              🍱 Effective Protected Lunch Intervals
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Mandatory Hard Constraint
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {cohortLunchInfo
              .filter((c) => c.isSelected)
              .map((c) => (
                <div
                  key={`lunch-preview-${c.cohortId}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--navy-900, #0f1e36)',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', marginRight: '0.5rem' }}>
                      {c.cohortId}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                      (Semester {c.semester})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {c.startTime} – {c.endTime}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        background: c.isOverride ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: c.isOverride ? 'var(--emerald-400, #34d399)' : '#93c5fd',
                        border: `1px solid ${c.isOverride ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      }}
                    >
                      {c.isOverride ? 'Cohort Override' : 'Semester Default'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.5rem' }}>
            ℹ️ No lecture, tutorial, practical, or multi-slot session may overlap or cross these protected intervals.
          </div>
        </div>

        {/* Results Banner if Generated */}
        {result && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md, 8px)',
              background: result.validation.valid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${result.validation.valid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: result.validation.valid ? 'var(--emerald-400)' : '#fca5a5', marginBottom: '0.35rem' }}>
              {result.validation.valid ? '✓ Schedule Generated & Validated' : '⚠️ Generation Produced Conflicts'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
              Scheduled: <strong>{result.metrics.scheduledSessionCount}</strong> sessions | Unscheduled: <strong>{result.metrics.unscheduledSessionCount}</strong> | Hard Conflicts: <strong>{result.metrics.hardConflictCount}</strong>
            </div>

            {result.validation.conflicts.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fca5a5', marginBottom: '0.25rem' }}>
                  Constraint Violations:
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {result.validation.conflicts.map((c, i) => (
                    <div key={`conf-${i}`} style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.5rem', borderRadius: '4px' }}>
                      <strong style={{ color: '#fca5a5' }}>[{c.code}]</strong> {c.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: 'var(--text-secondary, #94a3b8)',
              borderRadius: 'var(--radius-md, 8px)',
              fontWeight: 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--emerald-500, #10b981)',
              border: 'none',
              color: 'var(--navy-950, #050b14)',
              borderRadius: 'var(--radius-md, 8px)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: generating ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {generating ? 'Generating…' : 'Generate Timetable'}
          </button>
        </div>
      </div>
    </div>
  );
}
