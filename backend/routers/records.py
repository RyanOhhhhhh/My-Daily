from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User, Record
from schemas import RecordCreate, RecordUpdate, RecordOut, RecordListResponse
from auth import get_current_user

router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("", response_model=RecordListResponse)
def list_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = (
        db.query(Record)
        .filter(Record.user_id == current_user.id)
        .order_by(Record.record_date.desc(), Record.created_at.desc())
        .all()
    )
    return RecordListResponse(records=records)


@router.post("", response_model=RecordOut)
def create_record(
    body: RecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = Record(
        user_id=current_user.id,
        title=body.title,
        content=body.content or "",
        record_date=body.record_date,
        location=body.location,
        lat=body.lat,
        lng=body.lng,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=RecordOut)
def get_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


@router.put("/{record_id}", response_model=RecordOut)
def update_record(
    record_id: int,
    body: RecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = (
        db.query(Record)
        .filter(Record.id == record_id, Record.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="记录不存在")

    db.delete(record)
    db.commit()
    return {"ok": True}
