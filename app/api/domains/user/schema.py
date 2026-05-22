from pydantic import BaseModel, EmailStr, Field
from typing import Literal
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., max_length=30)
    email: EmailStr = Field(..., max_length=255)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=72)

class UserCompleteDetails(UserBase):
    id: int
    profile_pic_url: str | None = None
    created_at: datetime
    role: Literal["user", "author", "admin"]

    class Config:
        from_attributes = True

class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserCompleteDetails

class AuthorBase(BaseModel):
    name: str = Field(..., max_length=130)

class AuthorCreate(AuthorBase):
    about: str | None = None

class AuthorDetail(AuthorBase):
    author_id: int

    class Config:
        from_attributes = True

class AuthorCompleteDetail(AuthorDetail):
    about: str | None = None
    profile_pic_url: str | None = None

    class Config:
        from_attributes = True

class AuthorUpdate(BaseModel):
    name: str | None = Field(None, max_length=130)
    about: str | None = None
    profile_pic_url: str | None = None