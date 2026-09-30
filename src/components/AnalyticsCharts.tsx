import React from 'react';
import { AnalysisData } from '../types';
import { BarChart3, PieChart, Activity } from 'lucide-react';

interface AnalyticsChartsProps {
  analysis: AnalysisData | null;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ analysis }) => {
  if (!analysis || analysis.totalRoundsAnalyzed === 0) {
    return null;
  }

  const freq = analysis.numberFrequency || Array(10).fill(0);
  const maxFreq = Math.max(...freq, 1);
  const sizePcts = analysis.sizePercentages || { Big: 50, Small: 50 };
  const colorPcts = analysis.colorPercentages || { green: 40, red: 40, violet: 20 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Chart 1: Digit Frequency Histogram (0-9) */}
      <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/90 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wide">
              DIGIT FREQUENCY HISTOGRAM (0 – 9)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Window: {analysis.totalRoundsAnalyzed} draws
          </span>
        </div>

        {/* Visual Bar Columns */}
        <div className="pt-6 pb-2">
          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2">
            {freq.map((count, num) => {
              const heightPct = Math.max(8, (count / maxFreq) * 100);
              const isBig = num >= 5;
              const pct = analysis.numberPercentages[num] || 0;

              return (
                <div key={num} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  {/* Tooltip / Value on top */}
                  <span className="text-[10px] font-mono text-slate-400 opacity-80 group-hover:opacity-100 transition-opacity">
                    {count}x
                  </span>

                  {/* Bar */}
                  <div className="w-full bg-slate-900 rounded-t overflow-hidden flex items-end h-full">
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${
                        num === 0
                          ? 'bg-gradient-to-t from-red-600 to-purple-600'
                          : num === 5
                          ? 'bg-gradient-to-t from-emerald-600 to-purple-600'
                          : isBig
                          ? 'bg-emerald-500/80 group-hover:bg-emerald-400'
                          : 'bg-cyan-500/80 group-hover:bg-cyan-400'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Digit Label */}
                  <span className="text-xs font-mono font-bold text-slate-200 mt-1">
                    {num}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
          <span>Expected Theoretical Mean: 10.0% per digit</span>
          <span>Sample Variance: Tracked</span>
        </div>
      </div>

      {/* Chart 2: Big/Small & Color Composition */}
      <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/90 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wide">
              MACRO DISTRIBUTION & EQUILIBRIUM
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Real Sample Ratios
          </span>
        </div>

        <div className="space-y-6 pt-2 font-mono">
          
          {/* Big vs Small Comparison Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                BIG (5-9): {sizePcts.Big}%
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                <span className="w-2.5 h-2.5 bg-cyan-500 rounded-sm" />
                SMALL (0-4): {sizePcts.Small}%
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950 rounded-md overflow-hidden flex border border-slate-800">
              <div
                className="bg-emerald-500/80 flex items-center justify-center text-[10px] text-emerald-950 font-black transition-all"
                style={{ width: `${sizePcts.Big}%` }}
              >
                {sizePcts.Big > 15 ? `${sizePcts.Big}%` : ''}
              </div>
              <div
                className="bg-cyan-500/80 flex items-center justify-center text-[10px] text-cyan-950 font-black transition-all"
                style={{ width: `${sizePcts.Small}%` }}
              >
                {sizePcts.Small > 15 ? `${sizePcts.Small}%` : ''}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Counts: {analysis.sizeDistribution.Big}</span>
              <span>Counts: {analysis.sizeDistribution.Small}</span>
            </div>
          </div>

          {/* Color Breakdown Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1.5">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                GREEN: {colorPcts.green}%
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-sm" />
                RED: {colorPcts.red}%
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2.5 h-2.5 bg-purple-500 rounded-sm" />
                VIOLET: {colorPcts.violet}%
              </span>
            </div>
            <div className="h-6 w-full bg-slate-950 rounded-md overflow-hidden flex border border-slate-800">
              <div
                className="bg-emerald-500/80 flex items-center justify-center text-[10px] text-emerald-950 font-black"
                style={{ width: `${colorPcts.green}%` }}
              >
                {colorPcts.green > 12 ? `${colorPcts.green}%` : ''}
              </div>
              <div
                className="bg-red-500/80 flex items-center justify-center text-[10px] text-red-950 font-black"
                style={{ width: `${colorPcts.red}%` }}
              >
                {colorPcts.red > 12 ? `${colorPcts.red}%` : ''}
              </div>
              <div
                className="bg-purple-500/80 flex items-center justify-center text-[10px] text-purple-950 font-black"
                style={{ width: `${colorPcts.violet}%` }}
              >
                {colorPcts.violet > 8 ? `${colorPcts.violet}%` : ''}
              </div>
            </div>
          </div>

          {/* Shannon Entropy Metric */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                SHANNON INFORMATION ENTROPY
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Theoretical Uniform Max: 3.322 bits (True Random Distribution)
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-cyan-400">
                {analysis.statisticalEntropy}
              </div>
              <div className="text-[10px] text-slate-400">bits</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
