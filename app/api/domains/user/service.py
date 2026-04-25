from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.domains.user.model import User
from app.api.domains.user.schema import UserCreate
from app.core.security import hash_password

def create_user(db: Session, user_data: UserCreate) -> User:
    hashed_passsword = hash_password(user_data.password)

    new_user = User(
        username = user_data.username,
        email = user_data.email,
        password_hash = hashed_passsword
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Username or email already exists")
    
    db.refresh(new_user)

    return new_user