from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile, Form, File
from app.api.domains.user.model import User, Author
from app.api.domains.user.schema import UserCreate
from app.core.s3 import upload_image_s3
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

async def create_author(
        db: Session,
        current_user: User,
        name: str = Form(..., max_length=130),
        about: str | None = Form(None),            
        profile_pic: UploadFile | None = File(None)
    ) -> Author:

    new_author = Author()

    if profile_pic is not None:
        uploaded_s3_url = await upload_image_s3(
            user_id=str(current_user.id),
            path=("authors", "profile_pic"),
            file=profile_pic
        )
        new_author.profile_pic_url = uploaded_s3_url

    new_author.author_id = current_user.id
    new_author.name = name
    if about is not None:
        new_author.about = about
    
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

async def update_user_profile(
    db: Session,
    current_user: User,
    profile_pic: UploadFile | None = File(None),
    username: str | None = Form(None)
) -> User:
    
    if profile_pic is not None:
        uploaded_s3_url = await upload_image_s3(
            user_id=str(current_user.id),
             path=("users", "profile_pic"),
            file=profile_pic
        )
        current_user.profile_pic_url = uploaded_s3_url

    if username is not None:
        current_user.username = username

    db.commit()
    db.refresh(current_user)

    return current_user

async def update_author_profile(
        db: Session,
        current_user: User,
        name: str = Form(None, max_length=130),
        about: str | None = Form(None),    
        profile_pic: UploadFile | None = File(None),
) -> Author:
    author = db.query(Author).filter(Author.author_id == current_user.id).first()

    if profile_pic is not None:
        uploaded_s3_url = await upload_image_s3(
            user_id=str(current_user.id),
            path=("authors", "profile_pic"),
            file=profile_pic
        )
        author.profile_pic_url = uploaded_s3_url

    if name is not None:
        author.name = name
    if about is not None:
        author.about = about    

    db.commit()
    db.refresh(author)

    return author