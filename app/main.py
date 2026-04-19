from fastapi import FastAPI
from fastapi import Depends
from typing import List
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.domains.user.model import Users
from app.api.domains.user.schema import UserResponse

app = FastAPI(title="PanelVerse API")


@app.get("/")
def root():
    return {"message": "PanelVerse API is running"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    return {"status": "DB connected"}

@app.get("/test-users", response_model=List[UserResponse])
def test_users(db: Session = Depends(get_db)):
    users = db.query(Users).all()
    return users