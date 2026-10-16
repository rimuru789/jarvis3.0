/**
 * SlotShield — Main Application shell
 *
 * Four primary views share one bootstrap payload:
 *   master      — Master Timetable (weekly grid, semester filter, metrics)
 *   generate    — Generate Timetable (scope, lunch hard constraints, solver)
 *   disruption  — Disruption Simulator (stage a faculty/room disruption)
 *   repair      — Repair Proposal (review and apply the staged repair)
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  BootstrapPayload,
  RepairProposal as RepairProposalType,
  ScheduleSettings,
  TimetableEntry,
  TimetableResult,
} from './lib/api.ts';
import { getBootstrap, ApiError } from './lib/api.ts';
import { buildLookups } from './lib/lookups.ts';
import { AppHeader, type ViewId } from './components/AppHeader.tsx';
import { TimetableGrid } from './components/TimetableGrid.tsx';
import { SemesterFilter } from './components/SemesterFilter.tsx';
import { MetricsPanel } from './components/MetricsPanel.tsx';
import { GenerateScreen } from './components/GenerateScreen.tsx';
import { DisruptionSimulator } from './components/DisruptionSimulator.tsx';
import { RepairProposal } from './components/RepairProposal.tsx';

type AppState = 'loading' | 'ready' | 'error';

export function App() {
  const [state, setState] = useState<AppState>('loading');
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [error, setError] = useState<string>('');
  const [view, setView] = useState<ViewId>('master');
  const [proposal, setProposal] = useState<RepairProposalType | null>(null);
  const [selectedSemesters, setSelectedSemesters] = useState<Set<number>>(new Set([1, 2, 3]));

  const handleSettingsUpdated = useCallback((updated: ScheduleSettings) => {
    setData((prev) => (prev ? { ...prev, scheduleSettings: updated } : prev));
  }, []);

  const handleTimetableGenerated = useCallback((generated: TimetableResult) => {
    setData((prev) => (prev ? { ...prev, sampleTimetable: generated } : prev));
    // A proposal belongs to the timetable it was computed against.
    setProposal(null);
  }, []);

  const handleRepairApplied = useCallback((updated: TimetableResult) => {
    setData((prev) => (prev ? { ...prev, sampleTimetable: updated } : prev));
  }, []);

  const loadData = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const bootstrap = await getBootstrap();
      setData(bootstrap);
      setState('ready');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to load data';
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

  const lookups = useMemo(() => (data ? buildLookups(data) : null), [data]);

  const filteredEntries: TimetableEntry[] = useMemo(
    () =>
      data
        ? data.sampleTimetable.entries.filter((e) => selectedSemesters.has(e.semester))
        : [],
    [data, selectedSemesters]
  );

  const headerStats = data
    ? {
        semesters: Object.keys(data.summary).length,
        faculty: data.teachers.length,
        courses: data.courses.length,
      }
    : null;

  const headerStatus: 'live' | 'connecting' | 'offline' =
    state === 'ready' ? 'live' : state === 'error' ? 'offline' : 'connecting';

  return (
    <div className="app-layout">
      <AppHeader view={view} onNavigate={setView} stats={headerStats} status={headerStatus} />

      <main className="app-main" id="main">
        {state === 'loading' && <LoadingState />}
        {state === 'error' && <ErrorState message={error} onRetry={loadData} />}

        {state === 'ready' && data && lookups && (
          <>
            {view === 'master' && (
              <section className="screen" aria-labelledby="master-title">
                <div className="screen-header">
                  <div>
                    <h1 id="master-title" className="screen-title">
                      Master Timetable
                    </h1>
                    <p className="screen-subtitle">
                      Computer Engineering · Academic Year 2026–27 · SLRTCE R-2025 curriculum
                    </p>
                  </div>
                </div>

                <div className="info-banner" role="note">
                  <span className="info-banner__icon" aria-hidden="true">
                    i
                  </span>
                  <span>
                    Displaying pre-validated demo schedule with {data.sampleTimetable.metrics.scheduledSessionCount}{' '}
                    sessions across {Object.keys(data.summary).length} semesters. Teacher assignments and room
                    allocations are synthetic demo data.
                  </span>
                </div>

                <MetricsPanel
                  metrics={data.sampleTimetable.metrics}
                  validation={data.sampleTimetable.validation}
                  summary={data.summary}
                  selectedSemesters={selectedSemesters}
                  filteredEntryCount={filteredEntries.length}
                />

                <SemesterFilter
                  selected={selectedSemesters}
                  summary={data.summary}
                  onToggle={handleSemesterToggle}
                  onSelectAll={handleSelectAll}
                />

                {filteredEntries.length === 0 ? (
                  <EmptyState />
                ) : (
                  <TimetableGrid
                    entries={filteredEntries}
                    scheduleSettings={data.scheduleSettings}
                    lookups={lookups}
                  />
                )}
              </section>
            )}

            {view === 'generate' && (
              <GenerateScreen
                settings={data.scheduleSettings}
                summary={data.summary}
                sessions={data.sessions}
                timetable={data.sampleTimetable}
                onSettingsUpdated={handleSettingsUpdated}
                onTimetableGenerated={handleTimetableGenerated}
                onClose={() => setView('master')}
              />
            )}

            {view === 'disruption' && (
              <DisruptionSimulator
                data={data}
                timetable={data.sampleTimetable}
                lookups={lookups}
                proposal={proposal}
                onProposal={setProposal}
                onProceed={() => setView('repair')}
              />
            )}

            {view === 'repair' && (
              <RepairProposal
                data={data}
                timetable={data.sampleTimetable}
                lookups={lookups}
                proposal={proposal}
                onApplied={handleRepairApplied}
                onGoSimulate={() => setView('disruption')}
                onGoMaster={() => setView('master')}
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
    <div className="state-container" role="status">
      <div className="spinner" />
      <div className="state-container__title">Loading SlotShield</div>
      <div className="state-container__message">Fetching timetable data and course catalogue…</div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="state-container" role="alert">
      <div className="state-container__icon" aria-hidden="true">
        !
      </div>
      <div className="state-container__title">Unable to load data</div>
      <div className="state-container__message">{message}</div>
      <button type="button" className="btn btn--primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="state-container">
      <div className="state-container__title">No sessions found</div>
      <div className="state-container__message">
        No timetable entries match the current filter. Try selecting a different semester.
      </div>
    </div>
  );
}
