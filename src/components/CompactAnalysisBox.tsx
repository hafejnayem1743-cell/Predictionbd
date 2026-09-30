import React from 'react';
import { CompactAnalysisData, WindowAnalysis } from '../types';

interface CompactAnalysisBoxProps {
  analysis: CompactAnalysisData | null;
  isLoading: boolean;
}

export const CompactAnalysisBox: React.FC<CompactAnalysisBoxProps> = ({
  analysis,
  isLoading,
}) => {
  if (!analysis && isLoading) {
    return (
      <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-4 text-center font-mono text-xs text-slate-500">
        Loading historical window analysis...
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-4 text-center font-mono text-xs text-slate-500">
        Historical analysis unavailable.
      </div>
    );
  }

  const renderWindow = (data: WindowAnalysis, title: string) => {
    return (
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3.5 space-y-3 font-mono">
        
        {/* Title & Status */}
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <h4 className="font-bold text-xs sm:text-sm text-slate-100 tracking-wide">
              {title}
            </h4>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
            {data.dataStatus}
          </span>
        </div>

        {/* Big / Small and Red / Green Counts & Percentages */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Big / Small */}
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400 font-bold">BIG</span>
              <span className="text-slate-200 font-semibold">
                {data.bigCount} ({data.bigPercentage}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-bold">SMALL</span>
              <span className="text-slate-200 font-semibold">
                {data.smallCount} ({data.smallPercentage}%)
              </span>
            </div>
          </div>

          {/* Red / Green */}
          <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-red-400 font-bold">RED</span>
              <span className="text-slate-200 font-semibold">
                {data.redCount} ({data.redPercentage}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-emerald-400 font-bold">GREEN</span>
              <span className="text-slate-200 font-semibold">
                {data.greenCount} ({data.greenPercentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Number Frequency Grid 0 to 9 */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
            NUMBER FREQUENCY
          </div>
          <div className="grid grid-cols-5 gap-1.5 text-center text-[11px]">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const count = data.numberFrequency[num] ?? 0;
              const isMost = data.mostFrequent.number === num && data.mostFrequent.count > 0;
              const isLeast = data.leastFrequent.number === num && data.leastFrequent.count > 0;
              return (
                <div
                  key={num}
                  className={`p-1 rounded border text-[11px] ${
                    isMost
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold'
                      : isLeast
                      ? 'bg-amber-950/30 border-amber-600/40 text-amber-300'
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-300'
                  }`}
                >
                  <span className="font-bold text-slate-400">{num}:</span>{' '}
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Frequent / Least Frequent / Periods Count */}
        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="text-slate-400">MOST FREQUENT:</span>{' '}
            <span className="text-emerald-400 font-bold">
              {data.mostFrequent.number} ({data.mostFrequent.count})
            </span>
          </div>
          <div>
            <span className="text-slate-400">LEAST FREQUENT:</span>{' '}
            <span className="text-amber-400 font-bold">
              {data.leastFrequent.number} ({data.leastFrequent.count})
            </span>
          </div>
          <div className="col-span-2 text-slate-400">
            <span>PERIODS ANALYZED:</span>{' '}
            <span className="text-slate-200 font-bold">{data.periodsAnalyzed}</span>
          </div>
        </div>

      </div>
    );
  };

  return (
    <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h3 className="font-bold text-sm sm:text-base text-slate-100 tracking-wide">
          COMPACT ANALYSIS
        </h3>
        <span className="text-[11px] text-slate-400">
          Real Data · Auto-Synchronized
        </span>
      </div>

      {/* Responsive Grid: 2 Columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderWindow(analysis.last1000, 'LAST 1000 PERIODS')}
        {renderWindow(analysis.last5Hours, 'LAST 5 HOURS')}
      </div>
    </div>
  );
};
