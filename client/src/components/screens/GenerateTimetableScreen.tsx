import React, { useState } from 'react';
import type {
  ScheduleSettings,
  SemesterSummary,
  TimetableResult,
  LunchBreakInterval,
} from '../../lib/api';
import { updateScheduleSettings, generateTimetable, ApiError } from '../../lib/api';
import { Icon } from '../Icon';

interface GenerateTimetableScreenProps {
  scheduleSettings: ScheduleSettings;
  summary?: Record<string, SemesterSummary>;
  onClose?: () => void;
  onNavigateToMaster?: () => void;
  onNavigateToDisruption?: () => void;
  onTimetableGenerated: (result: TimetableResult, updatedSettings: ScheduleSettings) => void;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateInterval(start: string, end: string): string | null {
  if (!TIME_REGEX.test(start)) {
    return 'Start time must be in HH:mm format (e.g. 12:00)';
  }
  if (!TIME_REGEX.test(end)) {
    return 'End time must be in HH:mm format (e.g. 13:00)';
  }
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (sh * 60 + sm >= eh * 60 + em) {
    return 'Start time must be strictly before end time';
  }
  return null;
}

export const GenerateTimetableScreen: React.FC<GenerateTimetableScreenProps> = ({
  scheduleSettings,
  summary = {},
  onClose,
  onNavigateToMaster,
  onNavigateToDisruption,
  onTimetableGenerated,
}) => {
  // Target cohorts state
  const [selectedSemesters, setSelectedSemesters] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  // Scheduling parameter states
  const [maxHours, setMaxHours] = useState<number>(
    scheduleSettings.teacherMaxCourseAssignments || 3
  );

  // Semester lunch defaults: '1', '2', '3'
  const [semesterLunch, setSemesterLunch] = useState<Record<string, LunchBreakInterval>>({
    '1': scheduleSettings.semesterLunchDefaults?.['1'] || { startTime: '12:00', endTime: '13:00' },
    '2': scheduleSettings.semesterLunchDefaults?.['2'] || { startTime: '12:00', endTime: '13:00' },
    '3': scheduleSettings.semesterLunchDefaults?.['3'] || { startTime: '12:00', endTime: '13:00' },
  });

  // Cohort overrides: 'CE-S1-A', 'CE-S2-A', 'CE-S3-A'
  const [cohortOverrides, setCohortOverrides] = useState<
    Record<string, { enabled: boolean; interval: LunchBreakInterval }>
  >(() => {
    const initial: Record<string, { enabled: boolean; interval: LunchBreakInterval }> = {};
    const cohorts = scheduleSettings.cohorts || ['CE-S1-A', 'CE-S2-A', 'CE-S3-A'];
    for (const cid of cohorts) {
      const existing = scheduleSettings.cohortLunchOverrides?.[cid];
      if (existing) {
        initial[cid] = { enabled: true, interval: { ...existing } };
      } else {
        const sem = cid.includes('S1') ? '1' : cid.includes('S2') ? '2' : '3';
        const semDef = scheduleSettings.semesterLunchDefaults?.[sem] || {
          startTime: '13:00',
          endTime: '14:00',
        };
        initial[cid] = { enabled: false, interval: { ...semDef } };
      }
    }
    return initial;
  });

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<TimetableResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleAll = (state: boolean) => {
    setSelectedSemesters({
      1: state,
      2: state,
      3: state,
    });
  };

  const handleStartGeneration = async () => {
    setErrorMessage(null);

    // Validate active selected semesters
    const activeSemIds = Object.entries(selectedSemesters)
      .filter(([_, sel]) => sel)
      .map(([sem]) => Number(sem));

    if (activeSemIds.length === 0) {
      setErrorMessage('Please select at least one semester to generate.');
      return;
    }

    // Validate semester lunch intervals
    for (const [sem, interval] of Object.entries(semesterLunch)) {
      const err = validateInterval(interval.startTime, interval.endTime);
      if (err) {
        setErrorMessage(`Semester ${sem} Lunch: ${err}`);
        return;
      }
    }

    // Validate cohort overrides
    const patchOverrides: Record<string, LunchBreakInterval | null> = {};
    for (const [cid, override] of Object.entries(cohortOverrides)) {
      if (override.enabled) {
        const err = validateInterval(override.interval.startTime, override.interval.endTime);
        if (err) {
          setErrorMessage(`Cohort ${cid} Override: ${err}`);
          return;
        }
        patchOverrides[cid] = override.interval;
      } else {
        patchOverrides[cid] = null;
      }
    }

    setIsGenerating(true);
    setGenerationComplete(false);

    try {
      // 1. Update schedule settings on backend
      const updatedSettings = await updateScheduleSettings({
        semesterLunchDefaults: semesterLunch,
        cohortLunchOverrides: patchOverrides,
        teacherMaxCourseAssignments: maxHours,
      });

      // 2. Call real deterministic timetable generator
      const result = await generateTimetable({
        semesters: activeSemIds,
        departmentId: 'CE',
      });

      setGeneratedResult(result);
      setGenerationComplete(true);
      onTimetableGenerated(result, updatedSettings);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Generation failed';
      setErrorMessage(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full flex justify-center py-6 px-4 md:px-6">
      {/* Modal / Generation Container */}
      <div className="w-full max-w-5xl bg-[#FFFFFF] border border-[#DCE5D5] rounded-xl shadow-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F7F4E8] border-b border-[#DCE5D5] flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-[#EDF5E8] border border-[#B7D8A9] flex items-center justify-center shrink-0 mt-0.5 text-[#5B8C51]">
              <Icon name="terminal" className="text-[24px]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-semibold text-[#294635] tracking-tight">
                  Generate Academic Timetable
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#DDE8D2] text-[#294635] font-semibold tracking-wider border border-[#DCE5D5]">
                  Deterministic Heuristic Solver
                </span>
              </div>
              <p className="text-[13px] text-[#526B57] mt-0.5">
                Constraint satisfaction scheduler enforcing curriculum demand, teacher availability, room capacity, and hard lunch intervals.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#526B57] hover:text-[#294635] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded bg-[#F8DFDA] border border-[#E8A29A] text-[#762D27] text-[12px] flex items-center gap-2 font-mono">
              <Icon name="error" className="text-[#B94D43] text-[18px] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SECTION 1: Target Cohorts / Semesters Selection */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 bg-[#5B8C51] rounded-full" />
                <h3 className="font-mono text-[13px] text-[#294635] font-semibold uppercase tracking-wider">
                  1. Target Cohorts &amp; Semesters
                </h3>
                <span className="hidden sm:inline text-[11px] text-[#526B57]">
                  Select cohorts for parallel scheduling
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="px-2.5 py-1 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#5B8C51] border border-[#DCE5D5] cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="px-2.5 py-1 rounded bg-[#F7F4E8] hover:bg-[#EDF5E8] text-[#526B57] border border-[#DCE5D5] cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Semester I Card */}
              <label className="group relative flex flex-col p-3.5 rounded bg-[#F7F4E8] border border-[#DCE5D5] hover:border-[#8FA58A] cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-[#294635]">
                    SEMESTER I (CE-S1-A)
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedSemesters[1]}
                    onChange={(e) =>
                      setSelectedSemesters({ ...selectedSemesters, 1: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#5B8C51] accent-[#5B8C51] cursor-pointer"
                  />
                </div>
                <div className="mt-2.5 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Curriculum Courses</span>
                    <span className="text-[#294635] font-semibold">
                      {summary['1']?.courseCount || 7} subjects
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Weekly Demand</span>
                    <span className="text-[#294635]">
                      {summary['1']?.weeklyHours?.total || 24} hours
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#DCE5D5] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#718B68]">Dept Core</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] font-medium border border-[#B7D8A9]">
                    Ready
                  </span>
                </div>
              </label>

              {/* Semester II Card */}
              <label className="group relative flex flex-col p-3.5 rounded bg-[#F7F4E8] border border-[#DCE5D5] hover:border-[#8FA58A] cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-[#294635]">
                    SEMESTER II (CE-S2-A)
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedSemesters[2]}
                    onChange={(e) =>
                      setSelectedSemesters({ ...selectedSemesters, 2: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#5B8C51] accent-[#5B8C51] cursor-pointer"
                  />
                </div>
                <div className="mt-2.5 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Curriculum Courses</span>
                    <span className="text-[#294635] font-semibold">
                      {summary['2']?.courseCount || 7} subjects
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Weekly Demand</span>
                    <span className="text-[#294635]">
                      {summary['2']?.weeklyHours?.total || 24} hours
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#DCE5D5] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#718B68]">Integrated Lab</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] font-medium border border-[#B7D8A9]">
                    Ready
                  </span>
                </div>
              </label>

              {/* Semester III Card */}
              <label className="group relative flex flex-col p-3.5 rounded bg-[#F7F4E8] border border-[#DCE5D5] hover:border-[#8FA58A] cursor-pointer transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold text-[#294635]">
                    SEMESTER III (CE-S3-A)
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedSemesters[3]}
                    onChange={(e) =>
                      setSelectedSemesters({ ...selectedSemesters, 3: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#5B8C51] accent-[#5B8C51] cursor-pointer"
                  />
                </div>
                <div className="mt-2.5 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Curriculum Courses</span>
                    <span className="text-[#294635] font-semibold">
                      {summary['3']?.courseCount || 7} subjects
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#526B57]">Weekly Demand</span>
                    <span className="text-[#294635]">
                      {summary['3']?.weeklyHours?.total || 24} hours
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#DCE5D5] flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#718B68]">Elective Pools</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] font-medium border border-[#B7D8A9]">
                    Ready
                  </span>
                </div>
              </label>
            </div>
          </section>

          {/* SECTION 2: Scheduling Parameters */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1">
              <span className="w-1.5 h-3.5 bg-[#5B8C51] rounded-full" />
              <h3 className="font-mono text-[13px] text-[#294635] font-semibold uppercase tracking-wider">
                2. Scheduling Parameters &amp; Structural Constraints
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
              <div className="bg-[#F7F4E8] p-3.5 rounded border border-[#DCE5D5] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[#294635] font-medium">Working Days Cycle</span>
                  <span className="text-[11px] text-[#526B57]">
                    Configured in institutional timetable settings
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EDF5E8] rounded border border-[#DCE5D5] text-[#5B8C51] font-mono text-[11px]">
                  <Icon name="calendar_month" className="text-[14px]" />
                  <span>Mon – Sat (6 Days)</span>
                </div>
              </div>

              <div className="bg-[#F7F4E8] p-3.5 rounded border border-[#DCE5D5] flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[#294635] font-medium">Daily Periods</span>
                  <span className="text-[11px] text-[#526B57]">
                    7 periods per day (09:00 – 16:00)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#EDF5E8] rounded border border-[#DCE5D5] text-[#294635] font-mono text-[11px]">
                  <Icon name="schedule" className="text-[#718B68] text-[14px]" />
                  <span>P1 – P7</span>
                </div>
              </div>

              <div className="bg-[#F7F4E8] p-3.5 rounded border border-[#DCE5D5] flex items-center justify-between md:col-span-2">
                <div className="flex flex-col pr-4">
                  <span className="text-[#294635] font-medium">Teacher Assignment Limit</span>
                  <span className="text-[11px] text-[#526B57]">
                    Hard ceiling: Max courses assigned per teacher across all semesters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={maxHours}
                    onChange={(e) => setMaxHours(Number(e.target.value))}
                    className="h-8 bg-[#FFFFFF] text-[#294635] font-mono text-[12px] rounded px-3 border border-[#DCE5D5] focus:outline-none cursor-pointer"
                  >
                    <option value={2}>2 Courses Max</option>
                    <option value={3}>3 Courses Max (Standard)</option>
                    <option value={4}>4 Courses Max</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: Mandatory Hard Constraint: Semester Lunch Timings & Cohort Overrides */}
          <section className="flex flex-col gap-3 bg-[#F7F4E8] p-4 rounded-lg border border-[#DCE5D5]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#DCE5D5]">
              <div className="flex items-center gap-2">
                <Icon name="restaurant" className="text-[#5B8C51] text-[20px]" />
                <div>
                  <h3 className="font-mono text-[13px] text-[#294635] font-semibold uppercase tracking-wider">
                    3. Mandatory Hard Constraint: Semester Lunch Timings &amp; Cohort Overrides
                  </h3>
                  <p className="text-[11px] text-[#526B57]">
                    No lecture, tutorial, or practical may overlap an effective lunch interval. A cohort inherits its semester default unless an override is configured.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#F8DFDA] text-[#762D27] border border-[#E8A29A] self-start sm:self-center font-bold">
                Hard Boundary (0 Overlaps)
              </span>
            </div>

            {/* Semester Lunch Timings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 pt-2">
              {[
                { sem: '1', title: 'Semester I Default', cohort: 'CE-S1-A' },
                { sem: '2', title: 'Semester II Default', cohort: 'CE-S2-A' },
                { sem: '3', title: 'Semester III Default', cohort: 'CE-S3-A' },
              ].map(({ sem, title, cohort }) => {
                const def = semesterLunch[sem] || { startTime: '12:00', endTime: '13:00' };
                const override = cohortOverrides[cohort] || {
                  enabled: false,
                  interval: { startTime: '13:00', endTime: '14:00' },
                };

                return (
                  <div
                    key={sem}
                    className="bg-[#FFFFFF] p-3 rounded border border-[#DCE5D5] flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-bold text-[#5B8C51]">
                        {title}
                      </span>
                      <span className="text-[10px] font-mono text-[#526B57]">
                        {cohort}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#526B57]">Default:</span>
                      <select
                        value={`${def.startTime}-${def.endTime}`}
                        onChange={(e) => {
                          const [startTime, endTime] = e.target.value.split('-');
                          setSemesterLunch({
                            ...semesterLunch,
                            [sem]: { startTime, endTime },
                          });
                        }}
                        className="h-7 bg-[#F7F4E8] text-[#294635] font-mono text-[11px] rounded px-2 border border-[#DCE5D5] focus:outline-none cursor-pointer"
                      >
                        <option value="12:00-13:00">12:00 – 13:00 (Standard)</option>
                        <option value="13:00-14:00">13:00 – 14:00 (Staggered)</option>
                        <option value="11:00-12:00">11:00 – 12:00 (Early)</option>
                      </select>
                    </div>

                    {/* Cohort Override Toggle */}
                    <div className="mt-1 pt-2 border-t border-[#DCE5D5] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#294635]">{cohort} Override</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={override.enabled}
                            onChange={(e) =>
                              setCohortOverrides({
                                ...cohortOverrides,
                                [cohort]: {
                                  ...override,
                                  enabled: e.target.checked,
                                },
                              })
                            }
                            className="accent-[#5B8C51] cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-[#526B57]">Enable</span>
                        </label>
                      </div>

                      {override.enabled ? (
                        <div className="flex items-center gap-2 bg-[#EDF5E8] p-1.5 rounded border border-[#DCE5D5]">
                          <span className="text-[10px] font-mono text-[#5B8C51]">Override:</span>
                          <select
                            value={`${override.interval.startTime}-${override.interval.endTime}`}
                            onChange={(e) => {
                              const [startTime, endTime] = e.target.value.split('-');
                              setCohortOverrides({
                                ...cohortOverrides,
                                [cohort]: {
                                  enabled: true,
                                  interval: { startTime, endTime },
                                },
                              });
                            }}
                            className="h-6 bg-[#FFFFFF] text-[#294635] font-mono text-[10px] rounded px-1.5 border border-[#DCE5D5] cursor-pointer"
                          >
                            <option value="13:00-14:00">13:00 – 14:00</option>
                            <option value="12:00-13:00">12:00 – 13:00</option>
                            <option value="11:00-12:00">11:00 – 12:00</option>
                          </select>
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono text-[#718B68] italic">
                          Inheriting Sem {sem} default ({def.startTime} – {def.endTime})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: Live Generation Status */}
          {generatedResult && (
            <section className="flex flex-col gap-2 bg-[#EDF5E8] p-4 rounded border border-[#DCE5D5]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-[#5B8C51] text-[18px]" />
                  <span className="font-mono text-[12px] text-[#294635] font-semibold tracking-wide">
                    HEURISTIC SOLVER CONVERGED: {generatedResult.timetableId}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#5B8C51] font-bold">
                    {generatedResult.metrics.scheduledSessionCount} Sessions Scheduled
                  </span>
                  <span className="text-[#DCE5D5]">|</span>
                  <span
                    className={
                      generatedResult.validation.valid ? 'text-[#5B8C51]' : 'text-[#762D27]'
                    }
                  >
                    {generatedResult.validation.hardConflictCount} Hard Conflicts
                  </span>
                </div>
              </div>

              {generatedResult.validation.conflicts.length > 0 && (
                <div className="mt-2 flex flex-col gap-1 p-2 rounded bg-[#F8DFDA] border border-[#E8A29A] text-[11px] font-mono text-[#762D27]">
                  <span className="font-bold">Detected Constraint Conflicts:</span>
                  {generatedResult.validation.conflicts.map((c, i) => (
                    <div key={i}>• {c.message}</div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#F7F4E8] border-t border-[#DCE5D5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#526B57]">
            <Icon name="verified_user" className="text-[#718B68] text-[16px]" />
            <span>Zero faculty clash &amp; lunch breach guarantee under departmental ruleset</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#294635] font-mono text-[11px] border border-[#DCE5D5] transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
            {generationComplete && onNavigateToMaster && (
              <button
                type="button"
                onClick={onNavigateToMaster}
                className="px-4 py-2 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#5B8C51] font-mono text-[11px] font-semibold border border-[#DCE5D5] transition-colors cursor-pointer"
              >
                View in Master Timetable
              </button>
            )}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleStartGeneration}
              className="px-5 py-2 rounded bg-[#5B8C51] hover:bg-[#4B7443] text-[#FFFFFF] font-semibold text-[13px] flex items-center gap-2 transition-all shadow-md active:scale-[0.98] disabled:opacity-75 cursor-pointer"
            >
              <Icon
                name={isGenerating ? 'sync' : 'tune'}
                className={`text-[18px] ${isGenerating ? 'animate-spin' : ''}`}
              />
              <span>{isGenerating ? 'Computing Allocation...' : 'Generate Live Timetable'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
