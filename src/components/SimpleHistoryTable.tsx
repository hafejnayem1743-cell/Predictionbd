import React, { useState } from 'react';
import { DrawRecord } from '../types';

interface SimpleHistoryTableProps {
  records: DrawRecord[];
  isLoading: boolean;
}

export const SimpleHistoryTable: React.FC<SimpleHistoryTableProps> = ({
  records,
  isLoading,
}) => {
  const [displayCount, setDisplayCount] = useState<number>(10);

  const visibleRecords = records.slice(0, displayCount);
  const hasMore = displayCount < records.length;

  const renderColorIndicator = (colors: string[]) => {
    return (
      <div className="flex items-center gap-1 justify-center">
        {colors.map((c) => {
          let dot = 'bg-emerald-400';
          let textColor = 'text-emerald-400';
          if (c === 'red') {
            dot = 'bg-red-500';
            textColor = 'text-red-400';
          } else if (c === 'violet') {
            dot = 'bg-purple-500';
            textColor = 'text-purple-400';
          }
          return (
            <span key={c} className="flex items-center gap-1 text-xs capitalize font-medium">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className={textColor}>{c}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4 font-mono">
      
      {/* Table Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold text-sm sm:text-base text-slate-100 tracking-wide">
          HISTORY
        </h3>
        <span className="text-xs text-slate-400">
          Showing {visibleRecords.length} of {records.length} draws
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-center text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] sm:text-xs">
              <th className="py-2.5 px-3 text-left">Period Number</th>
              <th className="py-2.5 px-3">Number</th>
              <th className="py-2.5 px-3">Color</th>
              <th className="py-2.5 px-3 text-right">Big/Small</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && records.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-slate-500">
                  Loading verified real history...
                </td>
              </tr>
            ) : visibleRecords.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-slate-500">
                  No historical records available.
                </td>
              </tr>
            ) : (
              visibleRecords.map((r) => {
                const isBig = r.size === 'Big';
                return (
                  <tr key={r.issueNumber} className="hover:bg-slate-900/40 transition-colors">
                    {/* Period Number */}
                    <td className="py-3 px-3 text-left text-slate-300 font-semibold select-all">
                      {r.issueNumber}
                    </td>

                    {/* Number Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm font-bold text-white shadow ${
                          r.number === 0
                            ? 'bg-gradient-to-br from-red-600 to-purple-600'
                            : r.number === 5
                            ? 'bg-gradient-to-br from-emerald-600 to-purple-600'
                            : [1, 3, 7, 9].includes(r.number)
                            ? 'bg-emerald-600'
                            : 'bg-red-600'
                        }`}
                      >
                        {r.number}
                      </span>
                    </td>

                    {/* Color */}
                    <td className="py-3 px-3">
                      {renderColorIndicator(r.colors)}
                    </td>

                    {/* Big / Small */}
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-xs ${
                          isBig
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
                            : 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                        }`}
                      >
                        {r.size}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="pt-2 text-center">
          <button
            onClick={() => setDisplayCount((prev) => Math.min(records.length, prev + 10))}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg text-xs font-semibold transition-colors"
          >
            Load More History (+10)
          </button>
        </div>
      )}

    </div>
  );
};
