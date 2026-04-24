from fastapi import APIRouter, HTTPException
from models.project import ProjectCreate, ProjectUpdate, ProjectOut
from services import project_service
from db import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectOut])
async def list_projects():
    return await project_service.list_projects()


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate):
    return await project_service.create_project(
        body.name, body.icon, body.color, body.description, body.deadline
    )


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str):
    p = await project_service.get_project(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.get("/{project_id}/progress")
async def project_progress(project_id: str):
    db = await get_db()
    total = (await (await db.execute(
        "SELECT COUNT(*) FROM tasks WHERE project_id=?", (project_id,)
    )).fetchone())[0]
    done = (await (await db.execute(
        "SELECT COUNT(*) FROM tasks WHERE project_id=? AND status='done'", (project_id,)
    )).fetchone())[0]
    return {"total": total, "done": done, "percent": round(done / total * 100) if total else 0}


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: str, body: ProjectUpdate):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "No fields to update")
    p = await project_service.update_project(project_id, **fields)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    await project_service.delete_project(project_id)
