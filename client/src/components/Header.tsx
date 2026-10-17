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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md shadow-xs border-b border-[#DCE5D5]">
      <div className="h-16 w-full px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div
          className="flex items-center gap-3 shrink-0 cursor-pointer"
          onClick={() => onNavigate('master-timetable')}
        >
          <div className="h-9 w-9 rounded-md bg-[#EDF5E8] border border-[#DCE5D5] flex items-center justify-center text-[#5B8C51] shadow-xs">
            <Icon name="calendar_month" className="text-[20px]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-semibold tracking-tight text-[#294635]">
                SlotShield
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] font-mono font-medium tracking-wider border border-[#DCE5D5]">
                Dept of Computer Engineering
              </span>
            </div>
            <span className="text-[12px] text-[#526B57]">
              Academic Timetable System
            </span>
          </div>
        </div>

        {/* Center: Primary Navigation */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#F7F4E8] p-1 rounded-md border border-[#DCE5D5]">
          <button
            type="button"
            onClick={() => onNavigate('master-timetable')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'master-timetable'
                ? 'bg-[#FFFFFF] text-[#294635] font-semibold shadow-xs border border-[#DCE5D5]'
                : 'text-[#526B57] hover:text-[#294635] hover:bg-[#EDF5E8]'
            }`}
          >
            Master Timetable
          </button>
          <button
            type="button"
            onClick={() => onNavigate('generate-timetable')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'generate-timetable'
                ? 'bg-[#FFFFFF] text-[#294635] font-semibold shadow-xs border border-[#DCE5D5]'
                : 'text-[#526B57] hover:text-[#294635] hover:bg-[#EDF5E8]'
            }`}
          >
            Generate Timetable
          </button>
          <button
            type="button"
            onClick={() => onNavigate('disruption-simulator')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'disruption-simulator'
                ? 'bg-[#FFFFFF] text-[#294635] font-semibold shadow-xs border border-[#DCE5D5]'
                : 'text-[#526B57] hover:text-[#294635] hover:bg-[#EDF5E8]'
            }`}
          >
            Disruption Simulator
          </button>
          <button
            type="button"
            onClick={() => onNavigate('repair-proposal')}
            className={`font-mono text-[11px] px-3.5 py-1.5 rounded transition-all cursor-pointer ${
              activeScreen === 'repair-proposal'
                ? 'bg-[#FFFFFF] text-[#294635] font-semibold shadow-xs border border-[#DCE5D5]'
                : 'text-[#526B57] hover:text-[#294635] hover:bg-[#EDF5E8]'
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
            className="bg-[#FFFFFF] text-[#294635] text-xs font-mono border border-[#DCE5D5] rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="master-timetable">Master Timetable</option>
            <option value="generate-timetable">Generate Timetable</option>
            <option value="disruption-simulator">Disruption Simulator</option>
            <option value="repair-proposal">Repair Proposal</option>
          </select>
        </div>

        {/* Right: Operational Telemetry & Connection Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#F7F4E8] border border-[#DCE5D5] text-[#526B57] text-[10px] font-mono uppercase tracking-wide">
            <span>{activeSemestersText}</span>
            <span className="text-[#DCE5D5]">|</span>
            <span>{facultyCount} Faculty</span>
            <span className="text-[#DCE5D5]">|</span>
            <span>{totalSessionsCount} Scheduled Sessions</span>
          </div>

          {/* Engine / Backend Connection Pill */}
          <button
            type="button"
            onClick={onOpenBackendStatusModal}
            title="Click to view Backend & Solver Integration status"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              backendConnected
                ? 'bg-[#EDF5E8] border-[#5B8C51]/40 text-[#294635] hover:bg-[#DDE8D2]'
                : 'bg-[#F7F4E8] border-[#DCE5D5] text-[#526B57] hover:bg-[#EDF5E8]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                backendConnected ? 'bg-[#5B8C51] animate-pulse' : 'bg-[#F3D98B]'
              }`}
            />
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider">
              {backendConnected ? 'Backend Live' : 'Design Standby'}
            </span>
          </button>

          {/* User Profile Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#5B8C51] flex items-center justify-center text-[#FFFFFF] shadow-sm">
            <Icon name="person" className="text-[16px]" />
          </div>
        </div>
      </div>
    </header>
  );
};
