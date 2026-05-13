from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, records

# 创建所有表
Base.metadata.create_all(bind=engine)

app = FastAPI(title="My Daily API", version="0.1.0")

# CORS：允许前端 dev server 跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(records.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
