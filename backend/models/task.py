from pydantic import BaseModel
from typing import Optional, List


class LinkCreate(BaseModel):
    label: str
    url: str


class LinkOut(BaseModel):
    id: str
    task_id: str
    label: str
    url: str
    created_at: str


class TaskCreate(BaseModel):
    project_id: str
    title: str
    description: str = ""
    parent_id: Optional[str] = None
    priority: str = "low"
    due_date: Optional[str] = None
    links: List[LinkCreate] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None
    links: Optional[List[LinkCreate]] = None


class TaskOut(BaseModel):
    id: str
    project_id: str
    parent_id: Optional[str]
    title: str
    description: str
    status: str
    priority: str
    due_date: Optional[str]
    completed_at: Optional[str]
    position: float
    created_at: str
    updated_at: str
    links: List[LinkOut] = []
