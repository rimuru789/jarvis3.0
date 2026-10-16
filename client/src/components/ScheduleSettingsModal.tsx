/**
 * SlotShield — ScheduleSettingsModal
 * Settings dialog for semester default lunch intervals and optional cohort-level overrides.
 */
import { useState } from 'react';
import type { ScheduleSettings, LunchBreakInterval } from '../lib/api.ts';
import { updateScheduleSettings, ApiError } from '../lib/api.ts';

interface ScheduleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScheduleSettings;
  onSettingsUpdated: (updated: ScheduleSettings) => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateInterval(start: string, end: string): string | null {
  if (!TIME_REGEX.test(start)) {
    return 'Start time must be in HH:mm format (e.g. 13:00)';
  }
  if (!TIME_REGEX.test(end)) {
    return 'End time must be in HH:mm format (e.g. 14:00)';
  }
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const sMin = sh * 60 + sm;
  const eMin = eh * 60 + em;
  if (sMin >= eMin) {
    return 'Start time must be strictly before end time';
  }
  return null;
}

export function ScheduleSettingsModal({
  isOpen,
  onClose,
  settings,
  onSettingsUpdated,
}: ScheduleSettingsModalProps) {
  if (!isOpen) return null;

  // Initialize semester defaults state
  const [semesterDefaults, setSemesterDefaults] = useState<Record<string, LunchBreakInterval>>({
    '1': settings.semesterLunchDefaults?.['1'] || { startTime: '13:00', endTime: '14:00' },
    '2': settings.semesterLunchDefaults?.['2'] || { startTime: '13:00', endTime: '14:00' },
    '3': settings.semesterLunchDefaults?.['3'] || { startTime: '13:00', endTime: '14:00' },
  });

  // Track enabled state and interval for cohort overrides
  const cohorts = settings.cohorts || ['CE-S1-A', 'CE-S2-A', 'CE-S3-A'];

  const [cohortOverrides, setCohortOverrides] = useState<Record<string, { enabled: boolean; interval: LunchBreakInterval }>>(() => {
    const initial: Record<string, { enabled: boolean; interval: LunchBreakInterval }> = {};
    for (const cid of cohorts) {
      const existing = settings.cohortLunchOverrides?.[cid];
      if (existing) {
        initial[cid] = { enabled: true, interval: { ...existing } };
      } else {
        // Default to semester default as starting template
        const semMatch = cid.match(/S(\d)/);
        const semKey = semMatch ? semMatch[1] : '1';
        const semDef = settings.semesterLunchDefaults?.[semKey] || { startTime: '13:00', endTime: '14:00' };
        initial[cid] = { enabled: false, interval: { ...semDef } };
      }
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSemesterTimeChange = (sem: string, field: 'startTime' | 'endTime', value: string) => {
    setSemesterDefaults((prev) => ({
      ...prev,
      [sem]: {
        ...prev[sem],
        [field]: value,
      },
    }));
  };

  const handleCohortOverrideToggle = (cid: string) => {
    setCohortOverrides((prev) => ({
      ...prev,
      [cid]: {
        ...prev[cid],
        enabled: !prev[cid].enabled,
      },
    }));
  };

  const handleCohortTimeChange = (cid: string, field: 'startTime' | 'endTime', value: string) => {
    setCohortOverrides((prev) => ({
      ...prev,
      [cid]: {
        ...prev[cid],
        interval: {
          ...prev[cid].interval,
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setError('');

    // Validate semester defaults
    for (const [sem, interval] of Object.entries(semesterDefaults)) {
      const err = validateInterval(interval.startTime, interval.endTime);
      if (err) {
        setError(`Semester ${sem} Default: ${err}`);
        return;
      }
    }

    // Validate active cohort overrides
    const patchOverrides: Record<string, LunchBreakInterval | null> = {};
    for (const cid of cohorts) {
      const cfg = cohortOverrides[cid];
      if (cfg && cfg.enabled) {
        const err = validateInterval(cfg.interval.startTime, cfg.interval.endTime);
        if (err) {
          setError(`Cohort ${cid} Override: ${err}`);
          return;
        }
        patchOverrides[cid] = { startTime: cfg.interval.startTime, endTime: cfg.interval.endTime };
      } else {
        patchOverrides[cid] = null; // Remove override, inherit semester default
      }
    }

    setSaving(true);
    try {
      const updated = await updateScheduleSettings({
        semesterLunchDefaults: semesterDefaults,
        cohortLunchOverrides: patchOverrides,
      });
      onSettingsUpdated(updated);
      onClose();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to save settings';
      setError(msg);
    } finally {
      setSaving(false);
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
              <span>🍱</span> Lunch Break Constraints
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)' }}>
              Configure semester-level defaults and optional cohort-specific overrides.
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
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Semester Defaults */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--emerald-400, #34d399)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Semester-Level Defaults
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {['1', '2', '3'].map((sem) => {
              const def = semesterDefaults[sem] || { startTime: '13:00', endTime: '14:00' };
              return (
                <div
                  key={`sem-def-${sem}`}
                  style={{
                    background: 'var(--navy-950, #0a1322)',
                    border: '1px solid rgba(148, 163, 184, 0.12)',
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '0.85rem',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    Semester {sem === '1' ? 'I' : sem === '2' ? 'II' : 'III'} Default
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="time"
                      value={def.startTime}
                      onChange={(e) => handleSemesterTimeChange(sem, 'startTime', e.target.value)}
                      style={{
                        background: 'var(--navy-900, #0f1e36)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        color: 'inherit',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        fontSize: '0.8rem',
                        width: '100%',
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.75rem' }}>to</span>
                    <input
                      type="time"
                      value={def.endTime}
                      onChange={(e) => handleSemesterTimeChange(sem, 'endTime', e.target.value)}
                      style={{
                        background: 'var(--navy-900, #0f1e36)',
                        border: '1px solid rgba(148, 163, 184, 0.25)',
                        color: 'inherit',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        fontSize: '0.8rem',
                        width: '100%',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Cohort Overrides */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--emerald-400, #34d399)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2. Cohort-Level Overrides (Optional)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {cohorts.map((cid) => {
              const cfg = cohortOverrides[cid] || { enabled: false, interval: { startTime: '13:00', endTime: '14:00' } };
              const semMatch = cid.match(/S(\d)/);
              const semKey = semMatch ? semMatch[1] : '1';
              const inheritedDef = semesterDefaults[semKey] || { startTime: '13:00', endTime: '14:00' };

              return (
                <div
                  key={`cohort-${cid}`}
                  style={{
                    background: 'var(--navy-950, #0a1322)',
                    border: `1px solid ${cfg.enabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.12)'}`,
                    borderRadius: 'var(--radius-md, 8px)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="checkbox"
                      id={`cb-${cid}`}
                      checked={cfg.enabled}
                      onChange={() => handleCohortOverrideToggle(cid)}
                      style={{ cursor: 'pointer', width: '1rem', height: '1rem', accentColor: 'var(--emerald-500, #10b981)' }}
                    />
                    <div>
                      <label htmlFor={`cb-${cid}`} style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>
                        {cid}
                      </label>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)' }}>
                        Semester {semKey === '1' ? 'I' : semKey === '2' ? 'II' : 'III'}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {cfg.enabled ? (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm, 4px)',
                          background: 'rgba(16, 185, 129, 0.2)',
                          color: 'var(--emerald-400, #34d399)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        ✓ Custom Override
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm, 4px)',
                          background: 'rgba(148, 163, 184, 0.12)',
                          color: 'var(--text-secondary, #94a3b8)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                        }}
                      >
                        Inheriting Sem {semKey} Default ({inheritedDef.startTime}–{inheritedDef.endTime})
                      </span>
                    )}
                  </div>

                  {/* Time Inputs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="time"
                      disabled={!cfg.enabled}
                      value={cfg.enabled ? cfg.interval.startTime : inheritedDef.startTime}
                      onChange={(e) => handleCohortTimeChange(cid, 'startTime', e.target.value)}
                      style={{
                        background: cfg.enabled ? 'var(--navy-900, #0f1e36)' : 'rgba(15, 30, 54, 0.4)',
                        border: `1px solid ${cfg.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`,
                        color: cfg.enabled ? 'inherit' : 'var(--text-secondary, #94a3b8)',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        fontSize: '0.8rem',
                        cursor: cfg.enabled ? 'text' : 'not-allowed',
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.75rem' }}>to</span>
                    <input
                      type="time"
                      disabled={!cfg.enabled}
                      value={cfg.enabled ? cfg.interval.endTime : inheritedDef.endTime}
                      onChange={(e) => handleCohortTimeChange(cid, 'endTime', e.target.value)}
                      style={{
                        background: cfg.enabled ? 'var(--navy-900, #0f1e36)' : 'rgba(15, 30, 54, 0.4)',
                        border: `1px solid ${cfg.enabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`,
                        color: cfg.enabled ? 'inherit' : 'var(--text-secondary, #94a3b8)',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-sm, 4px)',
                        fontSize: '0.8rem',
                        cursor: cfg.enabled ? 'text' : 'not-allowed',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(148, 163, 184, 0.15)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--emerald-500, #10b981)',
              border: 'none',
              color: 'var(--navy-950, #050b14)',
              borderRadius: 'var(--radius-md, 8px)',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: saving ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
