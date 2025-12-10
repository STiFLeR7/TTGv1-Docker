# backend/api/crud.py
from typing import Type, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import DeclarativeMeta

async def create_obj(session: AsyncSession, model: Type[DeclarativeMeta], payload: dict):
    obj = model(**payload)
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj

async def list_objs(session: AsyncSession, model: Type[DeclarativeMeta], limit: int = 100):
    q = select(model).limit(limit)
    res = await session.execute(q)
    return res.scalars().all()

async def get_obj(session: AsyncSession, model: Type[DeclarativeMeta], obj_id: int):
    q = select(model).where(model.id == obj_id)
    res = await session.execute(q)
    return res.scalar_one_or_none()

async def update_obj(session: AsyncSession, model: Type[DeclarativeMeta], obj_id: int, payload: dict):
    await session.execute(update(model).where(model.id == obj_id).values(**payload))
    await session.commit()
    return await get_obj(session, model, obj_id)

async def delete_obj(session: AsyncSession, model: Type[DeclarativeMeta], obj_id: int):
    await session.execute(delete(model).where(model.id == obj_id))
    await session.commit()
    return {"deleted_id": obj_id}
