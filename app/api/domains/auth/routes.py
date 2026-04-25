from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.domains.auth.schema import LoginRequest, TokenResponse
from app.api.domains.auth.service import login_user

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    token = login_user(db, data.email, data.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"access_token": token}