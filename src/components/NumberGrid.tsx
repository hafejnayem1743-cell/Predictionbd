import React from 'react';
import { AnalysisData } from '../types';

interface NumberGridProps {
  analysis: AnalysisData | null;
}

export const NumberGrid: React.FC<NumberGridProps> = ({ analysis }) => {
  const frequencies = analysis?.numberFrequency || Array(10).fill(0);
  const percentages = analysis?.numberPercentages || Array(10).fill(0);
  const total = analysis?.totalRoundsAnalyzed || 0;

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Verified WinGo color schemes
  const getNumberColorStyle = (num: number) => {
    if (num === 0) {
      // Split Red and Violet
      return {
        bg: 'bg-gradient-to-br from-red-600 to-purple-600',
        border: 'border-red-500/50',
        label: 'Red / Violet',
        textColor: 'text-white',
      };
    }
    if (num === 5) {
      // Split Green and Violet
      return {
        bg: 'bg-gradient-to-br from-emerald-600 to-purple-600',
        border: 'border-emerald-500/50',
        label: 'Green / Violet',
        textColor: 'text-white',
      };
    }
    if ([1, 3, 7, 9].includes(num)) {
      // Green
      return {
        bg: 'bg-emerald-950/70 hover:bg-emerald-900/60',
        border: 'border-emerald-500/40',
        label: 'Green',
        textColor: 'text-emerald-400',
      };
    }
    // Red (2, 4, 6, 8)
    return {
      bg: 'bg-red-950/70 hover:bg-red-900/60',
      border: 'border-red-500/40',
      label: 'Red',
      textColor: 'text-red-400',
    };
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/90 p-5 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wide">
            WIN GO NUMBER FREQUENCY MATRIX (0 – 9)
          </h3>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Verified color classifications & appearance rates across {total} rounds
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Small: <span className="text-cyan-400">0 – 4</span> · Big: <span className="text-emerald-400">5 – 9</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2.5">
        {numbers.map((n) => {
          const style = getNumberColorStyle(n);
          const count = frequencies[n] || 0;
          const pct = percentages[n] || 0;
          const isBig = n >= 5;

          return (
            <div
              key={n}
              className={`rounded-lg border ${style.border} ${style.bg} p-3 text-center transition-all flex flex-col justify-between`}
            >
              <div>
                <div className={`text-2xl sm:text-3xl font-mono font-black ${style.textColor}`}>
                  {n}
                </div>
                <div className="text-[10px] font-mono text-slate-300 mt-0.5 uppercase tracking-wider">
                  {isBig ? 'Big' : 'Small'}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 font-mono">
                <div className="text-xs font-bold text-slate-100">{pct}%</div>
                <div className="text-[10px] text-slate-400">{count} draws</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
