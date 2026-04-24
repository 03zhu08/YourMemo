from typing import Optional
import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "yourmemo.db")

_connection: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    global _connection
    if _connection is None:
        _connection = await aiosqlite.connect(DB_PATH)
        _connection.row_factory = aiosqlite.Row
        await _connection.execute("PRAGMA journal_mode=WAL")
        await _connection.execute("PRAGMA foreign_keys=ON")
    return _connection


async def init_db():
    db = await get_db()
    await db.executescript(SCHEMA)
    await db.commit()
    await run_migrations()


async def run_migrations():
    db = await get_db()

    # Migration 1: Add description/deadline to projects
    cursor = await db.execute("PRAGMA table_info(projects)")
    cols = {row[1] for row in await cursor.fetchall()}
    if "description" not in cols:
        await db.execute("ALTER TABLE projects ADD COLUMN description TEXT DEFAULT ''")
        await db.execute("ALTER TABLE projects ADD COLUMN deadline TEXT")
        await db.commit()

    # Migration 2: Convert tasks.priority from INTEGER to TEXT
    cursor = await db.execute("SELECT COUNT(*) FROM tasks")
    count = (await cursor.fetchone())[0]
    if count > 0:
        cursor = await db.execute("SELECT typeof(priority) FROM tasks LIMIT 1")
        ptype = (await cursor.fetchone())[0]
        if ptype == "integer":
            await db.executescript("""
                CREATE TABLE tasks_new (
                    id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    status TEXT DEFAULT 'todo' CHECK(status IN ('backlog','todo','in_progress','done','cancelled')),
                    priority TEXT DEFAULT 'low' CHECK(priority IN ('low','medium','high','urgent')),
                    due_date TEXT,
                    completed_at TEXT,
                    position REAL NOT NULL DEFAULT 0,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                );
                INSERT INTO tasks_new (id, project_id, parent_id, title, description, status, priority, due_date, completed_at, position, created_at, updated_at)
                    SELECT id, project_id, parent_id, title, description, status,
                        CASE priority WHEN 0 THEN 'low' WHEN 1 THEN 'medium' WHEN 2 THEN 'high' WHEN 3 THEN 'urgent' ELSE 'low' END,
                        due_date, completed_at, position, created_at, updated_at
                    FROM tasks;
                DROP TABLE tasks;
                ALTER TABLE tasks_new RENAME TO tasks;
                CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status != 'done';
            """)
            await db.commit()

    # Migration 3: Add start_date to tasks
    cursor = await db.execute("PRAGMA table_info(tasks)")
    task_cols = {row[1] for row in await cursor.fetchall()}
    if "start_date" not in task_cols:
        await db.execute("ALTER TABLE tasks ADD COLUMN start_date TEXT")
        await db.commit()


async def close_db():
    global _connection
    if _connection:
        await _connection.close()
        _connection = None


SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '',
    color TEXT DEFAULT '#374151',
    description TEXT DEFAULT '',
    deadline TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    archived INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_tree (
    ancestor TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    descendant TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor, descendant)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'todo' CHECK(status IN ('backlog','todo','in_progress','done','cancelled')),
    priority TEXT DEFAULT 'low' CHECK(priority IN ('low','medium','high','urgent')),
    due_date TEXT,
    start_date TEXT,
    completed_at TEXT,
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_deps (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on)
);

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6b7280'
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date) WHERE status != 'done';
CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(timestamp);

CREATE TABLE IF NOT EXISTS task_links (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_links_task ON task_links(task_id);
"""
