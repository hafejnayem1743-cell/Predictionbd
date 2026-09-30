import React from 'react';
import { RoundIssue } from '../types';
import { RefreshCw, Clock, Radio, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LiveRoundPanelProps {
  issue: RoundIssue | null;
  remainingSeconds: number;
  isLoading: boolean;
  onRefresh: () => void;
  isFlashing: boolean;
}

export const LiveRoundPanel: React.FC<LiveRoundPanelProps> = ({
  issue,
  remainingSeconds,
  isLoading,
  onRefresh,
  isFlashing,
}) => {
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const periodNumber = issue?.issueNumber || 'SYNCHRONIZING...';
  const signalPeriod = issue?.nextSignal?.targetPeriod || periodNumber

  const intervalSec = issue?.intervalSeconds || 60;
  const progressPct = Math.min(100, Math.max(0, (remainingSeconds / intervalSec) * 100));

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-[#0b0f15]/90 p-5 md:p-6 transition-all duration-300 ${
        isFlashing
          ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
          : 'border-slate-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />

      {/* Top Bar: Telemetry & Status */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span className="font-semibold tracking-wide">LIVE ROUND TELEMETRY</span>
          </div>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-xs font-mono text-slate-400">
            Gateway: <span className="text-cyan-400">{issue?.dataSource || 'HG-NICE Core'}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Label */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {issue?.isLive ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED REAL-TIME
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                CONNECTING...
              </span>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700 rounded transition-colors disabled:opacity-50"
            title="Force re-sync with server"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Re-Sync</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Current Period & Countdown */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left Column: Period Information */}
        <div className="md:col-span-7 space-y-3">
          <div className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
            <span>Current Period Number</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1 py-0.5 rounded">
              Verified Draw
            </span>
          </div>

          {/* Glowing Period Display */}
          <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold tracking-tight text-white flex items-center gap-3">
            <span className="text-emerald-400 select-all font-mono drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
              {periodNumber}
            </span>
          </div>

          {/* Subtitle Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400 pt-1">
            <span>Current Signal: <strong className="text-slate-200">{signalPeriod}</strong></span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Server Time: <span className="text-cyan-300">{issue?.serverTime || '--:--:--'}</span></span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span>Round End: <span className="text-slate-300">{issue?.endTime || '--:--:--'}</span></span>
          </div>
        </div>

        {/* Right Column: Countdown Display */}
        <div className="md:col-span-5 flex flex-col items-center md:items-end justify-center">
          <div className="text-xs font-mono text-slate-400 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>COUNTDOWN TO RESULT</span>
          </div>

          {/* Digital Timer */}
          <div
            className={`font-mono font-black text-4xl sm:text-5xl tracking-widest ${
              remainingSeconds <= 5
                ? 'text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]'
                : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}
          >
            {formatTime(remainingSeconds)}
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-[220px] bg-slate-900 border border-slate-800 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                remainingSeconds <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="text-[11px] font-mono text-slate-500 mt-1.5">
            Synchronized with Round Interval ({intervalSec}s)
          </div>
        </div>

      </div>
    </div>
  );
};
