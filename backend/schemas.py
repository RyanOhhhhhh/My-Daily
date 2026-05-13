from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# ---- Auth ----
class AuthRegister(BaseModel):
    username: str
    password: str


class AuthLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- Records ----
class RecordCreate(BaseModel):
    title: str
    content: Optional[str] = ""
    record_date: Optional[datetime] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class RecordUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    record_date: Optional[datetime] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class RecordOut(BaseModel):
    id: int
    user_id: int
    title: str
    content: str
    record_date: Optional[datetime] = None
    location: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RecordListResponse(BaseModel):
    records: list[RecordOut]
