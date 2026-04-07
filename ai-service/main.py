from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import chat, executions
from services.checkpointer import get_checkpointer

@asynccontextmanager
async def lifespan(app: FastAPI):
    checkpointer = get_checkpointer()
    checkpointer.setup()
    yield

app = FastAPI(title="IThealth AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(executions.router, prefix="/executions", tags=["executions"])

@app.get("/health")
async def health():
    return {"status": "ok"}
