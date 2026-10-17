/**
 * SlotShield College Academic Timetable System
 *
 * Integrated 4-Screen Layout for Computer Engineering:
 * 1. Master Timetable Screen
 * 2. Generate Timetable Screen
 * 3. Disruption Simulator Screen
 * 4. Repair Proposal Screen
 *
 * Fully connected to authoritative backend routes, contracts, and validation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  BootstrapPayload,
  TimetableResult,
  ScheduleSettings,
  RepairProposal,
} from './lib/api';
import { getBootstrap, getHealthCheck, validateTimetable, ApiError } from './lib/api';
import { Header, type ScreenId } from './components/Header';
import { Footer } from './components/Footer';
import { BackendStatusModal } from './components/BackendStatusModal';
import { MasterTimetableScreen } from './components/screens/MasterTimetableScreen';
import { GenerateTimetableScreen } from './components/screens/GenerateTimetableScreen';
import { DisruptionSimulatorScreen } from './components/screens/DisruptionSimulatorScreen';
import { RepairProposalScreen } from './components/screens/RepairProposalScreen';
import { Icon } from './components/Icon';

export function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('master-timetable');
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [isBackendModalOpen, setIsBackendModalOpen] = useState<boolean>(false);

  const [bootstrapData, setBootstrapData] = useState<BootstrapPayload | null>(null);
  const [currentTimetable, setCurrentTimetable] = useState<TimetableResult | null>(null);
  const [currentProposal, setCurrentProposal] = useState<RepairProposal | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Probe health & fetch bootstrap data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // 1. Health check
      try {
        const health = await getHealthCheck();
        setBackendConnected(Boolean(health?.ok));
      } catch {
        setBackendConnected(false);
      }

      // 2. Bootstrap data
      const data = await getBootstrap();
      setBootstrapData(data);
      setCurrentTimetable(data.sampleTimetable);
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to connect to SlotShield backend';
      setLoadError(msg);
      setBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Timetable generated handler
  const handleTimetableGenerated = useCallback(
    (generated: TimetableResult, updatedSettings: ScheduleSettings) => {
      setCurrentTimetable(generated);
      setBootstrapData((prev) =>
        prev
          ? {
              ...prev,
              scheduleSettings: updatedSettings,
              sampleTimetable: generated,
            }
          : prev
      );
    },
    []
  );

  // Validation handler
  const handleValidate = useCallback(async () => {
    if (!currentTimetable) return;
    setIsValidating(true);
    try {
      const val = await validateTimetable(currentTimetable.timetableId, currentTimetable.entries);
      setCurrentTimetable((prev) => (prev ? { ...prev, validation: val } : prev));
    } catch (err: unknown) {
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  }, [currentTimetable]);

  // Disruption simulation completed -> proceed to repair
  const handleProceedToRepair = useCallback((proposal: RepairProposal) => {
    setCurrentProposal(proposal);
    setActiveScreen('repair-proposal');
  }, []);

  // Repair applied successfully
  const handleApplyRepairSuccess = useCallback((updatedTimetable: TimetableResult) => {
    setCurrentTimetable(updatedTimetable);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0c1322] text-[#dce2f7] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Icon name="sync" className="text-[32px] text-[#4edea3] animate-spin" />
          <h2 className="text-[16px] font-mono font-semibold text-[#dce2f7]">
            Initializing SlotShield Academic Engine...
          </h2>
          <p className="text-[12px] text-[#bbcabf] font-mono">
            Loading curriculum, faculty directory, and room constraints
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !bootstrapData || !currentTimetable) {
    return (
      <div className="min-h-screen bg-[#0c1322] text-[#dce2f7] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#141b2b] border border-[#232a3a] p-6 rounded-xl flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#93000a]/30 border border-[#ffb4ab]/30 flex items-center justify-center text-[#ffb4ab]">
            <Icon name="error" className="text-[24px]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#dce2f7]">
              Unable to Load Backend Context
            </h2>
            <p className="text-[12px] text-[#bbcabf] mt-1 font-mono">
              {loadError || 'Server returned empty payload.'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="px-4 py-2 rounded bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-semibold text-[13px] font-mono transition-colors cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1322] text-[#dce2f7] flex flex-col selection:bg-[#10b981] selection:text-[#00422b]">
      {/* Top Header */}
      <Header
        activeScreen={activeScreen}
        onNavigate={(screen) => setActiveScreen(screen)}
        backendConnected={backendConnected}
        onOpenBackendStatusModal={() => setIsBackendModalOpen(true)}
        facultyCount={bootstrapData.teachers.length}
        totalSessionsCount={currentTimetable.entries.length}
      />

      {/* Main Screen Content */}
      <main className="w-full pt-16 flex-1 flex flex-col">
        {activeScreen === 'master-timetable' && (
          <MasterTimetableScreen
            timetable={currentTimetable}
            courses={bootstrapData.courses}
            teachers={bootstrapData.teachers}
            rooms={bootstrapData.rooms}
            timeSlots={bootstrapData.timeSlots}
            scheduleSettings={bootstrapData.scheduleSettings}
            onOpenGenerate={() => setActiveScreen('generate-timetable')}
            onOpenDisruption={() => setActiveScreen('disruption-simulator')}
            onValidate={handleValidate}
            isValidating={isValidating}
          />
        )}

        {activeScreen === 'generate-timetable' && (
          <GenerateTimetableScreen
            scheduleSettings={bootstrapData.scheduleSettings}
            summary={bootstrapData.summary}
            onClose={() => setActiveScreen('master-timetable')}
            onNavigateToMaster={() => setActiveScreen('master-timetable')}
            onNavigateToDisruption={() => setActiveScreen('disruption-simulator')}
            onTimetableGenerated={handleTimetableGenerated}
          />
        )}

        {activeScreen === 'disruption-simulator' && (
          <DisruptionSimulatorScreen
            timetable={currentTimetable}
            teachers={bootstrapData.teachers}
            rooms={bootstrapData.rooms}
            courses={bootstrapData.courses}
            timeSlots={bootstrapData.timeSlots}
            onProceedToRepair={handleProceedToRepair}
          />
        )}

        {activeScreen === 'repair-proposal' && (
          currentProposal ? (
            <RepairProposalScreen
              proposal={currentProposal}
              courses={bootstrapData.courses}
              teachers={bootstrapData.teachers}
              rooms={bootstrapData.rooms}
              timeSlots={bootstrapData.timeSlots}
              onReturnToMaster={() => setActiveScreen('master-timetable')}
              onApplyRepairSuccess={handleApplyRepairSuccess}
            />
          ) : (
            <div className="w-full max-w-2xl mx-auto my-12 p-8 bg-[#141b2b] border border-[#232a3a] rounded-xl flex flex-col items-center text-center gap-4">
              <Icon name="info" className="text-[32px] text-[#adc6ff]" />
              <div>
                <h3 className="text-[16px] font-semibold text-[#dce2f7]">
                  No Active Repair Proposal Staged
                </h3>
                <p className="text-[12px] text-[#bbcabf] mt-1 font-mono">
                  Configure a faculty outage or room closure in the Disruption Simulator to evaluate impact and generate a self-healing repair proposal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveScreen('disruption-simulator')}
                className="px-4 py-2 rounded bg-[#10b981] hover:bg-[#4edea3] text-[#003824] font-mono text-[12px] font-semibold transition-colors cursor-pointer"
              >
                Go to Disruption Simulator
              </button>
            </div>
          )
        )}
      </main>

      {/* Persistent Global Institutional Footer */}
      <Footer />

      {/* Backend & Solver Diagnostics Modal */}
      <BackendStatusModal
        isOpen={isBackendModalOpen}
        onClose={() => setIsBackendModalOpen(false)}
        backendConnected={backendConnected}
        onConnectionChange={setBackendConnected}
      />
    </div>
  );
}

export default App;
