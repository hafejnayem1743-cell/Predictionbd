"""Data schemas and transfer models."""
from typing import List, Dict, Optional, Any
from enum import Enum
try:
    from pydantic import BaseModel, Field
except ImportError:
    # Fallback to simple dataclass/object if pydantic not present in runtime
    class BaseModel:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def dict(self):
            return self.__dict__
    Field = lambda default=None, **kwargs: default

class GameMode(str, Enum):
    WINGO_30S = "wingo_30s"
    WINGO_1M = "wingo_1m"
    WINGO_3M = "wingo_3m"
    WINGO_5M = "wingo_5m"

class RoundInfo(BaseModel):
    game_mode: str
    type_id: int
    issue_number: str
    start_time: str
    end_time: str
    server_time: str
    interval_seconds: float
    remaining_seconds: float
    status: str
    data_source: str
    is_live: bool
    last_synced: str

class ResultItem(BaseModel):
    issue_number: str
    number: int
    colour: str
    colors: List[str]
    size: str
    premium: Optional[str] = None
    created_at: Optional[str] = None

class AnalysisSummary(BaseModel):
    game_mode: str
    total_rounds_analyzed: int
    sample_window: str
    number_frequency: Dict[int, int]
    number_percentages: Dict[int, float]
    size_distribution: Dict[str, int]
    size_percentages: Dict[str, float]
    color_distribution: Dict[str, int]
    color_percentages: Dict[str, float]
    hot_numbers: List[int]
    cold_numbers: List[int]
    current_size_streak: Dict[str, Any]
    current_color_streak: Dict[str, Any]
    streak_records: Dict[str, int]
    statistical_entropy: float
    educational_disclaimer: str
    analysis_status: str

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400

class SystemStatus(BaseModel):
    api_connected: bool
    upstream_gateway: str
    last_successful_sync: Optional[str] = None
    clock_drift_ms: int
    active_game_modes: List[str]
    total_stored_draws: int
    mode_counts: Dict[str, int]
