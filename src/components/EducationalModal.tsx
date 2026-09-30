import React from 'react';
import { X, BookOpen, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';

interface EducationalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EducationalModal: React.FC<EducationalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#090d13] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-[#0d131b] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span className="font-bold tracking-wider">MATHEMATICAL METHODOLOGY & ETHICAL DISCLOSURE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          
          <div className="p-3.5 rounded bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
              <AlertTriangle className="w-4 h-4" />
              NON-PREDICTIVE EDUCATIONAL DISCLAIMER
            </div>
            <p>
              This platform provides statistical pattern analysis of verified WinGo game history solely for educational and research purposes. In accordance with probability axioms, lottery and pseudo-random number generator (PRNG) draws operate as independent statistical trials.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1 text-cyan-400">
              1. Mathematical Axiom of Independent Trials
            </h4>
            <p>
              Each WinGo round is calculated independently from preceding rounds:
            </p>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-center font-bold text-slate-100">
              P(Round N = Digit D | Round N-1 = Digit D) = P(Round N = Digit D) = 1/10 = 0.10
            </div>
            <p>
              The appearance of three &quot;Big&quot; numbers in sequence does not increase or decrease the mathematical likelihood of a &quot;Small&quot; outcome in the subsequent round. Assuming otherwise is known mathematically as the <strong>Gambler&apos;s Fallacy</strong> (Monte Carlo fallacy).
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1 text-emerald-400">
              2. Classification Rules (Verified Against Upstream Gateway)
            </h4>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Size Classification:</span>
                <div>Small: Digits 0, 1, 2, 3, 4 (50% theoretical)</div>
                <div>Big: Digits 5, 6, 7, 8, 9 (50% theoretical)</div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1">
                <span className="font-bold text-slate-200">Color Token Rules:</span>
                <div>Green: 1, 3, 7, 9 (Pure Green) + 5 (Dual)</div>
                <div>Red: 2, 4, 6, 8 (Pure Red) + 0 (Dual)</div>
                <div>Violet: 0 (Red+Violet) & 5 (Green+Violet)</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1 text-cyan-400">
              3. Shannon Information Entropy
            </h4>
            <p>
              We measure the randomness of the discrete distribution of digits across 0 through 9 via Shannon Entropy:
            </p>
            <div className="p-2.5 bg-slate-950 rounded border border-slate-800 text-center font-bold text-slate-100">
              H(X) = - &Sigma; P(x) log2 P(x) &le; log2(10) &asymp; 3.322 bits
            </div>
            <p>
              An observed entropy near 3.322 indicates a healthy uniform distribution. Deviations in small sample windows reflect expected empirical variance rather than systematic predictability.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-1 text-emerald-400">
              4. Code of Integrity
            </h4>
            <div className="space-y-1.5 text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero fake prediction badges, guaranteed win signals, or buy/sell calls.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>100% real data fetched and cryptographically signed via upstream API.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Timer synchronization calibrated against server timestamps with sub-second accuracy.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0d131b] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded text-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
};
