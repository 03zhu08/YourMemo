from pydantic import BaseModel
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    icon: str = ""
    color: str = "#374151"
    description: str = ""
    deadline: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    archived: Optional[bool] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    icon: str
    color: str
    description: str
    deadline: Optional[str]
    created_at: str
    archived: bool
