/**
 * SlotShield — MetricsPanel
 * Dashboard metric cards showing schedule statistics.
 */
import { IconAlert, IconBook, IconCalendar, IconCheck, IconCheckCircle, IconClock, IconEye, IconX } from './Icon.tsx';

interface MetricsPanelProps {
  metrics: {
    scheduledSessionCount: number;
    unscheduledSessionCount: number;
    movedEntryCount: number;
    hardConflictCount: number;
    preservedEntryPercent: number | null;
  };
  validation: {
    valid: boolean;
    hardConflictCount: number;
  };
  summary: Record<
    string,
    {
      courseCount: number;
      weeklyHours: {
        lecture: number;
        tutorial: number;
        practical: number;
        total: number;
      };
    }
  >;
  selectedSemesters: Set<number>;
  filteredEntryCount: number;
}

export function MetricsPanel({
  metrics,
  validation,
  summary,
  selectedSemesters,
  filteredEntryCount,
}: MetricsPanelProps) {
  // Calculate filtered course count and total hours
  let totalCourses = 0;
  let totalHours = 0;
  for (const [sem, data] of Object.entries(summary)) {
    if (selectedSemesters.has(Number(sem))) {
      totalCourses += data.courseCount;
      totalHours += data.weeklyHours.total;
    }
  }

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-card__icon metric-card__icon--emerald"><IconCalendar /></div>
        <div className="metric-card__value">{metrics.scheduledSessionCount}</div>
        <div className="metric-card__label">Scheduled Sessions</div>
      </div>

      <div className="metric-card">
        <div className="metric-card__icon metric-card__icon--indigo"><IconBook /></div>
        <div className="metric-card__value">{totalCourses}</div>
        <div className="metric-card__label">
          Courses ({Array.from(selectedSemesters).sort().join(', ')} Sem)
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-card__icon metric-card__icon--cyan"><IconClock /></div>
        <div className="metric-card__value">{totalHours}</div>
        <div className="metric-card__label">Contact Hours / Week</div>
      </div>

      <div className="metric-card">
        <div className="metric-card__icon metric-card__icon--amber"><IconEye /></div>
        <div className="metric-card__value">{filteredEntryCount}</div>
        <div className="metric-card__label">Filtered Entries</div>
      </div>

      <div className="metric-card">
        <div
          className={`metric-card__icon ${
            validation.valid
              ? 'metric-card__icon--success'
              : 'metric-card__icon--error'
          }`}
        >
          {validation.valid ? <IconCheckCircle /> : <IconX />}
        </div>
        <div className="metric-card__value">
          {validation.hardConflictCount}
        </div>
        <div className="metric-card__label">
          Hard Conflicts {validation.valid && '— Valid'}
        </div>
      </div>

      <div className="metric-card">
        <div
          className={`metric-card__icon ${
            metrics.unscheduledSessionCount === 0
              ? 'metric-card__icon--success'
              : 'metric-card__icon--error'
          }`}
        >
          {metrics.unscheduledSessionCount === 0 ? <IconCheck /> : <IconAlert />}
        </div>
        <div className="metric-card__value">
          {metrics.unscheduledSessionCount}
        </div>
        <div className="metric-card__label">Unscheduled</div>
      </div>
    </div>
  );
}
