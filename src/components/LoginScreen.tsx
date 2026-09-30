import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (token: string, expiresIn: number) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Incorrect password. Access denied.');
      }

      // Store in memory & callback
      onLoginSuccess(data.accessToken, data.expiresIn || 3600);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] flex items-center justify-center p-4 selection:bg-emerald-500/30 selection:text-emerald-300">
      <div className="w-full max-w-sm bg-[#0d131f] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 font-mono">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
            PREDICTION BD
          </h2>
          <p className="text-xs text-slate-400">
            Secure Access Gateway · 1-Hour Session
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Enter Access Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs sm:text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{isLoading ? 'Verifying...' : 'Unlock Portal'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Notice */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Server-side cryptographic token validation</span>
          </div>
        </div>

      </div>
    </div>
  );
};
