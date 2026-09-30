"""Reliable WinGo synchronization service with real timestamp windows."""
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List
from .wingo_client import wingo_client, MODE_TYPE_MAP
from .analysis_engine import analysis_engine, compute_window_analysis
from .prediction_engine import compute_signal
from ..database.session import get_draw_records


def parse_upstream_time(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        # Upstream time is represented as UTC+6 local time.
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


class SyncService:
    def __init__(self):
        self._cache_issues: Dict[str, Dict[str, Any]] = {}
        self._cache_history: Dict[str, List[Dict[str, Any]]] = {}
        self._cache_analysis: Dict[str, Dict[str, Any]] = {}
        self._cache_signal: Dict[str, Dict[str, Any]] = {}
        self._last_poll_time: Dict[str, float] = {}
        self._lock = threading.Lock()

    def sync_mode(self, game_mode: str, force: bool = False) -> Dict[str, Any]:
        now = time.time()
        with self._lock:
            last = self._last_poll_time.get(game_mode, 0)
            if not force and (now - last) < 2.0 and game_mode in self._cache_issues:
                return self._snapshot(game_mode)

        try:
            issue_data = wingo_client.get_game_issue(game_mode)

            # Fetch enough pages for a real 1000-period window when the source supports it.
            history_data: List[Dict[str, Any]] = []
            for page in range(1, 11):
                batch = wingo_client.get_history(game_mode, page_no=page, page_size=100)
                if not batch:
                    break
                history_data.extend(batch)
                if len(batch) < 100:
                    break

            # Merge persisted records only when upstream returned less than requested.
            if len(history_data) < 1000:
                db_records = get_draw_records(game_mode, limit=1000)
                seen = {h["issue_number"] for h in history_data}
                for r in db_records:
                    if r["issue_number"] not in seen:
                        history_data.append({
                            "issue_number": r["issue_number"],
                            "number": r["number"],
                            "colour": r["colour"],
                            "colors": [c.strip() for c in r["colour"].split(",") if c.strip()],
                            "size": r["size"],
                            "premium": r.get("premium"),
                            "created_at": r.get("created_at"),
                            "result_time": r.get("result_time"),
                        })

            # De-duplicate by period and keep newest-first ordering.
            dedup: Dict[str, Dict[str, Any]] = {}
            for row in history_data:
                dedup[str(row["issue_number"])] = row
            history_data = list(dedup.values())
            history_data.sort(key=lambda x: str(x["issue_number"]), reverse=True)
            history_data = history_data[:1000]

            # 1000P uses completed verified rows; 5H uses actual result timestamps only.
            last1000 = compute_window_analysis(history_data[:1000], "LAST 1000 PERIODS")
            server_time = parse_upstream_time(issue_data.get("server_time"))
            five_hour = []
            if server_time:
                lower = server_time - timedelta(hours=5)
                for row in history_data:
                    rt = parse_upstream_time(row.get("result_time"))
                    if rt and lower <= rt <= server_time:
                        five_hour.append(row)
            last5 = compute_window_analysis(five_hour, "LAST 5 HOURS (timestamp filtered)")

            signal = compute_signal(issue_data["issue_number"], history_data)
            compact = {
                "gameMode": game_mode,
                "last1000": last1000,
                "last5Hours": last5,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
            analysis_data = analysis_engine.analyze_history(game_mode, history_data[:1000])
            analysis_data["last1000"] = last1000
            analysis_data["last5Hours"] = last5
            analysis_data["signalValidation"] = signal.get("validation")

            issue_data["nextSignal"] = signal
            issue_data["compactAnalysis"] = compact

            with self._lock:
                self._cache_issues[game_mode] = issue_data
                self._cache_history[game_mode] = history_data
                self._cache_analysis[game_mode] = analysis_data
                self._cache_signal[game_mode] = signal
                self._last_poll_time[game_mode] = now

            return self._snapshot(game_mode)
        except Exception:
            with self._lock:
                cached = self._cache_issues.get(game_mode)
                if cached:
                    stale = dict(cached)
                    stale["status"] = "CACHED_STALE"
                    stale["is_live"] = False
                    return {
                        "issue": stale,
                        "history": self._cache_history.get(game_mode, []),
                        "analysis": self._cache_analysis.get(game_mode, {}),
                    }
            raise

    def _snapshot(self, game_mode: str) -> Dict[str, Any]:
        return {
            "issue": self._cache_issues.get(game_mode),
            "history": self._cache_history.get(game_mode, []),
            "analysis": self._cache_analysis.get(game_mode, {}),
        }

    def get_cached(self, game_mode: str) -> Dict[str, Any]:
        with self._lock:
            if game_mode in self._cache_issues and (time.time() - self._last_poll_time.get(game_mode, 0)) < 4.0:
                return self._snapshot(game_mode)
        return self.sync_mode(game_mode)


sync_service = SyncService()
