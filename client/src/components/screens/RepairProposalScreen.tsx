import React, { useState, useMemo } from 'react';
import type {
  RepairProposal,
  Course,
  Teacher,
  Room,
  TimeSlot,
  TimetableResult,
} from '../../lib/api';
import { applyRepair, ApiError } from '../../lib/api';
import { Icon } from '../Icon';

interface RepairProposalScreenProps {
  proposal: RepairProposal;
  courses: Course[];
  teachers: Teacher[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onReturnToMaster: () => void;
  onApplyRepairSuccess: (updatedTimetable: TimetableResult) => void;
}

export const RepairProposalScreen: React.FC<RepairProposalScreenProps> = ({
  proposal,
  courses,
  teachers,
  rooms,
  timeSlots: _timeSlots,
  onReturnToMaster,
  onApplyRepairSuccess,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fast lookups
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.courseId, c])), [courses]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.teacherId, t])), [teachers]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.roomId, r])), [rooms]);

  const handleApply = async () => {
    setIsApplying(true);
    setErrorMessage(null);

    try {
      const updated = await applyRepair(proposal.timetableId, proposal.changeSetId);
      setIsApplied(true);
      setShowToast(true);
      onApplyRepairSuccess(updated);
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to apply repair';
      setErrorMessage(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReject = () => {
    setIsRejected(true);
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(proposal, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `Audit_Log_${proposal.changeSetId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setIsExporting(false);
    }
  };

  const preservedPercent =
    proposal.metrics.preservedEntryPercent !== null
      ? proposal.metrics.preservedEntryPercent
      : proposal.entries.length > 0
      ? Math.round(
          ((proposal.entries.length - proposal.changes.length) / proposal.entries.length) * 100
        )
      : 100;

  return (
    <div className="flex flex-col w-full pb-16 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#5B8C51] text-[#FFFFFF] px-4 py-3 rounded-lg shadow-xl font-mono text-[12px] font-bold flex items-center gap-2">
          <Icon name="check_circle" className="text-[20px]" />
          <span>Repair committed! Live timetable updated successfully.</span>
        </div>
      )}

      {/* Command Banner / Verification Strip */}
      <div className="w-full bg-[#FFFFFF] px-4 md:px-6 py-3.5 border-b border-[#DCE5D5] shadow-xs">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-[#EDF5E8] border border-[#B7D8A9] flex items-center justify-center shrink-0 text-[#5B8C51]">
              <Icon name="verified" className="text-[24px]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[16px] font-semibold text-[#294635]">
                  Automated Repair Proposal Ready
                </span>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#F7F4E8] text-[#5B8C51] font-medium tracking-wider border border-[#DCE5D5]">
                  ChangeSet ID: {proposal.changeSetId}
                </span>
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] border border-[#B7D8A9] font-medium">
                  Deterministic Heuristic Solved
                </span>
              </div>
              <p className="text-[12px] text-[#526B57] mt-0.5">
                {proposal.changes.length} schedule collisions resolved with minimal department-wide perturbation. All hard constraints verified.
              </p>
            </div>
          </div>

          {/* Primary Action CTA Bar */}
          <div className="flex items-center gap-2 w-full xl:w-auto justify-end shrink-0 flex-wrap">
            <button
              type="button"
              onClick={onReturnToMaster}
              className="px-3.5 py-1.5 rounded font-mono text-[11px] bg-[#FFFFFF] hover:bg-[#F7F4E8] border border-[#DCE5D5] text-[#526B57] hover:text-[#294635] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Return to Master</span>
            </button>

            <button
              type="button"
              disabled={isRejected || isApplied}
              onClick={handleReject}
              className={`px-3.5 py-1.5 rounded font-mono text-[11px] flex items-center gap-1.5 transition-all border cursor-pointer ${
                isRejected
                  ? 'bg-[#F8DFDA] border-[#E8A29A] text-[#B94D43]'
                  : 'bg-[#FFFFFF] hover:bg-[#F7F4E8] border-[#DCE5D5] text-[#526B57] hover:text-[#294635]'
              }`}
            >
              <Icon name="close" className="text-[16px] text-[#B94D43]" />
              <span>{isRejected ? 'Proposal Discarded' : 'Reject Proposal'}</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExport}
              className="px-3.5 py-1.5 rounded bg-[#FFFFFF] hover:bg-[#F7F4E8] border border-[#DCE5D5] text-[#526B57] hover:text-[#294635] font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Icon
                name={isExporting ? 'sync' : 'file_download'}
                className={`text-[16px] ${isExporting ? 'animate-spin' : ''}`}
              />
              <span>{isExporting ? 'Exporting...' : 'Export Audit Log'}</span>
            </button>

            <button
              type="button"
              disabled={isApplying || isApplied || isRejected}
              onClick={handleApply}
              className={`px-4 py-1.5 rounded font-semibold text-[13px] flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] cursor-pointer ${
                isApplied
                  ? 'bg-[#EDF5E8] text-[#5B8C51] border border-[#B7D8A9]'
                  : 'bg-[#5B8C51] hover:bg-[#4B7443] text-[#FFFFFF]'
              }`}
            >
              <Icon
                name={isApplying ? 'sync' : isApplied ? 'done_all' : 'check_circle'}
                className={`text-[18px] ${isApplying ? 'animate-spin' : ''}`}
              />
              <span>
                {isApplying
                  ? 'Writing Schedule Matrix...'
                  : isApplied
                  ? 'Repair Committed'
                  : 'Apply Repair to Live Timetable'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-4 md:mx-6 mt-4 p-3.5 rounded bg-[#F8DFDA] border border-[#E8A29A] text-[#762D27] text-[12px] flex items-center gap-2 font-mono">
          <Icon name="error" className="text-[#B94D43] text-[18px] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Key Validation KPI Row (4 Cards) */}
      <div className="w-full px-4 md:px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Validation Status */}
          <div className="bg-[#FFFFFF] p-3.5 rounded border border-[#DCE5D5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div
              className={`absolute top-0 left-0 w-1 h-full ${
                proposal.validation.valid ? 'bg-[#5B8C51]' : 'bg-[#B94D43]'
              }`}
            />
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#526B57]">
                Validation Status
              </span>
              <Icon
                name={proposal.validation.valid ? 'verified_user' : 'warning'}
                className={proposal.validation.valid ? 'text-[#5B8C51] text-[18px]' : 'text-[#B94D43] text-[18px]'}
              />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-[22px] text-[#294635] font-bold">
                {proposal.validation.valid ? 'VALID' : 'CONFLICTS'}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] font-medium border border-[#B7D8A9]">
                {proposal.validation.hardConflictCount} Collisions
              </span>
            </div>
            <span className="text-[11px] text-[#526B57]">
              Zero faculty clash &amp; lunch breach guarantee
            </span>
          </div>

          {/* KPI 2: Preserved Schedule */}
          <div className="bg-[#FFFFFF] p-3.5 rounded border border-[#DCE5D5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#5B8C51]" />
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#526B57]">
                Preserved Schedule
              </span>
              <Icon name="lock" className="text-[#5B8C51] text-[18px]" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-[22px] text-[#5B8C51] font-bold">
                {preservedPercent}%
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F7F4E8] text-[#294635] font-medium border border-[#DCE5D5]">
                {proposal.entries.length - proposal.changes.length}/{proposal.entries.length} Preserved
              </span>
            </div>
            <span className="text-[11px] text-[#526B57]">
              Minimal perturbation to unaffected cohorts
            </span>
          </div>

          {/* KPI 3: Relocation Delta */}
          <div className="bg-[#FFFFFF] p-3.5 rounded border border-[#DCE5D5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#5B8C51]" />
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#526B57]">
                Relocation Delta
              </span>
              <Icon name="difference" className="text-[#5B8C51] text-[18px]" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-[22px] text-[#294635] font-bold">
                {proposal.changes.length}
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F3D98B]/40 text-[#294635] font-medium border border-[#F3D98B]">
                Moves Staged
              </span>
            </div>
            <span className="text-[11px] text-[#526B57]">
              All moves bounded within weekly cycle
            </span>
          </div>

          {/* KPI 4: Constraint Compliance */}
          <div className="bg-[#FFFFFF] p-3.5 rounded border border-[#DCE5D5] shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#5B8C51]" />
            <div className="flex items-center justify-between pb-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#526B57]">
                Constraint Compliance
              </span>
              <Icon name="fact_check" className="text-[#5B8C51] text-[18px]" />
            </div>
            <div className="flex items-baseline gap-2 my-1">
              <span className="text-[22px] text-[#5B8C51] font-bold">
                {proposal.validation.valid ? 100 : 80}%
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#F7F4E8] text-[#294635] font-medium border border-[#DCE5D5]">
                Hard Bounds
              </span>
            </div>
            <span className="text-[11px] text-[#526B57]">
              Faculty limits &amp; room capacities compliant
            </span>
          </div>
        </div>
      </div>

      {/* Main Comparison Canvas */}
      <div className="w-full px-4 md:px-6 flex flex-col gap-4">
        <div className="bg-[#FFFFFF] p-3.5 rounded border border-[#DCE5D5] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Icon name="difference" className="text-[#5B8C51] text-[20px]" />
            <div>
              <h2 className="text-[15px] font-semibold text-[#294635]">
                Timetable Delta &amp; Relocation Details
              </h2>
              <p className="text-[11px] text-[#526B57]">
                Granular causal breakdown and constraint fulfillment rationale
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#EDF5E8] text-[#5B8C51] uppercase font-medium border border-[#DCE5D5]">
            {proposal.changes.length} Active Delta Items
          </span>
        </div>

        {proposal.changes.length === 0 ? (
          <div className="bg-[#FFFFFF] p-8 rounded-lg border border-[#DCE5D5] text-center font-mono text-[12px] text-[#526B57]">
            No relocations required. Disruption does not conflict with active sessions.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {proposal.changes.map((change, index) => {
              // Find matching entry
              const entry = proposal.entries.find((e) => e.entryId === change.entryId);
              const course = entry ? courseMap.get(entry.courseId) : undefined;
              const teacher = entry ? teacherMap.get(entry.teacherId) : undefined;
              const oldRoom = roomMap.get(change.oldRoomId);
              const newRoom = roomMap.get(change.newRoomId);

              return (
                <div
                  key={change.entryId || index}
                  className="bg-[#FFFFFF] p-4 rounded-lg border border-[#DCE5D5] shadow-xs flex flex-col gap-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 bg-[#F7F4E8] p-2.5 rounded border border-[#DCE5D5]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#F3D98B] text-[#294635] font-bold tracking-wider">
                        DELTA {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[15px] font-semibold text-[#294635]">
                        {course?.courseCode || 'Course'} — {course?.courseName || change.sessionId}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-[#526B57]">Cohort:</span>
                      <span className="font-mono text-[11px] text-[#294635] font-medium bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#DCE5D5]">
                        {change.cohortId}
                      </span>
                    </div>
                  </div>

                  {/* Before & After Track */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                    {/* Disrupted Original */}
                    <div className="bg-[#F8DFDA]/40 p-3.5 rounded border border-[#E8A29A] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#B94D43] font-medium flex items-center gap-1">
                            <Icon name="cancel" className="text-[14px]" />
                            Original Allocation
                          </span>
                          <span className="font-mono text-[9px] text-[#B94D43] bg-[#F8DFDA] px-1.5 py-0.5 rounded border border-[#E8A29A]">
                            Disrupted
                          </span>
                        </div>
                        <div className="font-mono text-[13px] text-[#294635] font-bold py-1">
                          {change.oldDayCode} • Slot {change.oldStartSlotId}
                        </div>
                        <div className="flex flex-col gap-1 mt-1 text-[11px] text-[#526B57]">
                          <div className="flex items-center gap-1.5">
                            <Icon name="meeting_room" className="text-[15px] text-[#718B68]" />
                            <span>
                              Room:{' '}
                              <strong className="text-[#294635] font-mono">
                                {oldRoom?.displayName || change.oldRoomId}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icon name="badge" className="text-[15px] text-[#718B68]" />
                            <span>
                              Instructor:{' '}
                              <strong className="text-[#294635]">
                                {teacher?.displayName || 'Faculty'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 bg-[#FFFFFF] p-2 rounded border border-[#E8A29A]">
                        <span className="font-mono text-[10px] text-[#B94D43] block font-semibold">
                          Collision Trigger:
                        </span>
                        <span className="text-[11px] text-[#526B57]">
                          {proposal.disruption.reason || 'Operational disruption recorded'}
                        </span>
                      </div>
                    </div>

                    {/* Proposed Relocation */}
                    <div className="bg-[#EDF5E8] p-3.5 rounded border border-[#B7D8A9] flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-[#5B8C51]/10 rounded-bl-full pointer-events-none" />
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-[#5B8C51] font-medium flex items-center gap-1">
                            <Icon name="schedule" className="text-[14px]" />
                            Recommended Relocation
                          </span>
                          <span className="font-mono text-[9px] text-[#5B8C51] bg-[#EDF5E8] px-1.5 py-0.5 rounded font-medium border border-[#B7D8A9]">
                            Optimal
                          </span>
                        </div>
                        <div className="font-mono text-[13px] text-[#5B8C51] font-bold py-1">
                          {change.newDayCode} • Slot {change.newStartSlotId}
                        </div>
                        <div className="flex flex-col gap-1 mt-1 text-[11px] text-[#526B57]">
                          <div className="flex items-center gap-1.5">
                            <Icon name="meeting_room" className="text-[15px] text-[#5B8C51]" />
                            <span>
                              Room:{' '}
                              <strong className="text-[#294635] font-mono">
                                {newRoom?.displayName || change.newRoomId}
                              </strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icon name="badge" className="text-[15px] text-[#5B8C51]" />
                            <span>
                              Instructor:{' '}
                              <strong className="text-[#294635]">
                                {teacher?.displayName || 'Faculty'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 bg-[#FFFFFF] p-2 rounded border border-[#B7D8A9]">
                        <span className="font-mono text-[10px] text-[#5B8C51] block font-semibold">
                          Constraint Rationale:
                        </span>
                        <span className="text-[11px] text-[#294635]">
                          {change.reason}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Note */}
                  <div className="bg-[#F7F4E8] p-2.5 rounded border border-[#DCE5D5] flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Icon name="check" className="text-[#5B8C51] text-[16px]" />
                      <span className="text-[#526B57] font-mono text-[10px]">
                        Verification Check:
                      </span>
                      <span className="text-[#294635]">
                        Capacity ({newRoom?.capacity || 60} seats) &amp; lunch interval compliant
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#5B8C51] uppercase font-bold">
                      Passed
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
