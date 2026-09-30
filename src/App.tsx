import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameModeKey, RoundIssue, DrawRecord, CompactAnalysisData } from './types';
import { SimpleHeader } from './components/SimpleHeader';
import { SimpleGameSelector } from './components/SimpleGameSelector';
import { SimpleTimerPanel } from './components/SimpleTimerPanel';
import { SimplePredictionCard } from './components/SimplePredictionCard';
import { SimpleHistoryTable } from './components/SimpleHistoryTable';
import { CompactAnalysisBox } from './components/CompactAnalysisBox';
import { LoginScreen } from './components/LoginScreen';

interface ModeCacheItem {
  issue: RoundIssue;
  history: DrawRecord[];
  compactAnalysis: CompactAnalysisData | null;
  baseRemaining: number;
  receivedAt: number;
}

export default function App() {
  // Session Authentication State (1-Hour Session)
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return sessionStorage.getItem('wingo_token');
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Core Game State
  const [currentMode, setCurrentMode] = useState<GameModeKey>('wingo_1m');
  const [currentIssue, setCurrentIssue] = useState<RoundIssue | null>(null);
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [compactAnalysis, setCompactAnalysis] = useState<CompactAnalysisData | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Per-mode tracking refs
  const modeCacheRef = useRef<Record<string, ModeCacheItem>>({});
  const timerSnapshotRef = useRef<{ endTimestampMs: number; serverNowTimestampMs: number; receivedAt: number } | null>(null);
  const lastTransitionFetchRef = useRef<number>(0);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Session Verification on load
  const verifySession = useCallback(async (token: string | null) => {
    if (!token) {
      setIsAuthenticated(false);
      setIsCheckingAuth(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        // Start auto-logout timer based on remaining seconds
        if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
        const timeoutMs = (data.remainingSeconds || 3600) * 1000;
        sessionTimerRef.current = setTimeout(() => {
          handleSessionExpired();
        }, timeoutMs);
      } else {
        handleSessionExpired();
      }
    } catch {
      handleSessionExpired();
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  const handleSessionExpired = () => {
    sessionStorage.removeItem('wingo_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
  };

  const handleLoginSuccess = (token: string, expiresIn: number) => {
    sessionStorage.setItem('wingo_token', token);
    setAuthToken(token);
    setIsAuthenticated(true);
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => {
      handleSessionExpired();
    }, expiresIn * 1000);
  };

  useEffect(() => {
    verifySession(authToken);
  }, [authToken, verifySession]);

  // 2. Fetch Mode Data (Protected with Bearer Token)
  const fetchModeData = useCallback(
    async (mode: GameModeKey, isInitial = false) => {
      if (!authToken) return;
      if (isInitial && !modeCacheRef.current[mode]) {
        setIsLoading(true);
      }
      try {
        // Fetch current round issue
        const issueRes = await fetch(`/api/wingo/${mode}/current`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (issueRes.status === 401) {
          handleSessionExpired();
          return;
        }

        if (!issueRes.ok) throw new Error('DATA UNAVAILABLE');
        const issueData: RoundIssue = await issueRes.json();

        // Countdown is anchored to the upstream end timestamp and synchronized server clock.
        // The browser clock is only used to advance elapsed time between verified snapshots.
        const serverNowMs = Number(issueData.serverNowTimestampMs ?? Date.now());
        const endMs = Number(issueData.endTimestampMs ?? (serverNowMs + Math.max(0, issueData.remainingSeconds) * 1000));
        const snapshot = {
          endTimestampMs: endMs,
          serverNowTimestampMs: serverNowMs,
          receivedAt: performance.now(),
        };

        if (mode === currentMode) {
          setCurrentIssue(issueData);
          if (issueData.compactAnalysis) {
            setCompactAnalysis(issueData.compactAnalysis);
          }
          timerSnapshotRef.current = snapshot;
          setRemainingSeconds(Math.max(0, (snapshot.endTimestampMs - snapshot.serverNowTimestampMs) / 1000));
          setIsLive(issueData.isLive ?? true);
        }

        // Fetch History
        let histRecords: DrawRecord[] = [];
        const histRes = await fetch(`/api/wingo/${mode}/history?limit=40`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          histRecords = histData.records || [];
          if (mode === currentMode) {
            setHistory(histRecords);
          }
        }

        // Save to cache
        modeCacheRef.current[mode] = {
          issue: issueData,
          history: histRecords,
          compactAnalysis: issueData.compactAnalysis || null,
          baseRemaining: Math.max(0, (snapshot.endTimestampMs - snapshot.serverNowTimestampMs) / 1000),
          receivedAt: snapshot.receivedAt,
        };

        setErrorMessage(null);
      } catch (err: any) {
        // Keep the last verified period/timer visible during short upstream outages.
        // The backend serves a stale-verified schedule snapshot while it reconnects.
        // Do not flip the visible status to OFFLINE for a transient upstream failure.
        // Keep the last verified snapshot and let the next background poll resync it.
        setErrorMessage(null);
      } finally {
        if (isInitial) setIsLoading(false);
      }
    },
    [currentMode, authToken]
  );

  // 3. Mode Selection Handler
  const handleSelectMode = (mode: GameModeKey) => {
    if (mode === currentMode) return;
    setCurrentMode(mode);

    const cached = modeCacheRef.current[mode];
    if (cached) {
      setCurrentIssue(cached.issue);
      setHistory(cached.history);
      setCompactAnalysis(cached.compactAnalysis);
      const elapsed = (performance.now() - cached.receivedAt) / 1000;
      const cachedServerNow = Number(cached.issue.serverNowTimestampMs ?? Date.now());
      const syncedServerNow = cachedServerNow + elapsed * 1000;
      const endMs = Number(cached.issue.endTimestampMs ?? (syncedServerNow + cached.baseRemaining * 1000));
      const rem = Math.max(0, (endMs - syncedServerNow) / 1000);
      setRemainingSeconds(rem);
      timerSnapshotRef.current = {
        endTimestampMs: endMs,
        serverNowTimestampMs: syncedServerNow,
        receivedAt: performance.now(),
      };
      // Background revalidate
      fetchModeData(mode, false);
    } else {
      setCurrentIssue(null);
      setHistory([]);
      setCompactAnalysis(null);
      timerSnapshotRef.current = null;
      setRemainingSeconds(0);
      fetchModeData(mode, true);
    }
  };

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchModeData(currentMode, true);
    }
  }, [isAuthenticated, authToken, currentMode, fetchModeData]);

  // Periodic verification polling. The visible countdown remains anchored to the last verified upstream timestamp.
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    const interval = setInterval(() => {
      fetchModeData(currentMode, false);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, authToken, currentMode, fetchModeData]);

  // High-frequency monotonic countdown timer (100ms)
  useEffect(() => {
    if (!isAuthenticated) return;
    const timerInterval = setInterval(() => {
      if (timerSnapshotRef.current) {
        const elapsed = (performance.now() - timerSnapshotRef.current.receivedAt) / 1000;
        const syncedServerNow = timerSnapshotRef.current.serverNowTimestampMs + elapsed * 1000;
        const rem = Math.max(0, (timerSnapshotRef.current.endTimestampMs - syncedServerNow) / 1000);
        setRemainingSeconds(rem);

        // At the verified boundary, refresh immediately. Retry quickly if the network is busy.
        if (rem <= 0) {
          const now = Date.now();
          if (now - lastTransitionFetchRef.current > 800) {
            lastTransitionFetchRef.current = now;
            fetchModeData(currentMode, false);
          }
        }
      }
    }, 100);

    return () => clearInterval(timerInterval);
  }, [isAuthenticated, currentMode, fetchModeData]);

  // Handle visibility change (tab active / foreground return)
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchModeData(currentMode, false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, currentMode, fetchModeData]);

  // If checking authentication, show clean minimal loader
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center font-mono text-emerald-400 text-xs">
        INITIALIZING SECURITY GATEWAY...
      </div>
    );
  }

  // If unauthenticated or session expired, show Password Login Screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. Header with Website Name and Bangladesh BDT Time */}
      <SimpleHeader isLive={isLive} serverNowTimestampMs={currentIssue?.serverNowTimestampMs} />

      {/* Main Single Column Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 space-y-4">
        
        {/* 2. Game duration options [ 30 SEC ] [ 1 MIN ] [ 3 MIN ] [ 5 MIN ] */}
        <SimpleGameSelector
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
        />

        {/* 3. Current period number and synchronized countdown timer */}
        <SimpleTimerPanel
          issue={currentIssue}
          remainingSeconds={remainingSeconds}
        />

        {/* 4. Current signal prediction for the current running period */}
        <SimplePredictionCard
          issue={currentIssue}
          remainingSeconds={remainingSeconds}
        />

        {/* 5. Real history table */}
        <SimpleHistoryTable
          records={history}
          isLoading={isLoading}
        />

        {/* 6. Compact Analysis Box (Last 1000 Periods & Last 5 Hours) */}
        <CompactAnalysisBox
          analysis={compactAnalysis}
          isLoading={isLoading}
        />

      </main>

      {/* Minimal Clean Footer with Session Logout */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs font-mono text-slate-500">
        <div className="max-w-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 PREDICTION BD. Real data from HGNICE gateway.</span>
          <button
            onClick={handleSessionExpired}
            className="text-slate-400 hover:text-red-400 transition-colors underline"
          >
            End Session (Lock)
          </button>
        </div>
      </footer>

    </div>
  );
}
