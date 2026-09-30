import React from 'react';
import { RoundIssue } from '../types';

interface SimpleTimerPanelProps {
  issue: RoundIssue | null;
  remainingSeconds: number;
}

export const SimpleTimerPanel: React.FC<SimpleTimerPanelProps> = ({
  issue,
  remainingSeconds,
}) => {
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const currentPeriod = issue?.issueNumber || 'SYNCING...';

  return (
    <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
      <div className="grid grid-cols-2 gap-4 text-center items-center font-mono">
        
        {/* CURRENT PERIOD */}
        <div className="space-y-1 border-r border-slate-800/80">
          <div className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
            CURRENT PERIOD
          </div>
          <div className="text-base sm:text-xl font-bold text-slate-100 select-all tracking-wide">
            {currentPeriod}
          </div>
        </div>

        {/* COUNTDOWN */}
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
            COUNTDOWN
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tracking-widest ${
              remainingSeconds <= 5
                ? 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]'
            }`}
          >
            {formatTime(remainingSeconds)}
          </div>
        </div>

      </div>
    </div>
  );
};
