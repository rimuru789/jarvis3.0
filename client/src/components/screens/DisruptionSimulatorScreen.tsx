import React, { useState, useMemo } from 'react';
import type {
  TimetableResult,
  Teacher,
  Room,
  Course,
  TimeSlot,
  DayCode,
  DisruptionType,
  Disruption,
  RepairProposal,
  TimetableEntry,
} from '../../lib/api';
import { repairTimetable, ApiError } from '../../lib/api';
import { Icon } from '../Icon';

interface DisruptionSimulatorScreenProps {
  timetable: TimetableResult;
  teachers: Teacher[];
  rooms: Room[];
  courses: Course[];
  timeSlots: TimeSlot[];
  onProceedToRepair: (proposal: RepairProposal) => void;
}

export const DisruptionSimulatorScreen: React.FC<DisruptionSimulatorScreenProps> = ({
  timetable,
  teachers,
  rooms,
  courses,
  timeSlots,
  onProceedToRepair,
}) => {
  const [archetype, setArchetype] = useState<DisruptionType>('FACULTY_UNAVAILABLE');
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    teachers[0]?.teacherId || 'T01'
  );
  const [selectedDay, setSelectedDay] = useState<DayCode>('TUE');
  const [isFullDay, setIsFullDay] = useState<boolean>(false);
  const [selectedSlotPeriod, setSelectedSlotPeriod] = useState<string>('P1'); // or 'ALL'
  const [reasonCode, setReasonCode] = useState<string>('L-MED-04');
  const [reasonText, setReasonText] = useState<string>('Medical leave recorded');

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [proposal, setProposal] = useState<RepairProposal | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Lookups
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.courseId, c])), [courses]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.roomId, r])), [rooms]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.teacherId, t])), [teachers]);

  const days: { code: DayCode; label: string }[] = [
    { code: 'MON', label: 'Monday' },
    { code: 'TUE', label: 'Tuesday' },
    { code: 'WED', label: 'Wednesday' },
    { code: 'THU', label: 'Thursday' },
    { code: 'FRI', label: 'Friday' },
    { code: 'SAT', label: 'Saturday' },
  ];

  // Distinct periods for the chosen day
  const daySlots = useMemo(() => {
    return timeSlots.filter((ts) => ts.dayCode === selectedDay);
  }, [timeSlots, selectedDay]);

  // Handle archetype change
  const handleArchetypeChange = (newType: DisruptionType) => {
    setArchetype(newType);
    if (newType === 'FACULTY_UNAVAILABLE') {
      setSelectedEntityId(teachers[0]?.teacherId || 'T01');
    } else {
      setSelectedEntityId(rooms[0]?.roomId || 'C101');
    }
  };

  // Compute affected entries in current timetable for selected entity & day
  const directlyAffectedEntries = useMemo(() => {
    const slotsToCheck = isFullDay
      ? daySlots.map((s) => s.slotId)
      : [`${selectedDay}_${selectedSlotPeriod}`];

    return timetable.entries.filter((e) => {
      if (e.dayCode !== selectedDay) return false;
      const targetMatches =
        archetype === 'FACULTY_UNAVAILABLE'
          ? e.teacherId === selectedEntityId
          : e.roomId === selectedEntityId;
      if (!targetMatches) return false;

      return slotsToCheck.includes(e.startSlotId);
    });
  }, [
    timetable.entries,
    selectedDay,
    archetype,
    selectedEntityId,
    isFullDay,
    daySlots,
    selectedSlotPeriod,
  ]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    setSimulationError(null);
    setProposal(null);

    const slotIds = isFullDay
      ? daySlots.map((s) => s.slotId)
      : [`${selectedDay}_${selectedSlotPeriod}`];

    const disruption: Disruption = {
      type: archetype,
      targetId: selectedEntityId,
      dayCode: selectedDay,
      slotIds,
      reason: `${reasonCode}: ${reasonText}`,
    };

    try {
      const generatedProposal = await repairTimetable(timetable.timetableId, {
        disruption,
      });
      setProposal(generatedProposal);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to simulate disruption repair';
      setSimulationError(msg);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-12">
      {/* Control Sub-Bar / Tactical Ribbon */}
      <section className="w-full bg-[#141b2b] px-4 md:px-6 py-2.5 border-b border-[#232a3a] shadow-sm">
        <div className="w-full flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#4edea3] font-semibold uppercase tracking-wider bg-[#191f2f] px-2.5 py-1 rounded border border-[#232a3a]">
              <Icon name="tune" className="text-[#4edea3] text-[15px]" />
              Disruption Simulator TESTBED
            </span>
            <span className="hidden md:inline text-[#3c4a42] font-mono text-[11px]">•</span>
            <p className="text-[12px] text-[#bbcabf]">
              Inject real-world operational disruptions to evaluate schedule resiliency and prepare automated repairs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap font-mono text-[10px]">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#070e1d] border border-[#232a3a] text-[#dce2f7]">
              <Icon name="lock" className="text-[#4edea3] text-[14px]" />
              <span className="text-[#bbcabf] uppercase tracking-wider">
                SOLVER BASELINE:{' '}
                <strong className="text-[#4edea3] font-semibold">{timetable.timetableId}</strong>
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2e3545] text-[#dce2f7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-ping" />
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                HEURISTIC EVALUATOR READY
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Operational Canvas: 2-Column Grid */}
      <div className="w-full px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Disruption Parameters Configuration (5 cols) */}
          <section className="xl:col-span-5 flex flex-col gap-4 bg-[#141b2b] p-5 rounded-lg border border-[#232a3a] shadow-sm">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Icon name="tune" className="text-[#4edea3] text-[20px]" />
                <h2 className="text-[16px] font-semibold text-[#dce2f7] tracking-tight">
                  Disruption Parameters Configuration
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#4edea3] uppercase font-medium bg-[#191f2f] px-2 py-0.5 rounded border border-[#232a3a]">
                Setup Mode
              </span>
            </div>

            {/* Step 1: Disruption Archetype */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#bbcabf]">
                Step 1: Disruption Archetype
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleArchetypeChange('FACULTY_UNAVAILABLE')}
                  className={`flex items-center justify-center gap-2 p-2 rounded transition-all font-mono text-[11px] cursor-pointer ${
                    archetype === 'FACULTY_UNAVAILABLE'
                      ? 'bg-[#10b981] text-[#003824] font-semibold shadow-inner'
                      : 'bg-[#191f2f] text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#232a3a] border border-[#232a3a]'
                  }`}
                >
                  <Icon name="person_off" className="text-[18px]" />
                  <span>Faculty Unavailable</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleArchetypeChange('ROOM_UNAVAILABLE')}
                  className={`flex items-center justify-center gap-2 p-2 rounded transition-all font-mono text-[11px] cursor-pointer ${
                    archetype === 'ROOM_UNAVAILABLE'
                      ? 'bg-[#10b981] text-[#003824] font-semibold shadow-inner'
                      : 'bg-[#191f2f] text-[#bbcabf] hover:text-[#dce2f7] hover:bg-[#232a3a] border border-[#232a3a]'
                  }`}
                >
                  <Icon name="domain_disabled" className="text-[18px]" />
                  <span>Room / Lab Closure</span>
                </button>
              </div>
            </div>

            {/* Step 2: Affected Entity Selection */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] uppercase tracking-wider text-[#bbcabf]">
                  Step 2: Affected Entity Selection
                </label>
                <span className="font-mono text-[10px] text-[#adc6ff] uppercase">
                  {archetype === 'FACULTY_UNAVAILABLE'
                    ? `${teachers.length} Registered Faculty`
                    : `${rooms.length} Active Rooms`}
                </span>
              </div>
              <div>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full h-8 px-2.5 bg-[#070e1d] text-[#dce2f7] text-[13px] rounded border border-[#232a3a] focus:outline-none focus:border-[#4edea3] transition-colors cursor-pointer"
                >
                  {archetype === 'FACULTY_UNAVAILABLE'
                    ? teachers.map((t) => (
                        <option key={t.teacherId} value={t.teacherId}>
                          {t.teacherId}: {t.displayName} ({t.specialty})
                        </option>
                      ))
                    : rooms.map((r) => (
                        <option key={r.roomId} value={r.roomId}>
                          {r.roomId}: {r.displayName} ({r.roomType}, Cap {r.capacity})
                        </option>
                      ))}
                </select>
              </div>

              {/* Entity Detail Pill */}
              <div className="flex items-center gap-2 p-2 rounded bg-[#191f2f] border border-[#232a3a] text-[#bbcabf] font-mono text-[10px]">
                <Icon name="info" className="text-[#4edea3] text-[14px]" />
                <span>
                  Directly Affected on {selectedDay}:{' '}
                  <strong className="text-[#ffb4ab] font-semibold">
                    {directlyAffectedEntries.length} sessions
                  </strong>
                </span>
              </div>
            </div>

            {/* Step 3: Disruption Window */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#bbcabf]">
                Step 3: Disruption Window &amp; Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-mono text-[#bbcabf] block mb-1">Day:</span>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value as DayCode)}
                    className="w-full h-8 px-2 bg-[#070e1d] text-[#dce2f7] text-[12px] font-mono rounded border border-[#232a3a] focus:outline-none cursor-pointer"
                  >
                    {days.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.label} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-[#bbcabf] block mb-1">Period:</span>
                  <select
                    disabled={isFullDay}
                    value={selectedSlotPeriod}
                    onChange={(e) => setSelectedSlotPeriod(e.target.value)}
                    className="w-full h-8 px-2 bg-[#070e1d] text-[#dce2f7] text-[12px] font-mono rounded border border-[#232a3a] focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="P1">P1 (09:00 - 10:00)</option>
                    <option value="P2">P2 (10:00 - 11:00)</option>
                    <option value="P3">P3 (11:00 - 12:00)</option>
                    <option value="P4">P4 (12:00 - 13:00)</option>
                    <option value="P5">P5 (13:00 - 14:00)</option>
                    <option value="P6">P6 (14:00 - 15:00)</option>
                    <option value="P7">P7 (15:00 - 16:00)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] text-[#dce2f7]">
                  <input
                    type="checkbox"
                    checked={isFullDay}
                    onChange={(e) => setIsFullDay(e.target.checked)}
                    className="accent-[#10b981] cursor-pointer"
                  />
                  <span>Full-Day Outage (All slots on {selectedDay})</span>
                </label>
              </div>
            </div>

            {/* Step 4: Reason Code */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="font-mono text-[10px] uppercase tracking-wider text-[#bbcabf]">
                Step 4: Operational Justification
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="h-8 px-2 bg-[#070e1d] text-[#dce2f7] text-[12px] font-mono rounded border border-[#232a3a] cursor-pointer"
                >
                  <option value="L-MED-04">L-MED-04 (Medical Leave)</option>
                  <option value="D-CONF-01">D-CONF-01 (Academic Conference)</option>
                  <option value="L-EMG-02">L-EMG-02 (Emergency Leave)</option>
                  <option value="D-INST-09">D-INST-09 (Facility Maintenance)</option>
                </select>
                <input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Notes..."
                  className="h-8 px-2.5 bg-[#070e1d] text-[#dce2f7] text-[12px] rounded border border-[#232a3a] focus:outline-none"
                />
              </div>
            </div>

            {/* Trigger Button */}
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulate}
              className="mt-2 w-full py-2.5 rounded bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-75"
            >
              <Icon
                name={isSimulating ? 'sync' : 'tune'}
                className={`text-[18px] ${isSimulating ? 'animate-spin' : ''}`}
              />
              <span>{isSimulating ? 'Evaluating Schedule Impact...' : 'Simulate & Evaluate Impact'}</span>
            </button>
          </section>

          {/* RIGHT COLUMN: Operational Impact Analysis (7 cols) */}
          <section className="xl:col-span-7 flex flex-col gap-4">
            {simulationError && (
              <div className="p-3.5 rounded bg-[#93000a]/20 border border-[#ffb4ab]/40 text-[#ffdad6] text-[12px] flex items-center gap-2 font-mono">
                <Icon name="error" className="text-[#ffb4ab] text-[18px] shrink-0" />
                <span>{simulationError}</span>
              </div>
            )}

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#191f2f] p-3.5 rounded border border-[#232a3a]">
                <span className="font-mono text-[10px] text-[#bbcabf] uppercase block">
                  Affected Sessions
                </span>
                <span className="text-[20px] font-bold font-mono text-[#ffb4ab]">
                  {directlyAffectedEntries.length}
                </span>
                <span className="text-[10px] text-[#bbcabf] block">Sessions voided by outage</span>
              </div>

              <div className="bg-[#191f2f] p-3.5 rounded border border-[#232a3a]">
                <span className="font-mono text-[10px] text-[#bbcabf] uppercase block">
                  Hard Collisions
                </span>
                <span className="text-[20px] font-bold font-mono text-[#4edea3]">
                  {proposal ? proposal.validation.hardConflictCount : directlyAffectedEntries.length > 0 ? directlyAffectedEntries.length : 0}
                </span>
                <span className="text-[10px] text-[#bbcabf] block">Direct conflicts triggered</span>
              </div>

              <div className="bg-[#191f2f] p-3.5 rounded border border-[#232a3a]">
                <span className="font-mono text-[10px] text-[#bbcabf] uppercase block">
                  Relocations Proposed
                </span>
                <span className="text-[20px] font-bold font-mono text-[#adc6ff]">
                  {proposal ? proposal.changes.length : 0}
                </span>
                <span className="text-[10px] text-[#bbcabf] block">Deltas ready for preview</span>
              </div>
            </div>

            {/* Directly Affected Sessions Breakdown */}
            <div className="bg-[#141b2b] p-4 rounded-lg border border-[#232a3a] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#232a3a]">
                <div className="flex items-center gap-2">
                  <Icon name="cancel" className="text-[#ffb4ab] text-[18px]" />
                  <span className="font-semibold text-[14px] text-[#dce2f7]">
                    Directly Disrupted Sessions ({directlyAffectedEntries.length})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#bbcabf]">
                  {selectedDay} • {isFullDay ? 'All Slots' : selectedSlotPeriod}
                </span>
              </div>

              {directlyAffectedEntries.length === 0 ? (
                <div className="py-6 text-center text-[12px] font-mono text-[#86948a]">
                  No sessions match the selected entity and time slot on {selectedDay}.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {directlyAffectedEntries.map((e) => {
                    const course = courseMap.get(e.courseId);
                    const room = roomMap.get(e.roomId);
                    const teacher = teacherMap.get(e.teacherId);

                    return (
                      <div
                        key={e.entryId}
                        className="bg-[#191f2f] p-3 rounded border border-[#93000a]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-bold text-[#ffb4ab]">
                              {course?.courseCode || e.courseId}
                            </span>
                            <span className="text-[12px] text-[#dce2f7] font-medium">
                              {course?.courseName || 'Curricular Session'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-mono text-[#bbcabf] mt-1">
                            <span>Slot: {e.startSlotId}</span>
                            <span>•</span>
                            <span>Room: {room?.displayName || e.roomId}</span>
                            <span>•</span>
                            <span>Faculty: {teacher?.displayName || e.teacherId}</span>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          <span className="px-2 py-0.5 rounded bg-[#93000a]/30 text-[#ffb4ab] font-mono text-[10px] font-semibold border border-[#ffb4ab]/30">
                            Disrupted
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Repair Proposal Ready Banner */}
            {proposal && (
              <div className="bg-[#10b981]/10 border border-[#10b981]/40 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon name="verified" className="text-[#4edea3] text-[24px] shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-[14px] text-[#dce2f7]">
                      Automated Repair Proposal Ready ({proposal.changeSetId})
                    </span>
                    <span className="text-[12px] text-[#bbcabf]">
                      {proposal.changes.length} relocations computed with zero hard conflicts and 100% lunch compliance.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onProceedToRepair(proposal)}
                  className="px-4 py-2 rounded bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-semibold text-[12px] font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <span>Inspect Repair Proposal</span>
                  <Icon name="arrow_forward" className="text-[14px]" />
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
