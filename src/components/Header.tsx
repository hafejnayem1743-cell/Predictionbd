import React from 'react';
import { Activity, ShieldCheck, Download, Terminal, Wifi, WifiOff, HelpCircle } from 'lucide-react';
import { TelemetryData } from '../types';

interface HeaderProps {
  telemetry: TelemetryData | null;
  onOpenAdmin: () => void;
  onOpenEducation: () => void;
  onExportProject: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  telemetry,
  onOpenAdmin,
  onOpenEducation,
  onExportProject,
  isExporting,
}) => {
  const isConnected = telemetry?.apiConnected ?? false;

  return (
    <header className="border-b border-slate-800/80 bg-[#070a0e]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-mono font-bold text-lg shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base tracking-wider text-slate-100">
                WINGO SIGNAL ANALYZER
              </span>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                v2.4 REALTIME
              </span>
            </div>
            {/* Zero-pill metadata line */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'LIVE HG-NICE GATEWAY' : 'DISCONNECTED'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>Sync Drift: {telemetry ? `${telemetry.serverClockDriftMs}ms` : '--'}</span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="hidden sm:inline">SHA256 Authenticated</span>
            </div>
          </div>
        </div>

        {/* Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Documentation / Disclaimer Guide */}
          <button
            onClick={onOpenEducation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded transition-colors"
            title="Statistical Methodology & Educational Disclosure"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Methodology</span>
          </button>

          {/* Download Project ZIP */}
          <button
            onClick={onExportProject}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-600/40 rounded transition-all shadow-[0_0_10px_rgba(16,185,129,0.15)] disabled:opacity-50"
            title="Download complete FastAPI Python backend, tests & React source code"
          >
            <Download className={`w-3.5 h-3.5 ${isExporting ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isExporting ? 'Packaging...' : 'Export ZIP'}</span>
          </button>

          {/* Admin Terminal Button */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-600/40 rounded transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin Portal</span>
          </button>
        </div>

      </div>
    </header>
  );
};
