from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    profile_pic_url: str | None
    created_at: datetime
    role: str

    class Config:
        from_attributes = True