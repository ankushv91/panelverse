from pydantic import BaseModel
from datetime import datetime

class CommentDetail(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    is_edited: bool

    username: str
    reply_to_username: str | None = None
    parent_comment_id: int | None = None
    reply_count: int = 0 

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    content: str
    comic_id: int | None = None
    chapter_id: int | None = None
    parent_comment_id: int | None = None
    reply_to_user_id: int | None = None

class CommentDeleted(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    is_edited: bool

    reply_to_username: str | None = None
    parent_comment_id: int | None = None
    reply_count: int = 0 

    class Config:
        from_attributes = True