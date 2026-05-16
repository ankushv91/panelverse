from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps import get_current_user

from app.api.domains.user.schema import UserCreate, UserCompleteDetails, UserUpdate, AuthorCreate, AuthorCompleteDetail, AuthorUpdate, RegisterResponse
from app.api.domains.user.service import create_user, create_author, update_user_profile, delete_user, update_author_profile
from app.api.domains.user.model import User, Author
from app.api.deps import require_admin, require_author
from app.api.deps import require_author
from app.core.security import create_access_token

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/register", response_model=RegisterResponse, status_code=201)
def register_user_endpoint(user_data: UserCreate, db :Session = Depends(get_db)):
    new_user = create_user(db, user_data)
    token = create_access_token({"sub": str(new_user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": new_user
    }

@router.patch("/me", response_model=UserCompleteDetails)
def edit_user_profile_endpoint(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
    ):
    return update_user_profile(db, current_user, data)

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delete_user(db, current_user)

@router.get("/me", response_model=UserCompleteDetails)
def get_me_endpoint(current_user: User = Depends(get_current_user)):
    return current_user