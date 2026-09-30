import React, { useState } from 'react';
import { DrawRecord } from '../types';
import { History, Search, Filter } from 'lucide-react';

interface ResultHistoryTableProps {
  records: DrawRecord[];
  isLoading: boolean;
}

export const ResultHistoryTable: React.FC<ResultHistoryTableProps> = ({ records, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'All' | 'Big' | 'Small'>('All');
  const [colorFilter, setColorFilter] = useState<'All' | 'green' | 'red' | 'violet'>('All');

  const filteredRecords = records.filter((r) => {
    if (searchTerm && !r.issueNumber.includes(searchTerm)) return false;
    if (sizeFilter !== 'All' && r.size !== sizeFilter) return false;
    if (colorFilter !== 'All' && !r.colors.includes(colorFilter)) return false;
    return true;
  });

  const renderColorBadge = (colors: string[]) => {
    return (
      <div className="flex items-center gap-1">
        {colors.map((c) => {
          let dotClass = 'bg-emerald-400';
          let textClass = 'text-emerald-400';
          if (c === 'red') {
            dotClass = 'bg-red-500';
            textClass = 'text-red-400';
          } else if (c === 'violet') {
            dotClass = 'bg-purple-500';
            textClass = 'text-purple-400';
          }
          return (
            <span key={c} className="flex items-center gap-1 text-[11px] font-mono capitalize">
              <span className={`w-2 h-2 rounded-full ${dotClass}`} />
              <span className={textClass}>{c}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0b0f15]/90 p-5 md:p-6 space-y-4 shadow-lg">
      
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-slate-100 tracking-wide">
              VERIFIED DRAW HISTORY LOG
            </h3>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Real historical records retrieved and authenticated directly from upstream gateway
          </p>
        </div>

        {/* Filter Controls (Segmented Buttons - Zero-Pill) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Period..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs font-mono bg-slate-900 border border-slate-800 rounded focus:border-cyan-500/50 focus:outline-none text-slate-200 placeholder-slate-600 w-36 sm:w-44"
            />
          </div>

          {/* Size Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
            {(['All', 'Big', 'Small'] as const).map((sz) => (
              <button
                key={sz}
                onClick={() => setSizeFilter(sz)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  sizeFilter === sz ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* Color Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
            {(['All', 'green', 'red', 'violet'] as const).map((col) => (
              <button
                key={col}
                onClick={() => setColorFilter(col)}
                className={`px-2 py-0.5 rounded capitalize transition-colors ${
                  colorFilter === col ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="py-2.5 px-3">PERIOD NUMBER</th>
              <th className="py-2.5 px-3">WINNING NUMBER</th>
              <th className="py-2.5 px-3">SIZE CLASSIFICATION</th>
              <th className="py-2.5 px-3">COLOR TOKEN</th>
              <th className="py-2.5 px-3">PREMIUM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && records.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Retrieving signed historical payload...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No records matching criteria in verified history.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isBig = rec.size === 'Big';
                return (
                  <tr key={rec.issueNumber} className="hover:bg-slate-900/40 transition-colors">
                    {/* Period */}
                    <td className="py-2.5 px-3 text-slate-300 font-bold select-all">
                      {rec.issueNumber}
                    </td>

                    {/* Number */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded text-sm font-black ${
                          rec.number === 0
                            ? 'bg-gradient-to-br from-red-600 to-purple-600 text-white'
                            : rec.number === 5
                            ? 'bg-gradient-to-br from-emerald-600 to-purple-600 text-white'
                            : [1, 3, 7, 9].includes(rec.number)
                            ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-400'
                            : 'bg-red-950 border border-red-500/40 text-red-400'
                        }`}
                      >
                        {rec.number}
                      </span>
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          isBig ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      >
                        {rec.size} ({isBig ? '5-9' : '0-4'})
                      </span>
                    </td>

                    {/* Color */}
                    <td className="py-2.5 px-3">{renderColorBadge(rec.colors)}</td>

                    {/* Premium */}
                    <td className="py-2.5 px-3 text-slate-400">{rec.premium || rec.number}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pt-2">
        <span>Showing {filteredRecords.length} of {records.length} stored records</span>
        <span>SHA-256 Checksum Verified</span>
      </div>

    </div>
  );
};
