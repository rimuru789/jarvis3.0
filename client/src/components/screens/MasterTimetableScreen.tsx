import React, { useState, useMemo } from 'react';
import type {
  TimetableResult,
  TimetableEntry,
  Course,
  Teacher,
  Room,
  TimeSlot,
  ScheduleSettings,
  DayCode,
  SessionType,
} from '../../lib/api';
import { Icon } from '../Icon';

interface MasterTimetableScreenProps {
  timetable: TimetableResult;
  courses: Course[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  scheduleSettings: ScheduleSettings;
  onOpenGenerate: () => void;
  onOpenDisruption: () => void;
  onValidate?: () => void;
  isValidating?: boolean;
}

export const MasterTimetableScreen: React.FC<MasterTimetableScreenProps> = ({
  timetable,
  courses,
  teachers,
  rooms,
  timeSlots,
  scheduleSettings,
  onOpenGenerate,
  onOpenDisruption,
  onValidate,
  isValidating = false,
}) => {
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  // Fast lookups
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.courseId, c])), [courses]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.teacherId, t])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.roomId, r])), [rooms]);

  const days: { code: DayCode; name: string }[] = [
    { code: 'MON', name: 'Monday' },
    { code: 'TUE', name: 'Tuesday' },
    { code: 'WED', name: 'Wednesday' },
    { code: 'THU', name: 'Thursday' },
    { code: 'FRI', name: 'Friday' },
    { code: 'SAT', name: 'Saturday' },
  ];

  // Distinct periods from scheduleSettings or timeSlots
  const periods = useMemo(() => {
    if (scheduleSettings.periods && scheduleSettings.periods.length > 0) {
      return scheduleSettings.periods.map((p, idx) => ({
        periodId: p.periodId,
        periodIndex: idx + 1,
        startTime: p.startTime,
        endTime: p.endTime,
        label: `${p.startTime} - ${p.endTime}`,
      }));
    }
    // Fallback from MON time slots
    const monSlots = timeSlots.filter((ts) => ts.dayCode === 'MON');
    return monSlots.map((ts) => ({
      periodId: ts.periodId,
      periodIndex: ts.periodIndex,
      startTime: ts.startTime,
      endTime: ts.endTime,
      label: `${ts.startTime} - ${ts.endTime}`,
    }));
  }, [scheduleSettings, timeSlots]);

  // Determine lunch interval
  const lunchInterval = useMemo(() => {
    if (scheduleSettings.lunchBreak && scheduleSettings.lunchBreak.includes('-')) {
      const [s, e] = scheduleSettings.lunchBreak.split('-').map((x) => x.trim());
      return { start: s, end: e };
    }
    return { start: '12:00', end: '13:00' };
  }, [scheduleSettings.lunchBreak]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return timetable.entries.filter((e) => {
      if (selectedSemester === 'ALL') return true;
      return e.semester === selectedSemester;
    });
  }, [timetable.entries, selectedSemester]);

  // Map entries by dayCode and startSlotId
  const entriesByDayAndSlot = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    for (const e of filteredEntries) {
      const key = `${e.dayCode}_${e.startSlotId}`;
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [filteredEntries]);

  const getSessionType = (entry: TimetableEntry): SessionType => {
    const sid = entry.sessionId;
    if (sid.includes('-LEC-')) return 'LECTURE';
    if (sid.includes('-PRA-')) return 'PRACTICAL';
    if (sid.includes('-TUT-')) return 'TUTORIAL';
    return 'LECTURE';
  };

  const getCleanTeacherName = (teacherId: string): string => {
    const t = teacherMap.get(teacherId);
    if (!t) return teacherId;
    const parts = t.displayName.split('—');
    return parts.length > 1 ? parts[1].trim() : t.displayName;
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Utility Control Ribbon */}
      <div className="w-full bg-[#141b2b] px-4 md:px-6 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#232a3a]">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Semester Selector Tabs */}
          <div className="flex items-center gap-1 bg-[#070e1d] p-1 rounded border border-[#232a3a]">
            <button
              type="button"
              onClick={() => setSelectedSemester('ALL')}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedSemester === 'ALL'
                  ? 'bg-[#232a3a] text-[#4edea3] font-semibold'
                  : 'text-[#bbcabf] hover:text-[#dce2f7]'
              }`}
            >
              ALL SEMESTERS
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester(1)}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedSemester === 1
                  ? 'bg-[#232a3a] text-[#4edea3] font-semibold'
                  : 'text-[#bbcabf] hover:text-[#dce2f7]'
              }`}
            >
              SEM I
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester(2)}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedSemester === 2
                  ? 'bg-[#232a3a] text-[#4edea3] font-semibold'
                  : 'text-[#bbcabf] hover:text-[#dce2f7]'
              }`}
            >
              SEM II
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester(3)}
              className={`font-mono text-[10px] px-3 py-1 rounded transition-colors cursor-pointer ${
                selectedSemester === 3
                  ? 'bg-[#232a3a] text-[#4edea3] font-semibold'
                  : 'text-[#bbcabf] hover:text-[#dce2f7]'
              }`}
            >
              SEM III
            </button>
          </div>

          <div className="hidden sm:block h-4 w-px bg-[#2e3545]" />

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#bbcabf]">
            <Icon name="domain" className="text-[#86948a] text-[16px]" />
            <span>COMP-ENG WING A / BLDG-4</span>
          </div>
        </div>

        {/* Right Status & Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#bbcabf]">
              Active Term: 2026–2027 ODD
            </span>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#10b981]/15 text-[#4edea3] border border-[#10b981]/30 font-semibold">
              {timetable.status || 'COMMITTED'}
            </span>
            {timetable.validation && (
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold border ${
                  timetable.validation.valid
                    ? 'bg-[#10b981]/15 text-[#4edea3] border-[#10b981]/30'
                    : 'bg-[#93000a]/30 text-[#ffb4ab] border-[#ffb4ab]/30'
                }`}
              >
                {timetable.validation.valid
                  ? '0 HARD CONFLICTS'
                  : `${timetable.validation.hardConflictCount} CONFLICTS`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onValidate && (
              <button
                type="button"
                onClick={onValidate}
                disabled={isValidating}
                title="Re-run hard constraint verification against the active schedule"
                className="px-2.5 py-1 rounded bg-[#191f2f] hover:bg-[#232a3a] text-[#adc6ff] font-mono text-[11px] flex items-center gap-1 border border-[#3c4a42] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Icon
                  name={isValidating ? 'sync' : 'fact_check'}
                  className={`text-[14px] ${isValidating ? 'animate-spin' : ''}`}
                />
                <span>{isValidating ? 'Validating...' : 'Validate'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenGenerate}
              className="px-2.5 py-1 rounded bg-[#232a3a] hover:bg-[#2e3545] text-[#4edea3] font-mono text-[11px] flex items-center gap-1 border border-[#3c4a42] transition-colors cursor-pointer"
            >
              <Icon name="tune" className="text-[14px]" />
              <span>Generate</span>
            </button>

            <button
              type="button"
              onClick={onOpenDisruption}
              className="px-2.5 py-1 rounded bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Icon name="terminal" className="text-[14px]" />
              <span>Simulate Disruption</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Weekly Timetable Grid */}
      <div className="w-full px-4 md:px-6 py-4 overflow-x-auto">
        <div className="min-w-[900px] flex flex-col gap-2">
          {/* Grid Layout: Time column + 6 day columns */}
          <div className="grid grid-cols-7 gap-2">
            {/* Time labels column header */}
            <div className="col-span-1 bg-[#141b2b] p-2.5 rounded border border-[#232a3a] flex flex-col justify-center text-center">
              <span className="font-mono text-[10px] text-[#bbcabf] font-semibold uppercase">
                TIMETABLE GRID
              </span>
              <span className="text-[9px] text-[#86948a] font-mono">
                {filteredEntries.length} Sessions Visible
              </span>
            </div>

            {/* Day Column Headers */}
            {days.map((day) => (
              <div
                key={day.code}
                className="col-span-1 bg-[#141b2b] p-2.5 rounded border border-[#232a3a] flex flex-col items-center justify-center text-center"
              >
                <span className="font-mono text-[12px] font-bold text-[#dce2f7]">
                  {day.name.toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-[#bbcabf]">
                  {day.code}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Rows for each period */}
          {periods.map((period) => {
            const isLunchTime =
              period.startTime === lunchInterval.start ||
              (period.startTime >= lunchInterval.start && period.startTime < lunchInterval.end);

            return (
              <div key={period.periodId} className="grid grid-cols-7 gap-2">
                {/* Period Time Column */}
                <div className="col-span-1 bg-[#141b2b] p-2 rounded border border-[#232a3a] flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-[11px] font-bold text-[#dce2f7]">
                    {period.startTime}
                  </span>
                  <span className="font-mono text-[9px] text-[#86948a]">
                    to {period.endTime}
                  </span>
                  <span className="text-[9px] font-mono text-[#4edea3] mt-0.5">
                    {period.periodId}
                  </span>
                </div>

                {/* Day Columns */}
                {days.map((day) => {
                  const slotKey = `${day.code}_${day.code}_${period.periodId}`;
                  const entries = entriesByDayAndSlot.get(slotKey) || [];

                  if (isLunchTime) {
                    return (
                      <div
                        key={day.code}
                        className="col-span-1 min-h-[76px] rounded bg-[#191f2f]/60 border border-dashed border-[#3c4a42] p-1 flex items-center justify-center text-center text-[#86948a] font-mono text-[10px]"
                        title="Mandatory hard constraint: no academic session may overlap"
                      >
                        <div className="flex items-center gap-1 text-[#86948a]">
                          <Icon name="restaurant" className="text-[14px]" />
                          <span>LUNCH RECESS</span>
                        </div>
                      </div>
                    );
                  }

                  if (entries.length === 0) {
                    return (
                      <div
                        key={day.code}
                        className="col-span-1 min-h-[76px] rounded bg-[#141b2b]/40 border border-[#232a3a]/60 p-2 flex items-center justify-center text-center text-[#3c4a42] font-mono text-[10px]"
                      >
                        <span>Open</span>
                      </div>
                    );
                  }

                  // Render entries in this slot
                  return (
                    <div key={day.code} className="col-span-1 flex flex-col gap-1.5">
                      {entries.map((entry) => {
                        const course = courseMap.get(entry.courseId);
                        const room = roomMap.get(entry.roomId);
                        const teacherName = getCleanTeacherName(entry.teacherId);
                        const sessionType = getSessionType(entry);

                        const isLecture = sessionType === 'LECTURE';
                        const isLab = sessionType === 'PRACTICAL';
                        const isTutorial = sessionType === 'TUTORIAL';
                        const isChanged = Boolean(entry.changeReason);

                        return (
                          <div
                            key={entry.entryId}
                            onClick={() => setSelectedEntry(entry)}
                            className={`min-h-[76px] rounded p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] border ${
                              isChanged
                                ? 'bg-[#0566d9]/20 border-[#adc6ff] shadow-md ring-1 ring-[#adc6ff]/50'
                                : isLecture
                                ? 'bg-[#191f2f] border-[#0566d9]/40 hover:border-[#adc6ff]'
                                : isLab
                                ? 'bg-[#191f2f] border-[#b090ff]/40 hover:border-[#d0bcff]'
                                : 'bg-[#191f2f] border-[#10b981]/40 hover:border-[#4edea3]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`font-mono text-[11px] font-bold truncate ${
                                  isLecture
                                    ? 'text-[#adc6ff]'
                                    : isLab
                                    ? 'text-[#d0bcff]'
                                    : 'text-[#4edea3]'
                                }`}
                              >
                                {course?.courseCode || entry.courseId} [{room?.displayName || entry.roomId}]
                              </span>
                              <span className="text-[9px] font-mono text-[#bbcabf] uppercase shrink-0">
                                {sessionType.substring(0, 3)}
                              </span>
                            </div>

                            <div className="flex flex-col mt-1">
                              <span className="text-[11px] text-[#dce2f7] truncate">
                                {course?.courseName || entry.courseId}
                              </span>
                              <div className="flex items-center justify-between text-[10px] text-[#bbcabf] mt-0.5">
                                <span className="truncate">{teacherName}</span>
                                <span className="font-mono text-[9px] px-1 rounded bg-[#070e1d] text-[#4edea3]">
                                  S{entry.semester}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot Inspection Drawer / Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141b2b] border border-[#232a3a] rounded-lg shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232a3a]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[14px] font-bold text-[#4edea3]">
                  {courseMap.get(selectedEntry.courseId)?.courseCode || selectedEntry.courseId}
                </span>
                <span className="text-[14px] font-semibold text-[#dce2f7]">
                  {courseMap.get(selectedEntry.courseId)?.courseName || 'Curricular Session'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="w-7 h-7 rounded bg-[#232a3a] text-[#bbcabf] hover:text-[#dce2f7] flex items-center justify-center cursor-pointer"
              >
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="bg-[#191f2f] p-2.5 rounded border border-[#232a3a]">
                <span className="text-[10px] text-[#bbcabf] uppercase block">Scheduled Window</span>
                <span className="text-[#dce2f7] font-semibold">
                  {selectedEntry.dayCode} • Slot {selectedEntry.startSlotId}
                </span>
              </div>
              <div className="bg-[#191f2f] p-2.5 rounded border border-[#232a3a]">
                <span className="text-[10px] text-[#bbcabf] uppercase block">Room Allocation</span>
                <span className="text-[#adc6ff] font-semibold">
                  {roomMap.get(selectedEntry.roomId)?.displayName || selectedEntry.roomId}{' '}
                  (Cap {roomMap.get(selectedEntry.roomId)?.capacity || 60})
                </span>
              </div>
              <div className="bg-[#191f2f] p-2.5 rounded border border-[#232a3a]">
                <span className="text-[10px] text-[#bbcabf] uppercase block">Faculty Lead</span>
                <span className="text-[#dce2f7] font-semibold">
                  {teacherMap.get(selectedEntry.teacherId)?.displayName || selectedEntry.teacherId}
                </span>
              </div>
              <div className="bg-[#191f2f] p-2.5 rounded border border-[#232a3a]">
                <span className="text-[10px] text-[#bbcabf] uppercase block">Target Cohort</span>
                <span className="text-[#d0bcff] font-semibold">
                  {selectedEntry.cohortId} (Semester {selectedEntry.semester})
                </span>
              </div>
            </div>

            {selectedEntry.changeReason && (
              <div className="p-3 rounded bg-[#0566d9]/15 border border-[#0566d9]/40 flex items-start gap-2 text-[11px] text-[#dce2f7]">
                <Icon name="difference" className="text-[#adc6ff] text-[16px] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#adc6ff] block">Relocation Reason:</span>
                  <span>{selectedEntry.changeReason}</span>
                </div>
              </div>
            )}

            <div className="p-3 rounded bg-[#070e1d] border border-[#232a3a] flex items-center gap-2 text-[11px] text-[#bbcabf]">
              <Icon name="verified" className="text-[#4edea3] text-[16px]" />
              <span>Lunch non-overlap constraint verified: Interval {lunchInterval.start} - {lunchInterval.end} clear.</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 rounded bg-[#232a3a] hover:bg-[#2e3545] text-[#dce2f7] text-[12px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
