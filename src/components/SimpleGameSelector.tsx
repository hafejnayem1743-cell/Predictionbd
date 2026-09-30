import React from 'react';
import { GameModeKey } from '../types';

interface Option {
  key: GameModeKey;
  label: string;
}

const OPTIONS: Option[] = [
  { key: 'wingo_30s', label: '30 SEC' },
  { key: 'wingo_1m', label: '1 MIN' },
  { key: 'wingo_3m', label: '3 MIN' },
  { key: 'wingo_5m', label: '5 MIN' },
];

interface SimpleGameSelectorProps {
  currentMode: GameModeKey;
  onSelectMode: (mode: GameModeKey) => void;
}

export const SimpleGameSelector: React.FC<SimpleGameSelectorProps> = ({
  currentMode,
  onSelectMode,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const isActive = currentMode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onSelectMode(opt.key)}
              className={`py-2.5 px-2 rounded-lg font-mono font-bold text-xs sm:text-sm tracking-wide transition-all ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
