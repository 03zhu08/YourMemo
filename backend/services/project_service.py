import uuid
from db import get_db


async def list_projects():
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM projects WHERE archived = 0 ORDER BY created_at DESC"
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def get_project(project_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    row = await cursor.fetchone()
    return dict(row) if row else None


async def create_project(name: str, icon: str = "", color: str = "#374151", description: str = "", deadline: str = None):
    db = await get_db()
    pid = uuid.uuid4().hex[:16]
    await db.execute(
        "INSERT INTO projects (id, name, icon, color, description, deadline) VALUES (?, ?, ?, ?, ?, ?)",
        (pid, name, icon, color, description, deadline),
    )
    await db.execute(
        "INSERT INTO project_tree (ancestor, descendant, depth) VALUES (?, ?, 0)",
        (pid, pid),
    )
    await db.commit()
    return await get_project(pid)


async def update_project(project_id: str, **fields):
    db = await get_db()
    sets = ", ".join(f"{k} = ?" for k in fields)
    vals = list(fields.values()) + [project_id]
    await db.execute(f"UPDATE projects SET {sets} WHERE id = ?", vals)
    await db.commit()
    return await get_project(project_id)


async def delete_project(project_id: str):
    db = await get_db()
    await db.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    await db.commit()
