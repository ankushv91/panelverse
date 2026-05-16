from app.db.session import SessionLocal
# Using HTTPBearer instead of OAuth2PasswordBearer for simplicity.
# Our login uses JSON body, not form-data, so OAuth2 flow is not required here.
# from fastapi.security import OAuth2PasswordBearer currently using HTTPBearer
from fastapi.security import HTTPBearer
from fastapi.security import HTTPAuthorizationCredentials

from fastapi import HTTPException, Depends, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.domains.user.model import User

# oauth2_schema = OAuth2PasswordBearer(tokenUrl="/auth/login")
security = HTTPBearer(auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
        # token: str = Depends(oauth2_scheme),
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
        ):
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
        )
    
    if credentials is None:
        raise credentials_exception

    token = credentials.credentials
    
    # decoding the token
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id==int(user_id)).first()

    if user is None:
        raise credentials_exception
    
    if user.is_deleted:
        raise credentials_exception
        
    return user

# when there's a logged in mode and guest mode interfaces
def get_current_user_optional(
        credentials: HTTPAuthorizationCredentials = Depends(security),
        db: Session = Depends(get_db)
):
    if credentials is None:
        return None
    try: # use the strict logic, if header exists
        return get_current_user(credentials, db)
    except HTTPException: # in case it fails treat as a guest
        return None

def require_role(required_roles: list[str]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions"
            )    
        return current_user
    return role_checker
    
require_admin = require_role(["admin"])
require_author = require_role(["author"])