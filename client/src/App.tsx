/**
 * SlotShield — Main Application
 * Dashboard with weekly timetable grid, semester filters, and metrics.
 * Renders the actual sample data from bootstrap.json.
 */
import { useState, useEffect, useCallback } from 'react';
import type { BootstrapPayload, TimetableEntry } from './lib/api.ts';
import { getBootstrap, ApiError } from './lib/api.ts';
import { TimetableGrid } from './components/TimetableGrid.tsx';
import { SemesterFilter } from './components/SemesterFilter.tsx';
import { MetricsPanel } from './components/MetricsPanel.tsx';

type AppState = 'loading' | 'ready' | 'error';

export function App() {
  const [state, setState] = useState<AppState>('loading');
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState<string>('');
  const [selectedSemesters, setSelectedSemesters] = useState<Set<number>>(
    new Set([1, 2, 3])
  );

  const loadData = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      setState('ready');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load data';
      setError(message);
      setState('error');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSemesterToggle = useCallback((semester: number) => {
    setSelectedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(semester)) {
        // Don't allow deselecting all
        if (next.size > 1) {
          next.delete(semester);
        }
      } else {
        next.add(semester);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedSemesters(new Set([1, 2, 3]));
  }, []);

  // Filter entries by selected semesters
  const filteredEntries: TimetableEntry[] = data
    ? data.sampleTimetable.entries.filter((e) =>
        selectedSemesters.has(e.semester)
      )
    : [];

  // Build course name lookup
  const courseNameMap: Record<string, string> = {};
  const courseCodeMap: Record<string, string> = {};
  if (data) {
    for (const c of data.courses) {
      courseNameMap[c.courseId] = c.courseName;
      courseCodeMap[c.courseId] = c.courseCode;
    }
  }

  // Build teacher name lookup
  const teacherNameMap: Record<string, string> = {};
  if (data) {
    for (const t of data.teachers) {
      // Extract short name: "Demo Faculty 01 — Mathematics" → "Mathematics"
      const parts = t.displayName.split('—');
      teacherNameMap[t.teacherId] =
        parts.length > 1 ? parts[1].trim() : t.displayName;
    }
  }

  // Build room name lookup
  const roomNameMap: Record<string, string> = {};
  if (data) {
    for (const r of data.rooms) {
      roomNameMap[r.roomId] = r.displayName;
    }
  }

  // Determine session type from session ID
  const getSessionType = (entry: TimetableEntry): string => {
    const sid = entry.sessionId;
    if (sid.includes('-LEC-')) return 'LECTURE';
    if (sid.includes('-TUT-')) return 'TUTORIAL';
    if (sid.includes('-PRA-')) return 'PRACTICAL';
    return 'LECTURE';
  };

  return (
    <div className="app-layout">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__left">
          <div className="app-header__logo">
            <div className="app-header__icon">S</div>
            <div>
              <div className="app-header__title">SlotShield</div>
              <div className="app-header__subtitle">
                Self-Healing Timetable
              </div>
            </div>
          </div>
        </div>
        <div className="app-header__right">
          <div className="demo-badge">
            <span className="demo-badge__dot" />
            Demo Data
          </div>
        </div>
      </header>

      {/* ─── Main Content ────────────────────────────────────── */}
      <main className="app-main">
        {state === 'loading' && <LoadingState />}
        {state === 'error' && (
          <ErrorState message={error} onRetry={loadData} />
        )}
        {state === 'ready' && data && (
          <>
            {/* Dashboard Title */}
            <div className="dashboard-header">
              <h1 className="dashboard-header__title">
                Timetable Dashboard
              </h1>
              <p className="dashboard-header__desc">
                Computer Engineering — Academic Year 2026–27 — SLRTCE R-2025
                Curriculum
              </p>
            </div>

            {/* Info Banner */}
            <div className="info-banner">
              <span className="info-banner__icon">ℹ️</span>
              <span>
                Displaying pre-validated demo schedule with{' '}
                {data.sampleTimetable.metrics.scheduledSessionCount} sessions
                across {Object.keys(data.summary).length} semesters. Teacher
                assignments and room allocations are synthetic demo data.
              </span>
            </div>

            {/* Metrics */}
            <MetricsPanel
              metrics={data.sampleTimetable.metrics}
              validation={data.sampleTimetable.validation}
              summary={data.summary}
              selectedSemesters={selectedSemesters}
              filteredEntryCount={filteredEntries.length}
            />

            {/* Semester Filter */}
            <SemesterFilter
              selected={selectedSemesters}
              summary={data.summary}
              onToggle={handleSemesterToggle}
              onSelectAll={handleSelectAll}
            />

            {/* Timetable Grid */}
            {filteredEntries.length === 0 ? (
              <EmptyState />
            ) : (
              <TimetableGrid
                entries={filteredEntries}
                timeSlots={data.timeSlots}
                scheduleSettings={data.scheduleSettings}
                courseNameMap={courseNameMap}
                courseCodeMap={courseCodeMap}
                teacherNameMap={teacherNameMap}
                roomNameMap={roomNameMap}
                getSessionType={getSessionType}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── State Components ────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="state-container">
      <div className="spinner" />
      <div className="state-container__title">Loading SlotShield</div>
      <div className="state-container__message">
        Fetching timetable data and course catalogue…
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="state-container">
      <div className="state-container__icon">⚠️</div>
      <div className="state-container__title">Unable to Load Data</div>
      <div className="state-container__message">{message}</div>
      <button
        onClick={onRetry}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: 'var(--emerald-500)',
          color: 'var(--navy-950)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'inherit',
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="state-container">
      <div className="state-container__icon">📅</div>
      <div className="state-container__title">No Sessions Found</div>
      <div className="state-container__message">
        No timetable entries match the current filter. Try selecting a
        different semester.
      </div>
    </div>
  );
}
