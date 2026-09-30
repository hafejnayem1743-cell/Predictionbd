"""Public API routes for WinGo Analysis and Round Synchronization."""
try:
    from fastapi import APIRouter, HTTPException, Query
except ImportError:
    # Minimal router dummy for non-fastapi environments
    class APIRouter:
        def __init__(self, *args, **kwargs):
            self.routes = []
        def get(self, path, **kwargs):
            def decorator(f): return f
            return decorator
        def post(self, path, **kwargs):
            def decorator(f): return f
            return decorator
    HTTPException = Exception
    Query = lambda default=None, **kwargs: default

from ..services.wingo_client import wingo_client, MODE_TYPE_MAP
from ..services.sync_service import sync_service
from ..database.session import get_telemetry_stats
from ..services.prediction_engine import compute_signal

router = APIRouter(prefix="/api/wingo", tags=["WinGo Analysis"])

@router.get("/status")
def get_system_status():
    """Retrieve system health, upstream connection state, and clock telemetry."""
    telemetry = get_telemetry_stats()
    return {
        "api_connected": wingo_client.is_connected,
        "upstream_gateway": wingo_client.base_url,
        "last_sync_time": wingo_client.last_sync_time,
        "clock_drift_ms": wingo_client.clock_drift_ms,
        "supported_modes": list(MODE_TYPE_MAP.keys()),
        "mode_counts": telemetry["mode_counts"],
        "telemetry_summary": telemetry["stats"]
    }

@router.get("/{game_mode}/current")
def get_current_round(game_mode: str):
    """Retrieve verified current round number, timer, and end time."""
    if game_mode not in MODE_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid game mode: {game_mode}")
    try:
        data = sync_service.get_cached(game_mode)
        return data["issue"]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch live round: {str(e)}")

@router.get("/{game_mode}/history")
def get_round_history(game_mode: str, limit: int = Query(100, ge=1, le=1000)):
    """Retrieve verified draw history."""
    if game_mode not in MODE_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid game mode: {game_mode}")
    try:
        data = sync_service.get_cached(game_mode)
        history = data.get("history", [])
        return {
            "game_mode": game_mode,
            "total_items": len(history),
            "records": history[:limit]
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch history: {str(e)}")

@router.get("/{game_mode}/analysis")
def get_round_analysis(game_mode: str):
    """Retrieve mathematical analysis, frequency, streaks, and educational notes."""
    if game_mode not in MODE_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid game mode: {game_mode}")
    try:
        data = sync_service.get_cached(game_mode)
        return data.get("analysis", {})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Analysis calculation error: {str(e)}")

@router.get("/{game_mode}/signal")
def get_signal(game_mode: str):
    """Return the Python statistical signal plus walk-forward validation metrics."""
    if game_mode not in MODE_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid game mode: {game_mode}")
    try:
        data = sync_service.get_cached(game_mode)
        issue = data["issue"]
        return issue.get("nextSignal") or compute_signal(issue["issue_number"], data.get("history", []))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Signal calculation error: {str(e)}")

@router.post("/{game_mode}/sync")
def force_sync(game_mode: str):
    """Force an immediate re-synchronization with upstream API."""
    if game_mode not in MODE_TYPE_MAP:
        raise HTTPException(status_code=400, detail=f"Invalid game mode: {game_mode}")
    try:
        data = sync_service.sync_mode(game_mode, force=True)
        return {"status": "SUCCESS", "issue": data["issue"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Sync failed: {str(e)}")
