import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import init_db, close_db
from routers.projects import router as projects_router
from routers.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="YourMemo API", version="0.1.0", lifespan=lifespan)

cors_origins = [
    "http://localhost:5173",
    "http://localhost:18230",
]
if os.environ.get("YOURMEMO_DEV"):
    cors_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(tasks_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
