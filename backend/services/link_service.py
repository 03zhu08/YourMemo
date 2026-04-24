import uuid
from urllib.parse import urlparse
from typing import List
from db import get_db


def validate_url(url: str) -> bool:
    try:
        r = urlparse(url)
        return r.scheme in ("http", "https") and bool(r.netloc)
    except Exception:
        return False


async def get_links_for_task(task_id: str) -> List[dict]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM task_links WHERE task_id = ? ORDER BY created_at", (task_id,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def replace_links(task_id: str, links: list):
    db = await get_db()
    await db.execute("DELETE FROM task_links WHERE task_id = ?", (task_id,))
    for link in links:
        url = link.url if hasattr(link, "url") else link["url"]
        label = link.label if hasattr(link, "label") else link["label"]
        if not validate_url(url):
            continue
        lid = uuid.uuid4().hex[:16]
        await db.execute(
            "INSERT INTO task_links (id, task_id, label, url) VALUES (?, ?, ?, ?)",
            (lid, task_id, label, url),
        )
    await db.commit()
