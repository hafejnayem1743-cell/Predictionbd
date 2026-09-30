"""Database models for SQLite / PostgreSQL."""
from datetime import datetime
try:
    from sqlalchemy import Column, Integer, String, DateTime, Float, Index
    from sqlalchemy.orm import declarative_base
    Base = declarative_base()
except ImportError:
    class Base:
        pass
    Column = Integer = String = DateTime = Float = Index = lambda *args, **kwargs: None

class DrawRecord(Base):
    __tablename__ = "draw_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    game_mode = Column(String(32), nullable=False, index=True)
    type_id = Column(Integer, nullable=False)
    issue_number = Column(String(64), nullable=False)
    number = Column(Integer, nullable=False)
    colour = Column(String(64), nullable=False)
    size = Column(String(16), nullable=False)
    premium = Column(String(32), nullable=True)
    draw_time = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_mode_issue", "game_mode", "issue_number", unique=True),
    )

class SyncTelemetry(Base):
    __tablename__ = "sync_telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    endpoint = Column(String(128), nullable=False)
    status_code = Column(Integer, nullable=False)
    latency_ms = Column(Float, nullable=False)
    clock_drift_ms = Column(Integer, default=0)
    is_success = Column(Integer, default=1)
    error_message = Column(String(256), nullable=True)
