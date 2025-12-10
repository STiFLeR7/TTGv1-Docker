# backend/api/resources.py
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.db import get_db
from backend.models import models_async as models

router = APIRouter()

# ---------------------------------------------------------
# Pydantic Schemas (Input Validation)
# ---------------------------------------------------------
class FacultyCreate(BaseModel):
    faculty_name: str
    max_lectures_per_day: int = 4
    subjects_can_teach: List[str] = []
    available_slots: List[str] = []
    preferred_slots: List[str] = []

class RoomCreate(BaseModel):
    room_name: str
    capacity: int = 60
    room_affinity: List[str] = []

class SubjectCreate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: str
    subject_type: str = "Theory"
    duration: int = 1
    color: str = "#6366f1"

# ---------------------------------------------------------
# Faculty CRUD
# ---------------------------------------------------------
@router.post("/faculty")
async def create_faculty(item: FacultyCreate, db: AsyncSession = Depends(get_db)):
    new_faculty = models.Faculty(
        faculty_name=item.faculty_name,
        max_lectures_per_day=item.max_lectures_per_day,
        subjects_can_teach=item.subjects_can_teach,
        available_slots=item.available_slots,
        preferred_slots=item.preferred_slots
    )
    db.add(new_faculty)
    await db.commit()
    await db.refresh(new_faculty)
    return new_faculty.to_dict()

@router.get("/faculty")
async def list_faculty(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Faculty).order_by(models.Faculty.id))
    return [f.to_dict() for f in result.scalars().all()]

@router.delete("/faculty/{faculty_id}")
async def delete_faculty(faculty_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.Faculty).where(models.Faculty.id == faculty_id))
    await db.commit()
    return {"status": "deleted", "id": faculty_id}

@router.put("/faculty/{faculty_id}")
async def update_faculty(faculty_id: int, item: FacultyCreate, db: AsyncSession = Depends(get_db)):
    q = await db.execute(select(models.Faculty).where(models.Faculty.id == faculty_id))
    fac = q.scalar_one_or_none()
    if not fac:
        raise HTTPException(status_code=404, detail="Faculty not found")
    
    fac.faculty_name = item.faculty_name
    fac.max_lectures_per_day = item.max_lectures_per_day
    fac.subjects_can_teach = item.subjects_can_teach
    fac.available_slots = item.available_slots
    fac.preferred_slots = item.preferred_slots
    
    await db.commit()
    return fac.to_dict()

# ---------------------------------------------------------
# Room CRUD
# ---------------------------------------------------------
@router.post("/rooms")
async def create_room(item: RoomCreate, db: AsyncSession = Depends(get_db)):
    new_room = models.Room(
        room_name=item.room_name,
        capacity=item.capacity,
        room_affinity=item.room_affinity
    )
    db.add(new_room)
    await db.commit()
    await db.refresh(new_room)
    return new_room.to_dict()

@router.get("/rooms")
async def list_rooms(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Room).order_by(models.Room.id))
    return [r.to_dict() for r in result.scalars().all()]

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.Room).where(models.Room.id == room_id))
    await db.commit()
    return {"status": "deleted", "id": room_id}

# ---------------------------------------------------------
# Subject CRUD
# ---------------------------------------------------------
@router.post("/subjects")
async def create_subject(item: SubjectCreate, db: AsyncSession = Depends(get_db)):
    new_subj = models.Subject(
        subject_name=item.subject_name,
        subject_code=item.subject_code,
        subject_type=item.subject_type,
        duration=item.duration,
        color=item.color
    )
    db.add(new_subj)
    await db.commit()
    await db.refresh(new_subj)
    return new_subj.to_dict()

@router.get("/subjects")
async def list_subjects(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Subject).order_by(models.Subject.id))
    return [s.to_dict() for s in result.scalars().all()]

@router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: int, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(models.Subject).where(models.Subject.id == subject_id))
    await db.commit()
    return {"status": "deleted", "id": subject_id}
