import os
import uuid
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from database import engine, Base
from routers import auth, records
from auth import get_current_user
from models import User

# 图片存储路径（后续可改为 FNOS 挂载目录）
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))
ORIGINAL_DIR = UPLOAD_DIR / "original"
THUMBNAIL_DIR = UPLOAD_DIR / "thumbnail"
THUMBNAIL_MAX_SIZE = 1920  # 缩略图最长边 px

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


# ---- 图片上传 ----
@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # 确保目录存在
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    THUMBNAIL_DIR.mkdir(parents=True, exist_ok=True)

    # 唯一文件名
    ext = os.path.splitext(file.filename or ".jpg")[1] or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"

    # 保存原图
    orig_path = ORIGINAL_DIR / name
    content = await file.read()
    with open(orig_path, "wb") as f:
        f.write(content)

    # 生成缩略图
    thumb_path = THUMBNAIL_DIR / name
    try:
        img = Image.open(orig_path)
        # 转 RGB（避免 PNG/WebP 缩略图问题）
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        if max(img.width, img.height) > THUMBNAIL_MAX_SIZE:
            img.thumbnail((THUMBNAIL_MAX_SIZE, THUMBNAIL_MAX_SIZE), Image.LANCZOS)
        img.save(thumb_path, "JPEG", quality=85, optimize=True)
    except Exception as e:
        # 图片无法处理时，直接用原图作为缩略图
        thumb_path = orig_path

    return {
        "original": f"/uploads/original/{name}",
        "thumbnail": f"/uploads/thumbnail/{name}",
    }


# ---- 挂载静态文件服务 ----
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
