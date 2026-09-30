import React, { useState } from 'react';
import { X, Lock, Shield, Server, Terminal, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overview, setOverview] = useState<any>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid username or password. Default is admin / admin123');
      }

      const data = await res.json();
      setToken(data.accessToken);

      // Fetch admin overview
      const overviewRes = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      if (overviewRes.ok) {
        const ovData = await overviewRes.json();
        setOverview(ovData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setOverview(null);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#090d13] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden font-mono flex flex-col max-h-[90vh]">
        
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#0d131b] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold tracking-wider">ADMIN SECURE OPERATIONS CONSOLE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!token ? (
            /* Login Screen */
            <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto py-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-100">Root Authentication Required</h4>
                <p className="text-xs text-slate-400">
                  Default credentials configured: <code className="text-cyan-400">admin</code> / <code className="text-cyan-400">admin123</code>
                </p>
              </div>

              {error && (
                <div className="p-3 rounded bg-red-950/50 border border-red-800/80 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded transition-colors mt-2"
                >
                  {isLoading ? 'Verifying Key...' : 'Authenticate Admin Session'}
                </button>
              </div>
            </form>
          ) : (
            /* Authenticated Overview */
            <div className="space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">SESSION ACTIVE: ADMIN USER</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2.5 py-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded"
                >
                  Sign Out
                </button>
              </div>

              {/* Server & DB Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400">Gateway Status:</span>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">ONLINE / 200 OK</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-400">Server Clock Drift:</span>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">
                    {overview?.clockDriftMs ?? 0} ms
                  </div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-400">Persisted Draws:</span>
                  <div className="text-slate-100 font-bold text-sm mt-0.5">
                    {overview?.database?.totalPersistedDraws ?? 0} records
                  </div>
                </div>
              </div>

              {/* Mode Database Counts */}
              <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Database Records by Game Mode:</span>
                  <button
                    onClick={async () => {
                      if (!token) return;
                      try {
                        const res = await fetch('/api/admin/clear-cache', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          alert('Cache successfully cleared and all 4 modes re-synchronized.');
                          const ovRes = await fetch('/api/admin/overview', {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (ovRes.ok) setOverview(await ovRes.json());
                        }
                      } catch (err: any) {
                        alert(`Action failed: ${err.message}`);
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-800/50 rounded transition-colors"
                  >
                    Purge Cache & Re-Sync
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  {Object.entries(overview?.database?.modeDrawCounts || {}).map(([mode, count]) => (
                    <div key={mode} className="p-2 bg-slate-900/60 rounded border border-slate-800/80">
                      <div className="text-slate-400 uppercase text-[10px]">{mode.replace('wingo_', '')}</div>
                      <div className="text-slate-200 font-bold text-xs mt-0.5">{String(count)} draws</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upstream Config */}
              <div className="p-3.5 bg-slate-950 rounded border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200">Upstream Routing Configuration:</div>
                <div className="text-slate-400 space-y-1">
                  <div>Base URL: <code className="text-cyan-400">https://api.hgnicepayapi.com/api/webapi</code></div>
                  <div>Signature Algorithm: <code className="text-emerald-400">MD5 Spark Hex Upper (32-byte)</code></div>
                  <div>Request Origin: <code className="text-slate-300">https://hgnice.org</code></div>
                  <div>Rate Limiter: <code className="text-amber-400">Active (2.0s minimum interval)</code></div>
                </div>
              </div>

              {/* Telemetry Logs Table */}
              <div className="space-y-2">
                <div className="font-bold text-slate-200">Recent Server Telemetry & Handshakes:</div>
                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded bg-slate-950">
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-slate-800 text-slate-500">
                      <tr>
                        <th className="p-2">Timestamp</th>
                        <th className="p-2">Endpoint</th>
                        <th className="p-2">Latency</th>
                        <th className="p-2">State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {overview?.telemetryLogs?.map((log: any) => (
                        <tr key={log.id}>
                          <td className="p-2 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="p-2 text-cyan-400">{log.endpoint}</td>
                          <td className="p-2 text-slate-300">{Math.round(log.latencyMs)} ms</td>
                          <td className="p-2">
                            {log.isSuccess ? (
                              <span className="text-emerald-400 font-semibold">SUCCESS</span>
                            ) : (
                              <span className="text-red-400 font-semibold">FAILED</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#0d131b] border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
          <span>AES-256 HMAC Authentication Protocol</span>
          <span>Access Restricted to Authorized Engineers</span>
        </div>

      </div>
    </div>
  );
};
