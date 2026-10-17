import React from 'react';
import { Icon } from './Icon';

export type ScreenId =
  | 'master-timetable'
  | 'generate-timetable'
  | 'disruption-simulator'
  | 'repair-proposal';

interface HeaderProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  backendConnected: boolean;
  onOpenBackendStatusModal: () => void;
  activeSemestersText?: string;
  facultyCount?: number;
  totalSessionsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigate,
  backendConnected,
  onOpenBackendStatusModal,
  activeSemestersText = 'Semesters I, II, III Active',
  facultyCount = 15,
  totalSessionsCount = 72,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#141b2b]/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.35)] border-b border-[#232a3a]">
      <div className="h-16 w-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer"
          onClick={() => onNavigate('master-timetable')}
        >
          <div className="h-9 w-9 rounded-md bg-[#191f2f] border border-[#3c4a42] flex items-center justify-center text-[#4edea3] shadow-inner">
            <Icon name="calendar_month" className="text-[20px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold tracking-tight text-[#dce2f7]">
                SlotShield
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#2e3545] text-[#4edea3] font-mono font-medium tracking-wider">
                Dept of Computer Engineering
              </span>
            </div>
            <span className="text-[12px] text-[#bbcabf]/80">
              Academic Timetable System
            </span>
          </div>
        </div>

        {/* Center: Primary Navigation */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#070e1d] p-1 rounded-md border border-[#232a3a]">
          <button
            type="button"
            onClick={() => onNavigate('master-timetable')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'master-timetable'
                ? 'bg-[#232a3a] text-[#4edea3] font-semibold shadow-inner'
                : 'text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#191f2f]'
            }`}
          >
            Master Timetable
          </button>
          <button
            type="button"
            onClick={() => onNavigate('generate-timetable')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'generate-timetable'
                ? 'bg-[#232a3a] text-[#4edea3] font-semibold shadow-inner'
                : 'text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#191f2f]'
            }`}
          >
            Generate Timetable
          </button>
          <button
            type="button"
            onClick={() => onNavigate('disruption-simulator')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'disruption-simulator'
                ? 'bg-[#232a3a] text-[#4edea3] font-semibold shadow-inner'
                : 'text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#191f2f]'
            }`}
          >
            Disruption Simulator
          </button>
          <button
            type="button"
            onClick={() => onNavigate('repair-proposal')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'repair-proposal'
                ? 'bg-[#232a3a] text-[#4edea3] font-semibold shadow-inner'
                : 'text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#191f2f]'
            }`}
          >
            Repair Proposal
          </button>
        </nav>

        {/* Mobile / Compact Nav Selector */}
        <div className="xl:hidden flex items-center">
          <select
            value={activeScreen}
            onChange={(e) => onNavigate(e.target.value as ScreenId)}
            className="bg-[#070e1d] text-[#4edea3] text-xs font-mono border border-[#232a3a] rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="master-timetable">Master Timetable</option>
            <option value="generate-timetable">Generate Timetable</option>
            <option value="disruption-simulator">Disruption Simulator</option>
            <option value="repair-proposal">Repair Proposal</option>
          </select>
        </div>

        {/* Right: Operational Telemetry & Connection Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#070e1d] border border-[#232a3a] text-[#bbcabf] text-[10px] font-mono uppercase tracking-wide">
            <span>{activeSemestersText}</span>
            <span className="text-[#3c4a42]">|</span>
            <span>{facultyCount} Faculty</span>
            <span className="text-[#3c4a42]">|</span>
            <span>{totalSessionsCount} Scheduled Sessions</span>
          </div>

          {/* Engine / Backend Connection Pill */}
          <button
            type="button"
            onClick={onOpenBackendStatusModal}
            title="Click to view Backend & Solver Integration status"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              backendConnected
                ? 'bg-[#232a3a] border-[#10b981]/40 text-[#4edea3] hover:bg-[#2e3545]'
                : 'bg-[#191f2f] border-[#3c4a42] text-[#bbcabf] hover:bg-[#232a3a]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected ? 'bg-[#4edea3] animate-pulse' : 'bg-[#adc6ff]'
              }`}
            />
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider">
              {backendConnected ? 'Backend Live' : 'Design Standby'}
            </span>
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-[#003824] shadow-sm">
            <Icon name="person" className="text-[16px]" />
          </div>
        </div>
      </div>
    </header>
  );
};
