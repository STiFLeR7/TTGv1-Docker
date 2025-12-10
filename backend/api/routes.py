# backend/api/routes.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.workers.celery_app import generate_timetable_task, celery
from backend.db import AsyncSessionLocal, get_db  # get_db should yield AsyncSession
from backend.models import models_async as models

router = APIRouter()


# -----------------------
# Lightweight in-memory CRUD (optional bootstrap)
# -----------------------
# If you already have other route files for faculty/rooms/etc keep them.
# These are intentionally minimal and safe for early bootstrapping.
IN_MEM = {
    "faculty": [],
    "rooms": [],
    "subjects": [],
    "batches": [],
    "timeslots": [],
}


# -----------------------
# Synchronous (blocking) local solver endpoint (bootstrap)
# -----------------------
from backend.solver.constraint_builder import generate_schedule_from_inputs


@router.post("/generate")
async def generate_timetable(background_tasks: BackgroundTasks, payload: dict = {}):
    """
    Synchronous generator (used for quick debug). Uses in-memory stores if present.
    """
    try:
        result = generate_schedule_from_inputs(
            faculty_list=IN_MEM["faculty"],
            room_list=IN_MEM["rooms"],
            subject_list=IN_MEM["subjects"],
            batch_list=IN_MEM["batches"],
            timeslot_list=IN_MEM["timeslots"],
            payload_overrides=payload,
        )
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------
# Async: queue Celery job + return task id
# -----------------------
@router.post("/generate_async")
async def generate_async(payload: dict = {}):
    """
    Queue a Celery task to run the solver asynchronously.
    Returns: {"status":"queued", "task_id": "..."}
    """
    try:
        task = generate_timetable_task.apply_async(kwargs={"payload": payload})
        return {"status": "queued", "task_id": task.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"queue_failed: {e}")


# -----------------------
# Task status endpoint (Celery AsyncResult wrapper)
# -----------------------
from celery.result import AsyncResult


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Return basic Celery task information in JSON.
    - state: PENDING, STARTED, SUCCESS, FAILURE, etc.
    - result: the returned value (if available)
    """
    res = AsyncResult(task_id, app=celery)

    # If Celery doesn't know about the task, present PENDING (instead of 404)
    if res.state == "PENDING" and (res.result is None):
        return {"task_id": task_id, "state": "PENDING", "result": None}

    if res.state == "FAILURE":
        # result may be an exception instance
        return {"task_id": task_id, "state": "FAILURE", "result": str(res.result)}

    return {"task_id": task_id, "state": res.state, "result": res.result}


# -----------------------
# Schedules endpoints (DB-backed)
# -----------------------
# GET /api/schedules -> list schedules
# GET /api/schedules/{schedule_id} -> single schedule

@router.get("/schedules")
async def list_schedules(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """
    List recent schedules (returns id, name, created_at)
    """
    q = await db.execute(select(models.Schedule).order_by(models.Schedule.created_at.desc()).limit(limit))
    rows = q.scalars().all()
    out = []
    for s in rows:
        out.append({
            "id": int(s.id),
            "name": s.name,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })
    return out


@router.get("/schedules/{schedule_id}")
async def get_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    """
    Return full schedule JSON-friendly dict for schedule_id.
    """
    q = await db.execute(select(models.Schedule).where(models.Schedule.id == schedule_id))
    sched = q.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="schedule not found")

    # Ensure JSON-serializable fields
    return {
        "id": int(sched.id),
        "name": sched.name,
        "payload": sched.payload if sched.payload is not None else {},
        "result": sched.result if sched.result is not None else {},
        "created_at": sched.created_at.isoformat() if sched.created_at else None,
        "meta": sched.meta if sched.meta is not None else {}
    }


# -----------------------
# Dashboard Endpoints
# -----------------------

@router.post("/save_schedule")
async def save_schedule(data: dict, db: AsyncSession = Depends(get_db)):
    """
    Save the current manual schedule state.
    Payload expected: { "globalSchedule": [...], "sections": [...], "times": [...] } inside `result`.
    """
    # Create new Schedule entry
    new_schedule = models.Schedule(
        name="Manual Save",
        # Store the frontend state in 'result' (as it effectively represents the 'output' schedule)
        result=data,
        payload={}, # Empty 'input' payload for manual saves
        meta=data.get("meta", {})
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)
    return {"status": "ok", "id": new_schedule.id}


@router.get("/load_schedule")
async def load_last_schedule(db: AsyncSession = Depends(get_db)):
    """
    Load the most recently saved schedule.
    """
    # Fetch latest by ID or Created At
    q = await db.execute(select(models.Schedule).order_by(models.Schedule.id.desc()).limit(1))
    sched = q.scalar_one_or_none()
    
    if not sched:
        return {"found": False}

    return {
        "found": True,
        "id": sched.id,
        "data": sched.result, # This contains globalSchedule, sections, etc.
        "meta": sched.meta
    }

@router.get("/dashboard/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """
    Return counts for the dashboard bento grid.
    """
    # Count Faculty
    res_faculty = await db.execute(select(func.count(models.Faculty.id)))
    faculty_count = res_faculty.scalar() or 0

    # Count Rooms
    res_rooms = await db.execute(select(func.count(models.Room.id)))
    room_count = res_rooms.scalar() or 0

    # Count Generated Schedules
    res_schedules = await db.execute(select(func.count(models.Schedule.id)))
    generated_count = res_schedules.scalar() or 0

    # For "Active Sections", we can count distinct batches
    res_batches = await db.execute(select(func.count(models.Batch.id)))
    section_count = res_batches.scalar() or 0

    return {
        "faculty": faculty_count,
        "rooms": room_count,
        "generated": generated_count,
        "sections": section_count,
        "conflicts": 0  # Placeholder for deeper logic
    }


@router.get("/dashboard/timeline")
async def get_dashboard_timeline(db: AsyncSession = Depends(get_db)):
    """
    Return the latest schedule for the timeline preview.
    """
    # Get latest schedule
    q = await db.execute(select(models.Schedule).order_by(models.Schedule.created_at.desc()).limit(1))
    latest_schedule = q.scalar_one_or_none()

    if not latest_schedule or not latest_schedule.result:
        return {"assignments": []}

    # Extract assignments from the solver result
    # Assuming result structure: { "assignments": [ ... ] }
    result_data = latest_schedule.result
    assignments = result_data.get("assignments", [])

    return {"assignments": assignments}
