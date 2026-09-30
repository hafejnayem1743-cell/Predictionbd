import React from 'react';
import { GameModeKey, GameModeInfo } from '../types';
import { Clock } from 'lucide-react';

export const GAME_MODES: GameModeInfo[] = [
  { key: 'wingo_30s', name: 'WinGo 30 Seconds', shortName: '30S', intervalSec: 30, typeId: 30 },
  { key: 'wingo_1m', name: 'WinGo 1 Minute', shortName: '1M', intervalSec: 60, typeId: 1 },
  { key: 'wingo_3m', name: 'WinGo 3 Minutes', shortName: '3M', intervalSec: 180, typeId: 2 },
  { key: 'wingo_5m', name: 'WinGo 5 Minutes', shortName: '5M', intervalSec: 300, typeId: 3 },
];

interface ModeSelectorProps {
  currentMode: GameModeKey;
  onSelectMode: (mode: GameModeKey) => void;
  remainingSeconds: number;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  remainingSeconds,
}) => {
  return (
    <div className="w-full bg-[#0d1218]/90 border border-slate-800 p-1.5 rounded-lg shadow-inner">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {GAME_MODES.map((mode) => {
          const isActive = currentMode === mode.key;
          return (
            <button
              key={mode.key}
              onClick={() => onSelectMode(mode.key)}
              className={`relative px-3 py-2.5 rounded-md text-left transition-all font-mono flex items-center justify-between ${
                isActive
                  ? 'bg-slate-900 border border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'bg-slate-950/40 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div>
                <div className="text-xs font-semibold tracking-wide flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  {mode.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Interval: {mode.intervalSec}s (Type {mode.typeId})
                </div>
              </div>

              {isActive && (
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    {Math.floor(remainingSeconds)}s
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
