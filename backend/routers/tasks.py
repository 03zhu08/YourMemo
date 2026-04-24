from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from models.task import TaskCreate, TaskUpdate, TaskOut
from services import task_service
from db import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskOut])
async def list_tasks(
    project_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    if start_date or end_date:
        db = await get_db()
        clauses = ["1=1"]
        params: list = []
        if project_id:
            clauses.append("project_id = ?")
            params.append(project_id)
        if start_date:
            clauses.append("due_date >= ?")
            params.append(start_date)
        if end_date:
            clauses.append("due_date <= ?")
            params.append(end_date)
        where = " AND ".join(clauses)
        cursor = await db.execute(f"SELECT * FROM tasks WHERE {where} ORDER BY position", params)
        rows = await cursor.fetchall()
        from services.link_service import get_links_for_task
        results = []
        for r in rows:
            t = dict(r)
            t["links"] = await get_links_for_task(t["id"])
            results.append(t)
        return results
    return await task_service.list_tasks(project_id)


@router.post("/", response_model=TaskOut, status_code=201)
async def create_task(body: TaskCreate):
    return await task_service.create_task(
        body.project_id,
        body.title,
        description=body.description,
        parent_id=body.parent_id,
        priority=body.priority,
        due_date=body.due_date,
        start_date=body.start_date,
        links=body.links,
    )


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: str):
    t = await task_service.get_task(task_id)
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.put("/{task_id}", response_model=TaskOut)
async def update_task(task_id: str, body: TaskUpdate):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "No fields to update")
    t = await task_service.update_task(task_id, **fields)
    if not t:
        raise HTTPException(404, "Task not found")
    return t


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    await task_service.delete_task(task_id)
