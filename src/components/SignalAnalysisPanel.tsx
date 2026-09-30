import React from 'react';
import { AnalysisData, RoundIssue } from '../types';
import { ShieldAlert, Zap, TrendingUp, BarChart2, Flame, Snowflake, AlertCircle } from 'lucide-react';

interface SignalAnalysisPanelProps {
  analysis: AnalysisData | null;
  issue: RoundIssue | null;
}

export const SignalAnalysisPanel: React.FC<SignalAnalysisPanelProps> = ({ analysis, issue }) => {
  if (!analysis) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/80 p-6 text-center font-mono">
        <div className="text-slate-400 text-sm">Aggregating historical draw vectors...</div>
      </div>
    );
  }

  const isInsufficient = analysis.analysisStatus === 'INSUFFICIENT DATA FOR ANALYSIS';
  const sizeDist = analysis.sizeDistribution || { Big: 0, Small: 0 };
  const sizePcts = analysis.sizePercentages || { Big: 0, Small: 0 };
  const colorDist = analysis.colorDistribution || { green: 0, red: 0, violet: 0 };
  const colorPcts = analysis.colorPercentages || { green: 0, red: 0, violet: 0 };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/90 p-5 md:p-6 space-y-5 shadow-lg">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wide">
              HISTORICAL PATTERN & EDUCATIONAL SIGNAL MATRIX
            </h3>
          </div>
          <div className="text-xs font-mono text-slate-400 mt-0.5">
            Based on {analysis.totalRoundsAnalyzed} verified draws · Shannon Entropy: {analysis.statisticalEntropy} bits
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 text-xs font-mono font-semibold rounded border ${
              isInsufficient
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
            }`}
          >
            {analysis.analysisStatus}
          </span>
        </div>
      </div>

      {/* Grid of Key Observations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Big vs Small Historical Ratio */}
        <div className="rounded-lg bg-slate-900/70 border border-slate-800/80 p-4 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              SIZE DISTRIBUTION (0-4 vs 5-9)
            </span>
            <span className="text-[11px] text-slate-500">Streak: {analysis.currentSizeStreak.count} {analysis.currentSizeStreak.size}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">BIG (5-9)</div>
              <div className="text-xl font-bold text-emerald-400 mt-0.5">
                {sizePcts.Big}%
              </div>
              <div className="text-[10px] text-slate-500">{sizeDist.Big} counts</div>
            </div>
            <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800">
              <div className="text-xs text-slate-400">SMALL (0-4)</div>
              <div className="text-xl font-bold text-cyan-400 mt-0.5">
                {sizePcts.Small}%
              </div>
              <div className="text-[10px] text-slate-500">{sizeDist.Small} counts</div>
            </div>
          </div>

          {/* Ratio bar */}
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${sizePcts.Big}%` }} title={`Big: ${sizePcts.Big}%`} />
            <div className="bg-cyan-500 h-full" style={{ width: `${sizePcts.Small}%` }} title={`Small: ${sizePcts.Small}%`} />
          </div>
        </div>

        {/* 2. Color Frequency Breakdown */}
        <div className="rounded-lg bg-slate-900/70 border border-slate-800/80 p-4 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              COLOR DISTRIBUTION
            </span>
            <span className="text-[11px] text-slate-500">
              Streak: {analysis.currentColorStreak.count} {analysis.currentColorStreak.color}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="p-2 rounded bg-slate-950/60 border border-emerald-950/60">
              <div className="text-[11px] text-emerald-400 font-semibold">GREEN</div>
              <div className="text-lg font-bold text-slate-100">{colorPcts.green}%</div>
              <div className="text-[10px] text-slate-500">{colorDist.green}x</div>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-red-950/60">
              <div className="text-[11px] text-red-400 font-semibold">RED</div>
              <div className="text-lg font-bold text-slate-100">{colorPcts.red}%</div>
              <div className="text-[10px] text-slate-500">{colorDist.red}x</div>
            </div>
            <div className="p-2 rounded bg-slate-950/60 border border-purple-950/60">
              <div className="text-[11px] text-purple-400 font-semibold">VIOLET</div>
              <div className="text-lg font-bold text-slate-100">{colorPcts.violet}%</div>
              <div className="text-[10px] text-slate-500">{colorDist.violet}x</div>
            </div>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex">
            <div className="bg-emerald-500 h-full" style={{ width: `${colorPcts.green}%` }} />
            <div className="bg-red-500 h-full" style={{ width: `${colorPcts.red}%` }} />
            <div className="bg-purple-500 h-full" style={{ width: `${colorPcts.violet}%` }} />
          </div>
        </div>

        {/* 3. Hot & Cold Digits */}
        <div className="rounded-lg bg-slate-900/70 border border-slate-800/80 p-4 space-y-3 font-mono">
          <div className="text-xs text-slate-400 font-semibold text-slate-200">
            FREQUENCY OUTLIERS
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-amber-400">
                <Flame className="w-3.5 h-3.5" />
                <span>HOT NUMBERS:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {analysis.hotNumbers.map((n) => (
                  <span
                    key={n}
                    className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-cyan-400">
                <Snowflake className="w-3.5 h-3.5" />
                <span>COLD NUMBERS:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {analysis.coldNumbers.map((n) => (
                  <span
                    key={n}
                    className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            Max Records: Big {analysis.streakRecords.maxBig}x · Small {analysis.streakRecords.maxSmall}x · Red {analysis.streakRecords.maxRed}x · Green {analysis.streakRecords.maxGreen}x
          </div>
        </div>

      </div>

      {/* Prominent Educational & Risk Disclosure Banner */}
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs font-mono text-amber-200/90 leading-relaxed">
          <strong className="text-amber-300">MATHEMATICAL TRUTH & INDEPENDENCE PRINCIPLE: </strong>
          {analysis.educationalDisclaimer}
        </div>
      </div>

    </div>
  );
};
