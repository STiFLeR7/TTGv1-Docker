"""
backend/solver/db_adapter.py

Synchronous DB helper helpers intended to be used from Celery worker processes.
We create a sync SQLAlchemy engine/session based on the same DATABASE_URL
used by the async layer, but adjusted for a sync dialect (psycopg).
This avoids calling asyncio inside Celery (which causes 'event loop closed' errors).
"""

from typing import Dict, Any, List
import json
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from backend.config.settings import settings
from backend.models import models_async as models
from datetime import time

# Convert asyncpg URL to a sync-compatible URL for SQLAlchemy.
# Common cases:
#  - "postgresql+asyncpg://user:pass@host/db"  -> "postgresql+psycopg://user:pass@host/db"
#  - "postgresql://user:pass@host/db" -> use as-is
def _sync_database_url() -> str:
    url = settings.DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL not set in settings")
    # If project uses asyncpg prefix, switch it to psycopg (sync)
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    # If url already starts with postgresql+psycopg or postgresql://, return as-is
    return url

# create a module-level sync engine and sessionmaker
_SYNC_DB_URL = _sync_database_url()
_sync_engine = create_engine(_SYNC_DB_URL, pool_pre_ping=True)
_SyncSession = sessionmaker(bind=_sync_engine)

# ---------- helpers to convert SQLAlchemy model instances to serializable dicts ----------
def _model_to_dict(obj) -> Dict[str, Any]:
    out = {}
    # SQLAlchemy model has __dict__ but includes _sa_instance_state — skip it.
    for k, v in obj.__dict__.items():
        if k.startswith("_"):
            continue
        # convert datetime/time objects
        if hasattr(v, "isoformat"):
            out[k] = v.isoformat()
        elif isinstance(v, time):
            out[k] = v.strftime("%H:%M:%S")
        else:
            out[k] = v
    return out

def _timeslot_to_dict(ts) -> Dict[str, Any]:
    return {
        "id": ts.id,
        "day": ts.day,
        "start_time": ts.start_time.strftime("%H:%M:%S") if ts.start_time else None,
        "end_time": ts.end_time.strftime("%H:%M:%S") if ts.end_time else None,
        "slot_type": getattr(ts.slot_type, "value", ts.slot_type),
        "is_mandatory_slot": ts.is_mandatory_slot,
    }

# ---------- Public synchronous functions used by Celery tasks ----------
def fetch_payload_from_db_sync() -> Dict[str, Any]:
    """
    Read faculty/rooms/subjects/batches/timeslots from DB using a synchronous session.
    Returns a serializable payload dict.
    """
    with _SyncSession() as session:
        faculty_rows = session.execute(select(models.Faculty)).scalars().all()
        room_rows = session.execute(select(models.Room)).scalars().all()
        subject_rows = session.execute(select(models.Subject)).scalars().all()
        batch_rows = session.execute(select(models.Batch)).scalars().all()
        timeslot_rows = session.execute(select(models.TimeSlot)).scalars().all()

        faculty = [_model_to_dict(f) for f in faculty_rows]
        rooms = [_model_to_dict(r) for r in room_rows]
        subjects = [_model_to_dict(s) for s in subject_rows]
        batches = [_model_to_dict(b) for b in batch_rows]
        timeslots = [_timeslot_to_dict(ts) for ts in timeslot_rows]

        payload = {
            "faculty": faculty,
            "rooms": rooms,
            "subjects": subjects,
            "batches": batches,
            "timeslots": timeslots,
        }
        return payload

def save_schedule_into_db_sync(payload: dict, result: dict, name: str = None, meta: dict = None) -> int:
    """
    Save a schedule row synchronously and return its ID.
    Uses the sync SQLAlchemy engine so it can be called from Celery worker processes safely.
    """
    with _SyncSession() as session:
        try:
            sched = models.Schedule(
                name=name,
                payload=payload or {},
                result=result or {},
                meta=meta or {}
            )
            session.add(sched)
            session.commit()
            session.refresh(sched)
            return int(sched.id)
        except Exception:
            session.rollback()
            raise

# Optional: small helper to close/dispose engine if needed by tests
def dispose_sync_engine():
    try:
        _sync_engine.dispose()
    except Exception:
        pass
