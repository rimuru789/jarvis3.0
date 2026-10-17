import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#070e1d] py-3.5 border-t border-[#232a3a] mt-auto">
      <div className="w-full px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-2 font-mono text-[10px] text-[#bbcabf]">
        <div className="flex items-center gap-2">
          <span>SlotShield Engine v2.4.9</span>
          <span>•</span>
          <span>Automated Deterministic Heuristic Solver</span>
        </div>
        <div className="flex items-center gap-2 text-center md:text-right">
          <span>Institutional Deployment: Dept of Computer Engineering</span>
          <span>•</span>
          <span>Autonomous Collision Detection</span>
        </div>
      </div>
    </footer>
  );
};
