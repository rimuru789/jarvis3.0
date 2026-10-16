/**
 * SlotShield — AppHeader
 * Brand, primary view navigation, and a compact status strip.
 */

export type ViewId = 'master' | 'generate' | 'disruption' | 'repair';

const NAV_ITEMS: { id: ViewId; label: string }[] = [
  { id: 'master', label: 'Master Timetable' },
  { id: 'generate', label: 'Generate Timetable' },
  { id: 'disruption', label: 'Disruption Simulator' },
  { id: 'repair', label: 'Repair Proposal' },
];

interface AppHeaderProps {
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  stats: { semesters: number; faculty: number; courses: number } | null;
  status: 'live' | 'connecting' | 'offline';
}

export function AppHeader({ view, onNavigate, stats, status }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__icon" aria-hidden="true">
          S
        </div>
        <div className="app-header__names">
          <div className="app-header__title-row">
            <span className="app-header__title">SlotShield</span>
            <span className="app-header__dept">Computer Eng</span>
          </div>
          <div className="app-header__subtitle">Academic Timetable System</div>
        </div>
      </div>

      <nav className="app-nav" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = item.id === view;
          return (
            <button
              key={item.id}
              type="button"
              className={`app-nav__item ${active ? 'app-nav__item--active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="app-header__status">
        {stats && (
          <ul className="app-header__stats">
            <li>
              <strong>{stats.semesters}</strong> Semesters
            </li>
            <li>
              <strong>{stats.faculty}</strong> Faculty
            </li>
            <li>
              <strong>{stats.courses}</strong> Courses
            </li>
          </ul>
        )}
        <span className={`live-pill live-pill--${status}`} role="status">
          <span className="live-pill__dot" aria-hidden="true" />
          {status === 'live' ? 'Backend live' : status === 'offline' ? 'Backend offline' : 'Connecting'}
        </span>
      </div>
    </header>
  );
}
