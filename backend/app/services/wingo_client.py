"""WinGo upstream API client communicating with the configured upstream gateway (not independently verified)."""
import urllib.request
import json
import time
import hashlib
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta
from ..config.settings import settings
from ..database.session import save_draw_record, log_telemetry

MODE_TYPE_MAP = {
    "wingo_30s": {"type_id": 30, "interval_sec": 30, "label": "WinGo 30S"},
    "wingo_1m": {"type_id": 1, "interval_sec": 60, "label": "WinGo 1M"},
    "wingo_3m": {"type_id": 2, "interval_sec": 180, "label": "WinGo 3M"},
    "wingo_5m": {"type_id": 3, "interval_sec": 300, "label": "WinGo 5M"},
}

def generate_signature_payload(params: Dict[str, Any]) -> Dict[str, Any]:
    """Generate authenticated and signed request body required by HG-Nice gateway."""
    data = dict(params)
    data["language"] = 0  # Default English
    data["random"] = uuid.uuid4().hex
    
    # Filter and sort keys according to upstream contract
    n = {}
    for k in sorted(data.keys()):
        val = data[k]
        if val is not None and val != "" and k not in ["signature", "track", "xosoBettingData"]:
            n[k] = 0 if val == 0 else val
            
    json_str = json.dumps(n, separators=(',', ':'))
    data["signature"] = hashlib.md5(json_str.encode('utf-8')).hexdigest().upper()
    data["timestamp"] = int(time.time())
    return data

class WinGoClient:
    def __init__(self):
        self.base_url = settings.UPSTREAM_API_BASE
        self.base_urls = list(dict.fromkeys([self.base_url, *[v.strip() for v in settings.UPSTREAM_API_BASES.split(",") if v.strip()]]))
        self.active_base_url = self.base_url
        self.origin = settings.UPSTREAM_ORIGIN
        self.clock_drift_ms = 0
        self.last_sync_time: Optional[float] = None
        self.is_connected = False

    def _post(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send authenticated POST request to upstream API."""
        signed_payload = generate_signature_payload(payload)
        data_bytes = json.dumps(signed_payload, separators=(',', ':')).encode('utf-8')
        last_error = None
        for base in self.base_urls:
            for attempt in range(settings.UPSTREAM_RETRIES + 1):
                url = f"{base}{endpoint}"
                req = urllib.request.Request(url, data=data_bytes, headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Content-Type": "application/json;charset=UTF-8",
                    "Accept": "application/json, text/plain, */*",
                    "Origin": self.origin, "Referer": f"{self.origin}/", "Ar-Origin": self.origin
                })
                start_time = time.time()
                try:
                    with urllib.request.urlopen(req, timeout=settings.REQUEST_TIMEOUT) as response:
                        latency_ms = (time.time() - start_time) * 1000.0
                        result = json.loads(response.read().decode('utf-8'))
                        if "serviceNowTime" in result:
                            try:
                                server_local = datetime.strptime(result["serviceNowTime"], "%Y-%m-%d %H:%M:%S")
                                server_utc = server_local - timedelta(hours=6)
                                local_utc = datetime.utcnow()
                                self.clock_drift_ms = int((server_utc - local_utc).total_seconds() * 1000)
                            except Exception:
                                pass
                        self.active_base_url = base
                        self.is_connected = True
                        self.last_sync_time = time.time()
                        log_telemetry(endpoint, latency_ms, True, self.clock_drift_ms)
                        return result
                except Exception as e:
                    last_error = e
                    self.is_connected = False
                    log_telemetry(endpoint, (time.time() - start_time) * 1000.0, False, self.clock_drift_ms, f"{base}: {e}")
                    if attempt < settings.UPSTREAM_RETRIES:
                        time.sleep(0.25 * (attempt + 1))
        raise RuntimeError(f"All configured upstream gateways failed on {endpoint}: {last_error}")

    def get_game_issue(self, game_mode: str) -> Dict[str, Any]:
        """Fetch current round period, end time, and countdown from real upstream server."""
        if game_mode not in MODE_TYPE_MAP:
            raise ValueError(f"Unknown game mode: {game_mode}")
            
        cfg = MODE_TYPE_MAP[game_mode]
        resp = self._post("/GetGameIssue", {"typeId": cfg["type_id"]})
        
        if resp.get("code") != 0 or not resp.get("data"):
            raise RuntimeError(f"GetGameIssue failed with code {resp.get('code')}: {resp.get('msg')}")
            
        data = resp["data"]
        # Upstream returns: issueNumber, startTime, endTime, serviceTime, intervalM
        end_time_str = data.get("endTime")
        service_time_str = data.get("serviceTime") or resp.get("serviceNowTime")
        
        remaining_seconds = 0.0
        try:
            end_dt = datetime.strptime(end_time_str, "%Y-%m-%d %H:%M:%S")
            srv_dt = datetime.strptime(service_time_str, "%Y-%m-%d %H:%M:%S")
            remaining_seconds = max(0.0, (end_dt - srv_dt).total_seconds())
        except Exception:
            remaining_seconds = cfg["interval_sec"]

        return {
            "game_mode": game_mode,
            "type_id": cfg["type_id"],
            "issue_number": data.get("issueNumber"),
            "start_time": data.get("startTime"),
            "end_time": end_time_str,
            "server_time": service_time_str,
            "interval_seconds": cfg["interval_sec"],
            "remaining_seconds": remaining_seconds,
            "status": "LIVE_SOURCE",
            "data_source": f"Configured upstream gateway: {self.active_base_url}",
            "is_live": True,
            "last_synced": datetime.utcnow().isoformat()
        }

    def get_history(self, game_mode: str, page_no: int = 1, page_size: int = 100) -> List[Dict[str, Any]]:
        """Fetch verified draw history from upstream server and persist to SQLite."""
        if game_mode not in MODE_TYPE_MAP:
            raise ValueError(f"Unknown game mode: {game_mode}")
            
        cfg = MODE_TYPE_MAP[game_mode]
        resp = self._post("/GetNoaverageEmerdList", {
            "typeId": cfg["type_id"],
            "pageNo": page_no,
            "pageSize": page_size
        })
        
        if resp.get("code") != 0 or not resp.get("data"):
            raise RuntimeError(f"GetNoaverageEmerdList failed: {resp.get('msg')}")
            
        raw_list = resp["data"].get("list", [])
        formatted_results = []
        
        for item in raw_list:
            issue_num = item.get("issueNumber")
            num_val = int(item.get("number", 0))
            colour_str = item.get("colour", "")
            colors = [c.strip() for c in colour_str.split(",") if c.strip()]
            
            # Big / Small classification: 0-4 Small, 5-9 Big
            size = "Big" if num_val > 4 else "Small"
            premium = item.get("premium", str(num_val))
            result_time = item.get("resultTime") or item.get("createTime") or item.get("openTime") or item.get("endTime") or item.get("time") or item.get("dateTime") or item.get("drawTime")
            
            # Save to persistent storage, including the source result timestamp.
            save_draw_record(
                game_mode=game_mode,
                type_id=cfg["type_id"],
                issue_number=issue_num,
                number=num_val,
                colour=colour_str,
                size=size,
                premium=premium,
                result_time=result_time
            )
            
            formatted_results.append({
                "issue_number": issue_num,
                "number": num_val,
                "colour": colour_str,
                "colors": colors,
                "size": size,
                "premium": premium,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "result_time": result_time
            })
            
        return formatted_results

wingo_client = WinGoClient()
