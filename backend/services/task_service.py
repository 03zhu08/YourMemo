import uuid
from datetime import datetime, timezone
from typing import Optional
from db import get_db
from services.link_service import get_links_for_task, replace_links


async def list_tasks(project_id: Optional[str] = None):
    db = await get_db()
    if project_id:
        cursor = await db.execute(
            "SELECT * FROM tasks WHERE project_id = ? ORDER BY position",
            (project_id,),
        )
    else:
        cursor = await db.execute("SELECT * FROM tasks ORDER BY position")
    rows = await cursor.fetchall()
    results = []
    for r in rows:
        task = dict(r)
        task["links"] = await get_links_for_task(task["id"])
        results.append(task)
    return results


async def get_task(task_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    task = dict(row)
    task["links"] = await get_links_for_task(task_id)
    return task


async def create_task(project_id: str, title: str, **fields):
    db = await get_db()
    tid = uuid.uuid4().hex[:16]
    db_cursor = await db.execute(
        "SELECT COALESCE(MAX(position), 0) + 1 FROM tasks WHERE project_id = ?",
        (project_id,),
    )
    row = await db_cursor.fetchone()
    position = row[0] if row else 1

    await db.execute(
        """INSERT INTO tasks (id, project_id, title, description, parent_id, priority, due_date, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            tid, project_id, title,
            fields.get("description", ""),
            fields.get("parent_id"),
            fields.get("priority", "low"),
            fields.get("due_date"),
            position,
        ),
    )
    await db.commit()

    links = fields.get("links", [])
    if links:
        await replace_links(tid, links)

    return await get_task(tid)


async def update_task(task_id: str, **fields):
    db = await get_db()
    links = fields.pop("links", None)

    if fields:
        if "status" in fields and fields["status"] == "done":
            fields["completed_at"] = datetime.now(timezone.utc).isoformat()
        fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        sets = ", ".join(f"{k} = ?" for k in fields)
        vals = list(fields.values()) + [task_id]
        await db.execute(f"UPDATE tasks SET {sets} WHERE id = ?", vals)
        await db.commit()

    if links is not None:
        await replace_links(task_id, links)

    return await get_task(task_id)


async def delete_task(task_id: str):
    db = await get_db()
    await db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    await db.commit()
