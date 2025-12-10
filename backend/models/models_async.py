# backend/models/models_async.py
"""
Async SQLAlchemy models used by FastAPI (async engine) and also compatible
with the synchronous adapter used by Celery (SQLAlchemy ORM models work for both).
This file declares all domain models including the Schedule model.

Updated to be consistent with the seed script and the actual DB schema:
 - Batch includes a non-null `batch_name`
 - Subject includes `subject_code`, `subject_name`, `subject_type`, `duration`
 - Faculty has JSONB columns for lists (subjects_can_teach, available_slots, preferred_slots)
 - Room has room_affinity JSONB
 - TimeSlot uses sqlalchemy.Time for start_time/end_time to match stored 'HH:MM:SS' values
 - Schedule remains JSONB-backed
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    Text,
    Enum,
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True)
    faculty_name = Column(String, nullable=False)
    max_lectures_per_day = Column(Integer, nullable=True)

    # flexible list fields stored as JSONB (arrays)
    subjects_can_teach = Column(JSONB, nullable=True, server_default="[]")
    available_slots = Column(JSONB, nullable=True, server_default="[]")
    preferred_slots = Column(JSONB, nullable=True, server_default="[]")

    def to_dict(self):
        return {
            "id": int(self.id) if self.id is not None else None,
            "faculty_name": self.faculty_name,
            "max_lectures_per_day": self.max_lectures_per_day,
            "subjects_can_teach": self.subjects_can_teach or [],
            "available_slots": self.available_slots or [],
            "preferred_slots": self.preferred_slots or [],
        }


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)
    room_name = Column(String, nullable=False)
    capacity = Column(Integer, nullable=True)
    # e.g. ["lab", "projector"] or affinity info - flexible JSONB
    room_affinity = Column(JSONB, nullable=True, server_default="[]")

    def to_dict(self):
        return {
            "id": int(self.id) if self.id is not None else None,
            "room_name": self.room_name,
            "capacity": self.capacity,
            "room_affinity": self.room_affinity or [],
        }


class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True)
    subject_code = Column(String, nullable=True)
    subject_name = Column(String, nullable=False)
    subject_type = Column(String, nullable=True)  # e.g. "theory" | "lab"
    duration = Column(Integer, nullable=True)  # number of timeslots per lecture (1,2,...)
    color = Column(String, nullable=True, default="#6366f1")  # Visual color

    def to_dict(self):
        return {
            "id": int(self.id) if self.id is not None else None,
            "subject_code": self.subject_code,
            "subject_name": self.subject_name,
            "subject_type": self.subject_type,
            "duration": self.duration,
            "color": self.color,
        }


class Batch(Base):
    __tablename__ = "batches"
    id = Column(Integer, primary_key=True)
    # this column is required by your DB (not null); keep it non-nullable to match schema
    batch_name = Column(String, nullable=False)
    branch_id = Column(Integer, nullable=True)
    student_count = Column(Integer, nullable=True)

    def to_dict(self):
        return {
            "id": int(self.id) if self.id is not None else None,
            "batch_name": self.batch_name,
            "branch_id": self.branch_id,
            "student_count": self.student_count,
        }


class TimeSlot(Base):
    __tablename__ = "timeslots"
    # you used string ids earlier like "slot_1"
    id = Column(String, primary_key=True)
    day = Column(String, nullable=False)
    # Use Time (HH:MM:SS) to match DB rows seen in your logs.
    start_time = Column(Time(timezone=False), nullable=True)
    end_time = Column(Time(timezone=False), nullable=True)
    slot_type = Column(String, nullable=True)
    is_mandatory_slot = Column(Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "day": self.day,
            "start_time": self.start_time.strftime("%H:%M:%S") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M:%S") if self.end_time else None,
            "slot_type": self.slot_type,
            "is_mandatory_slot": self.is_mandatory_slot,
        }


class Schedule(Base):
    """
    Persisted schedule: stores the input payload and final solver result.
    Stored as JSONB for fast PostgreSQL queries and flexibility.
    """
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True, doc="Optional friendly name for the schedule")
    payload = Column(JSONB, nullable=False, server_default="{}")
    result = Column(JSONB, nullable=False, server_default="{}")
    meta = Column(JSONB, nullable=True, server_default="{}")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def to_dict(self):
        return {
            "id": int(self.id),
            "name": self.name,
            "payload": self.payload or {},
            "result": self.result or {},
            "meta": self.meta or {},
            "created_at": self.created_at.isoformat() if self.created_at is not None else None,
        }
