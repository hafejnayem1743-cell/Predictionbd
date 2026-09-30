import React, { useState } from 'react';
import { ShieldCheck, Download, Code, ExternalLink, HelpCircle } from 'lucide-react';

interface FooterProps {
  onOpenEducation: () => void;
  onExportProject: () => void;
  isExporting: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenEducation,
  onExportProject,
  isExporting,
}) => {
  const [activePolicyModal, setActivePolicyModal] = useState<string | null>(null);

  return (
    <footer className="border-t border-slate-800/80 bg-[#070a0e] py-10 mt-12 text-slate-400 font-mono text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm tracking-wider">
              <span className="w-5 h-5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xs">
                W
              </span>
              <span>WINGO SIGNAL ANALYZER</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs max-w-md">
              A high-precision statistical intelligence and real-time round synchronization dashboard for WinGo draws. Engineered with cryptographically authenticated upstream gateway telemetry and transparent probability analysis.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={onExportProject}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:text-white transition-colors text-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Packaging ZIP Archive...' : 'Download Complete Codebase (.ZIP)'}</span>
              </button>
            </div>
          </div>

          {/* Quick Nav & Documentation */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              Documentation
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={onOpenEducation}
                  className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3 text-cyan-400" />
                  <span>Probability Methodology</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('terms')}
                  className="hover:text-slate-200 transition-colors"
                >
                  Terms of Use
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('privacy')}
                  className="hover:text-slate-200 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActivePolicyModal('disclaimer')}
                  className="hover:text-slate-200 transition-colors"
                >
                  Risk Disclaimer
                </button>
              </li>
            </ul>
          </div>

          {/* Technical Specifications */}
          <div className="space-y-2">
            <div className="font-bold text-slate-200 uppercase tracking-wider text-xs">
              System Architecture
            </div>
            <ul className="space-y-1.5 text-slate-500 text-[11px]">
              <li>Core Engine: Python 3 FastAPI + Node TS</li>
              <li>Signature: MD5 Spark Hash Authenticated</li>
              <li>Clock Drift: Sub-second Server NTP Sync</li>
              <li>Database: SQLite with strict uniqueness</li>
              <li>Zero Fake Results Guaranteed</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 WinGo Signal Analyzer. All statistical models strictly educational.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Real-time Upstream Feed Online</span>
          </div>
        </div>

      </div>

      {/* Policy Modals */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#090d13] border border-slate-700 rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-slate-100 uppercase">
                {activePolicyModal === 'privacy' && 'Privacy Policy'}
                {activePolicyModal === 'terms' && 'Terms of Use'}
                {activePolicyModal === 'disclaimer' && 'Educational Disclaimer'}
              </h4>
              <button
                onClick={() => setActivePolicyModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto leading-relaxed">
              {activePolicyModal === 'privacy' && (
                <p>
                  WinGo Signal Analyzer does not collect or sell personal identifiable user data. All telemetry data gathered relates exclusively to API round-trip latencies, server clock drifts, and publicly announced round period outcomes.
                </p>
              )}
              {activePolicyModal === 'terms' && (
                <p>
                  This software is provided for academic, statistical, and educational research into discrete probability distributions and random number generators. Users agree not to utilize this software for automated wagering or unauthorized access.
                </p>
              )}
              {activePolicyModal === 'disclaimer' && (
                <p>
                  No information on this dashboard represents financial, betting, or investment advice. WinGo numbers are generated by pseudo-random or random mechanisms where past outcomes do not alter future probabilities.
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActivePolicyModal(null)}
                className="px-3 py-1 bg-slate-800 text-slate-200 rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
