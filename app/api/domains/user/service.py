from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.api.domains.user.model import User, Author
from app.api.domains.user.schema import UserCreate, AuthorCreate, UserUpdate, AuthorUpdate
from app.core.security import hash_password
from sqlalchemy.exc import IntegrityError

def create_user(
        db: Session,
        user_data: UserCreate
    ) -> User:
    hashed_password = hash_password(user_data.password)

    new_user = User(
        username = user_data.username,
        email = user_data.email,
        password_hash = hashed_password
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists"
            )
    
    db.refresh(new_user)

    return new_user

def delete_user(db: Session, current_user: User):
    current_user.is_deleted = True
    db.commit()
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occued while deleting user: {str(e)}"
            )
    return {
        "details": "User deleted succesufully"
    }

def delete_any_user(db: Session, user_id:int):
    user = db.query(User).filter(User.id == user_id).first()
    user.is_deleted = True
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error occued while deleting user: {str(e)}"
            )
    return {
        "details": "User deleted succesufully"
    }

def create_author(
        db: Session,
        author_data: AuthorCreate,
        current_user: User
    ) -> Author:

    new_author = Author(
        author_id = current_user.id,
        name = author_data.name,
        about = author_data.about,
        profile_pic_url = author_data.profile_pic_url
    )

    current_user.role = "author"

    db.add(new_author)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already an author"
        )
    
    db.refresh(new_author)

    return new_author

def update_user_profile(
    db: Session,
    user: User,
    data: UserUpdate
) -> User:
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user

def update_author_profile(
        db: Session,
        current_user: User,
        data: AuthorUpdate
) -> Author:
    author = db.query(Author).filter(Author.author_id == current_user.id).first()

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(author, field, value)

    db.commit()
    db.refresh(author)

    return author