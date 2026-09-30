import React from 'react';
import { NextSignal, RoundIssue } from '../types';

interface SimplePredictionCardProps {
  issue: RoundIssue | null;
  remainingSeconds: number;
}

export const SimplePredictionCard: React.FC<SimplePredictionCardProps> = ({
  issue,
  remainingSeconds,
}) => {
  const signal = issue?.nextSignal;
  const currentPeriod = issue?.issueNumber || 'SYNCING...';
  const targetPeriod = signal?.targetPeriod || currentPeriod;

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const isInsufficient = !signal || signal.status === 'INSUFFICIENT DATA';

  return (
    <div className="w-full bg-[#0d131f] border-2 border-emerald-500/40 rounded-xl p-5 sm:p-7 text-center font-mono shadow-xl relative overflow-hidden">
      
      {/* Title */}
      <div className="text-xs sm:text-sm font-bold tracking-widest text-emerald-400 uppercase mb-2">
        CURRENT SIGNAL · LOCKED
      </div>
      <div className="text-[10px] sm:text-xs text-slate-500 mb-4">
        Generated from completed history · fixed for the current HGNICE period
      </div>

      {/* Large Prediction Value or Insufficient Data */}
      {isInsufficient ? (
        <div className="my-6">
          <div className="text-xl sm:text-2xl font-bold text-amber-400 bg-amber-950/30 border border-amber-500/30 rounded-lg py-3 px-4 inline-block">
            INSUFFICIENT DATA
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Waiting for verified historical draws to compute statistical probabilities.
          </p>
        </div>
      ) : (
        <div className="my-4 space-y-4">
          {/* BIG / GREEN / 8 */}
          <div className="text-3xl sm:text-5xl font-black tracking-wider flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            <span
              className={
                signal.size === 'BIG'
                  ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              }
            >
              {signal.size}
            </span>
            <span className="text-slate-600">/</span>
            <span
              className={
                signal.color === 'GREEN'
                  ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              }
            >
              {signal.color}
            </span>
            <span className="text-slate-600">/</span>
            <span
              className={`inline-flex items-center justify-center w-10 h-10 sm:w-14 sm:h-14 rounded-lg text-white font-black text-2xl sm:text-4xl shadow-lg ${
                signal.number === 0
                  ? 'bg-gradient-to-br from-red-600 to-purple-600'
                  : signal.number === 5
                  ? 'bg-gradient-to-br from-emerald-600 to-purple-600'
                  : [1, 3, 7, 9].includes(signal.number)
                  ? 'bg-emerald-600'
                  : 'bg-red-600'
              }`}
            >
              {signal.number ?? '—'}
            </span>
          </div>

          {/* Details Grid: CURRENT SIGNAL PERIOD & CURRENT PERIOD */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            {/* SIGNAL PERIOD */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-emerald-500/20 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                SIGNAL FOR CURRENT PERIOD
              </div>
              <div className="text-xs sm:text-sm font-bold text-emerald-300 mt-1 select-all">
                {targetPeriod}
              </div>
            </div>

            {/* CURRENT PERIOD */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                CURRENT PERIOD
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-200 mt-1 select-all">
                {currentPeriod}
              </div>
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60 text-center">
              <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                TIME LEFT
              </div>
              <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-1">
                {formatTime(remainingSeconds)}
              </div>
            </div>
          </div>

          {/* ANALYSIS SUMMARY & MODEL AGREEMENT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {/* ANALYSIS SUMMARY */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-1">
              <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                ANALYSIS SUMMARY
              </div>
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">Long-term trend:</span>{' '}
                <span className="text-cyan-400 font-semibold">
                  {signal.longTermTrend || 'Analyzing...'}
                </span>
              </div>
              <div className="text-xs text-slate-300">
                <span className="text-slate-400">5-hour trend:</span>{' '}
                <span className="text-emerald-400 font-semibold">
                  {signal.fiveHourTrend || 'Analyzing...'}
                </span>
              </div>
            </div>

            {/* MODEL AGREEMENT */}
            <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60 flex flex-col justify-center">
              <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                MODEL AGREEMENT
              </div>
              <div className="text-lg sm:text-xl font-bold text-cyan-400 mt-0.5">
                {signal.estimatedProbability || 'NOT CALIBRATED'}
              </div>
              {signal.uncertaintyNote && (
                <div className="text-[10px] text-amber-400/90 font-medium">
                  {signal.uncertaintyNote}
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-500 pt-1 text-center">LOCKED AT: {signal.generatedAt ? new Date(signal.generatedAt).toLocaleTimeString('en-GB', { hour12: false }) : '--:--:--'}</div>

          {/* Uncertainty / Notice */}
          <div className="text-[10px] text-slate-500 pt-1 text-center">
            Statistical estimate only. Accuracy is measured by walk-forward backtesting; no guaranteed accuracy or profitability.
          </div>
        </div>
      )}

    </div>
  );
};
