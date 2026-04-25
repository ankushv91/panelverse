from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.domains.user.schema import UserCreate, UserResponse
from app.api.domains.user.service import create_user
from app.api.deps import get_current_user
from app.api.domains.user.model import User
from app.api.deps import require_admin, require_author
from app.api.deps import require_author

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(user_data: UserCreate, db :Session = Depends(get_db)):
    try:
        user = create_user(db, user_data)
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/admin-only")
def admin_only(current_user: User = Depends(require_admin)):
    return {"message" : f"welcome admin {current_user.username}"}

@router.get("/author-only")
def admin_only(current_user: User = Depends(require_author)):
    return {"message" : f"welcome author {current_user.username}"}