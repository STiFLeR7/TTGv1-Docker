# backend/api/routes_db.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from backend.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from backend.models import models_async as models
from backend.api import crud
from pydantic import BaseModel
from fastapi import Path
from backend.models import models_async as models
from backend.db import AsyncSessionLocal
from sqlalchemy import select
router = APIRouter(prefix="/api")

# Pydantic request/response DTOs (minimal — expand as needed)
class FacultyIn(BaseModel):
    faculty_name: str
    subjects_can_teach: List[str] = []
    available_slots: List[str] = []

class RoomIn(BaseModel):
    room_name: str
    capacity: int = 30
    room_affinity: List[str] = []

# CRUD examples
@router.post("/faculty")
async def create_faculty(payload: FacultyIn, db: AsyncSession = Depends(get_db)):
    return await crud.create_obj(db, models.Faculty, payload.dict())

@router.get("/faculty")
async def list_faculty(db: AsyncSession = Depends(get_db)):
    return await crud.list_objs(db, models.Faculty)

@router.post("/rooms")
async def create_room(payload: RoomIn, db: AsyncSession = Depends(get_db)):
    return await crud.create_obj(db, models.Room, payload.dict())

@router.get("/rooms")
async def list_rooms(db: AsyncSession = Depends(get_db)):
    return await crud.list_objs(db, models.Room)

# Async schedule generation: dispatch celery and return task id
from backend.workers.celery_app import generate_timetable_task

@router.post("/generate_async")
async def generate_async(payload: dict, db: AsyncSession = Depends(get_db)):
    """
    payload may include overrides (e.g., fixed_assignments) or let solver read DB.
    We'll read the DB if payload doesn't include explicit lists.
    """
    if not payload.get("faculty"):
        faculty = await crud.list_objs(db, models.Faculty, limit=1000)
        payload["faculty"] = [f.__dict__ for f in faculty]
    if not payload.get("rooms"):
        rooms = await crud.list_objs(db, models.Room, limit=1000)
        payload["rooms"] = [r.__dict__ for r in rooms]

    # add subjects, batches, timeslots similarly if DB tables populated
    task = generate_timetable_task.apply_async(kwargs={"payload": payload}, retry=False)
    return {"status": "queued", "task_id": task.id}

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    from backend.workers.celery_app import celery
    async_result = celery.AsyncResult(task_id)
    res = {
        "id": task_id,
        "state": async_result.state,
        "result": async_result.result if async_result.ready() else None
    }
    return res



@router.get("/schedules/{schedule_id}")
async def get_schedule(
    schedule_id: int,
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(
        select(models.Schedule).where(models.Schedule.id == schedule_id)
    )
    sched = q.scalar_one_or_none()
    if not sched:
        raise HTTPException(status_code=404, detail="schedule not found")

    return {
        "id": sched.id,
        "name": sched.name,
        "payload": sched.payload,
        "result": sched.result,
        "created_at": sched.created_at.isoformat() if sched.created_at else None,
        "meta": sched.meta
    }


@router.get("/schedules")
async def list_schedules(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    q = await db.execute(
        select(models.Schedule)
        .limit(limit)
        .order_by(models.Schedule.created_at.desc())
    )
    rows = q.scalars().all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in rows
    ]
 

