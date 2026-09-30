"""Database session and SQLite management."""
import sqlite3
import os
from datetime import datetime
from ..config.settings import settings

DB_FILE = "wingo_data.db"

def get_connection():
    """Get a raw SQLite connection with row factory."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables with constraints."""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table for verified draw records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS draw_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_mode TEXT NOT NULL,
        type_id INTEGER NOT NULL,
        issue_number TEXT NOT NULL,
        number INTEGER NOT NULL,
        colour TEXT NOT NULL,
        size TEXT NOT NULL,
        premium TEXT,
        created_at TEXT NOT NULL,
        result_time TEXT,
        UNIQUE(game_mode, issue_number)
    );
    """)
    
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_draw_mode ON draw_records (game_mode);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_draw_issue ON draw_records (issue_number);")
    try:
        cursor.execute("ALTER TABLE draw_records ADD COLUMN result_time TEXT")
    except sqlite3.OperationalError:
        pass
    
    # Table for telemetry & logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        latency_ms REAL NOT NULL,
        clock_drift_ms INTEGER DEFAULT 0,
        is_success INTEGER NOT NULL,
        error_message TEXT
    );
    """)
    
    conn.commit()
    conn.close()

def save_draw_record(game_mode: str, type_id: int, issue_number: str, number: int, colour: str, size: str, premium: str = None, result_time: str = None) -> bool:
    """Insert or ignore draw record."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT OR IGNORE INTO draw_records 
            (game_mode, type_id, issue_number, number, colour, size, premium, created_at, result_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (game_mode, type_id, issue_number, number, colour, size, premium, now_str, result_time))
        conn.commit()
        inserted = cursor.rowcount > 0
        conn.close()
        return inserted
    except Exception as e:
        print(f"Error saving draw record: {e}")
        return False

def get_draw_records(game_mode: str, limit: int = 50, offset: int = 0):
    """Retrieve verified draw records."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT issue_number, number, colour, size, premium, created_at, result_time
        FROM draw_records
        WHERE game_mode = ?
        ORDER BY issue_number DESC
        LIMIT ? OFFSET ?
    """, (game_mode, limit, offset))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def log_telemetry(endpoint: str, latency_ms: float, is_success: bool, clock_drift_ms: int = 0, error: str = None):
    """Log telemetry event."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO sync_telemetry (timestamp, endpoint, latency_ms, clock_drift_ms, is_success, error_message)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (now_str, endpoint, latency_ms, clock_drift_ms, 1 if is_success else 0, error))
        conn.commit()
        conn.close()
    except Exception:
        pass

def get_telemetry_stats():
    """Get aggregated telemetry stats."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total, AVG(latency_ms) as avg_latency, SUM(is_success) as successes FROM sync_telemetry;")
    stats = dict(cursor.fetchone() or {})
    
    cursor.execute("SELECT game_mode, COUNT(*) as count FROM draw_records GROUP BY game_mode;")
    mode_counts = {r['game_mode']: r['count'] for r in cursor.fetchall()}
    
    cursor.execute("SELECT * FROM sync_telemetry ORDER BY id DESC LIMIT 10;")
    recent_logs = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    return {
        "stats": stats,
        "mode_counts": mode_counts,
        "recent_logs": recent_logs
    }
