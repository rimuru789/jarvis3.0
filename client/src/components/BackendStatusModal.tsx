import React, { useState } from 'react';
import { getHealthCheck } from '../lib/api';
import { Icon } from './Icon';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  backendConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({
  isOpen,
  onClose,
  backendConnected,
  onConnectionChange,
}) => {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestHealth = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await getHealthCheck();
      if (res && res.ok) {
        onConnectionChange(true);
        setCheckResult('Success: Connected to live SlotShield backend (HTTP 200 OK, Solver Engine Ready).');
      } else {
        onConnectionChange(false);
        setCheckResult('Backend returned unexpected status.');
      }
    } catch (err: unknown) {
      onConnectionChange(false);
      const msg = err instanceof Error ? err.message : String(err);
      setCheckResult(`Backend Unreachable: ${msg}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#294635]/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#FFFFFF] border border-[#DCE5D5] rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#F7F4E8] border-b border-[#DCE5D5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="hub" className="text-[#5B8C51] text-[20px]" />
            <div>
              <h3 className="font-semibold text-[15px] text-[#294635]">
                Backend &amp; Solver Integration Status
              </h3>
              <p className="text-[11px] text-[#526B57]">
                Contract target: <code className="text-[#5B8C51] font-mono">/api/v1</code> (Proxy: localhost:3001)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#526B57] hover:text-[#294635] flex items-center justify-center cursor-pointer"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-[13px]">
          {/* Status Alert Banner */}
          <div
            className={`p-3.5 rounded border flex items-start gap-3 ${
              backendConnected
                ? 'bg-[#EDF5E8] border-[#B7D8A9] text-[#294635]'
                : 'bg-[#F7F4E8] border-[#DCE5D5] text-[#526B57]'
            }`}
          >
            <Icon
              name={backendConnected ? 'check_circle' : 'info'}
              className={`text-[20px] shrink-0 mt-0.5 ${
                backendConnected ? 'text-[#5B8C51]' : 'text-[#B58B48]'
              }`}
            />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[#294635]">
                {backendConnected
                  ? 'Local SlotShield Backend Connected'
                  : 'Operating in Design Baseline Standby Mode'}
              </span>
              <p className="text-[12px] leading-relaxed">
                {backendConnected
                  ? 'The frontend is receiving live state from your local Node.js/Express server in jarvis3.0.'
                  : 'Launch the backend server with `npm run dev` in `jarvis3.0/server` to connect live timetable generation, disruption simulation, and repair.'}
              </p>
            </div>
          </div>

          {/* Integration Blueprint Reference */}
          <div className="bg-[#F7F4E8] p-3.5 rounded border border-[#DCE5D5] flex flex-col gap-2 font-mono text-[11px]">
            <span className="text-[10px] uppercase tracking-wider text-[#526B57] font-semibold">
              Configured API Endpoints (STITCH_API_INTEGRATION_BLUEPRINT.md)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[#294635]">
              <div>• GET /api/v1/health</div>
              <div>• GET /api/v1/bootstrap</div>
              <div>• GET /api/v1/timetables</div>
              <div>• POST /api/v1/timetables/generate</div>
              <div>• GET /api/v1/timetables/:id</div>
              <div>• POST /api/v1/timetables/:id/validate</div>
              <div>• POST /api/v1/timetables/:id/repair</div>
              <div>• POST /api/v1/timetables/:id/repair/apply</div>
              <div>• GET /api/v1/schedule-settings</div>
              <div>• PATCH /api/v1/schedule-settings</div>
            </div>
          </div>

          {/* Test Health Check Trigger */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#526B57]">
                Health Probe: <code className="text-[#5B8C51]">GET /api/v1/health</code>
              </span>
              <button
                type="button"
                disabled={checking}
                onClick={handleTestHealth}
                className="px-3.5 py-1.5 rounded bg-[#5B8C51] hover:bg-[#4B7443] text-[#FFFFFF] font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon
                  name={checking ? 'sync' : 'network_check'}
                  className={`text-[16px] ${checking ? 'animate-spin' : ''}`}
                />
                <span>{checking ? 'Testing Connection...' : 'Probe Local Server'}</span>
              </button>
            </div>

            {checkResult && (
              <div
                className={`p-2.5 rounded text-[11px] font-mono border ${
                  backendConnected
                    ? 'bg-[#EDF5E8] border-[#B7D8A9] text-[#294635]'
                    : 'bg-[#F8DFDA] border-[#E8A29A] text-[#762D27]'
                }`}
              >
                {checkResult}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#F7F4E8] border-t border-[#DCE5D5] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#EDF5E8] hover:bg-[#DDE8D2] text-[#294635] border border-[#DCE5D5] text-[12px] font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
