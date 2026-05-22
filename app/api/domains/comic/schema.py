from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

from app.api.domains.user.schema import AuthorDetail

class GenreDetail(BaseModel):
    id: int
    genre_type: str = Field(..., max_length=25)

    class Config:
        from_attributes = True

class GenreCreate(BaseModel):
    genre_type: str = Field(..., max_length=25)

class BookmarkDetail(BaseModel):
    user_id: int
    comic_id: int
    
    class Config:
       from_attributes = True

class PageCreate(BaseModel):
    page_no: int
    image_url: str

class PageDetail(BaseModel):
    id: int
    page_no: int
    image_url: str

    class Config:
        from_attributes = True

class ChapterBase(BaseModel):
    id: int
    chapter_no: float
    
    class Config:
       from_attributes = True

class ChapterCreate(BaseModel):
    chapter_no: float
    chapter_name: str

class ChapterDetail(ChapterBase):
    chapter_name: str | None = None
    created_at: datetime
    view_count: int

    class Config:
       from_attributes = True

class ChapterCompleteDetail(BaseModel):
    id: int
    chapter_no: int
    chapter_name: str
    comic_id: int
    comic_title: str

    pages: list[PageDetail]

    class Config:
        from_attributes = True

class AddChapterPages(BaseModel):
    id: int
    chapter_no: int
    chapter_name: str
    
    pages: list[PageDetail]

    class Config:
        from_attributes = True

class ComicBase(BaseModel):
    title: str = Field(..., max_length=255)
    cover_image_url: str | None = None
    comic_status: Literal["ongoing", "completed", "hiatus"] = "ongoing"
    approval_status: Literal["pending", "approved", "rejected"] = "approved",

class ComicCreate(ComicBase):
    description: str | None = None
    genre_ids: list[int]

class ComicEdit(BaseModel):
    title: str | None = Field(None, max_length=255)
    cover_image_url: str | None = None
    comic_status: Literal["ongoing", "completed", "hiatus"] | None
    description: str | None = None
    genre_ids: list[int] | None = None
    new_author_ids: list[int] | None = None

class ComicDetail(ComicBase):
    id: int
    avg_rating: float
    view_count: int

    latest_chapter: ChapterBase | None = None

    class Config:
       from_attributes = True

class ComicCompleteDetail(ComicBase):
    id: int
    avg_rating: float
    view_count: int
    description: str | None = None

    class Config:
        from_attributes = True

    authors: list[AuthorDetail]
    genres: list[GenreDetail]

    isBookmarked: bool # for UI of bookmark
    
class RatingBase(BaseModel):
    user_id: int
    comic_id: int
    rating: int = Field(..., ge=1, le=5)

class RatingUpsert(BaseModel):
    comic_id: int
    rating: int = Field(..., ge=1, le=5)

class RatingDetail(RatingBase):
    created_at: datetime

    class Config:
        from_attributes = True

class ReadingProgressUpsert(BaseModel):
    comic_id: int
    chapter_id: int
    page_id: int


class ReadingProgressDetail(ReadingProgressUpsert):
    latest_chapter: ChapterBase | None = None

    class Comfig:
        from_attributes = True

# For ComicCard UI Component
class ReadingProgressComicDetail(BaseModel):
    id: int
    title: str = Field(..., max_length=255)
    cover_image_url: str | None = None
    comic_status: Literal["ongoing", "completed", "hiatus"] = "ongoing"
    approval_status: Literal["pending", "approved", "rejected"] = "approved",
    avg_rating: float
    view_count: int

    continue_chapter: ChapterBase | None = None

    updated_at: datetime # Reading Progress row update time

    class Comfig:
        from_attributes = True