/**
 * SlotShield — SemesterFilter
 * Filter buttons for Semester I, II, III with an All option.
 */

interface SemesterFilterProps {
  selected: Set<number>;
  summary: Record<
    string,
    {
      courseCount: number;
      weeklyHours: { total: number };
    }
  >;
  onToggle: (semester: number) => void;
  onSelectAll: () => void;
}

const SEMESTER_LABELS: Record<number, string> = {
  1: 'Semester I',
  2: 'Semester II',
  3: 'Semester III',
};

export function SemesterFilter({
  selected,
  summary,
  onToggle,
  onSelectAll,
}: SemesterFilterProps) {
  const allSelected = selected.size === 3;

  return (
    <div className="filter-bar">
      <span className="filter-bar__label">Filter</span>
      <div className="filter-group">
        <button
          className={`filter-btn ${allSelected ? 'filter-btn--active' : ''}`}
          onClick={onSelectAll}
        >
          All Semesters
        </button>
        {[1, 2, 3].map((sem) => {
          const semData = summary[String(sem)];
          const hours = semData ? semData.weeklyHours.total : 0;
          return (
            <button
              key={sem}
              className={`filter-btn ${
                selected.has(sem) && !allSelected ? 'filter-btn--active' : ''
              }`}
              onClick={() => onToggle(sem)}
            >
              {SEMESTER_LABELS[sem]} ({hours}h)
            </button>
          );
        })}
      </div>
    </div>
  );
}
