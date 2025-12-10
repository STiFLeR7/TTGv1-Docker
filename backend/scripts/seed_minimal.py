# backend/scripts/seed_minimal.py
"""
Safe minimal DB seeder.

This script:
 - creates tables (models.Base.metadata.create_all)
 - inserts one example row for Faculty, Room, Subject, Batch, TimeSlot
 - is defensive: it filters data to only include columns actually present
   on each SQLAlchemy model class to avoid TypeErrors when model definitions
   and seed payloads diverge.
"""

import asyncio
import datetime
import json
import sys
from typing import Dict, Any

from backend.db import engine, AsyncSessionLocal
from backend.models import models_async as models


def _filter_kwargs_for_model(model_cls, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Return a copy of `data` containing only keys that are real column names
    on the SQLAlchemy model class `model_cls`.
    """
    try:
        cols = {c.name for c in model_cls.__table__.columns}
    except Exception:
        # Fallback: if __table__ isn't present, try to be permissive (return data)
        cols = set(data.keys())
    return {k: v for k, v in data.items() if k in cols}


async def seed():
    print("Creating tables (if not present)...")
    async with engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)
    print("Tables ensured.")

    async with AsyncSessionLocal() as session:
        # Prepare raw payloads (these are the 'intent' fields you want seeded)
        faculty_payload = {
            "faculty_name": "Alice",
            "subjects_can_teach": ["CS101"],
            "available_slots": ["slot_1", "slot_2"],
            "preferred_slots": ["slot_1"],
            "max_lectures_per_day": 4,
        }

        room_payload = {
            "room_name": "R1",
            "capacity": 50,
            "room_affinity": [],
        }

        subject_payload = {
            "subject_code": "CS101",
            "subject_name": "Intro to CS",
            "subject_type": "theory",
            "duration": 1,
        }

        # IMPORTANT: include batch_name (DB requires non-null)
        batch_payload = {
            "batch_name": "B1",     # <--- ADDED: prevents NOT NULL violation
            "branch_id": 1,
            "student_count": 40,
        }

        timeslot_payload = {
            "id": "slot_1",
            "day": "Mon",
            "start_time": datetime.time(hour=9, minute=0, second=0),
            "end_time": datetime.time(hour=10, minute=0, second=0),
            "slot_type": "regular",
            "is_mandatory_slot": False,
        }

        # Filter payloads to allowed model columns
        f_kwargs = _filter_kwargs_for_model(models.Faculty, faculty_payload)
        r_kwargs = _filter_kwargs_for_model(models.Room, room_payload)
        s_kwargs = _filter_kwargs_for_model(models.Subject, subject_payload)
        b_kwargs = _filter_kwargs_for_model(models.Batch, batch_payload)
        ts_kwargs = _filter_kwargs_for_model(models.TimeSlot, timeslot_payload)

        # Construct model instances
        try:
            f = models.Faculty(**f_kwargs)
            r = models.Room(**r_kwargs)
            subj = models.Subject(**s_kwargs)
            b = models.Batch(**b_kwargs)
            ts = models.TimeSlot(**ts_kwargs)
        except TypeError as e:
            print("Constructor TypeError:", e)
            print("Filtered kwargs:", json.dumps({
                "faculty": f_kwargs,
                "room": r_kwargs,
                "subject": s_kwargs,
                "batch": b_kwargs,
                "timeslot": ts_kwargs
            }, default=str))
            raise

        # Add and commit in a transaction
        try:
            session.add_all([f, r, subj, b, ts])
            await session.commit()
            print("Seed data inserted successfully.")
        except Exception as e:
            await session.rollback()
            print("ERROR: Failed to insert seed data:", e)
            raise


if __name__ == "__main__":
    try:
        asyncio.run(seed())
    except Exception as e:
        print("Seeding failed:", e)
        sys.exit(1)
