from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import chat, executions, knowledge
from services.checkpointer import init_checkpointer

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_checkpointer()
    yield

app = FastAPI(title="AI Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["chat"])
app.include_router(executions.router, prefix="/executions", tags=["executions"])
app.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])

@app.get("/health")
async def health():
    return {"status": "ok"}
