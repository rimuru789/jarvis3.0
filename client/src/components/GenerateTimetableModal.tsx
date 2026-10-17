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
        backgroundColor: 'rgba(41, 70, 53, 0.45)',
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
          background: '#FFFFFF',
          border: '1px solid #DCE5D5',
          borderRadius: 'var(--radius-lg, 12px)',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(41, 70, 53, 0.1), 0 8px 10px -6px rgba(41, 70, 53, 0.05)',
          color: '#294635',
          padding: '1.75rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #DCE5D5', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#294635' }}>
              <span>⚡</span> Generate Timetable
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#526B57' }}>
              Deterministic heuristic solver with hard constraint validation across all selected semesters.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#526B57',
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
              background: '#F8DFDA',
              border: '1px solid #E8A29A',
              color: '#762D27',
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
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#526B57', display: 'block', marginBottom: '0.5rem' }}>
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
                    background: active ? '#5B8C51' : '#F7F4E8',
                    color: active ? '#FFFFFF' : '#526B57',
                    border: `1px solid ${active ? '#5B8C51' : '#DCE5D5'}`,
                  }}
                >
                  Semester {sem === 1 ? 'I' : sem === 2 ? 'II' : 'III'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Effective Lunch Intervals Section */}
        <div style={{ marginBottom: '1.5rem', background: '#F7F4E8', border: '1px solid #DCE5D5', borderRadius: 'var(--radius-md, 8px)', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5B8C51' }}>
              🍱 Effective Protected Lunch Intervals
            </span>
            <span style={{ fontSize: '0.75rem', color: '#526B57' }}>
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
                    background: '#FFFFFF',
                    borderRadius: 'var(--radius-sm, 4px)',
                    border: '1px solid #DCE5D5',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', marginRight: '0.5rem', color: '#294635' }}>
                      {c.cohortId}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#526B57' }}>
                      (Semester {c.semester})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#294635' }}>
                      {c.startTime} – {c.endTime}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        background: '#EDF5E8',
                        color: c.isOverride ? '#5B8C51' : '#526B57',
                        border: `1px solid ${c.isOverride ? '#B7D8A9' : '#DCE5D5'}`,
                      }}
                    >
                      {c.isOverride ? 'Cohort Override' : 'Semester Default'}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#526B57', marginTop: '0.5rem' }}>
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
              background: result.validation.valid ? '#EDF5E8' : '#F8DFDA',
              border: `1px solid ${result.validation.valid ? '#B7D8A9' : '#E8A29A'}`,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: result.validation.valid ? '#294635' : '#762D27', marginBottom: '0.35rem' }}>
              {result.validation.valid ? '✓ Schedule Generated & Validated' : '⚠️ Generation Produced Conflicts'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#294635' }}>
              Scheduled: <strong>{result.metrics.scheduledSessionCount}</strong> sessions | Unscheduled: <strong>{result.metrics.unscheduledSessionCount}</strong> | Hard Conflicts: <strong>{result.metrics.hardConflictCount}</strong>
            </div>

            {result.validation.conflicts.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#762D27', marginBottom: '0.25rem' }}>
                  Constraint Violations:
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {result.validation.conflicts.map((c, i) => (
                    <div key={`conf-${i}`} style={{ fontSize: '0.75rem', background: '#F8DFDA', border: '1px solid #E8A29A', padding: '0.35rem 0.5rem', borderRadius: '4px', color: '#762D27' }}>
                      <strong style={{ color: '#B94D43' }}>[{c.code}]</strong> {c.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #DCE5D5', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'transparent',
              border: '1px solid #DCE5D5',
              color: '#526B57',
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
              background: '#5B8C51',
              border: 'none',
              color: '#FFFFFF',
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
