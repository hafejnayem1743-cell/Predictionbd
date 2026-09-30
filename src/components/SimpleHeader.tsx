import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface SimpleHeaderProps {
  isLive: boolean;
  serverNowTimestampMs?: number;
  onOpenAdmin?: () => void;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({ isLive, serverNowTimestampMs, onOpenAdmin }) => {
  const [bdtTime, setBdtTime] = useState<string>('');
  const syncRef = React.useRef<{ serverMs: number; perfMs: number } | null>(null);

  useEffect(() => {
    if (serverNowTimestampMs && Number.isFinite(serverNowTimestampMs)) {
      syncRef.current = { serverMs: serverNowTimestampMs, perfMs: performance.now() };
    }
  }, [serverNowTimestampMs]);

  useEffect(() => {
    const updateTime = () => {
      try {
        const synced = syncRef.current;
        const now = synced ? new Date(synced.serverMs + (performance.now() - synced.perfMs)) : new Date();
        const formatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        setBdtTime(formatter.format(now));
      } catch {
        // Fallback: calculate UTC+6
        const now = new Date();
        const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
        const bdtDate = new Date(utcMs + 6 * 3600000);
        setBdtTime(bdtDate.toTimeString().split(' ')[0]);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-[#090d14] sticky top-0 z-30 shadow-md">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Left Side: Website Name */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            BD
          </div>
          <div className="flex items-baseline gap-1.5">
            <h1 className="font-bold font-mono tracking-tight text-slate-100 text-base sm:text-lg">
              PREDICTION BD
            </h1>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold hidden sm:inline">
              LIVE
            </span>
          </div>
        </div>

        {/* Right Side: Bangladesh BDT Indicator & Time & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* BDT Time Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
            <span className="text-sm select-none" title="Bangladesh Standard Time (UTC+6)">🇧🇩</span>
            <span className="font-semibold text-slate-100">{bdtTime || '--:--:--'}</span>
            <span className="text-[10px] text-slate-500">BDT</span>
          </div>

          {/* Live Status Indicator */}
          <div
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 font-mono text-xs cursor-pointer select-none"
            title="Click to view Admin / System Status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={isLive ? 'text-emerald-400 font-bold text-[11px]' : 'text-red-400 font-bold text-[11px]'}>
              {isLive ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
};
