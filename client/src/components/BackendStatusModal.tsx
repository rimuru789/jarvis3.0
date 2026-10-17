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
    <div className="fixed inset-0 z-50 bg-[#070e1d]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#141b2b] border border-[#232a3a] rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#191f2f] border-b border-[#232a3a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon name="hub" className="text-[#adc6ff] text-[20px]" />
            <div>
              <h3 className="font-semibold text-[15px] text-[#dce2f7]">
                Backend &amp; Solver Integration Status
              </h3>
              <p className="text-[11px] text-[#bbcabf]">
                Contract target: <code className="text-[#4edea3] font-mono">/api/v1</code> (Proxy: localhost:3001)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded bg-[#232a3a] hover:bg-[#2e3545] text-[#bbcabf] hover:text-[#dce2f7] flex items-center justify-center cursor-pointer"
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
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#dce2f7]'
                : 'bg-[#070e1d] border-[#232a3a] text-[#bbcabf]'
            }`}
          >
            <Icon
              name={backendConnected ? 'check_circle' : 'info'}
              className={`text-[20px] shrink-0 mt-0.5 ${
                backendConnected ? 'text-[#4edea3]' : 'text-[#adc6ff]'
              }`}
            />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-[#dce2f7]">
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
          <div className="bg-[#191f2f] p-3.5 rounded border border-[#232a3a] flex flex-col gap-2 font-mono text-[11px]">
            <span className="text-[10px] uppercase tracking-wider text-[#bbcabf] font-semibold">
              Configured API Endpoints (STITCH_API_INTEGRATION_BLUEPRINT.md)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[#dce2f7]">
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
              <span className="text-[12px] text-[#bbcabf]">
                Health Probe: <code className="text-[#adc6ff]">GET /api/v1/health</code>
              </span>
              <button
                type="button"
                disabled={checking}
                onClick={handleTestHealth}
                className="px-3.5 py-1.5 rounded bg-[#232a3a] hover:bg-[#2e3545] text-[#4edea3] font-mono text-[11px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
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
                    ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#4edea3]'
                    : 'bg-[#93000a]/20 border-[#ffb4ab]/30 text-[#ffb4ab]'
                }`}
              >
                {checkResult}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#191f2f] border-t border-[#232a3a] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#232a3a] hover:bg-[#2e3545] text-[#dce2f7] text-[12px] font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
